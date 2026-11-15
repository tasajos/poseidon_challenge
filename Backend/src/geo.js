// Utilidades geográficas: distancia, superficie de un perímetro y zona o distrito de un punto.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const rad = (g) => (g * Math.PI) / 180;

// Distancia en km entre dos puntos (fórmula del haversine).
export function distanciaKm(lat1, lon1, lat2, lon2) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

// ---------- Perímetros de parcela: [[lat, lon], ...] ----------
// Proyección plana local en metros; suficiente para parcelas (error < 0,1 % hasta varios km).
function aMetros(perimetro) {
  const lat0 = perimetro.reduce((s, p) => s + p[0], 0) / perimetro.length;
  const kx = 111320 * Math.cos(rad(lat0)), ky = 110574;
  return perimetro.map(([lat, lon]) => [lon * kx, lat * ky]);
}

// Superficie en hectáreas (fórmula del área de Gauss).
export function superficieHa(perimetro) {
  if (!Array.isArray(perimetro) || perimetro.length < 3) return 0;
  const m = aMetros(perimetro);
  let doble = 0;
  for (let i = 0; i < m.length; i++) {
    const [x1, y1] = m[i], [x2, y2] = m[(i + 1) % m.length];
    doble += x1 * y2 - x2 * y1;
  }
  return Math.abs(doble) / 2 / 10000;
}

// Punto representativo: promedio de los vértices.
export function centro(perimetro) {
  const n = perimetro.length;
  return [perimetro.reduce((s, p) => s + p[0], 0) / n, perimetro.reduce((s, p) => s + p[1], 0) / n];
}

// ¿El punto está dentro del anillo [[lon, lat], ...] (orden GeoJSON)? Trazado de rayos.
function dentro(lon, lat, anillo) {
  let adentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i], [xj, yj] = anillo[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) adentro = !adentro;
  }
  return adentro;
}

// ---------- Zonas ----------
// Centros aproximados (plaza principal) de municipios agrícolas del departamento de Cochabamba.
// Sin límites distritales cargados, la zona de un punto es el municipio cuyo centro está más cerca
// (hasta ZONA_MAX_KM). Es una aproximación para agrupar, no un límite oficial.
export const ZONAS = [
  { nombre: 'Cercado', lat: -17.3895, lon: -66.1568 },
  { nombre: 'Sacaba', lat: -17.4042, lon: -66.0408 },
  { nombre: 'Quillacollo', lat: -17.3922, lon: -66.2786 },
  { nombre: 'Tiquipaya', lat: -17.3383, lon: -66.2161 },
  { nombre: 'Colcapirhua', lat: -17.3880, lon: -66.2380 },
  { nombre: 'Vinto', lat: -17.3970, lon: -66.3130 },
  { nombre: 'Sipe Sipe', lat: -17.4510, lon: -66.3560 },
  { nombre: 'Tarata', lat: -17.6090, lon: -66.0230 },
  { nombre: 'Cliza', lat: -17.5880, lon: -65.9320 },
  { nombre: 'Punata', lat: -17.5420, lon: -65.8350 },
  { nombre: 'Arani', lat: -17.5680, lon: -65.7690 },
  { nombre: 'Colomi', lat: -17.3500, lon: -65.8650 },
];
const ZONA_MAX_KM = 25;
export const OTRA_ZONA = 'Otra zona';

// ---------- Distritos oficiales (opcional) ----------
// Si existe Database/distritos.geojson (o DISTRITOS_GEOJSON), con polígonos y una propiedad de nombre
// (nombre, NOMBRE, distrito o DISTRITO), la zona de un punto es el distrito que lo contiene.
// Sirve para cargar los límites distritales del GAMC exportados de su servicio de mapas.
function cargarDistritos() {
  const ruta = process.env.DISTRITOS_GEOJSON || fileURLToPath(new URL('../../Database/distritos.geojson', import.meta.url));
  try {
    const gj = JSON.parse(readFileSync(ruta, 'utf8'));
    const lista = (gj.features || []).map((f) => {
      const p = f.properties || {};
      const nombre = p.nombre ?? p.NOMBRE ?? p.distrito ?? p.DISTRITO ?? p.name;
      const g = f.geometry || {};
      const poligonos = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      return nombre !== undefined && poligonos.length ? { nombre: String(nombre), poligonos } : null;
    }).filter(Boolean);
    if (lista.length) console.log(`[geo] ${lista.length} distritos cargados de ${ruta}`);
    return lista.length ? { lista, geojson: gj } : null;
  } catch (e) {
    if (e.code !== 'ENOENT') console.warn(`[geo] No se pudo leer ${ruta}: ${e.message}`);
    return null;
  }
}
const DISTRITOS = cargarDistritos();

export const hayDistritos = () => Boolean(DISTRITOS);
export const capaDistritos = () => DISTRITOS?.geojson || null;

export function zonaDe(lat, lon) {
  if (DISTRITOS) {
    const d = DISTRITOS.lista.find((x) => x.poligonos.some((pol) => dentro(lon, lat, pol[0]) && !pol.slice(1).some((hueco) => dentro(lon, lat, hueco))));
    if (d) return d.nombre;
  }
  let mejor = null;
  for (const z of ZONAS) {
    const d = distanciaKm(lat, lon, z.lat, z.lon);
    if (!mejor || d < mejor.d) mejor = { nombre: z.nombre, d };
  }
  return mejor && mejor.d <= ZONA_MAX_KM ? mejor.nombre : OTRA_ZONA;
}

// Ubicación aproximada (cuadro de ~2 km) para mostrar a terceros sin revelar la parcela exacta.
export const aproximar = (x) => Math.round(x * 50) / 50;
