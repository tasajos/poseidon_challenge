import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api se redirige al backend (Backend/, puerto 3001).
// host: true expone el servidor en la red local (http://<ip-del-equipo>:5173);
// el backend no necesita exponerse porque el proxy lo alcanza desde este mismo equipo.
//
// Para mostrar la aplicación a alguien de afuera basta con reenviar el puerto 5173 con un túnel
// (VS Code: panel Puertos, visibilidad Pública). Vite rechaza los dominios que no conoce, por eso se
// permiten los de los túneles habituales; VITE_HOSTS agrega otros, separados por comas.
const TUNELES = ['.devtunnels.ms', '.trycloudflare.com', '.ngrok-free.app', '.ngrok.app', '.loca.lt'];
const permitidos = [...TUNELES, ...(process.env.VITE_HOSTS || '').split(',').map((h) => h.trim()).filter(Boolean)];

// xfwd: el backend recibe la IP real de cada visitante (X-Forwarded-For), así el límite de intentos
// de ingreso se cuenta por persona y no para todos los que entran por el proxy.
const api = { target: 'http://localhost:3001', xfwd: true };

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: permitidos,
    proxy: { '/api': api },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: permitidos,
    proxy: { '/api': api },
  },
});
