// Funciones puras de parcelas, terreno, NDVI, escenarios y agregados regionales (sin red ni base de datos).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { indicadoresMensuales } from '../src/clima.js';
import { compararRotaciones } from '../src/rotacion.js';
import { superficieHa, centro } from '../src/geo.js';
import { pendienteDeGrilla, riesgoErosion, cultivosDeCobertura, fichaTerreno } from '../src/terreno.js';
import { ventanasPendientes, leerRespuesta, resumenAnual, tendencia } from '../src/ndvi.js';
import { balanceCampania, simular } from '../src/escenario.js';
import { agregarPorZona, prioridadSueloDesnudo, csv, GRUPO_CHICO } from '../src/agregados.js';
import { leerRegistro, codigoParcela } from '../src/parcelas.js';
import { selloHidrico, vistaOferta, filtrarOfertas } from '../src/ofertas.js';

const leer = async (ruta) => JSON.parse(await readFile(new URL(ruta, import.meta.url), 'utf8'));
const catalogo = await leer('../../Database/cultivos.json');
const demo = await leer('../src/data/clima_demo.json');
const clima = indicadoresMensuales(-17.39, demo);
const porCodigo = new Map(catalogo.map((c) => [c.codigo, c]));
const limpio = (v, max) => String(v ?? '').trim().slice(0, max);

// ---------- HU-USR-01: registro de parcela ----------
test('superficie de un perímetro: un cuadrado de 100 m mide 1 hectárea', () => {
  const dLat = 100 / 110574, dLon = 100 / (111320 * Math.cos((-17.39 * Math.PI) / 180));
  const cuadrado = [[-17.39, -66.16], [-17.39 + dLat, -66.16], [-17.39 + dLat, -66.16 + dLon], [-17.39, -66.16 + dLon]];
  assert.ok(Math.abs(superficieHa(cuadrado) - 1) < 0.01, `ha=${superficieHa(cuadrado)}`);
  assert.ok(Math.abs(superficieHa([...cuadrado].reverse()) - 1) < 0.01, 'no depende del sentido');
  const [lat, lon] = centro(cuadrado);
  assert.ok(Math.abs(lat - (-17.39 + dLat / 2)) < 1e-9 && Math.abs(lon - (-66.16 + dLon / 2)) < 1e-9);
  assert.equal(superficieHa([[0, 0], [1, 1]]), 0);
});

test('el registro valida coordenadas y superficie, y deja en null lo que el agricultor no sabe', () => {
  const ok = leerRegistro({ nombre: ' Chacra ', lat: '-17.34', lon: -66.22 }, porCodigo, limpio);
  assert.deepEqual(ok.datos, { nombre: 'Chacra', lat: -17.34, lon: -66.22, perimetro: null, superficie: null, cultivo: null, etapa: null, riego: null });
  assert.throws(() => leerRegistro({ nombre: 'x', lat: 95, lon: -66 }, porCodigo, limpio), /Coordenadas/);
  assert.throws(() => leerRegistro({ nombre: 'x', lat: '', lon: -66 }, porCodigo, limpio), /Coordenadas/);
  assert.throws(() => leerRegistro({ lat: -17.3, lon: -66.2 }, porCodigo, limpio), /nombre/);
  assert.throws(() => leerRegistro({ nombre: 'x', lat: -17.3, lon: -66.2, superficie_ha: -2 }, porCodigo, limpio), /superficie/i);
  assert.throws(() => leerRegistro({ nombre: 'x', lat: -17.3, lon: -66.2, cultivo_actual: 'coca' }, porCodigo, limpio), /Cultivo/);
  assert.throws(() => leerRegistro({ nombre: 'x', lat: -17.3, lon: -66.2, etapa: 'volando' }, porCodigo, limpio), /Etapa/);
  assert.throws(() => leerRegistro({ nombre: 'x', perimetro: [[-17.3, -66.2], [-17.3, -66.21]] }, porCodigo, limpio), /perímetro/);

  // Con perímetro: el punto es su centro, la superficie se mide y se avisa si la declarada difiere mucho
  const d = 0.001;
  const perimetro = [[-17.34, -66.22], [-17.34 + d, -66.22], [-17.34 + d, -66.22 + d], [-17.34, -66.22 + d]];
  const con = leerRegistro({ nombre: 'Ladera', perimetro, cultivo_actual: 'papa', etapa: 'floracion', riego: 'temporal' }, porCodigo, limpio);
  assert.ok(con.datos.superficie > 1 && con.datos.superficie < 1.3);
  assert.equal(con.datos.lat, -17.3395);
  assert.deepEqual(con.avisos, []);
  const distinta = leerRegistro({ nombre: 'Ladera', perimetro, superficie_ha: 5 }, porCodigo, limpio);
  assert.equal(distinta.datos.superficie, 5);
  assert.match(distinta.avisos[0], /difiere/);
  assert.match(leerRegistro({ nombre: 'Lejos', lat: -16.5, lon: -68.15 }, porCodigo, limpio).avisos[0], /fuera de las zonas/);
  assert.equal(codigoParcela(42), 'PAR-00042');
});

// ---------- HU-USR-05: pendiente y erosión ----------
test('pendiente con el método de Horn y clases de erosión', () => {
  const plano = [[100, 100, 100], [100, 100, 100], [100, 100, 100]];
  assert.equal(pendienteDeGrilla(plano), 0);
  // Sube 3 m cada 30 m hacia el este: 10 %
  assert.ok(Math.abs(pendienteDeGrilla([[97, 100, 103], [97, 100, 103], [97, 100, 103]]) - 10) < 1e-9);
  // Sube 6 m cada 30 m hacia el norte: 20 %
  assert.ok(Math.abs(pendienteDeGrilla([[106, 106, 106], [100, 100, 100], [94, 94, 94]]) - 20) < 1e-9);
  assert.deepEqual([2, 8, 20, null].map(riesgoErosion), ['bajo', 'medio', 'alto', null]);
  const cobertura = cultivosDeCobertura(catalogo);
  assert.equal(cobertura[0].codigo, 'alfalfa'); // raíz profunda, forraje y perenne
  assert.ok(cobertura.every((c) => porCodigo.get(c.codigo).raiz_profunda || porCodigo.get(c.codigo).forraje));
  const ficha = fichaTerreno({ pendiente_pct: 22.5, elevacion_m: 2710 }, catalogo);
  assert.equal(ficha.riesgo, 'alto');
  assert.ok(ficha.sugeridos.length > 0 && ficha.fuente.includes('SRTM'));
  assert.equal(fichaTerreno({ pendiente_pct: 1 }, catalogo).sugeridos.length, 0);
  assert.equal(fichaTerreno({ pendiente_pct: null }, catalogo).disponible, false);
});

test('en ladera la comparación premia raíz profunda y suelo cubierto', () => {
  const llano = compararRotaciones(['papa', 'trigo'], catalogo, clima, { suelo: 5 });
  const ladera = compararRotaciones(['papa', 'trigo'], catalogo, clima, { suelo: 5 }, [], { pendiente_pct: 24, riesgo: 'alto' });
  assert.ok(ladera[0].puntajes.suelo < llano[0].puntajes.suelo, 'papa y trigo dejan el suelo desnudo y sin raíz profunda');
  assert.equal(ladera[0].evidencia.terreno.riesgo, 'alto');
  assert.ok(ladera[0].riesgos.some((r) => r.includes('Pendiente de 24 %')));
  assert.equal(llano[0].evidencia.terreno, undefined);
  const bajo = compararRotaciones(['papa', 'trigo'], catalogo, clima, { suelo: 5 }, [], { pendiente_pct: 2, riesgo: 'bajo' });
  assert.equal(bajo[0].puntajes.suelo, llano[0].puntajes.suelo);
});

// ---------- HU-CLI-04: sello hídrico ----------
test('ahorro de agua frente a papa → maíz y sello de gestión hídrica', () => {
  const tradicional = compararRotaciones(['papa', 'maiz'], catalogo, clima, {});
  assert.equal(tradicional[0].evidencia.ahorro_agua_pct, 0);
  assert.equal(selloHidrico(tradicional[0]).otorgado, false);
  const mejor = tradicional.find((s) => s.evidencia.ahorro_agua_pct >= 15);
  assert.ok(mejor, 'alguna alternativa ahorra al menos 15 %');
  assert.deepEqual(selloHidrico(mejor), { otorgado: true, ahorro_pct: mejor.evidencia.ahorro_agua_pct });
  assert.equal(mejor.evidencia.referencia_agua_mm, tradicional[0].evidencia.deficit_agua_mm);
  // Evaluaciones anteriores al sello no lo reciben ni inventan un porcentaje
  assert.deepEqual(selloHidrico({ evidencia: {} }), { otorgado: false, ahorro_pct: null });
  // Una rotación que pide más riego que la tradicional muestra 0 %, no un ahorro negativo
  assert.equal(selloHidrico({ evidencia: { ahorro_agua_pct: -12 } }).ahorro_pct, 0);

  const oferta = (rotacion, id) => vistaOferta({
    id, cultivo: rotacion.cultivos[0], cantidad: 1, unidad: 'qq', disponible_desde: '2027-01', productor: 'A B', lat: -17.34, lon: -66.22,
    resultado: [rotacion], estado_evaluacion: 'pendiente',
  }, porCodigo);
  assert.deepEqual(filtrarOfertas([oferta(tradicional[0], 1), oferta(mejor, 2)], { sello: true }).map((o) => o.id), [2]);
});

// ---------- HU-USR-02 y HU-MON-04: NDVI ----------
test('ventanas de NDVI: dos épocas por año, sin pedir lo ya guardado ni lo que aún no se publicó', () => {
  const hoy = new Date('2026-11-14T12:00:00Z');
  const todas = ventanasPendientes(hoy, 2);
  assert.deepEqual(todas.map((v) => `${v.anio}-${v.epoca}`), ['2025-humeda', '2025-seca', '2026-humeda', '2026-seca']);
  assert.deepEqual([todas[0].inicio, todas[0].fin, todas[1].inicio, todas[1].fin], ['A2025001', 'A2025081', 'A2025193', 'A2025257']);
  assert.deepEqual(ventanasPendientes(hoy, 2, ['2025-01-17', '2025-08-13', '2026-02-02']).map((v) => `${v.anio}-${v.epoca}`), ['2026-seca']);
  // En agosto la época seca del año en curso aún no terminó
  assert.deepEqual(ventanasPendientes(new Date('2026-08-01T00:00:00Z'), 1).map((v) => v.epoca), ['humeda']);
});

test('respuesta de MODIS: escala, relleno descartado, resumen anual y tendencia', () => {
  const puntos = leerRespuesta({
    scale: '0.0001',
    subset: [
      { calendar_date: '2025-01-01', data: [6357] }, { calendar_date: '2025-01-17', data: [-3000] },
      { calendar_date: '2025-02-02', data: [7000] }, { calendar_date: 'mala', data: [5000] },
    ],
  });
  assert.deepEqual(puntos, [{ fecha: '2025-01-01', valor: 0.6357 }, { fecha: '2025-02-02', valor: 0.7 }]);
  const serie = [
    ['2023-02-02', 0.5], ['2023-08-13', 0.15], ['2024-01-17', 0.56], ['2024-02-18', 0.6], ['2024-08-12', 0.18],
    ['2025-02-02', 0.66], ['2025-08-13', 0.25], ['2025-05-09', 0.9],
  ].map(([fecha, valor]) => ({ fecha, valor }));
  const resumen = resumenAnual(serie);
  assert.deepEqual(resumen, [
    { anio: 2023, humeda: 0.5, seca: 0.15 }, { anio: 2024, humeda: 0.58, seca: 0.18 }, { anio: 2025, humeda: 0.66, seca: 0.25 },
  ]);
  assert.deepEqual(tendencia(resumen), { por_anio: 0.08, sentido: 'mejora', anios: 3 });
  assert.equal(tendencia(resumen.slice(0, 2)), null, 'con menos de 3 años no se afirma una tendencia');
});

// ---------- HU-MON-02: escenarios ----------
test('menos lluvia y más calor aumentan el riego necesario', () => {
  const base = balanceCampania(-17.39, demo);
  const seco = balanceCampania(-17.39, demo, { lluviaPct: -30 });
  const calido = balanceCampania(-17.39, demo, { tempC: 2 });
  assert.ok(seco.deficit_mm > base.deficit_mm && seco.cobertura_pct < base.cobertura_pct);
  assert.ok(calido.demanda_mm > base.demanda_mm && calido.deficit_mm > base.deficit_mm);
  assert.equal(balanceCampania(-17.39, demo, { lluviaPct: -100 }).cobertura_pct, 0);

  const r = simular([{ nombre: 'Cercado', lat: -17.39, lon: -66.16, clima: demo, fuente: 'demo' }], { lluviaPct: '-200', tempC: '9' });
  assert.deepEqual(r.cambio, { lluviaPct: -60, tempC: 5 }, 'los cambios se acotan a los límites');
  assert.ok(r.zonas[0].riego_extra_mm > 0 && r.zonas[0].riego_extra_pct >= 40);
  assert.equal(r.zonas[0].nivel, 'critico', 'el nivel mide el riego adicional respecto de hoy');
  const leve = simular([{ nombre: 'Cercado', lat: -17.39, lon: -66.16, clima: demo }], { lluviaPct: -10 }).zonas[0];
  assert.ok(['moderado', 'alto'].includes(leve.nivel) && leve.riego_extra_pct < 40, `leve=${leve.riego_extra_pct}`);
  const igual = simular([{ nombre: 'Cercado', lat: -17.39, lon: -66.16, clima: demo }], {}).zonas[0];
  assert.deepEqual([igual.riego_extra_mm, igual.nivel], [0, 'bajo']);
});

// ---------- HU-MON-01, 03 y 04: agregados sin datos individuales ----------
test('agregados por zona: valores medios, adopción, suelo desnudo y supresión de grupos chicos', () => {
  const [actual, ajuste] = compararRotaciones(['papa', 'maiz'], catalogo, clima, { agua: 5 });
  const TIQ = { lat: -17.335, lon: -66.215 }, PUN = { lat: -17.54, lon: -65.84 };
  const parcelas = [
    { id: 1, usuario_id: 10, ...TIQ, superficie_ha: 1.5, pendiente_pct: 3 },
    { id: 2, usuario_id: 11, ...TIQ, superficie_ha: 2, pendiente_pct: 18 },
    { id: 3, usuario_id: 12, ...TIQ, superficie_ha: null, pendiente_pct: null },
    { id: 4, usuario_id: 12, ...TIQ, superficie_ha: 0.5, pendiente_pct: 7 },
    { id: 5, usuario_id: 20, ...PUN, superficie_ha: 9, pendiente_pct: 1 },
  ];
  const ev = (parcela_id, usuario_id, adoptada = null) => ({ parcela_id, usuario_id, resultado: [actual, ajuste], adoptada });
  const evaluaciones = [ev(1, 10, 'ajuste'), ev(2, 11, 'actual'), ev(3, 12), ev(5, 20, 'ajuste'), ev(1, 10)]; // la última de la parcela 1 es más antigua
  const ndvi = [
    { parcela_id: 1, fecha: '2025-08-13', valor: 0.12 }, { parcela_id: 2, fecha: '2025-08-13', valor: 0.32 },
    { parcela_id: 4, fecha: '2025-08-13', valor: 0.18 }, { parcela_id: 5, fecha: '2025-08-13', valor: 0.05 },
    { parcela_id: 1, fecha: '2025-02-02', valor: 0.7 },
  ];
  const incidencias = [{ ...TIQ, estado: 'activa' }, { ...TIQ, estado: 'controlada' }, { ...PUN, estado: 'activa' }];
  const r = agregarPorZona({ parcelas, evaluaciones, ndvi, incidencias });

  const tiq = r.zonas.find((z) => z.zona === 'Tiquipaya');
  assert.equal(tiq.productores, 3);
  assert.equal(tiq.parcelas, 4);
  assert.equal(tiq.superficie_ha, 4);
  assert.equal(tiq.evaluadas, 3);
  assert.equal(tiq.riego_medio_mm, actual.evidencia.deficit_agua_mm);
  assert.equal(tiq.adopcion_pct, 33, 'uno de tres productores adoptó una estrategia recomendada');
  assert.equal(tiq.ahorro_agua_mm, actual.evidencia.deficit_agua_mm - ajuste.evidencia.deficit_agua_mm);
  assert.equal(tiq.erosion_pct, 67, 'dos de las tres parcelas con pendiente conocida');
  assert.equal(tiq.suelo_desnudo_pct, 67, 'dos de tres parcelas con NDVI seco bajo 0,2');
  assert.equal(tiq.ndvi_medio, 0.21);
  assert.equal(tiq.incidencias_activas, 1);
  assert.deepEqual(r.periodo_ndvi, { anio: 2025, epoca: 'seca', anios_disponibles: [2025] });

  // Punata tiene un solo productor: sus valores no se publican
  const chico = r.zonas.find((z) => z.zona === GRUPO_CHICO);
  assert.equal(chico.suprimido, true);
  assert.ok(!JSON.stringify(r.zonas).includes('"superficie_ha":9'));
  assert.equal(r.totales.productores, 4);
  assert.equal(r.totales.adopcion_pct, 33, 'el total solo cuenta los grupos publicados');

  assert.deepEqual(prioridadSueloDesnudo(r.zonas).map((z) => [z.prioridad, z.zona, z.suelo_desnudo_pct]), [[1, 'Tiquipaya', 67]]);
  assert.equal(agregarPorZona({ parcelas, evaluaciones, ndvi, periodo: { epoca: 'humeda' } }).zonas.find((z) => z.zona === 'Tiquipaya').suelo_desnudo_pct, 0);
});

test('CSV: separador, comillas y celdas que una hoja de cálculo tomaría por fórmula', () => {
  const texto = csv([['a', 'Zona'], ['b', 'Nota'], ['c', 'Valor']], [{ a: 'Cliza', b: 'dijo "sí"; volver', c: -5 }, { a: '=HIPERVINCULO("x")', b: null, c: 1.5 }]);
  assert.equal(texto, '﻿Zona;Nota;Valor\r\nCliza;"dijo ""sí""; volver";-5\r\n"\'=HIPERVINCULO(""x"")";;1.5\r\n');
});
