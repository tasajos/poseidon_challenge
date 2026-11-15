import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_URL = 'http://127.0.0.1:3001';

// ---------- Arranque automático del backend (de la rama frontend3) ----------
// Con `npm run dev` en Frontend/, si el backend no responde en el puerto 3001 se arranca solo, en segundo plano.
// Su salida queda en Backend/backend-dev.log. POSEIDON_SIN_BACKEND=1 lo desactiva (p. ej. si usa otro backend).
async function backendActivo() {
  try {
    return (await fetch(`${BACKEND_URL}/api/health`, { signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    return false;
  }
}

function autoBackendPlugin() {
  let proc = null;
  let iniciando = null;

  async function asegurarBackend() {
    if (process.env.POSEIDON_SIN_BACKEND === '1' || (await backendActivo())) return;
    if (iniciando) return iniciando;
    iniciando = (async () => {
      try {
        if (!proc || proc.exitCode !== null) {
          const backendDir = path.resolve(__dirname, '../Backend');
          const registro = openSync(path.join(backendDir, 'backend-dev.log'), 'a');
          proc = spawn(process.execPath, [path.join(backendDir, 'src/server.js')], {
            cwd: backendDir, stdio: ['ignore', registro, registro], windowsHide: true, detached: true,
          });
          proc.unref();
          console.log('[poseidon] Backend apagado: se arrancó en segundo plano (registro en Backend/backend-dev.log)');
        }
        for (let i = 0; i < 50; i++) {
          if (await backendActivo()) return;
          await new Promise((r) => setTimeout(r, 150));
        }
      } finally {
        iniciando = null;
      }
    })();
    return iniciando;
  }

  return {
    name: 'poseidon-auto-backend',
    apply: 'serve',
    async configureServer(server) {
      await asegurarBackend();
      server.middlewares.use(async (req, _res, next) => {
        if (req.url?.startsWith('/api')) await asegurarBackend();
        next();
      });
    },
  };
}

// ---------- Acceso desde la red local y por túnel ----------
// host: true escucha en todas las interfaces; al arrancar, Vite muestra en "Network" la dirección para otros
// equipos de la misma red (p. ej. http://192.168.1.136:5173). El backend no se expone: lo alcanza el proxy.
// Vite rechaza nombres de equipo desconocidos (las IP siempre se aceptan): se permiten el nombre de este
// equipo, los .local/.lan de la red y los túneles habituales. VITE_HOSTS agrega otros, separados por comas.
const permitidos = [
  os.hostname().toLowerCase(), '.local', '.lan', '.home',
  '.devtunnels.ms', '.trycloudflare.com', '.ngrok-free.app', '.ngrok.app', '.loca.lt',
  ...(process.env.VITE_HOSTS || '').split(',').map((h) => h.trim()).filter(Boolean),
];

// xfwd: el backend recibe la IP real de cada visitante (X-Forwarded-For), así el límite de intentos de
// ingreso se cuenta por persona y no para todos los que entran por el proxy.
const api = { target: BACKEND_URL, changeOrigin: true, xfwd: true };

export default defineConfig({
  plugins: [react(), autoBackendPlugin()],
  server: {
    host: true,
    port: 5173,
    strictPort: true, // si el puerto está ocupado avisa, en vez de cambiarlo y romper los enlaces compartidos
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
