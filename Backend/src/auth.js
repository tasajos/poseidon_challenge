// Contraseñas con scrypt y sesiones con JWT.
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

export const ROLES = ['administrador', 'operativo', 'cliente', 'monitoreo'];

const SECRETO = process.env.JWT_SECRET && process.env.JWT_SECRET !== 'cambie-este-valor'
  ? process.env.JWT_SECRET
  : randomBytes(32).toString('hex'); // sin JWT_SECRET las sesiones se pierden al reiniciar

export function hashPassword(clave) {
  const sal = randomBytes(16);
  return `${sal.toString('hex')}:${scryptSync(clave, sal, 64).toString('hex')}`;
}

export function verificarPassword(clave, guardado) {
  const [sal, hash] = String(guardado).split(':');
  if (!sal || !hash) return false;
  const esperado = Buffer.from(hash, 'hex');
  const calculado = scryptSync(String(clave), Buffer.from(sal, 'hex'), esperado.length);
  return timingSafeEqual(esperado, calculado);
}

export const crearToken = (u) => jwt.sign({ id: u.id, rol: u.rol }, SECRETO, { expiresIn: '12h' });

// Middleware: exige sesión válida y usuario activo. buscarUsuario(id) viene de db.js.
export function requiereSesion(buscarUsuario) {
  return async (req, res, next) => {
    try {
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      const { id } = jwt.verify(token, SECRETO);
      const u = await buscarUsuario(id);
      if (!u || !u.activo) throw new Error('inactivo');
      req.usuario = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
      next();
    } catch {
      res.status(401).json({ error: 'Sesión no válida. Ingrese de nuevo.' });
    }
  };
}

export const requiereRol = (...roles) => (req, res, next) => (
  roles.includes(req.usuario.rol) ? next() : res.status(403).json({ error: 'Su rol no tiene permiso para esto.' })
);

// Límite simple de intentos de ingreso por IP (en memoria).
const intentos = new Map();
export function limiteIngreso(req, res, next) {
  const ahora = Date.now();
  const r = intentos.get(req.ip) || { n: 0, desde: ahora };
  if (ahora - r.desde > 15 * 60 * 1000) { r.n = 0; r.desde = ahora; }
  r.n += 1;
  intentos.set(req.ip, r);
  if (r.n > 20) return res.status(429).json({ error: 'Demasiados intentos. Espere unos minutos.' });
  next();
}
