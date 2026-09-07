/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Service Worker — Progressive Web App (PWA)
 * ══════════════════════════════════════════════════════════════════════════════
 */

const CACHE_NAME = 'hll-calendario-v1.2';

const STATIC_ASSETS = [
  '/',
  '/sala_computacion.html',
  '/css/sala_computacion.css',
  '/js/api.js',
  '/js/auth.js',
  '/js/calendar.js',
  '/js/reservations.js',
  '/js/excel.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg'
];

// Instalación: Precarga de recursos estáticos críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activación: Limpieza de caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptor de Peticiones HTTP
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Las peticiones a la API siempre van directo a la red (datos en tiempo real)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ success: false, message: 'Sin conexión a Internet' }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        );
      })
    );
    return;
  }

  // 2. Archivos estáticos: Estrategia Stale-While-Revalidate (Carga instantánea + actualización en segundo plano)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
