// Acceso a datos. Usa MySQL; si no está disponible al arrancar, pasa a "modo memoria":
// todo funciona igual pero los datos se pierden al reiniciar (útil para demos).
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import 'dotenv/config';
import { hashPassword } from './auth.js';
import { POR_DEFECTO, FIJOS } from './permisos.js';

const leerJson = async (nombre) => JSON.parse(
  await readFile(new URL(`../../Database/${nombre}`, import.meta.url), 'utf8'),
);
export const cultivosDeArchivo = () => leerJson('cultivos.json');
export const usuariosDemo = () => leerJson('usuarios_demo.json');

let pool = null;
// Cuando no hay MySQL: { usuarios, evaluaciones (parcela + evaluación juntas), rol_permisos,
// preferencias_alertas, suscripciones_push, alertas_enviadas }
let memoria = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'poseidon',
      connectionLimit: 5,
      connectTimeout: 3000,
    });
  }
  return pool;
}

export const modo = () => (memoria ? 'memoria' : 'mysql');

// Tablas añadidas después de la primera versión del esquema. Se crean al arrancar si faltan,
// para no obligar a borrar la base. Deben coincidir con Database/schema.sql.
const MIGRACIONES = [
  `CREATE TABLE IF NOT EXISTS rol_permisos (
    rol ENUM('administrador','operativo','cliente','monitoreo') NOT NULL,
    permiso VARCHAR(30) NOT NULL,
    PRIMARY KEY (rol, permiso))`,
  `CREATE TABLE IF NOT EXISTS preferencias_alertas (
    usuario_id INT PRIMARY KEY,
    helada BOOLEAN NOT NULL DEFAULT TRUE,
    sequia BOOLEAN NOT NULL DEFAULT TRUE,
    web BOOLEAN NOT NULL DEFAULT TRUE,
    sms BOOLEAN NOT NULL DEFAULT FALSE,
    telefono VARCHAR(20) NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS suscripciones_push (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    endpoint VARCHAR(500) NOT NULL UNIQUE,
    p256dh VARCHAR(200) NOT NULL,
    auth VARCHAR(100) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS alertas_enviadas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    parcela_id INT NULL,
    tipo VARCHAR(20) NOT NULL,
    clave VARCHAR(120) NOT NULL,
    titulo VARCHAR(120) NOT NULL,
    mensaje TEXT NOT NULL,
    canales JSON NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY una_vez (usuario_id, clave),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE)`,
];

const filasPorDefecto = () => Object.entries(POR_DEFECTO)
  .flatMap(([rol, lista]) => lista.map((permiso) => ({ rol, permiso })));

export async function iniciar() {
  try {
    const db = getPool();
    await db.query('SELECT 1 FROM usuarios LIMIT 1');
    for (const sql of MIGRACIONES) await db.query(sql);
    await sembrarPermisos();
    console.log('[db] Conectado a MySQL');
  } catch (e) {
    let clave = process.env.DEMO_PASSWORD;
    if (!clave || clave === 'cambie-esta-clave') {
      clave = randomBytes(6).toString('base64url');
      console.warn(`[db] DEMO_PASSWORD no definido; clave temporal de los usuarios demo: ${clave}`);
    }
    const hash = hashPassword(clave);
    memoria = {
      usuarios: (await usuariosDemo()).map((u, i) => ({
        id: i + 1, ...u, password_hash: hash, activo: true, creado_en: new Date(),
      })),
      evaluaciones: [],
      rol_permisos: filasPorDefecto(),
      preferencias_alertas: [],
      suscripciones_push: [],
      alertas_enviadas: [],
    };
    console.warn(`[db] MySQL no disponible (${e.code || e.message}). Modo memoria: los datos no se guardan.`);
  }
}

// Carga los permisos por defecto solo si la tabla está vacía, para no pisar lo que el administrador cambió.
export async function sembrarPermisos(db = getPool()) {
  const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM rol_permisos');
  if (n > 0) return false;
  const filas = filasPorDefecto();
  await db.query('INSERT INTO rol_permisos (rol, permiso) VALUES ?', [filas.map((f) => [f.rol, f.permiso])]);
  return true;
}

const json = (v) => (typeof v === 'string' ? JSON.parse(v) : v); // MariaDB devuelve JSON como texto
const proximoId = (lista) => Math.max(0, ...lista.map((x) => x.id)) + 1;

// ---------- Cultivos ----------
export async function getCultivos() {
  let filas = [];
  if (!memoria) [filas] = await getPool().query('SELECT * FROM cultivos ORDER BY nombre');
  const origen = filas.length ? 'mysql' : 'archivo';
  if (!filas.length) filas = await cultivosDeArchivo();
  return {
    origen,
    cultivos: filas.map((c) => ({
      ...c, kc: Number(c.kc),
      fija_nitrogeno: Boolean(c.fija_nitrogeno), raiz_profunda: Boolean(c.raiz_profunda), forraje: Boolean(c.forraje),
    })),
  };
}

// ---------- Usuarios ----------
const usuario = (u) => u && { ...u, activo: Boolean(u.activo) };

export async function usuarioPorEmail(email) {
  if (memoria) return usuario(memoria.usuarios.find((u) => u.email === email));
  const [f] = await getPool().query('SELECT * FROM usuarios WHERE email = ?', [email]);
  return usuario(f[0]);
}

export async function usuarioPorId(id) {
  if (memoria) return usuario(memoria.usuarios.find((u) => u.id === Number(id)));
  const [f] = await getPool().query('SELECT * FROM usuarios WHERE id = ?', [id]);
  return usuario(f[0]);
}

export async function listarUsuarios() {
  let filas;
  if (memoria) filas = memoria.usuarios;
  else [filas] = await getPool().query('SELECT * FROM usuarios ORDER BY id');
  return filas.map(({ password_hash, ...u }) => usuario(u));
}

export async function crearUsuario({ nombre, email, password_hash, rol }) {
  if (memoria) {
    const id = proximoId(memoria.usuarios);
    memoria.usuarios.push({ id, nombre, email, password_hash, rol, activo: true, creado_en: new Date() });
    return id;
  }
  const [r] = await getPool().query(
    'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)', [nombre, email, password_hash, rol]);
  return r.insertId;
}

export async function actualizarUsuario(id, { rol, activo }) {
  if (memoria) {
    const u = memoria.usuarios.find((x) => x.id === Number(id));
    if (!u) return false;
    if (rol !== undefined) u.rol = rol;
    if (activo !== undefined) u.activo = activo;
    return true;
  }
  const [r] = await getPool().query(
    'UPDATE usuarios SET rol = COALESCE(?, rol), activo = COALESCE(?, activo) WHERE id = ?',
    [rol ?? null, activo ?? null, id]);
  return r.affectedRows > 0;
}

// ---------- Permisos por rol ----------
let cachePermisos = null; // { rol: Set } — se invalida al cambiar permisos o restaurar

async function tablaPermisos() {
  if (cachePermisos) return cachePermisos;
  let filas;
  if (memoria) filas = memoria.rol_permisos;
  else [filas] = await getPool().query('SELECT rol, permiso FROM rol_permisos');
  const mapa = {};
  for (const { rol, permiso } of filas) (mapa[rol] ||= new Set()).add(permiso);
  for (const [rol, lista] of Object.entries(FIJOS)) for (const p of lista) (mapa[rol] ||= new Set()).add(p);
  cachePermisos = mapa;
  return mapa;
}

export async function permisosDeRol(rol) {
  return [...((await tablaPermisos())[rol] || [])].sort();
}

export async function matrizPermisos() {
  const mapa = await tablaPermisos();
  return Object.fromEntries(Object.entries(mapa).map(([rol, s]) => [rol, [...s].sort()]));
}

export async function setPermisosRol(rol, permisos) {
  const lista = [...new Set([...permisos, ...(FIJOS[rol] || [])])];
  if (memoria) {
    memoria.rol_permisos = memoria.rol_permisos.filter((f) => f.rol !== rol)
      .concat(lista.map((permiso) => ({ rol, permiso })));
  } else {
    const cx = await getPool().getConnection();
    try {
      await cx.beginTransaction();
      await cx.query('DELETE FROM rol_permisos WHERE rol = ?', [rol]);
      if (lista.length) await cx.query('INSERT INTO rol_permisos (rol, permiso) VALUES ?', [lista.map((p) => [rol, p])]);
      await cx.commit();
    } catch (e) {
      await cx.rollback();
      throw e;
    } finally {
      cx.release();
    }
  }
  cachePermisos = null;
}

// ---------- Evaluaciones ----------
const SQL_EVALUACIONES = `
  SELECT e.id, e.estado, e.nota_tecnico, e.revisado_en, e.creado_en, e.rotacion_actual, e.prioridades,
         e.fuente_clima, e.resultado, p.nombre AS parcela, p.lat, p.lon, p.usuario_id,
         u.nombre AS cliente, r.nombre AS revisor
  FROM evaluaciones e
  JOIN parcelas p ON p.id = e.parcela_id
  JOIN usuarios u ON u.id = p.usuario_id
  LEFT JOIN usuarios r ON r.id = e.revisado_por`;

const evaluacion = (f) => f && {
  ...f, lat: Number(f.lat), lon: Number(f.lon),
  rotacion_actual: json(f.rotacion_actual), prioridades: json(f.prioridades), resultado: json(f.resultado),
};

function deMemoria(e) {
  const nombreDe = (id) => memoria.usuarios.find((u) => u.id === id)?.nombre || null;
  return { ...e, cliente: nombreDe(e.usuario_id), revisor: nombreDe(e.revisado_por) };
}

export async function guardarEvaluacion({ usuarioId, nombre, lat, lon, rotacion, prioridades, fuenteClima, estrategias }) {
  if (memoria) {
    const id = proximoId(memoria.evaluaciones);
    memoria.evaluaciones.push({
      id, usuario_id: usuarioId, parcela: nombre, lat, lon, rotacion_actual: rotacion, prioridades,
      fuente_clima: fuenteClima, resultado: estrategias, estado: 'pendiente', nota_tecnico: null,
      revisado_por: null, revisado_en: null, creado_en: new Date(),
    });
    return id;
  }
  const db = getPool();
  const [p] = await db.query('INSERT INTO parcelas (usuario_id, nombre, lat, lon) VALUES (?, ?, ?, ?)', [usuarioId, nombre, lat, lon]);
  const [e] = await db.query(
    'INSERT INTO evaluaciones (parcela_id, rotacion_actual, prioridades, fuente_clima, resultado) VALUES (?, ?, ?, ?, ?)',
    [p.insertId, JSON.stringify(rotacion), JSON.stringify(prioridades), fuenteClima, JSON.stringify(estrategias)]);
  return e.insertId;
}

// usuarioId limita a las evaluaciones de ese cliente; sin él devuelve todas.
export async function listarEvaluaciones({ usuarioId } = {}) {
  if (memoria) {
    return memoria.evaluaciones
      .filter((e) => !usuarioId || e.usuario_id === usuarioId)
      .map(deMemoria).reverse();
  }
  const [f] = await getPool().query(
    `${SQL_EVALUACIONES} ${usuarioId ? 'WHERE p.usuario_id = ?' : ''} ORDER BY e.id DESC LIMIT 200`,
    usuarioId ? [usuarioId] : []);
  return f.map(evaluacion);
}

export async function obtenerEvaluacion(id) {
  if (memoria) {
    const e = memoria.evaluaciones.find((x) => x.id === Number(id));
    return e ? deMemoria(e) : undefined;
  }
  const [f] = await getPool().query(`${SQL_EVALUACIONES} WHERE e.id = ?`, [id]);
  return evaluacion(f[0]);
}

export async function revisarEvaluacion(id, { nota, revisorId }) {
  if (memoria) {
    const e = memoria.evaluaciones.find((x) => x.id === Number(id));
    if (!e) return false;
    Object.assign(e, { estado: 'revisada', nota_tecnico: nota, revisado_por: revisorId, revisado_en: new Date() });
    return true;
  }
  const [r] = await getPool().query(
    "UPDATE evaluaciones SET estado = 'revisada', nota_tecnico = ?, revisado_por = ?, revisado_en = NOW() WHERE id = ?",
    [nota, revisorId, id]);
  return r.affectedRows > 0;
}

// ---------- Alertas climáticas ----------
// Parcelas de usuarios activos, para revisar umbrales. usuarioId limita a las de esa persona.
export async function parcelasParaAlertas({ usuarioId } = {}) {
  if (memoria) {
    const activos = new Map(memoria.usuarios.filter((u) => u.activo).map((u) => [u.id, u]));
    return memoria.evaluaciones
      .filter((e) => activos.has(e.usuario_id) && (!usuarioId || e.usuario_id === usuarioId))
      .map((e) => ({ id: e.id, usuario_id: e.usuario_id, rol: activos.get(e.usuario_id).rol, nombre: e.parcela, lat: e.lat, lon: e.lon }));
  }
  const [f] = await getPool().query(
    `SELECT p.id, p.usuario_id, u.rol, p.nombre, p.lat, p.lon FROM parcelas p
     JOIN usuarios u ON u.id = p.usuario_id WHERE u.activo ${usuarioId ? 'AND p.usuario_id = ?' : ''} ORDER BY p.id DESC`,
    usuarioId ? [usuarioId] : []);
  return f.map((p) => ({ ...p, lat: Number(p.lat), lon: Number(p.lon) }));
}

const PREFS_INICIALES = { helada: true, sequia: true, web: true, sms: false, telefono: null };
const preferencias = (f) => ({
  helada: Boolean(f.helada), sequia: Boolean(f.sequia), web: Boolean(f.web), sms: Boolean(f.sms), telefono: f.telefono || null,
});

export async function getPreferencias(usuarioId) {
  let f;
  if (memoria) f = memoria.preferencias_alertas.find((p) => p.usuario_id === usuarioId);
  else [[f]] = await getPool().query('SELECT * FROM preferencias_alertas WHERE usuario_id = ?', [usuarioId]);
  return f ? preferencias(f) : { ...PREFS_INICIALES };
}

export async function setPreferencias(usuarioId, p) {
  if (memoria) {
    memoria.preferencias_alertas = memoria.preferencias_alertas.filter((x) => x.usuario_id !== usuarioId)
      .concat({ usuario_id: usuarioId, ...p, actualizado_en: new Date() });
    return;
  }
  await getPool().query(
    `INSERT INTO preferencias_alertas (usuario_id, helada, sequia, web, sms, telefono) VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE helada=VALUES(helada), sequia=VALUES(sequia), web=VALUES(web), sms=VALUES(sms), telefono=VALUES(telefono)`,
    [usuarioId, p.helada, p.sequia, p.web, p.sms, p.telefono]);
}

export async function listarSuscripciones(usuarioId) {
  if (memoria) return memoria.suscripciones_push.filter((s) => s.usuario_id === usuarioId);
  const [f] = await getPool().query('SELECT * FROM suscripciones_push WHERE usuario_id = ?', [usuarioId]);
  return f;
}

// Un mismo navegador (endpoint) pertenece a quien lo registró por última vez.
export async function guardarSuscripcion({ usuarioId, endpoint, p256dh, auth }) {
  if (memoria) {
    memoria.suscripciones_push = memoria.suscripciones_push.filter((s) => s.endpoint !== endpoint);
    memoria.suscripciones_push.push({ id: proximoId(memoria.suscripciones_push), usuario_id: usuarioId, endpoint, p256dh, auth, creado_en: new Date() });
    return;
  }
  await getPool().query(
    `INSERT INTO suscripciones_push (usuario_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE usuario_id=VALUES(usuario_id), p256dh=VALUES(p256dh), auth=VALUES(auth)`,
    [usuarioId, endpoint, p256dh, auth]);
}

// Con usuarioId solo borra si es de esa persona; sin él (suscripción vencida) la borra siempre.
export async function borrarSuscripcion(endpoint, usuarioId) {
  if (memoria) {
    const antes = memoria.suscripciones_push.length;
    memoria.suscripciones_push = memoria.suscripciones_push
      .filter((s) => !(s.endpoint === endpoint && (!usuarioId || s.usuario_id === usuarioId)));
    return memoria.suscripciones_push.length < antes;
  }
  const [r] = await getPool().query(
    `DELETE FROM suscripciones_push WHERE endpoint = ? ${usuarioId ? 'AND usuario_id = ?' : ''}`,
    usuarioId ? [endpoint, usuarioId] : [endpoint]);
  return r.affectedRows > 0;
}

export async function alertaYaEnviada(usuarioId, clave) {
  if (memoria) return memoria.alertas_enviadas.some((a) => a.usuario_id === usuarioId && a.clave === clave);
  const [f] = await getPool().query('SELECT 1 FROM alertas_enviadas WHERE usuario_id = ? AND clave = ?', [usuarioId, clave]);
  return f.length > 0;
}

export async function registrarAlerta({ usuarioId, parcelaId = null, tipo, clave, titulo, mensaje, canales }) {
  if (memoria) {
    memoria.alertas_enviadas.push({
      id: proximoId(memoria.alertas_enviadas), usuario_id: usuarioId, parcela_id: parcelaId, tipo, clave, titulo, mensaje, canales, creado_en: new Date(),
    });
    return;
  }
  await getPool().query(
    'INSERT IGNORE INTO alertas_enviadas (usuario_id, parcela_id, tipo, clave, titulo, mensaje, canales) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [usuarioId, parcelaId, tipo, clave, titulo, mensaje, JSON.stringify(canales)]);
}

export async function listarAlertas(usuarioId) {
  if (memoria) return memoria.alertas_enviadas.filter((a) => a.usuario_id === usuarioId).reverse().slice(0, 50);
  const [f] = await getPool().query(
    'SELECT id, parcela_id, tipo, titulo, mensaje, canales, creado_en FROM alertas_enviadas WHERE usuario_id = ? ORDER BY id DESC LIMIT 50',
    [usuarioId]);
  return f.map((a) => ({ ...a, canales: json(a.canales) }));
}

// ---------- Respaldo y restauración ----------
// Tablas que entran en un respaldo, en orden de inserción. Solo se escriben las columnas listadas.
export const TABLAS = {
  usuarios: { cols: ['id', 'nombre', 'email', 'password_hash', 'rol', 'activo', 'creado_en'], fechas: ['creado_en'] },
  rol_permisos: { cols: ['rol', 'permiso'] },
  parcelas: { cols: ['id', 'usuario_id', 'nombre', 'lat', 'lon', 'creado_en'], fechas: ['creado_en'] },
  evaluaciones: {
    cols: ['id', 'parcela_id', 'rotacion_actual', 'prioridades', 'fuente_clima', 'resultado', 'estado',
      'nota_tecnico', 'revisado_por', 'revisado_en', 'creado_en'],
    json: ['rotacion_actual', 'prioridades', 'resultado'], fechas: ['revisado_en', 'creado_en'],
  },
  preferencias_alertas: { cols: ['usuario_id', 'helada', 'sequia', 'web', 'sms', 'telefono', 'actualizado_en'], fechas: ['actualizado_en'] },
  suscripciones_push: { cols: ['id', 'usuario_id', 'endpoint', 'p256dh', 'auth', 'creado_en'], fechas: ['creado_en'] },
  alertas_enviadas: {
    cols: ['id', 'usuario_id', 'parcela_id', 'tipo', 'clave', 'titulo', 'mensaje', 'canales', 'creado_en'],
    json: ['canales'], fechas: ['creado_en'],
  },
};

// Normaliza una fila de respaldo: solo columnas conocidas, fechas como Date y JSON como objeto.
function normalizar(tabla, f) {
  const { cols, json: cj = [], fechas = [] } = TABLAS[tabla];
  return Object.fromEntries(cols.map((c) => {
    let v = f[c] ?? null;
    if (v !== null && fechas.includes(c)) v = new Date(v);
    if (v !== null && cj.includes(c)) v = json(v);
    return [c, v];
  }));
}

export async function exportar() {
  if (memoria) {
    const m = memoria;
    return {
      usuarios: m.usuarios.map((u) => normalizar('usuarios', u)),
      rol_permisos: m.rol_permisos.map((f) => ({ ...f })),
      parcelas: m.evaluaciones.map((e) => normalizar('parcelas', { ...e, nombre: e.parcela })),
      evaluaciones: m.evaluaciones.map((e) => normalizar('evaluaciones', { ...e, parcela_id: e.id })),
      preferencias_alertas: m.preferencias_alertas.map((f) => normalizar('preferencias_alertas', f)),
      suscripciones_push: m.suscripciones_push.map((f) => normalizar('suscripciones_push', f)),
      alertas_enviadas: m.alertas_enviadas.map((f) => normalizar('alertas_enviadas', f)),
    };
  }
  const salida = {};
  for (const [tabla, { cols }] of Object.entries(TABLAS)) {
    const [filas] = await getPool().query(`SELECT ${cols.join(', ')} FROM ${tabla}`);
    salida[tabla] = filas.map((f) => normalizar(tabla, f));
  }
  return salida;
}

// Reemplaza todo el contenido de las tablas del respaldo. En MySQL va en una transacción:
// si algo falla, la base queda como estaba.
export async function importar(datos) {
  const t = Object.fromEntries(Object.keys(TABLAS).map((k) => [k, (datos[k] || []).map((f) => normalizar(k, f))]));
  if (memoria) {
    const parcelas = new Map(t.parcelas.map((p) => [p.id, p]));
    memoria = {
      usuarios: t.usuarios.map((u) => ({ ...u, activo: Boolean(u.activo) })),
      evaluaciones: t.evaluaciones.filter((e) => parcelas.has(e.parcela_id)).map(({ parcela_id, ...e }) => {
        const p = parcelas.get(parcela_id);
        return { ...e, usuario_id: p.usuario_id, parcela: p.nombre, lat: Number(p.lat), lon: Number(p.lon) };
      }),
      rol_permisos: t.rol_permisos,
      preferencias_alertas: t.preferencias_alertas,
      suscripciones_push: t.suscripciones_push,
      alertas_enviadas: t.alertas_enviadas,
    };
  } else {
    const cx = await getPool().getConnection();
    try {
      await cx.beginTransaction();
      await cx.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const tabla of Object.keys(TABLAS).reverse()) await cx.query(`DELETE FROM ${tabla}`);
      for (const [tabla, { cols, json: cj = [] }] of Object.entries(TABLAS)) {
        if (!t[tabla].length) continue;
        const valores = t[tabla].map((f) => cols.map((c) => (cj.includes(c) && f[c] !== null ? JSON.stringify(f[c]) : f[c])));
        await cx.query(`INSERT INTO ${tabla} (${cols.join(', ')}) VALUES ?`, [valores]);
      }
      await cx.query('SET FOREIGN_KEY_CHECKS = 1');
      await cx.commit();
    } catch (e) {
      await cx.rollback();
      throw e;
    } finally {
      await cx.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
      cx.release();
    }
  }
  cachePermisos = null;
}
