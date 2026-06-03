// ═══════════════════════════════════════════════════════════════
// URLAUB.JS
// Urlaubsantrag stellen und Übersicht
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════
// URLAUB
// ═══════════════════════════════════════════
function openUrlaub(profilName) {
  // Name: entweder aus Schicht-Login oder aus Profil-Aufruf
  const name = profilName || st.name || '';
  const display = document.getElementById('urlaub-ma-display');
  const hidden = document.getElementById('urlaub-ma');
  if(display) { display.textContent = name || ''; }
  if(hidden) hidden.value = name;

  // Kontingent anzeigen
  updateUrlaubKontingent(name);

  // Felder zurücksetzen
  $set('urlaub-von', 'value', '');
  $set('urlaub-bis', 'value', '');
  $set('urlaub-tage', 'value', '');
  $text('urlaub-tage-hint', '');
  $set('urlaub-grund', 'value', '');

  renderUrlaubList();
  go('s-urlaub');
}

function updateUrlaubKontingent(name) {
  const block = document.getElementById('urlaub-kontingent');
  if(!block || !name) return;
  const prof = maProfiles[name] || {};
  const anspruch = calcUrlaubsanspruchDiesesJahr(prof.urlaubAnspruch||0, prof.eintrittsDatum||'');
  if(!anspruch) { block.style.display = 'none'; return; }
  const verbraucht = urlaubAntraege
    .filter(function(u){ return u.ma === name && u.status === 'genehmigt'; })
    .reduce(function(s, u){ return s + (u.urlaubTage || 0); }, 0);
  const verfuegbar = anspruch - verbraucht;
  $text('uk-anspruch', anspruch);
  $text('uk-verbraucht', verbraucht);
  $text('uk-verfuegbar', verfuegbar);
  block.style.display = 'block';
}

function updateUrlaubTage() {
  const von = document.getElementById('urlaub-von').value;
  const bis = document.getElementById('urlaub-bis').value;
  const hint = document.getElementById('urlaub-tage-hint');
  if(!von || !bis || von > bis) { hint.textContent = ''; return; }
  const kalTage = Math.round((new Date(bis) - new Date(von)) / (1000*60*60*24)) + 1;
  hint.textContent = 'Kalendertage: ' + kalTage + ' – bitte deine tatsächlichen Urlaubstage eintragen';
}

function renderUrlaubList() {
  const list = document.getElementById('urlaub-list');
  if(!list) return;
  const myAntraege = urlaubAntraege.filter(a=>a.ma===st.name||!st.name);
  list.innerHTML = '';
  if(!myAntraege.length){
    list.innerHTML='<div style="text-align:center;padding:20px;color:#ccc;">Noch keine Anträge</div>';
    return;
  }
  [...myAntraege].reverse().forEach(a=>{
    const col=a.status==='genehmigt'?'#16a34a':a.status==='abgelehnt'?'#dc2626':'#f59e0b';
    const lbl=a.status==='genehmigt'?'✅ Genehmigt':a.status==='abgelehnt'?'❌ Abgelehnt':'⏳ Ausstehend';
    const card=document.createElement('div');
    card.style.cssText='background:#fff;border-radius:11px;padding:12px 14px;margin-bottom:8px;box-shadow:0 1px 5px rgba(0,0,0,.06);border-left:3px solid '+col+';';
    card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;">'+
      '<div style="font-size:13px;font-weight:700;">'+a.von+' – '+a.bis+'</div>'+
      '<div style="font-size:12px;font-weight:700;color:'+col+';">'+lbl+'</div></div>'+
      '<div style="font-size:12px;color:#444;margin-top:3px;font-weight:600;">'+(a.urlaubTage ? a.urlaubTage+' Urlaubstage' : '')+'</div>'+
      (a.grund?'<div style="font-size:11px;color:#888;margin-top:2px;">'+a.grund+'</div>':'')+
      '<div style="font-size:10px;color:#ccc;margin-top:3px;">Eingereicht: '+a.ts+'</div>';
    list.appendChild(card);
  });
}

function submitUrlaub() {
  const ma = document.getElementById('urlaub-ma').value;
  const von = document.getElementById('urlaub-von').value;
  const bis = document.getElementById('urlaub-bis').value;
  const tage = parseFloat(document.getElementById('urlaub-tage').value);
  const grund = document.getElementById('urlaub-grund').value;
  if(!ma) { alert('Kein Mitarbeiter-Login gefunden. Bitte zuerst einloggen.'); return; }
  if(!von || !bis) { alert('Bitte Von- und Bis-Datum ausfüllen.'); return; }
  if(von > bis) { alert('Das Enddatum muss nach dem Startdatum liegen.'); return; }
  if(!tage || tage <= 0) { alert('Bitte die Anzahl der Urlaubstage eintragen.'); return; }
  // Kontingent prüfen
  const prof = maProfiles[ma] || {};
  const anspruch = calcUrlaubsanspruchDiesesJahr(prof.urlaubAnspruch||0, prof.eintrittsDatum||'');
  if(anspruch > 0) {
    const verbraucht = urlaubAntraege
      .filter(function(u){ return u.ma === ma && u.status === 'genehmigt'; })
      .reduce(function(s, u){ return s + (u.urlaubTage || 0); }, 0);
    if(tage > (anspruch - verbraucht)) {
      if(!confirm('⚠️ Du beantragst '+tage+' Tage, verfügbar sind noch '+(anspruch-verbraucht)+' Tage. Trotzdem einreichen?')) return;
    }
  }
  const entry = {id:'url'+Date.now(), ts:new Date().toLocaleString('de-DE'), ma, von, bis, urlaubTage:tage, grund, status:'ausstehend'};
  urlaubAntraege.push(entry);
  lsSave('urlaubAntraege', urlaubAntraege);
  fbSave('urlaubAntraege', urlaubAntraege);
  mitarbeiterNachrichten.push({ts:entry.ts, name:ma, text:'🌴 Urlaubsantrag: '+von+' bis '+bis+' ('+tage+' Tage)'+(grund?' · '+grund:''), schicht:'–', gelesen:false});
  lsSave('mitNachrichten', mitarbeiterNachrichten);
  fbSave('mitNachrichten', mitarbeiterNachrichten);
  updateSLBadge();
  $set('urlaub-von', 'value', '');
  $set('urlaub-bis', 'value', '');
  $set('urlaub-tage', 'value', '');
  $text('urlaub-tage-hint', '');
  $set('urlaub-grund', 'value', '');
  updateUrlaubKontingent(ma);
  renderUrlaubList();
  alert('✅ Urlaubsantrag eingereicht! Der Schichtleiter prüft deinen Antrag.');
  // Zurück - falls eingeloggt zur Checkliste, sonst Home
  if(st.name) go('s-cl'); else go('s-home');
}

