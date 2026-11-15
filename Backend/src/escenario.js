// Escenarios de estrés hídrico por zona (HU-MON-02): se toma el clima típico de NASA POWER, se le
// aplica un cambio de lluvia (%) y de temperatura (°C), y se recalcula el balance de agua de la
// campaña de verano. Es una simulación simple (Hargreaves), no una proyección climática.
import { indicadoresMensuales } from './clima.js';

const CAMPANIA = [9, 10, 11, 0, 1, 2]; // octubre a marzo: campaña principal en los valles
const KC = 0.9;                        // cultivo de referencia (valor medio del catálogo)
const LLUVIA_EFECTIVA = 0.8;
export const LIMITES = { lluvia: [-60, 20], temperatura: [0, 5] };

// El nivel mide cuánto riego adicional haría falta respecto del clima actual: los sistemas de riego
// están dimensionados para la demanda de hoy, así que el aumento es lo que anticipa una crisis de
// abastecimiento. (En los valles la lluvia ya cubre menos de la mitad de la necesidad; clasificar por
// cobertura absoluta pondría todas las zonas en "alto" aun sin cambio.)
export const NIVELES = [
  { clave: 'critico', desde: 40, texto: '40 % o más de riego adicional: el abastecimiento actual no alcanza' },
  { clave: 'alto', desde: 20, texto: '20 a 39 % más de riego: hace falta un plan de contingencia' },
  { clave: 'moderado', desde: 5, texto: '5 a 19 % más de riego: conviene ahorrar y priorizar' },
  { clave: 'bajo', desde: -Infinity, texto: 'Como hoy o mejor (menos de 5 % de aumento)' },
];
export const nivelDe = (aumentoPct) => NIVELES.find((n) => aumentoPct >= n.desde).clave;

const acotar = (x, [min, max]) => Math.max(min, Math.min(max, Number(x) || 0));

// clima: { tmin[12], tmax[12], lluvia_mm[12] }. Devuelve el balance de la campaña con el cambio aplicado.
export function balanceCampania(lat, clima, { lluviaPct = 0, tempC = 0 } = {}) {
  const meses = indicadoresMensuales(lat, {
    tmin: clima.tmin.map((t) => t + tempC),
    tmax: clima.tmax.map((t) => t + tempC),
    lluvia_mm: clima.lluvia_mm.map((p) => Math.max(0, p * (1 + lluviaPct / 100))),
  });
  let demanda = 0, deficit = 0, lluvia = 0;
  for (const m of CAMPANIA) {
    const etc = KC * meses[m].et0_mm;
    demanda += etc;
    lluvia += meses[m].lluvia_mm;
    deficit += Math.max(0, etc - LLUVIA_EFECTIVA * meses[m].lluvia_mm);
  }
  return {
    demanda_mm: Math.round(demanda), lluvia_mm: Math.round(lluvia), deficit_mm: Math.round(deficit),
    cobertura_pct: demanda > 0 ? Math.round(100 * (1 - deficit / demanda)) : 100,
  };
}

// zonas: [{ nombre, lat, lon, clima, fuente }]. Compara cada zona con su línea base.
export function simular(zonas, cambio) {
  const c = { lluviaPct: acotar(cambio.lluviaPct, LIMITES.lluvia), tempC: acotar(cambio.tempC, LIMITES.temperatura) };
  return {
    cambio: c,
    zonas: zonas.map((z) => {
      const base = balanceCampania(z.lat, z.clima), esc = balanceCampania(z.lat, z.clima, c);
      const extra = esc.deficit_mm - base.deficit_mm;
      // Sin riego necesario hoy no hay porcentaje: se compara con la demanda del cultivo.
      const aumento = base.deficit_mm > 0 ? Math.round(100 * (esc.deficit_mm / base.deficit_mm - 1)) : Math.round((100 * extra) / Math.max(1, esc.demanda_mm));
      return {
        nombre: z.nombre, lat: z.lat, lon: z.lon, fuente: z.fuente, base, escenario: esc,
        riego_extra_mm: extra, riego_extra_pct: aumento, nivel: nivelDe(aumento),
      };
    }),
  };
}
