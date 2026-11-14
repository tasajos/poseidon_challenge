// Presión de plagas y enfermedades cerca de una parcela, a partir de las incidencias que registran
// los técnicos de campo (HU-OPT-02). El motor de rotación la usa para castigar las rotaciones que
// siembran la familia atacada (rotacion.js). Las deficiencias nutricionales no siguen ciclos por
// familia de cultivo, así que no entran aquí.
import { distanciaKm } from './geo.js';

export const RADIO_KM = 5;          // reportes que cuentan para una parcela
export const VIGENCIA_DIAS = 365;   // un reporte activo deja de contar después de un año
const PESO = { baja: 0.3, media: 0.6, alta: 1 };

// incidencias: [{ tipo, estado, cultivo, agente, severidad, lat, lon, creado_en }]
// Devuelve [{ familia, presion (0-1), agentes, reportes, distancia_km }], de mayor a menor presión.
export function presionDePlagas(incidencias, lat, lon, catalogo, ahora = Date.now()) {
  const familiaDe = new Map(catalogo.map((c) => [c.codigo, c.familia]));
  const grupos = new Map();
  for (const i of incidencias) {
    if (i.estado !== 'activa' || !['plaga', 'enfermedad'].includes(i.tipo)) continue;
    const familia = familiaDe.get(i.cultivo);
    if (!familia) continue;
    if (ahora - new Date(i.creado_en).getTime() > VIGENCIA_DIAS * 864e5) continue;
    const d = distanciaKm(lat, lon, i.lat, i.lon);
    if (d > RADIO_KM) continue;
    const g = grupos.get(familia) || { familia, suma: 0, agentes: new Set(), reportes: 0, distancia_km: Infinity };
    g.suma += (PESO[i.severidad] ?? PESO.media) * (1 - d / (2 * RADIO_KM)); // a 5 km pesa la mitad
    g.agentes.add(i.agente);
    g.reportes += 1;
    g.distancia_km = Math.min(g.distancia_km, d);
    grupos.set(familia, g);
  }
  return [...grupos.values()]
    .map((g) => ({
      familia: g.familia, presion: Math.min(1, Math.round(g.suma * 100) / 100),
      agentes: [...g.agentes], reportes: g.reportes, distancia_km: Math.round(g.distancia_km * 10) / 10,
    }))
    .sort((a, b) => b.presion - a.presion);
}
