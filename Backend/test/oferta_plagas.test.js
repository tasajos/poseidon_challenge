// Funciones puras de HU-CLI-02 (oferta sostenible) y HU-OPT-02 (plagas), sin red ni base de datos.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { indicadoresMensuales } from '../src/clima.js';
import { compararRotaciones } from '../src/rotacion.js';
import { presionDePlagas } from '../src/plagas.js';
import { vistaOferta, filtrarOfertas, abreviar, nivelAgua } from '../src/ofertas.js';
import { zonaDe, distanciaKm, OTRA_ZONA } from '../src/geo.js';
import { tipoImagen } from '../src/fotos.js';

const leer = async (ruta) => JSON.parse(await readFile(new URL(ruta, import.meta.url), 'utf8'));
const catalogo = await leer('../../Database/cultivos.json');
const clima = indicadoresMensuales(-17.39, await leer('../src/data/clima_demo.json'));
const porCodigo = new Map(catalogo.map((c) => [c.codigo, c]));

// ---------- Geografía ----------
test('distancia y zona aproximada', () => {
  assert.ok(Math.abs(distanciaKm(-17.3895, -66.1568, -17.3922, -66.2786) - 12.9) < 0.5, 'Cercado-Quillacollo ~13 km');
  assert.equal(zonaDe(-17.34, -66.22), 'Tiquipaya');
  assert.equal(zonaDe(-16.5, -68.15), OTRA_ZONA); // La Paz
});

// ---------- Plagas ----------
const ahora = Date.parse('2026-11-14T12:00:00Z');
const inc = (extra) => ({
  tipo: 'plaga', estado: 'activa', cultivo: 'papa', agente: 'gorgojo de los Andes', severidad: 'alta',
  lat: -17.39, lon: -66.16, creado_en: new Date(ahora - 10 * 864e5), ...extra,
});

test('presión de plagas: solo reportes activos, cercanos, recientes y de plaga o enfermedad', () => {
  const p = presionDePlagas([
    inc(),
    inc({ agente: 'polilla de la papa', severidad: 'media', lat: -17.41 }),       // ~2.2 km
    inc({ lat: -17.6 }),                                                          // ~23 km: no cuenta
    inc({ estado: 'controlada' }),
    inc({ creado_en: new Date(ahora - 400 * 864e5) }),                            // vencido
    inc({ tipo: 'deficiencia', agente: 'falta de nitrógeno' }),
    inc({ cultivo: null }),
    inc({ cultivo: 'maiz', agente: 'gusano cogollero', severidad: 'baja' }),
  ], -17.39, -66.16, catalogo, ahora);
  assert.deepEqual(p.map((x) => x.familia), ['Solanáceas', 'Gramíneas']);
  assert.equal(p[0].reportes, 2);
  assert.deepEqual(p[0].agentes, ['gorgojo de los Andes', 'polilla de la papa']);
  assert.equal(p[0].presion, 1);           // 1 + 0.6·0.78 → tope 1
  assert.equal(p[0].distancia_km, 0);
  assert.equal(p[1].presion, 0.3);
});

test('las plagas cercanas castigan la familia atacada y cambian la recomendación', () => {
  const plagas = [{ familia: 'Solanáceas', presion: 1, agentes: ['gorgojo de los Andes'], reportes: 3, distancia_km: 1.2 }];
  const sin = compararRotaciones(['papa', 'maiz'], catalogo, clima, { agua: 5 });
  const con = compararRotaciones(['papa', 'maiz'], catalogo, clima, { agua: 5 }, plagas);
  assert.ok(con[0].puntaje < sin[0].puntaje);
  assert.ok(con[0].puntajes.suelo < sin[0].puntajes.suelo);
  assert.equal(con[0].evidencia.plagas[0].familia, 'Solanáceas');
  assert.ok(con[0].riesgos.some((r) => r.includes('gorgojo de los Andes')));
  assert.ok(sin[1].cultivos.includes('papa'), 'sin plagas el ajuste conserva la papa');
  assert.ok(!con[1].cultivos.includes('papa'), 'con plagas el ajuste deja la papa');
  assert.ok(con[1].porque.some((t) => t.includes('Corta el ciclo de plagas')));
  // Sin plagas reportadas el resultado no cambia
  assert.deepEqual(compararRotaciones(['papa', 'maiz'], catalogo, clima, { agua: 5 }, []), sin);
});

test('repetir la familia atacada dos campañas seguidas castiga más', () => {
  const plagas = [{ familia: 'Gramíneas', presion: 1, agentes: ['roya'], reportes: 1, distancia_km: 2 }];
  const seguidas = compararRotaciones(['papa', 'maiz', 'trigo'], catalogo, clima, {}, plagas)[0];
  const alternada = compararRotaciones(['maiz', 'papa', 'haba'], catalogo, clima, {}, plagas)[0];
  assert.equal(seguidas.evidencia.plagas[0].seguidas, true);
  assert.equal(alternada.evidencia.plagas[0].seguidas, false);
  assert.ok(seguidas.riesgos.some((r) => r.includes('dos campañas seguidas')));
});

// ---------- Oferta sostenible ----------
function oferta(rotacion, extra = {}) {
  const [actual] = compararRotaciones(rotacion, catalogo, clima, {});
  return vistaOferta({
    id: extra.id ?? 1, usuario_id: 3, cultivo: rotacion[0], cantidad: '20.00', unidad: 'qq', disponible_desde: '2027-03',
    nota: null, creado_en: new Date(), productor: 'Agricultor Demo', lat: -17.3401, lon: -66.2207,
    resultado: [actual], estado_evaluacion: 'pendiente', ...extra,
  }, porCodigo);
}

test('la vista de oferta calcula prácticas y agua sin exponer datos del productor', () => {
  const o = oferta(['papa', 'haba', 'maiz'], { estado_evaluacion: 'revisada' });
  assert.equal(o.productor, 'Agricultor D.');
  assert.equal(o.zona, 'Tiquipaya');
  assert.notEqual(o.lat, -17.3401, 'la ubicación se aproxima');
  assert.equal(o.verificada, true);
  assert.equal(o.practicas.leguminosa, true);
  assert.equal(o.practicas.alterna_familias, true);
  assert.equal(o.practicas.raiz_profunda, true);
  assert.equal(o.cantidad, 20);
  assert.ok(o.agua.indice >= 0 && o.agua.indice <= 100);
  assert.equal(o.agua.nivel, nivelAgua(o.agua.indice));
  assert.ok(o.agua.riego_mm >= 0 && o.agua.lluvia_pct >= 0 && o.agua.lluvia_pct <= 100);
  for (const k of ['usuario_id', 'parcela', 'email', 'resultado']) assert.equal(o[k], undefined, k);
});

test('filtros por cultivo, prácticas, verificación, agua y zona', () => {
  const a = oferta(['papa', 'haba'], { id: 1, estado_evaluacion: 'revisada' });
  const b = oferta(['maiz', 'trigo'], { id: 2 });   // repite gramíneas, sin leguminosa
  const c = oferta(['quinua', 'tarwi'], { id: 3, lat: -17.54, lon: -65.84 });
  const todas = [a, b, c];
  assert.deepEqual(filtrarOfertas(todas, { cultivos: ['maiz'] }).map((o) => o.id), [2]);
  assert.deepEqual(filtrarOfertas(todas, { practicas: ['leguminosa', 'alterna_familias'] }).map((o) => o.id).sort(), [1, 3]);
  assert.deepEqual(filtrarOfertas(todas, { verificada: true }).map((o) => o.id), [1]);
  assert.deepEqual(filtrarOfertas(todas, { zona: 'Punata' }).map((o) => o.id), [3]);
  const alta = filtrarOfertas(todas, { agua: 'alta' });
  assert.ok(alta.every((o) => o.agua.indice >= 70));
  const orden = filtrarOfertas(todas, {});
  assert.ok(orden.every((o, i) => i === 0 || orden[i - 1].agua.indice >= o.agua.indice), 'ordena por uso eficiente del agua');
});

test('abreviar el nombre del productor', () => {
  assert.equal(abreviar('Juana Mamani Quispe'), 'Juana Q.');
  assert.equal(abreviar('Rosa'), 'Rosa');
});

// ---------- Fotos ----------
test('el tipo de imagen se reconoce por su contenido', () => {
  const relleno = Buffer.alloc(16);
  assert.equal(tipoImagen(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), relleno])), 'image/jpeg');
  assert.equal(tipoImagen(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), relleno])), 'image/png');
  assert.equal(tipoImagen(Buffer.from('RIFF\0\0\0\0WEBPVP8 ' + '\0'.repeat(8), 'binary')), 'image/webp');
  assert.equal(tipoImagen(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
  assert.equal(tipoImagen(Buffer.from('GIF89a' + '\0'.repeat(10))), null);
});
