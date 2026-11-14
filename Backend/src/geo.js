// Utilidades geográficas: distancia entre puntos y zona aproximada (municipio más cercano).

// Distancia en km entre dos puntos (fórmula del haversine).
export function distanciaKm(lat1, lon1, lat2, lon2) {
  const rad = (g) => (g * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Centros aproximados (plaza principal) de municipios agrícolas del departamento de Cochabamba.
// La zona de una parcela es el municipio cuyo centro está más cerca, hasta ZONA_MAX_KM.
// Es una aproximación para agrupar la oferta, no un límite municipal oficial.
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

export function zonaDe(lat, lon) {
  let mejor = null;
  for (const z of ZONAS) {
    const d = distanciaKm(lat, lon, z.lat, z.lon);
    if (!mejor || d < mejor.d) mejor = { nombre: z.nombre, d };
  }
  return mejor && mejor.d <= ZONA_MAX_KM ? mejor.nombre : OTRA_ZONA;
}

// Ubicación aproximada (cuadro de ~2 km) para mostrar a terceros sin revelar la parcela exacta.
export const aproximar = (x) => Math.round(x * 50) / 50;
