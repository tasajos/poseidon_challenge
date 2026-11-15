// Traza de las consultas a los servicios de la NASA (POWER, SRTM y MODIS).
// Cada consulta deja una línea en la consola del servidor (quién la provocó, si el dato se descargó o salió
// de caché, el dato recibido y cuánto tardó) y un evento en memoria que la vista "NASA en vivo" muestra
// a su dueño. TRAZA_NASA=0 en .env apaga la consola; los eventos para la vista se guardan igual.
import 'dotenv/config';
import { AsyncLocalStorage } from 'node:async_hooks';

const enConsola = process.env.TRAZA_NASA !== '0';
const contexto = new AsyncLocalStorage();
const MAX_EVENTOS = 500;
const eventos = [];
let ultimoId = 0;

// Ejecuta fn con el usuario de la petición como contexto (lo usa el middleware de sesión).
export const conUsuario = (usuario, fn) => contexto.run({ usuario }, fn);

const hora = (d) => d.toLocaleTimeString('es-BO', { hour12: false });
const SIMBOLO = { descarga: '↓', cache: '=', guardado: '=', demo: '!', error: '✗', cola: '…' };

// fuente: 'NASA POWER' | 'SRTM' | 'MODIS'; tipo: descarga | cache | guardado | demo | error | cola
export function traza(fuente, tipo, detalle, ms) {
  const u = contexto.getStore()?.usuario;
  const ev = { id: ++ultimoId, en: new Date(), fuente, tipo, detalle, ms: ms ?? null, usuario_id: u?.id ?? null };
  eventos.push(ev);
  if (eventos.length > MAX_EVENTOS) eventos.shift();
  if (!enConsola) return;
  const tiempo = ms === undefined ? '' : ` · ${ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`}`;
  const quien = u ? `${u.email} (${u.rol})` : 'tarea automática';
  const linea = `[${hora(ev.en)}] [${fuente}] ${SIMBOLO[tipo] || '·'} ${tipo.toUpperCase()} ${detalle}${tiempo} — ${quien}`;
  (tipo === 'error' || tipo === 'demo' ? console.warn : console.log)(linea);
}

// Eventos de un usuario posteriores a `desde` (id). Cada persona ve solo lo que provocaron sus propias
// acciones: las coordenadas de las parcelas de otros no se muestran.
export function eventosDe(usuarioId, desde = 0, max = 200) {
  const lista = eventos.filter((e) => e.usuario_id === usuarioId && e.id > desde);
  return { eventos: lista.slice(-max).map(({ usuario_id: _u, ...e }) => e), ultimo: ultimoId };
}

export const punto = (lat, lon) => `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
