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
import { clavePublica, entregar, enviarPush, smsConfigurado, TELEFONO } from './canales.js';
import { PRACTICAS, UNIDADES, vistaOferta, filtrarOfertas, contar, abreviar } from './ofertas.js';
import { zonaDe } from './geo.js';
import { presionDePlagas, RADIO_KM, VIGENCIA_DIAS } from './plagas.js';
import { guardarFoto, leerFoto, estadoFotos, MAX_BYTES, MAX_POR_INCIDENCIA } from './fotos.js';

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
  const recientes = await db.listarIncidencias({ desde: new Date(Date.now() - VIGENCIA_DIAS * 864e5) });
  const plagas = presionDePlagas(recientes, lat, lon, cultivos);
  const estrategias = compararRotaciones(rotacion, cultivos, meses, pesos, plagas);
  const id = await db.guardarEvaluacion({
    usuarioId: req.usuario.id, nombre: String(nombre || '').trim().slice(0, 80) || 'Parcela sin nombre',
    lat, lon, rotacion, prioridades: pesos, fuenteClima: base.fuente, estrategias,
  });
  res.json({ id, fuenteClima: base.fuente, clima: meses, estrategias, plagas });
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
  const incidencias = (await db.listarIncidencias({ desde: new Date(Date.now() - VIGENCIA_DIAS * 864e5) }))
    .filter((i) => i.estado === 'activa');
  for (const i of incidencias.filter((x) => x.severidad === 'alta')) {
    alertas.push({ id: `i${i.id}`, parcela: `${i.agente} (${i.tipo})`, tipo: 'plaga', texto: `Severidad alta reportada por ${i.tecnico}${i.cultivo ? ` en ${i.cultivo}` : ''}` });
  }
  res.json({
    totales: {
      evaluaciones: evaluaciones.length,
      pendientes: evaluaciones.filter((e) => e.estado === 'pendiente').length,
      clientes: new Set(evaluaciones.map((e) => e.usuario_id)).size,
      alertas: alertas.length,
      incidencias: incidencias.length,
    },
    usuarios_por_rol: contar(usuarios.filter((u) => u.activo), 'rol'),
    fuentes_clima: contar(evaluaciones, 'fuente_clima'),
    base_datos: db.modo(),
    alertas,
    evaluaciones,
    incidencias: incidencias.map((i) => ({
      id: i.id, tipo: i.tipo, agente: i.agente, cultivo: i.cultivo, severidad: i.severidad, lat: i.lat, lon: i.lon, creado_en: i.creado_en,
    })),
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

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'El archivo es demasiado grande' });
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Error interno' });
});

await db.iniciar();
await respaldos.programar();
programarAlertas();
const puerto = Number(process.env.PORT || 3001);
app.listen(puerto, () => console.log(`API Poseidon en http://localhost:${puerto} (datos: ${db.modo()})`));
