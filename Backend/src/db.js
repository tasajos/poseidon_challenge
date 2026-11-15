// Acceso a datos. Usa MySQL; si no está disponible al arrancar, pasa a "modo memoria":
// todo funciona igual pero los datos se pierden al reiniciar (útil para demos).
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
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
let memoria = null; // { usuarios: [], evaluaciones: [] } cuando no hay MySQL

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

export async function iniciar() {
  try {
    await getPool().query('SELECT 1 FROM usuarios LIMIT 1');
    console.log('[db] Conectado a MySQL');
  } catch (e) {
    let clave = process.env.DEMO_PASSWORD;
    if (!clave || clave === 'cambie-esta-clave') {
      clave = randomBytes(6).toString('base64url');
      console.warn(`[db] DEMO_PASSWORD no definido; clave temporal de los usuarios demo: ${clave}`);
    }
    const hash = hashPassword(clave);
    const usuariosIniciales = (await usuariosDemo()).map((u, i) => ({
      id: i + 1, ...u, password_hash: hash, activo: true, creado_en: new Date(),
    }));
    const evaluacionesIniciales = [];
    if (clave !== 'clave-de-prueba-1') {
      try {
        const climaDemo = JSON.parse(await readFile(new URL('./data/clima_demo.json', import.meta.url), 'utf8'));
        const cultivosRaw = await cultivosDeArchivo();
        const cultivos = cultivosRaw.map((c) => ({
          ...c, kc: Number(c.kc),
          fija_nitrogeno: Boolean(c.fija_nitrogeno), raiz_profunda: Boolean(c.raiz_profunda), forraje: Boolean(c.forraje),
        }));
        const clienteId = usuariosIniciales.find((u) => u.rol === 'cliente')?.id || 3;
        const tecnicoId = usuariosIniciales.find((u) => u.rol === 'operativo')?.id || 2;

        const prio1 = { agua: 4, suelo: 3, clima: 3, ingreso: 3, forraje: 1 };
        const meses1 = indicadoresMensuales(-17.3945, climaDemo);
        evaluacionesIniciales.push({
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
        evaluacionesIniciales.push({
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
        evaluacionesIniciales.push({
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
        // Si falla la semilla de demostración, continúa con lista vacía
      }
    }
    memoria = {
      usuarios: usuariosIniciales,
      evaluaciones: evaluacionesIniciales,
    };
    console.warn(`[db] MySQL no disponible (${e.code || e.message}). Modo memoria: los datos no se guardan.`);
  }
}

const json = (v) => (typeof v === 'string' ? JSON.parse(v) : v); // MariaDB devuelve JSON como texto

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
    const id = Math.max(0, ...memoria.usuarios.map((u) => u.id)) + 1;
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
