// Acceso a MySQL. Si la base no está disponible, el backend sigue funcionando
// con el catálogo de Database/cultivos.json y no guarda evaluaciones.
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

export const RUTA_CULTIVOS = fileURLToPath(new URL('../../Database/cultivos.json', import.meta.url));

let pool = null;
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

export async function cultivosDeArchivo() {
  return JSON.parse(await readFile(RUTA_CULTIVOS, 'utf8'));
}

const normalizar = (c) => ({
  ...c,
  kc: Number(c.kc),
  fija_nitrogeno: Boolean(c.fija_nitrogeno),
  raiz_profunda: Boolean(c.raiz_profunda),
  forraje: Boolean(c.forraje),
});

// Devuelve { cultivos, origen } donde origen es "mysql" o "archivo".
export async function getCultivos() {
  try {
    const [filas] = await getPool().query('SELECT * FROM cultivos ORDER BY nombre');
    if (filas.length) return { cultivos: filas.map(normalizar), origen: 'mysql' };
  } catch (e) {
    console.warn('[db] MySQL no disponible, se usa cultivos.json:', e.code || e.message);
  }
  return { cultivos: (await cultivosDeArchivo()).map(normalizar), origen: 'archivo' };
}

// Guarda la evaluación; devuelve el id o null si no hay base de datos.
export async function guardarEvaluacion({ nombre, lat, lon, rotacion, prioridades, fuenteClima, estrategias }) {
  try {
    const db = getPool();
    const [p] = await db.query('INSERT INTO parcelas (nombre, lat, lon) VALUES (?, ?, ?)', [nombre, lat, lon]);
    const [e] = await db.query(
      'INSERT INTO evaluaciones (parcela_id, rotacion_actual, prioridades, fuente_clima, resultado) VALUES (?, ?, ?, ?, ?)',
      [p.insertId, JSON.stringify(rotacion), JSON.stringify(prioridades), fuenteClima, JSON.stringify(estrategias)],
    );
    return e.insertId;
  } catch (e) {
    console.warn('[db] No se guardó la evaluación:', e.code || e.message);
    return null;
  }
}

export async function ultimasEvaluaciones(limite = 20) {
  const [filas] = await getPool().query(
    `SELECT e.id, p.nombre, p.lat, p.lon, e.rotacion_actual, e.fuente_clima, e.creado_en
     FROM evaluaciones e JOIN parcelas p ON p.id = e.parcela_id
     ORDER BY e.id DESC LIMIT ?`, [limite]);
  return filas;
}
