// "NASA en vivo" del agricultor: últimos datos diarios de NASA POWER, relieve SRTM y vegetación MODIS de
// una de sus parcelas, y la consola con las consultas que sus acciones hicieron a la NASA.
// Ningún servicio de la NASA es instantáneo: POWER publica cada día con 2 a 4 días de retraso (la radiación
// y la humedad del suelo, a veces más), MODIS entrega un compuesto cada 16 días y SRTM es un relieve fijo
// (misión del año 2000). La vista lo dice; "en vivo" significa que se consulta ahora, no que el dato sea de hoy.
import 'dotenv/config';
import * as db from './db.js';
import { tienePermiso } from './auth.js';
import { climatologia } from './power.js';
import { consultarTerreno, riesgoErosion, terrenoDisponible, FUENTE_TERRENO } from './terreno.js';
import { resumenAnual, tendencia, estadoNdvi, ndviDisponible, FUENTE_NDVI, SUELO_DESNUDO } from './ndvi.js';
import { completarTerreno, encolarNdvi } from './parcelas.js';
import { traza, punto, eventosDe } from './traza.js';

const URL_POWER = 'https://power.larc.nasa.gov/api/temporal/daily/point';
const PARAMETROS = ['T2M_MIN', 'T2M_MAX', 'PRECTOTCORR', 'RH2M', 'ALLSKY_SFC_SW_DWN', 'WS2M', 'GWETROOT'];
const VENTANA = 30;
const DIAS_MES = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const VIGENCIA_MS = 30 * 60e3;   // los datos diarios cambian una vez al día: 30 min de caché bastan
const PAUSA_FRESCO_MS = 30e3;    // "Consultar ahora" salta la caché como mucho una vez cada 30 s por persona
const cache = new Map();
const ultimoFresco = new Map();

const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
const valor = (v) => (typeof v === 'number' && v > -900 ? v : null);

// Últimos días publicados por POWER: [{ fecha 'AAAA-MM-DD', tmin, tmax, lluvia, humedad, radiacion, viento, suelo }].
export async function diarioNasa(lat, lon, { fresco = false } = {}) {
  const clave = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const guardado = cache.get(clave);
  if (!fresco && guardado && guardado.hasta > Date.now()) {
    traza('NASA POWER', 'cache', `datos diarios ${punto(lat, lon)} (descargados a las ${guardado.datos.consultado_en.toLocaleTimeString('es-BO', { hour12: false })})`);
    return guardado.datos;
  }
  const fin = new Date();
  const inicio = new Date(fin.getTime() - (VENTANA + 10) * 864e5);
  const url = `${URL_POWER}?parameters=${PARAMETROS.join(',')}&community=AG&longitude=${lon}&latitude=${lat}`
    + `&start=${ymd(inicio)}&end=${ymd(fin)}&format=JSON`;
  const t0 = Date.now();
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
    if (!r.ok) throw new Error(`NASA POWER respondió ${r.status}`);
    const cuerpo = await r.json();
    const p = cuerpo.properties.parameter;
    const dias = Object.keys(p.T2M_MIN).sort().map((f) => ({
      fecha: `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6, 8)}`,
      tmin: valor(p.T2M_MIN[f]), tmax: valor(p.T2M_MAX[f]), lluvia: valor(p.PRECTOTCORR[f]),
      humedad: valor(p.RH2M?.[f]), radiacion: valor(p.ALLSKY_SFC_SW_DWN?.[f]), viento: valor(p.WS2M?.[f]), suelo: valor(p.GWETROOT?.[f]),
    })).filter((d) => d.tmin !== null && d.tmax !== null).slice(-VENTANA);
    const unidades = Object.fromEntries(PARAMETROS.map((k) => [k, cuerpo.parameters?.[k]?.units || '']));
    const datos = { dias, unidades, consultado_en: new Date(), ms: Date.now() - t0 };
    cache.set(clave, { hasta: Date.now() + VIGENCIA_MS, datos });
    const u = dias.at(-1);
    traza('NASA POWER', 'descarga', `datos diarios ${punto(lat, lon)}: ${dias.length} días, ${PARAMETROS.length} variables`
      + (u ? `, último ${u.fecha} (mín ${u.tmin.toFixed(1)} °C, máx ${u.tmax.toFixed(1)} °C, lluvia ${(u.lluvia ?? 0).toFixed(1)} mm)` : ''), Date.now() - t0);
    return datos;
  } catch (e) {
    traza('NASA POWER', 'error', `datos diarios ${punto(lat, lon)}: ${e.name === 'TimeoutError' ? 'sin respuesta a tiempo' : e.message}`, Date.now() - t0);
    if (guardado) return { ...guardado.datos, vencido: true };
    throw e;
  }
}

// Indicadores de los últimos días frente a lo normal del lugar (climatología de POWER).
export function resumirDiario(dias, normal) {
  if (!dias.length) return null;
  const suma = (xs) => xs.reduce((a, b) => a + b, 0);
  const conDato = (k) => dias.filter((d) => d[k] !== null);
  const ultimoCon = (k) => { const d = conDato(k).at(-1); return d ? { valor: d[k], fecha: d.fecha } : null; };
  const lluvia = suma(conDato('lluvia').map((d) => d.lluvia));
  const lluviaNormal = normal?.fuente === 'nasa-power'
    ? suma(conDato('lluvia').map((d) => { const m = Number(d.fecha.slice(5, 7)) - 1; return normal.lluvia_mm[m] / DIAS_MES[m]; }))
    : null;
  const ultimo = dias.at(-1);
  const retraso = Math.round((Date.now() - new Date(`${ultimo.fecha}T12:00:00Z`).getTime()) / 864e5);
  return {
    dias: dias.length,
    ultimo_dia: ultimo.fecha,
    retraso_dias: retraso,
    tmin: { valor: ultimo.tmin, fecha: ultimo.fecha },
    tmax: { valor: ultimo.tmax, fecha: ultimo.fecha },
    minima_del_periodo: Math.min(...dias.map((d) => d.tmin)),
    heladas: dias.filter((d) => d.tmin <= 0).length,
    lluvia_mm: Math.round(lluvia * 10) / 10,
    lluvia_normal_mm: lluviaNormal === null ? null : Math.round(lluviaNormal * 10) / 10,
    lluvia_pct: lluviaNormal ? Math.round((lluvia / lluviaNormal) * 100) : null,
    dias_con_lluvia: dias.filter((d) => (d.lluvia ?? 0) >= 1).length,
    humedad: ultimoCon('humedad'),
    radiacion: ultimoCon('radiacion'),
    viento: ultimoCon('viento'),
    suelo: ultimoCon('suelo'),
  };
}

// La vista es de todos los agricultores (rol cliente) y del administrador, tengan o no el permiso evaluar;
// otros roles la usan solo si el administrador les dio ese permiso.
const ROLES_VISTA = ['cliente', 'administrador'];
const delAgricultor = (req, res, next) => (ROLES_VISTA.includes(req.usuario.rol) || tienePermiso(req.usuario, 'evaluar')
  ? next()
  : res.status(403).json({ error: 'Esta sección es para agricultores y administradores.' }));
// El administrador (o quien ve todas las parcelas) elige entre las parcelas de todos los agricultores.
const veTodas = (u) => u.rol === 'administrador' || tienePermiso(u, 'ver_todas');

export function registrarNasaVivo(app, { sesion, ruta, error }) {
  // ?parcela=ID (por defecto la primera) · ?fresco=1 vuelve a consultar a la NASA sin usar la caché.
  app.get('/api/nasa/en-vivo', sesion, delAgricultor, ruta(async (req, res) => {
    const u = req.usuario;
    const todas = veTodas(u);
    const parcelas = (await db.listarParcelas(todas ? {} : { usuarioId: u.id })).sort((a, b) => a.id - b.id);
    const lista = parcelas.map((p) => ({
      id: p.id, nombre: p.nombre, lat: p.lat, lon: p.lon, perimetro: p.perimetro || null, ...(todas ? { agricultor: p.agricultor || null } : {}),
    }));
    const alcance = todas ? 'todas' : 'propias';
    if (!parcelas.length) return res.json({ parcelas: [], alcance });
    let p = parcelas[0];
    if (req.query.parcela !== undefined) {
      p = parcelas.find((x) => String(x.id) === String(req.query.parcela));
      if (!p) throw error(404, 'Parcela no encontrada');
    }
    let fresco = req.query.fresco === '1';
    let aviso = null;
    if (fresco) {
      const antes = ultimoFresco.get(u.id) || 0;
      if (Date.now() - antes < PAUSA_FRESCO_MS) {
        fresco = false;
        aviso = `Se consultó a la NASA hace menos de ${PAUSA_FRESCO_MS / 1000} segundos: se muestran esos mismos datos.`;
      } else ultimoFresco.set(u.id, Date.now());
    }

    const terreno = (async () => {
      if (!fresco || !terrenoDisponible()) return completarTerreno(p);
      try {
        const t = await consultarTerreno(p.lat, p.lon);
        const cambios = { ...t, terreno_en: new Date() };
        await db.actualizarParcela(p.id, cambios);
        return { ...p, ...cambios };
      } catch {
        return p;
      }
    })();
    const [diario, normal, conTerreno, puntos] = await Promise.all([
      diarioNasa(p.lat, p.lon, { fresco }).catch((e) => ({ error: e.message })),
      climatologia(p.lat, p.lon),
      terreno,
      db.ndviDe(p.id),
    ]);
    const estado = ndviDisponible() ? encolarNdvi(p) : { estado: 'desactivado' };
    const resumen = resumenAnual(puntos);

    res.json({
      parcelas: lista,
      alcance,
      parcela: { id: p.id, nombre: p.nombre, lat: p.lat, lon: p.lon },
      aviso,
      power: diario.error
        ? { error: diario.error }
        : { ...diario, resumen: resumirDiario(diario.dias, normal), normal_fuente: normal.fuente },
      terreno: {
        disponible: conTerreno.pendiente_pct !== null && conTerreno.pendiente_pct !== undefined,
        elevacion_m: conTerreno.elevacion_m ?? null,
        pendiente_pct: conTerreno.pendiente_pct ?? null,
        riesgo: riesgoErosion(conTerreno.pendiente_pct),
        consultado_en: conTerreno.terreno_en || null,
        fuente: FUENTE_TERRENO,
      },
      ndvi: {
        disponible: ndviDisponible(),
        estado: estadoNdvi(p.id) || estado,
        ultimo: puntos.at(-1) || null,
        recientes: puntos.slice(-12),
        resumen,
        tendencia: tendencia(resumen),
        umbral_desnudo: SUELO_DESNUDO,
        fuente: FUENTE_NDVI,
      },
    });
  }));

  // Consola: eventos de la traza provocados por esta persona, desde el id `desde`.
  app.get('/api/nasa/consola', sesion, delAgricultor, ruta(async (req, res) => {
    const desde = Math.max(0, Number(req.query.desde) || 0);
    res.json(eventosDe(req.usuario.id, desde));
  }));
}
