const BASE = import.meta.env.VITE_API_URL || '';
const CLAVE = 'poseidon_token';

let token = null;
try { token = sessionStorage.getItem(CLAVE); } catch { /* sin almacenamiento */ }

export const hayToken = () => Boolean(token);
export function setToken(nuevo) {
  token = nuevo;
  try {
    if (nuevo) sessionStorage.setItem(CLAVE, nuevo);
    else { sessionStorage.removeItem(CLAVE); sessionStorage.removeItem('poseidon_resumen'); }
  } catch { /* idem */ }
}

async function pedir(ruta, { method = 'GET', body } = {}) {
  const r = await fetch(BASE + ruta, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(datos.error || `Error ${r.status}`), { status: r.status, campo: datos.campo });
  return datos;
}

// Fotos: se suben como binario (una por petición) y se leen con el token, porque la ruta exige sesión.
async function enviarFoto(ruta, blob) {
  const r = await fetch(BASE + ruta, {
    method: 'POST',
    headers: { 'Content-Type': blob.type, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: blob,
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(datos.error || `Error ${r.status}`), { status: r.status });
  return datos;
}

async function leerFoto(ruta) {
  const r = await fetch(BASE + ruta, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`);
  return r.blob();
}

// Descarga un archivo que exige sesión (CSV): se pide con el token y se guarda con el nombre que da el servidor.
async function descargar(ruta, nombrePorDefecto) {
  const r = await fetch(BASE + ruta, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`);
  const nombre = /filename="([^"]+)"/.exec(r.headers.get('Content-Disposition') || '')?.[1] || nombrePorDefecto;
  const url = URL.createObjectURL(await r.blob());
  const enlace = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return nombre;
}

// { cultivos: ['papa'], verificada: true, agua: '' } → "cultivos=papa&verificada=1"
const consulta = (filtros) => new URLSearchParams(Object.entries(filtros)
  .filter(([, v]) => v !== '' && v !== false && v != null && !(Array.isArray(v) && !v.length))
  .map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v === true ? '1' : String(v)])).toString();

export const api = {
  login: (email, password) => pedir('/api/auth/login', { method: 'POST', body: { email, password } }),
  yo: () => pedir('/api/auth/yo'),
  cultivos: () => pedir('/api/cultivos'),
  evaluar: (cuerpo) => pedir('/api/evaluar', { method: 'POST', body: cuerpo }),
  evaluaciones: () => pedir('/api/evaluaciones'),
  misEvaluaciones: () => pedir('/api/evaluaciones?propias=1'),
  evaluacion: (id) => pedir(`/api/evaluaciones/${id}`),
  revisar: (id, nota) => pedir(`/api/evaluaciones/${id}/revision`, { method: 'PATCH', body: { nota } }),
  monitoreo: () => pedir('/api/monitoreo'),
  usuarios: () => pedir('/api/usuarios'),
  crearUsuario: (cuerpo) => pedir('/api/usuarios', { method: 'POST', body: cuerpo }),
  actualizarUsuario: (id, cambios) => pedir(`/api/usuarios/${id}`, { method: 'PATCH', body: cambios }),
  permisos: () => pedir('/api/permisos'),
  guardarPermisos: (rol, permisos) => pedir(`/api/permisos/${rol}`, { method: 'PUT', body: { permisos } }),
  sistema: () => pedir('/api/sistema'),
  respaldos: () => pedir('/api/respaldos'),
  crearRespaldo: () => pedir('/api/respaldos', { method: 'POST' }),
  restaurar: (nombre) => pedir(`/api/respaldos/${encodeURIComponent(nombre)}/restaurar`, { method: 'POST', body: { confirmacion: nombre } }),
  alertas: () => pedir('/api/alertas'),
  guardarPreferencias: (p) => pedir('/api/alertas/preferencias', { method: 'PUT', body: p }),
  suscribir: (s) => pedir('/api/alertas/suscripcion', { method: 'POST', body: s }),
  desuscribir: (endpoint) => pedir('/api/alertas/suscripcion', { method: 'DELETE', body: { endpoint } }),
  alertaPrueba: () => pedir('/api/alertas/prueba', { method: 'POST' }),
  revisarAlertas: () => pedir('/api/alertas/revisar', { method: 'POST' }),
  // Oferta sostenible y solicitudes (HU-CLI-02, HU-CLI-03)
  misOfertas: () => pedir('/api/mis-ofertas'),
  publicarOferta: (cuerpo) => pedir('/api/ofertas', { method: 'POST', body: cuerpo }),
  cambiarOferta: (id, activa) => pedir(`/api/ofertas/${id}`, { method: 'PATCH', body: { activa } }),
  ofertas: (filtros = {}) => pedir(`/api/ofertas?${consulta(filtros)}`),
  solicitar: (cuerpo) => pedir('/api/solicitudes', { method: 'POST', body: cuerpo }),
  solicitudesEnviadas: () => pedir('/api/solicitudes/enviadas'),
  solicitudesRecibidas: () => pedir('/api/solicitudes/recibidas'),
  responderSolicitud: (id, cuerpo) => pedir(`/api/solicitudes/${id}/respuesta`, { method: 'PATCH', body: cuerpo }),
  retirarSolicitud: (id) => pedir(`/api/solicitudes/${id}/retirar`, { method: 'POST' }),
  // Incidencias de campo (HU-OPT-02)
  incidencias: () => pedir('/api/incidencias'),
  registrarIncidencia: (cuerpo) => pedir('/api/incidencias', { method: 'POST', body: cuerpo }),
  estadoIncidencia: (id, estado) => pedir(`/api/incidencias/${id}`, { method: 'PATCH', body: { estado } }),
  subirFoto: (id, blob) => enviarFoto(`/api/incidencias/${id}/fotos`, blob),
  foto: (id, fotoId) => leerFoto(`/api/incidencias/${id}/fotos/${fotoId}`),
  // Parcelas, historial y terreno (HU-USR-01, 02, 05, 06; HU-OPT-01)
  parcelas: (alcance) => pedir(`/api/parcelas${alcance ? `?alcance=${alcance}` : ''}`),
  validarParcela: (cuerpo) => pedir('/api/parcelas?validar=1', { method: 'POST', body: cuerpo }),
  registrarParcela: (cuerpo) => pedir('/api/parcelas', { method: 'POST', body: cuerpo }),
  corregirParcela: (id, cambios) => pedir(`/api/parcelas/${id}`, { method: 'PATCH', body: cambios }),
  parcela: (id) => pedir(`/api/parcelas/${id}`),
  agregarCiclo: (id, cuerpo) => pedir(`/api/parcelas/${id}/ciclos`, { method: 'POST', body: cuerpo }),
  borrarCiclo: (id, ciclo) => pedir(`/api/parcelas/${id}/ciclos/${ciclo}`, { method: 'DELETE' }),
  pedirNdvi: (id) => pedir(`/api/parcelas/${id}/ndvi`, { method: 'POST' }),
  asignarParcela: (id, tecnico_id) => pedir(`/api/parcelas/${id}/asignacion`, { method: 'PATCH', body: { tecnico_id } }),
  resumen: () => pedir('/api/resumen'),
  adoptar: (id, estrategia) => pedir(`/api/evaluaciones/${id}/adopcion`, { method: 'PATCH', body: { estrategia } }),
  // Asistencia técnica (HU-OPT-03, HU-OPT-04)
  visitas: (filtros = {}) => pedir(`/api/visitas?${consulta(filtros)}`),
  registrarVisita: (cuerpo) => pedir('/api/visitas', { method: 'POST', body: cuerpo }),
  exportarVisitas: (filtros = {}) => descargar(`/api/visitas/exportar?${consulta(filtros)}`, 'visitas.csv'),
  validar: (id, cuerpo) => pedir(`/api/evaluaciones/${id}/validaciones`, { method: 'POST', body: cuerpo }),
  validaciones: (todas) => pedir(`/api/validaciones${todas ? '?todas=1' : ''}`),
  // Administración (HU-ADM-01)
  aprobarUsuario: (id, aprobar) => pedir(`/api/usuarios/${id}/aprobacion`, { method: 'POST', body: { aprobar } }),
  auditoria: () => pedir('/api/auditoria'),
  // Monitoreo regional (HU-MON-01 a 04)
  monitoreoPeriodo: (filtros = {}) => pedir(`/api/monitoreo?${consulta(filtros)}`),
  escenario: (lluvia, temp) => pedir(`/api/monitoreo/escenario?lluvia=${lluvia}&temp=${temp}`),
  exportarSueloDesnudo: (filtros = {}) => descargar(`/api/monitoreo/suelo-desnudo.csv?${consulta(filtros)}`, 'distritos-suelo-desnudo.csv'),
};
