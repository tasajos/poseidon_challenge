// Alertas climáticas críticas (helada y sequía severa) a partir de datos diarios de NASA POWER.
// POWER publica los datos diarios con 2 a 4 días de retraso y no da pronósticos: las alertas
// avisan de condiciones ya medidas que suelen repetirse en los días siguientes.
import 'dotenv/config';
import * as db from './db.js';
import { climatologia } from './power.js';
import { entregar } from './canales.js';

export const UMBRALES = {
  heladaC: Number(process.env.ALERTA_HELADA_C ?? 0),        // mínima diaria que dispara la alerta de helada
  sequiaPct: Number(process.env.ALERTA_SEQUIA_PCT ?? 30),    // lluvia de 30 días por debajo de este % de lo normal
  sequiaMinMm: 20,                                           // no alertar en la época seca, cuando lo normal es casi 0
};
const DIAS_MES = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const VENTANA = 30;

const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
export const fechaLegible = (s) => new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T12:00:00Z`)
  .toLocaleDateString('es-BO', { day: 'numeric', month: 'long', timeZone: 'UTC' });

// ---------- Datos diarios ----------
const cache = new Map(); // coordenadas → { hasta, dias }

// Devuelve [{ fecha: 'AAAAMMDD', tmin, tmax, lluvia }] con los días que POWER ya publicó.
export async function diarioReciente(lat, lon) {
  const clave = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const guardado = cache.get(clave);
  if (guardado && guardado.hasta > Date.now()) return guardado.dias;
  const fin = new Date();
  const inicio = new Date(fin.getTime() - (VENTANA + 6) * 864e5);
  const url = 'https://power.larc.nasa.gov/api/temporal/daily/point'
    + `?parameters=T2M_MIN,T2M_MAX,PRECTOTCORR&community=AG&longitude=${lon}&latitude=${lat}`
    + `&start=${ymd(inicio)}&end=${ymd(fin)}&format=JSON`;
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`NASA POWER respondió ${r.status}`);
  const p = (await r.json()).properties.parameter;
  const dias = Object.keys(p.T2M_MIN).sort()
    .map((fecha) => ({ fecha, tmin: p.T2M_MIN[fecha], tmax: p.T2M_MAX[fecha], lluvia: p.PRECTOTCORR[fecha] }))
    .filter((d) => d.tmin > -900 && d.tmax > -900 && d.lluvia > -900)
    .slice(-VENTANA);
  cache.set(clave, { hasta: Date.now() + 3 * 3600e3, dias });
  return dias;
}

// ---------- Detección (función pura, probada en test/alertas.test.js) ----------
// dias: serie diaria reciente; lluviaNormal: 12 valores de lluvia mensual climatológica (mm) o null.
export function detectarEventos(dias, lluviaNormal, u = UMBRALES) {
  const eventos = [];
  if (!dias.length) return eventos;

  // Helada: alguna mínima de los últimos 3 días publicados en o bajo el umbral.
  const fria = dias.slice(-3).filter((d) => d.tmin <= u.heladaC).sort((a, b) => a.tmin - b.tmin)[0];
  if (fria) {
    eventos.push({
      tipo: 'helada', fecha: fria.fecha, valor: fria.tmin,
      titulo: 'Riesgo de helada',
      mensaje: `NASA POWER registró una mínima de ${fria.tmin.toFixed(1)} °C el ${fechaLegible(fria.fecha)}. `
        + 'Proteja los cultivos sensibles (riego ligero al atardecer, cobertura) en las próximas noches.',
    });
  }

  // Sequía severa: lluvia de los últimos 30 días muy por debajo de lo normal para esas fechas.
  if (lluviaNormal && dias.length >= 20) {
    const caida = dias.reduce((s, d) => s + d.lluvia, 0);
    const normal = dias.reduce((s, d) => s + lluviaNormal[Number(d.fecha.slice(4, 6)) - 1] / DIAS_MES[Number(d.fecha.slice(4, 6)) - 1], 0);
    if (normal >= u.sequiaMinMm && caida < (normal * u.sequiaPct) / 100) {
      const ultimo = dias.at(-1).fecha;
      eventos.push({
        tipo: 'sequia', fecha: ultimo, valor: Math.round(caida),
        titulo: 'Sequía severa',
        mensaje: `En los últimos ${dias.length} días llovió ${Math.round(caida)} mm, cuando lo normal es ${Math.round(normal)} mm `
          + `(${Math.round((caida / normal) * 100)} %). Priorice el riego de los cultivos en floración y revise sus reservas de agua.`,
      });
    }
  }
  return eventos;
}

// Clave para no repetir la misma alerta: la helada, una vez por día medido; la sequía, una vez por semana.
const claveEvento = (e, lugar) => (e.tipo === 'helada'
  ? `helada:${lugar}:${e.fecha}`
  : `sequia:${lugar}:${Math.floor(Date.parse(`${e.fecha.slice(0, 4)}-${e.fecha.slice(4, 6)}-${e.fecha.slice(6, 8)}`) / (7 * 864e5))}`);

// ---------- Revisión de parcelas ----------
// Revisa las parcelas (de una persona o de todas) y envía las alertas nuevas.
export async function revisarAlertas({ usuarioId } = {}) {
  const parcelas = await db.parcelasParaAlertas({ usuarioId });
  // Una evaluación crea una parcela; varias pueden estar en el mismo lugar. Se agrupan por persona y lugar.
  const grupos = new Map();
  for (const p of parcelas) {
    const lugar = `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;
    const k = `${p.usuario_id}|${lugar}`;
    if (!grupos.has(k)) grupos.set(k, { ...p, lugar });
  }

  const resultado = { lugares: grupos.size, nuevas: [], errores: [] };
  const permisos = new Map();
  for (const g of grupos.values()) {
    if (!permisos.has(g.rol)) permisos.set(g.rol, await db.permisosDeRol(g.rol));
    if (!permisos.get(g.rol).includes('alertas')) continue;
    const prefs = await db.getPreferencias(g.usuario_id);
    if (!prefs.helada && !prefs.sequia) continue;

    let eventos;
    try {
      const dias = await diarioReciente(g.lat, g.lon);
      const normal = prefs.sequia ? await climatologia(g.lat, g.lon) : null;
      eventos = detectarEventos(dias, normal?.fuente === 'nasa-power' ? normal.lluvia_mm : null);
    } catch (e) {
      resultado.errores.push({ parcela: g.nombre, error: `Sin datos de NASA POWER (${e.message})` });
      continue;
    }

    for (const e of eventos.filter((x) => prefs[x.tipo])) {
      const clave = claveEvento(e, g.lugar);
      if (await db.alertaYaEnviada(g.usuario_id, clave)) continue;
      const alerta = { tipo: e.tipo, titulo: `${e.titulo} · ${g.nombre}`, mensaje: e.mensaje };
      const canales = await entregar(g.usuario_id, prefs, alerta);
      await db.registrarAlerta({ usuarioId: g.usuario_id, parcelaId: g.id, clave, canales, ...alerta });
      resultado.nuevas.push({ ...alerta, usuario_id: g.usuario_id, canales });
    }
  }
  return resultado;
}

// Revisión automática periódica. ALERTAS_CADA_HORAS=0 la desactiva.
let estado = { cada_horas: 0, proxima: null, ultima: null };
export const estadoAlertas = () => ({ ...estado, umbrales: UMBRALES });

export function programarAlertas() {
  const horas = Number(process.env.ALERTAS_CADA_HORAS ?? 6);
  if (!(horas > 0)) return;
  estado.cada_horas = horas;
  const correr = async () => {
    try {
      const r = await revisarAlertas();
      estado.ultima = { en: new Date(), lugares: r.lugares, nuevas: r.nuevas.length, errores: r.errores.length };
      if (r.nuevas.length) console.log(`[alertas] ${r.nuevas.length} alerta(s) enviada(s)`);
    } catch (e) {
      console.error('[alertas] Falló la revisión:', e.message);
    }
    agendar(horas * 3600e3);
  };
  const agendar = (ms) => {
    estado.proxima = new Date(Date.now() + ms);
    setTimeout(correr, ms).unref();
  };
  agendar(60e3); // primera revisión un minuto después de arrancar
}
