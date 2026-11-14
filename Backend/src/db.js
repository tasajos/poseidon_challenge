// Acceso a datos. Usa MySQL; si no está disponible al arrancar, pasa a "modo memoria":
// todo funciona igual pero los datos se pierden al reiniciar (útil para demos).
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import 'dotenv/config';
import { hashPassword } from './auth.js';
import { PERMISOS, POR_DEFECTO, FIJOS, ORIGINALES } from './permisos.js';

const leerJson = async (nombre) => JSON.parse(
  await readFile(new URL(`../../Database/${nombre}`, import.meta.url), 'utf8'),
);
export const cultivosDeArchivo = () => leerJson('cultivos.json');
export const usuariosDemo = () => leerJson('usuarios_demo.json');

let pool = null;
// Cuando no hay MySQL: { usuarios, evaluaciones (parcela + evaluación juntas), rol_permisos,
// preferencias_alertas, suscripciones_push, alertas_enviadas, ofertas, solicitudes, incidencias, incidencia_fotos }
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
  // Rol comprador (cooperativa o mercado local)
  `ALTER TABLE usuarios MODIFY rol ENUM('administrador','operativo','cliente','monitoreo','comprador') NOT NULL DEFAULT 'cliente'`,
  `ALTER TABLE rol_permisos MODIFY rol ENUM('administrador','operativo','cliente','monitoreo','comprador') NOT NULL`,
  `CREATE TABLE IF NOT EXISTS permisos_sembrados (
    permiso VARCHAR(30) PRIMARY KEY)`,
  `CREATE TABLE IF NOT EXISTS ofertas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    evaluacion_id INT NOT NULL,
    cultivo VARCHAR(30) NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    unidad ENUM('kg','qq','t') NOT NULL,
    disponible_desde CHAR(7) NOT NULL,
    nota VARCHAR(300) NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS solicitudes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    oferta_id INT NOT NULL,
    comprador_id INT NOT NULL,
    productor_id INT NOT NULL,
    tipo ENUM('compra','contacto') NOT NULL,
    cantidad DECIMAL(10,2) NULL,
    mensaje VARCHAR(1000) NOT NULL,
    estado ENUM('pendiente','aceptada','rechazada','retirada') NOT NULL DEFAULT 'pendiente',
    respuesta VARCHAR(1000) NULL,
    telefono_productor VARCHAR(20) NULL,
    respondido_en TIMESTAMP NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (oferta_id) REFERENCES ofertas(id) ON DELETE CASCADE,
    FOREIGN KEY (comprador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (productor_id) REFERENCES usuarios(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS incidencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tecnico_id INT NOT NULL,
    tipo ENUM('plaga','enfermedad','deficiencia') NOT NULL,
    agente VARCHAR(80) NOT NULL,
    cultivo VARCHAR(30) NULL,
    severidad ENUM('baja','media','alta') NOT NULL,
    lat DECIMAL(9,6) NOT NULL,
    lon DECIMAL(9,6) NOT NULL,
    precision_m SMALLINT NULL,
    nota VARCHAR(500) NULL,
    estado ENUM('activa','controlada') NOT NULL DEFAULT 'activa',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tecnico_id) REFERENCES usuarios(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS incidencia_fotos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incidencia_id INT NOT NULL,
    almacen ENUM('drive','local') NOT NULL,
    archivo VARCHAR(200) NOT NULL,
    enlace VARCHAR(300) NULL,
    mime VARCHAR(40) NOT NULL,
    bytes INT NOT NULL,
    subido_por INT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incidencia_id) REFERENCES incidencias(id) ON DELETE CASCADE,
    FOREIGN KEY (subido_por) REFERENCES usuarios(id) ON DELETE SET NULL)`,
];

// Aplica las migraciones (idempotentes). La usan el arranque del servidor y npm run seed.
export async function migrar(db = getPool()) {
  for (const sql of MIGRACIONES) await db.query(sql);
}

const filasPorDefecto = () => Object.entries(POR_DEFECTO)
  .flatMap(([rol, lista]) => lista.map((permiso) => ({ rol, permiso })));

export async function iniciar() {
  try {
    const db = getPool();
    await db.query('SELECT 1 FROM usuarios LIMIT 1');
    await migrar(db);
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
      ofertas: [],
      solicitudes: [],
      incidencias: [],
      incidencia_fotos: [],
    };
    console.warn(`[db] MySQL no disponible (${e.code || e.message}). Modo memoria: los datos no se guardan.`);
  }
}

// Carga los valores por defecto de cada permiso una sola vez (permisos_sembrados lo registra), así un
// permiso nuevo llega a una base existente sin pisar lo que el administrador cambió en los demás.
// Devuelve la lista de permisos sembrados en esta llamada.
export async function sembrarPermisos(db = getPool()) {
  const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM rol_permisos');
  const [hechos] = await db.query('SELECT permiso FROM permisos_sembrados');
  // Base anterior al registro: los permisos originales ya estaban configurados.
  const ya = new Set(hechos.length ? hechos.map((f) => f.permiso) : n > 0 ? ORIGINALES : []);
  const nuevos = Object.keys(PERMISOS).filter((p) => !ya.has(p));
  const filas = filasPorDefecto().filter((f) => nuevos.includes(f.permiso));
  if (filas.length) await db.query('INSERT IGNORE INTO rol_permisos (rol, permiso) VALUES ?', [filas.map((f) => [f.rol, f.permiso])]);
  const registrar = Object.keys(PERMISOS).filter((p) => !hechos.some((f) => f.permiso === p));
  if (registrar.length) await db.query('INSERT IGNORE INTO permisos_sembrados (permiso) VALUES ?', [registrar.map((p) => [p])]);
  if (filas.length) cachePermisos = null;
  return nuevos;
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

// ---------- Oferta sostenible (HU-CLI-02) ----------
const SQL_OFERTAS = `
  SELECT o.id, o.usuario_id, o.evaluacion_id, o.cultivo, o.cantidad, o.unidad, o.disponible_desde, o.nota, o.activa,
         o.creado_en, e.resultado, e.estado AS estado_evaluacion, p.nombre AS parcela, p.lat, p.lon,
         u.nombre AS productor, u.activo AS productor_activo
  FROM ofertas o
  JOIN evaluaciones e ON e.id = o.evaluacion_id
  JOIN parcelas p ON p.id = e.parcela_id
  JOIN usuarios u ON u.id = o.usuario_id`;

const oferta = (f) => f && {
  ...f, lat: Number(f.lat), lon: Number(f.lon), cantidad: Number(f.cantidad),
  activa: Boolean(f.activa), productor_activo: Boolean(f.productor_activo), resultado: json(f.resultado),
};

function ofertaDeMemoria(o) {
  const e = memoria.evaluaciones.find((x) => x.id === o.evaluacion_id);
  const u = memoria.usuarios.find((x) => x.id === o.usuario_id);
  if (!e || !u) return null;
  return {
    ...o, resultado: e.resultado, estado_evaluacion: e.estado, parcela: e.parcela, lat: e.lat, lon: e.lon,
    productor: u.nombre, productor_activo: u.activo,
  };
}

// usuarioId: solo las de ese productor. publicas: solo activas de productores activos.
export async function listarOfertas({ usuarioId, publicas } = {}) {
  let filas;
  if (memoria) filas = memoria.ofertas.map(ofertaDeMemoria).filter(Boolean).reverse();
  else {
    const donde = [], valores = [];
    if (usuarioId) { donde.push('o.usuario_id = ?'); valores.push(usuarioId); }
    if (publicas) donde.push('o.activa AND u.activo');
    const where = donde.length ? `WHERE ${donde.join(' AND ')}` : '';
    [filas] = await getPool().query(`${SQL_OFERTAS} ${where} ORDER BY o.id DESC LIMIT 500`, valores);
    filas = filas.map(oferta);
  }
  return filas.filter((o) => (!usuarioId || o.usuario_id === usuarioId) && (!publicas || (o.activa && o.productor_activo)));
}

export async function obtenerOferta(id) {
  if (memoria) {
    const o = memoria.ofertas.find((x) => x.id === Number(id));
    return o ? ofertaDeMemoria(o) : undefined;
  }
  const [f] = await getPool().query(`${SQL_OFERTAS} WHERE o.id = ?`, [id]);
  return oferta(f[0]);
}

export async function crearOferta({ usuarioId, evaluacionId, cultivo, cantidad, unidad, disponible, nota }) {
  if (memoria) {
    const id = proximoId(memoria.ofertas);
    memoria.ofertas.push({
      id, usuario_id: usuarioId, evaluacion_id: evaluacionId, cultivo, cantidad, unidad,
      disponible_desde: disponible, nota, activa: true, creado_en: new Date(),
    });
    return id;
  }
  const [r] = await getPool().query(
    'INSERT INTO ofertas (usuario_id, evaluacion_id, cultivo, cantidad, unidad, disponible_desde, nota) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [usuarioId, evaluacionId, cultivo, cantidad, unidad, disponible, nota]);
  return r.insertId;
}

export async function cambiarOferta(id, usuarioId, { activa }) {
  if (memoria) {
    const o = memoria.ofertas.find((x) => x.id === Number(id) && x.usuario_id === usuarioId);
    if (!o) return false;
    o.activa = activa;
    return true;
  }
  const [r] = await getPool().query('UPDATE ofertas SET activa = ? WHERE id = ? AND usuario_id = ?', [activa, id, usuarioId]);
  return r.affectedRows > 0;
}

// ---------- Solicitudes de compra (HU-CLI-03) ----------
const SQL_SOLICITUDES = `
  SELECT s.id, s.oferta_id, s.comprador_id, s.productor_id, s.tipo, s.cantidad, s.mensaje, s.estado, s.respuesta,
         s.telefono_productor, s.respondido_en, s.creado_en, o.cultivo, o.unidad, o.cantidad AS cantidad_ofertada,
         pa.lat, pa.lon, c.nombre AS comprador, c.email AS comprador_email, p.nombre AS productor, p.email AS productor_email
  FROM solicitudes s
  JOIN ofertas o ON o.id = s.oferta_id
  JOIN evaluaciones e ON e.id = o.evaluacion_id
  JOIN parcelas pa ON pa.id = e.parcela_id
  JOIN usuarios c ON c.id = s.comprador_id
  JOIN usuarios p ON p.id = s.productor_id`;

const solicitud = (f) => f && {
  ...f, lat: Number(f.lat), lon: Number(f.lon), cantidad: f.cantidad === null ? null : Number(f.cantidad),
  cantidad_ofertada: Number(f.cantidad_ofertada),
};

function solicitudDeMemoria(s) {
  const o = memoria.ofertas.find((x) => x.id === s.oferta_id);
  const e = o && memoria.evaluaciones.find((x) => x.id === o.evaluacion_id);
  const c = memoria.usuarios.find((x) => x.id === s.comprador_id);
  const p = memoria.usuarios.find((x) => x.id === s.productor_id);
  if (!o || !e || !c || !p) return null;
  return {
    ...s, cultivo: o.cultivo, unidad: o.unidad, cantidad_ofertada: o.cantidad, lat: e.lat, lon: e.lon,
    comprador: c.nombre, comprador_email: c.email, productor: p.nombre, productor_email: p.email,
  };
}

export async function listarSolicitudes({ compradorId, productorId }) {
  const campo = compradorId ? 'comprador_id' : 'productor_id';
  const valor = compradorId || productorId;
  if (memoria) return memoria.solicitudes.filter((s) => s[campo] === valor).map(solicitudDeMemoria).filter(Boolean).reverse();
  const [f] = await getPool().query(`${SQL_SOLICITUDES} WHERE s.${campo} = ? ORDER BY s.id DESC LIMIT 200`, [valor]);
  return f.map(solicitud);
}

export async function obtenerSolicitud(id) {
  if (memoria) {
    const s = memoria.solicitudes.find((x) => x.id === Number(id));
    return s ? solicitudDeMemoria(s) : undefined;
  }
  const [f] = await getPool().query(`${SQL_SOLICITUDES} WHERE s.id = ?`, [id]);
  return solicitud(f[0]);
}

export async function crearSolicitud({ ofertaId, compradorId, productorId, tipo, cantidad, mensaje }) {
  if (memoria) {
    const id = proximoId(memoria.solicitudes);
    memoria.solicitudes.push({
      id, oferta_id: ofertaId, comprador_id: compradorId, productor_id: productorId, tipo, cantidad, mensaje,
      estado: 'pendiente', respuesta: null, telefono_productor: null, respondido_en: null, creado_en: new Date(),
    });
    return id;
  }
  const [r] = await getPool().query(
    'INSERT INTO solicitudes (oferta_id, comprador_id, productor_id, tipo, cantidad, mensaje) VALUES (?, ?, ?, ?, ?, ?)',
    [ofertaId, compradorId, productorId, tipo, cantidad, mensaje]);
  return r.insertId;
}

// Solo cambia solicitudes pendientes: una respuesta no se puede reescribir.
export async function cerrarSolicitud(id, { estado, respuesta = null, telefono = null }) {
  if (memoria) {
    const s = memoria.solicitudes.find((x) => x.id === Number(id) && x.estado === 'pendiente');
    if (!s) return false;
    Object.assign(s, { estado, respuesta, telefono_productor: telefono, respondido_en: new Date() });
    return true;
  }
  const [r] = await getPool().query(
    "UPDATE solicitudes SET estado = ?, respuesta = ?, telefono_productor = ?, respondido_en = NOW() WHERE id = ? AND estado = 'pendiente'",
    [estado, respuesta, telefono, id]);
  return r.affectedRows > 0;
}

// Para limitar envíos: cuántas solicitudes hizo el comprador desde una fecha.
export async function contarSolicitudesDesde(compradorId, desde) {
  if (memoria) return memoria.solicitudes.filter((s) => s.comprador_id === compradorId && s.creado_en >= desde).length;
  const [[{ n }]] = await getPool().query('SELECT COUNT(*) AS n FROM solicitudes WHERE comprador_id = ? AND creado_en >= ?', [compradorId, desde]);
  return Number(n);
}

export async function pendienteDe(compradorId, ofertaId) {
  if (memoria) return memoria.solicitudes.some((s) => s.comprador_id === compradorId && s.oferta_id === ofertaId && s.estado === 'pendiente');
  const [f] = await getPool().query("SELECT 1 FROM solicitudes WHERE comprador_id = ? AND oferta_id = ? AND estado = 'pendiente'", [compradorId, ofertaId]);
  return f.length > 0;
}

// ---------- Incidencias de campo (HU-OPT-02) ----------
const incidencia = (f) => f && { ...f, lat: Number(f.lat), lon: Number(f.lon) };
const conTecnico = (i) => ({ ...i, tecnico: memoria.usuarios.find((u) => u.id === i.tecnico_id)?.nombre || null });
const SQL_INCIDENCIAS = 'SELECT i.*, u.nombre AS tecnico FROM incidencias i JOIN usuarios u ON u.id = i.tecnico_id';

// desde: solo las creadas después de esa fecha.
export async function listarIncidencias({ desde } = {}) {
  if (memoria) return memoria.incidencias.filter((i) => !desde || i.creado_en >= desde).map(conTecnico).reverse();
  const [f] = await getPool().query(
    `${SQL_INCIDENCIAS} ${desde ? 'WHERE i.creado_en >= ?' : ''} ORDER BY i.id DESC LIMIT 1000`, desde ? [desde] : []);
  return f.map(incidencia);
}

export async function obtenerIncidencia(id) {
  if (memoria) {
    const i = memoria.incidencias.find((x) => x.id === Number(id));
    return i ? conTecnico(i) : undefined;
  }
  const [f] = await getPool().query(`${SQL_INCIDENCIAS} WHERE i.id = ?`, [id]);
  return incidencia(f[0]);
}

export async function crearIncidencia({ tecnicoId, tipo, agente, cultivo, severidad, lat, lon, precision, nota }) {
  if (memoria) {
    const id = proximoId(memoria.incidencias);
    memoria.incidencias.push({
      id, tecnico_id: tecnicoId, tipo, agente, cultivo, severidad, lat, lon, precision_m: precision, nota,
      estado: 'activa', creado_en: new Date(),
    });
    return id;
  }
  const [r] = await getPool().query(
    `INSERT INTO incidencias (tecnico_id, tipo, agente, cultivo, severidad, lat, lon, precision_m, nota)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [tecnicoId, tipo, agente, cultivo, severidad, lat, lon, precision, nota]);
  return r.insertId;
}

export async function cambiarEstadoIncidencia(id, estado) {
  if (memoria) {
    const i = memoria.incidencias.find((x) => x.id === Number(id));
    if (!i) return false;
    i.estado = estado;
    return true;
  }
  const [r] = await getPool().query('UPDATE incidencias SET estado = ? WHERE id = ?', [estado, id]);
  return r.affectedRows > 0;
}

export async function fotosDeIncidencias(ids) {
  if (!ids.length) return [];
  if (memoria) return memoria.incidencia_fotos.filter((f) => ids.includes(f.incidencia_id));
  const [f] = await getPool().query('SELECT * FROM incidencia_fotos WHERE incidencia_id IN (?) ORDER BY id', [ids]);
  return f;
}

export async function obtenerFoto(id) {
  if (memoria) return memoria.incidencia_fotos.find((f) => f.id === Number(id));
  const [f] = await getPool().query('SELECT * FROM incidencia_fotos WHERE id = ?', [id]);
  return f[0];
}

export async function agregarFoto({ incidenciaId, almacen, archivo, enlace, mime, bytes, autorId }) {
  if (memoria) {
    const id = proximoId(memoria.incidencia_fotos);
    memoria.incidencia_fotos.push({
      id, incidencia_id: incidenciaId, almacen, archivo, enlace, mime, bytes, subido_por: autorId, creado_en: new Date(),
    });
    return id;
  }
  const [r] = await getPool().query(
    'INSERT INTO incidencia_fotos (incidencia_id, almacen, archivo, enlace, mime, bytes, subido_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [incidenciaId, almacen, archivo, enlace, mime, bytes, autorId]);
  return r.insertId;
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
  ofertas: {
    cols: ['id', 'usuario_id', 'evaluacion_id', 'cultivo', 'cantidad', 'unidad', 'disponible_desde', 'nota', 'activa', 'creado_en'],
    fechas: ['creado_en'],
  },
  solicitudes: {
    cols: ['id', 'oferta_id', 'comprador_id', 'productor_id', 'tipo', 'cantidad', 'mensaje', 'estado', 'respuesta',
      'telefono_productor', 'respondido_en', 'creado_en'],
    fechas: ['respondido_en', 'creado_en'],
  },
  incidencias: {
    cols: ['id', 'tecnico_id', 'tipo', 'agente', 'cultivo', 'severidad', 'lat', 'lon', 'precision_m', 'nota', 'estado', 'creado_en'],
    fechas: ['creado_en'],
  },
  incidencia_fotos: {
    cols: ['id', 'incidencia_id', 'almacen', 'archivo', 'enlace', 'mime', 'bytes', 'subido_por', 'creado_en'],
    fechas: ['creado_en'],
  },
};
// Tablas que en modo memoria se guardan tal cual (sin juntar parcela y evaluación).
const TABLAS_SIMPLES = ['preferencias_alertas', 'suscripciones_push', 'alertas_enviadas', 'ofertas', 'solicitudes', 'incidencias', 'incidencia_fotos'];
const NUMEROS = { ofertas: ['cantidad'], solicitudes: ['cantidad'], incidencias: ['lat', 'lon'] }; // DECIMAL llega como texto


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
      ...Object.fromEntries(TABLAS_SIMPLES.map((k) => [k, m[k].map((f) => normalizar(k, f))])),
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
      ...Object.fromEntries(TABLAS_SIMPLES.map((k) => [k, t[k].map((f) => {
        const fila = { ...f };
        for (const c of NUMEROS[k] || []) if (fila[c] !== null) fila[c] = Number(fila[c]);
        if (k === 'ofertas') fila.activa = Boolean(fila.activa);
        return fila;
      })])),
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
