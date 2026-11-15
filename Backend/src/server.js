import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import * as db from './db.js';
import { ROLES, hashPassword, verificarPassword, crearToken, requiereSesion, requierePermiso, tienePermiso, limiteIngreso } from './auth.js';
import { PERMISOS, FIJOS, ROLES_CON_APROBACION, esPermiso } from './permisos.js';
import { registrarRutas, puedeVerParcela } from './rutas.js';
import { prepararParcela } from './parcelas.js';
import { riesgoErosion } from './terreno.js';
import { climatologia } from './power.js';
import { indicadoresMensuales } from './clima.js';
import { compararRotaciones, CRITERIOS } from './rotacion.js';
import * as respaldos from './respaldos.js';
import { revisarAlertas, programarAlertas, estadoAlertas, UMBRALES } from './alertas.js';
import { clavePublica, entregar, enviarPush, smsConfigurado, TELEFONO } from './canales.js';
import { PRACTICAS, UNIDADES, vistaOferta, filtrarOfertas, contar, abreviar } from './ofertas.js';
import { zonaDe } from './geo.js';
import { presionDePlagas, RADIO_KM, VIGENCIA_DIAS } from './plagas.js';
import { guardarFoto, leerFoto, estadoFotos, MAX_BYTES, MAX_POR_INCIDENCIA } from './fotos.js';

const app = express();
// Solo se confía en proxies de este mismo equipo (el de Vite y el agente del túnel): req.ip es la IP
// real del visitante, y nadie de afuera puede hacerse pasar por otro enviando X-Forwarded-For.
app.set('trust proxy', 'loopback');
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
  const claveCorrecta = Boolean(u) && verificarPassword(req.body?.password || '', u.password_hash);
  // El aviso de "pendiente" solo se da a quien conoce la contraseña: no revela qué cuentas existen.
  if (claveCorrecta && u.pendiente) throw error(403, 'Su cuenta está pendiente de aprobación. Un responsable debe habilitarla antes de que pueda ingresar.');
  if (!claveCorrecta || !u.activo) throw error(401, 'Correo o contraseña incorrectos');
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
// Cuerpo: { parcela_id | (nombre?, lat, lon), rotacion: ["papa","maiz"], prioridades: { agua: 0-5, ... } }
// Con parcela_id evalúa una parcela registrada; con lat y lon registra una parcela rápida solo con su ubicación.
app.post('/api/evaluar', sesion, requierePermiso('evaluar'), ruta(async (req, res) => {
  const { rotacion, prioridades = {}, nombre } = req.body || {};
  let parcela = null;
  if (req.body?.parcela_id !== undefined && req.body?.parcela_id !== null) {
    parcela = await db.obtenerParcela(req.body.parcela_id);
    if (!parcela || parcela.usuario_id !== req.usuario.id) throw error(404, 'Parcela no encontrada');
  }
  const [lat, lon] = parcela ? [parcela.lat, parcela.lon] : coordenadas(req.body?.lat, req.body?.lon);
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
  const recientes = await db.listarIncidencias({ desde: new Date(Date.now() - VIGENCIA_DIAS * 864e5) });
  const plagas = presionDePlagas(recientes, lat, lon, cultivos);
  if (!parcela) {
    const id = await db.crearParcela({
      usuarioId: req.usuario.id, nombre: String(nombre || '').trim().slice(0, 80) || 'Parcela sin nombre', lat, lon,
    });
    parcela = await prepararParcela(await db.obtenerParcela(id), 0); // terreno y NDVI siguen en segundo plano
  }
  // En ladera (HU-USR-05) la comparación premia raíces profundas y suelo cubierto.
  const riesgo = riesgoErosion(parcela.pendiente_pct);
  const terreno = riesgo ? { pendiente_pct: parcela.pendiente_pct, riesgo } : null;
  const estrategias = compararRotaciones(rotacion, cultivos, meses, pesos, plagas, terreno);
  const id = await db.guardarEvaluacion({
    parcelaId: parcela.id, rotacion, prioridades: pesos, fuenteClima: base.fuente, estrategias,
  });
  res.json({ id, parcela_id: parcela.id, fuenteClima: base.fuente, clima: meses, estrategias, plagas, terreno });
}));

// Qué evaluaciones ve cada persona: con ver_todas, todas; un técnico (revisar), las de sus parcelas
// asignadas; los demás, las propias. ?propias=1 pide solo las propias.
const verTodas = (u) => tienePermiso(u, 'ver_todas');

app.get('/api/evaluaciones', sesion, ruta(async (req, res) => {
  const u = req.usuario;
  const filtro = req.query.propias === '1' ? { usuarioId: u.id }
    : verTodas(u) ? {} : tienePermiso(u, 'revisar') ? { tecnicoId: u.id } : { usuarioId: u.id };
  res.json((await db.listarEvaluaciones(filtro)).map(resumir));
}));

app.get('/api/evaluaciones/:id', sesion, ruta(async (req, res) => {
  const e = await db.obtenerEvaluacion(req.params.id);
  if (!e || !puedeVerParcela(req.usuario, e)) throw error(404, 'Evaluación no encontrada');
  // Observaciones locales del técnico sobre cada estrategia (HU-OPT-04)
  const validaciones = (await db.listarValidaciones({ evaluacionIds: [e.id] }))
    .map((v) => ({ id: v.id, estrategia: v.estrategia, semillas: v.semillas, observacion: v.observacion, tecnico: v.tecnico, creado_en: v.creado_en }));
  res.json({ ...e, validaciones });
}));

app.patch('/api/evaluaciones/:id/revision', sesion, requierePermiso('revisar'), ruta(async (req, res) => {
  const nota = String(req.body?.nota || '').trim().slice(0, 2000);
  if (!nota) throw error(400, 'Escriba una nota técnica');
  const e = await db.obtenerEvaluacion(req.params.id);
  if (!e || !puedeVerParcela(req.usuario, e)) throw error(404, 'Evaluación no encontrada');
  await db.revisarEvaluacion(req.params.id, { nota, revisorId: req.usuario.id });
  res.json({ ok: true });
}));

// ---------- Administración: usuarios ----------
app.get('/api/usuarios', sesion, requierePermiso('usuarios'), ruta(async (_req, res) => res.json(await db.listarUsuarios())));

// Registro (HU-ADM-01). Cuerpo: { nombre, email, password, rol, telefono? }. El correo es el identificador único.
// Las cuentas de técnico, gestor o administrador quedan pendientes hasta que un responsable las aprueba.
// Los errores de validación llevan "campo" para que el formulario marque dónde está el problema.
const invalido = (campo, mensaje, status = 400) => Object.assign(error(status, mensaje), { campo });

app.post('/api/usuarios', sesion, requierePermiso('usuarios'), ruta(async (req, res) => {
  const nombre = String(req.body?.nombre || '').trim().slice(0, 80);
  const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 120);
  const { password, rol } = req.body || {};
  const telefono = String(req.body?.telefono || '').replace(/[\s-]/g, '') || null;
  if (!nombre) throw invalido('nombre', 'El nombre es obligatorio');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw invalido('email', 'Escriba un correo válido: es el identificador de la cuenta');
  if (telefono && !TELEFONO.test(telefono)) throw invalido('telefono', 'Escriba el teléfono con código de país, por ejemplo +59170000000');
  if (typeof password !== 'string' || password.length < 8) throw invalido('password', 'La contraseña debe tener al menos 8 caracteres');
  if (!ROLES.includes(rol)) throw invalido('rol', 'Elija un rol válido');
  if (await db.usuarioPorEmail(email)) throw invalido('email', 'Ya existe una cuenta con ese correo', 409);
  const pendiente = ROLES_CON_APROBACION.includes(rol);
  const id = await db.crearUsuario({ nombre, email, password_hash: hashPassword(password), rol, telefono, pendiente, creadoPor: req.usuario.id });
  // La auditoría describe la cuenta; nunca guarda la contraseña ni su hash.
  await db.auditar({ actor: req.usuario, accion: 'usuario.registrado', objeto: email, detalle: { nombre, rol, estado: pendiente ? 'pendiente de aprobación' : 'activa' } });
  res.status(201).json({
    id, pendiente,
    mensaje: pendiente
      ? `Cuenta de ${nombre} registrada. Queda pendiente: un responsable debe aprobarla antes de que pueda ingresar.`
      : `Cuenta de ${nombre} registrada y habilitada.`,
  });
}));

// Aprueba o rechaza una cuenta pendiente. Cuerpo: { aprobar: true|false }.
// Si hay otro administrador activo, quien registró la cuenta no puede aprobarla (doble control).
app.post('/api/usuarios/:id/aprobacion', sesion, requierePermiso('usuarios'), ruta(async (req, res) => {
  const aprobar = req.body?.aprobar;
  if (typeof aprobar !== 'boolean') throw error(400, 'Indique si aprueba o rechaza la cuenta');
  const u = await db.usuarioPorId(req.params.id);
  if (!u || !u.pendiente) throw error(404, 'No hay una cuenta pendiente con ese identificador');
  const otros = (await db.listarUsuarios()).filter((x) => x.activo && x.rol === 'administrador' && x.id !== req.usuario.id);
  const mismo = u.creado_por === req.usuario.id;
  if (aprobar && mismo && otros.length) throw error(403, 'Otro administrador debe aprobar las cuentas que usted registró');
  if (!(await db.resolverPendiente(u.id, { aprobar, responsableId: req.usuario.id }))) throw error(409, 'La cuenta ya fue resuelta');
  await db.auditar({
    actor: req.usuario, accion: aprobar ? 'usuario.aprobado' : 'usuario.rechazado', objeto: u.email,
    detalle: { rol: u.rol, ...(aprobar && mismo ? { aviso: 'Aprobada por quien la registró: no hay otro administrador activo' } : {}) },
  });
  res.json({ ok: true });
}));

app.patch('/api/usuarios/:id', sesion, requierePermiso('usuarios'), ruta(async (req, res) => {
  const { rol, activo } = req.body || {};
  if (rol !== undefined && !ROLES.includes(rol)) throw error(400, 'Rol no válido');
  if (activo !== undefined && typeof activo !== 'boolean') throw error(400, 'Valor de activo no válido');
  if (Number(req.params.id) === req.usuario.id) throw error(400, 'No puede cambiar su propio rol ni desactivarse');
  const u = await db.usuarioPorId(req.params.id);
  if (!u) throw error(404, 'Usuario no encontrado');
  if (u.pendiente && activo) throw error(400, 'La cuenta está pendiente: apruébela en lugar de activarla');
  await db.actualizarUsuario(u.id, { rol, activo });
  // Subir a un rol con privilegios exige la misma aprobación que una cuenta nueva: queda pendiente.
  const asciende = rol !== undefined && rol !== u.rol && ROLES_CON_APROBACION.includes(rol) && !ROLES_CON_APROBACION.includes(u.rol);
  if (asciende) await db.dejarPendiente(u.id, req.usuario.id);
  if (rol !== undefined && rol !== u.rol) {
    await db.auditar({ actor: req.usuario, accion: 'usuario.rol', objeto: u.email, detalle: { antes: u.rol, ahora: rol, ...(asciende ? { estado: 'pendiente de aprobación' } : {}) } });
  }
  if (activo !== undefined && activo !== u.activo && !asciende) await db.auditar({ actor: req.usuario, accion: activo ? 'usuario.activado' : 'usuario.desactivado', objeto: u.email });
  res.json({ ok: true, pendiente: asciende });
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
  const antes = await db.permisosDeRol(rol);
  await db.setPermisosRol(rol, permisos);
  const ahora = await db.permisosDeRol(rol);
  await db.auditar({ actor: req.usuario, accion: 'permisos.cambiados', objeto: rol, detalle: { otorgados: ahora.filter((p) => !antes.includes(p)), retirados: antes.filter((p) => !ahora.includes(p)) } });
  res.json({ rol, permisos: ahora });
}));

// ---------- Administración: respaldos ----------
app.get('/api/sistema', sesion, requierePermiso('usuarios', 'respaldos'), ruta(async (_req, res) => {
  res.json({
    base_datos: db.modo(), respaldos: respaldos.estado(), alertas: estadoAlertas(), sms_configurado: smsConfigurado(),
    fotos: await estadoFotos(),
  });
}));

app.get('/api/respaldos', sesion, requierePermiso('respaldos'), ruta(async (_req, res) => {
  res.json({ estado: respaldos.estado(), respaldos: await respaldos.listar() });
}));

app.post('/api/respaldos', sesion, requierePermiso('respaldos'), ruta(async (req, res) => {
  res.status(201).json(await respaldos.crearRespaldo('manual', req.usuario.email));
}));

// Exige repetir el nombre del respaldo en el cuerpo, para que no se restaure por un clic accidental.
app.post('/api/respaldos/:nombre/restaurar', sesion, requierePermiso('respaldos'), ruta(async (req, res) => {
  if (req.body?.confirmacion !== req.params.nombre) throw error(400, 'Confirme escribiendo el nombre del respaldo');
  const r = await respaldos.restaurar(req.params.nombre, req.usuario.email);
  await db.auditar({ actor: req.usuario, accion: 'respaldo.restaurado', objeto: req.params.nombre, detalle: { estado_anterior: r.previo } });
  res.json(r);
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

// ---------- Oferta sostenible (HU-CLI-02) ----------
// Texto libre de formularios: sin caracteres de control y con largo máximo. React lo muestra como texto.
const texto = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
const MES = /^20\d{2}-(0[1-9]|1[0-2])$/;
const catalogoPorCodigo = async () => new Map((await db.getCultivos()).cultivos.map((c) => [c.codigo, c]));

// Notificación web de cortesía (solicitudes): no falla la petición si no se puede enviar.
async function avisar(usuarioId, carga) {
  try {
    if ((await db.getPreferencias(usuarioId)).web) await enviarPush(usuarioId, carga);
  } catch (e) {
    console.warn('[push] Aviso no enviado:', e.message);
  }
}

// Productor: sus ofertas y las parcelas evaluadas desde las que puede ofertar.
app.get('/api/mis-ofertas', sesion, requierePermiso('ofertar'), ruta(async (req, res) => {
  const porCodigo = await catalogoPorCodigo();
  const [ofertas, evaluaciones] = await Promise.all([
    db.listarOfertas({ usuarioId: req.usuario.id }), db.listarEvaluaciones({ usuarioId: req.usuario.id }),
  ]);
  res.json({
    ofertas: ofertas.map((o) => ({ ...vistaOferta(o, porCodigo), activa: o.activa, parcela: o.parcela })),
    parcelas: evaluaciones.map((e) => ({
      evaluacion_id: e.id, parcela: e.parcela, estado: e.estado, creado_en: e.creado_en,
      cultivos: e.rotacion_actual.map((k) => ({ codigo: k, nombre: porCodigo.get(k)?.nombre || k })),
    })),
    unidades: UNIDADES,
  });
}));

// Cuerpo: { evaluacion_id, cultivo, cantidad, unidad, disponible_desde: "AAAA-MM", nota? }
app.post('/api/ofertas', sesion, requierePermiso('ofertar'), ruta(async (req, res) => {
  const b = req.body || {};
  const e = await db.obtenerEvaluacion(b.evaluacion_id);
  if (!e || e.usuario_id !== req.usuario.id) throw error(404, 'Parcela no encontrada');
  if (!e.rotacion_actual.includes(b.cultivo)) throw error(400, 'El cultivo debe ser parte de la rotación de esa parcela');
  const cantidad = Math.round(Number(b.cantidad) * 100) / 100;
  if (!(cantidad > 0 && cantidad <= 1e7)) throw error(400, 'Indique una cantidad válida');
  if (!UNIDADES.includes(b.unidad)) throw error(400, 'Unidad no válida');
  if (!MES.test(String(b.disponible_desde))) throw error(400, 'Indique el mes desde el que estará disponible');
  const activas = (await db.listarOfertas({ usuarioId: req.usuario.id })).filter((o) => o.activa);
  if (activas.length >= 30) throw error(400, 'Tiene demasiadas ofertas activas; pause alguna antes de publicar otra');
  const id = await db.crearOferta({
    usuarioId: req.usuario.id, evaluacionId: e.id, cultivo: b.cultivo, cantidad, unidad: b.unidad,
    disponible: b.disponible_desde, nota: texto(b.nota, 300) || null,
  });
  res.status(201).json({ id });
}));

app.patch('/api/ofertas/:id', sesion, requierePermiso('ofertar'), ruta(async (req, res) => {
  if (typeof req.body?.activa !== 'boolean') throw error(400, 'Valor de activa no válido');
  if (!(await db.cambiarOferta(req.params.id, req.usuario.id, { activa: req.body.activa }))) throw error(404, 'Oferta no encontrada');
  res.json({ ok: true });
}));

// Comprador: oferta pública con filtros. ?cultivos=papa,haba&practicas=leguminosa&verificada=1&agua=media&zona=Tiquipaya
app.get('/api/ofertas', sesion, requierePermiso('comprar'), ruta(async (req, res) => {
  const porCodigo = await catalogoPorCodigo();
  const todas = (await db.listarOfertas({ publicas: true })).map((o) => vistaOferta(o, porCodigo));
  const lista = (q) => String(q || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20);
  const filtros = {
    cultivos: lista(req.query.cultivos).filter((k) => porCodigo.has(k)),
    practicas: lista(req.query.practicas).filter((p) => Object.hasOwn(PRACTICAS, p)),
    verificada: req.query.verificada === '1',
    sello: req.query.sello === '1',
    agua: ['alta', 'media'].includes(req.query.agua) ? req.query.agua : '',
    zona: texto(req.query.zona, 40),
  };
  const pendientes = new Set((await db.listarSolicitudes({ compradorId: req.usuario.id }))
    .filter((s) => s.estado === 'pendiente').map((s) => s.oferta_id));
  res.json({
    ofertas: filtrarOfertas(todas, filtros).map((o) => ({ ...o, solicitud_pendiente: pendientes.has(o.id) })),
    total: todas.length,
    filtros,
    opciones: {
      cultivos: [...porCodigo.values()].map((c) => ({ codigo: c.codigo, nombre: c.nombre, familia: c.familia, n: todas.filter((o) => o.cultivo === c.codigo).length })),
      zonas: contar(todas, 'zona'),
      practicas: PRACTICAS,
    },
  });
}));

// ---------- Solicitudes de compra mediadas por la plataforma (HU-CLI-03) ----------
// Los datos de contacto (correo y, si el productor quiere, teléfono) solo se comparten al aceptar.
function vistaSolicitud(s, lado, porCodigo) {
  const aceptada = s.estado === 'aceptada';
  const base = {
    id: s.id, oferta_id: s.oferta_id, tipo: s.tipo, cantidad: s.cantidad, mensaje: s.mensaje, estado: s.estado,
    respuesta: s.respuesta, respondido_en: s.respondido_en, creado_en: s.creado_en,
    cultivo: s.cultivo, cultivo_nombre: porCodigo.get(s.cultivo)?.nombre || s.cultivo, unidad: s.unidad,
    cantidad_ofertada: s.cantidad_ofertada, zona: zonaDe(s.lat, s.lon),
  };
  if (lado === 'comprador') {
    return { ...base, productor: aceptada ? s.productor : abreviar(s.productor), contacto: aceptada ? { email: s.productor_email, telefono: s.telefono_productor } : null };
  }
  return { ...base, comprador: s.comprador, contacto: aceptada ? { email: s.comprador_email } : null };
}

const SOLICITUDES_POR_DIA = 20;

// Cuerpo: { oferta_id, tipo: "compra"|"contacto", cantidad? (obligatoria en compra), mensaje }
app.post('/api/solicitudes', sesion, requierePermiso('comprar'), ruta(async (req, res) => {
  const b = req.body || {};
  if (!['compra', 'contacto'].includes(b.tipo)) throw error(400, 'Tipo de solicitud no válido');
  const mensaje = texto(b.mensaje, 1000);
  if (mensaje.length < 10) throw error(400, 'Escriba un mensaje de al menos 10 caracteres');
  let cantidad = null;
  if (b.tipo === 'compra' || (b.cantidad !== undefined && b.cantidad !== null && b.cantidad !== '')) {
    cantidad = Math.round(Number(b.cantidad) * 100) / 100;
    if (!(cantidad > 0 && cantidad <= 1e7)) throw error(400, 'Indique la cantidad que quiere comprar');
  }
  const o = await db.obtenerOferta(b.oferta_id);
  if (!o || !o.activa || !o.productor_activo) throw error(404, 'La oferta ya no está disponible');
  if (o.usuario_id === req.usuario.id) throw error(400, 'No puede enviarse una solicitud a sí mismo');
  if (await db.pendienteDe(req.usuario.id, o.id)) throw error(409, 'Ya tiene una solicitud pendiente para esta oferta');
  if (await db.contarSolicitudesDesde(req.usuario.id, new Date(Date.now() - 864e5)) >= SOLICITUDES_POR_DIA) {
    throw error(429, `Puede enviar hasta ${SOLICITUDES_POR_DIA} solicitudes por día`);
  }
  const id = await db.crearSolicitud({
    ofertaId: o.id, compradorId: req.usuario.id, productorId: o.usuario_id, tipo: b.tipo, cantidad, mensaje,
  });
  const nombre = (await catalogoPorCodigo()).get(o.cultivo)?.nombre || o.cultivo;
  await avisar(o.usuario_id, {
    tipo: 'solicitud',
    titulo: b.tipo === 'compra' ? 'Nueva solicitud de compra' : 'Un comprador quiere contactarle',
    mensaje: `${req.usuario.nombre} · ${nombre}${cantidad ? `: ${cantidad} ${o.unidad}` : ''}. Responda en Poseidon, sección Mis ventas.`,
  });
  res.status(201).json({ id });
}));

app.get('/api/solicitudes/enviadas', sesion, requierePermiso('comprar'), ruta(async (req, res) => {
  const porCodigo = await catalogoPorCodigo();
  res.json((await db.listarSolicitudes({ compradorId: req.usuario.id })).map((s) => vistaSolicitud(s, 'comprador', porCodigo)));
}));

app.get('/api/solicitudes/recibidas', sesion, requierePermiso('ofertar'), ruta(async (req, res) => {
  const porCodigo = await catalogoPorCodigo();
  res.json((await db.listarSolicitudes({ productorId: req.usuario.id })).map((s) => vistaSolicitud(s, 'productor', porCodigo)));
}));

// Cuerpo: { estado: "aceptada"|"rechazada", respuesta?, telefono? (solo al aceptar, si quiere compartirlo) }
app.patch('/api/solicitudes/:id/respuesta', sesion, requierePermiso('ofertar'), ruta(async (req, res) => {
  const b = req.body || {};
  if (!['aceptada', 'rechazada'].includes(b.estado)) throw error(400, 'Respuesta no válida');
  const s = await db.obtenerSolicitud(req.params.id);
  if (!s || s.productor_id !== req.usuario.id) throw error(404, 'Solicitud no encontrada');
  const telefono = b.estado === 'aceptada' ? String(b.telefono || '').replace(/[\s-]/g, '') || null : null;
  if (telefono && !TELEFONO.test(telefono)) throw error(400, 'Escriba el teléfono con código de país, por ejemplo +59170000000');
  if (!(await db.cerrarSolicitud(s.id, { estado: b.estado, respuesta: texto(b.respuesta, 1000) || null, telefono }))) {
    throw error(409, 'Esta solicitud ya fue respondida o retirada');
  }
  const nombre = (await catalogoPorCodigo()).get(s.cultivo)?.nombre || s.cultivo;
  await avisar(s.comprador_id, {
    tipo: 'solicitud',
    titulo: b.estado === 'aceptada' ? 'Solicitud aceptada' : 'Solicitud rechazada',
    mensaje: b.estado === 'aceptada'
      ? `El productor de ${nombre} aceptó su solicitud. Vea sus datos de contacto en Poseidon.`
      : `El productor de ${nombre} no puede atender su solicitud por ahora.`,
  });
  res.json({ ok: true });
}));

app.post('/api/solicitudes/:id/retirar', sesion, requierePermiso('comprar'), ruta(async (req, res) => {
  const s = await db.obtenerSolicitud(req.params.id);
  if (!s || s.comprador_id !== req.usuario.id) throw error(404, 'Solicitud no encontrada');
  if (!(await db.cerrarSolicitud(s.id, { estado: 'retirada' }))) throw error(409, 'Solo se puede retirar una solicitud pendiente');
  res.json({ ok: true });
}));

// ---------- Incidencias de plagas y enfermedades en campo (HU-OPT-02) ----------
const TIPOS_INCIDENCIA = ['plaga', 'enfermedad', 'deficiencia'];
const SEVERIDADES = ['baja', 'media', 'alta'];

async function conFotos(lista) {
  const fotos = await db.fotosDeIncidencias(lista.map((i) => i.id));
  return lista.map((i) => ({
    ...i,
    fotos: fotos.filter((f) => f.incidencia_id === i.id)
      .map((f) => ({ id: f.id, almacen: f.almacen, enlace: f.enlace, creado_en: f.creado_en })),
  }));
}

app.get('/api/incidencias', sesion, requierePermiso('incidencias', 'reportes'), ruta(async (_req, res) => {
  res.json({
    incidencias: await conFotos(await db.listarIncidencias()),
    almacen_fotos: await estadoFotos(),
    radio_km: RADIO_KM,
    max_fotos: MAX_POR_INCIDENCIA,
  });
}));

// Cuerpo: { tipo, agente, cultivo?, severidad, lat, lon, precision_m?, nota? }
app.post('/api/incidencias', sesion, requierePermiso('incidencias'), ruta(async (req, res) => {
  const b = req.body || {};
  const [lat, lon] = coordenadas(b.lat, b.lon);
  if (!TIPOS_INCIDENCIA.includes(b.tipo)) throw error(400, 'Tipo no válido');
  if (!SEVERIDADES.includes(b.severidad)) throw error(400, 'Severidad no válida');
  const agente = texto(b.agente, 80);
  if (agente.length < 3) throw error(400, 'Indique qué plaga, enfermedad o deficiencia observó');
  let cultivo = null;
  if (b.cultivo) {
    if (!(await catalogoPorCodigo()).has(b.cultivo)) throw error(400, 'Cultivo desconocido');
    cultivo = b.cultivo;
  }
  let precision = null;
  if (b.precision_m !== undefined && b.precision_m !== null) {
    precision = Math.round(Number(b.precision_m));
    if (!(precision >= 0 && precision <= 30000)) throw error(400, 'Precisión GPS no válida');
  }
  const id = await db.crearIncidencia({
    tecnicoId: req.usuario.id, tipo: b.tipo, agente, cultivo, severidad: b.severidad,
    lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6, precision, nota: texto(b.nota, 500) || null,
  });
  res.status(201).json({ id });
}));

app.patch('/api/incidencias/:id', sesion, requierePermiso('incidencias'), ruta(async (req, res) => {
  if (!['activa', 'controlada'].includes(req.body?.estado)) throw error(400, 'Estado no válido');
  if (!(await db.cambiarEstadoIncidencia(req.params.id, req.body.estado))) throw error(404, 'Incidencia no encontrada');
  res.json({ ok: true });
}));

// Una foto por petición, como cuerpo binario (image/jpeg, image/png o image/webp).
const cuerpoFoto = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: MAX_BYTES });

app.post('/api/incidencias/:id/fotos', sesion, requierePermiso('incidencias'), cuerpoFoto, ruta(async (req, res) => {
  const i = await db.obtenerIncidencia(req.params.id);
  if (!i) throw error(404, 'Incidencia no encontrada');
  if (!Buffer.isBuffer(req.body) || !req.body.length) throw error(400, 'Envíe la foto como imagen JPEG, PNG o WebP');
  const existentes = await db.fotosDeIncidencias([i.id]);
  if (existentes.length >= MAX_POR_INCIDENCIA) throw error(400, `Cada incidencia admite hasta ${MAX_POR_INCIDENCIA} fotos`);
  const dia = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const guardada = await guardarFoto(req.body, {
    nombre: `incidencia-${i.id}-${dia}-${existentes.length + 1}`,
    descripcion: `${i.tipo}: ${i.agente}${i.cultivo ? ` en ${i.cultivo}` : ''} · severidad ${i.severidad} · `
      + `${i.lat}, ${i.lon} · registrada por ${i.tecnico}${i.nota ? ` · ${i.nota}` : ''}`,
    propiedades: { poseidon_incidencia: String(i.id) },
  });
  const id = await db.agregarFoto({ incidenciaId: i.id, ...guardada, autorId: req.usuario.id });
  res.status(201).json({ id, almacen: guardada.almacen, enlace: guardada.enlace });
}));

app.get('/api/incidencias/:id/fotos/:foto', sesion, requierePermiso('incidencias', 'reportes'), ruta(async (req, res) => {
  const f = await db.obtenerFoto(req.params.foto);
  if (!f || f.incidencia_id !== Number(req.params.id)) throw error(404, 'Foto no encontrada');
  const datos = await leerFoto(f);
  res.set({ 'Content-Type': f.mime, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
  res.send(datos);
}));

registrarRutas(app, { sesion, ruta, error, texto, catalogoPorCodigo, resumir });

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'El archivo es demasiado grande' });
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Error interno', ...(err.campo ? { campo: err.campo } : {}) });
});

await db.iniciar();
await respaldos.programar();
programarAlertas();
const puerto = Number(process.env.PORT || 3001);
app.listen(puerto, () => console.log(`API Poseidon en http://localhost:${puerto} (datos: ${db.modo()})`));
