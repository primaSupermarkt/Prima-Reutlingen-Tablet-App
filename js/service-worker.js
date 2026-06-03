// ═══════════════════════════════════════════════════════════════
// SERVICE-WORKER.JS
// Ermöglicht Offline-Nutzung der App auf Tablets.
// Cached alle wichtigen Dateien beim ersten Laden.
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'prima-app-v60001';

// Diese Dateien werden offline gespeichert
const FILES_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './store-config.js',
  './firebase.js',
  './data.js',
  './app.js',
  './manifest.json',
  // Hilfsfunktionen
  './utils.js',
  // Schichtleiter-Module
  './sl-report.js',
  './sl-umsatz.js',
  './sl-aufgaben.js',
  './sl-regal.js',
  './schichtleiter.js',
  // Feature-Module
  './checklist.js',
  './dashboard.js',
  './admin.js',
  './inventur.js',
  './urlaub.js',
  './hr.js',
  './firebase-sync.js',
  // Firebase SDK
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'
];

// Installation: Dateien cachen
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Dateien werden gecacht...');
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
          console.log('[SW] Alter Cache wird gelöscht:', name);
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: bei Offline aus Cache laden
self.addEventListener('fetch', function(event) {
  // Nur GET-Anfragen cachen
  if(event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if(cachedResponse) {
        return cachedResponse; // Aus Cache laden
      }
      // Netzwerk versuchen, bei Fehler Cache
      return fetch(event.request).catch(function() {
        // Wenn Netzwerk nicht verfügbar: Haupt-HTML zurückgeben
        return caches.match('./index.html');
      });
    })
  );
});
