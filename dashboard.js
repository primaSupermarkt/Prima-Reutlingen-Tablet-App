// ═══════════════════════════════════════════════════════════════
// DASHBOARD.JS
// Übergabe-Logik und SL-Report-Aufbau
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════
// SCHICHTÜBERGABE
// ═══════════════════════════════════════════
function getUBItems(){
  return getMyTasks().filter(function(t){
    if(!t.ub) return false;
    // Meta-Task "Schichtübergabe vorbereiten" nicht in der Übergabeliste
    if(t.text === 'Schichtübergabe vorbereiten') return false;
    // oncePerDay-Tasks (z.B. Temperaturkontrolle) die erledigt sind, NICHT in Übergabe
    if(t.oncePerDay) {
      const state = clState[t.id];
      if(state && state.status === 'done') return false;
    }
    return true;
  });
}

function startUbergabe(){
  // Direkt zur Übergabe (Zeiterfassung läuft über Stempeluhr)
  doUbergabePrep();
}

function showEndTimeDialog() {
  const now = new Date().toTimeString().slice(0,5);
  const prof = maProfiles[st.name]||{};
  // Calculate suggested end time based on daily target hours
  let suggestedEnd = now;
  if(prof.sollTagMin) {
    const startMin = timeToMin(st.zeStart);
    const endMin = startMin + prof.sollTagMin + (prof.sollTagMin>=360?30:0); // add break
    suggestedEnd = minToTime(endMin % (24*60));
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;';
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border-radius:18px;padding:22px;width:100%;max-width:360px;';
  card.innerHTML =
    '<div style="font-size:20px;font-weight:900;margin-bottom:6px;">⏱️ Schichtende</div>'+
    '<div style="font-size:13px;color:#555;margin-bottom:16px;"><strong>'+st.name+'</strong> · Arbeitsbeginn war: '+st.zeStart+'</div>'+
    '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:4px;">Arbeitsende</label>'+
    '<input type="time" id="ze-end-dialog" value="'+suggestedEnd+'" style="width:100%;border:2px solid #16a34a;border-radius:10px;padding:12px;font-size:22px;font-family:inherit;outline:none;text-align:center;margin-bottom:10px;">'+
    '<div id="ze-ueber-warn" style="display:none;background:#fef3c7;border-radius:8px;padding:10px;margin-bottom:10px;font-size:12px;color:#92400e;">⚠️ Du arbeitest länger als geplant. Bitte Begründung eingeben.</div>'+
    '<input type="text" id="ze-end-grund" placeholder="Begründung (bei Überschreitung Pflicht)" style="width:100%;border:1.5px solid #e0e0e0;border-radius:10px;padding:10px;font-size:13px;font-family:inherit;outline:none;margin-bottom:14px;">';

  // Check overtime when time changes
  const timeInp = card.querySelector('#ze-end-dialog');

  const btn = document.createElement('button');
  btn.style.cssText = 'width:100%;background:#16a34a;color:#fff;border:none;border-radius:12px;padding:15px;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit;';
  btn.textContent = '✅ Bestätigen & Übergabe starten';
  btn.addEventListener('click', function() {
    const endVal = card.querySelector('#ze-end-dialog').value;
    const grund = card.querySelector('#ze-end-grund').value.trim();
    const prof2 = maProfiles[st.name]||{};

    // Check if overtime requires comment
    if(prof2.sollTagMin) {
      const startMin2 = timeToMin(st.zeStart);
      let endMin2 = timeToMin(endVal);
      if(endMin2 <= startMin2) endMin2 += 24*60;
      const workedMin = endMin2 - startMin2;
      const sollMitPause = prof2.sollTagMin + (prof2.sollTagMin>=360?30:0);
      if(workedMin > sollMitPause + 15 && !grund) {
        card.querySelector('#ze-ueber-warn').style.display='block';
        card.querySelector('#ze-end-grund').style.borderColor='#ef4444';
        card.querySelector('#ze-end-grund').focus();
        return;
      }
    }

    document.body.removeChild(overlay);
    // Save time entry
    saveAutoZeiterfassung(st.zeStart, endVal, grund);
    doUbergabePrep();
  });
  card.appendChild(btn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function saveAutoZeiterfassung(startVal, endVal, grund) {
  const startMin = timeToMin(startVal);
  let endMin = timeToMin(endVal);
  if(endMin <= startMin) endMin += 24*60;
  const grossMin = endMin - startMin;
  let pauseMin = 0;
  if(grossMin >= 9*60) pauseMin = 45;
  else if(grossMin >= 6*60) pauseMin = 30;
  else if(grossMin >= 4.5*60) pauseMin = 15;
  const nettoMin = grossMin - pauseMin;
  const datum = st.zeDate || new Date().toISOString().slice(0,10);
  const d = new Date(datum);
  const tagTyp = st.day==='so'?'so':st.day==='ft'?'ft':'wt';
  const zuschlaege = calcZuschlaege(datum, startMin, endMin, tagTyp);
  zeiterfassung.push({
    id:'ze'+Date.now(), ma:st.name, datum, schicht:st.schicht, tagTyp,
    istStart:startVal, istEnd:endVal, grossMin, pauseMin, nettoMin,
    zuschlaege, grund:grund||'', ts:new Date().toLocaleString('de-DE')
  });
  lsSave('zeiterfassung', zeiterfassung);
  st.zeStart = null;
}

function doUbergabePrep(isRefresh){
  // Nur beim ersten Aufruf zurücksetzen und Nachricht fragen
  if(!isRefresh) {
    ubPrepState={};
    // Vorausfüllen aus Checklisten-State
    getUBItems().forEach(function(t){
      const cs=clState[t.id]||{};
      if(cs.status==='done') ubPrepState[t.text]='ok';
      if(cs.status==='nd')   ubPrepState[t.text]='nok';
    });
  }
  const items=getUBItems();
  const body=document.getElementById('ub-prep-body');if(!body)return;body.innerHTML='';
  items.forEach(t=>{
    const cs=clState[t.id]||{};

    const row=document.createElement('div');
    const st2=ubPrepState[t.text];
    row.className='ub-row'+(st2==='ok'?' ok':st2==='nok'?' nok':'');
    row.id='ubp-'+t.id;
    const cb=document.createElement('div');cb.className='ub-cb';cb.innerHTML=st2==='ok'?'✓':st2==='nok'?'✗':'';
    const txt=document.createElement('div');txt.className='ub-txt';txt.textContent=t.text;
    if(cs.status==='nd'&&cs.reason){const r=document.createElement('div');r.style.cssText='font-size:10px;color:#ef4444;font-weight:600;margin-top:2px;';r.textContent='Grund: '+cs.reason;txt.appendChild(r);}
    row.appendChild(cb);row.appendChild(txt);

    if(!st2){
      const acts=document.createElement('div');acts.className='ub-actions';
      const ok=document.createElement('button');ok.className='ub-btn btn-done';ok.textContent='✅ OK';
      ok.onclick=(e)=>{e.stopPropagation();ubPrepState[t.text]='ok';doUbergabePrep(true);};
      const nok=document.createElement('button');nok.className='ub-btn btn-nd';nok.textContent='❌ Nicht OK';
      nok.onclick=(e)=>{e.stopPropagation();ubPrepState[t.text]='nok';doUbergabePrep(true);};
      acts.appendChild(ok);acts.appendChild(nok);row.appendChild(acts);
    }
    body.appendChild(row);
  });
  go('s-ub-prep');
}

function submitUbergabe(){
  // Overlay mit Notiz-Feld
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:600;display:flex;align-items:center;justify-content:center;padding:20px;';
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border-radius:18px;padding:22px;width:100%;max-width:400px;';
  card.innerHTML =
    '<div style="font-size:20px;font-weight:900;margin-bottom:6px;">📝 Notiz an übernehmende Schicht</div>'+
    '<div style="font-size:13px;color:#888;margin-bottom:14px;">Optional – was soll die nächste Schicht wissen?</div>'+
    '<textarea id="ub-notiz-text" placeholder="z.B. Kühlschrank läuft warm, Techniker bescheid geben…" rows="4" style="width:100%;border:2px solid #0f3460;border-radius:10px;padding:12px;font-size:15px;font-family:inherit;outline:none;resize:none;line-height:1.5;margin-bottom:14px;box-sizing:border-box;"></textarea>';
  const sendBtn = document.createElement('button');
  sendBtn.style.cssText = 'width:100%;background:#0f3460;color:#fff;border:none;border-radius:12px;padding:15px;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:8px;';
  sendBtn.textContent = '✅ Übergabe abschicken';
  sendBtn.addEventListener('click', function(){
    const notiz = document.getElementById('ub-notiz-text').value.trim();
    document.body.removeChild(overlay);
    finishSubmitUbergabe(notiz);
  });
  const skipBtn = document.createElement('button');
  skipBtn.style.cssText = 'width:100%;background:none;border:none;color:#aaa;font-size:13px;cursor:pointer;font-family:inherit;padding:6px;';
  skipBtn.textContent = 'Ohne Notiz abschicken';
  skipBtn.addEventListener('click', function(){
    document.body.removeChild(overlay);
    finishSubmitUbergabe('');
  });
  card.appendChild(sendBtn);
  card.appendChild(skipBtn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  setTimeout(function(){ try{ document.getElementById('ub-notiz-text').focus(); }catch(e){} }, 100);
}

function finishSubmitUbergabe(notiz){
  const items = getUBItems().map(function(t){ return {text:t.text, status:ubPrepState[t.text]||'nok'}; });
  const ub = {
    id: 'ub'+Date.now(),
    ts: new Date().toLocaleString('de-DE'),
    von: st.name,
    schicht: slbls[st.schicht],
    bereich: st.bereich,
    startTime: st.startTime,
    items: items,
    infoText: notiz,
    status: 'open',
    rejectedItems: []
  };
  ubergaben.push(ub);
  lsSave('ubergaben', ubergaben);
  fbSave('ubergaben', ubergaben);
  // clState nach Schichtübergabe zurücksetzen
  clState = {};
  lsSave('clState', clState);
  fbSave('clState', clState);
  ubPrepState = {};
  updateSLBadge();
  go('s-home');
}

function goUbergabeAnnehmen(){
  const ub=ubergaben.find(u=>u.status==='open');
  if(!ub)return;
  const ubInfo = $id('ub-take-info');
  // Accept-Button initial sperren wenn Notiz vorhanden
  const acceptBtn = document.getElementById('ub-accept-btn');
  if(acceptBtn) {
    if(ub.infoText && !ub.infoConfirmedBy) {
      acceptBtn.disabled = true;
      acceptBtn.style.opacity = '0.4';
      acceptBtn.style.cursor = 'not-allowed';
      acceptBtn.title = 'Bitte zuerst die Notiz bestätigen';
    } else {
      acceptBtn.disabled = false;
      acceptBtn.style.opacity = '1';
      acceptBtn.style.cursor = 'pointer';
    }
  }
  if(ubInfo) {
    let infoHtml = '<div style="font-size:18px;font-weight:900;color:var(--black);">Offene Übergabe</div>'+
      '<div style="font-size:12px;color:var(--gt);margin-top:3px;">Von: '+ub.von+' · '+ub.schicht+' · '+ub.ts+'</div>';
    if(ub.infoText) {
      infoHtml += '<div style="margin-top:12px;background:#fff3cd;border:2px solid #f59e0b;border-radius:12px;padding:14px 16px;">'+
        '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#92400e;margin-bottom:6px;">📝 Notiz von der abgebenden Schicht</div>'+
        '<div style="font-size:17px;font-weight:800;color:#1a1a1a;line-height:1.4;">'+ub.infoText.split('\n').join('<br>')+'</div>'+
        '<div id="ub-info-confirm-wrap" style="margin-top:10px;">'+
          '<button onclick="confirmUbergabeInfo()" style="width:100%;background:#f59e0b;color:#fff;border:none;border-radius:9px;padding:11px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;">✅ Notiz gelesen & bestätigt</button>'+
        '</div>'+
        '</div>';
    }
    ubInfo.innerHTML = infoHtml;
  }
  const body = $id('ub-take-body');
  if(body) body.innerHTML = '';
  if(body) {
    ub.items.forEach(function(item){
      const row=document.createElement('div');
      row.className='ub-row'+(item.status==='ok'?' ok':' nok');
      row.innerHTML='<div class="ub-cb">'+(item.status==='ok'?'✓':'✗')+'</div><div class="ub-txt">'+item.text+'</div>';
      body.appendChild(row);
    });
  }
  go('s-ub-take');
}

function confirmUbergabeInfo() {
  const wrap = document.getElementById('ub-info-confirm-wrap');
  if(wrap) {
    wrap.innerHTML = '<div style="text-align:center;font-size:13px;font-weight:700;color:#16a34a;padding:6px;">✅ Notiz bestätigt</div>';
  }
  // Bestätigung in der Übergabe speichern
  const ub = ubergaben.find(function(u){return u.status==='open';});
  if(ub) {
    ub.infoConfirmedBy = st.name;
    ub.infoConfirmedTs = new Date().toLocaleString('de-DE');
    lsSave('ubergaben', ubergaben);
    fbSave('ubergaben', ubergaben);
  }
  // Accept-Button freischalten
  const acceptBtn = document.getElementById('ub-accept-btn');
  if(acceptBtn) {
    acceptBtn.disabled = false;
    acceptBtn.style.opacity = '1';
    acceptBtn.style.cursor = 'pointer';
    acceptBtn.title = '';
    // Kurz aufleuchten lassen
    acceptBtn.style.background = '#16a34a';
  }
}

function acceptUbergabe(){
  const ub=ubergaben.find(u=>u.status==='open');
  if(ub){
    ub.status='accepted';ub.acceptedBy=st.name;ub.acceptedTs=new Date().toLocaleString('de-DE');
    history.push({ts:new Date().toLocaleString('de-DE'),name:st.name,taskText:'Schichtübergabe angenommen von '+ub.von,done:true,schicht:slbls[st.schicht],bereich:st.bereich,startTime:st.startTime});
    clState['ub_accept']={status:'done',who:st.name,ts:nowStr(),ubVon:ub.von};
    lsSave('ubergaben',ubergaben);lsSave('history',history);
  }
  updateSLBadge();
  $style('ub-open-banner', 'display', 'none');
  go('s-cl');
  renderCL();
}

function rejectUbergabe(){
  // Kommentarfeld als Overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:600;display:flex;align-items:center;justify-content:center;padding:20px;';
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border-radius:18px;padding:22px;width:100%;max-width:400px;';
  // Titel
  const tit = document.createElement('div');
  tit.style.cssText = 'font-size:20px;font-weight:900;margin-bottom:6px;color:#dc2626;';
  tit.textContent = '❌ Übergabe ablehnen';
  card.appendChild(tit);
  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:13px;color:#888;margin-bottom:14px;';
  sub.textContent = 'Bitte Grund wählen – geht direkt an den Schichtleiter.';
  card.appendChild(sub);

  // Dropdown Gründe
  const gruendeSel = document.createElement('select');
  gruendeSel.id = 'ub-reject-sel';
  gruendeSel.style.cssText = 'width:100%;border:2px solid #dc2626;border-radius:10px;padding:12px;font-size:14px;font-family:inherit;outline:none;margin-bottom:10px;background:#fff;';
  const defaultOpt = document.createElement('option');
  defaultOpt.value=''; defaultOpt.textContent='– Grund auswählen –';
  gruendeSel.appendChild(defaultOpt);
  ubAblehnungsGruende.forEach(function(g){
    const o=document.createElement('option'); o.value=g; o.textContent=g;
    gruendeSel.appendChild(o);
  });
  card.appendChild(gruendeSel);

  // Sonstiges Textfeld (anfangs versteckt)
  const sonstigesDiv = document.createElement('div');
  sonstigesDiv.style.display = 'none';
  const sonstigesTa = document.createElement('textarea');
  sonstigesTa.id = 'ub-reject-komm';
  sonstigesTa.rows = 3;
  sonstigesTa.placeholder = 'Bitte Grund beschreiben…';
  sonstigesTa.style.cssText = 'width:100%;border:2px solid #dc2626;border-radius:10px;padding:12px;font-size:14px;font-family:inherit;outline:none;resize:none;margin-bottom:10px;box-sizing:border-box;';
  sonstigesDiv.appendChild(sonstigesTa);
  card.appendChild(sonstigesDiv);
  gruendeSel.addEventListener('change', function(){
    sonstigesDiv.style.display = this.value==='Sonstiges' ? 'block' : 'none';
    if(this.value==='Sonstiges') setTimeout(function(){sonstigesTa.focus();},80);
  });

  const confirmBtn = document.createElement('button');
  confirmBtn.style.cssText = 'width:100%;background:#dc2626;color:#fff;border:none;border-radius:12px;padding:15px;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:8px;touch-action:manipulation;';
  confirmBtn.textContent = '❌ Ablehnen & melden';
  confirmBtn.addEventListener('click', function(){
    const sel = document.getElementById('ub-reject-sel');
    const ta = document.getElementById('ub-reject-komm');
    let komm = sel ? sel.value : '';
    if(komm==='Sonstiges') komm = (ta ? ta.value.trim() : '');
    if(!komm){ alert('Bitte einen Grund auswählen.'); return; }
    document.body.removeChild(overlay);
    const ub=ubergaben.find(function(u){return u.status==='open';});
    if(ub){
      ub.status='rejected';
      ub.rejectedBy=st.name;
      ub.rejectedTs=new Date().toLocaleString('de-DE');
      ub.rejectedKommentar=komm;
      lsSave('ubergaben',ubergaben); fbSave('ubergaben',ubergaben);
      mitarbeiterNachrichten.push({id:'rej'+Date.now(),ts:new Date().toLocaleString('de-DE'),name:ub.von,text:'❌ Deine Übergabe wurde abgelehnt: '+komm,schicht:'–',gelesen:false});
      lsSave('mitNachrichten',mitarbeiterNachrichten); fbSave('mitNachrichten',mitarbeiterNachrichten);
    }
    updateSLBadge();
    go('s-cl');
  });
  const cancelBtn = document.createElement('button');
  cancelBtn.style.cssText = 'width:100%;background:none;border:none;color:#aaa;font-size:13px;cursor:pointer;font-family:inherit;';
  cancelBtn.textContent = 'Abbrechen';
  cancelBtn.addEventListener('click', function(){ document.body.removeChild(overlay); });
  card.appendChild(confirmBtn); card.appendChild(cancelBtn);
  overlay.appendChild(card); document.body.appendChild(overlay);
}

// ═══════════════════════════════════════════
// SCHICHTLEITER
// ═══════════════════════════════════════════
function updateSLBadge(){
  const badge=document.getElementById('sl-badge');
  if(!badge) return;
  const issues=ubergaben.filter(u=>u.status==='open'||u.status==='rejected').length;
  const unread=mitarbeiterNachrichten.filter(m=>!m.gelesen).length;
  const total=issues+unread;
  badge.style.display=total>0?'block':'none';
  badge.textContent=total;
}

// ═══════════════════════════════════════════
// HISTORIE
// ═══════════════════════════════════════════
function renderHist(){
  const body=document.getElementById('hist-body');if(!body)return;body.innerHTML='';
  if(!history.length){body.innerHTML='<div style="text-align:center;padding:40px 20px;color:var(--gt);">Noch keine Einträge</div>';return;}
  [...history].reverse().forEach(h=>{
    const item=document.createElement('div');item.className='hist-item'+(h.done?'':' hist-nd');
    item.innerHTML='<div class="hist-task">'+(h.done?'✅':'❌')+' '+h.taskText+'</div><div class="hist-meta">👤 '+h.name+' · '+h.ts+(h.reason?' · Grund: '+h.reason:'')+'<br>'+h.schicht+' · '+(h.bereich==='bake'?'Bake-Off':'Laden')+' · '+h.startTime+' Uhr</div>';
    body.appendChild(item);
  });
}

// ═══════════════════════════════════════════
// EDIT TASK
// ═══════════════════════════════════════════
function editTask(id) {
  const allT = Object.values(rollenAufgaben).flat(); const t = allT.find(function(x){return x.id===id;});
  if (!t) return;
  editingTaskId = id;
  // Fill form
  const sk = t.schicht + '_' + t.bereich;
  const sel = document.getElementById('et-schicht');
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === sk) { sel.selectedIndex = i; break; }
  }
  $set('et-time', 'value', t.time || '');
  $set('et-section', 'value', t.section || '');
  $set('et-text', 'value', t.text || '');
  $set('et-warn', 'value', t.warn || '');
  $set('et-ub', 'checked', !!t.ub);
  openOv('ov-edit-task');
}

function updateTask() {
  const allT2 = Object.values(rollenAufgaben).flat(); const t = allT2.find(function(x){return x.id===editingTaskId;});
  if (!t) return;
  const sk = document.getElementById('et-schicht').value;
  const [schicht, bereich] = sk.split('_');
  const txt = document.getElementById('et-text').value.trim();
  if (!txt) return;
  t.schicht  = schicht;
  t.bereich  = bereich;
  t.time     = document.getElementById('et-time').value || '00:00';
  t.section  = document.getElementById('et-section').value || 'Allgemein';
  t.text     = txt;
  t.warn     = document.getElementById('et-warn').value;
  t.ub       = document.getElementById('et-ub').checked;
  closeOv('ov-edit-task');
  renderAdmin();
}

// ═══════════════════════════════════════════
// SL REPORT (updated with Umsatz)
// ═══════════════════════════════════════════
function buildSLTaskReportSection(last7, now) {

  // SL tasks from history
  const slTaskHistory = history.filter(h => {
    try {
      const d = new Date(h.ts.split(', ')[0].split('.').reverse().join('-'));
      return (now-d) <= 7*24*60*60*1000 && h.taskText && slTasks.some(t=>t.text===h.taskText);
    } catch(e){return false;}
  });

  const totalSLTasks = slTasks.length * 7; // max possible in 7 days
  const doneSL = slTaskHistory.filter(h=>h.done).length;
  const ndSL   = slTaskHistory.filter(h=>!h.done).length;
  const slPct  = totalSLTasks>0 ? Math.round(doneSL/Math.max(doneSL+ndSL,1)*100) : 0;
  const slColor = slPct>=80?'#16a34a':slPct>=50?'#f0a500':'#ef4444';

  let rows = last7.slice().reverse().map(d=>{
    const key=dayKey(d);
    const dayEntries=slTaskHistory.filter(h=>{
      try{const hd=new Date(h.ts.split(', ')[0].split('.').reverse().join('-'));return dayKey(hd)===key;}catch(e){return false;}
    });
    const done=dayEntries.filter(h=>h.done).length;
    const nd=dayEntries.filter(h=>!h.done).length;
    const total=done+nd;
    const pct=total>0?Math.round(done/total*100):null;
    const isToday=key===dayKey(now);
    return `<tr style="border-bottom:1px solid #f0f0f0;${isToday?'background:#f0f7ff;':''}">
      <td style="padding:5px 8px;font-size:11px;font-weight:${isToday?'700':'400'};">${dayLabel(d)}${isToday?' 📍':''}</td>
      <td style="padding:5px 4px;text-align:center;font-weight:700;color:${pct===null?'#ccc':pct>=80?'#16a34a':pct>=50?'#f0a500':'#ef4444'};font-size:11px;">${pct===null?'–':pct+'%'}</td>
      <td style="padding:5px 4px;text-align:center;font-size:11px;color:#16a34a;">${done||'–'}</td>
      <td style="padding:5px 4px;text-align:center;font-size:11px;color:${nd>0?'#ef4444':'#ccc'};">${nd||'–'}</td>
    </tr>`;
  }).join('');

  return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">
    <div style="background:#f0f7ff;border-radius:9px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:900;color:${slColor};">${slPct}%</div><div style="font-size:10px;color:#888;margin-top:2px;">Wochenquote SL</div></div>
    <div style="background:#f5f5f5;border-radius:9px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:900;color:#16a34a;">${doneSL}</div><div style="font-size:10px;color:#888;margin-top:2px;">Erledigt (7T)</div></div>
    <div style="background:${ndSL>0?'#fff5f5':'#f5f5f5'};border-radius:9px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:900;color:${ndSL>0?'#ef4444':'#16a34a'};">${ndSL}</div><div style="font-size:10px;color:#888;margin-top:2px;">Offen (7T)</div></div>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px;">
    <tr style="background:#f4f4f4;">
      <th style="padding:5px 8px;text-align:left;">Tag</th>
      <th style="padding:5px 4px;text-align:center;">Quote</th>
      <th style="padding:5px 4px;text-align:center;">Erl.</th>
      <th style="padding:5px 4px;text-align:center;">Offen</th>
    </tr>
    ${rows}
  </table>`;
}

function buildTempReportSection(last7, now) {

  const totalDays = last7.length;
  const daysWithMeasurement = last7.filter(d => tempHistory.find(h=>h.date===dayKey(d))).length;
  const totalAlarms = tempHistory.filter(h=>{
    const d=new Date(h.date); return (now-d)<=7*24*60*60*1000;
  }).reduce((s,h)=>s+h.readings.filter(r=>r.alarm).length, 0);
  const totalWarns = tempHistory.filter(h=>{
    const d=new Date(h.date); return (now-d)<=7*24*60*60*1000;
  }).reduce((s,h)=>s+h.readings.filter(r=>r.warn).length, 0);

  const quotePct = Math.round(daysWithMeasurement/totalDays*100);
  const quoteColor = quotePct===100?'#16a34a':quotePct>=70?'#f59e0b':'#ef4444';

  let rows = last7.slice().reverse().map(d=>{
    const key=dayKey(d);
    const entry=tempHistory.find(h=>h.date===key);
    if(!entry) return `<tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:5px 8px;font-size:11px;">${dayLabel(d)}</td>
      <td style="padding:5px 4px;text-align:center;color:#ccc;font-size:11px;">–</td>
      <td style="padding:5px 4px;text-align:center;color:#ccc;font-size:11px;">–</td>
      <td style="padding:5px 4px;text-align:center;color:#ccc;font-size:11px;">–</td>
      <td style="padding:5px 8px;text-align:center;color:#ef4444;font-size:11px;font-weight:700;">Keine Messung</td>
    </tr>`;
    const alC=entry.readings.filter(r=>r.alarm).length;
    const waC=entry.readings.filter(r=>r.warn).length;
    const stColor=alC>0?'#ef4444':waC>0?'#f59e0b':'#16a34a';
    const stLabel=alC>0?'🚨 '+alC+' Alarm':waC>0?'⚠️ '+waC+' Warn.':'✅ OK';
    return `<tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:5px 8px;font-size:11px;">${dayLabel(d)}</td>
      <td style="padding:5px 4px;text-align:center;font-size:11px;">${entry.readings.length}</td>
      <td style="padding:5px 4px;text-align:center;font-size:11px;color:#ef4444;font-weight:${alC>0?'700':'400'};">${alC||'–'}</td>
      <td style="padding:5px 4px;text-align:center;font-size:11px;color:#f59e0b;font-weight:${waC>0?'700':'400'};">${waC||'–'}</td>
      <td style="padding:5px 8px;text-align:center;font-size:11px;font-weight:700;color:${stColor};">${stLabel}</td>
    </tr>`;
  }).join('');

  return `
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin:12px 0 6px;">🌡️ Temperaturkontrolle (7 Tage)</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;">
      <div style="background:#f5f5f5;border-radius:8px;padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:900;color:${quoteColor};">${quotePct}%</div>
        <div style="font-size:10px;color:#888;margin-top:1px;">Messquote</div>
      </div>
      <div style="background:${totalAlarms>0?'#fff5f5':'#f5f5f5'};border-radius:8px;padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:900;color:${totalAlarms>0?'#ef4444':'#16a34a'};">${totalAlarms}</div>
        <div style="font-size:10px;color:#888;margin-top:1px;">Alarme (7T)</div>
      </div>
      <div style="background:${totalWarns>0?'#fffbeb':'#f5f5f5'};border-radius:8px;padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:900;color:${totalWarns>0?'#f59e0b':'#16a34a'};">${totalWarns}</div>
        <div style="font-size:10px;color:#888;margin-top:1px;">Warnungen (7T)</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;">
      <tr style="background:#f4f4f4;">
        <th style="padding:5px 8px;text-align:left;">Tag</th>
        <th style="padding:5px 4px;text-align:center;">Geräte</th>
        <th style="padding:5px 4px;text-align:center;">Alarme</th>
        <th style="padding:5px 4px;text-align:center;">Warn.</th>
        <th style="padding:5px 8px;text-align:center;">Status</th>
      </tr>
      ${rows}
    </table>`;
}

function buildSlushReportSection(now) {
  const last4weeks = slushHistory.filter(h=>{
    const d=new Date(h.date); return (now-d)<=28*24*60*60*1000;
  });
  const lastEntry = slushHistory.length ? slushHistory[slushHistory.length-1] : null;
  const daysSince = lastEntry ? Math.floor((now-new Date(lastEntry.date))/(1000*60*60*24)) : 999;
  const statusColor = daysSince<=7?'#16a34a':daysSince<=14?'#f59e0b':'#ef4444';
  const statusLabel = daysSince<=7?'✅ Diese Woche':daysSince<=14?'⚠️ '+daysSince+' Tage her':'🚨 '+daysSince+' Tage – überfällig!';

  return `
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin:12px 0 6px;">🧊 Slushmaschine Reinigung</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
      <div style="background:${daysSince<=7?'#f0fdf4':'#fff5f5'};border-radius:8px;padding:10px;text-align:center;">
        <div style="font-size:14px;font-weight:900;color:${statusColor};">${statusLabel}</div>
        <div style="font-size:10px;color:#888;margin-top:2px;">Letzte Reinigung</div>
      </div>
      <div style="background:#f5f5f5;border-radius:8px;padding:10px;text-align:center;">
        <div style="font-size:20px;font-weight:900;color:#7c3aed;">${last4weeks.length}</div>
        <div style="font-size:10px;color:#888;margin-top:1px;">Reinigungen (4W)</div>
      </div>
    </div>
    ${last4weeks.length>0?`<div style="font-size:11px;color:#666;">${last4weeks.slice(-4).reverse().map(h=>'✅ '+new Date(h.date).toLocaleDateString('de-DE')+' · '+h.ma).join('<br>')}</div>`:'<div style="font-size:11px;color:#ccc;">Keine Einträge</div>'}`;
}

function buildInventurReportSection(last7, now) {
  const allDiffs = inventurHistory.reduce((s,h)=>s+h.differenzen.length,0);
  const weekSessions = inventurHistory.filter(h=>{
    try{return(now-new Date(h.date))<=7*24*60*60*1000;}catch(e){return false;}
  });
  const weekDiffs = weekSessions.reduce((s,h)=>s+h.differenzen.length,0);
  if(!weekSessions.length) return '';

  let rows = weekSessions.slice(-7).reverse().map(s=>{
    const d=new Date(s.date);
    const days=['So','Mo','Di','Mi','Do','Fr','Sa'];
    const label=days[d.getDay()]+' '+d.getDate()+'.';
    const hasDiff=s.differenzen.length>0;
    return '<tr style="border-bottom:1px solid #f0f0f0;">'+
      '<td style="padding:5px 8px;font-size:11px;">'+label+'</td>'+
      '<td style="padding:5px 4px;font-size:11px;">'+s.bereich+'</td>'+
      '<td style="padding:5px 4px;text-align:center;font-size:11px;">'+s.rows.length+'</td>'+
      '<td style="padding:5px 8px;text-align:center;font-size:11px;font-weight:700;color:'+(hasDiff?'#dc2626':'#16a34a')+';">'+(hasDiff?(s.totalDiffEur?s.totalDiffEur.toFixed(2).replace('.',',')+' €':s.differenzen.length+' Diff.'):'✅')+'</td>'+
      '</tr>';
  }).join('');

  return '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin:12px 0 6px;">📋 Zwischeninventur (7 Tage)</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">'+
    '<div style="background:'+(weekDiffs>0?'#fff5f5':'#f0fdf4')+';border-radius:8px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:900;color:'+(weekDiffs>0?'#dc2626':'#16a34a')+';">'+weekDiffs+'</div><div style="font-size:10px;color:#888;margin-top:1px;">Abweichungen (7T)</div></div>'+
    '<div style="background:#f5f5f5;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:900;color:#0f766e;">'+weekSessions.length+'</div><div style="font-size:10px;color:#888;margin-top:1px;">Inventuren (7T)</div></div>'+
    '</div>'+
    (weekDiffs>0?'<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;"><tr style="background:#f4f4f4;"><th style="padding:5px 8px;text-align:left;">Tag</th><th style="padding:5px 4px;text-align:left;">Bereich</th><th style="padding:5px 4px;text-align:center;">Artikel</th><th style="padding:5px 8px;text-align:center;">Status</th></tr>'+rows+'</table>':'');
}

function buildNachrichtenReportSection(now) {
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-7);
  const recentMit = mitarbeiterNachrichten.filter(m=>{try{return new Date(m.ts.split(', ')[0].split('.').reverse().join('-'))>=cutoff;}catch(e){return true;}});
  const recentSL  = slNachrichten.filter(m=>{try{return new Date(m.ts.split(', ')[0].split('.').reverse().join('-'))>=cutoff;}catch(e){return true;}});
  if(!recentMit.length && !recentSL.length) return '';

  let html = '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin:12px 0 6px;">📬 Nachrichten (7 Tage)</div>';

  if(recentMit.length) {
    html += '<div style="font-size:11px;font-weight:700;color:#444;margin-bottom:5px;">Von Mitarbeitern ('+recentMit.length+'):</div>';
    html += '<div style="background:#fff8f8;border-left:3px solid #ef4444;padding:8px 10px;border-radius:0 8px 8px 0;margin-bottom:8px;">';
    recentMit.slice(-5).forEach(m=>{
      html += '<div style="font-size:11px;margin-bottom:4px;"><strong>'+m.name+'</strong> ('+m.schicht+'): '+m.text+' <span style="color:#999;">· '+m.ts+'</span></div>';
    });
    html += '</div>';
  }
  if(recentSL.length) {
    html += '<div style="font-size:11px;font-weight:700;color:#444;margin-bottom:5px;">Vom Schichtleiter ('+recentSL.length+'):</div>';
    html += '<div style="background:#f0f4ff;border-left:3px solid #0f3460;padding:8px 10px;border-radius:0 8px 8px 0;margin-bottom:8px;">';
    recentSL.slice(-5).forEach(m=>{
      html += '<div style="font-size:11px;margin-bottom:4px;">'+m.text+' <span style="color:#999;">· '+m.ts+'</span></div>';
    });
    html += '</div>';
  }
  return html;
}

function renderSLReport(){
  const box=document.getElementById('sl-report-box');
  if(!box)return;
  const now=new Date();
  const last7=[];for(let i=0;i<7;i++){const d=new Date(now);d.setDate(d.getDate()-i);last7.push(d);}

  function getUmsatzForDay(d){return umsatzData.find(u=>u.date===dayKey(d))||null;}

  const thisMonth=now.getMonth(),thisYear=now.getFullYear();
  const monthHist=history.filter(h=>{try{const d=new Date(h.ts.split(', ')[0].split('.').reverse().join('-'));return d.getMonth()===thisMonth&&d.getFullYear()===thisYear;}catch(e){return false;}});
  const weekHist=history.filter(h=>{try{const d=new Date(h.ts.split(', ')[0].split('.').reverse().join('-'));return(now-d)<=7*24*60*60*1000;}catch(e){return false;}});
  const monthDone=monthHist.filter(h=>h.done).length,monthND=monthHist.filter(h=>!h.done).length;
  const monthTotal=monthDone+monthND,monthPct=monthTotal>0?Math.round(monthDone/monthTotal*100):0;
  const weekPct=weekHist.length>0?Math.round(weekHist.filter(h=>h.done).length/weekHist.length*100):0;

  const monthUmsatz=umsatzData.filter(u=>u.date.startsWith(now.toISOString().slice(0,7)));
  const totalUmsatz=monthUmsatz.reduce((s,u)=>s+u.betrag,0);
  const avgUmsatz=monthUmsatz.length?Math.round(totalUmsatz/monthUmsatz.length):0;
  const totalKunden=monthUmsatz.reduce((s,u)=>s+u.kunden,0);
  const avgBon=totalKunden>0?Math.round(totalUmsatz/totalKunden*100)/100:0;

  const ndAll=history.filter(h=>!h.done);
  const reasonCount={};
  ndAll.forEach(h=>{const r=h.reason||'Kein Grund';reasonCount[r]=(reasonCount[r]||0)+1;});
  const sorted=Object.entries(reasonCount).sort((a,b)=>b[1]-a[1]);

  const mo=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

  box.innerHTML=`
  <div id="report-printable" style="background:#fff;border-radius:14px;padding:18px;box-shadow:0 2px 10px rgba(0,0,0,.08);">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;border-bottom:2.5px solid #0f3460;padding-bottom:10px;">
      <div>
        <div style="font-size:17px;font-weight:900;color:#0f3460;">Schichtbericht ${mo[thisMonth]} ${thisYear}</div>
        <div style="font-size:11px;color:#888;margin-top:2px;">Prima Supermarkt Reutlingen · Erstellt: ${now.toLocaleString('de-DE')}</div>
      </div>
      <div style="background:#c8453a;color:#fff;font-weight:700;font-size:12px;padding:3px 9px;border-radius:4px;">PRIMA</div>
    </div>

    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">Aufgabenquote Mitarbeiter</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">
      ${[
        {val:monthPct+'%',lbl:'Monatsquote',color:monthPct>=80?'#16a34a':monthPct>=50?'#f0a500':'#ef4444'},
        {val:weekPct+'%',lbl:'Wochenquote',color:weekPct>=80?'#16a34a':weekPct>=50?'#f0a500':'#ef4444'},
        {val:monthND,lbl:'Nicht erledigt',color:monthND>0?'#ef4444':'#16a34a'},
      ].map(s=>`<div style="background:#f5f5f5;border-radius:9px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:900;color:${s.color};">${s.val}</div><div style="font-size:10px;color:#888;margin-top:2px;">${s.lbl}</div></div>`).join('')}
    </div>

    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">Aufgabenquote Schichtleiter</div>
    ${buildSLTaskReportSection(last7, now)}

    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">Regalpflege</div>
    ${(function(){
      const q7 = calcRegalQuote(7);
      const q30 = calcRegalQuote(30);
      const target = regalTarget;
      const col7 = q7===null?'#888':q7>=target?'#16a34a':q7>=target-10?'#f59e0b':'#ef4444';
      const col30 = q30===null?'#888':q30>=target?'#16a34a':q30>=target-10?'#f59e0b':'#ef4444';
      return '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">'+
        '<div style="background:#f5f5f5;border-radius:9px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:900;color:'+col7+';">'+(q7!==null?q7+'%':'–')+'</div><div style="font-size:10px;color:#888;">7-Tage-Quote</div></div>'+
        '<div style="background:#f5f5f5;border-radius:9px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:900;color:'+col30+';">'+(q30!==null?q30+'%':'–')+'</div><div style="font-size:10px;color:#888;">30-Tage-Quote</div></div>'+
        '<div style="background:#e0f2fe;border-radius:9px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:900;color:#0369a1;">'+target+'%</div><div style="font-size:10px;color:#888;">Target</div></div>'+
        '</div>';
    })()}

    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">Umsatz ${mo[thisMonth]}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
      ${[
        {val:totalUmsatz.toLocaleString('de-DE')+'€',lbl:'Gesamtumsatz'},
        {val:avgUmsatz.toLocaleString('de-DE')+'€',lbl:'Ø pro Tag'},
        {val:totalKunden.toLocaleString('de-DE'),lbl:'Gesamtkunden'},
        {val:avgBon.toFixed(2)+'€',lbl:'Ø Bon/Kunde'},
      ].map(s=>`<div style="background:#f0f7ff;border-radius:9px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:900;color:#0f3460;">${s.val}</div><div style="font-size:10px;color:#888;margin-top:2px;">${s.lbl}</div></div>`).join('')}
    </div>

    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:6px;">Letzte 7 Tage</div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px;">
      <tr style="background:#f4f4f4;">
        <th style="padding:6px 8px;text-align:left;">Tag</th>
        <th style="padding:6px 4px;text-align:center;">Quote</th>
        <th style="padding:6px 4px;text-align:center;">Umsatz</th>
        <th style="padding:6px 4px;text-align:center;">Kunden</th>
        <th style="padding:6px 8px;text-align:center;">Übergabe</th>
      </tr>
      ${last7.slice().reverse().map(d=>{
        const dh=getHistForDay(d),done=dh.filter(h=>h.done).length,nd=dh.filter(h=>!h.done).length,total=done+nd;
        const pct=total>0?Math.round(done/total*100):null;
        const dub=getUBForDay(d);
        const uz=getUmsatzForDay(d);
        const ubOK=dub.length>0&&dub.every(u=>u.status==='accepted');
        const ubBad=dub.some(u=>u.status==='rejected');
        const ubLabel=dub.length===0?'<span style="color:#ef4444;">Keine</span>':ubBad?'<span style="color:#ef4444;">Abgel.</span>':ubOK?'<span style="color:#16a34a;">✅</span>':'<span style="color:#f0a500;">Offen</span>';
        const isToday=dayKey(d)===dayKey(now);
        return`<tr style="border-bottom:1px solid #f0f0f0;${isToday?'background:#f0f7ff;':''}">
          <td style="padding:6px 8px;font-weight:${isToday?'700':'500'};">${dayLabel(d)}${isToday?' 📍':''}</td>
          <td style="padding:6px 4px;text-align:center;font-weight:700;color:${pct===null?'#ccc':pct>=80?'#16a34a':pct>=50?'#f0a500':'#ef4444'}">${pct===null?'–':pct+'%'}</td>
          <td style="padding:6px 4px;text-align:center;font-size:11px;">${uz?uz.betrag.toLocaleString('de-DE')+'€':'–'}</td>
          <td style="padding:6px 4px;text-align:center;font-size:11px;">${uz?uz.kunden:'–'}</td>
          <td style="padding:6px 8px;text-align:center;">${ubLabel}</td>
        </tr>`;
      }).join('')}
    </table>

    ${sorted.length>0?`
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:6px;">Top Probleme</div>
    <div style="margin-bottom:12px;">${sorted.slice(0,4).map(([r,c])=>`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
        <div style="font-size:12px;flex:1;">${r}</div>
        <div style="width:70px;height:5px;background:#f0f0f0;border-radius:3px;"><div style="width:${Math.round(c/sorted[0][1]*100)}%;height:100%;background:#ef4444;border-radius:3px;"></div></div>
        <div style="font-size:11px;font-weight:700;color:#ef4444;min-width:20px;">${c}×</div>
      </div>`).join('')}</div>`:''}

    ${buildTempReportSection(last7, now)}
    ${buildSlushReportSection(now)}
    ${buildInventurReportSection(last7, now)}
    ${buildNachrichtenReportSection(now)}
    <div style="font-size:9px;color:#ccc;text-align:center;border-top:1px solid #f0f0f0;padding-top:8px;">Prima Supermarkt Reutlingen GmbH · Automatisch generiert</div>
  </div>
  <div style="margin-top:10px;font-size:12px;color:#888;text-align:center;background:#f4f4f4;border-radius:10px;padding:12px;">
    📸 <strong>Screenshot für Geschäftsleitung:</strong><br>
    iPhone: Seitentaste + Lautstärke hoch<br>
    Android: Seitentaste + Lautstärke runter
  </div>
  <button id="btn-export-haccp" style="width:100%;background:#0f3460;color:#fff;border:none;border-radius:12px;padding:13px;font-size:13px;font-weight:700;cursor:pointer;margin-top:8px;font-family:inherit;touch-action:manipulation;">📊 HACCP Bericht anzeigen</button>
  <button id="btn-export-csv" style="width:100%;background:#f4f4f4;border:none;border-radius:12px;padding:13px;font-size:13px;font-weight:700;cursor:pointer;margin-top:6px;font-family:inherit;color:#333;touch-action:manipulation;">📋 CSV exportieren</button>`;

  // Buttons im Rep-Tab per addEventListener binden (nach innerHTML-Rendern)
  setTimeout(function(){
    var bHaccp = document.getElementById('btn-export-haccp');
    if(bHaccp) bHaccp.addEventListener('click', function(){ exportHACCP(); });
    var bCsv = document.getElementById('btn-export-csv');
    if(bCsv) bCsv.addEventListener('click', function(){ exportCSV(); });
  }, 0);
}


function openScanner(callback) {
  scanCallback = callback;
  const overlay = document.getElementById('scan-overlay');
  const video   = document.getElementById('scan-video');
  overlay.classList.add('show');

  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})
    .then(function(stream){
      scanStream = stream;
      video.srcObject = stream;
      video.play();
      if('BarcodeDetector' in window){
        startBarcodeDetection(video);
      } else {
        // Fallback: prompt manual input
        closeScanner();
        const val = prompt('Kamera nicht verfügbar.\nBarcode manuell eingeben:');
        if(val && scanCallback) scanCallback(val.trim());
      }
    })
    .catch(function(err){
      closeScanner();
      const val = prompt('Kamera-Zugriff verweigert.\nBarcode manuell eingeben:');
      if(val && scanCallback) scanCallback(val.trim());
    });
}

function startBarcodeDetection(video){
  const detector = new BarcodeDetector({formats:['ean_13','ean_8','code_128','code_39','upc_a','upc_e','itf','codabar']});
  let lastDetected = '';
  let sameCount = 0;

  var detect = function(){
    if(!document.getElementById('scan-overlay').classList.contains('show')) return;
    detector.detect(video)
      .then(function(codes){
        if(codes.length>0){
          const code = codes[0].rawValue;
          if(code===lastDetected){
            sameCount++;
            if(sameCount>=2){
              // Confirmed scan
              if(scanCallback) scanCallback(code);
              closeScanner();
              return;
            }
          } else {
            lastDetected=code;
            sameCount=1;
          }
        }
        scanAnimFrame = requestAnimationFrame(detect);
      })
      .catch(function(){
        scanAnimFrame = requestAnimationFrame(detect);
      });
  }
  scanAnimFrame = requestAnimationFrame(detect);
}

function closeScanner(){
  const overlay = document.getElementById('scan-overlay');
  overlay.classList.remove('show');
  if(scanStream){
    scanStream.getTracks().forEach(function(t){t.stop();});
    scanStream=null;
  }
  if(scanAnimFrame){
    cancelAnimationFrame(scanAnimFrame);
    scanAnimFrame=null;
  }
  const video=document.getElementById('scan-video');
  if(video) video.srcObject=null;
}

function openBrett() {
  renderBrett();
  go('s-brett');
}

function renderBrett() {
  const body = document.getElementById('brett-body');
  if(!body) return;
  body.innerHTML = '';
  const aktive = schwarzesBrett.filter(m=>m.aktiv);
  if(!aktive.length) {
    body.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#ccc;"><div style="font-size:44px;margin-bottom:12px;">📌</div><div style="font-size:15px;font-weight:700;color:#333;">Keine Einträge</div></div>';
    return;
  }
  aktive.forEach(msg => {
    const already = msg.bestaetigt && msg.bestaetigt.includes(st.name);
    const card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:13px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.08);margin-bottom:10px;border-left:4px solid #1a1a1a;';
    card.innerHTML = '<div style="font-size:14px;font-weight:700;color:#111;margin-bottom:6px;">'+msg.text+'</div>'+
      '<div style="font-size:11px;color:#888;margin-bottom:10px;">📅 '+msg.ts+(msg.bestaetigt&&msg.bestaetigt.length?' · ✅ '+msg.bestaetigt.length+' bestätigt':'')+'</div>';
    if(!already) {
      const btn = document.createElement('button');
      btn.style.cssText = 'background:#1a1a1a;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;width:100%;';
      btn.textContent = '✅ Gelesen & verstanden';
      (function(m){ btn.addEventListener('click', function(){
        if(!m.bestaetigt) m.bestaetigt=[];
        if(st.name && !m.bestaetigt.includes(st.name)) m.bestaetigt.push(st.name);
        lsSave('schwarzesBrett',schwarzesBrett);
        renderBrett();
        updateBadges();
      });})(msg);
      card.appendChild(btn);
    } else {
      const done = document.createElement('div');
      done.style.cssText = 'background:#dcfce7;color:#15803d;border-radius:8px;padding:8px;font-size:12px;font-weight:700;text-align:center;';
      done.textContent = '✅ Du hast dies bestätigt';
      card.appendChild(done);
    }
    body.appendChild(card);
  });
}

function openDefekt() {
  renderDefektList();
  go('s-defekt');
}

function renderDefektList() {
  const list = document.getElementById('defekt-list');
  if(!list) return;
  list.innerHTML = '';
  const open = defektMeldungen.filter(d=>d.status==='offen');
  if(!open.length) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:#ccc;">Keine offenen Defekte</div>';
    return;
  }
  open.forEach(d => {
    const card = document.createElement('div');
    card.style.cssText = 'background:#fff5f5;border:1.5px solid #fecaca;border-radius:11px;padding:12px 14px;margin-bottom:8px;';
    card.innerHTML = '<div style="font-size:13px;font-weight:700;color:#dc2626;">🔧 '+d.geraet+'</div>'+
      '<div style="font-size:12px;color:#444;margin-top:4px;">'+d.beschreibung+'</div>'+
      '<div style="font-size:11px;color:#888;margin-top:4px;">👤 '+d.ma+' · '+d.ts+'</div>';
    list.appendChild(card);
  });
}

function submitDefekt() {
  const geraet = document.getElementById('def-geraet').value.trim();
  const beschreibung = document.getElementById('def-beschreibung').value.trim();
  if(!geraet||!beschreibung){ alert('Bitte Gerät und Beschreibung eingeben.'); return; }
  const entry = {id:'def'+Date.now(),ts:new Date().toLocaleString('de-DE'),ma:st.name||'Unbekannt',geraet,beschreibung,status:'offen'};
  defektMeldungen.push(entry);
  lsSave('defektMeldungen',defektMeldungen);
  // Also notify SL
  mitarbeiterNachrichten.push({ts:entry.ts,name:st.name||'Unbekannt',text:'🔧 Defekt: '+geraet+' – '+beschreibung,schicht:slbls[st.schicht]||'–',gelesen:false});
  lsSave('mitNachrichten',mitarbeiterNachrichten);
  updateSLBadge();
  $set('def-geraet', 'value', '');
  $set('def-beschreibung', 'value', '');
  renderDefektList();
  updateBadges();
  alert('✅ Defekt gemeldet! Schichtleiter wurde informiert.');
}

