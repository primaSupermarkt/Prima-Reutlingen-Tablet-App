// ═══════════════════════════════════════════════════════════════
// APP.JS
// Hauptanwendungslogik der Prima Mitarbeiter-App.
// Wird NACH folgenden Dateien geladen:
//   1. store-config.js  (Laden-Konfiguration)
//   2. firebase.js      (Firebase + localStorage Funktionen)
//   3. data.js          (Stammdaten: Mitarbeiter, Aufgaben, Geräte)
//   4. app.js           (diese Datei - Anwendungslogik)
// ═══════════════════════════════════════════════════════════════

// Hinweis: firebaseConfig, FB_KEYS und alle Firebase-Funktionen
// sind in firebase.js definiert. ADMIN_PW, names, TEMP_DEVICES etc.
// sind in data.js definiert.

// [firebase-config – ausgelagert in store-config.js]
// [firebase-funktionen – ausgelagert in firebase.js]

// [applyFirebaseData – definiert in firebase.js]

// [syncFromFirebase – definiert in firebase.js]

// Override lsSave to also save to Firebase
// [_lsSaveOrig – definiert in firebase.js]

// ═══════════════════════════════════════════
// FIREBASE SLOT – hier später Config einfügen
// ═══════════════════════════════════════════
// TODO: Firebase config kommt hier rein
// import { initializeApp } from "firebase/app";
// const firebaseConfig = { ... };

// ═══════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════
// [stammdaten-basis – ausgelagert in data.js]
// ── LOCALSTORAGE PERSISTENCE ──────────────────────────────────────────
// ── STEMPELUHR ──────────────────────────────────────────────────────────────

// ── STEMPELUHR ──────────────────────────────────────────────────────────────
function stempelKommen() {
  // Namen aus Firebase frisch laden dann Overlay
  if(fbReady&&db){
    db.collection('prima-data').doc('names').get().then(function(doc){
      if(doc.exists&&doc.data()&&doc.data().value&&doc.data().value.length){
        names=doc.data().value; lsSave('names',names);
      }
    }).catch(function(){}).finally(function(){ stempelOverlay('kommen'); });
  } else { stempelOverlay('kommen'); }
}
function stempelGehen()  {
  if(fbReady&&db){
    db.collection('prima-data').doc('names').get().then(function(doc){
      if(doc.exists&&doc.data()&&doc.data().value&&doc.data().value.length){
        names=doc.data().value; lsSave('names',names);
      }
    }).catch(function(){}).finally(function(){ stempelOverlay('gehen'); });
  } else { stempelOverlay('gehen'); }
}

function stempelOverlay(typ) {
  const now = new Date();
  const nowStr = now.toTimeString().slice(0,5);
  const farbe = typ==='kommen' ? '#16a34a' : '#dc2626';
  const emoji = typ==='kommen' ? '🟢' : '🔴';
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:600;display:flex;align-items:center;justify-content:center;padding:20px;';
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border-radius:18px;padding:22px;width:100%;max-width:360px;';

  card.innerHTML =
    '<div style="font-size:22px;font-weight:900;margin-bottom:4px;color:'+farbe+';">'+emoji+' '+(typ==='kommen'?'Kommen':'Gehen')+'</div>'+
    '<div style="font-size:12px;color:#888;margin-bottom:14px;">Jetzt: '+nowStr+' Uhr</div>'+

    '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:4px;">Name</label>'+
    '<select id="st-name" style="width:100%;border:1.5px solid #e0e0e0;border-radius:10px;padding:11px;font-size:16px;font-family:inherit;outline:none;margin-bottom:12px;">'+
      '<option value="">– auswählen –</option>'+
      names.map(function(n){return '<option value="'+n+'">'+n+'</option>';}).join('')+
    '</select>'+

    '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:4px;">'+(typ==='kommen'?'Arbeitsbeginn':'Arbeitsende')+'</label>'+
    '<input type="time" id="st-zeit" value="'+nowStr+'" style="width:100%;border:2px solid '+farbe+';border-radius:10px;padding:12px;font-size:24px;font-weight:700;font-family:inherit;outline:none;text-align:center;margin-bottom:6px;">'+
    '<div id="st-zeit-hint" style="font-size:12px;text-align:center;min-height:18px;margin-bottom:10px;"></div>'+

    '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:4px;">PIN</label>'+
    '<div id="st-pin-display" style="width:100%;border:1.5px solid #e0e0e0;border-radius:10px;padding:10px;font-size:26px;letter-spacing:10px;font-family:inherit;text-align:center;margin-bottom:8px;min-height:48px;background:#f9f9f9;color:#333;">'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:14px;" id="st-pin-pad">'+
      [1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(function(k){
        return k===''
          ? '<div></div>'
          : '<button type="button" data-k="'+k+'" style="background:#f0f0f0;border:none;border-radius:10px;padding:14px;font-size:20px;font-weight:700;font-family:inherit;cursor:pointer;text-align:center;">'+k+'</button>';
      }).join('')+
    '</div>';

  // Live-Hint bei Zeitänderung
  var updateHint = function() {
    const zeitEl = document.getElementById('st-zeit');
    const hint = document.getElementById('st-zeit-hint');
    if(!zeitEl||!hint) return;
    const val = zeitEl.value; if(!val){hint.textContent='';return;}
    const [vh,vm] = val.split(':').map(Number);
    const [nh,nm] = nowStr.split(':').map(Number);
    const diffMin = typ==='kommen'
      ? (nh*60+nm)-(vh*60+vm)   // Kommen: wie lange ist das her?
      : (vh*60+vm)-(nh*60+nm);  // Gehen: liegt das in der Zukunft?
    if(typ==='kommen') {
      if(diffMin<0){ hint.style.color='#ef4444'; hint.textContent='Zeitpunkt liegt in der Zukunft'; }
      else if(diffMin===0){ hint.style.color='#888'; hint.textContent='= jetzt'; }
      else if(diffMin<=60){ hint.style.color='#16a34a'; hint.textContent=diffMin+' Min. rückwirkend ✅'; }
      else { hint.style.color='#f59e0b'; hint.textContent=Math.floor(diffMin/60)+'h '+diffMin%60+'m rückwirkend – SL-Bestätigung nötig'; }
    } else {
      // diffMin = eingetragene Zeit - jetzt (positiv = Zukunft, negativ = Vergangenheit)
      const gehenDiff = (vh*60+vm) - (nh*60+nm);
      if(gehenDiff > 5){
        hint.style.color='#ef4444';
        hint.textContent='Maximal 5 Min. in der Zukunft erlaubt ❌';
      } else if(gehenDiff >= 0){
        hint.style.color='#16a34a';
        hint.textContent='OK ✅';
      } else {
        // Rückwirkend
        const minBack = Math.abs(gehenDiff);
        if(minBack <= 60){ hint.style.color='#16a34a'; hint.textContent=minBack+' Min. rückwirkend ✅'; }
        else { hint.style.color='#f59e0b'; hint.textContent=Math.floor(minBack/60)+'h '+minBack%60+'m rückwirkend – SL-Bestätigung nötig'; }
      }
    }
  }
  // Elemente nach card.appendChild verbinden (nicht per innerHTML)
  setTimeout(function(){
    try{
      const z=document.getElementById('st-zeit');
      if(z){ z.addEventListener('input', function(){ try{ updateHint(); }catch(e){} }); try{ updateHint(); }catch(e){} }
      // PIN-Pad Logik
      const pad = document.getElementById('st-pin-pad');
      const disp = document.getElementById('st-pin-display');
      if(pad && disp) {
        disp.setAttribute('data-pin','');
        pad.querySelectorAll('button[data-k]').forEach(function(btn){
          btn.addEventListener('click', function(){
            const k = this.getAttribute('data-k');
            let cur = disp.getAttribute('data-pin')||'';
            if(k==='⌫') { cur = cur.slice(0,-1); }
            else if(cur.length < 6) { cur += k; }
            disp.setAttribute('data-pin', cur);
            disp.textContent = cur.length ? '●'.repeat(cur.length) : '';
          });
        });
      }
    }catch(e){}
  }, 80);

  const btn = document.createElement('button');
  btn.style.cssText = 'width:100%;background:'+farbe+';color:#fff;border:none;border-radius:12px;padding:15px;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit;';
  btn.textContent = typ==='kommen' ? '✅ Kommen bestätigen' : '✅ Gehen bestätigen';
  btn.addEventListener('click', function(){
    const name = document.getElementById('st-name').value;
    const pinDisp2 = document.getElementById('st-pin-display');
    const pin = pinDisp2 ? (pinDisp2.getAttribute('data-pin')||'') : '';
    const zeit = document.getElementById('st-zeit').value;
    if(!name){ alert('Bitte Name auswaehlen.'); return; }
    if(!zeit){ alert('Bitte Zeit eingeben.'); return; }
    const prof = maProfiles[name]||{};
    if(!pin){ alert('Bitte PIN eingeben.'); return; }
    if(prof.pin && pin !== prof.pin){ alert('Falscher PIN.'); return; }

    // Über 60 Min rückwirkend → SL-Bestätigung
    const [vh,vm]=zeit.split(':').map(Number), [nh,nm]=nowStr.split(':').map(Number);
    const abweichMin = typ==='kommen'
      ? (nh*60+nm)-(vh*60+vm)   // Kommen rückwirkend = positiv
      : (nh*60+nm)-(vh*60+vm);  // Gehen rückwirkend = positiv (eingetragen < jetzt)
    if(abweichMin > 60) {
      const slPw = prompt('Mehr als 1 Stunde Abweichung ('+Math.floor(diffMin/60)+'h '+diffMin%60+'m).\nSchichtleiter-Passwort:');
      if(slPw !== SL_PW){ alert('Falsches Passwort. Bitte Schichtleiter rufen.'); return; }
    }

    if(typ==='gehen') {
      const gehenDiff2 = (vh*60+vm)-(nh*60+nm);
      if(gehenDiff2 > 5){ alert('Gehen-Zeit darf maximal 5 Minuten in der Zukunft liegen.'); return; }
    }

    document.body.removeChild(overlay);
    stempelSpeichern(typ, name, zeit);
  });
  card.appendChild(btn);
  const skip = document.createElement('button');
  skip.style.cssText = 'width:100%;background:none;border:none;color:#aaa;font-size:12px;cursor:pointer;font-family:inherit;margin-top:8px;';
  skip.textContent = 'Abbrechen';
  skip.addEventListener('click', function(){ document.body.removeChild(overlay); });
  card.appendChild(skip);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function stempelSpeichern(typ, name, zeitStr) {
  const heute = new Date().toISOString().slice(0,10);
  if(typ === 'kommen') {
    const existing = zeiterfassung.find(function(z){ return z.ma===name && z.datum===heute && !z.istEnd; });
    if(existing) { alert(name+' ist bereits eingestempelt ('+existing.istStart+' Uhr).'); return; }
    const zeId = 'ze'+Date.now();
    zeiterfassung.push({ id:zeId, ma:name, datum:heute, istStart:zeitStr, istEnd:null, nettoMin:0, typ:'stempel', schicht:'', grund:'', slBestaetigt:false });
    lsSave('zeiterfassung', zeiterfassung);
    fbSave('zeiterfassung', zeiterfassung);
    if(!activeLogins[name]) activeLogins[name]={schicht:'',bereich:'',startTime:zeitStr,loginTs:zeitStr,clDone:0,clTotal:0};
    activeLogins[name].loginTs = zeitStr;
    lsSave('activeLogins', activeLogins);
    fbSave('activeLogins', activeLogins);
    // SL-Benachrichtigung: Kommen zur Bestätigung
    mitarbeiterNachrichten.push({
      id:'stpl'+zeId, ts:new Date().toLocaleString('de-DE'), name:name,
      text:'🟢 '+name+' eingestempelt um '+zeitStr+' Uhr – bitte bestätigen',
      schicht:'Stempeluhr', typ:'stempel_kommen', zeId:zeId, gelesen:false
    });
    lsSave('mitNachrichten',mitarbeiterNachrichten);
    fbSave('mitNachrichten',mitarbeiterNachrichten);
    updateSLBadge();
    alert('✅ '+name+' eingestempelt um '+zeitStr+' Uhr.');
  } else {
    const entry = zeiterfassung.slice().reverse().find(function(z){ return z.ma===name && z.datum===heute && !z.istEnd; });
    if(!entry) { alert(name+' hat keinen offenen Einstempel fuer heute.'); return; }
    entry.istEnd = zeitStr;
    const [sh2,sm2] = entry.istStart.split(':').map(Number);
    const [eh2,em2] = zeitStr.split(':').map(Number);
    let bruttoMin = (eh2*60+em2)-(sh2*60+sm2);
    if(bruttoMin<0) bruttoMin+=24*60;
    const pause = bruttoMin>540?45:bruttoMin>360?30:bruttoMin>270?15:0;
    entry.nettoMin = bruttoMin-pause;
    entry.pause = pause;
    lsSave('zeiterfassung', zeiterfassung);
    fbSave('zeiterfassung', zeiterfassung);
    delete activeLogins[name];
    lsSave('activeLogins', activeLogins);
    fbSave('activeLogins', activeLogins);
    // SL-Benachrichtigung: Gehen zur Bestätigung
    mitarbeiterNachrichten.push({
      id:'stpl'+entry.id+'end', ts:new Date().toLocaleString('de-DE'), name:name,
      text:'🔴 '+name+' ausgestempelt '+zeitStr+' Uhr · '+Math.floor(entry.nettoMin/60)+'h '+entry.nettoMin%60+'m – bitte bestätigen',
      schicht:'Stempeluhr', typ:'stempel_gehen', zeId:entry.id, gelesen:false
    });
    lsSave('mitNachrichten',mitarbeiterNachrichten);
    fbSave('mitNachrichten',mitarbeiterNachrichten);
    updateSLBadge();
    alert('✅ '+name+' ausgestempelt '+zeitStr+' Uhr. Netto: '+Math.floor(entry.nettoMin/60)+'h '+entry.nettoMin%60+'m');
  }
}

// ── SAFE DOM HELPER ──────────────────────────────────────────────────
// Ersetzt getElementById mit null-sicherem Zugriff
// ── SPEICHER-ANIMATION ──────────────────────────────────────────────────────




// ── PIN-PAD HELPER ───────────────────────────────────────────────────────────
function buildPinPad(displayId) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','del'];
  let h = '<div class="pin-pad" data-for="'+displayId+'" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px;">';
  keys.forEach(function(k){
    if(k===''){h+='<div></div>';return;}
    if(k==='del'){
      h+='<button class="pin-key" data-for="'+displayId+'" data-val="del" style="background:#fee2e2;border:none;border-radius:10px;padding:13px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;">&#9003;</button>';
    } else {
      h+='<button class="pin-key" data-for="'+displayId+'" data-val="'+k+'" style="background:#f0f0f0;border:none;border-radius:10px;padding:13px;font-size:18px;font-weight:700;cursor:pointer;font-family:inherit;">'+k+'</button>';
    }
  });
  return h+'</div>';
}
function pinPadKey(displayId, k) {
  const disp=document.getElementById(displayId);
  if(!disp) return;
  let cur=disp.getAttribute('data-pin')||'';
  if(k==='del'){cur=cur.slice(0,-1);}
  else if(cur.length<20){cur+=k;}
  disp.setAttribute('data-pin',cur);
  disp.textContent=cur?'●'.repeat(Math.min(cur.length,12)):'';
}
// Global event delegation für alle PIN-Pads
document.addEventListener('click', function(e){
  const btn = e.target.closest('.pin-key');
  if(!btn) return;
  e.preventDefault();
  const displayId = btn.getAttribute('data-for');
  const val = btn.getAttribute('data-val');
  if(displayId && val) pinPadKey(displayId, val);
});

function showSaveAnimation(callback) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:center;justify-content:center;';
  const box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:24px;padding:32px 40px;display:flex;flex-direction:column;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,.18);';
  box.innerHTML = '<div id="save-anim-circle" style="width:64px;height:64px;border-radius:50%;background:#16a34a;display:flex;align-items:center;justify-content:center;font-size:32px;transform:scale(0);transition:transform .25s cubic-bezier(.34,1.56,.64,1);">✓</div>'+
    '<div style="font-size:15px;font-weight:700;color:#222;">Gespeichert</div>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  setTimeout(function(){ const c=document.getElementById('save-anim-circle'); if(c) c.style.transform='scale(1)'; }, 30);
  setTimeout(function(){
    box.style.transition='opacity .2s';
    box.style.opacity='0';
    setTimeout(function(){
      try{ document.body.removeChild(overlay); }catch(e){}
      if(callback) callback();
    }, 220);
  }, 900);
}

// ── SPEICHER-ANIMATION ──────────────────────────────────────────────────────

function $id(id) { return document.getElementById(id); }
function $set(id, prop, val) { const el=$id(id); if(el) el[prop]=val; }
function $style(id, prop, val) { const el=$id(id); if(el) el.style[prop]=val; }
function $val(id) { const el=$id(id); return el ? el.value : ''; }
function $html(id, val) { const el=$id(id); if(el) el.innerHTML=val; }
function $text(id, val) { const el=$id(id); if(el) el.textContent=val; }

// ── SAFE DOM HELPER ──────────────────────────────────────────────────


// Internal save that only saves to localStorage (used by Firebase sync to prevent loops)
// [lsSaveLocal – definiert in firebase.js]
// [lsLoad – definiert in firebase.js]

// ── GLOBAL HELPERS ────────────────────────────────────────────────────

let urlaubAntraege    = lsLoad('urlaubAntraege', []); // {id,ts,ma,von,bis,status,grund}
let mitarbeiterNachrichten = lsLoad('mitNachrichten', []); // {ts,name,text,schicht,gelesen}
let slNachrichten = lsLoad('slNachrichten', []); // {ts,text,gelesen} SL→GF

// ── TEMPERATURE DATA ──────────────────────────────────────────────────
// Tasks that can only be done once per day (across all sessions)
// onceDoneToday: {taskId_date → {who, ts}}
let onceDoneToday = lsLoad('onceDoneToday', {});

// [TEMP_DEVICES – ausgelagert in data.js]
// tempHistory: [{date, name(MA), readings:[{deviceId, ist, ok, abweichung}], ts}]
let tempHistory = lsLoad('tempHistory', []);
// tempCurrentSession: deviceId → {ist, ok}
let tempCurrentSession = {};
// slushHistory: [{date, name, ts}]
let slushHistory = lsLoad('slushHistory', []);

// ── STRAFANTRAG ─────────────────────────────────────────────────────────────
let firmaConfig = lsLoad('firmaConfig', {
  name: 'Prima Supermarkt Reutlingen GmbH',
  strasse: 'Bahnhofstraße 3',
  plz: '72764',
  ort: 'Reutlingen',
  vertragsstrafe: '100'
});
let mitarbeiterZeugen = lsLoad('mitarbeiterZeugen', []);
// z.B. [{id, name, vorname, adresse, telefon}]
let strafantraege = lsLoad('strafantraege', []);

// ── STRAFANTRAG ─────────────────────────────────────────────────────────────
// ── ZUSCHLAGSPLÄNE ───────────────────────────────────────────────────────────
let zuschlagsPlaene = lsLoad('zuschlagsPlaene', [
  { id:'standard', name:'Standardplan', nacht:25, sonntag:25, feiertag:25, nachtSoFt:50, istDefault:true }
]);

// ── PERSÖNLICHE SL-AUFGABEN ──────────────────────────────────────────
// persAufgaben: [{id,ts,ma,datum,text,priority,status:'offen'|'erledigt'|'abgelehnt',erledigt_ts}]
let persAufgaben = lsLoad('persAufgaben', []);

// ── REGALFOTOS ────────────────────────────────────────────────────────
// regalFotos: [{id,ts,datum,day,group,groupLabel,bereich,ma,dataUrl,slStatus:'',slKommentar:'',slTs:''}]
let regalFotos   = lsLoad('regalFotos', []);
let regalNachbesserungen = lsLoad('regalNachbesserungen','ubAblehnungsGruende', []);
let ubAblehnungsGruende = lsLoad('ubAblehnungsGruende', [
  'Schichtübergabe nicht ordentlich vorbereitet',
  'Offene Punkte nicht abgearbeitet',
  'Keine Kontrolle möglich',
  'Reinigung nicht durchgeführt',
  'Sonstiges'
]);
let regalTarget  = lsLoad('regalTarget', 85);
// backenFreigaben: {maName: true/false} – SL-Freischaltung Schnellmodus
let backenFreigaben = lsLoad('backenFreigaben', {});

// Regal-Gruppen: 33 Bereiche aufgeteilt auf 7 Rotationstage
// [REGAL_GRUPPEN – ausgelagert in data.js]
// ── PERSÖNLICHE SL-AUFGABEN (datumgebunden, personenbezogen) ──────────────

// ── REGALFOTOS ────────────────────────────────────────────────────────────

// 33 Bereiche auf 7 Tage verteilt (Tag = Wochentag-Index 0-6)
// ── WOCHENAUFGABEN ────────────────────────────────────────────────────────────────────────

// weeklyTasks: [{id, text, days:[0-6 (0=So,1=Mo...)], schicht:'early'|'mid'|'late'|'all', bereich:'bake'|'laden'|'all', warn, special}]
let weeklyTasks = lsLoad('weeklyTasks', [
  {id:'wt1', text:'Blumen wässern', days:[2,3,6], schicht:'early', bereich:'laden', warn:'', section:'Wochenaufgabe', time:'08:00'},
  {id:'wt2', text:'Slushmaschine reinigen', days:[3], schicht:'early', bereich:'bake', warn:'Mittwoch Frühschicht – vor 09:00 Uhr', section:'Wochenaufgabe', special:'slush', time:'07:00'},
  {id:'wt3', text:'Milchbehälter Kaffeemaschine reinigen', days:[1,3,5], schicht:'mid', bereich:'laden', warn:'Milch leer, Behälter im Spülbecken ausspülen', section:'Wochenaufgabe', time:'11:00'},
]);
// weeklyCheckState: {taskId_dateKey → {status, who, ts}}
let weeklyCheckState = lsLoad('weeklyCheckState', {});
let slTasks = [
  {id:'sl1', time:'06:00', section:'Öffnung', text:'Tagesumsatz Vortag eintragen', warn:''},
  {id:'sl2', time:'08:00', section:'Kontrolle', text:'Checklisten-Status aller Schichten prüfen', warn:''},
  {id:'sl3', time:'12:00', section:'Mittag', text:'Schichtübergaben kontrollieren', warn:''},
  {id:'sl4', time:'17:00', section:'Abend', text:'Dienstplan nächste Woche prüfen', warn:''},
  {id:'sl5', time:'20:00', section:'Tagesabschluss', text:'Tagesumsatz & Kundenzahl eintragen', warn:''},
];

// ── tasks: leeres Array als Fallback (neues System nutzt rollenAufgaben) ──
let tasks = [];

// ═══════════════════════════════════════════
// ── tasks: leeres Array als Fallback (rollenAufgaben ist das neue System) ──

// ROLLEN-SYSTEM
// ═══════════════════════════════════════════

// Rollen-Definition: welche Rollen gibt es in welcher Schicht
const ROLLEN_DEF = {
  early: [
    {id:'bake',    label:'🥐 Bake-Off',    icon:'🥐'},
    {id:'kasse',   label:'🛒 Kasse',        icon:'🛒'},
    {id:'regal',   label:'📦 Regale',       icon:'📦'},
    {id:'lager',   label:'🏭 Lager',        icon:'🏭'},
  ],
  mid: [
    {id:'kasse',   label:'🛒 Kasse',        icon:'🛒'},
    {id:'regal',   label:'📦 Regale',       icon:'📦'},
    {id:'lager',   label:'🏭 Lager',        icon:'🏭'},
    {id:'springer',label:'🔄 Springer',     icon:'🔄'},
  ],
  late: [
    {id:'kasse',   label:'🛒 Kasse',        icon:'🛒'},
    {id:'regal',   label:'📦 Regale',       icon:'📦'},
    {id:'lager',   label:'🏭 Lager',        icon:'🏭'},
  ]
};

// Admin-erweiterbare Aufgaben pro Rolle
// Abschnitte: 'start' | 'pause1' | 'pause2' | 'ende'
// [rollenAufgaben – ausgelagert in data.js]
// getMyTasks: holt Aufgaben für aktuelle Schicht+Rolle aus rollenAufgaben
// + admin-hinzugefügte persAufgaben

// [backenTasks – ausgelagert in data.js]
// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
let st={day:'wt',schicht:'early',bereich:'bake',startTime:'',name:'',rolle:'kasse'};
let clState={};   // taskId → {status:'done'|'nd', who, ts, reason}
let activeLogins=lsLoad('activeLogins',{});  // name → {schicht, bereich, startTime, loginTs, clDone, clTotal}
let bkState={};
let bkParentId=null;
let pendingDel=null,pendingDelType=null;
let pwTarget='admin'; // 'admin' | 'sl'
let ubPrepState={}; // ubItemText → 'ok'|'nok'

// ═══════════════════════════════════════════
// CLOCK
// ═══════════════════════════════════════════

function renderHomeActiveCL(){
  const box=document.getElementById('home-active-cl');
  if(!box)return;
  // Alle Mitarbeiter die aktiv eingeloggt (haben clState Einträge und keine Übergabe)
  const aktive=names.filter(function(n){
    if(!activeLogins[n]) return false;
    const ubDone=ubergaben.some(function(u){return u.von===n&&u.status==='accepted';});
    return !ubDone;
  });
  if(!aktive.length){box.innerHTML='';return;}
  let h='<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:5px;">Aktive Checklisten</div>';
  aktive.forEach(function(n){
    const login=activeLogins[n]||{};
    const schicht=login.schicht||'';
    const startTime=login.loginTs||login.startTime||'';
    const done=login.clDone||0;
    const total=login.clTotal||0;
    const card2=document.createElement('div');card2.style.cssText='background:#fff;border-radius:10px;padding:10px 12px;margin-bottom:6px;box-shadow:0 1px 5px rgba(0,0,0,.08);display:flex;align-items:center;gap:10px;cursor:pointer;';card2.setAttribute('data-name',n);
      '<div style="width:36px;height:36px;border-radius:50%;background:#1e3a5f;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex-shrink:0;">'+n.charAt(0)+'</div>'+
      '<div style="flex:1;">'+
        '<div style="font-size:13px;font-weight:700;">'+n+'</div>'+
        '<div style="font-size:11px;color:#888;">'+schicht+(startTime?' · ab '+startTime+' Uhr':'')+(total?' · '+done+'/'+total+' erledigt':'')+'</div>'+
      '</div>'+
      '<div style="font-size:13px;color:#1e3a5f;font-weight:700;">&#8250;</div>'+
    '</div>';
  });
  box.innerHTML=h;
}

function resumeCL(name){
  // PIN-Abfrage bevor Checkliste geöffnet wird
  showNamePinOverlay(name, function(){
    st.name=name;
    const login=activeLogins[name]||{};
    st.schicht=login.schicht||'mid';
    st.rolle=login.rolle||'kasse';
    st.bereich=login.bereich||'laden';
    st.startTime=login.startTime||login.loginTs||'';
    finishLogin();
  });
}

function safeTick(){try{tick();renderHomeActiveCL();}catch(e){}} safeTick();setInterval(safeTick,30000);
window.addEventListener('online', function(){ if(!fbReady) initFirebase(); });
window.addEventListener('online', function() { if(!fbReady) initFirebase(); });

// ═══════════════════════════════════════════
// NAV
// ═══════════════════════════════════════════
function go(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const target=document.getElementById(id);
  if(target) target.classList.add('active');
  else console.warn('go(): Element nicht gefunden:', id);
  window.scrollTo(0,0);
  // Kein sessionStorage - immer Home beim Start
}
function confirmGoHome(){
  go('s-home');
  setTimeout(function(){ try{renderHomeActiveCL();}catch(e){}},50);
}

function logout(){
  if(confirm('Wirklich ausloggen?')){
    if(st.name){
      delete activeLogins[st.name];
      lsSave('activeLogins',activeLogins);
      fbSave('activeLogins',activeLogins);
    }
    st.name='';
    st.zeStart=null;
    st.zeDate=null;
    clState={};
    const lb=document.getElementById('logout-btn');
    if(lb) lb.style.display='none';
    go('s-home');
  }
}
function openOv(id){
  const el=document.getElementById(id);
  if(el){
    el.classList.add('show');
    // PIN-Pad Listener für ov-pw
    if(id==='ov-pw'){
      pwPinReset(); // Platzhalter werden in pwPinReset gesetzt
      setTimeout(function(){
        const disp=document.getElementById('pw-pin-display');
        if(!disp) return;
        document.querySelectorAll('.pw-pin-btn').forEach(function(btn){
          // Entferne alte Listener durch Klonen
          const nb=btn.cloneNode(true);
          btn.parentNode.replaceChild(nb,btn);
          nb.addEventListener('click',function(){
            const k=this.getAttribute('data-k');
            let cur=disp.getAttribute('data-pin')||'';
            if(k==='⌫'){cur=cur.slice(0,-1);}
            else if(cur.length<20){cur+=k;}
            disp.setAttribute('data-pin',cur);
            disp.textContent=cur?'●'.repeat(Math.min(cur.length,8))+(cur.length>8?'…':''):'';
          });
        });
      },50);
    }
  }
}
function closeOv(id){const el=document.getElementById(id);if(el)el.classList.remove('show');}

// ═══════════════════════════════════════════
// DAY MODE
// ═══════════════════════════════════════════
// [dayCfg/slbls/dotCls/timeSlots – ausgelagert in data.js]
function goBereich(s){
  st.schicht = s;
  st.startTime = '';
  $text('b-lbl', slbls[s] || s);
  // Rollen-Container befüllen
  const container = document.getElementById('rollen-container');
  if(container){
    container.innerHTML = '';
    const rollen = ROLLEN_DEF[s] || [];
    const farben = {
      bake:    {bg:'#fff7ed', border:'#b45309', icon:'🥐'},
      kasse:   {bg:'#eff6ff', border:'#1d4ed8', icon:'🛒'},
      regal:   {bg:'#f0fdf4', border:'#15803d', icon:'📦'},
      lager:   {bg:'#fafafa', border:'#374151', icon:'🏭'},
      springer:{bg:'#fef3c7', border:'#d97706', icon:'🔄'},
    };
    rollen.forEach(function(r){
      const f = farben[r.id] || {bg:'#f5f5f5', border:'#888', icon:'⭐'};
      const taskCount = (rollenAufgaben[s+'_'+r.id]||[]).length;
      const btn = document.createElement('div');
      btn.style.cssText = 'background:'+f.bg+';border:2.5px solid '+f.border+';border-radius:16px;padding:18px 16px;cursor:pointer;display:flex;align-items:center;gap:14px;';
      btn.innerHTML =
        '<div style="font-size:34px;flex-shrink:0;">'+f.icon+'</div>'+
        '<div style="flex:1;">'+
          '<div style="font-size:17px;font-weight:800;color:#1a1a1a;">'+r.label+'</div>'+
          '<div style="font-size:12px;color:#666;margin-top:2px;">'+taskCount+' Aufgaben · Schichtbeginn bis Übergabe</div>'+
        '</div>'+
        '<div style="font-size:22px;color:#ccc;">›</div>';
      btn.addEventListener('click', (function(rid){ return function(){ setRolle(rid); }; })(r.id));
      container.appendChild(btn);
    });
  }
  go('s-bereich');
}

function goTimes(b){ goBereich(st.schicht||'mid'); } // Stub – nicht mehr genutzt

function goName(startTime){
  st.startTime = startTime||'';
  goToNamePicker();
}

function setRolle(rolle){
  try {
    st.rolle = rolle;
    st.bereich = (rolle==='bake')?'bake':'laden';
    goToNamePicker();
  } catch(e) { console.error('setRolle error:', e); }
}

function showNamePinOverlay(name, onSuccess){
  let pinVal = '';
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:700;display:flex;align-items:center;justify-content:center;padding:20px;';
  const card=document.createElement('div');
  card.style.cssText='background:#fff;border-radius:18px;padding:20px;width:100%;max-width:300px;text-align:center;';

  const nameDiv=document.createElement('div');
  nameDiv.style.cssText='font-size:22px;font-weight:900;margin-bottom:4px;';
  nameDiv.textContent='👤 '+name;
  card.appendChild(nameDiv);

  const subDiv=document.createElement('div');
  subDiv.style.cssText='font-size:13px;color:#888;margin-bottom:14px;';
  subDiv.textContent='Bitte PIN eingeben';
  card.appendChild(subDiv);

  const disp=document.createElement('div');
  disp.style.cssText='border:2px solid #e0e0e0;border-radius:12px;padding:14px;font-size:30px;text-align:center;margin-bottom:12px;background:#f9f9f9;color:#bbb;letter-spacing:10px;min-height:58px;';
  disp.textContent='••••';
  card.appendChild(disp);

  var updateDisp = function(){
    if(pinVal.length===0){disp.style.color='#bbb';disp.textContent='••••';}
    else{disp.style.color='#111';disp.textContent='●'.repeat(pinVal.length);}
  }

  const pad=document.createElement('div');
  pad.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;';
  [1,2,3,4,5,6,7,8,9,'',0,'⌫'].forEach(function(k){
    if(k===''){pad.appendChild(document.createElement('div'));return;}
    const b=document.createElement('button');
    b.type='button';
    b.textContent=String(k);
    b.style.cssText=(k==='⌫'?'background:#fee2e2;':'background:#f0f0f0;')+'border:none;border-radius:10px;padding:16px;font-size:20px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;-webkit-tap-highlight-color:transparent;';
    b.addEventListener('click',function(e){
      e.preventDefault();
      if(k==='⌫'){pinVal=pinVal.slice(0,-1);}
      else if(pinVal.length<8){pinVal+=String(k);}
      updateDisp();
    });
    pad.appendChild(b);
  });
  card.appendChild(pad);

  const okBtn=document.createElement('button');
  okBtn.type='button';
  okBtn.style.cssText='width:100%;background:#1e3a5f;color:#fff;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:8px;touch-action:manipulation;';
  okBtn.textContent='✅ Weiter';
  okBtn.addEventListener('click',function(){
    if(!pinVal){alert('Bitte PIN eingeben.');return;}
    const prof=maProfiles[name]||{};
    if(prof.pin&&pinVal!==prof.pin){
      pinVal='';updateDisp();
      alert('Falscher PIN.');return;
    }
    document.body.removeChild(ov);
    if(typeof onSuccess==='function')onSuccess();
    else startCL(name);
  });
  card.appendChild(okBtn);

  const cancelBtn=document.createElement('button');
  cancelBtn.type='button';
  cancelBtn.style.cssText='width:100%;background:none;border:none;color:#aaa;font-size:13px;cursor:pointer;font-family:inherit;touch-action:manipulation;';
  cancelBtn.textContent='Abbrechen';
  cancelBtn.addEventListener('click',function(){document.body.removeChild(ov);});
  card.appendChild(cancelBtn);

  ov.appendChild(card);
  document.body.appendChild(ov);
}

function goToNamePicker(){
  const grid=document.getElementById('name-grid');if(!grid)return;grid.innerHTML='';
  names.forEach(function(n){
    const btn=document.createElement('button');btn.className='name-btn';btn.textContent=n;
    btn.style.touchAction='manipulation';
    btn.addEventListener('click', (function(name){ return function(){
      showNamePinOverlay(name);
    };})(n));
    grid.appendChild(btn);
  });
  go('s-name');
}























































































// ═══════════════════════════════════════════
// INFO
// ═══════════════════════════════════════════
const infoStruct=[
  {key:'Lager',ico:'🏭',subs:['Licht','Alarmanlage','Tresor','Schlüsselkasten','Backofen','Gefrierschrank']},
  {key:'Laden',ico:'🛒',subs:['Trockenregale','Kühlschränke','Tiefkühlschränke','Obst & Gemüse','Frische Theke','Kassenbereich','Zigarettenbereich','Schiebetüren']},
  {key:'Technik',ico:'🎵',subs:['Musik','Beleuchtung','Klimaanlage']},
];






// ═══════════════════════════════════════════
// STRAFANTRAG
// ═══════════════════════════════════════════
let sa = {}; // aktueller Strafantrag-Entwurf
let saItems = []; // entwendete Gegenstände
















// ═══════════════════════════════════════════
// SCHICHTLEITER TABS
// ═══════════════════════════════════════════
let currentSLTab = 'dash';



// ═══════════════════════════════════════════
// UMSATZ
// ═══════════════════════════════════════════
let umsatzData = lsLoad('umsatzData', []); // loaded from localStorage





// ═══════════════════════════════════════════
// DIENSTPLAN (eingebettet aus prima-reutlingen.html)
// ═══════════════════════════════════════════
const DP_SK='prima_dp_v1';
const DP_SHIFTS=["frueh","mittel","spaet"];
const DP_SM={"frueh":{"label":"Frühschicht","color":"#2563a8","bg":"#e8f0fb"},"mittel":{"label":"Mittelschicht","color":"#166534","bg":"#dcfce7"},"spaet":{"label":"Spätschicht","color":"#7c3aed","bg":"#ede9fe"}};
const DP_DF=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
const DP_IMA=["Nino","Okan","Oleh","Yasin","Karimi","Dragan","Alisa","Adriana","Julian"];
const DP_IWK='2026-05-11';
const DP_IW={"frueh":[[{"name":"Nino","von":"04:00","bis":"12:45"},{"name":"Okan","von":"04:00","bis":"12:45"}],[{"name":"Nino","von":"04:00","bis":"12:45"},{"name":"Okan","von":"04:00","bis":"12:45"}],[{"name":"Nino","von":"04:00","bis":"12:45"},{"name":"Okan","von":"04:00","bis":"12:45"}],[{"name":"Oleh","von":"06:00","bis":"14:45"}],[{"name":"Oleh","von":"04:00","bis":"12:45"},{"name":"Okan","von":"06:00","bis":"14:45"}],[{"name":"Nino","von":"06:00","bis":"14:45"},{"name":"Okan","von":"06:00","bis":"14:45"}],[]],"mittel":[[{"name":"Yasin","von":"10:00","bis":"18:45"}],[{"name":"Yasin","von":"09:00","bis":"17:45"}],[{"name":"Karimi","von":"12:00","bis":"20:45"}],[{"name":"Yasin","von":"10:00","bis":"18:45"},{"name":"Karimi","von":"12:00","bis":"20:45"}],[{"name":"Dragan","von":"08:00","bis":"16:45"},{"name":"Karimi","von":"11:00","bis":"19:45"},{"name":"Okan","von":"14:00","bis":"22:00"}],[{"name":"Yasin","von":"10:00","bis":"18:45"},{"name":"Karimi","von":"14:00","bis":"22:45"}],[{"name":"Yasin","von":"10:00","bis":"18:45"},{"name":"Oleh","von":"11:00","bis":"19:45"},{"name":"Karimi","von":"12:00","bis":"20:45"}]],"spaet":[[{"name":"Oleh","von":"13:00","bis":"21:45"},{"name":"Alisa","von":"17:00","bis":"20:00"},{"name":"Adriana","von":"20:00","bis":"00:00"},{"name":"Julian","von":"20:00","bis":"00:00"}],[{"name":"Alisa","von":"17:00","bis":"20:00"},{"name":"Adriana","von":"20:00","bis":"00:00"},{"name":"Julian","von":"20:00","bis":"00:00"}],[{"name":"Alisa","von":"17:00","bis":"20:00"},{"name":"Adriana","von":"20:00","bis":"00:00"},{"name":"Julian","von":"20:00","bis":"00:00"}],[{"name":"Alisa","von":"16:00","bis":"20:00"},{"name":"Adriana","von":"20:00","bis":"00:00"},{"name":"Julian","von":"20:00","bis":"00:00"}],[{"name":"Alisa","von":"18:00","bis":"21:00"},{"name":"Adriana","von":"20:00","bis":"00:00"},{"name":"Julian","von":"20:00","bis":"00:00"}],[{"name":"Dragan","von":"15:00","bis":"00:00"},{"name":"Oleh","von":"16:00","bis":"00:00"},{"name":"Julian","von":"20:00","bis":"00:00"}],[{"name":"Dragan","von":"15:00","bis":"23:45"},{"name":"Julian","von":"18:00","bis":"00:00"}]]};

const dp_ad=(iso,n)=>{const d=new Date(iso);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
const dp_fmt=iso=>new Date(iso).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'});
const dp_kw=iso=>{const d=new Date(iso),j=new Date(d.getFullYear(),0,1);return Math.ceil(((d-j)/86400000+j.getDay()+1)/7);};
const dp_wl=iso=>'KW '+dp_kw(iso)+' · '+dp_fmt(iso)+' – '+dp_fmt(dp_ad(iso,6));
const dp_today=()=>new Date().toISOString().slice(0,10);
const dp_emon=()=>{const w={};DP_SHIFTS.forEach(s=>w[s]=Array(7).fill(null).map(()=>[]));return w;};
const dp_isoMon=s=>{const d=new Date(s),dy=d.getDay();d.setDate(d.getDate()-(dy===0?6:dy-1));return d.toISOString().slice(0,10);};






let DP=dp_load();
let dp_as,dp_ad2,dp_eSh,dp_eDay,dp_eIdx,dp_dragSh=null,dp_dragDay=null,dp_dragIdx=null;



























// ═══════════════════════════════════════════
// WOCHENAUFGABEN
// ═══════════════════════════════════════════
const DOW_MAP = {mo:1,di:2,mi:3,do:4,fr:5,sa:6,so:0};
let editingWeeklyId = null;













// ═══════════════════════════════════════════
// SL TASKS
// ═══════════════════════════════════════════
let editingSLTaskId = null;















let tempInputTarget = null;




// ═══════════════════════════════════════════
// SLUSH REINIGUNG
// ═══════════════════════════════════════════
// ── INVENTUR DATA ────────────────────────────────────────────────────────
const INV_BEREICHE = {
  0:'Drogeriebereich',
  1:'Milch, Wurst & Käse',
  2:'Bierabteilung',
  3:'Softdrinks',
  4:'Süßigkeiten & Chips',
  5:'Tiefkühlbereich',
  6:'Frühstücksbereich',
};
const INV_ANZAHL = {0:10,1:5,2:10,3:10,4:10,5:10,6:10};

let inventurRows = []; // [{id,artikel,barcode,soll,ist}]
let inventurHistory = lsLoad('inventurHistory', []); // saved sessions
let invTaskId = null;















// ═══════════════════════════════════════════
// INFO CHECKLISTEN
// ═══════════════════════════════════════════

// waschmaschinenHistory: [{date, ts, ma}]
let waschHistory = lsLoad('waschHistory', []);
// kaffemaschinenHistory: [{date, ts, ma, steps:[{id,done}]}]
let kaffeeHistory = lsLoad('kaffeeHistory', []);

const KAFFEE_STEPS = [
  {id:'k1', text:'Kaffeesatz entnehmen & Tresterbehälter leeren'},
  {id:'k2', text:'Abtropfschale reinigen'},
  {id:'k3', text:'Milchsystem spülen (Reinigungsprogramm starten)'},
  {id:'k4', text:'Brüheinheit entnehmen & ausspülen'},
  {id:'k5', text:'Wassertank leeren, reinigen & auffüllen'},
  {id:'k6', text:'Abwassertank leeren'},
  {id:'k7', text:'Außenfläche abwischen'},
];

// Default Ist-Werte = Sollwerte (Mitte des Sollbereichs)
const TEMP_DEFAULTS = {
  t1: 4, t2: 4, t3: 3, t4: 5, t5: 5, t6: 5,
  t20:-21, t21:-21, t23:-20, t24:-20, t25:-21, t26:-21, t27:-21
};

let tempInputSession = {}; // deviceId → value (for current input session)
let kaffeeStepState = {}; // stepId → done

















// ═══════════════════════════════════════════
// BARCODE SCANNER
// ═══════════════════════════════════════════
let scanStream = null;
let scanCallback = null;
let scanAnimFrame = null;




// ═══════════════════════════════════════════
// SCHWARZES BRETT
// ═══════════════════════════════════════════



function updateBadges() {
  // Brett badge: unconfirmed messages for current user
  const unconf = schwarzesBrett.filter(m=>m.aktiv&&!(m.bestaetigt&&st.name&&m.bestaetigt.includes(st.name)));
  const brettBadge = document.getElementById('brett-badge');
  if(brettBadge){ brettBadge.style.display=unconf.length?'block':'none'; brettBadge.textContent=unconf.length; }
  // Defekt badge: open defects
  const openDef = defektMeldungen.filter(d=>d.status==='offen').length;
  const defBadge = document.getElementById('defekt-badge');
  if(defBadge){ defBadge.style.display=openDef?'block':'none'; defBadge.textContent=openDef; }
}

// ═══════════════════════════════════════════
// DEFEKT MELDEN
// ═══════════════════════════════════════════














// ═══════════════════════════════════════════
// EXPORT / HACCP PDF
// ═══════════════════════════════════════════

/** Zeigt HTML-Bericht als In-App-Overlay mit Drucken/Schließen-Option */

























// ═══════════════════════════════════════════
// HR TAB (SL Konsole)
// ═══════════════════════════════════════════
let currentHRTab = 'zeiten';



















































// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
renderInfo();
updateSLBadge();
updateBadges();
// Immer auf Home starten
initFirebase();


// Kachel-Listener
(function(){function bt(id,fn){var el=document.getElementById(id);if(el)el.addEventListener('click',fn);}
bt('tile-early',function(){goBereich('early');});
bt('tile-mid',function(){goBereich('mid');});
bt('tile-late',function(){goBereich('late');});
bt('tile-info',function(){goInfo();});
bt('tile-sl',function(){askSL();});
bt('tile-admin',function(){askAdmin();});
})();


// HACCP Button wird in renderSL() nach dem Rendern gebunden

// HR Tab Listener
(function(){
  var hrTabs = ['zeiten','urlaub','krank','profile','zuschlag','gehalt'];
  hrTabs.forEach(function(t, idx){
    var btn = document.getElementById('hr-t'+(idx+1));
    if(btn) btn.addEventListener('click', (function(tab){ return function(){ hrTab(tab); }; })(t));
  });
})();
