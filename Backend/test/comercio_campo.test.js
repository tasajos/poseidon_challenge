// Extremo a extremo (modo memoria): oferta sostenible, solicitudes mediadas e incidencias de campo con fotos.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PUERTO = 3918, CLAVE = 'clave-de-prueba-2';
const base = `http://127.0.0.1:${PUERTO}/api`;
const TEMP = mkdtempSync(path.join(tmpdir(), 'poseidon-campo-'));
let proceso;

async function pedir(ruta, { token, ...opciones } = {}) {
  const r = await fetch(base + ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
  });
  return { status: r.status, datos: await r.json() };
}
const ingresar = async (quien) => (await pedir('/auth/login', {
  method: 'POST', body: { email: `${quien}@poseidon.test`, password: CLAVE },
})).datos.token;

test.before(async () => {
  proceso = spawn(process.execPath, ['src/server.js'], {
    env: {
      ...process.env, PORT: PUERTO, DEMO_PASSWORD: CLAVE, DB_HOST: '127.0.0.1', DB_PORT: '1',
      BACKUP_DIR: path.join(TEMP, 'respaldos'), VAPID_FILE: path.join(TEMP, 'vapid.json'), FOTOS_DIR: path.join(TEMP, 'fotos'),
      ALERTAS_CADA_HORAS: '0', BACKUP_HORA: '', GOOGLE_DRIVE_CREDENTIALS: '', GOOGLE_DRIVE_FOLDER_ID: '',
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${base}/health`)).ok) return; } catch { /* aún arrancando */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('El servidor no arrancó');
});
test.after(() => { proceso.kill(); rmSync(TEMP, { recursive: true, force: true }); });

const TIQUIPAYA = { lat: -17.335, lon: -66.215 };

test('oferta sostenible y solicitudes mediadas (HU-CLI-02, HU-CLI-03)', async () => {
  const [comprador, cliente, operativo, admin] = await Promise.all(['comprador', 'cliente', 'operativo', 'admin'].map(ingresar));
  const login = await pedir('/auth/login', { method: 'POST', body: { email: 'comprador@poseidon.test', password: CLAVE } });
  assert.deepEqual(login.datos.usuario.permisos, ['comprar']);
  assert.equal((await pedir('/ofertas', { token: comprador })).datos.total, 0);
  assert.equal((await pedir('/ofertas', { token: cliente })).status, 403);
  assert.equal((await pedir('/mis-ofertas', { token: comprador })).status, 403);

  // El agricultor oferta un cultivo de una parcela evaluada
  const ev = await pedir('/evaluar', { method: 'POST', token: cliente, body: { nombre: 'Chacra alta', ...TIQUIPAYA, rotacion: ['papa', 'haba'] } });
  assert.equal(ev.status, 200);
  const mias = await pedir('/mis-ofertas', { token: cliente });
  assert.deepEqual(mias.datos.parcelas[0].cultivos.map((c) => c.codigo), ['papa', 'haba']);
  const ofertar = (body) => pedir('/ofertas', { method: 'POST', token: cliente, body });
  const cuerpo = { evaluacion_id: ev.datos.id, cultivo: 'haba', cantidad: 12.5, unidad: 'qq', disponible_desde: '2027-04', nota: 'Haba verde' };
  assert.equal((await ofertar({ ...cuerpo, cultivo: 'maiz' })).status, 400);
  assert.equal((await ofertar({ ...cuerpo, disponible_desde: 'abril' })).status, 400);
  assert.equal((await ofertar({ ...cuerpo, cantidad: -3 })).status, 400);
  assert.equal((await ofertar({ ...cuerpo, evaluacion_id: 999 })).status, 404);
  const nueva = await ofertar(cuerpo);
  assert.equal(nueva.status, 201);

  // El comprador la ve con prácticas e índice de agua, sin datos personales
  let lista = (await pedir('/ofertas', { token: comprador })).datos;
  assert.equal(lista.ofertas.length, 1);
  const o = lista.ofertas[0];
  assert.equal(o.zona, 'Tiquipaya');
  assert.equal(o.productor, 'Agricultor D.');
  assert.equal(o.practicas.leguminosa, true);
  assert.equal(o.verificada, false);
  assert.ok(['alta', 'media', 'baja'].includes(o.agua.nivel));
  assert.ok(!JSON.stringify(o).includes('@'), 'no expone correos');
  assert.equal(lista.opciones.zonas.Tiquipaya, 1);
  assert.equal((await pedir('/ofertas?cultivos=maiz', { token: comprador })).datos.ofertas.length, 0);
  assert.equal((await pedir('/ofertas?cultivos=haba&practicas=leguminosa,alterna_familias', { token: comprador })).datos.ofertas.length, 1);
  assert.equal((await pedir('/ofertas?verificada=1', { token: comprador })).datos.ofertas.length, 0);
  await pedir(`/evaluaciones/${ev.datos.id}/revision`, { method: 'PATCH', token: operativo, body: { nota: 'Rotación verificada en campo.' } });
  assert.equal((await pedir('/ofertas?verificada=1', { token: comprador })).datos.ofertas.length, 1);

  // Solicitud de compra
  const solicitar = (body) => pedir('/solicitudes', { method: 'POST', token: comprador, body });
  assert.equal((await solicitar({ oferta_id: o.id, tipo: 'compra', mensaje: 'Hola' })).status, 400);
  assert.equal((await solicitar({ oferta_id: o.id, tipo: 'compra', mensaje: 'Queremos comprar para la feria.' })).status, 400, 'compra sin cantidad');
  assert.equal((await solicitar({ oferta_id: o.id, tipo: 'regalo', mensaje: 'Queremos comprar para la feria.' })).status, 400);
  assert.equal((await pedir('/solicitudes', { method: 'POST', token: cliente, body: { oferta_id: o.id, tipo: 'contacto', mensaje: 'Mensaje de prueba' } })).status, 403);
  const s = await solicitar({ oferta_id: o.id, tipo: 'compra', cantidad: 10, mensaje: 'Queremos comprar para la feria de los sábados. <b>hola</b>' });
  assert.equal(s.status, 201);
  assert.equal((await solicitar({ oferta_id: o.id, tipo: 'contacto', mensaje: 'Otra vez, por si acaso.' })).status, 409);
  assert.equal((await pedir('/ofertas', { token: comprador })).datos.ofertas[0].solicitud_pendiente, true);

  let enviadas = (await pedir('/solicitudes/enviadas', { token: comprador })).datos;
  assert.equal(enviadas[0].estado, 'pendiente');
  assert.equal(enviadas[0].contacto, null);
  assert.equal(enviadas[0].productor, 'Agricultor D.');
  const recibidas = (await pedir('/solicitudes/recibidas', { token: cliente })).datos;
  assert.equal(recibidas[0].comprador, 'Cooperativa Demo');
  assert.equal(recibidas[0].contacto, null);
  assert.equal(recibidas[0].cultivo_nombre, 'Haba');

  // Solo el productor responde, una sola vez; al aceptar se comparten los datos de contacto
  const otro = { nombre: 'Otro Agricultor', email: 'otro@poseidon.test', password: 'clave-larga-9', rol: 'cliente' };
  await pedir('/usuarios', { method: 'POST', token: admin, body: otro });
  const tokenOtro = (await pedir('/auth/login', { method: 'POST', body: { email: otro.email, password: otro.password } })).datos.token;
  const responder = (token, body) => pedir(`/solicitudes/${s.datos.id}/respuesta`, { method: 'PATCH', token, body });
  assert.equal((await responder(tokenOtro, { estado: 'aceptada' })).status, 404);
  assert.equal((await responder(cliente, { estado: 'aceptada', telefono: '7000' })).status, 400);
  assert.equal((await responder(cliente, { estado: 'aceptada', respuesta: 'Con gusto, llámeme.', telefono: '+591 70000001' })).status, 200);
  assert.equal((await responder(cliente, { estado: 'rechazada' })).status, 409);
  enviadas = (await pedir('/solicitudes/enviadas', { token: comprador })).datos;
  assert.equal(enviadas[0].estado, 'aceptada');
  assert.deepEqual(enviadas[0].contacto, { email: 'cliente@poseidon.test', telefono: '+59170000001' });
  assert.equal(enviadas[0].productor, 'Agricultor Demo');
  assert.equal((await pedir('/solicitudes/recibidas', { token: cliente })).datos[0].contacto.email, 'comprador@poseidon.test');
  assert.equal((await pedir(`/solicitudes/${s.datos.id}/retirar`, { method: 'POST', token: comprador })).status, 409);

  // Nadie pausa la oferta de otro productor
  assert.equal((await pedir(`/ofertas/${o.id}`, { method: 'PATCH', token: tokenOtro, body: { activa: false } })).status, 404);
});

test('pausar la oferta la saca de la lista', async () => {
  const [comprador, cliente] = await Promise.all(['comprador', 'cliente'].map(ingresar));
  const { ofertas } = (await pedir('/mis-ofertas', { token: cliente })).datos;
  const id = ofertas[0].id;
  assert.equal((await pedir(`/ofertas/${id}`, { method: 'PATCH', token: cliente, body: { activa: 'no' } })).status, 400);
  assert.equal((await pedir(`/ofertas/${id}`, { method: 'PATCH', token: cliente, body: { activa: false } })).status, 200);
  assert.equal((await pedir('/ofertas', { token: comprador })).datos.ofertas.length, 0);
  const s = await pedir('/solicitudes', { method: 'POST', token: comprador, body: { oferta_id: id, tipo: 'contacto', mensaje: 'Sigue disponible su haba?' } });
  assert.equal(s.status, 404);
});

test('incidencias de campo con fotos y efecto en la rotación (HU-OPT-02)', async () => {
  const [operativo, cliente, monitoreo, comprador] = await Promise.all(['operativo', 'cliente', 'monitoreo', 'comprador'].map(ingresar));
  assert.equal((await pedir('/incidencias', { token: comprador })).status, 403);
  assert.equal((await pedir('/incidencias', { method: 'POST', token: cliente, body: {} })).status, 403);
  const inicio = (await pedir('/incidencias', { token: monitoreo })).datos;
  assert.equal(inicio.almacen_fotos.almacen, 'local');

  const registrar = (body) => pedir('/incidencias', { method: 'POST', token: operativo, body });
  const cuerpo = { tipo: 'plaga', agente: 'gorgojo de los Andes', cultivo: 'papa', severidad: 'alta', lat: -17.3361, lon: -66.2149, precision_m: 6, nota: 'Galerías en tubérculos' };
  assert.equal((await registrar({ ...cuerpo, tipo: 'virus' })).status, 400);
  assert.equal((await registrar({ ...cuerpo, lat: 200 })).status, 400);
  assert.equal((await registrar({ ...cuerpo, agente: '' })).status, 400);
  assert.equal((await registrar({ ...cuerpo, cultivo: 'coca' })).status, 400);
  const inc = await registrar(cuerpo);
  assert.equal(inc.status, 201);

  // Fotos: se valida el contenido, no la cabecera
  const subir = (cuerpoFoto, tipo, token = operativo) => fetch(`${base}/incidencias/${inc.datos.id}/fotos`, {
    method: 'POST', headers: { 'Content-Type': tipo, Authorization: `Bearer ${token}` }, body: cuerpoFoto,
  });
  assert.equal((await subir(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/png')).status, 400);
  assert.equal((await subir(Buffer.alloc(9 * 1024 * 1024, 1), 'image/jpeg')).status, 413);
  assert.equal((await subir(Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg', cliente)).status, 403);
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)]);
  const subida = await subir(png, 'image/png');
  assert.equal(subida.status, 201);
  const foto = await subida.json();
  assert.equal(foto.almacen, 'local');
  assert.equal(readdirSync(path.join(TEMP, 'fotos')).length, 1);

  const lista = (await pedir('/incidencias', { token: operativo })).datos.incidencias;
  assert.equal(lista[0].fotos.length, 1);
  assert.equal(lista[0].tecnico, 'Técnico Demo');
  const ver = (token) => fetch(`${base}/incidencias/${inc.datos.id}/fotos/${foto.id}`, { headers: { Authorization: `Bearer ${token}` } });
  const r = await ver(monitoreo);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/png');
  assert.ok(Buffer.from(await r.arrayBuffer()).equals(png));
  assert.equal((await ver(comprador)).status, 403);
  assert.equal((await fetch(`${base}/incidencias/999/fotos/${foto.id}`, { headers: { Authorization: `Bearer ${operativo}` } })).status, 404);

  // La evaluación de una parcela cercana recibe la presión de la plaga; una lejana no
  const evaluar = (lugar) => pedir('/evaluar', { method: 'POST', token: cliente, body: { ...lugar, rotacion: ['papa', 'maiz'], prioridades: { agua: 5 } } });
  const cerca = (await evaluar(TIQUIPAYA)).datos;
  assert.equal(cerca.plagas[0].familia, 'Solanáceas');
  assert.ok(cerca.estrategias[0].riesgos.some((t) => t.includes('gorgojo de los Andes')));
  assert.deepEqual((await evaluar({ lat: -17.6, lon: -65.9 })).datos.plagas, []);

  const tablero = (await pedir('/monitoreo', { token: monitoreo })).datos;
  assert.equal(tablero.totales.incidencias, 1);
  assert.ok(tablero.alertas.some((a) => a.tipo === 'plaga'));

  // Controlada: deja de influir en la rotación
  assert.equal((await pedir(`/incidencias/${inc.datos.id}`, { method: 'PATCH', token: operativo, body: { estado: 'controlada' } })).status, 200);
  assert.deepEqual((await evaluar(TIQUIPAYA)).datos.plagas, []);
});
