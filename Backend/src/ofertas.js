// Oferta sostenible (HU-CLI-02). Las prácticas y el indicador de agua no los declara el productor:
// se calculan con la rotación actual de la evaluación a la que pertenece la oferta. "Verificada"
// significa que un técnico de Poseidon revisó esa evaluación; no es una certificación oficial.
import { zonaDe, aproximar } from './geo.js';

export const PRACTICAS = {
  leguminosa: 'Incluye una leguminosa que abona el suelo',
  alterna_familias: 'Alterna familias de cultivos (corta ciclos de plagas)',
  cobertura: 'Suelo cubierto la mayor parte del año (6 meses o menos desnudo)',
  raiz_profunda: 'Incluye cultivos de raíz profunda (mejor infiltración)',
};
export const UNIDADES = ['kg', 'qq', 't'];
export const NIVELES_AGUA = ['alta', 'media', 'baja'];

// Uso eficiente del agua: el puntaje de agua de la rotación (0-100; 100 = casi sin riego).
export const nivelAgua = (indice) => (indice >= 70 ? 'alta' : indice >= 40 ? 'media' : 'baja');

export function practicasDe(rotacion, porCodigo) {
  const cultivos = rotacion.cultivos.map((k) => porCodigo.get(k)).filter(Boolean);
  return {
    leguminosa: cultivos.some((c) => c.fija_nitrogeno),
    alterna_familias: !rotacion.evidencia.repite_familia,
    cobertura: rotacion.evidencia.meses_suelo_desnudo <= 6,
    raiz_profunda: cultivos.some((c) => c.raiz_profunda),
  };
}

// "Agricultor Demo" → "Agricultor D." (el nombre completo se comparte al aceptar una solicitud)
export const abreviar = (nombre) => {
  const [primero, ...resto] = String(nombre || 'Productor').trim().split(/\s+/);
  return resto.length ? `${primero} ${resto[resto.length - 1][0].toUpperCase()}.` : primero;
};

// Vista para compradores. o: oferta unida a su evaluación (resultado, estado_evaluacion) y parcela (lat, lon).
// No incluye la parcela exacta, el correo ni el nombre completo del productor.
export function vistaOferta(o, porCodigo) {
  const actual = o.resultado[0];
  const det = actual.detalle.find((d) => d.codigo === o.cultivo);
  const practicas = practicasDe(actual, porCodigo);
  const indice = actual.puntajes.agua;
  return {
    id: o.id,
    cultivo: o.cultivo,
    cultivo_nombre: porCodigo.get(o.cultivo)?.nombre || o.cultivo,
    familia: porCodigo.get(o.cultivo)?.familia || null,
    cantidad: Number(o.cantidad),
    unidad: o.unidad,
    disponible_desde: o.disponible_desde,
    nota: o.nota || '',
    creado_en: o.creado_en,
    productor: abreviar(o.productor),
    zona: zonaDe(o.lat, o.lon),
    lat: aproximar(o.lat),
    lon: aproximar(o.lon),
    rotacion: actual.nombres,
    verificada: o.estado_evaluacion === 'revisada',
    practicas,
    n_practicas: Object.values(practicas).filter(Boolean).length,
    agua: {
      indice,
      nivel: nivelAgua(indice),
      riego_mm: det ? det.deficit_mm : null,
      lluvia_pct: det && det.demanda_mm ? Math.max(0, Math.round(100 * (1 - det.deficit_mm / det.demanda_mm))) : null,
    },
  };
}

// filtros: { cultivos: [], practicas: [], verificada: bool, agua: 'alta'|'media'|'', zona: '' }
// Todas las prácticas pedidas deben cumplirse. agua='media' acepta media o alta.
export function filtrarOfertas(lista, f = {}) {
  const minimo = { alta: 70, media: 40 }[f.agua] ?? 0;
  return lista
    .filter((o) => !f.cultivos?.length || f.cultivos.includes(o.cultivo))
    .filter((o) => (f.practicas || []).every((p) => o.practicas[p]))
    .filter((o) => !f.verificada || o.verificada)
    .filter((o) => o.agua.indice >= minimo)
    .filter((o) => !f.zona || o.zona === f.zona)
    .sort((a, b) => b.agua.indice - a.agua.indice || b.n_practicas - a.n_practicas || Number(b.verificada) - Number(a.verificada));
}

// Cuántas ofertas hay por valor de un campo (para mostrar al lado de cada filtro).
export const contar = (lista, clave) => lista.reduce((a, o) => ({ ...a, [o[clave]]: (a[o[clave]] || 0) + 1 }), {});
