// Dulce Cuenta: permite abrir la app sin conexión una vez activada en este dispositivo.
const CACHE = 'dulce-cuenta-v4';
const FILES = ['./', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Red primero para tener siempre la última versión; si no hay conexión, usa la copia guardada.
// La activación, el panel de códigos y la API nunca se guardan.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/') || /^\/(activar|admin|comprar|gracias|landing)/.test(url.pathname)) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Solo se guarda la app real: si el servidor responde con la landing (sin licencia), no se pisa la copia.
        if (res.ok && !res.redirected && res.type === 'basic' && !res.headers.has('X-Dulce-Page')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./')))
  );
});
