// ═══════════════════════════════════════════════════════
// ADMIN.JS — Reparatur Aufgaben-Konsole
// Quelle der Mitarbeiteraufgaben ist ausschließlich rollenAufgaben.
// Keine alten Kategorien wie early_laden / mid_laden / late_laden.
// ═══════════════════════════════════════════════════════

var editingRoleTask = null;
var adminExpanded = lsLoad('adminExpanded', {});

var SHIFT_LABELS = { early:'🌅 Frühschicht', mid:'☀️ Mittelschicht', late:'🌙 Spätschicht' };
var ROLE_LABELS  = { bake:'🥐 Backhof / Bake-Off', kasse:'🛒 Kasse', regal:'📦 Regale', lager:'🏭 Lager', springer:'🔄 Springer' };
var SECTION_LABELS = { start:'Start / Öffnung', pause1:'Block 1 / Pause 1', pause2:'Block 2 / Pause 2', ende:'Ende / Übergabe' };

function escAdmin(v){
  return String(v == null ? '' : v).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
  });
}
function adminRoleLabel(key){
  var p = String(key || '').split('_');
  return (SHIFT_LABELS[p[0]] || p[0] || '') + ' – ' + (ROLE_LABELS[p[1]] || p[1] || '');
}
function adminRoleKeys(){
  var keys = Object.keys(rollenAufgaben || {});
  var order = ['early_bake','early_kasse','early_regal','early_lager','mid_kasse','mid_regal','mid_lager','mid_springer','late_kasse','late_regal','late_lager'];
  keys.sort(function(a,b){
    var ia = order.indexOf(a), ib = order.indexOf(b);
    if(ia === -1) ia = 999;
    if(ib === -1) ib = 999;
    return ia === ib ? a.localeCompare(b) : ia - ib;
  });
  return keys;
}
function adminSaveRoles(){
  lsSave('rollenAufgaben', rollenAufgaben);
  fbSave('rollenAufgaben', rollenAufgaben);
}
function adminFillRoleSelect(selectId, selectedKey){
  var sel = document.getElementById(selectId);
  if(!sel || typeof rollenAufgaben === 'undefined') return;
  sel.innerHTML = adminRoleKeys().map(function(k){
    return '<option value="'+escAdmin(k)+'" '+(k===selectedKey?'selected':'')+'>'+escAdmin(adminRoleLabel(k))+'</option>';
  }).join('');
}
function adminResetAddTask(key){
  adminFillRoleSelect('at-schicht', key || adminRoleKeys()[0]);
  ['at-time','at-section','at-text','at-warn'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
  var ub = document.getElementById('at-ub'); if(ub) ub.checked = false;
  var sp = document.getElementById('at-special'); if(sp) sp.value = '';
  var once = document.getElementById('at-once'); if(once) once.checked = false;
}
function openAddTask(key){
  adminResetAddTask(key);
  openOv('ov-add-task');
}
function saveTask(){
  var key = $val('at-schicht');
  if(!key){ alert('Bitte Bereich auswählen.'); return; }
  if(!rollenAufgaben[key]) rollenAufgaben[key] = [];
  var txt = $val('at-text').trim();
  if(!txt){ alert('Bitte Aufgabenbeschreibung eintragen.'); return; }
  var task = {
    id: 'ra' + Date.now(),
    section: $val('at-section').trim() || 'start',
    text: txt,
    warn: $val('at-warn').trim(),
    ub: !!(document.getElementById('at-ub') && document.getElementById('at-ub').checked)
  };
  var time = $val('at-time').trim(); if(time) task.time = time;
  var special = $val('at-special').trim(); if(special) task.special = special;
  if(document.getElementById('at-once') && document.getElementById('at-once').checked) task.oncePerDay = true;
  rollenAufgaben[key].push(task);
  adminExpanded[key] = true;
  lsSave('adminExpanded', adminExpanded);
  adminSaveRoles();
  closeOv('ov-add-task');
  renderAdmin();
}
function editTask(key, id){
  var arr = rollenAufgaben[key] || [];
  var idx = arr.findIndex(function(t){ return String(t.id) === String(id); });
  if(idx < 0) return;
  var t = arr[idx];
  editingRoleTask = { key:key, id:id };
  adminFillRoleSelect('et-schicht', key);
  $set('et-time','value', t.time || '');
  $set('et-section','value', t.section || '');
  $set('et-text','value', t.text || '');
  $set('et-warn','value', t.warn || '');
  $set('et-special','value', t.special || '');
  var ub = document.getElementById('et-ub'); if(ub) ub.checked = !!t.ub;
  var once = document.getElementById('et-once'); if(once) once.checked = !!t.oncePerDay;
  openOv('ov-edit-task');
}
function updateTask(){
  if(!editingRoleTask) return;
  var oldKey = editingRoleTask.key;
  var id = editingRoleTask.id;
  var newKey = $val('et-schicht') || oldKey;
  var arr = rollenAufgaben[oldKey] || [];
  var idx = arr.findIndex(function(t){ return String(t.id) === String(id); });
  if(idx < 0) return;
  var txt = $val('et-text').trim();
  if(!txt){ alert('Bitte Aufgabenbeschreibung eintragen.'); return; }
  var old = arr[idx];
  var updated = Object.assign({}, old, {
    section: $val('et-section').trim() || old.section || 'start',
    text: txt,
    warn: $val('et-warn').trim(),
    ub: !!(document.getElementById('et-ub') && document.getElementById('et-ub').checked)
  });
  var time = $val('et-time').trim(); if(time) updated.time = time; else delete updated.time;
  var special = $val('et-special').trim(); if(special) updated.special = special; else delete updated.special;
  if(document.getElementById('et-once') && document.getElementById('et-once').checked) updated.oncePerDay = true; else delete updated.oncePerDay;
  if(!rollenAufgaben[newKey]) rollenAufgaben[newKey] = [];
  if(newKey === oldKey) rollenAufgaben[oldKey][idx] = updated;
  else { rollenAufgaben[oldKey].splice(idx,1); rollenAufgaben[newKey].push(updated); }
  adminExpanded[newKey] = true;
  lsSave('adminExpanded', adminExpanded);
  adminSaveRoles();
  closeOv('ov-edit-task');
  renderAdmin();
}
function deleteTask(key, id){
  if(!confirm('Diese Aufgabe wirklich löschen?')) return;
  rollenAufgaben[key] = (rollenAufgaben[key] || []).filter(function(t){ return String(t.id) !== String(id); });
  adminSaveRoles();
  renderAdmin();
}
function toggleAdminGroup(key){
  adminExpanded[key] = !adminExpanded[key];
  lsSave('adminExpanded', adminExpanded);
  renderAdmin();
}

function renderAdmin(){
  var body = document.getElementById('admin-body');
  if(!body) return;
  var html = '';
  html += '<div style="padding:12px 14px 90px;">';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">';
  html += '<button onclick="openAddTask()" style="background:#111827;color:#fff;border:none;border-radius:12px;padding:13px;font-weight:800;font-family:inherit;cursor:pointer;">➕ Mitarbeiteraufgabe</button>';
  html += '<button onclick="openOv(\'ov-add-weekly\')" style="background:#1e3a5f;color:#fff;border:none;border-radius:12px;padding:13px;font-weight:800;font-family:inherit;cursor:pointer;">➕ Wochenaufgabe</button>';
  html += '<button onclick="openOv(\'ov-add-sl-task\')" style="background:#0f766e;color:#fff;border:none;border-radius:12px;padding:13px;font-weight:800;font-family:inherit;cursor:pointer;">➕ SL-Aufgabe</button>';
  html += '<button onclick="go(\'s-hist\');try{renderHistory&&renderHistory();}catch(e){}" style="background:#f3f4f6;color:#111827;border:none;border-radius:12px;padding:13px;font-weight:800;font-family:inherit;cursor:pointer;">📊 Historie</button>';
  html += '</div>';

  html += '<div style="font-size:12px;font-weight:900;color:#777;text-transform:uppercase;letter-spacing:.8px;margin:12px 0 8px;">👥 Mitarbeiteraufgaben</div>';
  adminRoleKeys().forEach(function(key){
    var arr = rollenAufgaben[key] || [];
    var open = adminExpanded[key] !== false;
    html += '<div style="background:#fff;border-radius:14px;box-shadow:0 1px 7px rgba(0,0,0,.07);margin-bottom:10px;overflow:hidden;">';
    html += '<div onclick="toggleAdminGroup(\''+escAdmin(key)+'\')" style="padding:13px 13px;display:flex;align-items:center;gap:8px;cursor:pointer;background:#f9fafb;">';
    html += '<div style="font-size:16px;width:20px;">'+(open?'▾':'▸')+'</div><div style="flex:1;font-weight:900;font-size:14px;">'+escAdmin(adminRoleLabel(key))+'</div><div style="font-size:11px;color:#777;font-weight:800;">'+arr.length+' Aufgaben</div>';
    html += '<button onclick="event.stopPropagation();openAddTask(\''+escAdmin(key)+'\')" style="background:#111827;color:#fff;border:none;border-radius:9px;padding:7px 10px;font-weight:900;cursor:pointer;">＋</button>';
    html += '</div>';
    if(open){
      if(!arr.length) html += '<div style="padding:14px;color:#aaa;font-size:13px;">Keine Aufgaben in diesem Bereich.</div>';
      arr.forEach(function(t){
        html += '<div style="padding:11px 13px;border-top:1px solid #eee;display:flex;gap:10px;align-items:flex-start;">';
        html += '<div style="flex:1;min-width:0;">';
        html += '<div style="font-size:13px;font-weight:800;color:#111827;">'+escAdmin(t.text)+'</div>';
        html += '<div style="font-size:10px;color:#777;margin-top:3px;">'+escAdmin(t.time || '')+(t.time?' · ':'')+escAdmin(SECTION_LABELS[t.section] || t.section || 'Ohne Abschnitt')+(t.ub?' · 🔄 Übergabe':'')+(t.special?' · ⚙️ '+escAdmin(t.special):'')+(t.oncePerDay?' · 1×/Tag':'')+'</div>';
        if(t.warn) html += '<div style="font-size:10px;color:#b45309;margin-top:3px;">⚠️ '+escAdmin(t.warn)+'</div>';
        html += '</div>';
        html += '<button onclick="editTask(\''+escAdmin(key)+'\',\''+escAdmin(t.id)+'\')" title="Bearbeiten" style="background:#e0f2fe;border:none;border-radius:8px;padding:8px 9px;cursor:pointer;font-size:14px;">✏️</button>';
        html += '<button onclick="deleteTask(\''+escAdmin(key)+'\',\''+escAdmin(t.id)+'\')" title="Löschen" style="background:#fee2e2;border:none;border-radius:8px;padding:8px 9px;cursor:pointer;font-size:14px;">🗑️</button>';
        html += '</div>';
      });
    }
    html += '</div>';
  });

  html += '<div style="font-size:12px;font-weight:900;color:#777;text-transform:uppercase;letter-spacing:.8px;margin:16px 0 8px;">📅 Wochenaufgaben</div>';
  html += '<div style="background:#fff;border-radius:14px;box-shadow:0 1px 7px rgba(0,0,0,.07);overflow:hidden;margin-bottom:12px;">';
  (weeklyTasks || []).forEach(function(w){
    html += '<div style="padding:11px 13px;border-bottom:1px solid #eee;display:flex;gap:10px;align-items:flex-start;">';
    html += '<div style="flex:1;"><div style="font-size:13px;font-weight:800;">'+escAdmin(w.text)+'</div><div style="font-size:10px;color:#777;margin-top:3px;">'+escAdmin(w.time||'')+' · '+escAdmin(w.section||'Wochenaufgabe')+' · Tage: '+escAdmin((w.days||[]).join(','))+'</div></div>';
    html += '<button onclick="editWeeklyTask(\''+escAdmin(w.id)+'\')" style="background:#e0f2fe;border:none;border-radius:8px;padding:8px 9px;cursor:pointer;">✏️</button>';
    html += '<button onclick="deleteWeeklyTask(\''+escAdmin(w.id)+'\')" style="background:#fee2e2;border:none;border-radius:8px;padding:8px 9px;cursor:pointer;">🗑️</button>';
    html += '</div>';
  });
  if(!(weeklyTasks||[]).length) html += '<div style="padding:14px;color:#aaa;font-size:13px;">Keine Wochenaufgaben.</div>';
  html += '</div>';

  html += '<div style="font-size:12px;font-weight:900;color:#777;text-transform:uppercase;letter-spacing:.8px;margin:16px 0 8px;">👔 Schichtleiter-Aufgaben</div>';
  html += '<div style="background:#fff;border-radius:14px;box-shadow:0 1px 7px rgba(0,0,0,.07);overflow:hidden;">';
  (slTasks || []).forEach(function(s){
    html += '<div style="padding:11px 13px;border-bottom:1px solid #eee;display:flex;gap:10px;align-items:flex-start;">';
    html += '<div style="flex:1;"><div style="font-size:13px;font-weight:800;">'+escAdmin(s.text)+'</div><div style="font-size:10px;color:#777;margin-top:3px;">'+escAdmin(s.time||'')+' · '+escAdmin(s.section||'Allgemein')+'</div></div>';
    html += '<button onclick="editSLTask(\''+escAdmin(s.id)+'\')" style="background:#e0f2fe;border:none;border-radius:8px;padding:8px 9px;cursor:pointer;">✏️</button>';
    html += '<button onclick="deleteSLTask(\''+escAdmin(s.id)+'\')" style="background:#fee2e2;border:none;border-radius:8px;padding:8px 9px;cursor:pointer;">🗑️</button>';
    html += '</div>';
  });
  if(!(slTasks||[]).length) html += '<div style="padding:14px;color:#aaa;font-size:13px;">Keine SL-Aufgaben.</div>';
  html += '</div>';
  html += '</div>';
  body.innerHTML = html;
}

function deleteWeeklyTask(id){
  if(!confirm('Wochenaufgabe wirklich löschen?')) return;
  weeklyTasks = (weeklyTasks || []).filter(function(t){ return String(t.id) !== String(id); });
  lsSave('weeklyTasks', weeklyTasks); fbSave('weeklyTasks', weeklyTasks); renderAdmin();
}
function deleteSLTask(id){
  if(!confirm('Schichtleiter-Aufgabe wirklich löschen?')) return;
  slTasks = (slTasks || []).filter(function(t){ return String(t.id) !== String(id); });
  lsSave('slTasks', slTasks); fbSave('slTasks', slTasks); renderAdmin();
}

function askAdmin(){ pwTarget='admin'; openOv('ov-pw'); }
function askSL(){ pwTarget='sl'; openOv('ov-pw'); }
function pwPinReset(){
  var d=document.getElementById('pw-pin-display'); if(d){ d.setAttribute('data-pin',''); d.textContent=''; }
  var e=document.getElementById('pw-err'); if(e) e.style.display='none';
}
function normalizePinForDoubleHandler(pin){
  pin = String(pin || '');
  if(pin.length > 0 && pin.length % 2 === 0){
    var compressed = '';
    var doubled = true;
    for(var i=0; i<pin.length; i+=2){
      if(pin[i] !== pin[i+1]) doubled = false;
      compressed += pin[i];
    }
    if(doubled) return compressed;
  }
  return pin;
}
function checkPw(){
  var d=document.getElementById('pw-pin-display');
  var pin = d ? (d.getAttribute('data-pin') || '') : '';
  pin = normalizePinForDoubleHandler(pin);

  var ok = (pwTarget === 'sl') ? (pin === SL_PW) : (pin === ADMIN_PW);
  if(!ok){
    var e=document.getElementById('pw-err');
    if(e) e.style.display='block';
    return;
  }
  closeOv('ov-pw');
  pwPinReset();
  if(pwTarget === 'sl'){
    go('s-sl');
    try{ if(typeof renderSL === 'function') renderSL(); }catch(e){}
  } else {
    go('s-admin');
    try{ if(typeof renderAdmin === 'function') renderAdmin(); }catch(e){}
  }
}

// PIN-Listener nur EINMAL registrieren. Verhindert doppelte Punkte bei Admin/SL-Passwort.
if(!window.__primaPwPinListenerBound){
  window.__primaPwPinListenerBound = true;
  document.addEventListener('click', function(e){
    var b = e.target.closest('.pw-pin-btn');
    if(!b) return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    var d=document.getElementById('pw-pin-display');
    if(!d) return;
    var k=b.getAttribute('data-k');
    var cur=d.getAttribute('data-pin')||'';
    if(k==='⌫') cur=cur.slice(0,-1);
    else if(cur.length<8) cur+=k;
    d.setAttribute('data-pin', cur);
    d.textContent = cur ? '●'.repeat(cur.length) : '';
  }, true);
}

function saveName(){ var v=$val('an-inp').trim(); if(!v) return; if(names.indexOf(v)<0) names.push(v); lsSave('names',names); fbSave('names',names); closeOv('ov-add-name'); renderAdmin(); }
function saveReason(){ var v=$val('ar-inp').trim(); if(!v) return; if(reasons.indexOf(v)<0) reasons.push(v); lsSave('reasons',reasons); fbSave('reasons',reasons); closeOv('ov-add-reason'); renderAdmin(); }
function updateSubSelect(){ var s=document.getElementById('ai-sub'); if(s) s.innerHTML='<option value="Allgemein">Allgemein</option>'; }
function saveInfo(){
  var title=$val('ai-title').trim(), url=$val('ai-url').trim(); if(!title||!url){alert('Bitte Titel und Link eintragen.');return;}
  infoLinks.push({id:'info'+Date.now(), bereich:$val('ai-bereich'), sub:$val('ai-sub')||'Allgemein', title:title, url:url});
  lsSave('infoLinks',infoLinks); fbSave('infoLinks',infoLinks); closeOv('ov-add-info'); renderAdmin();
}

setTimeout(function(){ try{ adminFillRoleSelect('at-schicht'); adminFillRoleSelect('et-schicht'); }catch(e){} }, 100);
