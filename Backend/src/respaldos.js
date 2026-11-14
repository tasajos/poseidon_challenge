// Respaldos de la base de datos (usuarios, permisos, parcelas, evaluaciones y alertas) como archivos JSON.
// Funciona igual con MySQL y en modo memoria; no depende de mysqldump.
import { mkdir, readdir, readFile, writeFile, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import * as db from './db.js';

const DIR = path.resolve(process.env.BACKUP_DIR || fileURLToPath(new URL('../respaldos/', import.meta.url)));
const HORA = (process.env.BACKUP_HORA ?? '03:00').trim(); // hora local del servidor; vacío desactiva
const RETENER = Math.max(1, Number(process.env.BACKUP_RETENER || 14));
const NOMBRE = /^(auto|manual|previo)-\d{8}-\d{6}(-\d+)?\.json$/;
const FORMATO = 'poseidon-respaldo';
const VERSION = 1;

const error = (status, mensaje) => Object.assign(new Error(mensaje), { status });
const sello = (d) => d.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15); // 20261114-030000 (UTC)

// Las operaciones se hacen una a la vez: un respaldo nunca se mezcla con una restauración.
let cola = Promise.resolve();
const enCola = (fn) => {
  const p = cola.then(fn, fn);
  cola = p.catch(() => {});
  return p;
};

const conteos = (tablas) => Object.fromEntries(Object.entries(tablas).map(([k, v]) => [k, v.length]));

export function crearRespaldo(tipo, autor = null) {
  return enCola(() => escribir(tipo, autor));
}

async function escribir(tipo, autor) {
  const tablas = await db.exportar();
  const creado = new Date();
  const contenido = {
    formato: FORMATO, version: VERSION, tipo, creado_en: creado.toISOString(),
    creado_por: autor, origen: db.modo(), conteos: conteos(tablas), tablas,
  };
  await mkdir(DIR, { recursive: true });
  const existentes = new Set(await readdir(DIR));
  let nombre = `${tipo}-${sello(creado)}.json`;
  for (let i = 2; existentes.has(nombre); i++) nombre = `${tipo}-${sello(creado)}-${i}.json`;
  // Escribe en un temporal y renombra: un corte a mitad nunca deja un respaldo a medias.
  const temporal = path.join(DIR, `.${nombre}.tmp`);
  await writeFile(temporal, JSON.stringify(contenido), { mode: 0o600 });
  await rename(temporal, path.join(DIR, nombre));
  await podar();
  return { nombre, tipo, creado_en: contenido.creado_en, conteos: contenido.conteos };
}

// Conserva los RETENER más recientes de cada tipo automático; los manuales no se borran solos.
async function podar() {
  const archivos = (await readdir(DIR)).filter((n) => NOMBRE.test(n)).sort().reverse();
  for (const tipo of ['auto', 'previo']) {
    for (const n of archivos.filter((x) => x.startsWith(`${tipo}-`)).slice(RETENER)) await unlink(path.join(DIR, n));
  }
}

export async function listar() {
  let archivos = [];
  try { archivos = (await readdir(DIR)).filter((n) => NOMBRE.test(n)); } catch { /* aún no hay carpeta */ }
  const lista = await Promise.all(archivos.map(async (nombre) => {
    const ruta = path.join(DIR, nombre);
    const { size } = await stat(ruta);
    try {
      const c = validar(JSON.parse(await readFile(ruta, 'utf8')));
      return { nombre, tipo: c.tipo, creado_en: c.creado_en, creado_por: c.creado_por, origen: c.origen, conteos: c.conteos, bytes: size, valido: true };
    } catch (e) {
      return { nombre, tipo: nombre.split('-')[0], bytes: size, valido: false, problema: e.message };
    }
  }));
  return lista.sort((a, b) => (b.creado_en || '').localeCompare(a.creado_en || '') || b.nombre.localeCompare(a.nombre));
}

// Revisa que el archivo sea un respaldo de Poseidon utilizable antes de tocar la base.
function validar(c) {
  if (c?.formato !== FORMATO || c.version !== VERSION || typeof c.tablas !== 'object' || !c.tablas) {
    throw error(400, 'El archivo no es un respaldo válido de Poseidon');
  }
  for (const tabla of Object.keys(db.TABLAS)) {
    const filas = c.tablas[tabla];
    if (filas !== undefined && (!Array.isArray(filas) || filas.some((f) => typeof f !== 'object' || !f))) {
      throw error(400, `La tabla ${tabla} del respaldo está dañada`);
    }
  }
  const admins = (c.tablas.usuarios || []).filter((u) => u.rol === 'administrador' && u.activo && u.password_hash);
  if (!admins.length) throw error(400, 'El respaldo no tiene ningún administrador activo; restaurarlo dejaría el sistema sin acceso');
  return c;
}

async function leer(nombre) {
  if (!NOMBRE.test(nombre)) throw error(400, 'Nombre de respaldo no válido');
  let texto;
  try { texto = await readFile(path.join(DIR, nombre), 'utf8'); } catch { throw error(404, 'Respaldo no encontrado'); }
  let c;
  try { c = JSON.parse(texto); } catch { throw error(400, 'El respaldo está dañado (JSON ilegible)'); }
  return validar(c);
}

// Antes de restaurar guarda el estado actual como respaldo "previo", para poder deshacer.
export function restaurar(nombre, autor) {
  return enCola(async () => {
    const c = await leer(nombre);
    const previo = await escribir('previo', autor);
    await db.importar(c.tablas);
    console.log(`[respaldos] ${autor} restauró ${nombre} (estado anterior en ${previo.nombre})`);
    return { restaurado: nombre, previo: previo.nombre, conteos: c.conteos };
  });
}

// ---------- Programación diaria ----------
const programa = { activo: false, hora: HORA, proxima: null, ultimo: null, ultimo_error: null };

export const estado = () => ({ ...programa, retener: RETENER, directorio: DIR, base_datos: db.modo() });

async function automatico() {
  try {
    programa.ultimo = await crearRespaldo('auto', 'sistema');
    programa.ultimo_error = null;
  } catch (e) {
    programa.ultimo_error = { en: new Date(), mensaje: e.message };
    console.error('[respaldos] Falló el respaldo automático:', e.message);
  }
}

export async function programar() {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(HORA);
  if (!m) {
    if (HORA) console.warn(`[respaldos] BACKUP_HORA="${HORA}" no es una hora válida (HH:MM); respaldos automáticos desactivados`);
    return;
  }
  programa.activo = true;
  const agendar = () => {
    const t = new Date();
    t.setHours(Number(m[1]), Number(m[2]), 0, 0);
    if (t <= new Date()) t.setDate(t.getDate() + 1);
    programa.proxima = t;
    setTimeout(async () => { await automatico(); agendar(); }, t - Date.now()).unref();
  };
  agendar();
  // Si el servidor estuvo apagado a la hora programada, se pone al día al arrancar.
  const ultimoAuto = (await listar()).find((r) => r.tipo === 'auto' && r.valido);
  if (ultimoAuto) programa.ultimo = ultimoAuto;
  if (!ultimoAuto || Date.now() - Date.parse(ultimoAuto.creado_en) > 24 * 3600e3) await automatico();
}
