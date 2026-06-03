// ═══════════════════════════════════════════════════════════════
// SERVICE-WORKER.JS — Cache-Version erhöht um alten Cache zu killen
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'prima-app-v2002'; // ← erhöht von v1001

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
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'
];

// Installation: alten Cache sofort löschen, neuen aufbauen
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(name) {
        console.log('[SW] Alter Cache gelöscht:', name);
        return caches.delete(name);
      }));
    }).then(function() {
      return caches.open(CACHE_NAME).then(function(cache) {
        console.log('[SW] Neuer Cache wird aufgebaut...');
        return cache.addAll(FILES_TO_CACHE).catch(function(err) {
          console.warn('[SW] Cache-Fehler (ignoriert):', err);
        });
      });
    })
  );
  self.skipWaiting();
});

// Aktivierung: sicherstellen dass alter SW sofort ersetzt wird
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

// Fetch: Network-first für JS/HTML, Cache-first für Assets
self.addEventListener('fetch', function(event) {
  if(event.request.method !== 'GET') return;
  
  const url = event.request.url;
  const isJsOrHtml = url.endsWith('.js') || url.endsWith('.html') || url.endsWith('/');
  
  if(isJsOrHtml) {
    // Network-first: immer frische JS/HTML laden
    event.respondWith(
      fetch(event.request).then(function(response) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function() {
        return caches.match(event.request);
      })
    );
  } else {
    // Cache-first für Bilder, CSS etc.
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).catch(function() {
          return caches.match('./index.html');
        });
      })
    );
  }
});
