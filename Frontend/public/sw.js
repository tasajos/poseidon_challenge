// Service worker de Poseidon:
//  - muestra las alertas climáticas aunque la página esté cerrada (HU-USR-03);
//  - guarda la aplicación en el dispositivo para abrirla con poca o ninguna señal (HU-USR-06).
// Nunca guarda respuestas de /api: los datos se piden siempre al servidor.
const CACHE = 'poseidon-app-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))).then(() => self.clients.claim()),
));

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  // Archivos con huella en el nombre (/assets/…): no cambian nunca, así que primero la copia guardada.
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.open(CACHE).then(async (cache) => {
      const guardada = await cache.match(e.request);
      if (guardada) return guardada;
      const r = await fetch(e.request);
      if (r.ok) cache.put(e.request, r.clone());
      return r;
    }));
    return;
  }
  // La página: primero la red (para recibir versiones nuevas); sin señal, la copia guardada.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((r) => {
      if (r.ok) {
        const copia = r.clone();
        caches.open(CACHE).then((cache) => cache.put('/', copia));
      }
      return r;
    }).catch(() => caches.match('/').then((r) => r || Response.error())));
  }
});

self.addEventListener('push', (e) => {
  let d;
  try { d = e.data.json(); } catch { d = { titulo: 'Poseidon', mensaje: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Poseidon', {
    body: d.mensaje,
    tag: d.tipo || 'poseidon',
    renotify: true,
    requireInteraction: d.tipo === 'helada' || d.tipo === 'sequia',
    lang: 'es',
    data: { url: '/' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
    const abierta = ventanas[0];
    return abierta ? abierta.focus() : self.clients.openWindow(e.notification.data?.url || '/');
  }));
});
