// Cliente de NASA POWER (climatología mensual, comunidad AG). No requiere clave.
// Docs: https://power.larc.nasa.gov/docs/services/api/temporal/climatology/
import { readFile } from 'node:fs/promises';
import { traza, punto } from './traza.js';

const CLAVES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DIAS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const cache = new Map();

// Devuelve { fuente, tmin[12], tmax[12], lluvia_mm[12] } (lluvia en mm por mes).
export async function climatologia(lat, lon) {
  const clave = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (cache.has(clave)) {
    traza('NASA POWER', 'cache', `climatología mensual ${punto(lat, lon)}`);
    return cache.get(clave);
  }
  let datos;
  const t0 = Date.now();
  try {
    const url = 'https://power.larc.nasa.gov/api/temporal/climatology/point'
      + `?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR&community=AG&longitude=${lon}&latitude=${lat}&format=JSON`;
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`POWER respondió ${r.status}`);
    const p = (await r.json()).properties.parameter;
    const serie = (nombre) => CLAVES.map((k) => {
      const v = p[nombre][k];
      if (typeof v !== 'number' || v <= -900) throw new Error(`POWER sin dato para ${nombre}/${k}`);
      return v;
    });
    datos = {
      fuente: 'nasa-power',
      tmin: serie('T2M_MIN'),
      tmax: serie('T2M_MAX'),
      lluvia_mm: serie('PRECTOTCORR').map((mmDia, i) => mmDia * DIAS[i]), // POWER entrega mm/día
    };
    cache.set(clave, datos);
    const media = (xs) => (xs.reduce((a, b) => a + b, 0) / 12).toFixed(1);
    traza('NASA POWER', 'descarga', `climatología mensual ${punto(lat, lon)}: Tmín ${media(datos.tmin)} °C, `
      + `Tmáx ${media(datos.tmax)} °C, lluvia ${Math.round(datos.lluvia_mm.reduce((a, b) => a + b, 0))} mm/año`, Date.now() - t0);
  } catch (e) {
    traza('NASA POWER', 'demo', `sin respuesta (${e.message}); se usa clima de demostración ${punto(lat, lon)}`, Date.now() - t0);
    const demo = JSON.parse(await readFile(new URL('./data/clima_demo.json', import.meta.url), 'utf8'));
    datos = { fuente: 'demo', tmin: demo.tmin, tmax: demo.tmax, lluvia_mm: demo.lluvia_mm };
  }
  return datos;
}
