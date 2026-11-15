// Extremo a extremo (modo memoria): registro con aprobación, parcelas, historial, asistencia técnica y monitoreo regional.
// Los servicios de elevación (SRTM) y NDVI (MODIS) se simulan con un servidor local.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PUERTO = 3919, PUERTO_NASA = 3920, CLAVE = 'clave-de-prueba-3';
const base = `http://127.0.0.1:${PUERTO}/api`;
const TEMP = mkdtempSync(path.join(tmpdir(), 'poseidon-regional-'));
let proceso, nasa;

async function pedir(ruta, { token, ...opciones } = {}) {
  const r = await fetch(base + ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
  });
  const tipo = r.headers.get('content-type') || '';
  return { status: r.status, tipo, cabeceras: r.headers, datos: tipo.includes('json') ? await r.json() : await r.text() };
}
// El backend limita los ingresos por IP (20 cada 15 minutos): los ingresos correctos se reutilizan.
const sesiones = new Map();
async function entrar(email, password = CLAVE) {
  const clave = email + ' ' + password;
  if (sesiones.has(clave)) return sesiones.get(clave);
  const r = await pedir('/auth/login', { method: 'POST', body: { email, password } });
  if (r.status === 200) sesiones.set(clave, r);
  return r;
}
const ingresar = async (quien) => (await entrar(`${quien}@poseidon.test`)).datos.token;
const esperar = async (fn, ms = 8000) => {
  for (const fin = Date.now() + ms; Date.now() < fin;) {
    const r = await fn();
    if (r) return r;
    await new Promise((ok) => setTimeout(ok, 150));
  }
  throw new Error('La condición esperada no se cumplió a tiempo');
};

// Ladera de 20 % hacia el norte al oeste de -66; terreno plano al este. NDVI: verde en la época húmeda
// (mejora cada año) y suelo desnudo en la seca.
function servicioNasa(req, res) {
  const url = new URL(req.url, 'http://x');
  res.setHeader('Content-Type', 'application/json');
  if (url.pathname === '/srtm') {
    const results = url.searchParams.get('locations').split('|').map((p) => {
      const [lat, lon] = p.split(',').map(Number);
      return { elevation: lon < -66 ? 2600 + (lat + 17.335) * 110574 * 0.2 : 2700, location: { lat, lng: lon } };
    });
    return res.end(JSON.stringify({ results, status: 'OK' }));
  }
  const inicio = url.searchParams.get('startDate');
  const anio = Number(inicio.slice(1, 5)), humeda = Number(inicio.slice(5)) < 100;
  const fechas = humeda ? [`${anio}-01-17`, `${anio}-02-02`] : [`${anio}-07-28`, `${anio}-08-13`];
  res.end(JSON.stringify({ scale: '0.0001', subset: fechas.map((f) => ({ calendar_date: f, data: [humeda ? 5000 + (anio - 2020) * 300 : 1500] })) }));
}

test.before(async () => {
  nasa = createServer(servicioNasa).listen(PUERTO_NASA, '127.0.0.1');
  proceso = spawn(process.execPath, ['src/server.js'], {
    env: {
      ...process.env, PORT: PUERTO, DEMO_PASSWORD: CLAVE, DB_HOST: '127.0.0.1', DB_PORT: '1',
      BACKUP_DIR: path.join(TEMP, 'respaldos'), VAPID_FILE: path.join(TEMP, 'vapid.json'), FOTOS_DIR: path.join(TEMP, 'fotos'),
      ALERTAS_CADA_HORAS: '0', BACKUP_HORA: '', GOOGLE_DRIVE_CREDENTIALS: '', GOOGLE_DRIVE_FOLDER_ID: '',
      ELEVACION_URL: `http://127.0.0.1:${PUERTO_NASA}/srtm`, NDVI_URL: `http://127.0.0.1:${PUERTO_NASA}/ndvi`, NDVI_ANIOS: '3',
      GAMC_WMS_URL: '', GAMC_WMS_CAPAS: '', DISTRITOS_GEOJSON: path.join(TEMP, 'no-existe.geojson'),
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${base}/health`)).ok) return; } catch { /* aún arrancando */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('El servidor no arrancó');
});
test.after(() => { proceso.kill(); nasa.close(); rmSync(TEMP, { recursive: true, force: true }); });

const d = 0.001;
const PERIMETRO = [[-17.335, -66.215], [-17.335 + d, -66.215], [-17.335 + d, -66.215 + d], [-17.335, -66.215 + d]];
const crearUsuario = (admin, body) => pedir('/usuarios', { method: 'POST', token: admin, body });

test('HU-ADM-01: registro con validación, cuentas con privilegios pendientes y auditoría sin credenciales', async () => {
  const admin = await ingresar('admin'), cliente = await ingresar('cliente');
  const nuevo = { nombre: 'Rosa Quispe', email: 'rosa@poseidon.test', password: 'secreto-rosa-1', rol: 'cliente', telefono: '+591 71111111' };
  const sinNombre = await crearUsuario(admin, { ...nuevo, nombre: ' ' });
  assert.deepEqual([sinNombre.status, sinNombre.datos.campo], [400, 'nombre']);
  assert.equal((await crearUsuario(admin, { ...nuevo, email: 'rosa' })).datos.campo, 'email');
  assert.equal((await crearUsuario(admin, { ...nuevo, telefono: '123' })).datos.campo, 'telefono');
  assert.equal((await crearUsuario(admin, { ...nuevo, rol: 'jefe' })).datos.campo, 'rol');
  assert.equal((await crearUsuario(cliente, nuevo)).status, 403);

  // Agricultor: habilitado de inmediato. Identificador repetido: error claro.
  const rosa = await crearUsuario(admin, nuevo);
  assert.deepEqual([rosa.status, rosa.datos.pendiente], [201, false]);
  assert.match(rosa.datos.mensaje, /registrada y habilitada/);
  assert.equal((await entrar(nuevo.email, nuevo.password)).status, 200);
  const repetido = await crearUsuario(admin, { ...nuevo, email: 'ROSA@poseidon.test' });
  assert.deepEqual([repetido.status, repetido.datos.campo], [409, 'email']);

  // Técnico: pendiente hasta que un responsable lo aprueba
  const tec = { nombre: 'Técnico Dos', email: 'tecnico2@poseidon.test', password: 'secreto-tecnico-2', rol: 'operativo' };
  const t = await crearUsuario(admin, tec);
  assert.equal(t.datos.pendiente, true);
  const bloqueado = await entrar(tec.email, tec.password);
  assert.equal(bloqueado.status, 403);
  assert.match(bloqueado.datos.error, /pendiente de aprobación/);
  assert.equal((await entrar(tec.email, 'otra-clave')).status, 401, 'sin la contraseña no se revela que la cuenta existe');
  assert.equal((await pedir(`/usuarios/${t.datos.id}`, { method: 'PATCH', token: admin, body: { activo: true } })).status, 400);
  const aprobar = (token, id, si = true) => pedir(`/usuarios/${id}/aprobacion`, { method: 'POST', token, body: { aprobar: si } });
  assert.equal((await aprobar(cliente, t.datos.id)).status, 403);
  assert.equal((await aprobar(admin, t.datos.id)).status, 200, 'único administrador: puede aprobar, y queda anotado');
  assert.equal((await aprobar(admin, t.datos.id)).status, 404);
  assert.equal((await entrar(tec.email, tec.password)).status, 200);

  // Con dos administradores, quien registra no aprueba (doble control)
  const adm2 = { nombre: 'Admin Dos', email: 'admin2@poseidon.test', password: 'secreto-admin-2', rol: 'administrador' };
  const a2 = await crearUsuario(admin, adm2);
  await aprobar(admin, a2.datos.id);
  const admin2 = (await entrar(adm2.email, adm2.password)).datos.token;
  const gestor = await crearUsuario(admin, { nombre: 'Gestora', email: 'gestora@poseidon.test', password: 'secreto-gestora', rol: 'monitoreo' });
  assert.equal((await aprobar(admin, gestor.datos.id)).status, 403);
  assert.equal((await aprobar(admin2, gestor.datos.id)).status, 200);
  // Rechazo: la cuenta no entra
  const no = await crearUsuario(admin, { nombre: 'No Va', email: 'nova@poseidon.test', password: 'secreto-no-va-1', rol: 'operativo' });
  assert.equal((await aprobar(admin2, no.datos.id, false)).status, 200);
  assert.equal((await entrar('nova@poseidon.test', 'secreto-no-va-1')).status, 401);
  // Subir a un agricultor a técnico lo deja pendiente
  const subir = await pedir(`/usuarios/${rosa.datos.id}`, { method: 'PATCH', token: admin, body: { rol: 'operativo' } });
  assert.equal(subir.datos.pendiente, true);
  assert.equal((await pedir('/auth/login', { method: 'POST', body: { email: nuevo.email, password: nuevo.password } })).status, 403);
  await pedir(`/usuarios/${rosa.datos.id}/aprobacion`, { method: 'POST', token: admin2, body: { aprobar: false } });
  await pedir(`/usuarios/${a2.datos.id}`, { method: 'PATCH', token: admin, body: { activo: false } }); // vuelve a haber un solo administrador

  const auditoria = await pedir('/auditoria', { token: admin });
  const acciones = auditoria.datos.map((x) => x.accion);
  for (const a of ['usuario.registrado', 'usuario.aprobado', 'usuario.rechazado', 'usuario.rol', 'usuario.desactivado']) assert.ok(acciones.includes(a), a);
  assert.ok(auditoria.datos.some((x) => x.accion === 'usuario.aprobado' && x.detalle.aviso), 'la aprobación sin segundo responsable queda señalada');
  const texto = JSON.stringify(auditoria.datos);
  for (const secreto of ['secreto-', 'password', 'hash']) assert.ok(!texto.includes(secreto), `la auditoría no expone "${secreto}"`);
  assert.equal((await pedir('/auditoria', { token: cliente })).status, 403);
  assert.ok((await pedir('/usuarios', { token: admin })).datos.every((u) => u.password_hash === undefined));
});

let parcelaId, evaluacionId;

test('HU-USR-01, 02, 05 y 06: parcela con perímetro, terreno, historial y resumen ligero', async () => {
  const cliente = await ingresar('cliente'), comprador = await ingresar('comprador');
  const registro = { nombre: 'Ladera de Tiquipaya', perimetro: PERIMETRO, cultivo_actual: 'papa', etapa: 'floracion', riego: 'temporal' };
  assert.equal((await pedir('/parcelas', { method: 'POST', token: cliente, body: { nombre: 'x', lat: 123, lon: 5 } })).status, 400);
  assert.equal((await pedir('/parcelas', { method: 'POST', token: comprador, body: registro })).status, 403);

  // Resumen para confirmar antes de guardar: no crea nada
  const previa = await pedir('/parcelas?validar=1', { method: 'POST', token: cliente, body: registro });
  assert.equal(previa.status, 200);
  assert.equal(previa.datos.resumen.zona, 'Tiquipaya');
  assert.ok(previa.datos.resumen.superficie_ha > 1 && previa.datos.resumen.superficie_ha < 1.3);
  assert.equal(previa.datos.resumen.cultivo_nombre, 'Papa');
  assert.equal((await pedir('/parcelas', { token: cliente })).datos.parcelas.length, 0);

  const alta = await pedir('/parcelas', { method: 'POST', token: cliente, body: registro });
  assert.equal(alta.status, 201);
  parcelaId = alta.datos.id;
  assert.equal(alta.datos.codigo, 'PAR-00001');
  assert.match(alta.datos.nota, /no miden su parcela con precisión de campo/);
  assert.equal(alta.datos.parcela.tecnico, 'Técnico Demo', 'se asigna al técnico con menos parcelas');
  assert.ok(Math.abs(alta.datos.parcela.pendiente_pct - 20) < 0.5, `pendiente=${alta.datos.parcela.pendiente_pct}`);
  assert.equal(alta.datos.parcela.erosion, 'alto');

  // Lo desconocido queda como no disponible; se puede corregir después
  const simple = await pedir('/parcelas', { method: 'POST', token: cliente, body: { nombre: 'Pampa', lat: -17.54, lon: -65.84 } });
  assert.deepEqual([simple.datos.parcela.cultivo_actual, simple.datos.parcela.superficie_ha, simple.datos.parcela.erosion], [null, null, 'bajo']);
  assert.equal((await pedir(`/parcelas/${simple.datos.id}`, { method: 'PATCH', token: cliente, body: { superficie_ha: 3.5, riego: 'sin_riego' } })).status, 200);
  assert.equal((await pedir(`/parcelas/${simple.datos.id}`, { method: 'PATCH', token: cliente, body: { superficie_ha: 0 } })).status, 400);
  const lista = (await pedir('/parcelas', { token: cliente })).datos.parcelas;
  assert.deepEqual(lista.map((p) => [p.codigo, p.superficie_ha, p.riego_texto]).at(0), ['PAR-00002', 3.5, 'Sin riego (solo lluvia)']);

  // Evaluar la parcela registrada: la ladera entra en la comparación; dos evaluaciones forman su historial
  const evaluar = (body, token = cliente) => pedir('/evaluar', { method: 'POST', token, body });
  assert.equal((await evaluar({ parcela_id: parcelaId, rotacion: ['papa', 'trigo'] }, comprador)).status, 403);
  const ev = await evaluar({ parcela_id: parcelaId, rotacion: ['papa', 'trigo'], prioridades: { suelo: 5 } });
  assert.equal(ev.status, 200);
  evaluacionId = ev.datos.id;
  assert.equal(ev.datos.terreno.riesgo, 'alto');
  assert.equal(ev.datos.estrategias[0].evidencia.terreno.riesgo, 'alto');
  assert.equal(typeof ev.datos.estrategias[0].evidencia.ahorro_agua_pct, 'number');
  await evaluar({ parcela_id: parcelaId, rotacion: ['papa', 'haba'] });
  assert.equal((await pedir('/parcelas', { token: cliente })).datos.parcelas.length, 2, 'evaluar una parcela registrada no crea otra');

  // Ciclos anteriores
  const ciclo = (body) => pedir(`/parcelas/${parcelaId}/ciclos`, { method: 'POST', token: cliente, body });
  assert.equal((await ciclo({ anio: 1800, cultivo: 'papa' })).status, 400);
  assert.equal((await ciclo({ anio: 2024, cultivo: 'coca' })).status, 400);
  assert.equal((await ciclo({ anio: 2024, cultivo: 'papa', rendimiento: 180, nota: 'Buena campaña' })).status, 201);
  const c2 = await ciclo({ anio: 2025, cultivo: 'haba', rendimiento: 60 });

  // Ficha: datos del agricultor, de NASA y lo que falta de GAMC; NDVI guardado en segundo plano
  const ficha = await esperar(async () => {
    const f = (await pedir(`/parcelas/${parcelaId}`, { token: cliente })).datos;
    return f.ndvi.estado?.estado === 'listo' && f.ndvi.resumen.length === 3 ? f : null;
  });
  assert.deepEqual(ficha.ciclos.map((c) => [c.anio, c.cultivo_nombre, c.rendimiento]), [[2025, 'Haba', 60], [2024, 'Papa', 180]]);
  assert.equal(ficha.evaluaciones.length, 2);
  assert.equal(ficha.terreno.riesgo, 'alto');
  assert.ok(ficha.terreno.sugeridos.some((c) => c.codigo === 'alfalfa'));
  assert.equal(ficha.ndvi.tendencia.sentido, 'mejora');
  assert.ok(ficha.ndvi.resumen.every((r) => r.seca === 0.15 && r.humeda > 0.5));
  assert.equal(ficha.clima.meses.length, 12);
  assert.deepEqual(ficha.fuentes.map((f) => f.origen), ['agricultor', 'nasa', 'nasa', 'nasa', 'gamc']);
  const gamc = ficha.fuentes.at(-1);
  assert.equal(gamc.disponible, false);
  assert.match(gamc.limitacion, /no configuradas/);
  assert.equal((await pedir(`/parcelas/${parcelaId}/ciclos/${c2.datos.id}`, { method: 'DELETE', token: cliente })).status, 200);
  assert.equal((await pedir(`/parcelas/${parcelaId}`, { token: comprador })).status, 404);
  assert.equal((await pedir('/parcelas/abc', { token: cliente })).status, 404);

  // Estrategia que aplicará
  const adoptar = (estrategia, token = cliente) => pedir(`/evaluaciones/${evaluacionId}/adopcion`, { method: 'PATCH', token, body: { estrategia } });
  assert.equal((await adoptar('magia')).status, 400);
  assert.equal((await adoptar('ajuste', await ingresar('operativo'))).status, 403);
  assert.equal((await adoptar('ajuste')).datos.adoptada, 'ajuste');

  // Resumen de bajo consumo: solo números de la última comparación de cada parcela
  const resumen = await pedir('/resumen', { token: cliente });
  const fila = resumen.datos.find((p) => p.id === parcelaId);
  assert.deepEqual(fila.evaluacion.estrategias.map((s) => s.tipo), ['actual', 'ajuste', 'cambio']);
  assert.deepEqual(fila.evaluacion.estrategias[0].nombres, ['Papa', 'Haba']);
  assert.equal(resumen.datos.find((p) => p.nombre === 'Pampa').evaluacion, null);
  assert.ok(JSON.stringify(resumen.datos).length < 4000, 'respuesta pequeña');
});

test('HU-OPT-01, 03 y 04: parcelas asignadas, visitas exportables y validación local', async () => {
  const [admin, operativo, cliente] = await Promise.all(['admin', 'operativo', 'cliente'].map(ingresar));
  const tecnico2 = (await entrar('tecnico2@poseidon.test', 'secreto-tecnico-2')).datos.token;
  const yo2 = (await pedir('/auth/yo', { token: tecnico2 })).datos;
  assert.ok(!yo2.permisos.includes('ver_todas'), 'por defecto un técnico no ve todas las parcelas');

  // El técnico ve solo sus parcelas asignadas
  const asignadas = (await pedir('/parcelas?alcance=asignadas', { token: operativo })).datos.parcelas;
  assert.ok(asignadas.some((p) => p.id === parcelaId && p.agricultor === 'Agricultor Demo'));
  assert.equal((await pedir(`/parcelas/${parcelaId}`, { token: operativo })).status, 200);
  assert.equal((await pedir(`/parcelas/${parcelaId}`, { token: tecnico2 })).status, 404);
  assert.equal((await pedir(`/evaluaciones/${evaluacionId}`, { token: tecnico2 })).status, 404);
  assert.ok(!(await pedir('/evaluaciones', { token: tecnico2 })).datos.some((e) => e.id === evaluacionId));
  assert.ok((await pedir('/evaluaciones', { token: operativo })).datos.some((e) => e.id === evaluacionId));

  // Reasignación por el administrador
  const asignar = (tecnico_id, token = admin) => pedir(`/parcelas/${parcelaId}/asignacion`, { method: 'PATCH', token, body: { tecnico_id } });
  assert.equal((await asignar(yo2.id, operativo)).status, 403);
  assert.equal((await asignar(3)).status, 400, 'un agricultor no es técnico');
  assert.equal((await asignar(yo2.id)).status, 200);
  assert.equal((await pedir(`/parcelas/${parcelaId}`, { token: operativo })).status, 404);
  assert.equal((await pedir(`/evaluaciones/${evaluacionId}/revision`, { method: 'PATCH', token: operativo, body: { nota: 'x' } })).status, 404);
  assert.equal((await pedir(`/parcelas/${parcelaId}`, { token: tecnico2 })).datos.parcela.tecnico, 'Técnico Dos');
  const operativoId = (await pedir('/auth/yo', { token: operativo })).datos.id;
  await asignar(operativoId);

  // Visitas
  const visitar = (body, token = operativo) => pedir('/visitas', { method: 'POST', token, body });
  const hoy = new Date().toISOString().slice(0, 10);
  const visita = { parcela_id: parcelaId, fecha: hoy, observaciones: 'Se recomendó sembrar en curvas de nivel; revisar gorgojo.' };
  assert.equal((await visitar(visita, tecnico2)).status, 404, 'parcela no asignada');
  assert.equal((await visitar({ ...visita, fecha: '2031-01-01' })).status, 400);
  assert.equal((await visitar({ ...visita, observaciones: 'ok' })).status, 400);
  assert.equal((await visitar(visita, cliente)).status, 403);
  assert.equal((await visitar(visita)).status, 201);
  assert.equal((await visitar({ ...visita, fecha: '2026-03-10', observaciones: '=SUMA(A1) revisión de riego por goteo' })).status, 201);
  const visitas = (await pedir('/visitas', { token: operativo })).datos;
  assert.deepEqual([visitas.resumen.total, visitas.resumen.agricultores, visitas.resumen.parcelas], [2, 1, 1]);
  assert.equal(visitas.visitas[0].agricultor, 'Agricultor Demo');
  assert.equal(visitas.visitas[0].zona, 'Tiquipaya');
  assert.equal((await pedir('/visitas?desde=2026-03-01&hasta=2026-03-31', { token: operativo })).datos.resumen.total, 1);
  assert.equal((await pedir('/visitas', { token: tecnico2 })).datos.resumen.total, 0);
  assert.equal((await pedir('/visitas?todas=1', { token: admin })).datos.resumen.por_tecnico[0].nombre, 'Técnico Demo');
  const exportado = await pedir('/visitas/exportar?desde=2026-01-01', { token: operativo });
  assert.match(exportado.tipo, /text\/csv/);
  assert.match(exportado.cabeceras.get('content-disposition'), /attachment; filename="visitas-2026-01-01-a-/);
  assert.ok(exportado.datos.startsWith('Fecha;Técnico;Agricultor visitado;Parcela;Zona o distrito;Observaciones'), 'fetch ya quitó la marca BOM');
  assert.ok(exportado.datos.includes('Agricultor Demo;Ladera de Tiquipaya;Tiquipaya'));
  assert.ok(exportado.datos.includes("'=SUMA(A1)"), 'las celdas que parecen fórmulas se neutralizan');
  assert.ok((await pedir(`/parcelas/${parcelaId}`, { token: cliente })).datos.visitas.length === 2, 'el agricultor ve las visitas de su parcela');

  // Validación local de una estrategia
  const validar = (body, token = operativo) => pedir(`/evaluaciones/${evaluacionId}/validaciones`, { method: 'POST', token, body });
  const obs = { estrategia: 'ajuste', semillas: 'limitada', observacion: 'La semilla de tarwi solo se consigue en la feria de Punata.' };
  assert.equal((await validar({ ...obs, estrategia: 'otra' })).status, 400);
  assert.equal((await validar({ ...obs, semillas: 'muchas' })).status, 400);
  assert.equal((await validar(obs, tecnico2)).status, 404);
  assert.equal((await validar(obs, cliente)).status, 403);
  assert.equal((await validar(obs)).status, 201);
  const detalle = (await pedir(`/evaluaciones/${evaluacionId}`, { token: cliente })).datos;
  assert.deepEqual(detalle.validaciones.map((v) => [v.estrategia, v.semillas, v.tecnico]), [['ajuste', 'limitada', 'Técnico Demo']]);
  const historial = (await pedir('/validaciones', { token: operativo })).datos;
  assert.deepEqual(historial.por_zona, [{ zona: 'Tiquipaya', total: 1, sin_semilla: 0 }]);
  assert.equal(historial.validaciones[0].semillas_texto, 'Semilla escasa o cara');
  assert.equal((await pedir('/validaciones', { token: tecnico2 })).datos.validaciones.length, 0);
});

test('HU-MON-01 a 04: tablero agregado sin datos individuales, escenarios y exportación', async () => {
  const [admin, monitoreo, cliente] = await Promise.all(['admin', 'monitoreo', 'cliente'].map(ingresar));
  assert.equal((await pedir('/monitoreo', { token: cliente })).status, 403);

  // Con un solo productor en la zona, nada se publica
  let tablero = (await pedir('/monitoreo', { token: monitoreo })).datos;
  assert.equal(tablero.detalle, false);
  assert.deepEqual(tablero.evaluaciones, []);
  assert.ok(tablero.zonas.every((z) => z.suprimido), 'menos de 3 productores: valores suprimidos');
  for (const privado of ['Agricultor Demo', 'Ladera de Tiquipaya', 'cliente@poseidon.test']) assert.ok(!JSON.stringify(tablero).includes(privado), privado);
  assert.equal(tablero.capas.gamc.configurado, false);
  assert.equal(tablero.capas.distritos, null);
  assert.ok(tablero.fuentes.every((f) => f.fuente && f.periodo && f.escala && ['observado', 'estimado', 'declarado'].includes(f.tipo)));

  // Dos productores más en Tiquipaya: la zona alcanza el mínimo y se publica agregada
  for (const n of [1, 2]) {
    const u = { nombre: `Productor ${n}`, email: `productor${n}@poseidon.test`, password: `secreto-prod-${n}`, rol: 'cliente' };
    await crearUsuario(admin, u);
    const token = (await entrar(u.email, u.password)).datos.token;
    const p = await pedir('/parcelas', { method: 'POST', token, body: { nombre: `Chacra ${n}`, lat: -17.336 - n * 0.002, lon: -66.214, superficie_ha: 2 } });
    const ev = await pedir('/evaluar', { method: 'POST', token, body: { parcela_id: p.datos.id, rotacion: ['papa', 'maiz'] } });
    if (n === 1) await pedir(`/evaluaciones/${ev.datos.id}/adopcion`, { method: 'PATCH', token, body: { estrategia: 'cambio' } });
  }
  tablero = await esperar(async () => {
    const t = (await pedir('/monitoreo', { token: monitoreo })).datos;
    return t.zonas.find((z) => z.zona === 'Tiquipaya')?.parcelas_con_ndvi === 3 ? t : null;
  });
  const tiq = tablero.zonas.find((z) => z.zona === 'Tiquipaya');
  assert.deepEqual([tiq.productores, tiq.parcelas, tiq.evaluadas], [3, 3, 3]);
  assert.equal(tiq.adopcion_pct, 67, 'dos de tres productores adoptaron una estrategia recomendada');
  assert.equal(tiq.suelo_desnudo_pct, 100, 'en la época seca el NDVI simulado es 0,15');
  assert.ok(tiq.ahorro_agua_mm !== null && tiq.riego_medio_mm > 0);
  assert.equal(tablero.zonas.find((z) => z.zona === 'Zonas con pocos registros').suprimido, true, 'Punata sigue con un solo productor');
  assert.equal(tablero.totales.adopcion_pct, 67);
  assert.deepEqual(tablero.periodo_ndvi.anios_disponibles.length, 3);
  assert.ok(!JSON.stringify(tablero).includes('Productor 1'));
  // Época húmeda: hay cobertura vegetal
  const humeda = (await pedir('/monitoreo?epoca=humeda', { token: monitoreo })).datos;
  assert.equal(humeda.zonas.find((z) => z.zona === 'Tiquipaya').suelo_desnudo_pct, 0);

  // Exportación de distritos prioritarios
  const lista = await pedir('/monitoreo/suelo-desnudo.csv', { token: monitoreo });
  assert.match(lista.tipo, /text\/csv/);
  assert.match(lista.datos, /Prioridad;Zona o distrito;/);
  assert.match(lista.datos, /\r\n1;Tiquipaya;100;0\.15;3;/);
  assert.equal((await pedir('/monitoreo/suelo-desnudo.csv', { token: cliente })).status, 403);

  // Con ver_todas (administrador) aparece el detalle por parcela
  const completo = (await pedir('/monitoreo', { token: admin })).datos;
  assert.equal(completo.detalle, true);
  assert.ok(completo.evaluaciones.some((e) => e.parcela === 'Ladera de Tiquipaya'));

  // Escenarios
  const esc = await pedir('/monitoreo/escenario?lluvia=-30&temp=2', { token: monitoreo });
  assert.equal(esc.status, 200);
  assert.equal(esc.datos.zonas.length, 12);
  assert.deepEqual(esc.datos.cambio, { lluviaPct: -30, tempC: 2 });
  assert.ok(esc.datos.zonas.every((z) => z.riego_extra_mm > 0 && z.escenario.cobertura_pct <= z.base.cobertura_pct));
  assert.equal(esc.datos.fuente.tipo, 'simulado');
  const neutro = (await pedir('/monitoreo/escenario', { token: monitoreo })).datos;
  assert.ok(neutro.zonas.every((z) => z.riego_extra_mm === 0 && z.nivel === 'bajo'));
  assert.equal((await pedir('/monitoreo/escenario', { token: cliente })).status, 403);
});

test('los respaldos incluyen las tablas nuevas y se restauran', async () => {
  const admin = await ingresar('admin'), cliente = await ingresar('cliente');
  const respaldo = await pedir('/respaldos', { method: 'POST', token: admin });
  for (const t of ['parcelas', 'ciclos', 'ndvi', 'visitas', 'validaciones', 'auditoria']) assert.ok(respaldo.datos.conteos[t] > 0, t);
  await pedir(`/parcelas/${parcelaId}/ciclos`, { method: 'POST', token: cliente, body: { anio: 2023, cultivo: 'maiz' } });
  const r = await pedir(`/respaldos/${respaldo.datos.nombre}/restaurar`, { method: 'POST', token: admin, body: { confirmacion: respaldo.datos.nombre } });
  assert.equal(r.status, 200);
  const ficha = (await pedir(`/parcelas/${parcelaId}`, { token: cliente })).datos;
  assert.deepEqual(ficha.ciclos.map((c) => c.anio), [2024]);
  assert.equal(ficha.parcela.pendiente_pct, 20);
  assert.equal(ficha.ndvi.resumen.length, 3);
  assert.equal(ficha.visitas.length, 2);
  assert.ok((await pedir('/auditoria', { token: admin })).datos.some((x) => x.accion === 'respaldo.restaurado'));
});
