// NDVI de las parcelas con MODIS (producto MOD13Q1: 250 m, compuestos de 16 días), servido por el
// ORNL DAAC de la NASA sin clave. El servicio tarda (decenas de segundos por consulta), así que las
// series se piden en segundo plano, una consulta a la vez, y se guardan en la tabla ndvi.
// Por cada año se guardan dos ventanas: época húmeda (enero-marzo, cultivos en pie) y época seca
// (julio-septiembre, fuera de temporada). Un píxel de 250 m suele abarcar más que la parcela.
import 'dotenv/config';
import { traza, punto } from './traza.js';

const URL_NDVI = process.env.NDVI_URL ?? 'https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset';
const ANIOS = Math.max(1, Math.min(8, Number(process.env.NDVI_ANIOS || 4)));
export const FUENTE_NDVI = 'NASA MODIS MOD13Q1 (250 m, 16 días), vía ORNL DAAC';
export const SUELO_DESNUDO = 0.2; // por debajo, casi no hay vegetación activa
export const ndviDisponible = () => Boolean(URL_NDVI);

const VENTANAS = { humeda: [1, 81], seca: [193, 257] }; // días del año (inicio de cada compuesto)
const dia = (n) => String(n).padStart(3, '0');
const diaDelAnio = (d) => Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5);

// Consultas pendientes para tener los últimos `anios` años. Omite ventanas que aún no terminaron y años ya guardados.
export function ventanasPendientes(hoy = new Date(), anios = ANIOS, fechasGuardadas = []) {
  const guardadas = new Set(fechasGuardadas.map((f) => `${f.slice(0, 4)}-${Number(f.slice(5, 7)) <= 6 ? 'humeda' : 'seca'}`));
  const lista = [];
  for (let a = hoy.getUTCFullYear() - anios + 1; a <= hoy.getUTCFullYear(); a++) {
    for (const [epoca, [ini, fin]] of Object.entries(VENTANAS)) {
      const terminada = a < hoy.getUTCFullYear() || diaDelAnio(hoy) > fin + 16 + 30; // el compuesto se publica con retraso
      if (terminada && !guardadas.has(`${a}-${epoca}`)) lista.push({ anio: a, epoca, inicio: `A${a}${dia(ini)}`, fin: `A${a}${dia(fin)}` });
    }
  }
  return lista;
}

// Respuesta del servicio → [{ fecha: 'AAAA-MM-DD', valor }]. Descarta el valor de relleno (sin dato).
export function leerRespuesta(d) {
  const escala = Number(d.scale) || 0.0001;
  return (d.subset || [])
    .map((s) => ({ fecha: s.calendar_date, crudo: Array.isArray(s.data) ? s.data[Math.floor(s.data.length / 2)] : null }))
    .filter((s) => typeof s.crudo === 'number' && s.crudo >= -2000 && s.crudo <= 10000 && /^\d{4}-\d{2}-\d{2}$/.test(s.fecha))
    .map((s) => ({ fecha: s.fecha, valor: Math.round(s.crudo * escala * 10000) / 10000 }));
}

async function consultar(lat, lon, v) {
  const url = `${URL_NDVI}?latitude=${lat}&longitude=${lon}&startDate=${v.inicio}&endDate=${v.fin}&kmAboveBelow=0&kmLeftRight=0&band=250m_16_days_NDVI`;
  const t0 = Date.now();
  const ventana = `NDVI ${v.anio} época ${v.epoca === 'humeda' ? 'húmeda' : 'seca'} ${punto(lat, lon)}`;
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(120000) });
    if (!r.ok) throw new Error(`MODIS (ORNL DAAC) respondió ${r.status}`);
    const puntos = leerRespuesta(await r.json());
    const medio = puntos.length ? (puntos.reduce((s, p) => s + p.valor, 0) / puntos.length).toFixed(3) : '—';
    traza('MODIS', 'descarga', `${ventana}: ${puntos.length} compuestos, NDVI medio ${medio}`, Date.now() - t0);
    return puntos;
  } catch (e) {
    traza('MODIS', 'error', `${ventana}: ${e.name === 'TimeoutError' ? 'sin respuesta a tiempo' : e.message}`, Date.now() - t0);
    throw e;
  }
}

// ---------- Resumen ----------
const media = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 1000) / 1000 : null);

// puntos: [{ fecha, valor }] → [{ anio, humeda, seca }] (NDVI medio de cada época; null si no hay dato).
export function resumenAnual(puntos) {
  const porAnio = new Map();
  for (const p of puntos) {
    const anio = Number(p.fecha.slice(0, 4)), mes = Number(p.fecha.slice(5, 7));
    const epoca = mes <= 3 ? 'humeda' : mes >= 7 && mes <= 9 ? 'seca' : null;
    if (!epoca) continue;
    if (!porAnio.has(anio)) porAnio.set(anio, { humeda: [], seca: [] });
    porAnio.get(anio)[epoca].push(p.valor);
  }
  return [...porAnio.entries()].sort((a, b) => a[0] - b[0])
    .map(([anio, v]) => ({ anio, humeda: media(v.humeda), seca: media(v.seca) }));
}

// Cambio medio por año (mínimos cuadrados) de una época. null con menos de 3 años.
export function tendencia(resumen, epoca = 'humeda') {
  const xs = resumen.filter((r) => r[epoca] !== null);
  if (xs.length < 3) return null;
  const mx = xs.reduce((s, r) => s + r.anio, 0) / xs.length, my = xs.reduce((s, r) => s + r[epoca], 0) / xs.length;
  const num = xs.reduce((s, r) => s + (r.anio - mx) * (r[epoca] - my), 0), den = xs.reduce((s, r) => s + (r.anio - mx) ** 2, 0);
  const porAnio = Math.round((num / den) * 1000) / 1000;
  return { por_anio: porAnio, sentido: porAnio > 0.01 ? 'mejora' : porAnio < -0.01 ? 'baja' : 'estable', anios: xs.length };
}

// ---------- Trabajo en segundo plano ----------
const estados = new Map(); // parcela → { estado, avance, error, en }
let cola = Promise.resolve();

export const estadoNdvi = (parcelaId) => estados.get(parcelaId) || null;

// Encola la actualización del NDVI de una parcela. leer() devuelve las fechas ya guardadas;
// guardar(puntos) las persiste. No espera el resultado.
export function actualizarNdvi(parcela, { leer, guardar }) {
  if (!ndviDisponible()) return { estado: 'desactivado' };
  const actual = estados.get(parcela.id);
  if (actual && ['en_cola', 'consultando'].includes(actual.estado)) return actual;
  estados.set(parcela.id, { estado: 'en_cola', en: new Date() });
  cola = cola.then(async () => {
    try {
      const pendientes = ventanasPendientes(new Date(), ANIOS, await leer());
      traza('MODIS', pendientes.length ? 'cola' : 'guardado', pendientes.length
        ? `parcela ${parcela.id}: ${pendientes.length} ventana(s) por descargar, una a la vez`
        : `parcela ${parcela.id}: serie de ${ANIOS} años ya guardada, nada que descargar`);
      let hechas = 0, fallas = 0, ultimoError = '';
      for (const v of pendientes) {
        estados.set(parcela.id, { estado: 'consultando', avance: `${hechas + fallas + 1} de ${pendientes.length}`, en: new Date() });
        try {
          await guardar(await consultar(parcela.lat, parcela.lon, v));
          hechas += 1;
        } catch (e) {
          fallas += 1;
          ultimoError = e.name === 'TimeoutError' ? 'El servicio MODIS no respondió a tiempo' : e.message;
          if (fallas >= 2) break; // servicio caído: no insistir
        }
      }
      estados.set(parcela.id, fallas && !hechas
        ? { estado: 'error', error: ultimoError, en: new Date() }
        : { estado: 'listo', parcial: fallas > 0, en: new Date() });
    } catch (e) {
      estados.set(parcela.id, { estado: 'error', error: e.message, en: new Date() });
    }
  });
  return estados.get(parcela.id);
}
