// Canales de entrega de alertas: notificación web (Web Push) y SMS (Twilio).
import webpush from 'web-push';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import * as db from './db.js';

// ---------- Web Push ----------
// Claves VAPID: de .env, o generadas una vez y guardadas en Backend/.vapid.json (fuera de git)
// para que las suscripciones de los teléfonos sigan valiendo tras reiniciar el servidor.
const ARCHIVO_VAPID = process.env.VAPID_FILE || fileURLToPath(new URL('../.vapid.json', import.meta.url));
let vapid = null;

async function clavesVapid() {
  if (vapid) return vapid;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapid = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    try {
      vapid = JSON.parse(await readFile(ARCHIVO_VAPID, 'utf8'));
    } catch {
      vapid = webpush.generateVAPIDKeys();
      await writeFile(ARCHIVO_VAPID, JSON.stringify(vapid), { mode: 0o600 });
      console.log(`[push] Claves VAPID nuevas guardadas en ${ARCHIVO_VAPID}`);
    }
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:alertas@poseidon.test', vapid.publicKey, vapid.privateKey);
  return vapid;
}

export const clavePublica = async () => (await clavesVapid()).publicKey;

// Envía a todos los navegadores registrados de la persona. Borra las suscripciones vencidas.
export async function enviarPush(usuarioId, carga) {
  const subs = await db.listarSuscripciones(usuarioId);
  if (!subs.length) return { canal: 'web', estado: 'sin-dispositivo', detalle: 'No hay dispositivos con notificaciones activadas' };
  await clavesVapid();
  let enviadas = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(carga),
        { TTL: 12 * 3600, urgency: 'high' },
      );
      enviadas += 1;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await db.borrarSuscripcion(s.endpoint);
      else console.warn('[push] Falló un envío:', e.statusCode || e.message);
    }
  }
  return enviadas
    ? { canal: 'web', estado: 'enviado', detalle: `${enviadas} de ${subs.length} dispositivo(s)` }
    : { canal: 'web', estado: 'error', detalle: 'Ningún dispositivo aceptó la notificación' };
}

// ---------- SMS ----------
export const TELEFONO = /^\+\d{8,15}$/; // formato internacional, p. ej. +59170000000
export const smsConfigurado = () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

// Sin credenciales de Twilio el SMS se simula: se registra en la consola y en el historial.
export async function enviarSms(telefono, texto) {
  const cuerpo = texto.slice(0, 320);
  if (!smsConfigurado()) {
    console.log(`[sms simulado] a ${telefono}: ${cuerpo}`);
    return { canal: 'sms', estado: 'simulado', detalle: 'SMS no configurado en el servidor (Twilio)' };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID;
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: telefono, From: process.env.TWILIO_FROM, Body: cuerpo }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`Twilio respondió ${r.status}`);
    return { canal: 'sms', estado: 'enviado', detalle: telefono.replace(/\d(?=\d{3})/g, '•') };
  } catch (e) {
    console.warn('[sms] Falló el envío:', e.message);
    return { canal: 'sms', estado: 'error', detalle: e.message };
  }
}

// Entrega una alerta por los canales que la persona tiene activos.
export async function entregar(usuarioId, prefs, { titulo, mensaje, tipo }) {
  const canales = [];
  if (prefs.web) canales.push(await enviarPush(usuarioId, { titulo, mensaje, tipo }));
  if (prefs.sms && prefs.telefono) canales.push(await enviarSms(prefs.telefono, `Poseidon · ${titulo}: ${mensaje}`));
  return canales;
}
