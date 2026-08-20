// Pide siempre a la red primero. No promete funcionar sin conexion:
// existe solo para que Android ofrezca instalar la aplicacion.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (evento) => {
  evento.respondWith(fetch(evento.request));
});
