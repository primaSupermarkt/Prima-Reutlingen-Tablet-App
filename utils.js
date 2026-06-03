// ═══════════════════════════════════════════════════════
// UTILS.JS
// Allgemeine Hilfsfunktionen ohne externe Abhängigkeiten.
// Wird nach firebase.js geladen – vor allen Modulen.
// Enthält: Datumsfunktionen, DOM-Helfer, Format-Helfer
// ═══════════════════════════════════════════════════════

// Datum-Key (ISO-Format: YYYY-MM-DD)
function dayKey(d){ return d.toISOString ? d.toISOString().slice(0,10) : String(d).slice(0,10); }

// Datum-Label (lesbar: "Mo 3. Jun")
function dayLabel(d){ const days=['So','Mo','Di','Mi','Do','Fr','Sa'],mo=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']; return days[d.getDay()]+' '+d.getDate()+'. '+mo[d.getMonth()]; }

// DOM-Abschnitt-Überschrift erstellen
function mkSec(txt){ const d=document.createElement('div');d.className='a-sec';d.textContent=txt;return d; }

// Schichthistorie für einen Tag holen
function getHistForDay(d){ const key=dayKey(d); return history.filter(function(h){try{const hd=new Date(h.datum||h.date||h.ts);return dayKey(hd)===key;}catch(e){return false;}}); }

// Übergaben für einen Tag holen
function getUBForDay(d){ const key=dayKey(d); return ubergaben.filter(function(u){try{const ud=new Date(u.ts||u.datum);return dayKey(ud)===key;}catch(e){return false;}}); }

// Aktuelle Uhrzeit als String (HH:MM)
function nowStr(){ const n=new Date(); return String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0'); }

