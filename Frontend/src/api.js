const BASE = import.meta.env.VITE_API_URL || '';

async function pedir(ruta, opciones) {
  const r = await fetch(BASE + ruta, opciones);
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error || `Error ${r.status}`);
  return datos;
}

export const getCultivos = () => pedir('/api/cultivos');
export const evaluar = (cuerpo) => pedir('/api/evaluar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
});
