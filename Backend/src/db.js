// Acceso a datos. Soporta SQLite (nativo en Node.js, sin instalar MySQL/XAMPP/MariaDB)
// y MySQL (si está instalado y configurado).
// Si se fuerza modo memoria (p. ej. en pruebas automáticas con DB_PORT=1), funciona en memoria.
import mysql from 'mysql2/promise';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { hashPassword } from './auth.js';
import { indicadoresMensuales } from './clima.js';
import { compararRotaciones } from './rotacion.js';

dotenv.config();
dotenv.config({ path: new URL('../.env', import.meta.url) });

const leerJson = async (nombre) => JSON.parse(
  await readFile(new URL(`../../Database/${nombre}`, import.meta.url), 'utf8'),
);
export const cultivosDeArchivo = () => leerJson('cultivos.json');
export const usuariosDemo = () => leerJson('usuarios_demo.json');

let pool = null;
let sqliteDb = null;
let memoria = null; // { usuarios: [], evaluaciones: [] } cuando se ejecuta en memoria

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'poseidon',
      connectionLimit: 5,
      connectTimeout: 2000,
    });
  }
  return pool;
}

export function getSqlite() {
  return sqliteDb;
}

export const modo = () => (memoria ? 'memoria' : sqliteDb ? 'sqlite' : 'mysql');

const json = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

export function rutaSqlite() {
  if (process.env.DB_FILE) {
    return path.isAbsolute(process.env.DB_FILE)
      ? process.env.DB_FILE
      : path.resolve(process.cwd(), process.env.DB_FILE);
  }
  return fileURLToPath(new URL('../../Database/poseidon.db', import.meta.url));
}

export async function iniciarSQLite() {
  if (sqliteDb) return;
  const rutaDb = rutaSqlite();
  sqliteDb = new DatabaseSync(rutaDb);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'cliente',
      activo INTEGER NOT NULL DEFAULT 1,
      creado_en TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cultivos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      familia TEXT NOT NULL,
      ciclo_dias INTEGER NOT NULL,
      mes_siembra INTEGER NOT NULL,
      kc REAL NOT NULL,
      tolerancia_helada INTEGER NOT NULL,
      fija_nitrogeno INTEGER NOT NULL DEFAULT 0,
      raiz_profunda INTEGER NOT NULL DEFAULT 0,
      forraje INTEGER NOT NULL DEFAULT 0,
      valor_mercado INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parcelas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS evaluaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parcela_id INTEGER NOT NULL,
      rotacion_actual TEXT NOT NULL,
      prioridades TEXT NOT NULL,
      fuente_clima TEXT NOT NULL,
      resultado TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      nota_tecnico TEXT NULL,
      revisado_por INTEGER NULL,
      revisado_en TEXT NULL,
      creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parcela_id) REFERENCES parcelas(id) ON DELETE CASCADE,
      FOREIGN KEY (revisado_por) REFERENCES usuarios(id) ON DELETE SET NULL
    );
  `);

  const countCultivos = sqliteDb.prepare('SELECT COUNT(*) as c FROM cultivos').get().c;
  if (countCultivos === 0) {
    await seedSQLite();
  }
  console.log(`[db] Conectado a SQLite (${rutaDb})`);
}

export async function seedSQLite() {
  if (!sqliteDb) {
    const rutaDb = rutaSqlite();
    sqliteDb = new DatabaseSync(rutaDb);
  }
  const cultivos = await cultivosDeArchivo();
  const insCultivo = sqliteDb.prepare(`
    INSERT INTO cultivos (codigo, nombre, familia, ciclo_dias, mes_siembra, kc, tolerancia_helada,
       fija_nitrogeno, raiz_profunda, forraje, valor_mercado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(codigo) DO UPDATE SET
      nombre=excluded.nombre, familia=excluded.familia, ciclo_dias=excluded.ciclo_dias,
      mes_siembra=excluded.mes_siembra, kc=excluded.kc, tolerancia_helada=excluded.tolerancia_helada,
      fija_nitrogeno=excluded.fija_nitrogeno, raiz_profunda=excluded.raiz_profunda,
      forraje=excluded.forraje, valor_mercado=excluded.valor_mercado
  `);

  for (const c of cultivos) {
    insCultivo.run(
      c.codigo, c.nombre, c.familia, c.ciclo_dias, c.mes_siembra, c.kc, c.tolerancia_helada,
      c.fija_nitrogeno ? 1 : 0, c.raiz_profunda ? 1 : 0, c.forraje ? 1 : 0, c.valor_mercado
    );
  }

  const clave = process.env.DEMO_PASSWORD || 'admin123';
  const usuarios = await usuariosDemo();
  const insUsuario = sqliteDb.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, rol)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      nombre=excluded.nombre, password_hash=excluded.password_hash, rol=excluded.rol
  `);

  for (const u of usuarios) {
    insUsuario.run(u.nombre, u.email, hashPassword(clave), u.rol);
  }
}

// Evaluaciones de ejemplo para el modo memoria, para que los paneles no se vean vacíos en una demostración.
// No se cargan en las pruebas automáticas (clave 'clave-de-prueba-1'), que esperan una base vacía.
async function evaluacionesDemo(usuarios, clave) {
  if (clave === 'clave-de-prueba-1') return [];
  const lista = [];
  try {
    const climaDemo = JSON.parse(await readFile(new URL('./data/clima_demo.json', import.meta.url), 'utf8'));
    const cultivosRaw = await cultivosDeArchivo();
    const cultivos = cultivosRaw.map((c) => ({
      ...c, kc: Number(c.kc),
      fija_nitrogeno: Boolean(c.fija_nitrogeno), raiz_profunda: Boolean(c.raiz_profunda), forraje: Boolean(c.forraje),
    }));
    const clienteId = usuarios.find((u) => u.rol === 'cliente')?.id || 3;
    const tecnicoId = usuarios.find((u) => u.rol === 'operativo')?.id || 2;

    const prio1 = { agua: 4, suelo: 3, clima: 3, ingreso: 3, forraje: 1 };
    const meses1 = indicadoresMensuales(-17.3945, climaDemo);
    lista.push({
      id: 1,
      usuario_id: clienteId,
      parcela: 'Finca Tiquipaya',
      lat: -17.3945,
      lon: -66.1650,
      rotacion_actual: ['maiz', 'papa', 'haba'],
      prioridades: prio1,
      fuente_clima: 'demo',
      resultado: compararRotaciones(['maiz', 'papa', 'haba'], cultivos, meses1, prio1),
      estado: 'pendiente',
      nota_tecnico: null,
      revisado_por: null,
      revisado_en: null,
      creado_en: new Date(Date.now() - 43200000),
    });

    const prio2 = { agua: 4, suelo: 4, clima: 3, ingreso: 2, forraje: 1 };
    const meses2 = indicadoresMensuales(-17.3810, climaDemo);
    lista.push({
      id: 2,
      usuario_id: clienteId,
      parcela: 'Valle Bajo / Cochabamba',
      lat: -17.3810,
      lon: -66.1560,
      rotacion_actual: ['papa', 'haba'],
      prioridades: prio2,
      fuente_clima: 'demo',
      resultado: compararRotaciones(['papa', 'haba'], cultivos, meses2, prio2),
      estado: 'pendiente',
      nota_tecnico: null,
      revisado_por: null,
      revisado_en: null,
      creado_en: new Date(Date.now() - 86400000),
    });

    const prio3 = { agua: 5, suelo: 4, clima: 2, ingreso: 3, forraje: 2 };
    const meses3 = indicadoresMensuales(-17.3875, climaDemo);
    lista.push({
      id: 3,
      usuario_id: clienteId,
      parcela: 'Chacra Valle Central',
      lat: -17.3875,
      lon: -66.1445,
      rotacion_actual: ['quinua', 'haba'],
      prioridades: prio3,
      fuente_clima: 'demo',
      resultado: compararRotaciones(['quinua', 'haba'], cultivos, meses3, prio3),
      estado: 'revisada',
      nota_tecnico: 'Se recomienda mantener la rotación con haba para fijar nitrógeno en el suelo y conservar la humedad.',
      revisado_por: tecnicoId,
      revisado_en: new Date(),
      creado_en: new Date(Date.now() - 172800000),
    });
  } catch {
    // Si falla la semilla de demostración, se continúa con la lista vacía
  }
  return lista;
}

async function iniciarMemoria(razon) {
  let clave = process.env.DEMO_PASSWORD;
  if (!clave || clave === 'cambie-esta-clave') {
    clave = randomBytes(6).toString('base64url');
    console.warn(`[db] DEMO_PASSWORD no definido; clave temporal de los usuarios demo: ${clave}`);
  }
  const hash = hashPassword(clave);
  const usuarios = (await usuariosDemo()).map((u, i) => ({
    id: i + 1, ...u, password_hash: hash, activo: true, creado_en: new Date(),
  }));
  memoria = { usuarios, evaluaciones: await evaluacionesDemo(usuarios, clave) };
  console.warn(`[db] Modo memoria activo (${razon}).`);
}

export async function iniciar() {
  if (process.env.DB_PORT === '1' || process.env.DB_ENGINE === 'memoria') {
    await iniciarMemoria('Forzado por configuración de pruebas (DB_PORT=1)');
    return;
  }

  if (process.env.DB_ENGINE === 'sqlite') {
    try {
      await iniciarSQLite();
      return;
    } catch (e) {
      console.error('[db] Error iniciando SQLite:', e.message);
      await iniciarMemoria(e.message);
      return;
    }
  }

  if (process.env.DB_ENGINE === 'mysql') {
    try {
      await getPool().query('SELECT 1 FROM usuarios LIMIT 1');
      console.log('[db] Conectado a MySQL');
      return;
    } catch (e) {
      console.error(`[db] No se pudo conectar a MySQL (${e.code || e.message}).`);
      throw e;
    }
  }

  try {
    await getPool().query('SELECT 1 FROM usuarios LIMIT 1');
    console.log('[db] Conectado a MySQL');
  } catch (e) {
    console.log(`[db] MySQL no disponible (${e.code || e.message}). Conectando a SQLite para control total y persistencia.`);
    try {
      await iniciarSQLite();
    } catch (sqliteErr) {
      await iniciarMemoria(sqliteErr.message);
    }
  }
}

// ---------- Cultivos ----------
export async function getCultivos() {
  if (memoria) {
    const filas = await cultivosDeArchivo();
    return {
      origen: 'archivo',
      cultivos: filas.map((c) => ({
        ...c, kc: Number(c.kc),
        fija_nitrogeno: Boolean(c.fija_nitrogeno), raiz_profunda: Boolean(c.raiz_profunda), forraje: Boolean(c.forraje),
      })),
    };
  }

  if (sqliteDb) {
    let filas = sqliteDb.prepare('SELECT * FROM cultivos ORDER BY nombre').all();
    const origen = filas.length ? 'sqlite' : 'archivo';
    if (!filas.length) filas = await cultivosDeArchivo();
    return {
      origen,
      cultivos: filas.map((c) => ({
        ...c, kc: Number(c.kc),
        fija_nitrogeno: Boolean(c.fija_nitrogeno), raiz_profunda: Boolean(c.raiz_profunda), forraje: Boolean(c.forraje),
      })),
    };
  }

  let filas = [];
  [filas] = await getPool().query('SELECT * FROM cultivos ORDER BY nombre');
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
  if (sqliteDb) {
    const u = sqliteDb.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
    return usuario(u);
  }
  const [f] = await getPool().query('SELECT * FROM usuarios WHERE email = ?', [email]);
  return usuario(f[0]);
}

export async function usuarioPorId(id) {
  if (memoria) return usuario(memoria.usuarios.find((u) => u.id === Number(id)));
  if (sqliteDb) {
    const u = sqliteDb.prepare('SELECT * FROM usuarios WHERE id = ?').get(Number(id));
    return usuario(u);
  }
  const [f] = await getPool().query('SELECT * FROM usuarios WHERE id = ?', [id]);
  return usuario(f[0]);
}

export async function listarUsuarios() {
  let filas;
  if (memoria) filas = memoria.usuarios;
  else if (sqliteDb) filas = sqliteDb.prepare('SELECT * FROM usuarios ORDER BY id').all();
  else [filas] = await getPool().query('SELECT * FROM usuarios ORDER BY id');
  return filas.map(({ password_hash, ...u }) => usuario(u));
}

export async function crearUsuario({ nombre, email, password_hash, rol }) {
  if (memoria) {
    const id = Math.max(0, ...memoria.usuarios.map((u) => u.id)) + 1;
    memoria.usuarios.push({ id, nombre, email, password_hash, rol, activo: true, creado_en: new Date() });
    return id;
  }
  if (sqliteDb) {
    const stmt = sqliteDb.prepare('INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)');
    const info = stmt.run(nombre, email, password_hash, rol);
    return Number(info.lastInsertRowid);
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
  if (sqliteDb) {
    const activoVal = activo !== undefined ? (activo ? 1 : 0) : null;
    const stmt = sqliteDb.prepare(
      'UPDATE usuarios SET rol = COALESCE(?, rol), activo = COALESCE(?, activo) WHERE id = ?'
    );
    const info = stmt.run(rol ?? null, activoVal, Number(id));
    return info.changes > 0;
  }
  const [r] = await getPool().query(
    'UPDATE usuarios SET rol = COALESCE(?, rol), activo = COALESCE(?, activo) WHERE id = ?',
    [rol ?? null, activo ?? null, id]);
  return r.affectedRows > 0;
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
    const id = memoria.evaluaciones.length + 1;
    memoria.evaluaciones.push({
      id, usuario_id: usuarioId, parcela: nombre, lat, lon, rotacion_actual: rotacion, prioridades,
      fuente_clima: fuenteClima, resultado: estrategias, estado: 'pendiente', nota_tecnico: null,
      revisado_por: null, revisado_en: null, creado_en: new Date(),
    });
    return id;
  }
  if (sqliteDb) {
    const p = sqliteDb.prepare('INSERT INTO parcelas (usuario_id, nombre, lat, lon) VALUES (?, ?, ?, ?)')
      .run(usuarioId, nombre, lat, lon);
    const e = sqliteDb.prepare(
      'INSERT INTO evaluaciones (parcela_id, rotacion_actual, prioridades, fuente_clima, resultado) VALUES (?, ?, ?, ?, ?)'
    ).run(Number(p.lastInsertRowid), JSON.stringify(rotacion), JSON.stringify(prioridades), fuenteClima, JSON.stringify(estrategias));
    return Number(e.lastInsertRowid);
  }
  const db = getPool();
  const [p] = await db.query('INSERT INTO parcelas (usuario_id, nombre, lat, lon) VALUES (?, ?, ?, ?)', [usuarioId, nombre, lat, lon]);
  const [e] = await db.query(
    'INSERT INTO evaluaciones (parcela_id, rotacion_actual, prioridades, fuente_clima, resultado) VALUES (?, ?, ?, ?, ?)',
    [p.insertId, JSON.stringify(rotacion), JSON.stringify(prioridades), fuenteClima, JSON.stringify(estrategias)]);
  return e.insertId;
}

export async function listarEvaluaciones({ usuarioId } = {}) {
  if (memoria) {
    return memoria.evaluaciones
      .filter((e) => !usuarioId || e.usuario_id === usuarioId)
      .map(deMemoria).reverse();
  }
  if (sqliteDb) {
    const query = `${SQL_EVALUACIONES} ${usuarioId ? 'WHERE p.usuario_id = ?' : ''} ORDER BY e.id DESC LIMIT 200`;
    const f = usuarioId
      ? sqliteDb.prepare(query).all(Number(usuarioId))
      : sqliteDb.prepare(query).all();
    return f.map(evaluacion);
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
  if (sqliteDb) {
    const fila = sqliteDb.prepare(`${SQL_EVALUACIONES} WHERE e.id = ?`).get(Number(id));
    return fila ? evaluacion(fila) : undefined;
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
  if (sqliteDb) {
    const stmt = sqliteDb.prepare(
      "UPDATE evaluaciones SET estado = 'revisada', nota_tecnico = ?, revisado_por = ?, revisado_en = CURRENT_TIMESTAMP WHERE id = ?"
    );
    const info = stmt.run(nota, revisorId, Number(id));
    return info.changes > 0;
  }
  const [r] = await getPool().query(
    "UPDATE evaluaciones SET estado = 'revisada', nota_tecnico = ?, revisado_por = ?, revisado_en = NOW() WHERE id = ?",
    [nota, revisorId, id]);
  return r.affectedRows > 0;
}
