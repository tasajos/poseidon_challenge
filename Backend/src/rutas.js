// Rutas de parcelas, historial, asistencia técnica, auditoría y monitoreo regional.
// server.js las registra con registrarRutas(app, ayudas) antes del manejador de errores.
import 'dotenv/config';
import * as db from './db.js';
import { requierePermiso, tienePermiso } from './auth.js';
import { climatologia } from './power.js';
import { indicadoresMensuales } from './clima.js';
import { ZONAS, zonaDe, distanciaKm, aproximar, capaDistritos, hayDistritos } from './geo.js';
import { fichaTerreno, FUENTE_TERRENO } from './terreno.js';
import { resumenAnual, tendencia, estadoNdvi, ndviDisponible, FUENTE_NDVI, SUELO_DESNUDO } from './ndvi.js';
import { leerRegistro, vistaParcela, completarTerreno, encolarNdvi, prepararParcela, codigoParcela, ETAPAS, RIEGOS } from './parcelas.js';
import { RADIO_KM, VIGENCIA_DIAS } from './plagas.js';
import { simular, LIMITES, NIVELES } from './escenario.js';
import { agregarPorZona, prioridadSueloDesnudo, csv, MIN_PRODUCTORES } from './agregados.js';

const verTodas = (u) => tienePermiso(u, 'ver_todas');

// Una parcela (o una evaluación, que lleva los mismos campos) la ve su dueño, quien tiene "ver_todas"
// y el técnico que la tiene asignada (HU-OPT-01).
export const puedeVerParcela = (u, p) => p.usuario_id === u.id || verTodas(u)
  || (p.tecnico_id === u.id && tienePermiso(u, 'revisar'));

// Capa WMS de límites distritales del GAMC (opcional). Sin configurar, la interfaz lo avisa.
const GAMC = {
  url: process.env.GAMC_WMS_URL || '',
  capas: process.env.GAMC_WMS_CAPAS || '',
  atribucion: process.env.GAMC_WMS_ATRIBUCION || 'GAMC',
};
const capaGamc = () => ({ configurado: Boolean(GAMC.url && GAMC.capas), ...GAMC });

const NOTA_RESOLUCION = 'Los datos de NASA describen cuadros grandes (30 m en pendiente, 250 m en vegetación, unos 50 km en clima): '
  + 'orientan sobre la zona, no miden su parcela con precisión de campo.';

const FECHA = /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const SEMILLAS = { disponible: 'Hay semilla en la zona', limitada: 'Semilla escasa o cara', no_disponible: 'No se consigue en la zona' };
const hoy = () => new Date().toISOString().slice(0, 10);
const espera = (ms, valor) => new Promise((ok) => setTimeout(() => ok(valor), ms).unref());

// Qué significa cada indicador regional: fuente, período, escala y si es observado o estimado (HU-MON-01).
const FUENTES_REGIONALES = [
  { indicador: 'Riego necesario e índice de agua', fuente: 'NASA POWER (climatología mensual) y balance de Hargreaves', periodo: 'Promedio de varios años', escala: 'Cuadro de ~50 km; promedio de las parcelas evaluadas de la zona', tipo: 'estimado' },
  { indicador: 'Riesgo de helada', fuente: 'NASA POWER (mínima media mensual)', periodo: 'Promedio de varios años', escala: 'Cuadro de ~50 km', tipo: 'estimado' },
  { indicador: 'Pendiente y erosión', fuente: FUENTE_TERRENO, periodo: 'Relieve (misión del año 2000)', escala: 'Celdas de 30 m en el centro de cada parcela', tipo: 'observado' },
  { indicador: 'NDVI y suelo desnudo', fuente: FUENTE_NDVI, periodo: 'Época y año elegidos', escala: 'Píxel de 250 m por parcela registrada (no cubre toda la zona)', tipo: 'observado' },
  { indicador: 'Adopción de rotaciones', fuente: 'Declarado por los agricultores en Poseidon', periodo: 'Desde el registro', escala: 'Productores con evaluación', tipo: 'declarado' },
  { indicador: 'Plagas y enfermedades', fuente: 'Técnicos de campo de Poseidon', periodo: 'Último año, incidencias activas', escala: 'Puntos georreferenciados', tipo: 'observado' },
];

export function registrarRutas(app, { sesion, ruta, error, texto, catalogoPorCodigo, resumir }) {
  const parcelaVisible = async (id, u) => {
    const p = await db.obtenerParcela(id);
    if (!p || !puedeVerParcela(u, p)) throw error(404, 'Parcela no encontrada');
    return p;
  };
  const parcelaPropia = async (id, u) => {
    const p = await db.obtenerParcela(id);
    if (!p || p.usuario_id !== u.id) throw error(404, 'Parcela no encontrada');
    return p;
  };
  const evaluacionVisible = async (id, u) => {
    const e = await db.obtenerEvaluacion(id);
    if (!e || !puedeVerParcela(u, e)) throw error(404, 'Evaluación no encontrada');
    return e;
  };

  // ---------- Parcelas (HU-USR-01, HU-OPT-01) ----------
  // ?alcance=asignadas (técnico) | todas (con ver_todas). Por defecto, las propias.
  app.get('/api/parcelas', sesion, ruta(async (req, res) => {
    const u = req.usuario, { alcance } = req.query;
    const filtro = alcance === 'todas' && verTodas(u) ? {} : alcance === 'asignadas' ? { tecnicoId: u.id } : { usuarioId: u.id };
    const porCodigo = await catalogoPorCodigo();
    res.json({
      parcelas: (await db.listarParcelas(filtro)).map((p) => vistaParcela(p, porCodigo)),
      etapas: ETAPAS, riegos: RIEGOS, zonas: ZONAS,
    });
  }));

  // Cuerpo: { nombre, lat, lon | perimetro: [[lat, lon], ...], superficie_ha?, cultivo_actual?, etapa?, riego? }
  // ?validar=1 devuelve el resumen para confirmar, sin guardar.
  app.post('/api/parcelas', sesion, requierePermiso('evaluar'), ruta(async (req, res) => {
    const porCodigo = await catalogoPorCodigo();
    const { datos, avisos, superficie_medida_ha } = leerRegistro(req.body || {}, porCodigo, texto);
    if (req.query.validar === '1') {
      return res.json({
        resumen: {
          ...datos, superficie_ha: datos.superficie, superficie_medida_ha, zona: zonaDe(datos.lat, datos.lon),
          cultivo_nombre: datos.cultivo ? porCodigo.get(datos.cultivo).nombre : null,
          etapa_texto: ETAPAS[datos.etapa] || null, riego_texto: RIEGOS[datos.riego] || null,
        },
        avisos,
      });
    }
    if ((await db.listarParcelas({ usuarioId: req.usuario.id })).length >= 200) throw error(400, 'Llegó al máximo de parcelas registradas');
    const id = await db.crearParcela({ usuarioId: req.usuario.id, ...datos });
    const p = await prepararParcela(await db.obtenerParcela(id));
    res.status(201).json({ id, codigo: codigoParcela(id), parcela: vistaParcela(p, porCodigo), avisos, nota: NOTA_RESOLUCION });
  }));

  // Corrige los datos declarados (no la ubicación: para otro lugar se registra otra parcela).
  app.patch('/api/parcelas/:id', sesion, requierePermiso('evaluar'), ruta(async (req, res) => {
    const p = await parcelaPropia(req.params.id, req.usuario);
    const b = req.body || {};
    const actual = { nombre: p.nombre, superficie_ha: p.superficie_ha, cultivo_actual: p.cultivo_actual, etapa: p.etapa, riego: p.riego };
    const { datos, avisos } = leerRegistro({ ...actual, ...b, lat: p.lat, lon: p.lon, perimetro: p.perimetro }, await catalogoPorCodigo(), texto);
    await db.actualizarParcela(p.id, {
      nombre: datos.nombre, superficie_ha: datos.superficie, cultivo_actual: datos.cultivo, etapa: datos.etapa, riego: datos.riego,
    });
    res.json({ ok: true, avisos });
  }));

  // Ficha de la parcela: lo que declaró el agricultor, lo que aportan NASA y GAMC, y las observaciones de campo.
  app.get('/api/parcelas/:id', sesion, ruta(async (req, res) => {
    let p = await parcelaVisible(req.params.id, req.usuario);
    p = await Promise.race([completarTerreno(p), espera(5000, p)]);
    const { cultivos } = await db.getCultivos();
    const porCodigo = new Map(cultivos.map((c) => [c.codigo, c]));
    const [evaluaciones, ciclos, puntos, visitas, incidencias, base] = await Promise.all([
      db.listarEvaluaciones({ parcelaId: p.id }), db.listarCiclos(p.id), db.ndviDe(p.id), db.listarVisitas({ parcelaId: p.id }),
      db.listarIncidencias({ desde: new Date(Date.now() - VIGENCIA_DIAS * 864e5) }), climatologia(p.lat, p.lon),
    ]);
    const validaciones = await db.listarValidaciones({ evaluacionIds: evaluaciones.map((e) => e.id) });
    const resumen = resumenAnual(puntos);
    const terreno = fichaTerreno(p, cultivos);
    const gamc = capaGamc();
    res.json({
      parcela: vistaParcela(p, porCodigo),
      terreno,
      clima: { fuente: base.fuente, meses: indicadoresMensuales(p.lat, base), consultado_en: new Date() },
      ndvi: {
        disponible: ndviDisponible(), estado: estadoNdvi(p.id), resumen, tendencia: tendencia(resumen), compuestos: puntos.length,
        ultimo: puntos.at(-1) || null, actualizado_en: p.ndvi_en, fuente: FUENTE_NDVI, umbral_desnudo: SUELO_DESNUDO,
        nota: 'El NDVI mide el verdor de un cuadro de 250 m, que suele abarcar más que la parcela. Es un indicio de cobertura y vigor, no un análisis de suelo.',
      },
      ciclos: ciclos.map((c) => ({ id: c.id, anio: c.anio, cultivo: c.cultivo, cultivo_nombre: porCodigo.get(c.cultivo)?.nombre || c.cultivo, rendimiento: c.rendimiento, nota: c.nota }))
        .sort((a, b) => b.anio - a.anio || b.id - a.id),
      evaluaciones: evaluaciones.map((e) => ({
        id: e.id, creado_en: e.creado_en, estado: e.estado, nota_tecnico: e.nota_tecnico, revisor: e.revisor, adoptada: e.adoptada,
        rotacion: e.resultado[0].nombres, puntaje: e.resultado[0].puntaje, riego_mm: e.resultado[0].evidencia.deficit_agua_mm,
        adoptada_nombres: e.adoptada ? e.resultado.find((s) => s.tipo === e.adoptada)?.nombres || null : null,
      })),
      visitas: visitas.map((v) => ({ id: v.id, fecha: v.fecha, tecnico: v.tecnico, observaciones: v.observaciones })),
      incidencias_cerca: incidencias
        .map((i) => ({ id: i.id, tipo: i.tipo, agente: i.agente, cultivo: i.cultivo, severidad: i.severidad, estado: i.estado, creado_en: i.creado_en, distancia_km: Math.round(distanciaKm(p.lat, p.lon, i.lat, i.lon) * 10) / 10 }))
        .filter((i) => i.distancia_km <= RADIO_KM).sort((a, b) => a.distancia_km - b.distancia_km),
      validaciones: validaciones.map((v) => ({ id: v.id, evaluacion_id: v.evaluacion_id, estrategia: v.estrategia, semillas: v.semillas, observacion: v.observacion, tecnico: v.tecnico, creado_en: v.creado_en })),
      // De dónde sale cada dato y qué falta (HU-OPT-01)
      fuentes: [
        { origen: 'agricultor', dato: 'Ubicación, superficie, cultivo, etapa y riego', disponible: true, fecha: p.creado_en },
        { origen: 'nasa', dato: 'Clima típico (NASA POWER)', disponible: base.fuente === 'nasa-power', fecha: new Date(), limitacion: base.fuente === 'nasa-power' ? null : 'Sin conexión con NASA POWER: se muestra un clima de demostración de Cochabamba.' },
        { origen: 'nasa', dato: `Pendiente y elevación (${FUENTE_TERRENO})`, disponible: terreno.disponible, fecha: p.terreno_en, limitacion: terreno.disponible ? null : terreno.motivo },
        { origen: 'nasa', dato: 'Vegetación NDVI (MODIS)', disponible: puntos.length > 0, fecha: p.ndvi_en, limitacion: puntos.length ? null : ndviDisponible() ? 'Aún no hay NDVI guardado: la consulta a MODIS tarda unos minutos.' : 'La consulta de NDVI está desactivada en el servidor.' },
        { origen: 'gamc', dato: 'Límites distritales y capas municipales', disponible: hayDistritos() || gamc.configurado, fecha: null, limitacion: hayDistritos() || gamc.configurado ? null : 'Capas del GAMC no configuradas: la zona es el municipio más cercano (aproximado).' },
      ],
      nota: NOTA_RESOLUCION,
    });
  }));

  // Historial de cosechas (HU-USR-02). Cuerpo: { anio, cultivo, rendimiento? (qq/ha), nota? }
  app.post('/api/parcelas/:id/ciclos', sesion, requierePermiso('evaluar'), ruta(async (req, res) => {
    const p = await parcelaPropia(req.params.id, req.usuario);
    const b = req.body || {};
    const anio = Number(b.anio);
    if (!Number.isInteger(anio) || anio < 1990 || anio > new Date().getFullYear() + 1) throw error(400, 'Año de la campaña no válido');
    if (!(await catalogoPorCodigo()).has(b.cultivo)) throw error(400, 'Cultivo desconocido');
    let rendimiento = null;
    if (b.rendimiento !== undefined && b.rendimiento !== null && b.rendimiento !== '') {
      rendimiento = Math.round(Number(b.rendimiento) * 100) / 100;
      if (!(rendimiento > 0 && rendimiento <= 5000)) throw error(400, 'Rendimiento no válido (quintales por hectárea)');
    }
    if ((await db.listarCiclos(p.id)).length >= 80) throw error(400, 'Esta parcela ya tiene demasiados ciclos registrados');
    const id = await db.crearCiclo({ parcelaId: p.id, anio, cultivo: b.cultivo, rendimiento, nota: texto(b.nota, 300) || null });
    res.status(201).json({ id });
  }));

  app.delete('/api/parcelas/:id/ciclos/:ciclo', sesion, requierePermiso('evaluar'), ruta(async (req, res) => {
    const p = await parcelaPropia(req.params.id, req.usuario);
    if (!(await db.borrarCiclo(req.params.ciclo, p.id))) throw error(404, 'Ciclo no encontrado');
    res.json({ ok: true });
  }));

  // Vuelve a pedir el NDVI que falte (en segundo plano).
  app.post('/api/parcelas/:id/ndvi', sesion, ruta(async (req, res) => {
    const p = await parcelaVisible(req.params.id, req.usuario);
    res.json(encolarNdvi(p));
  }));

  // Asigna la parcela a un técnico (o la deja sin asignar con tecnico_id: null).
  app.patch('/api/parcelas/:id/asignacion', sesion, requierePermiso('asignar'), ruta(async (req, res) => {
    const p = await db.obtenerParcela(req.params.id);
    if (!p) throw error(404, 'Parcela no encontrada');
    const id = req.body?.tecnico_id ?? null;
    let tecnico = null;
    if (id !== null) {
      tecnico = await db.usuarioPorId(id);
      if (!tecnico || !tecnico.activo || !(await db.permisosDeRol(tecnico.rol)).includes('revisar')) throw error(400, 'Elija un técnico activo');
    }
    await db.actualizarParcela(p.id, { tecnico_id: tecnico ? tecnico.id : null });
    await db.auditar({ actor: req.usuario, accion: 'parcela.asignada', objeto: `${codigoParcela(p.id)} ${p.nombre}`, detalle: { antes: p.tecnico, ahora: tecnico?.nombre || null } });
    res.json({ ok: true });
  }));

  // Resumen numérico para el modo de bajo consumo (HU-USR-06): cada parcela con su última comparación, sin mapas.
  app.get('/api/resumen', sesion, requierePermiso('evaluar'), ruta(async (req, res) => {
    const [parcelas, evaluaciones] = await Promise.all([
      db.listarParcelas({ usuarioId: req.usuario.id }), db.listarEvaluaciones({ usuarioId: req.usuario.id }),
    ]);
    const ultima = new Map();
    for (const e of evaluaciones) if (!ultima.has(e.parcela_id)) ultima.set(e.parcela_id, e);
    res.json(parcelas.map((p) => {
      const e = ultima.get(p.id);
      return {
        id: p.id, codigo: codigoParcela(p.id), nombre: p.nombre, zona: zonaDe(p.lat, p.lon),
        evaluacion: e ? {
          id: e.id, creado_en: e.creado_en, estado: e.estado, adoptada: e.adoptada, fuente_clima: e.fuente_clima,
          estrategias: e.resultado.map((s) => ({
            tipo: s.tipo, titulo: s.titulo, nombres: s.nombres, puntaje: s.puntaje, puntajes: s.puntajes,
            riego_mm: s.evidencia.deficit_agua_mm, suelo_desnudo: s.evidencia.meses_suelo_desnudo,
            ahorro_agua_pct: s.evidencia.ahorro_agua_pct ?? null, riesgos: s.riesgos.length,
          })),
        } : null,
      };
    }));
  }));

  // El agricultor marca la estrategia que decidió aplicar (HU-MON-03). Cuerpo: { estrategia: 'actual'|'ajuste'|'cambio'|null }
  app.patch('/api/evaluaciones/:id/adopcion', sesion, requierePermiso('evaluar'), ruta(async (req, res) => {
    const e = await db.obtenerEvaluacion(req.params.id);
    if (!e || e.usuario_id !== req.usuario.id) throw error(404, 'Evaluación no encontrada');
    const estrategia = req.body?.estrategia ?? null;
    if (estrategia !== null && !e.resultado.some((s) => s.tipo === estrategia)) throw error(400, 'Estrategia no válida');
    await db.marcarAdopcion(e.id, estrategia);
    res.json({ ok: true, adoptada: estrategia });
  }));

  // ---------- Visitas de asistencia técnica (HU-OPT-03) ----------
  async function visitasDe(req) {
    const u = req.usuario, { desde, hasta } = req.query;
    if ((desde && !FECHA.test(desde)) || (hasta && !FECHA.test(hasta))) throw error(400, 'Fechas no válidas (AAAA-MM-DD)');
    const todas = req.query.todas === '1' && verTodas(u);
    const tecnico = todas && req.query.tecnico ? Number(req.query.tecnico) : null;
    const lista = await db.listarVisitas(todas ? (tecnico ? { tecnicoId: tecnico } : {}) : { tecnicoId: u.id });
    return lista.filter((v) => (!desde || v.fecha >= desde) && (!hasta || v.fecha <= hasta))
      .map((v) => ({
        id: v.id, fecha: v.fecha, tecnico_id: v.tecnico_id, tecnico: v.tecnico, agricultor_id: v.agricultor_id, agricultor: v.agricultor,
        parcela_id: v.parcela_id, parcela: v.parcela, zona: v.lat === null ? null : zonaDe(v.lat, v.lon), observaciones: v.observaciones,
      }));
  }

  app.get('/api/visitas', sesion, requierePermiso('asistencia', 'ver_todas'), ruta(async (req, res) => {
    const visitas = await visitasDe(req);
    const cuenta = (clave) => Object.entries(visitas.reduce((a, v) => ({ ...a, [clave(v)]: (a[clave(v)] || 0) + 1 }), {}))
      .map(([nombre, n]) => ({ nombre, n })).sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre));
    res.json({
      visitas,
      resumen: {
        total: visitas.length,
        agricultores: new Set(visitas.map((v) => v.agricultor_id)).size,
        parcelas: new Set(visitas.map((v) => v.parcela_id).filter(Boolean)).size,
        por_mes: cuenta((v) => v.fecha.slice(0, 7)).sort((a, b) => a.nombre.localeCompare(b.nombre)),
        por_zona: cuenta((v) => v.zona || 'Sin parcela'),
        por_tecnico: cuenta((v) => v.tecnico || 'Sin nombre'),
      },
    });
  }));

  // Cuerpo: { parcela_id, fecha: 'AAAA-MM-DD', observaciones }. El agricultor visitado es el dueño de la parcela.
  app.post('/api/visitas', sesion, requierePermiso('asistencia'), ruta(async (req, res) => {
    const b = req.body || {};
    const p = await parcelaVisible(b.parcela_id, req.usuario);
    if (!FECHA.test(String(b.fecha)) || Number.isNaN(Date.parse(b.fecha))) throw error(400, 'Fecha de la visita no válida');
    if (b.fecha > new Date(Date.now() + 864e5).toISOString().slice(0, 10)) throw error(400, 'La fecha de la visita no puede ser futura');
    const observaciones = texto(b.observaciones, 2000);
    if (observaciones.length < 10) throw error(400, 'Describa el asesoramiento en al menos 10 caracteres');
    const id = await db.crearVisita({ tecnicoId: req.usuario.id, parcelaId: p.id, agricultorId: p.usuario_id, fecha: b.fecha, observaciones });
    res.status(201).json({ id });
  }));

  app.get('/api/visitas/exportar', sesion, requierePermiso('asistencia', 'ver_todas'), ruta(async (req, res) => {
    const visitas = await visitasDe(req);
    const nombre = `visitas-${req.query.desde || 'inicio'}-a-${req.query.hasta || hoy()}.csv`;
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${nombre}"` });
    res.send(csv([['fecha', 'Fecha'], ['tecnico', 'Técnico'], ['agricultor', 'Agricultor visitado'], ['parcela', 'Parcela'], ['zona', 'Zona o distrito'], ['observaciones', 'Observaciones de asesoramiento']], visitas));
  }));

  // ---------- Validación local de las estrategias (HU-OPT-04) ----------
  // Cuerpo: { estrategia: 'actual'|'ajuste'|'cambio', semillas?: disponible|limitada|no_disponible, observacion }
  app.post('/api/evaluaciones/:id/validaciones', sesion, requierePermiso('asistencia'), ruta(async (req, res) => {
    const e = await evaluacionVisible(req.params.id, req.usuario);
    const b = req.body || {};
    if (!e.resultado.some((s) => s.tipo === b.estrategia)) throw error(400, 'Estrategia no válida');
    const semillas = b.semillas ? b.semillas : null;
    if (semillas && !Object.hasOwn(SEMILLAS, semillas)) throw error(400, 'Disponibilidad de semillas no válida');
    const observacion = texto(b.observacion, 1000);
    if (observacion.length < 5) throw error(400, 'Escriba la observación local');
    const id = await db.crearValidacion({ evaluacionId: e.id, estrategia: b.estrategia, semillas, observacion, tecnicoId: req.usuario.id });
    res.status(201).json({ id });
  }));

  // Historial de validaciones, con su distrito. ?todas=1 (con ver_todas) incluye las de todos los técnicos.
  app.get('/api/validaciones', sesion, requierePermiso('asistencia', 'ver_todas'), ruta(async (req, res) => {
    const u = req.usuario, todas = req.query.todas === '1' && verTodas(u);
    const validaciones = await db.listarValidaciones(todas ? {} : { tecnicoId: u.id });
    const evaluaciones = new Map((await db.listarEvaluaciones(verTodas(u) ? {} : { tecnicoId: u.id })).map((e) => [e.id, e]));
    const lista = validaciones.map((v) => {
      const e = evaluaciones.get(v.evaluacion_id);
      const s = e?.resultado.find((x) => x.tipo === v.estrategia);
      return {
        id: v.id, creado_en: v.creado_en, tecnico: v.tecnico, evaluacion_id: v.evaluacion_id, estrategia: v.estrategia,
        rotacion: s?.nombres || null, semillas: v.semillas, semillas_texto: SEMILLAS[v.semillas] || null, observacion: v.observacion,
        parcela: e?.parcela || null, agricultor: e?.cliente || null, zona: e ? zonaDe(e.lat, e.lon) : 'Sin acceso a la parcela',
      };
    });
    const porZona = {};
    for (const v of lista) (porZona[v.zona] ||= []).push(v);
    res.json({
      validaciones: lista, semillas: SEMILLAS,
      por_zona: Object.entries(porZona).map(([zona, vs]) => ({ zona, total: vs.length, sin_semilla: vs.filter((v) => v.semillas === 'no_disponible').length }))
        .sort((a, b) => b.total - a.total || a.zona.localeCompare(b.zona)),
    });
  }));

  // ---------- Auditoría (HU-ADM-01) ----------
  app.get('/api/auditoria', sesion, requierePermiso('usuarios'), ruta(async (_req, res) => res.json(await db.listarAuditoria(300))));

  // ---------- Monitoreo regional (HU-MON-01 a 04) ----------
  async function panorama(req) {
    const detalle = verTodas(req.usuario);
    const [crudas, parcelas, usuarios, recientes] = await Promise.all([
      db.listarEvaluaciones(), db.listarParcelas(), db.listarUsuarios(),
      db.listarIncidencias({ desde: new Date(Date.now() - VIGENCIA_DIAS * 864e5) }),
    ]);
    const incidencias = recientes.filter((i) => i.estado === 'activa');
    const ndvi = await db.ndviDe(parcelas.map((p) => p.id));
    const agregado = agregarPorZona({ parcelas, evaluaciones: crudas, ndvi, incidencias, periodo: { anio: req.query.anio, epoca: req.query.epoca } });
    return { detalle, crudas, parcelas, usuarios, incidencias, agregado };
  }

  // Sin "ver_todas" solo devuelve agregados por zona; con él añade el detalle por parcela.
  app.get('/api/monitoreo', sesion, requierePermiso('reportes'), ruta(async (req, res) => {
    const { detalle, crudas, parcelas, usuarios, incidencias, agregado } = await panorama(req);
    const evaluaciones = crudas.map(resumir);
    const alertas = [];
    if (detalle) {
      for (const e of evaluaciones) {
        if (e.resumen.deficit_agua_mm > 400) alertas.push({ id: e.id, parcela: e.parcela, tipo: 'agua', texto: `Déficit de agua alto: ${e.resumen.deficit_agua_mm} mm por campaña` });
        for (const h of e.resumen.heladas) alertas.push({ id: e.id, parcela: e.parcela, tipo: 'helada', texto: `${h.cultivo} expuesto a helada en ${h.meses.join(', ')}` });
      }
    }
    for (const i of incidencias.filter((x) => x.severidad === 'alta')) {
      alertas.push({ id: `i${i.id}`, parcela: `${i.agente} (${i.tipo})`, tipo: 'plaga', texto: `Severidad alta en ${zonaDe(i.lat, i.lon)}${i.cultivo ? `, cultivo: ${i.cultivo}` : ''}` });
    }
    const contar = (lista, campo) => lista.reduce((a, x) => ({ ...a, [x[campo]]: (a[x[campo]] || 0) + 1 }), {});
    res.json({
      totales: {
        evaluaciones: evaluaciones.length,
        pendientes: evaluaciones.filter((e) => e.estado === 'pendiente').length,
        clientes: new Set(parcelas.map((p) => p.usuario_id)).size,
        parcelas: parcelas.length,
        alertas: alertas.length,
        incidencias: incidencias.length,
        adopcion_pct: agregado.totales.adopcion_pct,
      },
      zonas: agregado.zonas,
      periodo_ndvi: agregado.periodo_ndvi,
      minimo_productores: MIN_PRODUCTORES,
      umbral_suelo_desnudo: SUELO_DESNUDO,
      usuarios_por_rol: contar(usuarios.filter((u) => u.activo), 'rol'),
      fuentes_clima: contar(evaluaciones, 'fuente_clima'),
      base_datos: db.modo(),
      alertas,
      detalle,
      evaluaciones: detalle ? evaluaciones : [],
      incidencias: incidencias.map((i) => ({
        id: i.id, tipo: i.tipo, agente: i.agente, cultivo: i.cultivo, severidad: i.severidad, creado_en: i.creado_en,
        lat: detalle ? i.lat : aproximar(i.lat), lon: detalle ? i.lon : aproximar(i.lon),
      })),
      capas: { gamc: capaGamc(), distritos: capaDistritos(), distritos_oficiales: hayDistritos(), centros: ZONAS },
      fuentes: FUENTES_REGIONALES,
    });
  }));

  // Listado exportable de distritos prioritarios por suelo desnudo (HU-MON-04). ?anio=&epoca=seca|humeda
  app.get('/api/monitoreo/suelo-desnudo.csv', sesion, requierePermiso('reportes'), ruta(async (req, res) => {
    const { agregado } = await panorama(req);
    const { anio, epoca } = agregado.periodo_ndvi;
    const filas = prioridadSueloDesnudo(agregado.zonas).map((z) => ({ ...z, periodo: `${epoca === 'seca' ? 'Época seca (jul-sep)' : 'Época húmeda (ene-mar)'} ${anio ?? ''}`.trim() }));
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="distritos-suelo-desnudo-${anio ?? 'sin-datos'}-${epoca}.csv"` });
    res.send(csv([['prioridad', 'Prioridad'], ['zona', 'Zona o distrito'], ['suelo_desnudo_pct', `% de parcelas con suelo desnudo (NDVI < ${SUELO_DESNUDO})`],
      ['ndvi_medio', 'NDVI medio'], ['parcelas_con_ndvi', 'Parcelas con dato'], ['superficie_ha', 'Superficie registrada (ha)'], ['periodo', 'Período']], filas));
  }));

  // Escenarios de estrés hídrico (HU-MON-02). ?lluvia=-20&temp=1.5
  let climaZonas = null; // climatología de cada zona; se consulta una vez
  app.get('/api/monitoreo/escenario', sesion, requierePermiso('reportes'), ruta(async (req, res) => {
    climaZonas ||= Promise.all(ZONAS.map(async (z) => {
      const base = await climatologia(z.lat, z.lon);
      return { ...z, clima: base, fuente: base.fuente };
    }));
    let zonas;
    try { zonas = await climaZonas; } catch (e) { climaZonas = null; throw e; }
    if (zonas.some((z) => z.fuente !== 'nasa-power')) climaZonas = null; // reintentar NASA POWER la próxima vez
    const r = simular(zonas, { lluviaPct: req.query.lluvia, tempC: req.query.temp });
    res.json({
      ...r, limites: LIMITES, niveles: NIVELES.map(({ clave, texto: t }) => ({ clave, texto: t })),
      fuente: {
        tipo: 'simulado', base: 'Clima típico de NASA POWER (promedio de varios años) en el centro de cada zona',
        metodo: 'Balance de agua de la campaña octubre-marzo para un cultivo de referencia (Hargreaves, Kc 0,9, 80 % de lluvia aprovechable)',
        escala: 'Cuadro de ~50 km de NASA POWER: las zonas que caen en el mismo cuadro muestran el mismo valor',
        aviso: 'Es un ejercicio de sensibilidad, no una proyección climática.',
      },
    });
  }));
}
