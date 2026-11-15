// Registro de parcelas (HU-USR-01): validación de lo que declara el agricultor, identificador,
// y los datos que se completan solos después de guardar (terreno SRTM y NDVI de MODIS).
import * as db from './db.js';
import { superficieHa, centro, zonaDe } from './geo.js';
import { consultarTerreno, terrenoDisponible, riesgoErosion } from './terreno.js';
import { actualizarNdvi } from './ndvi.js';

export const ETAPAS = { preparacion: 'Preparación del terreno', siembra: 'Siembra', crecimiento: 'Crecimiento', floracion: 'Floración', cosecha: 'Cosecha', descanso: 'En descanso' };
export const RIEGOS = { permanente: 'Riego todo el año', temporal: 'Riego solo en algunos meses', sin_riego: 'Sin riego (solo lluvia)' };
const MAX_VERTICES = 60, MAX_HA = 5000;

const error = (status, mensaje) => Object.assign(new Error(mensaje), { status });
const esCoordenada = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
const seis = (x) => Math.round(x * 1e6) / 1e6;

export const codigoParcela = (id) => `PAR-${String(id).padStart(5, '0')}`;

// Valida y normaliza el cuerpo del registro. Los datos que el agricultor no conoce quedan en null
// ("no disponible"). Devuelve { datos, avisos }: los avisos no impiden guardar.
export function leerRegistro(b, porCodigo, textoLimpio) {
  const avisos = [];
  let perimetro = null;
  if (b.perimetro !== undefined && b.perimetro !== null) {
    if (!Array.isArray(b.perimetro) || b.perimetro.length < 3 || b.perimetro.length > MAX_VERTICES) {
      throw error(400, `El perímetro debe tener entre 3 y ${MAX_VERTICES} puntos`);
    }
    perimetro = b.perimetro.map((p) => {
      const lat = Number(p?.[0]), lon = Number(p?.[1]);
      if (!Array.isArray(p) || !esCoordenada(lat, lon)) throw error(400, 'El perímetro tiene un punto con coordenadas inválidas');
      return [seis(lat), seis(lon)];
    });
  }
  let lat, lon;
  if (perimetro) [lat, lon] = centro(perimetro);
  else {
    lat = Number(b.lat); lon = Number(b.lon);
    if (b.lat === undefined || b.lat === null || b.lat === '' || b.lon === undefined || b.lon === null || b.lon === '' || !esCoordenada(lat, lon)) {
      throw error(400, 'Coordenadas inválidas: la latitud va de -90 a 90 y la longitud de -180 a 180');
    }
  }
  const nombre = textoLimpio(b.nombre, 80);
  if (!nombre) throw error(400, 'Póngale un nombre a la parcela');

  const medida = perimetro ? Math.round(superficieHa(perimetro) * 100) / 100 : null;
  let superficie = null;
  if (b.superficie_ha !== undefined && b.superficie_ha !== null && b.superficie_ha !== '') {
    superficie = Math.round(Number(b.superficie_ha) * 100) / 100;
    if (!(superficie > 0 && superficie <= MAX_HA)) throw error(400, `La superficie debe ser mayor que 0 y de hasta ${MAX_HA} hectáreas`);
    if (medida && (superficie > medida * 1.5 || superficie < medida / 1.5)) {
      avisos.push(`La superficie que escribió (${superficie} ha) difiere bastante de la del perímetro dibujado (${medida} ha). Revise cuál es la correcta.`);
    }
  } else if (medida) superficie = medida;
  if (perimetro && medida < 0.01) throw error(400, 'El perímetro dibujado es demasiado pequeño (menos de 100 m²)');

  const opcional = (valor, validos, campo) => {
    if (valor === undefined || valor === null || valor === '') return null;
    if (!validos(valor)) throw error(400, `${campo} no válido`);
    return valor;
  };
  const datos = {
    nombre, lat: seis(lat), lon: seis(lon), perimetro, superficie,
    cultivo: opcional(b.cultivo_actual, (v) => porCodigo.has(v), 'Cultivo'),
    etapa: opcional(b.etapa, (v) => Object.hasOwn(ETAPAS, v), 'Etapa del cultivo'),
    riego: opcional(b.riego, (v) => Object.hasOwn(RIEGOS, v), 'Disponibilidad de riego'),
  };
  if (zonaDe(datos.lat, datos.lon) === 'Otra zona') avisos.push('La ubicación está fuera de las zonas de Cochabamba que conoce Poseidon. Compruebe las coordenadas.');
  return { datos, avisos, superficie_medida_ha: medida };
}

// Parcela para la interfaz. Los campos sin dato se muestran como "no disponible".
export function vistaParcela(p, porCodigo) {
  return {
    id: p.id, codigo: codigoParcela(p.id), nombre: p.nombre, lat: p.lat, lon: p.lon, perimetro: p.perimetro || null,
    superficie_ha: p.superficie_ha ?? null,
    cultivo_actual: p.cultivo_actual || null, cultivo_nombre: p.cultivo_actual ? porCodigo.get(p.cultivo_actual)?.nombre || p.cultivo_actual : null,
    etapa: p.etapa || null, etapa_texto: ETAPAS[p.etapa] || null,
    riego: p.riego || null, riego_texto: RIEGOS[p.riego] || null,
    zona: zonaDe(p.lat, p.lon),
    pendiente_pct: p.pendiente_pct ?? null, erosion: riesgoErosion(p.pendiente_pct),
    usuario_id: p.usuario_id, agricultor: p.agricultor, tecnico_id: p.tecnico_id ?? null, tecnico: p.tecnico || null,
    creado_en: p.creado_en,
  };
}

// Consulta y guarda pendiente y elevación si faltan. Devuelve la parcela (actualizada si se pudo).
export async function completarTerreno(p) {
  if ((p.pendiente_pct !== null && p.pendiente_pct !== undefined) || !terrenoDisponible()) return p;
  try {
    const t = await consultarTerreno(p.lat, p.lon);
    const cambios = { ...t, terreno_en: new Date() };
    await db.actualizarParcela(p.id, cambios);
    return { ...p, ...cambios };
  } catch (e) {
    console.warn(`[terreno] Parcela ${p.id}: ${e.message}`);
    return p;
  }
}

// Pide en segundo plano el NDVI que falte de la parcela.
export const encolarNdvi = (p) => actualizarNdvi(p, {
  leer: async () => (await db.ndviDe(p.id)).map((x) => x.fecha),
  guardar: (puntos) => db.guardarNdvi(p.id, puntos),
});

// Tras registrar: terreno y NDVI sin hacer esperar al agricultor más de `esperaMs`.
export async function prepararParcela(p, esperaMs = 6000) {
  encolarNdvi(p);
  const terreno = completarTerreno(p);
  return Promise.race([terreno, new Promise((ok) => setTimeout(() => ok(p), esperaMs).unref())]);
}
