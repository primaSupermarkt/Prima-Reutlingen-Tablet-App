// ═══════════════════════════════════════════════════════════════
// STORE-CONFIG.JS
// Laden-spezifische Konfiguration für Prima Supermarkt Reutlingen
// Für einen anderen Laden: diese Datei kopieren und anpassen.
// ═══════════════════════════════════════════════════════════════

const STORE_CONFIG = {
  // Laden-Identifikation
  storeId:     'prima-reutlingen',
  storeName:   'Prima Supermarkt Reutlingen',
  companyName: 'Prima Supermarkt Reutlingen GmbH',
  address: {
    strasse: 'Bahnhofstraße 3',
    plz:     '72764',
    ort:     'Reutlingen'
  },

  // Firebase Projekt für diesen Laden
  firebase: {
    apiKey:            "AIzaSyC1t6A-zk1VMGwXihoD6HWjONANCYTA-QE",
    authDomain:        "prima-reutlingen.firebaseapp.com",
    projectId:         "prima-reutlingen",
    storageBucket:     "prima-reutlingen.firebasestorage.app",
    messagingSenderId: "908579947185",
    appId:             "1:908579947185:web:79846cd60e03e2f68c5890"
  },

  // Vertragsstrafe Strafantrag (€)
  vertragsstrafe: '100',

  // App-Anzeige
  appTitle:    'Prima Supermarkt',
  appSubtitle: 'Mitarbeiter-App',

  // Schichtzeiten (für Zeiterfassung)
  schichtZeiten: {
    early: { label: 'Frühschicht',   start: '04:00', end: '14:00' },
    mid:   { label: 'Mittelschicht', start: '09:00', end: '18:00' },
    late:  { label: 'Spätschicht',   start: '13:00', end: '22:00' }
  }
};

// Globale firmaConfig wird aus STORE_CONFIG befüllt
// (Kompatibilität mit bestehendem App-Code)
if(typeof firmaConfig !== 'undefined') {
  // firmaConfig wird in data.js initialisiert – STORE_CONFIG hat Vorrang für Defaults
}
