// ═══════════════════════════════════════════════════════════
// SERVICE WORKER — Informe APR Xtreme
// Versión: 1.0
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = 'apr-xtreme-v1';

// Recursos a cachear para uso offline
const ASSETS = [
  './',
  './INFORME_APR_CHUQUI_REV01.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // Librerías externas (se cachean en primera visita con internet)
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
];

// ── INSTALL: cachear todos los assets ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cacheando assets...');
      // Cache local assets first (required), then external (optional)
      return cache.addAll([
        './',
        './INFORME_APR_CHUQUI_REV01.html',
        './manifest.json'
      ]).then(() => {
        // Cache external CDN libs (best effort)
        return Promise.allSettled([
          cache.add('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
          cache.add('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js')
        ]);
      });
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpiar caches viejos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Eliminando cache viejo:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Cache-first para assets, network-first para el resto ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Para navegación y assets locales: cache first
  if (
    event.request.mode === 'navigate' ||
    url.hostname === self.location.hostname ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          // Cachear respuesta válida
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // Sin internet y sin cache: mostrar página offline si es navegación
          if (event.request.mode === 'navigate') {
            return caches.match('./INFORME_APR_CHUQUI_REV01.html');
          }
        });
      })
    );
  } else {
    // Para requests externos (mailto, etc.): pasar directo
    event.respondWith(fetch(event.request).catch(() => new Response('', {status: 408})));
  }
});
