import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_URL = 'http://127.0.0.1:3001';

async function backendActivo() {
  try {
    const r = await fetch(`${BACKEND_URL}/api/health`);
    return r.ok;
  } catch {
    return false;
  }
}

function autoBackendPlugin() {
  let proc = null;
  let iniciando = null;

  async function asegurarBackend() {
    if (await backendActivo()) return;
    if (iniciando) return iniciando;

    iniciando = (async () => {
      try {
        if (!proc || proc.killed || proc.exitCode !== null) {
          const backendDir = path.resolve(__dirname, '../Backend');
          const serverPath = path.resolve(backendDir, 'src/server.js');
          proc = spawn(process.execPath, [serverPath], {
            cwd: backendDir,
            stdio: 'ignore',
            windowsHide: true,
            detached: true,
          });
          proc.unref();
        }
        for (let i = 0; i < 35; i++) {
          if (await backendActivo()) return;
          await new Promise((r) => setTimeout(r, 120));
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
        if (req.url?.startsWith('/api')) {
          await asegurarBackend();
        }
        next();
      });
    },
  };
}

// Acceso desde la red local: Vite escucha en todas las interfaces (host: true) y muestra al arrancar las
// direcciones "Network" (p. ej. http://192.168.1.136:5173) que se abren desde otros equipos de la misma red.
// El backend no se expone: el proxy lo alcanza desde este mismo equipo.
//
// Vite rechaza los nombres de equipo que no conoce; las direcciones IP siempre se aceptan. Se permiten el nombre
// de este equipo, los nombres .local/.lan de la red y los túneles habituales; VITE_HOSTS agrega otros (con comas).
const permitidos = [
  os.hostname().toLowerCase(),
  '.local', '.lan', '.home',
  '.devtunnels.ms', '.trycloudflare.com', '.ngrok-free.app',
  ...(process.env.VITE_HOSTS || '').split(',').map((h) => h.trim()).filter(Boolean),
];

// xfwd: el backend recibe la IP real de cada visitante (X-Forwarded-For). Sin esto, todos los equipos de la
// red entrarían por el proxy con la misma IP y compartirían el límite de intentos de ingreso.
const api = { target: BACKEND_URL, changeOrigin: true, xfwd: true };

// En desarrollo, /api se redirige al backend (Backend/, puerto 3001) y lo levanta automáticamente si está apagado.
export default defineConfig({
  plugins: [react(), autoBackendPlugin()],
  server: {
    host: true,
    port: 5173,
    strictPort: true, // si el puerto está ocupado, avisa en vez de cambiarlo y romper los enlaces compartidos
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
