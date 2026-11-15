import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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

// En desarrollo, /api se redirige al backend (Backend/, puerto 3001) y lo levanta automáticamente si está apagado.
export default defineConfig({
  plugins: [react(), autoBackendPlugin()],
  server: {
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
    },
  },
});
