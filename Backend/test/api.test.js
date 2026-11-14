// Prueba de extremo a extremo de la API en modo memoria (sin MySQL).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const PUERTO = 3917, CLAVE = 'clave-de-prueba-1';
const base = `http://127.0.0.1:${PUERTO}/api`;
let proceso;

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
    env: { ...process.env, PORT: PUERTO, DEMO_PASSWORD: CLAVE, DB_HOST: '127.0.0.1', DB_PORT: '1' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${base}/health`)).ok) return; } catch { /* aún arrancando */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('El servidor no arrancó');
});
test.after(() => proceso.kill());

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
