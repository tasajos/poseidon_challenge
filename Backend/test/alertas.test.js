// Umbrales de alerta climática con series sintéticas (sin red).
import test from 'node:test';
import assert from 'node:assert/strict';
import { detectarEventos } from '../src/alertas.js';

const U = { heladaC: 0, sequiaPct: 30, sequiaMinMm: 20 };
// 30 días de noviembre; lluvia normal de noviembre = 60 mm (2 mm/día).
const NORMAL = [100, 90, 80, 30, 5, 1, 1, 3, 10, 30, 60, 90];
const serie = (fn) => Array.from({ length: 30 }, (_, i) => ({
  fecha: `202611${String(i + 1).padStart(2, '0')}`, tmin: 6, tmax: 22, lluvia: 2, ...fn(i),
}));

test('sin eventos con clima normal', () => {
  assert.deepEqual(detectarEventos(serie(() => ({})), NORMAL, U), []);
});

test('helada: mínima bajo el umbral en los últimos 3 días', () => {
  const ev = detectarEventos(serie((i) => (i === 28 ? { tmin: -2.4 } : {})), NORMAL, U);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].tipo, 'helada');
  assert.equal(ev[0].fecha, '20261129');
  assert.match(ev[0].mensaje, /-2\.4 °C/);
});

test('helada antigua (más de 3 días) no alerta', () => {
  assert.deepEqual(detectarEventos(serie((i) => (i === 10 ? { tmin: -3 } : {})), NORMAL, U), []);
});

test('sequía severa: menos del 30 % de la lluvia normal', () => {
  const ev = detectarEventos(serie(() => ({ lluvia: 0.3 })), NORMAL, U); // 9 mm de 60
  assert.equal(ev.length, 1);
  assert.equal(ev[0].tipo, 'sequia');
  assert.equal(ev[0].valor, 9);
});

test('época seca normal no se confunde con sequía', () => {
  const junio = Array.from({ length: 30 }, (_, i) => ({ fecha: `202606${String(i + 1).padStart(2, '0')}`, tmin: 4, tmax: 20, lluvia: 0 }));
  assert.deepEqual(detectarEventos(junio, NORMAL, U), []);
});

test('sin climatología de NASA no se evalúa sequía', () => {
  assert.deepEqual(detectarEventos(serie(() => ({ lluvia: 0 })), null, U), []);
});
