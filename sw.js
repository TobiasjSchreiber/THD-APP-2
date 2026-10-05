const CACHE_NAME = 'thd-app2-v69';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './app.js',
  './js/app.js',
  './js/config.js',
  './js/state.js',
  './js/helpers.js',
  './js/navigation.js',
  './js/dashboard.js',
  './js/modules/parking.js',
  './js/modules/events.js',
  './js/modules/mensa.js',
  './js/modules/schedule.js',
  './js/modules/webcam.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Always fetch dynamic APIs, proxy, and webcam directly from network
  if (
    event.request.url.includes('/api/') || 
    event.request.url.includes('proxy') || 
    event.request.url.includes('webcam')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
