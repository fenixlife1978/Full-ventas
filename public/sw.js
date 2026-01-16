'use strict';

// 1. Cambiamos el nombre del cache
const CACHE_NAME = 'full-ventas-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/ventas', // Asegúrate de que estas rutas existan exactamente así
  '/productos',
];

self.addEventListener('install', event => {
  // Fuerza al SW a activarse apenas se instala
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache de full-ventas abierto');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch(err => console.log('Error en caché inicial (revisa si las rutas existen):', err))
  );
});

self.addEventListener('activate', event => {
  // Toma el control de las pestañas inmediatamente
  event.waitUntil(clients.claim());
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});