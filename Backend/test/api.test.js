// Prueba de extremo a extremo de la API en modo memoria (sin MySQL).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PUERTO = 3917, CLAVE = 'clave-de-prueba-1';
const base = `http://127.0.0.1:${PUERTO}/api`;
let proceso;
const TEMP = mkdtempSync(path.join(tmpdir(), 'poseidon-test-'));

async function pedir(ruta, { token, ...opciones } = {}) {
  const r = await fetch(base + ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
  });
  return { status: r.status, datos: await r.json() };
}
const ingresar = async (rol) => (await pedir('/auth/login', {
  method: 'POST', body: { email: `${rol}@poseidon.test`, password: CLAVE },
})).datos.token;

test.before(async () => {
  proceso = spawn(process.execPath, ['src/server.js'], {
    env: {
      ...process.env, PORT: PUERTO, DEMO_PASSWORD: CLAVE, DB_HOST: '127.0.0.1', DB_PORT: '1',
      BACKUP_DIR: path.join(TEMP, 'respaldos'), VAPID_FILE: path.join(TEMP, 'vapid.json'), ALERTAS_CADA_HORAS: '0',
      TWILIO_ACCOUNT_SID: '', TWILIO_AUTH_TOKEN: '', TWILIO_FROM: '',
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

test('rechaza clave incorrecta y peticiones sin sesión', async () => {
  const mal = await pedir('/auth/login', { method: 'POST', body: { email: 'admin@poseidon.test', password: 'otra' } });
  assert.equal(mal.status, 401);
  assert.equal((await pedir('/cultivos')).status, 401);
});

test('flujo completo: cliente evalúa, operativo revisa, monitoreo observa', async () => {
  const cliente = await ingresar('cliente'), operativo = await ingresar('operativo');
  const monitoreo = await ingresar('monitoreo'), admin = await ingresar('admin');
  assert.ok(cliente && operativo && monitoreo && admin);

  const cuerpo = { nombre: 'Chacra', lat: -17.39, lon: -66.15, rotacion: ['papa', 'maiz'], prioridades: { agua: 5 } };
  const ev = await pedir('/evaluar', { method: 'POST', token: cliente, body: cuerpo });
  assert.equal(ev.status, 200);
  assert.equal(ev.datos.estrategias.length, 3);

  // Monitoreo es solo lectura
  assert.equal((await pedir('/evaluar', { method: 'POST', token: monitoreo, body: cuerpo })).status, 403);
  assert.equal((await pedir(`/evaluaciones/${ev.datos.id}/revision`, { method: 'PATCH', token: monitoreo, body: { nota: 'x' } })).status, 403);
  // El cliente no revisa ni administra
  assert.equal((await pedir(`/evaluaciones/${ev.datos.id}/revision`, { method: 'PATCH', token: cliente, body: { nota: 'x' } })).status, 403);
  assert.equal((await pedir('/usuarios', { token: cliente })).status, 403);
  assert.equal((await pedir('/monitoreo', { token: cliente })).status, 403);

  const rev = await pedir(`/evaluaciones/${ev.datos.id}/revision`, { method: 'PATCH', token: operativo, body: { nota: 'Probar haba en media parcela.' } });
  assert.equal(rev.status, 200);
  const lista = await pedir('/evaluaciones', { token: cliente });
  assert.equal(lista.datos[0].estado, 'revisada');
  assert.equal(lista.datos[0].revisor, 'Técnico Demo');
  assert.equal(lista.datos[0].resultado, undefined);

  const tablero = await pedir('/monitoreo', { token: monitoreo });
  assert.equal(tablero.datos.totales.evaluaciones, 1);
  assert.equal(tablero.datos.base_datos, 'memoria');
});

test('un cliente no ve evaluaciones de otro', async () => {
  const admin = await ingresar('admin');
  const nuevo = { nombre: 'Otra', email: 'otra@poseidon.test', password: 'clave-larga-2', rol: 'cliente' };
  assert.equal((await pedir('/usuarios', { method: 'POST', token: admin, body: nuevo })).status, 201);
  assert.equal((await pedir('/usuarios', { method: 'POST', token: admin, body: nuevo })).status, 409);
  const otra = (await pedir('/auth/login', { method: 'POST', body: { email: nuevo.email, password: nuevo.password } })).datos.token;
  assert.deepEqual((await pedir('/evaluaciones', { token: otra })).datos, []);
  assert.equal((await pedir('/evaluaciones/1', { token: otra })).status, 404);
});

test('RBAC: el ingreso trae los permisos y el administrador los cambia con efecto inmediato', async () => {
  const login = await pedir('/auth/login', { method: 'POST', body: { email: 'cliente@poseidon.test', password: CLAVE } });
  assert.deepEqual(login.datos.usuario.permisos, ['alertas', 'evaluar']);

  const admin = await ingresar('admin'), monitoreo = await ingresar('monitoreo'), cliente = await ingresar('cliente');
  assert.equal((await pedir('/permisos', { token: cliente })).status, 403);
  const { datos } = await pedir('/permisos', { token: admin });
  assert.ok(datos.catalogo.reportes && datos.matriz.monitoreo.includes('reportes'));

  // Quitar "reportes" a monitoreo cierra el tablero regional sin volver a ingresar
  const sinReportes = datos.matriz.monitoreo.filter((p) => p !== 'reportes');
  assert.equal((await pedir('/permisos/monitoreo', { method: 'PUT', token: admin, body: { permisos: sinReportes } })).status, 200);
  assert.equal((await pedir('/monitoreo', { token: monitoreo })).status, 403);
  assert.ok(!(await pedir('/auth/yo', { token: monitoreo })).datos.permisos.includes('reportes'));
  await pedir('/permisos/monitoreo', { method: 'PUT', token: admin, body: { permisos: datos.matriz.monitoreo } });
  assert.equal((await pedir('/monitoreo', { token: monitoreo })).status, 200);

  // Sin "ver_todas" un rol solo ve sus propias parcelas
  const sinVerTodas = datos.matriz.monitoreo.filter((p) => p !== 'ver_todas');
  await pedir('/permisos/monitoreo', { method: 'PUT', token: admin, body: { permisos: sinVerTodas } });
  assert.deepEqual((await pedir('/evaluaciones', { token: monitoreo })).datos, []);
  assert.equal((await pedir('/evaluaciones/1', { token: monitoreo })).status, 404);
  await pedir('/permisos/monitoreo', { method: 'PUT', token: admin, body: { permisos: datos.matriz.monitoreo } });

  // El administrador nunca pierde la gestión de usuarios; permisos desconocidos se rechazan
  const fijo = await pedir('/permisos/administrador', { method: 'PUT', token: admin, body: { permisos: [] } });
  assert.deepEqual(fijo.datos.permisos, ['usuarios']);
  assert.equal((await pedir('/usuarios', { token: admin })).status, 200);
  assert.equal((await pedir('/respaldos', { token: admin })).status, 403);
  await pedir('/permisos/administrador', { method: 'PUT', token: admin, body: { permisos: datos.matriz.administrador } });
  assert.equal((await pedir('/permisos/cliente', { method: 'PUT', token: admin, body: { permisos: ['volar'] } })).status, 400);
  assert.equal((await pedir('/permisos/nadie', { method: 'PUT', token: admin, body: { permisos: [] } })).status, 404);
});

test('alertas: preferencias por tipo, teléfono validado y alerta de prueba', async () => {
  const cliente = await ingresar('cliente'), admin = await ingresar('admin');
  assert.equal((await pedir('/alertas', { token: admin })).status, 403); // el administrador no tiene "alertas" por defecto

  const inicio = await pedir('/alertas', { token: cliente });
  assert.equal(inicio.status, 200);
  assert.deepEqual(inicio.datos.preferencias, { helada: true, sequia: true, web: true, sms: false, telefono: null });
  assert.ok(inicio.datos.clave_push.length > 40);
  assert.equal(inicio.datos.sms_configurado, false);

  const put = (body) => pedir('/alertas/preferencias', { method: 'PUT', token: cliente, body });
  assert.equal((await put({ helada: true, sequia: false, web: true, sms: true, telefono: '70000000' })).status, 400);
  assert.equal((await put({ helada: true, sequia: false, web: true, sms: true })).status, 400);
  assert.equal((await put({ helada: true, sequia: false, web: true, sms: true, telefono: '+591 7000-0000' })).status, 200);
  assert.equal((await pedir('/alertas', { token: cliente })).datos.preferencias.telefono, '+59170000000');

  const prueba = await pedir('/alertas/prueba', { method: 'POST', token: cliente });
  assert.deepEqual(prueba.datos.canales.map((c) => [c.canal, c.estado]), [['web', 'sin-dispositivo'], ['sms', 'simulado']]);
  assert.equal((await pedir('/alertas', { token: cliente })).datos.historial[0].tipo, 'prueba');

  const sub = (endpoint) => pedir('/alertas/suscripcion', { method: 'POST', token: cliente, body: { endpoint, keys: { p256dh: 'x', auth: 'y' } } });
  assert.equal((await sub('https://intranet.local/robar')).status, 400);
  assert.equal((await sub('http://fcm.googleapis.com/fcm/send/abc')).status, 400);
  assert.equal((await sub('https://fcm.googleapis.com/fcm/send/abc')).status, 201);
  assert.equal((await pedir('/alertas', { token: cliente })).datos.dispositivos, 1);
});

test('el administrador gestiona usuarios y un usuario desactivado pierde el acceso', async () => {
  const admin = await ingresar('admin');
  const usuarios = (await pedir('/usuarios', { token: admin })).datos;
  assert.ok(usuarios.every((u) => u.password_hash === undefined));
  const mon = usuarios.find((u) => u.rol === 'monitoreo');
  const token = await ingresar('monitoreo');
  assert.equal((await pedir(`/usuarios/${mon.id}`, { method: 'PATCH', token: admin, body: { activo: false } })).status, 200);
  assert.equal((await pedir('/monitoreo', { token })).status, 401);
  const yo = usuarios.find((u) => u.rol === 'administrador');
  assert.equal((await pedir(`/usuarios/${yo.id}`, { method: 'PATCH', token: admin, body: { activo: false } })).status, 400);
});

test('respaldos: diario al arrancar, manual y restauración segura', async () => {
  const admin = await ingresar('admin'), cliente = await ingresar('cliente');
  assert.equal((await pedir('/respaldos', { token: cliente })).status, 403);

  const inicial = (await pedir('/respaldos', { token: admin })).datos;
  assert.equal(inicial.estado.activo, true);
  assert.ok(inicial.estado.proxima);
  assert.ok(inicial.respaldos.some((r) => r.tipo === 'auto' && r.valido), 'debe existir el respaldo automático del arranque');

  const manual = await pedir('/respaldos', { method: 'POST', token: admin });
  assert.equal(manual.status, 201);
  assert.ok(manual.datos.conteos.usuarios >= 4);

  // Cambios posteriores al respaldo
  const nuevo = { nombre: 'Temporal', email: 'temporal@poseidon.test', password: 'clave-larga-3', rol: 'cliente' };
  assert.equal((await pedir('/usuarios', { method: 'POST', token: admin, body: nuevo })).status, 201);

  const restaurar = (nombre, confirmacion) => pedir(`/respaldos/${nombre}/restaurar`, { method: 'POST', token: admin, body: { confirmacion } });
  assert.equal((await restaurar(manual.datos.nombre, 'otro')).status, 400);
  assert.equal((await restaurar('..%2F..%2Fpackage.json', '../../package.json')).status, 400);
  assert.equal((await restaurar('manual-20000101-000000.json', 'manual-20000101-000000.json')).status, 404);

  const r = await restaurar(manual.datos.nombre, manual.datos.nombre);
  assert.equal(r.status, 200);
  assert.match(r.datos.previo, /^previo-/);
  const usuarios = (await pedir('/usuarios', { token: admin })).datos;
  assert.ok(!usuarios.some((u) => u.email === nuevo.email), 'la restauración vuelve al punto anterior');
  assert.equal((await pedir('/evaluaciones', { token: admin })).datos.length, 1);

  // Se puede deshacer restaurando el respaldo "previo"
  assert.equal((await restaurar(r.datos.previo, r.datos.previo)).status, 200);
  assert.ok((await pedir('/usuarios', { token: admin })).datos.some((u) => u.email === nuevo.email));
  assert.ok(readdirSync(path.join(TEMP, 'respaldos')).length >= 4);
});
