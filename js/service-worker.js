// ═══════════════════════════════════════════════════════════════
// SERVICE-WORKER.JS
// Ermöglicht Offline-Nutzung der App auf Tablets.
// v4: Network-first Strategie – immer aktuelle Version laden
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'prima-app-v4';

const FILES_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './store-config.js',
  './firebase.js',
  './data.js',
  './app.js',
  './manifest.json',
  './js/utils.js',
  './js/sl-report.js',
  './js/sl-umsatz.js',
  './js/sl-aufgaben.js',
  './js/sl-regal.js',
  './js/schichtleiter.js',
  './js/checklist.js',
  './js/dashboard.js',
  './js/admin.js',
  './js/inventur.js',
  './js/urlaub.js',
  './js/hr.js',
  './js/firebase-sync.js',
  './js/gleitzeitkonto.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'
];

// Installation
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(FILES_TO_CACHE).catch(function(err) {
        console.warn('[SW] Cache-Fehler (ignoriert):', err);
      });
    })
  );
  self.skipWaiting();
});

// Aktivierung: alten Cache löschen
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first – immer aktuelle Version versuchen
self.addEventListener('fetch', function(event) {
  if(event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then(function(networkResponse) {
      // Erfolg: Cache aktualisieren und Antwort zurückgeben
      const responseClone = networkResponse.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(event.request, responseClone);
      });
      return networkResponse;
    }).catch(function() {
      // Offline: aus Cache laden
      return caches.match(event.request).then(function(cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
