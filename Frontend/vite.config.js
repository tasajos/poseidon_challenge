import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api se redirige al backend (Backend/, puerto 3001).
// host: true expone el servidor en la red local (http://<ip-del-equipo>:5173);
// el backend no necesita exponerse porque el proxy lo alcanza desde este mismo equipo.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
  },
});
