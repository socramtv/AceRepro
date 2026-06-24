// StreamHub Pro — Service Worker
// Versión: cambia este string para forzar actualización en todos los clientes
const CACHE_NAME = 'streamhub-v1';

// Recursos que se cachean al instalar (shell de la app)
const PRECACHE = [
  '/reproductor_acestream_pro.html',
  '/manifest.json',
  '/playerjs.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ── Instalación ────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activación: limpia caches antiguas ────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache First para shell, Network First para M3U ─
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Las listas M3U y streams siempre van a red (no se cachean)
  if (
    url.pathname.startsWith('/listas/') ||
    url.hostname === '127.0.0.1' ||
    url.pathname.endsWith('.m3u') ||
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.ts')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para el resto: Cache First con fallback a red
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Solo cachea respuestas válidas y de la misma origen
        if (
          response.ok &&
          response.type === 'basic' &&
          event.request.method === 'GET'
        ) {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        }
        return response;
      }).catch(() => {
        // Offline fallback: devuelve la página principal si existe
        return caches.match('/reproductor_acestream_pro.html');
      });
    })
  );
});
