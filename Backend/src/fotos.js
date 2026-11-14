// Fotos de incidencias de campo (HU-OPT-02). Se guardan en una unidad compartida de Google Drive
// con una cuenta de servicio. Sin configurar Drive, se guardan en Backend/fotos/ (solo para pruebas)
// y la interfaz lo avisa.
//
// Configuración (.env):
//   GOOGLE_DRIVE_CREDENTIALS = ruta al JSON de la cuenta de servicio (fuera de git)
//   GOOGLE_DRIVE_FOLDER_ID   = id de la unidad compartida o de una carpeta dentro de ella
// La cuenta de servicio debe ser miembro de la unidad compartida con rol "Gestor de contenido".
// Las cuentas de servicio no tienen cuota propia en "Mi unidad": por eso se usa una unidad compartida.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const CREDENCIALES = process.env.GOOGLE_DRIVE_CREDENTIALS || '';
const CARPETA = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
const DIR_LOCAL = path.resolve(process.env.FOTOS_DIR || fileURLToPath(new URL('../fotos/', import.meta.url)));
const ALCANCE = 'https://www.googleapis.com/auth/drive'; // el acceso real lo limita la membresía en la unidad compartida
const DRIVE = 'https://www.googleapis.com/drive/v3';

export const MAX_BYTES = 8 * 1024 * 1024;
export const MAX_POR_INCIDENCIA = 5;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const error = (status, mensaje) => Object.assign(new Error(mensaje), { status });

export const driveConfigurado = () => Boolean(CREDENCIALES && CARPETA);

// Tipo real de la imagen según sus primeros bytes (no se confía en la cabecera del navegador).
export function tipoImagen(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

// ---------- Google Drive ----------
let cuenta = null;
let acceso = { token: null, vence: 0 };

async function tokenDrive() {
  if (acceso.token && acceso.vence > Date.now() + 60e3) return acceso.token;
  if (!cuenta) {
    try {
      cuenta = JSON.parse(await readFile(CREDENCIALES, 'utf8'));
    } catch (e) {
      throw error(500, `No se pudo leer GOOGLE_DRIVE_CREDENTIALS (${e.code || e.message})`);
    }
    if (!cuenta.client_email || !cuenta.private_key) throw error(500, 'GOOGLE_DRIVE_CREDENTIALS no es una clave de cuenta de servicio');
  }
  const ahora = Math.floor(Date.now() / 1000);
  const uri = cuenta.token_uri || 'https://oauth2.googleapis.com/token';
  const asercion = jwt.sign({ iss: cuenta.client_email, scope: ALCANCE, aud: uri, iat: ahora, exp: ahora + 3600 },
    cuenta.private_key, { algorithm: 'RS256' });
  const r = await fetch(uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: asercion }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw error(502, `Google rechazó la cuenta de servicio (${r.status})`);
  const d = await r.json();
  acceso = { token: d.access_token, vence: Date.now() + d.expires_in * 1000 };
  return acceso.token;
}

async function driveFetch(url, opciones = {}) {
  const r = await fetch(url, {
    ...opciones,
    headers: { Authorization: `Bearer ${await tokenDrive()}`, ...opciones.headers },
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) {
    const detalle = await r.json().then((d) => d.error?.message).catch(() => '');
    throw error(502, `Google Drive respondió ${r.status}${detalle ? `: ${detalle}` : ''}`);
  }
  return r;
}

async function subirDrive({ buffer, mime, nombre, descripcion, propiedades }) {
  const limite = `poseidon${randomUUID().replace(/-/g, '')}`;
  const meta = { name: nombre, mimeType: mime, parents: [CARPETA], description: descripcion, appProperties: propiedades };
  const cuerpo = Buffer.concat([
    Buffer.from(`--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`),
    Buffer.from(`--${limite}\r\nContent-Type: ${mime}\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${limite}--`),
  ]);
  const r = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${limite}` },
    body: cuerpo,
  });
  const d = await r.json();
  return { almacen: 'drive', archivo: d.id, enlace: d.webViewLink || null };
}

// ---------- Guardar y leer ----------
// Devuelve { almacen, archivo, enlace, mime, bytes }. archivo es el id en Drive o el nombre local.
export async function guardarFoto(buffer, { nombre, descripcion, propiedades }) {
  const mime = tipoImagen(buffer);
  if (!mime) throw error(400, 'La foto debe ser JPEG, PNG o WebP');
  if (buffer.length > MAX_BYTES) throw error(413, 'La foto pesa más de 8 MB');
  const completo = `${nombre}.${EXT[mime]}`;
  if (driveConfigurado()) {
    return { ...(await subirDrive({ buffer, mime, nombre: completo, descripcion, propiedades })), mime, bytes: buffer.length };
  }
  await mkdir(DIR_LOCAL, { recursive: true });
  const archivo = `${randomUUID()}.${EXT[mime]}`;
  await writeFile(path.join(DIR_LOCAL, archivo), buffer, { mode: 0o600 });
  return { almacen: 'local', archivo, enlace: null, mime, bytes: buffer.length };
}

const LOCAL = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

export async function leerFoto(foto) {
  if (foto.almacen === 'drive') {
    if (!driveConfigurado()) throw error(503, 'La foto está en Google Drive, pero Drive no está configurado en el servidor');
    const r = await driveFetch(`${DRIVE}/files/${encodeURIComponent(foto.archivo)}?alt=media&supportsAllDrives=true`);
    return Buffer.from(await r.arrayBuffer());
  }
  if (!LOCAL.test(foto.archivo)) throw error(404, 'Foto no encontrada');
  try { return await readFile(path.join(DIR_LOCAL, foto.archivo)); } catch { throw error(404, 'Foto no encontrada'); }
}

// Estado para el panel de administración: comprueba que la carpeta exista y sea accesible.
let comprobado = { en: 0, resultado: null };
export async function estadoFotos() {
  if (!driveConfigurado()) {
    return { almacen: 'local', configurado: false, detalle: 'Google Drive no configurado: las fotos se guardan en el servidor (solo para pruebas)' };
  }
  if (comprobado.resultado && Date.now() - comprobado.en < 10 * 60e3) return comprobado.resultado;
  let resultado;
  try {
    const r = await driveFetch(`${DRIVE}/files/${encodeURIComponent(CARPETA)}?supportsAllDrives=true&fields=id,name,driveId,mimeType`);
    const d = await r.json();
    resultado = d.driveId
      ? { almacen: 'drive', configurado: true, ok: true, detalle: `Unidad compartida, carpeta "${d.name}"` }
      : { almacen: 'drive', configurado: true, ok: false, detalle: `"${d.name}" no está en una unidad compartida: la cuenta de servicio no tiene cuota en Mi unidad` };
  } catch (e) {
    resultado = { almacen: 'drive', configurado: true, ok: false, detalle: e.message };
  }
  comprobado = { en: Date.now(), resultado };
  return resultado;
}
