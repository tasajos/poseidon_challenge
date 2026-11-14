import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import * as db from './db.js';
import { ROLES, hashPassword, verificarPassword, crearToken, requiereSesion, requiereRol, limiteIngreso } from './auth.js';
import { climatologia } from './power.js';
import { indicadoresMensuales } from './clima.js';
import { compararRotaciones, CRITERIOS } from './rotacion.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50kb' }));

const sesion = requiereSesion(db.usuarioPorId);
const PERSONAL = ['administrador', 'operativo', 'monitoreo']; // ven las evaluaciones de todos
const error = (status, mensaje) => Object.assign(new Error(mensaje), { status });
const ruta = (fn) => (req, res, next) => fn(req, res).catch(next);

function coordenadas(lat, lon) {
  const a = Number(lat), o = Number(lon);
  if (lat == null || lon == null || !Number.isFinite(a) || !Number.isFinite(o) || Math.abs(a) > 90 || Math.abs(o) > 180) {
    throw error(400, 'Coordenadas inválidas');
  }
  return [a, o];
}

// Datos cortos para listas y tableros, a partir de las 3 estrategias guardadas.
function resumir({ resultado, prioridades, ...e }) {
  const actual = resultado[0];
  const mejor = resultado.reduce((a, b) => (b.puntaje > a.puntaje ? b : a));
  return {
    ...e,
    resumen: {
      actual: { nombres: actual.nombres, puntaje: actual.puntaje },
      mejor: { titulo: mejor.titulo, nombres: mejor.nombres, puntaje: mejor.puntaje },
      deficit_agua_mm: actual.evidencia.deficit_agua_mm,
      heladas: actual.detalle.filter((d) => d.meses_helada.length)
        .map((d) => ({ cultivo: d.nombre, meses: d.meses_helada })),
    },
  };
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---------- Sesión ----------
app.post('/api/auth/login', limiteIngreso, ruta(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const u = await db.usuarioPorEmail(email);
  if (!u || !u.activo || !verificarPassword(req.body?.password || '', u.password_hash)) {
    throw error(401, 'Correo o contraseña incorrectos');
  }
  res.json({ token: crearToken(u), usuario: { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol } });
}));

app.get('/api/auth/yo', sesion, (req, res) => res.json(req.usuario));

// ---------- Datos de apoyo ----------
app.get('/api/cultivos', sesion, ruta(async (_req, res) => res.json(await db.getCultivos())));

app.get('/api/clima', sesion, ruta(async (req, res) => {
  const [lat, lon] = coordenadas(req.query.lat, req.query.lon);
  const base = await climatologia(lat, lon);
  res.json({ fuente: base.fuente, meses: indicadoresMensuales(lat, base) });
}));

// ---------- Evaluaciones ----------
// Cuerpo: { nombre?, lat, lon, rotacion: ["papa","maiz"], prioridades: { agua: 0-5, ... } }
app.post('/api/evaluar', sesion, requiereRol('cliente', 'operativo', 'administrador'), ruta(async (req, res) => {
  const { rotacion, prioridades = {}, nombre } = req.body || {};
  const [lat, lon] = coordenadas(req.body?.lat, req.body?.lon);
  if (!Array.isArray(rotacion) || rotacion.length < 2 || rotacion.length > 4
    || new Set(rotacion).size !== rotacion.length) {
    throw error(400, 'La rotación debe tener de 2 a 4 cultivos distintos');
  }
  const pesos = Object.fromEntries(CRITERIOS.map((k) => [k, Math.max(0, Math.min(5, Number(prioridades[k]) || 0))]));
  const { cultivos } = await db.getCultivos();
  const malo = rotacion.find((k) => !cultivos.some((c) => c.codigo === k));
  if (malo !== undefined) throw error(400, `Cultivo desconocido: ${malo}`);

  const base = await climatologia(lat, lon);
  const meses = indicadoresMensuales(lat, base);
  const estrategias = compararRotaciones(rotacion, cultivos, meses, pesos);
  const id = await db.guardarEvaluacion({
    usuarioId: req.usuario.id, nombre: String(nombre || '').trim().slice(0, 80) || 'Parcela sin nombre',
    lat, lon, rotacion, prioridades: pesos, fuenteClima: base.fuente, estrategias,
  });
  res.json({ id, fuenteClima: base.fuente, clima: meses, estrategias });
}));

const visibles = (u) => db.listarEvaluaciones(PERSONAL.includes(u.rol) ? {} : { usuarioId: u.id });

app.get('/api/evaluaciones', sesion, ruta(async (req, res) => {
  res.json((await visibles(req.usuario)).map(resumir));
}));

app.get('/api/evaluaciones/:id', sesion, ruta(async (req, res) => {
  const e = await db.obtenerEvaluacion(req.params.id);
  if (!e || (!PERSONAL.includes(req.usuario.rol) && e.usuario_id !== req.usuario.id)) {
    throw error(404, 'Evaluación no encontrada');
  }
  res.json(e);
}));

app.patch('/api/evaluaciones/:id/revision', sesion, requiereRol('operativo', 'administrador'), ruta(async (req, res) => {
  const nota = String(req.body?.nota || '').trim().slice(0, 2000);
  if (!nota) throw error(400, 'Escriba una nota técnica');
  if (!(await db.revisarEvaluacion(req.params.id, { nota, revisorId: req.usuario.id }))) {
    throw error(404, 'Evaluación no encontrada');
  }
  res.json({ ok: true });
}));

// ---------- Monitoreo ----------
app.get('/api/monitoreo', sesion, requiereRol(...PERSONAL), ruta(async (_req, res) => {
  const evaluaciones = (await db.listarEvaluaciones()).map(resumir);
  const usuarios = await db.listarUsuarios();
  const alertas = [];
  for (const e of evaluaciones) {
    if (e.resumen.deficit_agua_mm > 400) {
      alertas.push({ id: e.id, parcela: e.parcela, tipo: 'agua', texto: `Déficit de agua alto: ${e.resumen.deficit_agua_mm} mm por campaña` });
    }
    for (const h of e.resumen.heladas) {
      alertas.push({ id: e.id, parcela: e.parcela, tipo: 'helada', texto: `${h.cultivo} expuesto a helada en ${h.meses.join(', ')}` });
    }
  }
  const contar = (lista, campo) => lista.reduce((a, x) => ({ ...a, [x[campo]]: (a[x[campo]] || 0) + 1 }), {});
  res.json({
    totales: {
      evaluaciones: evaluaciones.length,
      pendientes: evaluaciones.filter((e) => e.estado === 'pendiente').length,
      clientes: new Set(evaluaciones.map((e) => e.usuario_id)).size,
      alertas: alertas.length,
    },
    usuarios_por_rol: contar(usuarios.filter((u) => u.activo), 'rol'),
    fuentes_clima: contar(evaluaciones, 'fuente_clima'),
    base_datos: db.modo(),
    alertas,
    evaluaciones,
  });
}));

// ---------- Administración ----------
app.get('/api/usuarios', sesion, requiereRol('administrador'), ruta(async (_req, res) => res.json(await db.listarUsuarios())));

app.post('/api/usuarios', sesion, requiereRol('administrador'), ruta(async (req, res) => {
  const nombre = String(req.body?.nombre || '').trim().slice(0, 80);
  const email = String(req.body?.email || '').trim().toLowerCase();
  const { password, rol } = req.body || {};
  if (!nombre || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw error(400, 'Nombre y correo válidos son obligatorios');
  if (typeof password !== 'string' || password.length < 8) throw error(400, 'La contraseña debe tener al menos 8 caracteres');
  if (!ROLES.includes(rol)) throw error(400, 'Rol no válido');
  if (await db.usuarioPorEmail(email)) throw error(409, 'Ya existe un usuario con ese correo');
  const id = await db.crearUsuario({ nombre, email, password_hash: hashPassword(password), rol });
  res.status(201).json({ id });
}));

app.patch('/api/usuarios/:id', sesion, requiereRol('administrador'), ruta(async (req, res) => {
  const { rol, activo } = req.body || {};
  if (rol !== undefined && !ROLES.includes(rol)) throw error(400, 'Rol no válido');
  if (activo !== undefined && typeof activo !== 'boolean') throw error(400, 'Valor de activo no válido');
  if (Number(req.params.id) === req.usuario.id) throw error(400, 'No puede cambiar su propio rol ni desactivarse');
  if (!(await db.actualizarUsuario(req.params.id, { rol, activo }))) throw error(404, 'Usuario no encontrado');
  res.json({ ok: true });
}));

app.use((err, _req, res, _next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Error interno' });
});

await db.iniciar();
const puerto = Number(process.env.PORT || 3001);
app.listen(puerto, () => console.log(`API Poseidon en http://localhost:${puerto} (datos: ${db.modo()})`));
