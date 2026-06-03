// ═══════════════════════════════════════════════════════════════
// FIREBASE.JS
// Firebase-Initialisierung, Sync und Speicherfunktionen.
// Die Konfiguration (API-Key etc.) kommt aus store-config.js.
// ═══════════════════════════════════════════════════════════════

// Firebase SDK wird per <script> Tag in index.html geladen
// (kein npm/Build-Prozess nötig)

let db = null;
let fbReady = false;

// ── Keys die mit Firebase synchronisiert werden ──────────────────
const FB_KEYS = [
  'history',
  'ubergaben',
  'umsatzData',
  'slCheckState',
  'tempHistory',
  'slushHistory',
  'kaffeeHistory',
  'waschHistory',
  'inventurHistory',
  'weeklyTasks',
  'weeklyCheckState',
  'onceDoneToday',
  'mitNachrichten',
  'slNachrichten',
  'schwarzesBrett',
  'defektMeldungen',
  'urlaubAntraege',
  'maKompetenzen',
  'slTasks',
  'names',
  'activeLogins',
  'persAufgaben',
  'regalFotos',
  'regalNachbesserungen',
  'ubAblehnungsGruende',
  'regalTarget',
  'backenFreigaben',
  'zuschlagsPlaene',
  'firmaConfig',
  'mitarbeiterZeugen',
  'strafantraege',
  'zeiterfassung',
  'maProfiles',
  'rollenAufgaben',
  'clState',
  'DP',
  'slTasks'
];

// ── localStorage Basis-Funktionen ────────────────────────────────
function lsLoad(key, def) {
  try {
    var raw = localStorage.getItem('prima_' + key);
    if(raw === null || raw === undefined) return def;
    var parsed = JSON.parse(raw);
    return (parsed !== null && parsed !== undefined) ? parsed : def;
  } catch(e) {
    console.warn('[Prima] lsLoad failed:', key, e);
    return def;
  }
}

function lsSave(key, val) {
  // Zuerst lokal speichern, dann Firebase
  try { localStorage.setItem('prima_' + key, JSON.stringify(val)); } catch(e) {
    console.warn('[Prima] lsSave localStorage failed:', key, e);
  }
  // Firebase-Sync (fbSave schreibt nur zu Firebase, keine Schleife)
  try { fbSave(key, val); } catch(e) {}
}

const _lsSaveOrig = function(key, val) {
  try { localStorage.setItem('prima_' + key, JSON.stringify(val)); } catch(e) {}
};

function lsSaveLocal(key, val) {
  try { localStorage.setItem('prima_'+key, JSON.stringify(val)); } catch(e) {
    console.warn('[Prima]', e);
  }
}

function fbLoad(key, def) { return lsLoad(key, def); }

// ── Firebase initialisieren ──────────────────────────────────────
function initFirebaseSync(){ initFirebase(); }

function initFirebase() {
  if(!navigator.onLine){
    var s = document.getElementById('fb-status');
    if(s) s.innerHTML = '<span style="color:#888;">&#9679; Offline</span>';
    return;
  }
  var statusEl = document.getElementById('fb-status');
  if(statusEl) statusEl.innerHTML = '<span style="color:#888;">&#9679; Verbinde...</span>';
  try {
    if(typeof firebase === 'undefined') throw new Error('SDK nicht geladen');
    // Konfiguration aus store-config.js
    try { firebase.initializeApp(STORE_CONFIG.firebase); }
    catch(initErr) {
      if(!(firebase.apps && firebase.apps.length)) throw initErr;
    }
    db = firebase.firestore();
    db.collection('prima').doc('mitNachrichten').get()
      .then(function(doc){
        fbReady = true;
        if(statusEl) statusEl.innerHTML = '<span style="color:#16a34a;">&#9679; Firebase ✓</span>';
        try {
          if(doc.exists){ syncFromFirebase(); }
          else { forceSyncToFirebase(); syncFromFirebase(); }
        } catch(e){ console.warn('[Prima] sync error:', e); }
      })
      .catch(function(err){
        if(statusEl) statusEl.innerHTML = '<span style="color:#f59e0b;">&#9679; Offline-Modus</span>';
      });
  } catch(e) {
    if(statusEl) statusEl.innerHTML = '<span style="color:#f59e0b;">&#9679; ' + e.message + '</span>';
  }
}

// ── Alle lokalen Daten zu Firebase hochladen ─────────────────────
function forceSyncToFirebase() {
  if(!fbReady || !db) return;
  var dataMap = {
    'names':              names,
    'activeLogins':       activeLogins,
    'persAufgaben':       persAufgaben,
    'zuschlagsPlaene':    zuschlagsPlaene,
    'firmaConfig':        firmaConfig,
    'history':            history,
    'ubergaben':          ubergaben,
    'umsatzData':         umsatzData,
    'tempHistory':        tempHistory,
    'slushHistory':       slushHistory,
    'kaffeeHistory':      kaffeeHistory,
    'waschHistory':       waschHistory,
    'inventurHistory':    inventurHistory,
    'weeklyTasks':        weeklyTasks,
    'mitNachrichten':     mitarbeiterNachrichten,
    'slNachrichten':      slNachrichten,
    'schwarzesBrett':     schwarzesBrett,
    'defektMeldungen':    defektMeldungen,
    'urlaubAntraege':     urlaubAntraege,
    'maKompetenzen':      maKompetenzen,
    'slTasks':            slTasks,
    'DP':                 {mitarbeiter:DP.mitarbeiter, weeks:DP.weeks, budget:DP.budget, activeWeek:DP.activeWeek},
  };
  Object.keys(dataMap).forEach(function(key) {
    try {
      db.collection('prima').doc(key).set({
        data: JSON.stringify(dataMap[key]),
        ts: Date.now()
      }).catch(function(){});
    } catch(e) {}
  });
}

// ── Daten von Firebase empfangen und anwenden ────────────────────
function applyFirebaseData(key, val) {
  // Array-Sicherheit: Firebase liefert manchmal Objekte statt Arrays
  function ensureArray(v) {
    return Array.isArray(v) ? v : (v && typeof v==='object' ? Object.values(v) : []);
  }
  try {
    switch(key) {
      case 'history':            history = val; break;
      case 'ubergaben':          ubergaben = val; break;
      case 'umsatzData':         umsatzData = val; break;
      case 'slCheckState':       slCheckState = val; break;
      case 'tempHistory':        tempHistory = val; break;
      case 'slushHistory':       slushHistory = val; break;
      case 'kaffeeHistory':      kaffeeHistory = val; break;
      case 'waschHistory':       waschHistory = val; break;
      case 'inventurHistory':    inventurHistory = val; break;
      case 'weeklyTasks':        weeklyTasks = val; break;
      case 'weeklyCheckState':   weeklyCheckState = val; break;
      case 'onceDoneToday':      onceDoneToday = val; break;
      case 'mitNachrichten':
        mitarbeiterNachrichten = val;
        try { updateSLBadge(); } catch(e) {}
        break;
      case 'slNachrichten':      slNachrichten = val; break;
      case 'schwarzesBrett':     schwarzesBrett = val; break;
      case 'defektMeldungen':    defektMeldungen = val; break;
      case 'urlaubAntraege':     urlaubAntraege = val; break;
      case 'maKompetenzen':      maKompetenzen = val; break;
      case 'persAufgaben':
        persAufgaben = val;
        renderHomeActiveCL();
        if(st.name && val.some(function(a){
          var today = new Date().toISOString().slice(0,10);
          return a.ma===st.name && a.datum>=today && a.status==='offen';
        })) {
          try { renderCL(); } catch(e) {}
        }
        break;
      case 'regalFotos':
        regalFotos = Array.isArray(val) ? val : (val && typeof val==='object' ? Object.values(val) : []);
        break;
      case 'regalNachbesserungen':
        if(val) regalNachbesserungen = Array.isArray(val) ? val : Object.values(val);
        break;
      case 'ubAblehnungsGruende':
        if(val && val.length) ubAblehnungsGruende = val;
        break;
      case 'regalTarget':        regalTarget = val; break;
      case 'backenFreigaben':    backenFreigaben = val; break;
      case 'zuschlagsPlaene':    if(val && val.length) zuschlagsPlaene = val; break;
      case 'firmaConfig':        firmaConfig = val; break;
      case 'mitarbeiterZeugen':  mitarbeiterZeugen = val; break;
      case 'strafantraege':      strafantraege = val; break;
      case 'slTasks':            slTasks = val; break;
      case 'zeiterfassung':      zeiterfassung = val; break;
      case 'maProfiles':         maProfiles = val; break;
      case 'activeLogins':       activeLogins = val; break;
      case 'rollenAufgaben':
        if(val && typeof val==='object') rollenAufgaben = val;
        break;
      case 'clState':
        if(val && typeof val==='object') {
          Object.assign(clState, val);
          try { renderCL(); } catch(e) {}
        }
        break;
      case 'DP':
        if(val && val.mitarbeiter) {
          DP.mitarbeiter = val.mitarbeiter;
          if(val.weeks)      DP.weeks      = val.weeks;
          if(val.budget)     DP.budget     = val.budget;
          if(val.activeWeek) DP.activeWeek = val.activeWeek;
        }
        break;
      case 'names':
        if(val && val.length) {
          names = val;
          lsSave('names', names);
          try { renderNamePicker(); } catch(e) {}
        }
        break;
    }
    // Als localStorage-Cache speichern
    try { localStorage.setItem('prima_' + key, JSON.stringify(val)); } catch(e) {}
    try { updateSLBadge(); } catch(e) {}
    try { updateBadges(); } catch(e) {}
  } catch(e) {
    console.warn('[Prima] applyFirebaseData error:', key, e);
  }
}

// ── Firebase Echtzeit-Listener starten ───────────────────────────
function syncFromFirebase() {
  if(!fbReady || !db) return;
  FB_KEYS.forEach(function(key) {
    try {
      db.collection('prima').doc(key).onSnapshot(
        function(doc) {
          if(doc.exists) {
            try {
              var fbData = doc.data();
              var val = JSON.parse(fbData.data);
              applyFirebaseData(key, val);
            } catch(e) {}
          }
        },
        function(err) {} // Netzwerkfehler still ignorieren
      );
    } catch(e) {}
  });
}

// ── Wert speichern (localStorage + Firebase) ────────────────────
function fbSave(key, val) {
  try { localStorage.setItem('prima_' + key, JSON.stringify(val)); } catch(e) {
    console.warn('[Prima] localStorage write failed:', key, e);
  }
  if(!fbReady || !db) return;
  try {
    db.collection('prima').doc(key)
      .set({ data: JSON.stringify(val), ts: Date.now() })
      .catch(function(err){ console.warn('[Prima] Firebase write failed:', key, err); });
  } catch(e) {
    console.warn('[Prima] fbSave error:', key, e);
  }
}

// ── Array-Sicherheit ─────────────────────────────────────────────
function ensureArray(v) {
  return Array.isArray(v) ? v : (v && typeof v==='object' ? Object.values(v) : []);
}

function safeRegalNB(){
  if(!Array.isArray(regalNachbesserungen)){
    regalNachbesserungen = regalNachbesserungen && typeof regalNachbesserungen==='object'
      ? Object.values(regalNachbesserungen) : [];
  }
  return regalNachbesserungen;
}
