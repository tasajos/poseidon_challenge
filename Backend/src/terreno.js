// Pendiente y riesgo de erosión de una parcela con el modelo de elevación SRTM de la NASA (HU-USR-05).
// La elevación se consulta en un servicio público que publica SRTM de 30 m (por defecto OpenTopoData;
// ELEVACION_URL lo cambia y, vacío, desactiva la consulta). Se piden 9 puntos alrededor del centro de la
// parcela y la pendiente sale de esa grilla. SRTM tiene celdas de ~30 m y unos metros de error vertical:
// describe la ladera, no los surcos ni las terrazas de la parcela.
import 'dotenv/config';
import { traza, punto } from './traza.js';

const URL_ELEVACION = process.env.ELEVACION_URL ?? 'https://api.opentopodata.org/v1/srtm30m';
const PASO_M = 30;
export const FUENTE_TERRENO = 'NASA SRTM 30 m';

export const terrenoDisponible = () => Boolean(URL_ELEVACION);

// Pendiente (%) en el centro de una grilla de 3x3 elevaciones (m), filas de norte a sur y columnas de
// oeste a este, con el método de Horn (el que usan los SIG).
export function pendienteDeGrilla(z, paso = PASO_M) {
  const [[a, b, c], [d, , f], [g, h, i]] = z;
  const dzdx = ((c + 2 * f + i) - (a + 2 * d + g)) / (8 * paso);
  const dzdy = ((g + 2 * h + i) - (a + 2 * b + c)) / (8 * paso);
  return Math.sqrt(dzdx ** 2 + dzdy ** 2) * 100;
}

// Clases de pendiente habituales en conservación de suelos.
export function riesgoErosion(pendientePct) {
  if (pendientePct === null || pendientePct === undefined) return null;
  if (pendientePct < 5) return 'bajo';
  if (pendientePct < 15) return 'medio';
  return 'alto';
}

const TEXTO = {
  bajo: 'Terreno casi plano: el agua de lluvia corre poco. Basta con no dejar el suelo desnudo en la época de lluvias.',
  medio: 'Ladera moderada: con lluvias fuertes el agua arrastra suelo y abono. Siembre en curvas de nivel y mantenga el suelo cubierto.',
  alto: 'Ladera fuerte: riesgo alto de perder suelo y nutrientes con las lluvias. Use cultivos de cobertura o de raíz profunda, surcos en contorno o terrazas, y evite dejar el suelo desnudo.',
};

// Cultivos del catálogo que protegen una ladera: raíz profunda o forraje que cubre el suelo.
export function cultivosDeCobertura(catalogo) {
  return catalogo.filter((c) => c.raiz_profunda || c.forraje)
    .sort((a, b) => (Number(b.raiz_profunda) + Number(b.forraje)) - (Number(a.raiz_profunda) + Number(a.forraje)) || b.ciclo_dias - a.ciclo_dias)
    .map((c) => ({ codigo: c.codigo, nombre: c.nombre, motivo: c.raiz_profunda && c.forraje ? 'raíz profunda y cubre el suelo' : c.raiz_profunda ? 'raíz profunda' : 'cubre el suelo' }));
}

// Ficha de terreno para la interfaz, a partir de lo guardado en la parcela.
export function fichaTerreno(parcela, catalogo) {
  if (parcela.pendiente_pct === null || parcela.pendiente_pct === undefined) {
    return {
      disponible: false,
      motivo: terrenoDisponible() ? 'Aún no se pudo consultar la elevación; se reintenta al abrir la parcela.' : 'La consulta de elevación está desactivada en el servidor.',
    };
  }
  const riesgo = riesgoErosion(parcela.pendiente_pct);
  return {
    disponible: true,
    pendiente_pct: parcela.pendiente_pct,
    elevacion_m: parcela.elevacion_m,
    riesgo,
    explicacion: TEXTO[riesgo],
    sugeridos: riesgo === 'bajo' ? [] : cultivosDeCobertura(catalogo).slice(0, 5),
    fuente: FUENTE_TERRENO,
    consultado_en: parcela.terreno_en,
    nota: 'Estimación de la ladera con celdas de 30 m; no mide surcos ni terrazas de la parcela.',
  };
}

// Consulta la elevación de la grilla 3x3 centrada en el punto. Devuelve { elevacion_m, pendiente_pct }.
export async function consultarTerreno(lat, lon) {
  if (!terrenoDisponible()) throw new Error('Consulta de elevación desactivada');
  const dLat = PASO_M / 110574, dLon = PASO_M / (111320 * Math.cos((lat * Math.PI) / 180));
  const puntos = [];
  for (const i of [1, 0, -1]) for (const j of [-1, 0, 1]) puntos.push(`${(lat + i * dLat).toFixed(6)},${(lon + j * dLon).toFixed(6)}`);
  const t0 = Date.now();
  try {
    const r = await fetch(`${URL_ELEVACION}?locations=${puntos.join('|')}`, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`El servicio de elevación respondió ${r.status}`);
    const d = await r.json();
    const z = (d.results || []).map((x) => x.elevation);
    if (z.length !== 9 || z.some((v) => typeof v !== 'number')) throw new Error('El servicio de elevación no tiene datos para este punto');
    const t = {
      elevacion_m: Math.round(z[4] * 10) / 10,
      pendiente_pct: Math.round(pendienteDeGrilla([z.slice(0, 3), z.slice(3, 6), z.slice(6, 9)]) * 10) / 10,
    };
    traza('SRTM', 'descarga', `9 elevaciones ${punto(lat, lon)}: ${t.elevacion_m} m s. n. m., pendiente ${t.pendiente_pct} %`, Date.now() - t0);
    return t;
  } catch (e) {
    traza('SRTM', 'error', `${punto(lat, lon)}: ${e.message}`, Date.now() - t0);
    throw e;
  }
}
