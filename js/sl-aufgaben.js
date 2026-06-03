// ═══════════════════════════════════════════════════════
// SL-AUFGABEN.JS
// Schichtleiter: Wochenaufgaben und SL-Tasks verwalten
// ═══════════════════════════════════════════════════════

// ── HILFSFUNKTION: Checkboxen auslesen ──────────────────
function getCheckedDays() {
  return Object.entries(DOW_MAP)
    .filter(function(entry) {
      const el = document.getElementById('wt-' + entry[0]);
      return el && el.checked;
    })
    .map(function(entry) { return entry[1]; });
}

// ── WOCHENAUFGABE HINZUFÜGEN ─────────────────────────────
function saveWeeklyTask() {
  const txt = document.getElementById('wt-text').value.trim();
  if(!txt) return;
  const days = getCheckedDays();
  if(!days.length) { alert('Bitte mindestens einen Wochentag auswählen.'); return; }
  weeklyTasks.push({
    id: 'wt'+Date.now(),
    text: txt,
    days: days,
    schicht: document.getElementById('wt-schicht').value,
    bereich: document.getElementById('wt-bereich').value,
    time: document.getElementById('wt-time').value || '08:00',
    section: document.getElementById('wt-section').value || 'Wochenaufgabe',
    warn: document.getElementById('wt-warn').value,
  });
  lsSave('weeklyTasks', weeklyTasks);
  fbSave('weeklyTasks', weeklyTasks);
  closeOv('ov-add-weekly');
  renderAdmin();
}

// ── WOCHENAUFGABE BEARBEITEN ─────────────────────────────
function editWeeklyTask(id) {
  const wt = weeklyTasks.find(function(t){ return t.id===id; });
  if(!wt) return;
  editingWeeklyId = id;
  $set('wt-edit-text',    'value', wt.text);
  $set('wt-edit-section', 'value', wt.section || 'Wochenaufgabe');
  $set('wt-edit-time',    'value', wt.time || '');
  $set('wt-edit-warn',    'value', wt.warn || '');
  $set('wt-edit-schicht', 'value', wt.schicht || 'early');
  $set('wt-edit-bereich', 'value', wt.bereich || 'laden');
  Object.entries(DOW_MAP).forEach(function(entry) {
    const el = document.getElementById('wt-edit-' + entry[0]);
    if(el) el.checked = wt.days.includes(entry[1]);
  });
  openOv('ov-edit-weekly');
}

function updateWeeklyTask() {
  const wt = weeklyTasks.find(function(t){ return t.id===editingWeeklyId; });
  if(!wt) return;
  const txt = document.getElementById('wt-edit-text').value.trim();
  if(!txt) return;
  const days = Object.entries(DOW_MAP)
    .filter(function(entry) {
      const el = document.getElementById('wt-edit-' + entry[0]);
      return el && el.checked;
    })
    .map(function(entry) { return entry[1]; });
  if(!days.length) { alert('Bitte mindestens einen Wochentag wählen.'); return; }
  wt.text    = txt;
  wt.days    = days;
  wt.schicht = document.getElementById('wt-edit-schicht').value;
  wt.bereich = document.getElementById('wt-edit-bereich').value;
  wt.time    = document.getElementById('wt-edit-time').value || '08:00';
  wt.section = document.getElementById('wt-edit-section').value || 'Wochenaufgabe';
  wt.warn    = document.getElementById('wt-edit-warn').value;
  lsSave('weeklyTasks', weeklyTasks);
  fbSave('weeklyTasks', weeklyTasks);
  closeOv('ov-edit-weekly');
  renderAdmin();
}

// ── SL-TASK HINZUFÜGEN ───────────────────────────────────
function saveSLTask() {
  const txt = document.getElementById('sl-at-text').value.trim();
  if(!txt) return;
  slTasks.push({
    id:      'sl'+Date.now(),
    time:    document.getElementById('sl-at-time').value    || '00:00',
    section: document.getElementById('sl-at-section').value || 'Allgemein',
    text:    txt,
    warn:    document.getElementById('sl-at-warn').value,
  });
  lsSave('slTasks', slTasks);
  fbSave('slTasks', slTasks);
  closeOv('ov-add-sl-task');
  renderAdmin();
}

// ── SL-TASK BEARBEITEN ───────────────────────────────────
function editSLTask(id) {
  const t = slTasks.find(function(t){ return t.id===id; });
  if(!t) return;
  editingSLTaskId = id;
  $set('sl-et-time',    'value', t.time    || '');
  $set('sl-et-section', 'value', t.section || '');
  $set('sl-et-text',    'value', t.text    || '');
  $set('sl-et-warn',    'value', t.warn    || '');
  openOv('ov-edit-sl-task');
}

function updateSLTask() {
  const t = slTasks.find(function(t){ return t.id===editingSLTaskId; });
  if(!t) return;
  const txt = document.getElementById('sl-et-text').value.trim();
  if(!txt) return;
  t.time    = document.getElementById('sl-et-time').value    || '00:00';
  t.section = document.getElementById('sl-et-section').value || 'Allgemein';
  t.text    = txt;
  t.warn    = document.getElementById('sl-et-warn').value;
  lsSave('slTasks', slTasks);
  fbSave('slTasks', slTasks);
  closeOv('ov-edit-sl-task');
  renderAdmin();
}
