// ═══════════════════════════════════════════════════════
// SL-AUFGABEN.JS
// Schichtleiter: Wochenaufgaben und SL-Tasks verwalten
// Abhängigkeiten: firebase.js (lsSave/fbSave), sl-report.js (getCheckedDays)
// ═══════════════════════════════════════════════════════

function saveWeeklyTask() {
  const txt = document.getElementById('wt-text').value.trim();
  if(!txt) return;
  const days = getCheckedDays();
  if(!days.length) { alert('Bitte mindestens einen Wochentag auswählen.'); return; }
  weeklyTasks.push({
    id: 'wt'+Date.now(),
    text: txt,
    days,
    schicht: document.getElementById('wt-schicht').value,
    bereich: document.getElementById('wt-bereich').value,
    time: document.getElementById('wt-time').value || '08:00',
    section: document.getElementById('wt-section').value || 'Wochenaufgabe',
    warn: document.getElementById('wt-warn').value,
  });
  lsSave('weeklyTasks', weeklyTasks);
  closeOv('ov-add-weekly');
  renderAdmin();
}

function editWeeklyTask(id) {
  const wt = weeklyTasks.find(t=>t.id===id);
  if(!wt) return;
  editingWeeklyId = id;
  $set('wt-edit-text', 'value', wt.text);
  $set('wt-edit-section', 'value', wt.section || 'Wochenaufgabe');
  $set('wt-edit-time', 'value', wt.time || '');
  $set('wt-edit-warn', 'value', wt.warn || '');
  $set('wt-edit-schicht', 'value', wt.schicht || 'early');
  $set('wt-edit-bereich', 'value', wt.bereich || 'laden');
  Object.entries(DOW_MAP).forEach(([key,val])=>{
    const el=document.getElementById('wt-edit-'+key);
    if(el) el.checked = wt.days.includes(val);
  });
  openOv('ov-edit-weekly');
}

function updateWeeklyTask() {
  const wt = weeklyTasks.find(t=>t.id===editingWeeklyId);
  if(!wt) return;
  const txt = document.getElementById('wt-edit-text').value.trim();
  if(!txt) return;
  const days = Object.entries(DOW_MAP)
    .filter(([key]) => document.getElementById('wt-edit-'+key) && document.getElementById('wt-edit-'+key).checked)
    .map(([,val]) => val);
  if(!days.length) { alert('Bitte mindestens einen Wochentag wählen.'); return; }
  wt.text = txt;
  wt.days = days;
  wt.schicht = document.getElementById('wt-edit-schicht').value;
  wt.bereich = document.getElementById('wt-edit-bereich').value;
  wt.time = document.getElementById('wt-edit-time').value || '08:00';
  wt.section = document.getElementById('wt-edit-section').value || 'Wochenaufgabe';
  wt.warn = document.getElementById('wt-edit-warn').value;
  lsSave('weeklyTasks', weeklyTasks);
  closeOv('ov-edit-weekly');
  renderAdmin();
}

function saveSLTask(){
  const txt=document.getElementById('sl-at-text').value.trim();
  if(!txt)return;
  slTasks.push({
    id:'sl'+Date.now(),
    time:document.getElementById('sl-at-time').value||'00:00',
    section:document.getElementById('sl-at-section').value||'Allgemein',
    text:txt,
    warn:document.getElementById('sl-at-warn').value,
  });
  closeOv('ov-add-sl-task');
  renderAdmin();
}

function editSLTask(id){
  const t=slTasks.find(t=>t.id===id);if(!t)return;
  editingSLTaskId=id;
  $set('sl-et-time', 'value', t.time||'');
  $set('sl-et-section', 'value', t.section||'');
  $set('sl-et-text', 'value', t.text||'');
  $set('sl-et-warn', 'value', t.warn||'');
  openOv('ov-edit-sl-task');
}

function updateSLTask(){
  const t=slTasks.find(t=>t.id===editingSLTaskId);if(!t)return;
  const txt=document.getElementById('sl-et-text').value.trim();if(!txt)return;
  t.time=document.getElementById('sl-et-time').value||'00:00';
  t.section=document.getElementById('sl-et-section').value||'Allgemein';
  t.text=txt;
  t.warn=document.getElementById('sl-et-warn').value;
  closeOv('ov-edit-sl-task');
  renderAdmin();
}

