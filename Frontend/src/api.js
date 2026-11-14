const BASE = import.meta.env.VITE_API_URL || '';
const CLAVE = 'poseidon_token';

let token = null;
try { token = sessionStorage.getItem(CLAVE); } catch { /* sin almacenamiento */ }

export const hayToken = () => Boolean(token);
export function setToken(nuevo) {
  token = nuevo;
  try { nuevo ? sessionStorage.setItem(CLAVE, nuevo) : sessionStorage.removeItem(CLAVE); } catch { /* idem */ }
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

export const api = {
  login: (email, password) => pedir('/api/auth/login', { method: 'POST', body: { email, password } }),
  yo: () => pedir('/api/auth/yo'),
  cultivos: () => pedir('/api/cultivos'),
  evaluar: (cuerpo) => pedir('/api/evaluar', { method: 'POST', body: cuerpo }),
  evaluaciones: () => pedir('/api/evaluaciones'),
  evaluacion: (id) => pedir(`/api/evaluaciones/${id}`),
  revisar: (id, nota) => pedir(`/api/evaluaciones/${id}/revision`, { method: 'PATCH', body: { nota } }),
  monitoreo: () => pedir('/api/monitoreo'),
  usuarios: () => pedir('/api/usuarios'),
  crearUsuario: (cuerpo) => pedir('/api/usuarios', { method: 'POST', body: cuerpo }),
  actualizarUsuario: (id, cambios) => pedir(`/api/usuarios/${id}`, { method: 'PATCH', body: cambios }),
};
