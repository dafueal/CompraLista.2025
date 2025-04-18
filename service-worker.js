// service-worker.js

const CACHE_NAME = 'compralista-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/firebase-config.js',
  '/shopping-cart-android.png',
  // Añade todos los recursos estáticos necesarios
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si encontramos el recurso en caché, lo devolvemos
        if (response) {
          return response;
        }
        
        // Si es una petición a Firebase y no hay red, usamos los datos locales
        if (event.request.url.includes('firebasedatabase.app') && !navigator.onLine) {
          return new Response(
            JSON.stringify({ offline: true }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        // De lo contrario, intentamos buscar en la red
        return fetch(event.request)
          .catch(() => {
            // Si falla la red y es una página HTML, devolvemos la página offline
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

