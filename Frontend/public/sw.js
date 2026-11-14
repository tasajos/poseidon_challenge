// Service worker de Poseidon: muestra las alertas climáticas aunque la página esté cerrada.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

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
