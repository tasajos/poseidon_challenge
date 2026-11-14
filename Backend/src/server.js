import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import * as db from './db.js';
import { ROLES, hashPassword, verificarPassword, crearToken, requiereSesion, requierePermiso, tienePermiso, limiteIngreso } from './auth.js';
import { PERMISOS, FIJOS, esPermiso } from './permisos.js';
import { climatologia } from './power.js';
import { indicadoresMensuales } from './clima.js';
import { compararRotaciones, CRITERIOS } from './rotacion.js';
import * as respaldos from './respaldos.js';
import { revisarAlertas, programarAlertas, estadoAlertas, UMBRALES } from './alertas.js';
import { clavePublica, entregar, smsConfigurado, TELEFONO } from './canales.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50kb' }));

const sesion = requiereSesion(db.usuarioPorId, db.permisosDeRol);
const error = (status, mensaje) => Object.assign(new Error(mensaje), { status });
const ruta = (fn) => (req, res, next) => fn(req, res).catch(next);

function coordenadas(lat, lon) {
  const a = Number(lat), o = Number(lon);
  if (lat == null || lon == null || !Number.isFinite(a) || !Number.isFinite(o) || Math.abs(a) > 90 || Math.abs(o) > 180) {
    throw error(400, 'Coordenadas inválidas');
  }
  return [a, o];
}

// Datos cortos para listas y tableros, a partir de las 3 estrategias guardadas.
function resumir({ resultado, prioridades, ...e }) {
  const actual = resultado[0];
  const mejor = resultado.reduce((a, b) => (b.puntaje > a.puntaje ? b : a));
  return {
    ...e,
    resumen: {
      actual: { nombres: actual.nombres, puntaje: actual.puntaje },
      mejor: { titulo: mejor.titulo, nombres: mejor.nombres, puntaje: mejor.puntaje },
      deficit_agua_mm: actual.evidencia.deficit_agua_mm,
      heladas: actual.detalle.filter((d) => d.meses_helada.length)
        .map((d) => ({ cultivo: d.nombre, meses: d.meses_helada })),
    },
  };
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---------- Sesión ----------
app.post('/api/auth/login', limiteIngreso, ruta(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const u = await db.usuarioPorEmail(email);
  if (!u || !u.activo || !verificarPassword(req.body?.password || '', u.password_hash)) {
    throw error(401, 'Correo o contraseña incorrectos');
  }
  res.json({
    token: crearToken(u),
    usuario: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, permisos: await db.permisosDeRol(u.rol) },
  });
}));

app.get('/api/auth/yo', sesion, (req, res) => res.json(req.usuario));

// ---------- Datos de apoyo ----------
app.get('/api/cultivos', sesion, ruta(async (_req, res) => res.json(await db.getCultivos())));

app.get('/api/clima', sesion, ruta(async (req, res) => {
  const [lat, lon] = coordenadas(req.query.lat, req.query.lon);
  const base = await climatologia(lat, lon);
  res.json({ fuente: base.fuente, meses: indicadoresMensuales(lat, base) });
}));

// ---------- Evaluaciones ----------
// Cuerpo: { nombre?, lat, lon, rotacion: ["papa","maiz"], prioridades: { agua: 0-5, ... } }
app.post('/api/evaluar', sesion, requierePermiso('evaluar'), ruta(async (req, res) => {
  const { rotacion, prioridades = {}, nombre } = req.body || {};
  const [lat, lon] = coordenadas(req.body?.lat, req.body?.lon);
  if (!Array.isArray(rotacion) || rotacion.length < 2 || rotacion.length > 4
    || new Set(rotacion).size !== rotacion.length) {
    throw error(400, 'La rotación debe tener de 2 a 4 cultivos distintos');
  }
  const pesos = Object.fromEntries(CRITERIOS.map((k) => [k, Math.max(0, Math.min(5, Number(prioridades[k]) || 0))]));
  const { cultivos } = await db.getCultivos();
  const malo = rotacion.find((k) => !cultivos.some((c) => c.codigo === k));
  if (malo !== undefined) throw error(400, `Cultivo desconocido: ${malo}`);

  const base = await climatologia(lat, lon);
  const meses = indicadoresMensuales(lat, base);
  const estrategias = compararRotaciones(rotacion, cultivos, meses, pesos);
  const id = await db.guardarEvaluacion({
    usuarioId: req.usuario.id, nombre: String(nombre || '').trim().slice(0, 80) || 'Parcela sin nombre',
    lat, lon, rotacion, prioridades: pesos, fuenteClima: base.fuente, estrategias,
  });
  res.json({ id, fuenteClima: base.fuente, clima: meses, estrategias });
}));

// Sin el permiso ver_todas cada persona ve solo sus parcelas. ?propias=1 pide solo las propias.
const verTodas = (u) => tienePermiso(u, 'ver_todas');

app.get('/api/evaluaciones', sesion, ruta(async (req, res) => {
  const propias = req.query.propias === '1' || !verTodas(req.usuario);
  res.json((await db.listarEvaluaciones(propias ? { usuarioId: req.usuario.id } : {})).map(resumir));
}));

app.get('/api/evaluaciones/:id', sesion, ruta(async (req, res) => {
  const e = await db.obtenerEvaluacion(req.params.id);
  if (!e || (!verTodas(req.usuario) && e.usuario_id !== req.usuario.id)) {
    throw error(404, 'Evaluación no encontrada');
  }
  res.json(e);
}));

app.patch('/api/evaluaciones/:id/revision', sesion, requierePermiso('revisar'), ruta(async (req, res) => {
  const nota = String(req.body?.nota || '').trim().slice(0, 2000);
  if (!nota) throw error(400, 'Escriba una nota técnica');
  const e = await db.obtenerEvaluacion(req.params.id);
  if (!e || (!verTodas(req.usuario) && e.usuario_id !== req.usuario.id)) throw error(404, 'Evaluación no encontrada');
  await db.revisarEvaluacion(req.params.id, { nota, revisorId: req.usuario.id });
  res.json({ ok: true });
}));

// ---------- Monitoreo y reportes regionales ----------
app.get('/api/monitoreo', sesion, requierePermiso('reportes'), ruta(async (_req, res) => {
  const evaluaciones = (await db.listarEvaluaciones()).map(resumir);
  const usuarios = await db.listarUsuarios();
  const alertas = [];
  for (const e of evaluaciones) {
    if (e.resumen.deficit_agua_mm > 400) {
      alertas.push({ id: e.id, parcela: e.parcela, tipo: 'agua', texto: `Déficit de agua alto: ${e.resumen.deficit_agua_mm} mm por campaña` });
    }
    for (const h of e.resumen.heladas) {
      alertas.push({ id: e.id, parcela: e.parcela, tipo: 'helada', texto: `${h.cultivo} expuesto a helada en ${h.meses.join(', ')}` });
    }
  }
  const contar = (lista, campo) => lista.reduce((a, x) => ({ ...a, [x[campo]]: (a[x[campo]] || 0) + 1 }), {});
  res.json({
    totales: {
      evaluaciones: evaluaciones.length,
      pendientes: evaluaciones.filter((e) => e.estado === 'pendiente').length,
      clientes: new Set(evaluaciones.map((e) => e.usuario_id)).size,
      alertas: alertas.length,
    },
    usuarios_por_rol: contar(usuarios.filter((u) => u.activo), 'rol'),
    fuentes_clima: contar(evaluaciones, 'fuente_clima'),
    base_datos: db.modo(),
    alertas,
    evaluaciones,
  });
}));

// ---------- Administración: usuarios ----------
app.get('/api/usuarios', sesion, requierePermiso('usuarios'), ruta(async (_req, res) => res.json(await db.listarUsuarios())));

app.post('/api/usuarios', sesion, requierePermiso('usuarios'), ruta(async (req, res) => {
  const nombre = String(req.body?.nombre || '').trim().slice(0, 80);
  const email = String(req.body?.email || '').trim().toLowerCase();
  const { password, rol } = req.body || {};
  if (!nombre || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw error(400, 'Nombre y correo válidos son obligatorios');
  if (typeof password !== 'string' || password.length < 8) throw error(400, 'La contraseña debe tener al menos 8 caracteres');
  if (!ROLES.includes(rol)) throw error(400, 'Rol no válido');
  if (await db.usuarioPorEmail(email)) throw error(409, 'Ya existe un usuario con ese correo');
  const id = await db.crearUsuario({ nombre, email, password_hash: hashPassword(password), rol });
  res.status(201).json({ id });
}));

app.patch('/api/usuarios/:id', sesion, requierePermiso('usuarios'), ruta(async (req, res) => {
  const { rol, activo } = req.body || {};
  if (rol !== undefined && !ROLES.includes(rol)) throw error(400, 'Rol no válido');
  if (activo !== undefined && typeof activo !== 'boolean') throw error(400, 'Valor de activo no válido');
  if (Number(req.params.id) === req.usuario.id) throw error(400, 'No puede cambiar su propio rol ni desactivarse');
  if (!(await db.actualizarUsuario(req.params.id, { rol, activo }))) throw error(404, 'Usuario no encontrado');
  res.json({ ok: true });
}));

// ---------- Administración: roles y permisos ----------
app.get('/api/permisos', sesion, requierePermiso('usuarios'), ruta(async (_req, res) => {
  res.json({ catalogo: PERMISOS, roles: ROLES, fijos: FIJOS, matriz: await db.matrizPermisos() });
}));

app.put('/api/permisos/:rol', sesion, requierePermiso('usuarios'), ruta(async (req, res) => {
  const { rol } = req.params;
  const permisos = req.body?.permisos;
  if (!ROLES.includes(rol)) throw error(404, 'Rol no encontrado');
  if (!Array.isArray(permisos) || !permisos.every(esPermiso)) throw error(400, 'Lista de permisos no válida');
  await db.setPermisosRol(rol, permisos);
  res.json({ rol, permisos: await db.permisosDeRol(rol) });
}));

// ---------- Administración: respaldos ----------
app.get('/api/sistema', sesion, requierePermiso('usuarios', 'respaldos'), (_req, res) => {
  res.json({ base_datos: db.modo(), respaldos: respaldos.estado(), alertas: estadoAlertas(), sms_configurado: smsConfigurado() });
});

app.get('/api/respaldos', sesion, requierePermiso('respaldos'), ruta(async (_req, res) => {
  res.json({ estado: respaldos.estado(), respaldos: await respaldos.listar() });
}));

app.post('/api/respaldos', sesion, requierePermiso('respaldos'), ruta(async (req, res) => {
  res.status(201).json(await respaldos.crearRespaldo('manual', req.usuario.email));
}));

// Exige repetir el nombre del respaldo en el cuerpo, para que no se restaure por un clic accidental.
app.post('/api/respaldos/:nombre/restaurar', sesion, requierePermiso('respaldos'), ruta(async (req, res) => {
  if (req.body?.confirmacion !== req.params.nombre) throw error(400, 'Confirme escribiendo el nombre del respaldo');
  res.json(await respaldos.restaurar(req.params.nombre, req.usuario.email));
}));

// ---------- Alertas climáticas del usuario ----------
// Solo se aceptan suscripciones de los servicios de notificación de los navegadores.
const SERVICIOS_PUSH = [/\.googleapis\.com$/, /\.mozilla\.com$/, /\.notify\.windows\.com$/, /\.push\.apple\.com$/];
const recientes = new Map(); // usuario → última revisión manual (máximo una por minuto)

app.get('/api/alertas', sesion, requierePermiso('alertas'), ruta(async (req, res) => {
  const id = req.usuario.id;
  const [preferencias, historial, dispositivos, parcelas] = await Promise.all([
    db.getPreferencias(id), db.listarAlertas(id), db.listarSuscripciones(id), db.parcelasParaAlertas({ usuarioId: id }),
  ]);
  res.json({
    preferencias, historial,
    dispositivos: dispositivos.length,
    lugares: new Set(parcelas.map((p) => `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`)).size,
    clave_push: await clavePublica(),
    sms_configurado: smsConfigurado(),
    umbrales: UMBRALES,
    revision: estadoAlertas(),
  });
}));

app.put('/api/alertas/preferencias', sesion, requierePermiso('alertas'), ruta(async (req, res) => {
  const b = req.body || {};
  for (const k of ['helada', 'sequia', 'web', 'sms']) {
    if (typeof b[k] !== 'boolean') throw error(400, `Valor no válido para ${k}`);
  }
  const telefono = String(b.telefono || '').replace(/[\s-]/g, '') || null;
  if (telefono && !TELEFONO.test(telefono)) throw error(400, 'Escriba el teléfono con código de país, por ejemplo +59170000000');
  if (b.sms && !telefono) throw error(400, 'Para recibir SMS indique su número de teléfono');
  const prefs = { helada: b.helada, sequia: b.sequia, web: b.web, sms: b.sms, telefono };
  await db.setPreferencias(req.usuario.id, prefs);
  res.json(prefs);
}));

app.post('/api/alertas/suscripcion', sesion, requierePermiso('alertas'), ruta(async (req, res) => {
  const { endpoint, keys } = req.body || {};
  let host;
  try { host = new URL(endpoint).hostname; } catch { throw error(400, 'Suscripción no válida'); }
  if (!String(endpoint).startsWith('https://') || endpoint.length > 500 || !SERVICIOS_PUSH.some((r) => r.test(host))
    || typeof keys?.p256dh !== 'string' || keys.p256dh.length > 200 || typeof keys?.auth !== 'string' || keys.auth.length > 100) {
    throw error(400, 'Suscripción no válida');
  }
  await db.guardarSuscripcion({ usuarioId: req.usuario.id, endpoint, p256dh: keys.p256dh, auth: keys.auth });
  res.status(201).json({ ok: true });
}));

app.delete('/api/alertas/suscripcion', sesion, requierePermiso('alertas'), ruta(async (req, res) => {
  await db.borrarSuscripcion(String(req.body?.endpoint || ''), req.usuario.id);
  res.json({ ok: true });
}));

app.post('/api/alertas/prueba', sesion, requierePermiso('alertas'), ruta(async (req, res) => {
  const prefs = await db.getPreferencias(req.usuario.id);
  const alerta = { tipo: 'prueba', titulo: 'Alerta de prueba', mensaje: 'Así llegarán los avisos de helada y sequía de Poseidon.' };
  const canales = await entregar(req.usuario.id, prefs, alerta);
  await db.registrarAlerta({ usuarioId: req.usuario.id, clave: `prueba:${Date.now()}`, canales, ...alerta });
  res.json({ canales });
}));

app.post('/api/alertas/revisar', sesion, requierePermiso('alertas'), ruta(async (req, res) => {
  const id = req.usuario.id;
  if (Date.now() - (recientes.get(id) || 0) < 60e3) throw error(429, 'Espere un minuto antes de volver a revisar');
  recientes.set(id, Date.now());
  res.json(await revisarAlertas({ usuarioId: id }));
}));

app.use((err, _req, res, _next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Error interno' });
});

await db.iniciar();
await respaldos.programar();
programarAlertas();
const puerto = Number(process.env.PORT || 3001);
app.listen(puerto, () => console.log(`API Poseidon en http://localhost:${puerto} (datos: ${db.modo()})`));
