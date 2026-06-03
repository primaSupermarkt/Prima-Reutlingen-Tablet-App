// ═══════════════════════════════════════════════════════════════
// DATA.JS
// Stammdaten der App: Mitarbeiter, Checklisten, Geräte, Aufgaben.
// Laden-spezifische Daten kommen aus store-config.js.
// ═══════════════════════════════════════════════════════════════

// ── Passwörter (werden aus localStorage geladen) ─────────────────
// SICHERHEITSHINWEIS: In einer späteren Version werden diese
// durch Firebase Auth ersetzt. Dann entfallen diese Zeilen.

// ── Zugangsdaten (temporär, werden durch Firebase Auth ersetzt) ──
let ADMIN_PW = localStorage.getItem('prima_adminPw') || '1992';
let SL_PW    = localStorage.getItem('prima_slPw')    || '2511';
let editingTaskId = null;

// In-memory data (wird später durch Firebase ersetzt)
let names    = ['Nino','Karimi','Okan','Yasin','Alisa','Adriana','Julian','Oleh'];
let reasons  = ['Ware nicht gekommen','Gerät defekt','Keine Zeit','Kollege nicht verfügbar','Technisches Problem','Sonstiges'];
let infoLinks= [];
let history  = lsLoad('history', []); // loaded from localStorage
let ubergaben = lsLoad('ubergaben', []); // loaded from localStorage



// ── Temperaturgeräte ─────────────────────────────────────────────
const TEMP_DEVICES = [
  // Kühlgeräte (Laden)
  {id:'t1',  nr:1,  name:'Kühlregal 1',                  type:'kuehl',   sollMin:2,  sollMax:7,   warnAt:7,   alarmAt:8},
  {id:'t2',  nr:2,  name:'Kühlregal 2',                  type:'kuehl',   sollMin:2,  sollMax:7,   warnAt:7,   alarmAt:8},
  {id:'t3',  nr:3,  name:'Frischetheke',                  type:'kuehl',   sollMin:2,  sollMax:4,   warnAt:4,   alarmAt:5},
  {id:'t4',  nr:4,  name:'Getränkekühlschrank',           type:'kuehl',   sollMin:2,  sollMax:8,   warnAt:7,   alarmAt:8},
  {id:'t5',  nr:5,  name:'Getränkekühlschrank schmal 1',  type:'kuehl',   sollMin:2,  sollMax:8,   warnAt:7,   alarmAt:8},
  {id:'t6',  nr:6,  name:'Getränkekühlschrank schmal 2',  type:'kuehl',   sollMin:2,  sollMax:8,   warnAt:7,   alarmAt:8},
  // Tiefkühlgeräte
  {id:'t20', nr:20, name:'Tiefkühl-Überschrank 1',        type:'tiefkuehl', sollMin:-99, sollMax:-18, warnAt:-18, alarmAt:-15},
  {id:'t21', nr:21, name:'Tiefkühl-Überschrank 2',        type:'tiefkuehl', sollMin:-99, sollMax:-18, warnAt:-18, alarmAt:-15},
  {id:'t23', nr:23, name:'Tiefkühltruhe 1',               type:'tiefkuehl', sollMin:-99, sollMax:-18, warnAt:-18, alarmAt:-15},
  {id:'t24', nr:24, name:'Tiefkühltruhe 2',               type:'tiefkuehl', sollMin:-99, sollMax:-18, warnAt:-18, alarmAt:-15},
  {id:'t25', nr:25, name:'Tiefkühlschrank Lager 1',       type:'tiefkuehl', sollMin:-99, sollMax:-18, warnAt:-18, alarmAt:-15},
  {id:'t26', nr:26, name:'Tiefkühlschrank Lager 2',       type:'tiefkuehl', sollMin:-99, sollMax:-18, warnAt:-18, alarmAt:-15},
  {id:'t27', nr:27, name:'Tiefkühlschrank Lager 3',       type:'tiefkuehl', sollMin:-99, sollMax:-18, warnAt:-18, alarmAt:-15},
];



// ── Regal-Gruppen (Foto-Rotation) ────────────────────────────────
const REGAL_GRUPPEN = [
  {day:0, label:'Tag 1 – Kasse & Kühlschränke', items:['Kassenbereich (Zigaretten & Kaugummis)','Mopro-Kühlschrank','Alkohol-Kühlschrank','Kaffeestation']},
  {day:1, label:'Tag 2 – Getränkekühlschränke & Tiefkühl', items:['Kühlschrank links (Energydrinks)','Kühlschrank rechts (kalter Kaffee)','Tiefkühl-Überschrank rechts','Tiefkühl-Überschrank links','Gefriertruhe rechts','Gefriertruhe links']},
  {day:2, label:'Tag 3 – Frische & Obst', items:['Frischeregal','Obst- & Gemüseschräge','Blumen']},
  {day:3, label:'Tag 4 – Wein, Bier & Getränke', items:['Kopfregal Wein (Regal 1)','Regal Bierdosen','Regal Flaschenbier','Regal Softdrinkdosen & Tetrapack','Kopfregal Getränke','Wasserregal (Eingang)']},
  {day:4, label:'Tag 5 – Snacks & Süßes', items:['Regal Salzgebäck','Regal Chips','Regal Schokolade & Riegel','Regal Kekse','Kopfregal Kekse','Regal Softdrinks & Capri Sonne']},
  {day:5, label:'Tag 6 – Drogerie, Baby & Spezialitäten', items:['Regal Drogerie','Regal Baby & Kind','Kopfregal Trockenfrüchte','Kopfregal Lindt','Regal griechische Artikel']},
  {day:6, label:'Tag 7 – Trockensortiment', items:['Regal Konserven','Regal Nudeln & Reis','Regal Mehl, Zucker & Backmischungen','Regal Frühstück, Cerealien & Cornflakes','Regal Brot & Petrapacks']},
];



// ── Rollen-Aufgaben (Checklisten pro Schicht+Rolle) ──────────────
let rollenAufgaben = lsLoad('rollenAufgaben', {
  // ─── FRÜH: BAKE-OFF ───
  'early_bake': [
    {id:'eb1', section:'start',  text:'Laden & Lager aufschließen, Alarmanlage aus', warn:'', ub:false},
    {id:'eb2', section:'start',  text:'Frischwassertank kontrollieren & auffüllen',  warn:'', ub:false},
    {id:'eb3', section:'start',  text:'Abwassertank leeren',                         warn:'', ub:false},
    {id:'eb4', section:'start',  text:'Backofen einschalten & auf 180°C',            warn:'', ub:false},
    {id:'eb5', section:'start',  text:'Teiglinge aus Kühlschrank auf Bleche',        warn:'', ub:false},
    {id:'eb6', section:'start',  text:'Backwaren backen & einräumen',                warn:'special:backen', ub:false, special:'backen'},
    {id:'eb7', section:'start',  text:'Temperaturkontrolle durchführen',             warn:'Alle Kühl- und Tiefkühlgeräte prüfen', ub:true, special:'temp', oncePerDay:true},
    {id:'eb8', section:'pause1', text:'Erste Pause (nach ca. 3h)',                   warn:'', ub:false, special:'pause'},
    {id:'eb9', section:'pause1', text:'Kühlbereiche & MHD kontrollieren',            warn:'Abgelaufene Ware sofort entfernen', ub:false},
    {id:'eb10',section:'pause1', text:'Regale kontrollieren & Ware bestücken',       warn:'', ub:true},
    {id:'eb11',section:'pause2', text:'Zweite Pause (vor Übergabe)',                 warn:'', ub:false, special:'pause'},
    {id:'eb12',section:'pause2', text:'Kassenbereich reinigen',                      warn:'', ub:true},
    {id:'eb13',section:'pause2', text:'Regale für nächste Schicht vorbereiten',      warn:'', ub:true},
    {id:'eb14',section:'ende',   text:'Schichtübergabe vorbereiten',                 warn:'', ub:true, special:'ub'},
  ],
  // ─── FRÜH: KASSE ───
  'early_kasse': [
    {id:'early_kasse_temp', section:'start', text:'Temperaturkontrolle durchführen', warn:'Alle Kühl- und Tiefkühlgeräte prüfen', ub:true, special:'temp', oncePerDay:true},
    {id:'ek1', section:'start',  text:'Kassenbereich reinigen & kontrollieren',      warn:'', ub:false},
    {id:'ek2', section:'start',  text:'Wechselgeld prüfen',                          warn:'', ub:false},
    {id:'ek3', section:'start',  text:'Eingang & Schiebetüren kontrollieren',        warn:'Defekte sofort melden', ub:false},
    {id:'ek4', section:'start',  text:'Besteck & Servietten an der Kasse prüfen',    warn:'Bei Mangel: Schichtleiter informieren', ub:false},
    {id:'ek5', section:'pause1', text:'Erste Pause (nach ca. 3h)',                   warn:'', ub:false, special:'pause'},
    {id:'ek6', section:'pause1', text:'Kaffeestation: Milch, Zucker, Rührstäbchen',  warn:'Bei Mangel: Schichtleiter', ub:false},
    {id:'ek7', section:'pause2', text:'Zweite Pause (vor Übergabe)',                 warn:'', ub:false, special:'pause'},
    {id:'ek8', section:'pause2', text:'Kassenbereich für nächste Schicht vorbereiten',warn:'', ub:true},
    {id:'ek9', section:'ende',   text:'Zigaretteninventur durchführen',              warn:'Alle Lücken notieren & an Schichtleiter', ub:true},
    {id:'ek10',section:'ende',   text:'Schichtübergabe vorbereiten',                 warn:'', ub:true, special:'ub'},
  ],
  // ─── FRÜH: REGALE ───
  'early_regal': [
    {id:'early_regal_temp', section:'start', text:'Temperaturkontrolle durchführen', warn:'Alle Kühl- und Tiefkühlgeräte prüfen', ub:true, special:'temp', oncePerDay:true},
    {id:'er1', section:'start',  text:'Regale kontrollieren & Ware bestücken',       warn:'', ub:false},
    {id:'er2', section:'start',  text:'MHD-Kontrolle: Tiefkühlbereich',              warn:'Abgelaufene Ware sofort entfernen', ub:false},
    {id:'er3', section:'start',  text:'Regalfotos aufnehmen',                        warn:'', ub:false, special:'regalfoto'},
    {id:'er4', section:'pause1', text:'Erste Pause (nach ca. 3h)',                   warn:'', ub:false, special:'pause'},
    {id:'er5', section:'pause1', text:'Aktionsware: Preisschilder kontrollieren',    warn:'', ub:false},
    {id:'er6', section:'pause2', text:'Zweite Pause (vor Übergabe)',                 warn:'', ub:false, special:'pause'},
    {id:'er7', section:'pause2', text:'Regale vollständig bestückt',                 warn:'', ub:true},
    {id:'er8', section:'ende',   text:'Schichtübergabe vorbereiten',                 warn:'', ub:true, special:'ub'},
  ],
  // ─── FRÜH: LAGER ───
  'early_lager': [
    {id:'early_lager_temp', section:'start', text:'Temperaturkontrolle durchführen', warn:'Alle Kühl- und Tiefkühlgeräte prüfen', ub:true, special:'temp', oncePerDay:true},
    {id:'el1', section:'start',  text:'Lager kontrollieren & aufräumen',             warn:'', ub:false},
    {id:'el2', section:'start',  text:'Warenlieferung prüfen & einräumen',           warn:'', ub:false},
    {id:'el3', section:'pause1', text:'Erste Pause (nach ca. 3h)',                   warn:'', ub:false, special:'pause'},
    {id:'el4', section:'pause1', text:'Kühlkette kontrollieren',                     warn:'', ub:false},
    {id:'el5', section:'pause2', text:'Zweite Pause (vor Übergabe)',                 warn:'', ub:false, special:'pause'},
    {id:'el6', section:'pause2', text:'Lager für nächste Schicht vorbereiten',       warn:'', ub:true},
    {id:'el7', section:'ende',   text:'Schichtübergabe vorbereiten',                 warn:'', ub:true, special:'ub'},
  ],
  // ─── MITTE: KASSE ───
  'mid_kasse': [
    {id:'mid_kasse_temp', section:'start', text:'Temperaturkontrolle durchführen', warn:'Alle Kühl- und Tiefkühlgeräte prüfen', ub:true, special:'temp', oncePerDay:true},
    {id:'mk1', section:'start',  text:'Kassenbereich übernehmen & kontrollieren',    warn:'', ub:false},
    {id:'mk2', section:'start',  text:'Kaffeestation auffüllen',                     warn:'', ub:false},
    {id:'mk3', section:'start',  text:'Einkaufstüten alle Sorten prüfen',            warn:'Fehlende Sorten sofort melden', ub:false},
    {id:'mk4', section:'pause1', text:'Erste Pause',                                 warn:'', ub:false, special:'pause'},
    {id:'mk5', section:'pause1', text:'Kassenbereich reinigen',                      warn:'', ub:false},
    {id:'mk6', section:'pause2', text:'Zweite Pause (vor Übergabe)',                 warn:'', ub:false, special:'pause'},
    {id:'mk7', section:'pause2', text:'Verbrauchsmaterial prüfen & auffüllen',       warn:'Bei Mangel: Schichtleiter', ub:true},
    {id:'mk8', section:'ende',   text:'Schichtübergabe vorbereiten',                 warn:'', ub:true, special:'ub'},
  ],
  // ─── MITTE: REGALE ───
  'mid_regal': [
    {id:'mid_regal_temp', section:'start', text:'Temperaturkontrolle durchführen', warn:'Alle Kühl- und Tiefkühlgeräte prüfen', ub:true, special:'temp', oncePerDay:true},
    {id:'mr1', section:'start',  text:'Regalpflege: Regale kontrollieren & bestücken', warn:'', ub:false},
    {id:'mr2', section:'start',  text:'Regalfotos aufnehmen',                        warn:'', ub:false, special:'regalfoto'},
    {id:'mr3', section:'pause1', text:'Erste Pause',                                 warn:'', ub:false, special:'pause'},
    {id:'mr4', section:'pause1', text:'MHD-Kontrolle durchführen',                   warn:'Abgelaufene Ware entfernen', ub:false},
    {id:'mr5', section:'pause2', text:'Zweite Pause (vor Übergabe)',                 warn:'', ub:false, special:'pause'},
    {id:'mr6', section:'pause2', text:'Regale vollständig für Spätschicht',          warn:'', ub:true},
    {id:'mr7', section:'ende',   text:'Schichtübergabe vorbereiten',                 warn:'', ub:true, special:'ub'},
  ],
  // ─── MITTE: LAGER ───
  'mid_lager': [
    {id:'mid_lager_temp', section:'start', text:'Temperaturkontrolle durchführen', warn:'Alle Kühl- und Tiefkühlgeräte prüfen', ub:true, special:'temp', oncePerDay:true},
    {id:'mla1',section:'start',  text:'Lager übernehmen & kontrollieren',            warn:'', ub:false},
    {id:'mla2',section:'start',  text:'Wareneingang verarbeiten',                    warn:'', ub:false},
    {id:'mla3',section:'pause1', text:'Erste Pause',                                 warn:'', ub:false, special:'pause'},
    {id:'mla4',section:'pause2', text:'Zweite Pause (vor Übergabe)',                 warn:'', ub:false, special:'pause'},
    {id:'mla5',section:'pause2', text:'Lager aufräumen & für Spätschicht vorbereiten',warn:'', ub:true},
    {id:'mla6',section:'ende',   text:'Schichtübergabe vorbereiten',                 warn:'', ub:true, special:'ub'},
  ],
  // ─── MITTE: SPRINGER ───
  'mid_springer': [
    {id:'mid_springer_temp', section:'start', text:'Temperaturkontrolle durchführen', warn:'Alle Kühl- und Tiefkühlgeräte prüfen', ub:true, special:'temp', oncePerDay:true},
    {id:'ms1', section:'start',  text:'Bereich übernehmen – Engpässe abdecken',      warn:'', ub:false},
    {id:'ms2', section:'pause1', text:'Erste Pause',                                 warn:'', ub:false, special:'pause'},
    {id:'ms3', section:'pause2', text:'Zweite Pause (vor Übergabe)',                 warn:'', ub:false, special:'pause'},
    {id:'ms4', section:'ende',   text:'Schichtübergabe vorbereiten',                 warn:'', ub:true, special:'ub'},
  ],
  // ─── SPÄT: KASSE ───
  'late_kasse': [
    {id:'late_kasse_temp', section:'start', text:'Temperaturkontrolle durchführen', warn:'Alle Kühl- und Tiefkühlgeräte prüfen', ub:true, special:'temp', oncePerDay:true},
    {id:'sk1', section:'start',  text:'Kassenbereich übernehmen',                    warn:'', ub:false},
    {id:'sk2', section:'start',  text:'Wechselgeld zählen & kontrollieren',          warn:'', ub:false},
    {id:'sk3', section:'pause1', text:'Erste Pause',                                 warn:'', ub:false, special:'pause'},
    {id:'sk4', section:'pause1', text:'Kassenbereich reinigen',                      warn:'', ub:false},
    {id:'sk5', section:'pause2', text:'Zweite Pause (vor Übergabe)',                 warn:'', ub:false, special:'pause'},
    {id:'sk6', section:'pause2', text:'Zigaretteninventur',                          warn:'Alle Lücken notieren', ub:true},
    {id:'sk7', section:'ende',   text:'Kasse abschließen & Kassenabrechnung',        warn:'', ub:true},
    {id:'sk8', section:'ende',   text:'Schichtübergabe vorbereiten',                 warn:'', ub:true, special:'ub'},
  ],
  // ─── SPÄT: REGALE ───
  'late_regal': [
    {id:'late_regal_temp', section:'start', text:'Temperaturkontrolle durchführen', warn:'Alle Kühl- und Tiefkühlgeräte prüfen', ub:true, special:'temp', oncePerDay:true},
    {id:'sr1', section:'start',  text:'Regale kontrollieren & auffüllen',            warn:'', ub:false},
    {id:'sr2', section:'pause1', text:'Erste Pause',                                 warn:'', ub:false, special:'pause'},
    {id:'sr3', section:'pause1', text:'MHD-Kontrolle Tiefkühl & Frische',            warn:'Abgelaufene Ware entfernen', ub:false},
    {id:'sr4', section:'pause2', text:'Zweite Pause (vor Übergabe)',                 warn:'', ub:false, special:'pause'},
    {id:'sr5', section:'pause2', text:'Regale für Ladenschluss vorbereiten',         warn:'', ub:true},
    {id:'sr6', section:'ende',   text:'Leergut & Lagerfläche aufräumen',             warn:'', ub:false},
    {id:'sr7', section:'ende',   text:'Schichtübergabe vorbereiten',                 warn:'', ub:true, special:'ub'},
  ],
  // ─── SPÄT: LAGER ───
  'late_lager': [
    {id:'late_lager_temp', section:'start', text:'Temperaturkontrolle durchführen', warn:'Alle Kühl- und Tiefkühlgeräte prüfen', ub:true, special:'temp', oncePerDay:true},
    {id:'sl1', section:'start',  text:'Lager übernehmen & kontrollieren',            warn:'', ub:false},
    {id:'sl2', section:'pause1', text:'Erste Pause',                                 warn:'', ub:false, special:'pause'},
    {id:'sl3', section:'pause2', text:'Zweite Pause (vor Übergabe)',                 warn:'', ub:false, special:'pause'},
    {id:'sl4', section:'pause2', text:'Lager aufräumen & abschließen',               warn:'', ub:true},
    {id:'sl5', section:'ende',   text:'Schichtübergabe vorbereiten',                 warn:'', ub:true, special:'ub'},
  ],
});



// ── Backen-Schritte ──────────────────────────────────────────────
let backenTasks = [
  {id:'bk1',text:'Schritt 1: Pizzateiglinge & gefüllte Teiglinge in Ofen',warn:''},
  {id:'bk2',text:'Schritt 1 fertig – aus Ofen entnehmen',warn:'⚠️ Handschuhe!'},
  {id:'bk3',text:'Schritt 2: Blätterteig süß, Croissants, Schokocroissants in Ofen',warn:''},
  {id:'bk4',text:'Schritt 2 fertig – aus Ofen entnehmen',warn:'⚠️ Handschuhe!'},
  {id:'bk5',text:'Schritt 3: Brezel, Laugenstange, Brötchen in Ofen',warn:''},
  {id:'bk6',text:'Schritt 3 fertig – aus Ofen entnehmen',warn:'⚠️ Handschuhe!'},
  {id:'bk7',text:'Alle Backwaren in Blechwagen – 15 Min. abkühlen',warn:'⚠️ Hitzeschutzhandschuhe!'},
  {id:'bk8',text:'Leere Kartons sofort in Kühlschrank',warn:'⚠️ Nie draußen vergessen!'},
];



// ── Tag-Konfiguration (Werktag / Wochenende / Feiertag) ──────────
const dayCfg={wt:{ico:'📅',txt:'Werktag'},we:{ico:'🌤️',txt:'Samstag/Sonntag'},ft:{ico:'🎉',txt:'Feiertag'}};
function setDay(m){
  st.day=m;
  $text('d-ico', dayCfg[m].ico);
  $text('d-txt', dayCfg[m].txt);
  ['wt','we','ft'].forEach(k=>{const b=document.getElementById('btn-'+k);if(b)b.classList.toggle('on',k===m);});
}

// ═══════════════════════════════════════════
// BEREICH / TIMES / NAME
// ═══════════════════════════════════════════
const slbls={early:'Frühschicht',mid:'Mittelschicht',late:'Spätschicht'};
const dotCls={early:'de',mid:'dm',late:'dl'};
const timeSlots={
  early:[{s:'04:00',e:'12:45'},{s:'04:30',e:'13:15'},{s:'05:00',e:'13:45'},{s:'05:30',e:'14:15'},
         {s:'06:00',e:'14:45'},{s:'06:30',e:'15:00'},{s:'07:00',e:'15:45'},{s:'07:30',e:'16:15'},
         {s:'08:00',e:'16:45'},{s:'08:30',e:'17:15'},{s:'09:00',e:'17:45'}],
  mid: [{s:'09:00',e:'17:45'},{s:'09:30',e:'18:15'},{s:'10:00',e:'18:45'},{s:'10:30',e:'19:15'},
        {s:'11:00',e:'19:45'},{s:'11:30',e:'20:15'},{s:'12:00',e:'20:45'}],
  late:[{s:'12:00',e:'20:45'},{s:'12:30',e:'21:15'},{s:'13:00',e:'21:45'},{s:'13:30',e:'22:15'},
        {s:'14:00',e:'22:45'},{s:'14:30',e:'23:15'},{s:'15:00',e:'23:45'},{s:'15:30',e:'00:15'},
        {s:'16:00',e:'00:45'},{s:'17:00',e:'01:45'},{s:'18:00',e:'02:45'},
        {s:'19:00',e:'03:45'},{s:'20:00',e:'04:45'}],
};

