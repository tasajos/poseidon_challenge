import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { indicadoresMensuales, radiacionExtraterrestre } from '../src/clima.js';
import { compararRotaciones, evaluarRotacion, canonica, calendario } from '../src/rotacion.js';

const leer = async (ruta) => JSON.parse(await readFile(new URL(ruta, import.meta.url), 'utf8'));
const catalogo = await leer('../../Database/cultivos.json');
const demo = await leer('../src/data/clima_demo.json');
const clima = indicadoresMensuales(-17.39, demo);
const cultivo = (k) => catalogo.find((c) => c.codigo === k);

test('Ra en el ecuador a mitad de marzo ronda 38 MJ/m²/día (tabla FAO-56)', () => {
  const ra = radiacionExtraterrestre(0, 74);
  assert.ok(ra > 36.5 && ra < 38.5, `Ra=${ra}`);
});

test('el clima de Cochabamba marca helada en invierno y lluvia en verano', () => {
  assert.equal(clima[5].helada, 'alta');   // junio
  assert.equal(clima[0].helada, 'baja');   // enero
  assert.ok(clima[6].seco && !clima[0].seco);
  const et0Anual = clima.reduce((a, m) => a + m.et0_mm, 0);
  assert.ok(et0Anual > 1000 && et0Anual < 1900, `ET0 anual=${et0Anual}`);
});

test('el calendario cruza el fin de año', () => {
  assert.deepEqual(calendario(cultivo('papa')), [9, 10, 11, 0, 1]);
});

test('rotaciones cíclicamente iguales tienen la misma clave', () => {
  assert.equal(canonica(['papa', 'maiz', 'haba']), canonica(['haba', 'papa', 'maiz']));
});

test('una leguminosa mejora el puntaje de suelo', () => {
  const sin = evaluarRotacion([cultivo('papa'), cultivo('maiz')], clima);
  const con = evaluarRotacion([cultivo('papa'), cultivo('haba')], clima);
  assert.ok(con.puntajes.suelo > sin.puntajes.suelo);
});

test('devuelve tres estrategias: actual, ajuste y cambio mayor', () => {
  const r = compararRotaciones(['papa', 'maiz', 'trigo'], catalogo, clima, { agua: 5, suelo: 3 });
  assert.deepEqual(r.map((e) => e.tipo), ['actual', 'ajuste', 'cambio']);
  assert.deepEqual(r[0].cultivos, ['papa', 'maiz', 'trigo']);
  const comunes = r[1].cultivos.filter((k) => r[0].cultivos.includes(k)).length;
  assert.ok(comunes >= 2, 'el ajuste conserva al menos dos cultivos');
  for (const e of r) {
    assert.ok(e.puntaje >= 0 && e.puntaje <= 100);
    assert.ok(e.porque.length && e.riesgos.length && e.vacios.length);
    assert.equal(e._crudo, undefined);
  }
  assert.ok(r[1].puntaje >= r[0].puntaje, 'el ajuste no puntúa peor que la actual');
});

test('las prioridades cambian la recomendación', () => {
  const agua = compararRotaciones(['papa', 'maiz'], catalogo, clima, { agua: 5 });
  const ingreso = compararRotaciones(['papa', 'maiz'], catalogo, clima, { ingreso: 5 });
  assert.notDeepEqual(agua[2].cultivos, ingreso[2].cultivos);
});

test('rechaza cultivos desconocidos', () => {
  assert.throws(() => compararRotaciones(['papa', 'coca'], catalogo, clima), /desconocido/);
});
