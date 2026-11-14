import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { getCultivos, guardarEvaluacion, ultimasEvaluaciones } from './db.js';
import { climatologia } from './power.js';
import { indicadoresMensuales } from './clima.js';
import { compararRotaciones, CRITERIOS } from './rotacion.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50kb' }));

function coordenadas(lat, lon) {
  const a = Number(lat), o = Number(lon);
  if (!Number.isFinite(a) || !Number.isFinite(o) || Math.abs(a) > 90 || Math.abs(o) > 180) {
    const e = new Error('Coordenadas inválidas'); e.status = 400; throw e;
  }
  return [a, o];
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/cultivos', async (_req, res, next) => {
  try { res.json(await getCultivos()); } catch (e) { next(e); }
});

app.get('/api/clima', async (req, res, next) => {
  try {
    const [lat, lon] = coordenadas(req.query.lat, req.query.lon);
    const base = await climatologia(lat, lon);
    res.json({ fuente: base.fuente, meses: indicadoresMensuales(lat, base) });
  } catch (e) { next(e); }
});

// Cuerpo: { nombre?, lat, lon, rotacion: ["papa","maiz"], prioridades: { agua: 0-5, ... } }
app.post('/api/evaluar', async (req, res, next) => {
  try {
    const { rotacion, prioridades = {}, nombre } = req.body || {};
    const [lat, lon] = coordenadas(req.body?.lat, req.body?.lon);
    if (!Array.isArray(rotacion) || rotacion.length < 2 || rotacion.length > 4
      || new Set(rotacion).size !== rotacion.length) {
      return res.status(400).json({ error: 'La rotación debe tener de 2 a 4 cultivos distintos' });
    }
    const pesos = Object.fromEntries(CRITERIOS.map((k) => [k, Math.max(0, Math.min(5, Number(prioridades[k]) || 0))]));
    const { cultivos } = await getCultivos();
    const conocidos = new Set(cultivos.map((c) => c.codigo));
    const malo = rotacion.find((k) => !conocidos.has(k));
    if (malo !== undefined) return res.status(400).json({ error: `Cultivo desconocido: ${malo}` });

    const base = await climatologia(lat, lon);
    const meses = indicadoresMensuales(lat, base);
    const estrategias = compararRotaciones(rotacion, cultivos, meses, pesos);
    const id = await guardarEvaluacion({
      nombre: String(nombre || 'Parcela sin nombre').slice(0, 80), lat, lon,
      rotacion, prioridades: pesos, fuenteClima: base.fuente, estrategias,
    });
    res.json({ id, fuenteClima: base.fuente, clima: meses, estrategias });
  } catch (e) { next(e); }
});

app.get('/api/evaluaciones', async (_req, res) => {
  try { res.json(await ultimasEvaluaciones()); } catch { res.status(503).json({ error: 'Base de datos no disponible' }); }
});

app.use((err, _req, res, _next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Error interno' });
});

const puerto = Number(process.env.PORT || 3001);
app.listen(puerto, () => console.log(`API Poseidon en http://localhost:${puerto}`));
