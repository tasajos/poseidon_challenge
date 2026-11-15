const BASE = import.meta.env.VITE_API_URL || '';
const CLAVE = 'poseidon_token';
const CLAVE_USUARIO = 'poseidon_usuario_actual';

let token = null;
try { token = sessionStorage.getItem(CLAVE) || localStorage.getItem(CLAVE); } catch { /* sin almacenamiento */ }

export const hayToken = () => Boolean(token);
export function setToken(nuevo, recordar = false) {
  token = nuevo;
  try {
    if (nuevo) {
      (recordar ? localStorage : sessionStorage).setItem(CLAVE, nuevo);
      (recordar ? sessionStorage : localStorage).removeItem(CLAVE);
    } else {
      sessionStorage.removeItem(CLAVE);
      localStorage.removeItem(CLAVE);
      sessionStorage.removeItem(CLAVE_USUARIO);
      localStorage.removeItem(CLAVE_USUARIO);
    }
  } catch { /* idem */ }
}

function guardarUsuarioCache(u) {
  try {
    if (u) localStorage.setItem(CLAVE_USUARIO, JSON.stringify(u));
  } catch { /* sin almacenamiento */ }
}

function leerUsuarioCache() {
  try {
    const raw = localStorage.getItem(CLAVE_USUARIO) || sessionStorage.getItem(CLAVE_USUARIO);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ---------- Datos y motor local de respaldo (cuando el backend no está activo) ----------
const CULTIVOS_LOCAL = [
  { codigo: 'papa', nombre: 'Papa', familia: 'Solanáceas', ciclo_dias: 150, mes_siembra: 10, kc: 0.90, tolerancia_helada: 0, fija_nitrogeno: false, raiz_profunda: false, forraje: false, valor_mercado: 3 },
  { codigo: 'maiz', nombre: 'Maíz', familia: 'Gramíneas', ciclo_dias: 160, mes_siembra: 10, kc: 0.90, tolerancia_helada: 0, fija_nitrogeno: false, raiz_profunda: true, forraje: true, valor_mercado: 2 },
  { codigo: 'haba', nombre: 'Haba', familia: 'Leguminosas', ciclo_dias: 180, mes_siembra: 8, kc: 0.85, tolerancia_helada: 2, fija_nitrogeno: true, raiz_profunda: false, forraje: false, valor_mercado: 2 },
  { codigo: 'tarwi', nombre: 'Tarwi', familia: 'Leguminosas', ciclo_dias: 210, mes_siembra: 10, kc: 0.80, tolerancia_helada: 1, fija_nitrogeno: true, raiz_profunda: true, forraje: false, valor_mercado: 1 },
  { codigo: 'quinua', nombre: 'Quinua', familia: 'Amarantáceas', ciclo_dias: 170, mes_siembra: 10, kc: 0.80, tolerancia_helada: 1, fija_nitrogeno: false, raiz_profunda: true, forraje: false, valor_mercado: 3 },
  { codigo: 'trigo', nombre: 'Trigo', familia: 'Gramíneas', ciclo_dias: 150, mes_siembra: 12, kc: 0.85, tolerancia_helada: 1, fija_nitrogeno: false, raiz_profunda: false, forraje: false, valor_mercado: 2 },
  { codigo: 'cebada', nombre: 'Cebada', familia: 'Gramíneas', ciclo_dias: 140, mes_siembra: 12, kc: 0.85, tolerancia_helada: 2, fija_nitrogeno: false, raiz_profunda: false, forraje: true, valor_mercado: 1 },
  { codigo: 'avena', nombre: 'Avena forrajera', familia: 'Gramíneas', ciclo_dias: 120, mes_siembra: 12, kc: 0.85, tolerancia_helada: 2, fija_nitrogeno: false, raiz_profunda: false, forraje: true, valor_mercado: 1 },
  { codigo: 'alfalfa', nombre: 'Alfalfa', familia: 'Leguminosas', ciclo_dias: 365, mes_siembra: 10, kc: 0.95, tolerancia_helada: 2, fija_nitrogeno: true, raiz_profunda: true, forraje: true, valor_mercado: 2 },
  { codigo: 'cebolla', nombre: 'Cebolla', familia: 'Aliáceas', ciclo_dias: 150, mes_siembra: 4, kc: 0.90, tolerancia_helada: 1, fija_nitrogeno: false, raiz_profunda: false, forraje: false, valor_mercado: 3 },
];

const CLIMA_DEMO = [
  { mes: 'Ene', lluvia_mm: 118, et0_mm: 132, tmin: 11.8, helada: 'baja', seco: false },
  { mes: 'Feb', lluvia_mm: 98, et0_mm: 116, tmin: 11.5, helada: 'baja', seco: false },
  { mes: 'Mar', lluvia_mm: 68, et0_mm: 124, tmin: 10.6, helada: 'baja', seco: false },
  { mes: 'Abr', lluvia_mm: 22, et0_mm: 112, tmin: 8.2, helada: 'baja', seco: true },
  { mes: 'May', lluvia_mm: 5, et0_mm: 104, tmin: 4.5, helada: 'media', seco: true },
  { mes: 'Jun', lluvia_mm: 2, et0_mm: 92, tmin: 1.8, helada: 'alta', seco: true },
  { mes: 'Jul', lluvia_mm: 2, et0_mm: 98, tmin: 1.6, helada: 'alta', seco: true },
  { mes: 'Ago', lluvia_mm: 6, et0_mm: 116, tmin: 3.8, helada: 'media', seco: true },
  { mes: 'Sep', lluvia_mm: 14, et0_mm: 130, tmin: 6.9, helada: 'baja', seco: true },
  { mes: 'Oct', lluvia_mm: 32, et0_mm: 148, tmin: 9.6, helada: 'baja', seco: true },
  { mes: 'Nov', lluvia_mm: 54, et0_mm: 146, tmin: 11.2, helada: 'baja', seco: false },
  { mes: 'Dic', lluvia_mm: 96, et0_mm: 138, tmin: 11.8, helada: 'baja', seco: false },
];

const estadoLocal = {
  usuarios: [
    { id: 1, nombre: 'Administrador Demo', email: 'admin@poseidon.test', rol: 'administrador', activo: true, creado_en: '2026-10-01T12:00:00Z' },
    { id: 2, nombre: 'Técnico Demo', email: 'operativo@poseidon.test', rol: 'operativo', activo: true, creado_en: '2026-10-02T12:00:00Z' },
    { id: 3, nombre: 'Agricultor Demo', email: 'cliente@poseidon.test', rol: 'cliente', activo: true, creado_en: '2026-10-03T12:00:00Z' },
    { id: 4, nombre: 'Monitoreo Demo', email: 'monitoreo@poseidon.test', rol: 'monitoreo', activo: true, creado_en: '2026-10-04T12:00:00Z' },
  ],
  evaluaciones: null,
};

function armarEstrategiasLocal(codigos) {
  const nombresDe = (arr) => arr.map((k) => CULTIVOS_LOCAL.find((c) => c.codigo === k)?.nombre || k);
  const detalleDe = (arr) => arr.map((k) => {
    const c = CULTIVOS_LOCAL.find((x) => x.codigo === k) || CULTIVOS_LOCAL[0];
    return {
      codigo: c.codigo,
      nombre: c.nombre,
      siembra: 'Oct',
      cosecha: 'Mar',
      deficit_mm: Math.round(160 * c.kc),
      meses_helada: c.tolerancia_helada === 0 ? ['Jun'] : [],
    };
  });
  const conLeguminosa = codigos.includes('haba') || codigos.includes('tarwi') ? codigos : [...codigos.slice(0, 2), 'haba'];
  const cambioMayor = ['haba', 'quinua', 'avena'];

  return [
    {
      tipo: 'actual',
      titulo: 'Tu rotación actual',
      nombres: nombresDe(codigos),
      puntaje: 72,
      puntajes: { agua: 68, clima: 75, suelo: 66, ingreso: 78, forraje: 70 },
      porque: ['Mantiene los cultivos habituales de la finca.', 'Permite aprovechar la lluvia de octubre a marzo.'],
      evidencia: { deficit_agua_mm: 340, demanda_agua_mm: 620, meses_suelo_desnudo: 4 },
      detalle: detalleDe(codigos),
      riesgos: ['Alternar sin leguminosa agota gradualmente el nitrógeno disponible.'],
      vacios: ['No incluye análisis físico-químico de laboratorio del suelo local.'],
    },
    {
      tipo: 'ajuste',
      titulo: 'Ajuste recomendado',
      nombres: nombresDe(conLeguminosa),
      puntaje: 85,
      puntajes: { agua: 84, clima: 86, suelo: 88, ingreso: 82, forraje: 78 },
      porque: ['Incorpora leguminosa fijadora de nitrógeno.', 'Reduce el requerimiento de riego suplementario en época seca.'],
      evidencia: { deficit_agua_mm: 275, demanda_agua_mm: 560, meses_suelo_desnudo: 3 },
      detalle: detalleDe(conLeguminosa),
      riesgos: ['Vigilar drenaje en parcelas bajas durante enero y febrero.'],
      vacios: ['Validar densidad de siembra con el técnico operativo de la zona.'],
    },
    {
      tipo: 'cambio',
      titulo: 'Cambio mayor resiliente',
      nombres: nombresDe(cambioMayor),
      puntaje: 89,
      puntajes: { agua: 90, clima: 91, suelo: 92, ingreso: 84, forraje: 85 },
      porque: ['Maximiza cobertura vegetal y ahorro de agua.', 'Alta tolerancia a heladas invernales del valle.'],
      evidencia: { deficit_agua_mm: 220, demanda_agua_mm: 510, meses_suelo_desnudo: 2 },
      detalle: detalleDe(cambioMayor),
      riesgos: ['Requiere ajuste en calendario de cosecha y comercialización.'],
      vacios: ['Confirmar disponibilidad local de semilla certificada.'],
    },
  ];
}

function obtenerEvaluacionesLocales() {
  if (!estadoLocal.evaluaciones) {
    estadoLocal.evaluaciones = [
      {
        id: 1,
        usuario_id: 3,
        cliente: 'Agricultor Demo',
        parcela: 'Finca Tiquipaya',
        lat: -17.3945,
        lon: -66.1650,
        rotacion_actual: ['maiz', 'papa', 'haba'],
        prioridades: { agua: 4, suelo: 3, clima: 3, ingreso: 3, forraje: 1 },
        fuente_clima: 'demo',
        resultado: armarEstrategiasLocal(['maiz', 'papa', 'haba']),
        estado: 'pendiente',
        nota_tecnico: null,
        revisor: null,
        creado_en: new Date(Date.now() - 43200000).toISOString(),
      },
      {
        id: 2,
        usuario_id: 3,
        cliente: 'Agricultor Demo',
        parcela: 'Valle Bajo / Cochabamba',
        lat: -17.3810,
        lon: -66.1560,
        rotacion_actual: ['papa', 'haba'],
        prioridades: { agua: 4, suelo: 4, clima: 3, ingreso: 2, forraje: 1 },
        fuente_clima: 'demo',
        resultado: armarEstrategiasLocal(['papa', 'haba']),
        estado: 'pendiente',
        nota_tecnico: null,
        revisor: null,
        creado_en: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 3,
        usuario_id: 3,
        cliente: 'Agricultor Demo',
        parcela: 'Chacra Valle Central',
        lat: -17.3875,
        lon: -66.1445,
        rotacion_actual: ['quinua', 'haba'],
        prioridades: { agua: 5, suelo: 4, clima: 2, ingreso: 3, forraje: 2 },
        fuente_clima: 'demo',
        resultado: armarEstrategiasLocal(['quinua', 'haba']),
        estado: 'revisada',
        nota_tecnico: 'Se recomienda mantener la rotación con haba para fijar nitrógeno en el suelo y conservar la humedad.',
        revisor: 'Técnico Demo',
        creado_en: new Date(Date.now() - 172800000).toISOString(),
      },
    ];
  }
  return estadoLocal.evaluaciones;
}

function resumirLocal({ resultado, prioridades, ...e }) {
  const actual = resultado[0];
  const mejor = resultado.reduce((a, b) => (b.puntaje > a.puntaje ? b : a));
  return {
    ...e,
    resumen: {
      actual: { nombres: actual.nombres, puntaje: actual.puntaje },
      mejor: { titulo: mejor.titulo, nombres: mejor.nombres, puntaje: mejor.puntaje },
      deficit_agua_mm: actual.evidencia.deficit_agua_mm,
      heladas: actual.detalle.filter((d) => d.meses_helada.length).map((d) => ({ cultivo: d.nombre, meses: d.meses_helada })),
    },
  };
}

async function pedir(ruta, { method = 'GET', body } = {}) {
  const r = await fetch(BASE + ruta, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(datos.error || `Error ${r.status}`), { status: r.status });
  return datos;
}

async function conRespaldo(fnRemota, fnLocal) {
  try {
    return await fnRemota();
  } catch (err) {
    // Si el backend devuelve un error de validación de negocio (400 o 409), lo propagamos
    if (err.status === 400 || err.status === 409) throw err;
    return fnLocal(err);
  }
}

export const api = {
  login: (email, password) => conRespaldo(
    async () => {
      const res = await pedir('/api/auth/login', { method: 'POST', body: { email, password } });
      guardarUsuarioCache(res.usuario);
      return res;
    },
    (err) => {
      const correo = String(email || '').trim().toLowerCase();
      const u = estadoLocal.usuarios.find((x) => x.email === correo && x.activo);
      if (!u || !password) throw new Error(err?.message && err.status === 401 ? err.message : 'Correo o contraseña incorrectos');
      const usuario = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
      guardarUsuarioCache(usuario);
      return { token: `local-${u.id}-${Date.now()}`, usuario };
    },
  ),

  yo: () => conRespaldo(
    async () => {
      const u = await pedir('/api/auth/yo');
      guardarUsuarioCache(u);
      return u;
    },
    () => {
      const cache = leerUsuarioCache();
      if (cache) return cache;
      throw new Error('Sesión no activa');
    },
  ),

  cultivos: () => conRespaldo(
    () => pedir('/api/cultivos'),
    () => ({ origen: 'archivo', cultivos: CULTIVOS_LOCAL }),
  ),

  evaluar: (cuerpo) => conRespaldo(
    () => pedir('/api/evaluar', { method: 'POST', body: cuerpo }),
    () => {
      const lista = obtenerEvaluacionesLocales();
      const u = leerUsuarioCache() || estadoLocal.usuarios[2];
      const estrategias = armarEstrategiasLocal(cuerpo.rotacion || ['maiz', 'papa']);
      const nueva = {
        id: Math.max(0, ...lista.map((x) => x.id)) + 1,
        usuario_id: u.id,
        cliente: u.nombre,
        parcela: String(cuerpo.nombre || '').trim() || 'Finca Tiquipaya',
        lat: Number(cuerpo.lat) || -17.338,
        lon: Number(cuerpo.lon) || -66.2158,
        rotacion_actual: cuerpo.rotacion || ['maiz', 'papa'],
        prioridades: cuerpo.prioridades || { agua: 4, suelo: 3, clima: 2, ingreso: 3, forraje: 1 },
        fuente_clima: 'demo',
        resultado: estrategias,
        estado: 'pendiente',
        nota_tecnico: null,
        revisor: null,
        creado_en: new Date().toISOString(),
      };
      lista.unshift(nueva);
      return { id: nueva.id, fuenteClima: 'demo', clima: CLIMA_DEMO, estrategias };
    },
  ),

  evaluaciones: () => conRespaldo(
    () => pedir('/api/evaluaciones'),
    () => obtenerEvaluacionesLocales().map(resumirLocal),
  ),

  evaluacion: (id) => conRespaldo(
    () => pedir(`/api/evaluaciones/${id}`),
    () => obtenerEvaluacionesLocales().find((x) => x.id === Number(id)) || obtenerEvaluacionesLocales()[0],
  ),

  revisar: (id, nota) => conRespaldo(
    () => pedir(`/api/evaluaciones/${id}/revision`, { method: 'PATCH', body: { nota } }),
    () => {
      const ev = obtenerEvaluacionesLocales().find((x) => x.id === Number(id));
      const u = leerUsuarioCache();
      if (ev) {
        ev.estado = 'revisada';
        ev.nota_tecnico = nota;
        ev.revisor = u?.nombre || 'Técnico Demo';
      }
      return { ok: true };
    },
  ),

  monitoreo: () => conRespaldo(
    () => pedir('/api/monitoreo'),
    () => {
      const evaluaciones = obtenerEvaluacionesLocales().map(resumirLocal);
      const alertas = [
        {
          id: 1,
          parcela: 'Finca Tiquipaya',
          tipo: 'agua',
          texto: 'Vigilancia agroclimática activa en Cochabamba: verificar humedad del suelo antes de la próxima campaña.',
        },
      ];
      return {
        totales: {
          evaluaciones: evaluaciones.length,
          pendientes: evaluaciones.filter((e) => e.estado === 'pendiente').length,
          clientes: 1,
          alertas: alertas.length,
        },
        usuarios_por_rol: { administrador: 1, operativo: 1, cliente: 1, monitoreo: 1 },
        fuentes_clima: { demo: evaluaciones.length },
        base_datos: 'memoria',
        alertas,
        evaluaciones,
      };
    },
  ),

  usuarios: () => conRespaldo(
    () => pedir('/api/usuarios'),
    () => [...estadoLocal.usuarios],
  ),

  crearUsuario: (cuerpo) => conRespaldo(
    () => pedir('/api/usuarios', { method: 'POST', body: cuerpo }),
    () => {
      const id = Math.max(0, ...estadoLocal.usuarios.map((u) => u.id)) + 1;
      estadoLocal.usuarios.push({
        id,
        nombre: cuerpo.nombre,
        email: String(cuerpo.email || '').trim().toLowerCase(),
        rol: cuerpo.rol || 'cliente',
        activo: true,
        creado_en: new Date().toISOString(),
      });
      return { id };
    },
  ),

  actualizarUsuario: (id, cambios) => conRespaldo(
    () => pedir(`/api/usuarios/${id}`, { method: 'PATCH', body: cambios }),
    () => {
      const u = estadoLocal.usuarios.find((x) => x.id === Number(id));
      if (u) Object.assign(u, cambios);
      return { ok: true };
    },
  ),
};
