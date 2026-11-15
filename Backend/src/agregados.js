// Indicadores regionales agregados por zona o distrito (HU-MON-01, 03 y 04). Ningún resultado permite
// identificar una parcela: las zonas con menos de MIN_PRODUCTORES productores se juntan en un solo grupo
// y, si ese grupo sigue siendo pequeño, sus valores no se publican.
import { zonaDe } from './geo.js';
import { riesgoErosion } from './terreno.js';
import { resumenAnual, SUELO_DESNUDO } from './ndvi.js';

export const MIN_PRODUCTORES = 3;
export const GRUPO_CHICO = 'Zonas con pocos registros';

const media = (xs, dec = 0) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10 ** dec) / 10 ** dec : null);
const pct = (n, total) => (total ? Math.round((100 * n) / total) : null);

// parcelas: [{ id, usuario_id, lat, lon, superficie_ha, pendiente_pct }]
// evaluaciones: [{ parcela_id, usuario_id, resultado, adoptada, creado_en }] (más recientes primero)
// ndvi: [{ parcela_id, fecha, valor }]; incidencias: [{ lat, lon, estado }]
// periodo: { anio, epoca: 'seca'|'humeda' } para el suelo desnudo (por defecto el último año con datos, época seca).
export function agregarPorZona({ parcelas, evaluaciones, ndvi = [], incidencias = [], periodo = {} }) {
  const ultima = new Map(); // parcela → evaluación más reciente
  const decidida = new Map(); // parcela → evaluación más reciente en la que el productor eligió una estrategia
  for (const e of evaluaciones) {
    if (!ultima.has(e.parcela_id)) ultima.set(e.parcela_id, e);
    if (e.adoptada && !decidida.has(e.parcela_id)) decidida.set(e.parcela_id, e);
  }
  const ndviPorParcela = new Map();
  for (const p of ndvi) (ndviPorParcela.get(p.parcela_id) || ndviPorParcela.set(p.parcela_id, []).get(p.parcela_id)).push(p);
  const resumenes = new Map([...ndviPorParcela].map(([id, puntos]) => [id, resumenAnual(puntos)]));
  const epoca = periodo.epoca === 'humeda' ? 'humeda' : 'seca';
  const aniosConDato = [...new Set([...resumenes.values()].flatMap((r) => r.filter((x) => x[epoca] !== null).map((x) => x.anio)))].sort();
  const anio = aniosConDato.includes(Number(periodo.anio)) ? Number(periodo.anio) : aniosConDato.at(-1) ?? null;

  // 1. Zona de cada parcela y cuántos productores hay por zona
  const zonaParcela = new Map(parcelas.map((p) => [p.id, zonaDe(p.lat, p.lon)]));
  const productores = new Map();
  for (const p of parcelas) (productores.get(zonaParcela.get(p.id)) || productores.set(zonaParcela.get(p.id), new Set()).get(zonaParcela.get(p.id))).add(p.usuario_id);
  const grupoDe = (zona) => (productores.get(zona).size >= MIN_PRODUCTORES ? zona : GRUPO_CHICO);

  // 2. Acumular por grupo
  const grupos = new Map();
  const g = (nombre) => grupos.get(nombre) || grupos.set(nombre, {
    zona: nombre, productores: new Set(), parcelas: 0, superficie: [], riego: [], agua: [], helada: 0, evaluadas: 0,
    adoptaron: new Set(), conEvaluacion: new Set(), ahorro: [], pendiente: [], erosion: 0, ndvi: [], desnudas: 0, conNdvi: 0, incidencias: 0, zonas: new Set(),
  }).get(nombre);

  for (const p of parcelas) {
    const zona = zonaParcela.get(p.id), x = g(grupoDe(zona));
    x.zonas.add(zona);
    x.productores.add(p.usuario_id);
    x.parcelas += 1;
    if (p.superficie_ha) x.superficie.push(p.superficie_ha);
    if (p.pendiente_pct !== null && p.pendiente_pct !== undefined) {
      x.pendiente.push(p.pendiente_pct);
      if (riesgoErosion(p.pendiente_pct) !== 'bajo') x.erosion += 1;
    }
    const e = ultima.get(p.id);
    if (e) {
      const actual = e.resultado[0];
      x.evaluadas += 1;
      x.conEvaluacion.add(p.usuario_id);
      x.riego.push(actual.evidencia.deficit_agua_mm);
      x.agua.push(actual.puntajes.agua);
      if (actual.detalle.some((d) => d.meses_helada.length)) x.helada += 1;
      // Adopción: el productor marcó que aplicará una estrategia recomendada distinta de la actual
      const d = decidida.get(p.id);
      const elegida = d && d.adoptada !== 'actual' ? d.resultado.find((s) => s.tipo === d.adoptada) : null;
      if (elegida) {
        x.adoptaron.add(p.usuario_id);
        x.ahorro.push(d.resultado[0].evidencia.deficit_agua_mm - elegida.evidencia.deficit_agua_mm);
      }
    }
    const r = anio !== null ? resumenes.get(p.id)?.find((y) => y.anio === anio) : null;
    if (r && r[epoca] !== null) {
      x.conNdvi += 1;
      x.ndvi.push(r[epoca]);
      if (r[epoca] < SUELO_DESNUDO) x.desnudas += 1;
    }
  }
  for (const i of incidencias) {
    if (i.estado !== 'activa') continue;
    const zona = zonaDe(i.lat, i.lon);
    if (productores.has(zona)) g(grupoDe(zona)).incidencias += 1;
  }

  // 3. Publicar: valores agregados, o suprimidos si el grupo es demasiado chico
  const zonas = [...grupos.values()].map((x) => {
    const n = x.productores.size;
    if (n < MIN_PRODUCTORES) return { zona: x.zona, suprimido: true, motivo: `Menos de ${MIN_PRODUCTORES} productores: no se publican valores` };
    return {
      zona: x.zona,
      agrupa: x.zona === GRUPO_CHICO ? [...x.zonas].sort() : undefined,
      productores: n,
      parcelas: x.parcelas,
      superficie_ha: x.superficie.length ? Math.round(x.superficie.reduce((a, b) => a + b, 0) * 10) / 10 : null,
      evaluadas: x.evaluadas,
      riego_medio_mm: media(x.riego),
      agua_indice: media(x.agua),
      helada_pct: pct(x.helada, x.evaluadas),
      pendiente_media_pct: media(x.pendiente, 1),
      erosion_pct: pct(x.erosion, x.pendiente.length),
      adopcion_pct: pct(x.adoptaron.size, x.conEvaluacion.size),
      productores_con_evaluacion: x.conEvaluacion.size,
      ahorro_agua_mm: x.ahorro.length ? media(x.ahorro) : null,
      ndvi_medio: media(x.ndvi, 2),
      parcelas_con_ndvi: x.conNdvi,
      suelo_desnudo_pct: pct(x.desnudas, x.conNdvi),
      incidencias_activas: x.incidencias,
    };
  }).sort((a, b) => (b.productores || 0) - (a.productores || 0) || a.zona.localeCompare(b.zona));

  const visibles = zonas.filter((z) => !z.suprimido);
  const suma = (k) => visibles.reduce((s, z) => s + (z[k] || 0), 0);
  const publicados = [...grupos.values()].filter((x) => x.productores.size >= MIN_PRODUCTORES);
  const adoptaron = publicados.reduce((s, x) => s + x.adoptaron.size, 0);
  return {
    zonas,
    periodo_ndvi: { anio, epoca, anios_disponibles: aniosConDato },
    totales: {
      productores: new Set(parcelas.map((p) => p.usuario_id)).size,
      parcelas: parcelas.length,
      evaluadas: suma('evaluadas'),
      incidencias_activas: incidencias.filter((i) => i.estado === 'activa').length,
      adopcion_pct: pct(adoptaron, suma('productores_con_evaluacion')),
    },
  };
}

// Distritos prioritarios para cobertura vegetal: más suelo desnudo primero (HU-MON-04).
export function prioridadSueloDesnudo(zonas) {
  return zonas.filter((z) => !z.suprimido && z.suelo_desnudo_pct !== null && z.parcelas_con_ndvi > 0)
    .sort((a, b) => b.suelo_desnudo_pct - a.suelo_desnudo_pct || a.ndvi_medio - b.ndvi_medio)
    .map((z, i) => ({
      prioridad: i + 1, zona: z.zona, suelo_desnudo_pct: z.suelo_desnudo_pct, ndvi_medio: z.ndvi_medio,
      parcelas_con_ndvi: z.parcelas_con_ndvi, superficie_ha: z.superficie_ha,
    }));
}

// CSV con separador ";" y BOM, que Excel abre bien en español.
export function csv(columnas, filas) {
  const celda = (v) => {
    let t = v === null || v === undefined ? '' : String(v);
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(t)) t = `'${t}`; // evita que una hoja de cálculo lo tome por fórmula
    return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return `﻿${[columnas.map((c) => celda(c[1])).join(';'), ...filas.map((f) => columnas.map((c) => celda(f[c[0]])).join(';'))].join('\r\n')}\r\n`;
}
