// Indicadores mensuales a partir de la climatología: ET0 (Hargreaves), balance hídrico, riesgo de helada.
const DIAS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DIA_MEDIO = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];
export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Radiación extraterrestre Ra en MJ/m²/día (FAO-56, ec. 21).
export function radiacionExtraterrestre(latGrados, diaJuliano) {
  const fi = (latGrados * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * diaJuliano) / 365);
  const delta = 0.409 * Math.sin((2 * Math.PI * diaJuliano) / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(fi) * Math.tan(delta))));
  return ((24 * 60) / Math.PI) * 0.082 * dr
    * (ws * Math.sin(fi) * Math.sin(delta) + Math.cos(fi) * Math.cos(delta) * Math.sin(ws));
}

// Devuelve 12 objetos, uno por mes.
export function indicadoresMensuales(lat, { tmin, tmax, lluvia_mm }) {
  return MESES.map((mes, i) => {
    const tmed = (tmin[i] + tmax[i]) / 2;
    const ra = radiacionExtraterrestre(lat, DIA_MEDIO[i]);
    // Hargreaves: ET0 (mm/día) = 0.0023 · (Tmed + 17.8) · √(Tmax − Tmin) · Ra · 0.408
    const et0Dia = 0.0023 * (tmed + 17.8) * Math.sqrt(Math.max(tmax[i] - tmin[i], 0)) * ra * 0.408;
    const et0 = Math.max(et0Dia, 0) * DIAS[i];
    // La mínima media mensual no es una frecuencia de heladas: es un indicador aproximado.
    const helada = tmin[i] <= 2 ? 'alta' : tmin[i] <= 5 ? 'media' : 'baja';
    return {
      mes,
      tmin: redondear(tmin[i]), tmax: redondear(tmax[i]),
      lluvia_mm: redondear(lluvia_mm[i]), et0_mm: redondear(et0),
      balance_mm: redondear(lluvia_mm[i] - et0),
      helada,
      seco: lluvia_mm[i] < 0.3 * et0,
    };
  });
}

const redondear = (x) => Math.round(x * 10) / 10;
