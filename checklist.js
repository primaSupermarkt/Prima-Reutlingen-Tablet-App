// ═══════════════════════════════════════════════════════════════
// CHECKLIST.JS
// Checklisten-Logik: Aufgaben anzeigen, erledigen, Regalfotos, Backen-Vorgang
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════
// CHECKLISTE
// ═══════════════════════════════════════════
function getFilteredTasks(){ return getMyTasks(); }


// [safeRegalNB – definiert in firebase.js]
function getMyTasks(){
  try {
    const schicht = st.schicht || 'mid';
    const rolle   = st.rolle   || 'kasse';
    const key     = schicht + '_' + rolle;

    // Rolle-Aufgaben aus rollenAufgaben
    const base = (rollenAufgaben[key] || []).map(function(t, i){
      return Object.assign({}, t, {
        id:      t.id || (key+'_'+i),
        schicht: schicht,
        bereich: rolle
      });
    });

    // Wochenaufgaben hinzufügen
    const dow = new Date().getDay();
    const todayKey = new Date().toISOString().slice(0,10);
    const weekly = (weeklyTasks||[]).filter(function(wt){
      if(!wt.days||!wt.days.includes(dow)) return false;
      if(wt.schicht!=='all'&&wt.schicht!==schicht) return false;
      return true;
    }).map(function(wt){
      return {
        id:'wt_'+wt.id+'_'+todayKey, schicht:schicht, bereich:rolle,
        section:wt.section||'Wochenaufgabe', text:wt.text, warn:wt.warn||'',
        ub:false, special:wt.special||null, isWeekly:true
      };
    });

    // Persönliche Aufgaben des Mitarbeiters
    const today = new Date().toISOString().slice(0,10);
    const persAufg = (persAufgaben||[]).filter(function(a){
      return a.ma===st.name && a.datum>=today && a.status==='offen';
    }).map(function(a){
      return {
        id:'pers_'+a.id, schicht:schicht, bereich:rolle,
        section:'Meine Aufgaben', text:a.text,
        warn:(a.priority==='dringend'?'⚠️ DRINGEND':''), ub:false,
        isPers:true, persId:a.id
      };
    });

    // Regal-Nachbesserungsaufgaben (nur für Nicht-Bake-Off)
    const regalAufg = [];
    if(rolle !== 'bake') {
      (Array.isArray(regalNachbesserungen)?regalNachbesserungen:[]).filter(function(n){
        return n.status==='offen' && n.datum<=today;
      }).forEach(function(n){
        regalAufg.push({
          id:'rn_'+n.id, schicht:schicht, bereich:rolle,
          section:'Meine Aufgaben',
          text:'📸 Regal nachbessern: '+n.bereich,
          warn:'⚠️ '+n.weisung, ub:false,
          special:'regal_nachbesserung', regalNachbesserungId:n.id
        });
      });
    }

    return base.concat(weekly).concat(persAufg).concat(regalAufg);
  } catch(e) {
    console.error('getMyTasks error:', e);
    return [];
  }
}

// [safeRegalNB – definiert in firebase.js]

function startCL(name){
  st.name=name;
  // clState komplett aus localStorage laden – kein Datum-Filter
  // Der Stand gehört dem Mitarbeiter und bleibt bis er explizit gelöscht wird
  clState = lsLoad('clState', {});
  updateBadges();
  // Show Schwarzes Brett if unconfirmed messages
  const unconfMsgs=schwarzesBrett.filter(m=>m.aktiv&&!(m.bestaetigt&&m.bestaetigt.includes(st.name)));
  if(unconfMsgs.length){
    const msg=unconfMsgs.map(m=>m.text).join('\n\n');
    alert('Schwarzes Brett:\n\n'+msg+'\n\nBitte unter Schwarzes Brett bestaetigen.');
  }
  // Restore any weekly task completions for today
  const todayKey=new Date().toISOString().slice(0,10);
  Object.keys(weeklyCheckState).forEach(k=>{
    if(k.includes(todayKey)) clState[k]=weeklyCheckState[k];
  });
  try{ renderCL(); }catch(e){ console.error('renderCL error:',e); }
  go('s-cl');
  const openUB=ubergaben.find(u=>u.status==='open');
  const ubBanner=document.getElementById('ub-open-banner'); if(ubBanner) ubBanner.style.display=openUB?'flex':'none';
  const clHdr=document.getElementById('cl-hdr'); if(clHdr) clHdr.style.background=st.bereich==='bake'?'#b45309':'var(--black)';
  const rollenLabels = {bake:'🥐 Bake-Off',kasse:'🛒 Kasse',regal:'📦 Regale',lager:'🏭 Lager',springer:'🔄 Springer'};
  $text('cl-lbl', slbls[st.schicht]+' · '+(rollenLabels[st.rolle]||st.rolle||''));
  go('s-cl');
}

function showStartTimeDialog(name) { finishLogin(); return; // Startzeit-Dialog deaktiviert
  const now = new Date();
  const nowStr = now.toTimeString().slice(0,5);

  const overlay = document.createElement('div');
  overlay.id = 'ze-start-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;';

  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border-radius:18px;padding:22px;width:100%;max-width:360px;';
  card.innerHTML =
    '<div style="font-size:20px;font-weight:900;margin-bottom:6px;">⏱️ Guten Start!</div>'+
    '<div style="font-size:14px;color:#555;margin-bottom:16px;">Hallo <strong>'+name+'</strong> – wann hast du heute angefangen zu arbeiten?</div>'+
    '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:4px;">Arbeitsbeginn</label>'+
    '<input type="time" id="ze-dialog-start" value="'+istStart+'" style="width:100%;border:2px solid #1e3a5f;border-radius:10px;padding:12px;font-size:22px;font-family:inherit;outline:none;text-align:center;margin-bottom:4px;">'+
    '<div id="ze-time-hint" style="font-size:12px;color:#888;margin-bottom:10px;min-height:18px;text-align:center;"></div>'+
    '<div style="font-size:11px;color:#aaa;margin-bottom:14px;text-align:center;">Sollstart: <strong>'+schichtSoll.start+'</strong> · Jetzt: <strong>'+nowStr+'</strong></div>'+
    '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:4px;">PIN (falls vergeben)</label>'+
    '<div id="ze-dialog-pin" data-pin="" style="width:100%;border:1.5px solid #e0e0e0;border-radius:10px;padding:10px;font-size:24px;letter-spacing:8px;text-align:center;margin-bottom:6px;min-height:44px;background:#f9f9f9;"></div>'+
    buildPinPad('ze-dialog-pin')+'<div style="margin-bottom:10px;"></div>';

  // Hint live aktualisieren
  var updateHint = function() {
    const inp = document.getElementById('ze-dialog-start');
    const hint = document.getElementById('ze-time-hint');
    if(!inp||!hint) return;
    const val = inp.value;
    if(!val) { hint.textContent=''; return; }
    const [hh,mm] = val.split(':').map(Number);
    const [nh,nm] = nowStr.split(':').map(Number);
    const diffMin = (nh*60+nm) - (hh*60+mm);
    if(diffMin < 0) {
      hint.style.color='#ef4444';
      hint.textContent='⚠️ Zeitpunkt liegt in der Zukunft – nicht möglich';
    } else if(diffMin === 0) {
      hint.style.color='#888'; hint.textContent='= aktuelle Uhrzeit';
    } else if(diffMin <= 59) {
      hint.style.color='#16a34a';
      hint.textContent='✅ '+diffMin+' Min. rückwirkend – möglich';
    } else {
      hint.style.color='#f59e0b';
      hint.textContent='⚠️ '+Math.floor(diffMin/60)+'h '+diffMin%60+'m rückwirkend – Schichtleiter muss bestätigen';
    }
  }
  setTimeout(function(){
    const inp=document.getElementById('ze-dialog-start');
    if(inp){ inp.addEventListener('input',updateHint); updateHint(); }
  },50);

  const btn = document.createElement('button');
  btn.style.cssText = 'width:100%;background:#1e3a5f;color:#fff;border:none;border-radius:12px;padding:15px;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit;';
  btn.textContent = '✅ Schicht starten';
  btn.addEventListener('click', function() {
    const zeDisp=document.getElementById('ze-dialog-pin'); const pin=zeDisp?zeDisp.getAttribute('data-pin')||'':'';
    const prof = maProfiles[name]||{};
    if(prof.pin && pin !== prof.pin) { alert('Falscher PIN. Bitte nochmal versuchen.'); return; }
    const startVal = document.getElementById('ze-dialog-start').value || nowStr;

    // Differenz prüfen
    const [sh,sm] = startVal.split(':').map(Number);
    const [nh2,nm2] = nowStr.split(':').map(Number);
    const diffMin = (nh2*60+nm2) - (sh*60+sm);

    if(diffMin < 0) {
      alert('⚠️ Der eingetragene Zeitpunkt liegt in der Zukunft. Bitte korrigieren.');
      return;
    }

    if(diffMin >= 60) {
      // Mehr als 1 Stunde rückwirkend → Schichtleiter-Bestätigung nötig
      const slPw = prompt('Mehr als 1 Stunde rueckwirkend ('+Math.floor(diffMin/60)+'h '+diffMin%60+'m).\n\nDas muss ein Schichtleiter bestaetigen.\nBitte Schichtleiter-Passwort eingeben:');
      if(slPw !== SL_PW) {
        alert('Falsches Passwort. Eintrag nicht moeglich. Bitte den Schichtleiter rufen.');
        return;
      }
      // Mit SL-Bestätigung
      const effStart = calcIstStart(st.schicht, startVal);
      st.zeStart = effStart;
      st.zeDate = new Date().toISOString().slice(0,10);
      // Notiz hinterlegen
      mitarbeiterNachrichten.push({
        ts: new Date().toLocaleString('de-DE'),
        name: name,
        text: '🕐 Nachträglicher Arbeitsbeginn: '+startVal+' Uhr ('+diffMin+' Min. rückwirkend, vom SL bestätigt)',
        schicht: st.schicht||'–',
        gelesen: false
      });
      lsSave('mitNachrichten', mitarbeiterNachrichten);
      fbSave('mitNachrichten', mitarbeiterNachrichten);
      updateSLBadge();
    } else {
      // Unter 1 Stunde – direkt übernehmen
      const effStart = calcIstStart(st.schicht, startVal);
      st.zeStart = effStart;
      st.zeDate = new Date().toISOString().slice(0,10);
    }

    document.body.removeChild(overlay);
    finishLogin();
  });
  card.appendChild(btn);

  const skipBtn = document.createElement('button');
  skipBtn.style.cssText = 'width:100%;background:none;border:none;color:#888;font-size:12px;cursor:pointer;margin-top:10px;font-family:inherit;';
  skipBtn.textContent = 'Überspringen (keine Zeiterfassung)';
  skipBtn.onclick = function() { document.body.removeChild(overlay); finishLogin(); };
  card.appendChild(skipBtn);

  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function finishLogin() {
  // Login registrieren
  if(st.name){
    activeLogins[st.name]={
      schicht:st.schicht||'',
      bereich:st.bereich||'',
      startTime:st.startTime||'',
      loginTs:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),
      clDone:0, clTotal:0
    };
    lsSave('activeLogins',activeLogins);
    fbSave('activeLogins',activeLogins);
  }
  // Logout-Button einblenden
  const lb=document.getElementById('logout-btn');
  if(lb&&st.name) lb.style.display='block';
  // If open ubergabe, scroll banner into view
  const openUB_fl=ubergaben.find(function(u){return u.status==='open';});
  if(openUB_fl){
    setTimeout(function(){
      try{
        const banner=document.getElementById('ub-open-banner');
        if(banner)banner.scrollIntoView({behavior:'smooth',block:'start'});
      }catch(e){}
    },200);
  }
}

function renderCL(){
  const myTasks=getMyTasks();
  // Fortschritt in activeLogins speichern
  if(st.name && activeLogins[st.name]){
    const done=myTasks.filter(function(t){return clState[t.id]&&clState[t.id].status==='done';}).length;
    activeLogins[st.name].clDone=done;
    activeLogins[st.name].clTotal=myTasks.length;
    activeLogins[st.name].lastSeen=new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
    lsSave('activeLogins',activeLogins);
    fbSave('activeLogins',activeLogins);
  }
  const body=document.getElementById('cl-body');if(!body)return;body.innerHTML='';
  let curSec='';

  // Show Übergabe-Annahme as first item if accepted
  const ubAcc=clState['ub_accept'];
  const openUB=ubergaben.find(u=>u.status==='open');
  if(ubAcc||openUB){
    const sec=document.createElement('div');sec.className='cl-sec';
    sec.innerHTML='<span class="cl-tbadge">🔄</span>Schichtübergabe';
    body.appendChild(sec);
    const row=document.createElement('div');
    if(ubAcc){
      row.className='cl-row done-row';
      row.innerHTML='<div class="cl-top"><div class="cl-cb">✓</div><div class="cl-txt">Übergabe von '+ubAcc.ubVon+' angenommen<div class="cl-who">✓ '+ubAcc.who+' · '+ubAcc.ts+'</div></div></div>';
    } else {
      row.className='cl-row warn-row';
      row.style.cursor='pointer';
      row.innerHTML='<div class="cl-top"><div class="cl-cb" style="border-color:var(--orange);">🔄</div><div class="cl-txt">Offene Schichtübergabe annehmen!<div class="cl-warn-txt">Tippe hier um die Übergabe zu öffnen</div></div></div>';
      row.onclick=()=>goUbergabeAnnehmen();
    }
    body.appendChild(row);
  }

  // Persönliche SL-Aufgaben einblenden
  renderPersAufgaben(body);


  myTasks.forEach(task=>{
    if(task.section!==curSec){
      curSec=task.section;
      const sec=document.createElement('div');sec.className='cl-sec';
      const secIcons = {start:'🟢',pause1:'☕',pause2:'🔔',ende:'🏁','Wochenaufgabe':'📅','Meine Aufgaben':'📌'};
      const secIcon = secIcons[task.section] || '▸';
      sec.innerHTML='<span class="cl-tbadge">'+secIcon+'</span>'+
        ({start:'Schichtbeginn',pause1:'Pause 1',pause2:'Pause 2',ende:'Schichtende',
          'Wochenaufgabe':'Wochenaufgabe','Meine Aufgaben':'Meine Aufgaben'}[task.section]||task.section);
      body.appendChild(sec);
    }
    body.appendChild(makeTaskRow(task));
  });

  // Progress
  const total=myTasks.length;
  const done=myTasks.filter(t=>clState[t.id]&&clState[t.id].status).length;
  const pct=total?Math.round(done/total*100):0;
  const clProg=document.getElementById('cl-prog'); if(clProg) clProg.style.width=pct+'%';

  // All done? (exclude oncePerDay done by others, and pause tasks)
  const todayKey3=new Date().toISOString().slice(0,10);
  const requiredTasks = myTasks.filter(t => {
    // Skip pause tasks - they are optional reminders
    if(t.pause) return false;
    // Skip oncePerDay tasks already done by someone else
    if(t.oncePerDay) {
      const doneKey = t.id+'_'+todayKey3;
      if(onceDoneToday[doneKey] && !clState[t.id]) return false;
    }
    return true;
  });
  const requiredDone = requiredTasks.filter(t=>clState[t.id]&&clState[t.id].status).length;
  const allDone = requiredDone === requiredTasks.length && requiredTasks.length > 0;
  $style('cl-done', 'display', allDone?'block':'none');
  $style('ub-btn', 'display', allDone?'block':'none');

  // Check for escalations
  checkEscalations(myTasks);
}

function makeTaskRow(task){
  // Check once-per-day: if another session already completed it today
  const todayKey=new Date().toISOString().slice(0,10);
  if(task.oncePerDay) {
    const doneKey = task.id+'_'+todayKey;
    const alreadyDone = onceDoneToday[doneKey];
    if(alreadyDone && !clState[task.id]) {
      // Show as done by other person
      const div=document.createElement('div');
      div.className='cl-row done-row';
      div.innerHTML='<div class="cl-top"><div class="cl-cb" style="background:#16a34a;border-color:#16a34a;color:#fff;">✓</div>'+
        '<div class="cl-txt">'+task.text+
        '<div class="cl-who">✓ Bereits erledigt von '+alreadyDone.who+' · '+alreadyDone.ts+'</div></div></div>';
      return div;
    }
  }
  const cs=clState[task.id]||{};
  const status=cs.status; // 'done'|'nd'|undefined
  const div=document.createElement('div');
  let cls='cl-row';
  if(status==='done')cls+=' done-row';
  if(status==='nd')cls+=' not-done-row';
  if(task.warn&&!status)cls+=' warn-row';
  if(task.special)cls+=' special-row';
  div.className=cls;div.id='clr-'+task.id;

  // Top row
  const top=document.createElement('div');top.className='cl-top';
  const cb=document.createElement('div');cb.className='cl-cb';
  cb.innerHTML=status==='done'?'✓':status==='nd'?'✗':'';
  const txtDiv=document.createElement('div');txtDiv.className='cl-txt';
  txtDiv.textContent=task.text;
  if(task.warn){const w=document.createElement('div');w.className='cl-warn-txt';w.textContent=task.warn;txtDiv.appendChild(w);}
  if(status==='done'&&cs.who){const w=document.createElement('div');w.className='cl-who';w.textContent='✓ '+cs.who+' · '+cs.ts;txtDiv.appendChild(w);}
  if(status==='nd'){
    const w=document.createElement('div');w.className='cl-who-nd';
    w.textContent='✗ '+cs.who+(cs.reason?' · '+cs.reason:'')+' · '+cs.ts;txtDiv.appendChild(w);
  }
  top.appendChild(cb);top.appendChild(txtDiv);
  div.appendChild(top);

  // Long press to undo on completed/nd rows
  if(status==='done'||status==='nd'){
    let pressTimer=null;
    div.addEventListener('touchstart',function(e){
      pressTimer=setTimeout(function(){
        try{
          if(confirm('Aufgabe "'+task.text+'" zuruecksetzen?')){
            delete clState[task.id];
            renderCL();
          }
        }catch(e){}
      },600);
    });
    div.addEventListener('touchend',function(){clearTimeout(pressTimer);});
    div.addEventListener('touchmove',function(){clearTimeout(pressTimer);});
    // Also for mouse (desktop/tablet with mouse)
    div.addEventListener('mousedown',function(){
      pressTimer=setTimeout(function(){
        try{
          if(confirm('Aufgabe "'+task.text+'" zuruecksetzen?')){
            delete clState[task.id];
            renderCL();
          }
        }catch(e){}
      },600);
    });
    div.addEventListener('mouseup',function(){clearTimeout(pressTimer);});
    div.addEventListener('mouseleave',function(){clearTimeout(pressTimer);});
  }

  // Zurücksetzen-Button bei erledigten/nd Aufgaben
  if(status==='done'||status==='nd'){
    const resetWrap=document.createElement('div');
    resetWrap.style.cssText='display:flex;justify-content:flex-end;margin-top:7px;padding-top:7px;border-top:1px solid #f0f0f0;';
    const resetBtn=document.createElement('button');
    resetBtn.style.cssText='background:#f4f4f4;border:1.5px solid #ddd;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;color:#666;cursor:pointer;font-family:inherit;';
    resetBtn.textContent='↩ Zurücksetzen';
    resetBtn.onclick=function(e){
      e.stopPropagation();
      delete clState[task.id];
      renderCL();
    };
    resetWrap.appendChild(resetBtn);
    div.appendChild(resetWrap);
  }

  // Action buttons (only if not yet done)
  if(!status){
    const acts=document.createElement('div');acts.className='cl-actions';
    if(task.special){
      const sb=document.createElement('button');sb.className='cl-btn btn-special';
      if(task.special==='backen'){sb.textContent='🔥 Backen starten';sb.onclick=(e)=>{e.stopPropagation();openBacken(task.id);};}
      else if(task.special==='temp'){sb.textContent='🌡️ Temperatur prüfen';sb.style.background='#0369a1';sb.onclick=(e)=>{e.stopPropagation();openTempControl();};}
      else if(task.special==='slush'){sb.textContent='🧊 Reinigung bestätigen';sb.style.background='#7c3aed';sb.onclick=(e)=>{e.stopPropagation();openSlushScreen();};}
      else if(task.special==='inventur'){sb.textContent='📋 Inventur starten';sb.style.background='#0f766e';sb.onclick=(e)=>{e.stopPropagation();openInventurInfo();};}
      else if(task.special==='regal_nachbesserung'){
        sb.textContent='📸 Neues Foto aufnehmen';
        sb.style.background='#dc2626';
        sb.onclick=(e)=>{e.stopPropagation();openRegalNachbesserung(task.regalNachbesserungId);};
      }
      else if(task.special==='regal_nachbesserung'){
        sb.textContent='📸 Neues Foto aufnehmen';sb.style.background='#dc2626';
        sb.onclick=(e)=>{e.stopPropagation();openRegalNachbesserung(task.regalNachbesserungId);};
      }
      else if(task.special==='regalfoto'){sb.textContent='📸 Fotos aufnehmen';sb.style.background='#0f766e';sb.onclick=(e)=>{e.stopPropagation();openRegalFotos();};}
      else if(task.special==='pause'){
        sb.textContent='☕ Pause beendet';sb.style.background='#7c3aed';
        sb.onclick=(e)=>{e.stopPropagation();markDone(task.id);};
      }
      else if(task.special==='ub'){
        sb.textContent='🔄 Übergabe vorbereiten';sb.style.background='#0f3460';
        sb.onclick=(e)=>{e.stopPropagation();startUbergabe();};
      }
      else{
        sb.textContent='✅ Erledigt';sb.style.background='#16a34a';
        sb.onclick=(e)=>{e.stopPropagation();markDone(task.id);};
      }
      acts.appendChild(sb);
    } else {
      const db=document.createElement('button');db.className='cl-btn btn-done';db.textContent='✅ Erledigt';
      db.onclick=(e)=>{e.stopPropagation();markDone(task.id);};acts.appendChild(db);
      const nb=document.createElement('button');nb.className='cl-btn btn-nd';nb.textContent='❌ Nicht erledigt';
      nb.onclick=(e)=>{e.stopPropagation();showReasons(task.id);};acts.appendChild(nb);
    }
    div.appendChild(acts);
  }

  // Reason picker (shown when nd selected but reason not yet picked)
  if(status==='picking'){
    const rw=document.createElement('div');rw.className='reason-wrap';
    const rl=document.createElement('div');rl.className='reason-label';rl.textContent='Bitte Begründung wählen:';rw.appendChild(rl);
    const rg=document.createElement('div');rg.className='reason-grid';
    reasons.forEach(r=>{
      const rb=document.createElement('button');rb.className='reason-btn';rb.textContent=r;
      rb.onclick=(e)=>{e.stopPropagation();markND(task.id,r);};rg.appendChild(rb);
    });
    rw.appendChild(rg);div.appendChild(rw);
  }
  return div;
}

function markDone(id){
  const ts=nowStr();
  clState[id]={status:'done',who:st.name,ts};
  // clState persistent speichern
  lsSave('clState', clState);
  fbSave('clState', clState);
  const taskObj = getMyTasks().find(function(t){return t.id===id;});
  const taskText = taskObj ? taskObj.text : id;
  history.push({ts:new Date().toLocaleString('de-DE'),name:st.name,taskText:taskText,done:true,schicht:slbls[st.schicht],bereich:st.bereich,startTime:''});
  lsSave('history',history);
  if(id.startsWith('wt_')){weeklyCheckState[id]={status:'done',who:st.name,ts};lsSave('weeklyCheckState',weeklyCheckState);}
  // Save once-per-day
  const myTask=getMyTasks().find(t=>t.id===id);
  if(myTask&&myTask.oncePerDay){
    const doneKey=id+'_'+new Date().toISOString().slice(0,10);
    onceDoneToday[doneKey]={who:st.name,ts};
    lsSave('onceDoneToday',onceDoneToday);
  }
  renderCL();
}

function showReasons(id){
  clState[id]={status:'picking'};
  renderCL();
  // Scroll to item
  setTimeout(function(){try{const el=document.getElementById('clr-'+id);if(el)el.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){}},100);
}

function markND(id,reason){
  const ts=nowStr();
  clState[id]={status:'nd',who:st.name,ts,reason};
  const taskObj = getMyTasks().find(t=>t.id===id);
  const taskText = taskObj ? taskObj.text : id;
  history.push({ts:new Date().toLocaleString('de-DE'),name:st.name,taskText,done:false,reason,schicht:slbls[st.schicht],bereich:st.bereich,startTime:st.startTime});
  lsSave('history',history);
  if(id.startsWith('wt_')){weeklyCheckState[id]={status:'nd',who:st.name,ts,reason};lsSave('weeklyCheckState',weeklyCheckState);}
  renderCL();
}

function checkEscalations(myTasks){
  // Tasks marked nd = potential escalation for SL
  const ndTasks=myTasks.filter(t=>clState[t.id]&&clState[t.id].status==='nd');
  updateSLBadge();
}

// ═══════════════════════════════════════════
// REGALFOTOS (Mittelschicht → SL → Spätschicht)
// ═══════════════════════════════════════════
function getTodayRegalGruppe() {
  const dow = new Date().getDay(); // 0=So
  return REGAL_GRUPPEN.find(function(g){ return g.day === dow; }) || REGAL_GRUPPEN[0];
}

function openRegalFotos() {
  renderRegalFotoScreen();
  go('s-regal');
}

function renderRegalFotoScreen() {
  const body = document.getElementById('regal-body');
  if(!body) return;
  body.innerHTML = '';
  const gruppe = getTodayRegalGruppe();
  const today = new Date().toISOString().slice(0,10);
  const existing = regalFotos.filter(function(f){ return f.datum===today; });

  // Header
  const hdr = document.createElement('div');
  hdr.style.cssText = 'background:#0f766e;border-radius:12px;padding:13px 14px;margin-bottom:12px;color:#fff;';
  hdr.innerHTML = '<div style="font-size:11px;opacity:.7;margin-bottom:3px;">Heute · '+gruppe.label+'</div>'+
    '<div style="font-size:13px;font-weight:700;">'+gruppe.items.length+' Bereiche aufzunehmen</div>';
  body.appendChild(hdr);

  // Fortschritt
  const done = gruppe.items.filter(function(item){
    return existing.find(function(f){ return f.bereich===item && f.dataUrl; });
  }).length;
  const progDiv = document.createElement('div');
  progDiv.style.cssText = 'background:#e0f2f1;border-radius:10px;padding:8px 12px;margin-bottom:12px;font-size:12px;font-weight:700;color:#0f766e;';
  progDiv.textContent = done+' / '+gruppe.items.length+' Fotos aufgenommen'+(done===gruppe.items.length?' ✅':'');
  body.appendChild(progDiv);

  gruppe.items.forEach(function(item) {
    const foto = existing.find(function(f){ return f.bereich===item && f.dataUrl; });
    const card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:11px;padding:12px 14px;margin-bottom:8px;box-shadow:0 1px 6px rgba(0,0,0,.06);';

    const title = document.createElement('div');
    title.style.cssText = 'font-size:13px;font-weight:700;margin-bottom:8px;';
    title.textContent = '📷 '+item;
    card.appendChild(title);

    if(foto) {
      // Foto vorhanden – anzeigen
      const img = document.createElement('img');
      img.src = foto.dataUrl;
      img.style.cssText = 'width:100%;border-radius:8px;margin-bottom:6px;max-height:160px;object-fit:cover;display:block;';
      card.appendChild(img);
      const col = foto.slStatus==='ok'?'#16a34a':foto.slStatus==='schlecht'?'#ef4444':'#888';
      const lbl = foto.slStatus==='ok'?'✅ In Ordnung':foto.slStatus==='schlecht'?'❌ Schlecht':'⏳ Ausstehend';
      const status = document.createElement('div');
      status.style.cssText = 'font-size:11px;font-weight:700;color:'+col+';';
      status.textContent = lbl;
      card.appendChild(status);
      // Nochmal aufnehmen
      const retakeBtn = document.createElement('button');
      retakeBtn.style.cssText = 'margin-top:6px;background:#f0fdf4;border:1px solid #0f766e;border-radius:8px;padding:7px 12px;font-size:11px;font-weight:700;color:#0f766e;cursor:pointer;font-family:inherit;';
      retakeBtn.textContent = '🔄 Neu aufnehmen';
      const retakeInput = document.createElement('input');
      retakeInput.type = 'file'; retakeInput.accept = 'image/*'; retakeInput.setAttribute('capture','environment');
      retakeInput.style.display = 'none';
      retakeInput.addEventListener('change', (function(i){ return function(){ handleRegalFoto(this, i); }; })(item));
      retakeBtn.addEventListener('click', function(){ retakeInput.click(); });
      card.appendChild(retakeBtn);
      card.appendChild(retakeInput);
    } else {
      // Kein Foto – Upload-Button
      const label = document.createElement('label');
      label.style.cssText = 'display:block;width:100%;background:#f0fdf4;border:2px dashed #0f766e;border-radius:10px;padding:18px;text-align:center;cursor:pointer;font-size:13px;font-weight:700;color:#0f766e;box-sizing:border-box;';
      label.textContent = '📸 Foto aufnehmen';
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.setAttribute('capture', 'environment');
      fileInput.style.display = 'none';
      fileInput.addEventListener('change', (function(i){ return function(){ handleRegalFoto(this, i); }; })(item));
      label.appendChild(fileInput);
      card.appendChild(label);
    }
    body.appendChild(card);
  });

  // Alle fertig → Task als erledigt markieren
  if(done === gruppe.items.length && done > 0) {
    const doneDiv = document.createElement('div');
    doneDiv.style.cssText = 'background:#dcfce7;border-radius:12px;padding:14px;text-align:center;margin-top:8px;';
    doneDiv.innerHTML = '<div style="font-size:15px;font-weight:800;color:#16a34a;">✅ Alle Fotos aufgenommen!</div>'+
      '<div style="font-size:12px;color:#16a34a;margin-top:4px;">Aufgabe wird als erledigt markiert.</div>';
    body.appendChild(doneDiv);
    // Regalfoto-Task in Checkliste als done markieren
    const regalTask = getMyTasks().find(function(t){ return t.special==='regalfoto'; });
    if(regalTask && (!clState[regalTask.id] || clState[regalTask.id].status !== 'done')) {
      markDone(regalTask.id);
    }
  }
}

function handleRegalFoto(input, bereich) {
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const gruppe = getTodayRegalGruppe();
    const today = new Date().toISOString().slice(0,10);
    // Entferne altes Foto für diesen Bereich heute
    regalFotos = regalFotos.filter(function(f){ return !(f.datum===today && f.bereich===bereich); });
    regalFotos.push({
      id:'rf'+Date.now(), ts:new Date().toLocaleString('de-DE'),
      datum:today, day:gruppe.day, group:gruppe.day, groupLabel:gruppe.label,
      bereich:bereich, ma:st.name, dataUrl:dataUrl, slStatus:'', slKommentar:'', slTs:''
    });
    lsSave('regalFotos', regalFotos);
    fbSave('regalFotos', regalFotos);
    renderRegalFotoScreen();
    // Notification an SL
    updateSLBadge();
  };
  reader.readAsDataURL(file);
}

function renderSLRegalBewertung() {
  const pane = document.getElementById('sl-regal-pane');
  if(!pane) return;
  pane.innerHTML = '';
  const today = new Date().toISOString().slice(0,10);
  const todayFotos = regalFotos.filter(function(f){ return f.datum===today; });
  const pending = todayFotos.filter(function(f){ return !f.slStatus; });

  const titel = document.createElement('div');
  titel.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:10px;';
  titel.textContent = '📸 Regalfotos bewerten';
  pane.appendChild(titel);

  if(!todayFotos.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'background:#f5f5f5;border-radius:10px;padding:14px;font-size:13px;color:#aaa;text-align:center;';
    empty.textContent = 'Noch keine Fotos für heute';
    pane.appendChild(empty);
  } else {
    if(pending.length) {
      const pendDiv = document.createElement('div');
      pendDiv.style.cssText = 'font-size:12px;font-weight:700;color:#f59e0b;margin-bottom:8px;';
      pendDiv.textContent = '⏳ '+pending.length+' Fotos ausstehend';
      pane.appendChild(pendDiv);
    }
    todayFotos.forEach(function(f) {
      const card = document.createElement('div');
      card.style.cssText = 'background:#fff;border-radius:11px;padding:12px;margin-bottom:8px;box-shadow:0 1px 5px rgba(0,0,0,.06);';
      const title = document.createElement('div');
      title.style.cssText = 'font-size:12px;font-weight:800;margin-bottom:4px;';
      title.textContent = f.bereich;
      card.appendChild(title);
      const meta = document.createElement('div');
      meta.style.cssText = 'font-size:11px;color:#888;margin-bottom:6px;';
      meta.textContent = '📷 '+f.ma+' · '+f.ts;
      card.appendChild(meta);
      if(f.dataUrl) {
        const img = document.createElement('img');
        img.src = f.dataUrl;
        img.style.cssText = 'width:100%;border-radius:8px;margin-bottom:8px;max-height:150px;object-fit:cover;display:block;';
        card.appendChild(img);
      }
      if(!f.slStatus) {
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
        const okBtn = document.createElement('button');
        okBtn.style.cssText = 'background:#dcfce7;border:none;border-radius:8px;padding:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;color:#15803d;touch-action:manipulation;';
        okBtn.textContent = '✓ In Ordnung';
        const schlechtBtn = document.createElement('button');
        schlechtBtn.style.cssText = 'background:#fee2e2;border:none;border-radius:8px;padding:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;color:#dc2626;touch-action:manipulation;';
        schlechtBtn.textContent = '✗ Schlecht';
        okBtn.addEventListener('click', (function(fid){ return function(){ bewerteRegal(fid,'ok'); }; })(f.id));
        schlechtBtn.addEventListener('click', (function(fid){ return function(){ bewerteRegalSchlecht(fid); }; })(f.id));
        btnRow.appendChild(okBtn); btnRow.appendChild(schlechtBtn);
        card.appendChild(btnRow);
      } else {
        const col = f.slStatus==='ok'?'#16a34a':'#ef4444';
        const statusDiv = document.createElement('div');
        statusDiv.style.cssText = 'font-size:12px;font-weight:700;color:'+col+';';
        statusDiv.textContent = f.slStatus==='ok'?'✅ In Ordnung':'❌ Schlecht';
        card.appendChild(statusDiv);
        if(f.slKommentar) {
          const komDiv = document.createElement('div');
          komDiv.style.cssText = 'font-size:11px;color:#888;margin-top:3px;';
          komDiv.textContent = f.slKommentar;
          card.appendChild(komDiv);
        }
      }
      pane.appendChild(card);
    });
  }
  // Archiv und Nachbesserungen anhängen
  renderSLRegalArchiv();
}

function bewerteRegal(id, status) {
  const idx = regalFotos.findIndex(function(f){ return f.id===id; });
  if(idx===-1) return;
  regalFotos[idx].slStatus = status;
  regalFotos[idx].slTs = new Date().toLocaleString('de-DE');
  lsSave('regalFotos', regalFotos); fbSave('regalFotos', regalFotos);
  renderSLRegalBewertung();
}

function bewerteRegalSchlecht(id) {
  // Overlay statt prompt()
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:700;display:flex;align-items:center;justify-content:center;padding:20px;';
  const box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:16px;padding:20px;width:100%;max-width:360px;';
  box.innerHTML =
    '<div style="font-size:16px;font-weight:900;color:#dc2626;margin-bottom:8px;">❌ Regal: Schlecht</div>'+
    '<div style="font-size:13px;color:#666;margin-bottom:10px;">Was muss der nächste Mitarbeiter tun?</div>'+
    '<textarea id="regal-weisung" rows="3" placeholder="z.B. Regal neu einräumen, Preisschilder korrigieren..." style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:10px;font-size:14px;font-family:inherit;outline:none;margin-bottom:12px;box-sizing:border-box;resize:none;"></textarea>';
  const okBtn = document.createElement('button');
  okBtn.style.cssText = 'width:100%;background:#dc2626;color:#fff;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:8px;touch-action:manipulation;';
  okBtn.textContent = '📤 Aufgabe erstellen';
  okBtn.addEventListener('click', function(){
    const weisung = (document.getElementById('regal-weisung')||{}).value||'';
    if(!weisung.trim()){ alert('Bitte eine Anweisung eingeben.'); return; }
    document.body.removeChild(ov);
    const idx = regalFotos.findIndex(function(f){ return f.id===id; });
    if(idx===-1) return;
    regalFotos[idx].slStatus = 'schlecht';
    regalFotos[idx].slKommentar = weisung;
    regalFotos[idx].slTs = new Date().toLocaleString('de-DE');
    lsSave('regalFotos', regalFotos); fbSave('regalFotos', regalFotos);
    // Nachbesserungsauftrag: erscheint bei nächstem Nicht-Bake-Off MA
    const heute = new Date().toISOString().slice(0,10);
    const bereich = regalFotos[idx].bereich;
    const nb = {
      id: 'rn'+Date.now(),
      fotoId: id,
      bereich: bereich,
      weisung: weisung,
      datum: heute,
      status: 'offen',
      fotos: [{
        id: id,
        dataUrl: regalFotos[idx].dataUrl,
        ma: regalFotos[idx].ma,
        ts: regalFotos[idx].ts
      }],
      verlauf: [{ts:new Date().toLocaleString('de-DE'), aktion:'abgelehnt', kommentar:weisung}]
    };
    regalNachbesserungen.push(nb);
    lsSave('regalNachbesserungen','ubAblehnungsGruende', regalNachbesserungen);
    fbSave('regalNachbesserungen','ubAblehnungsGruende', regalNachbesserungen);
    renderSLRegalBewertung();
  });
  const abbrBtn = document.createElement('button');
  abbrBtn.style.cssText = 'width:100%;background:none;border:none;color:#888;font-size:12px;cursor:pointer;font-family:inherit;touch-action:manipulation;';
  abbrBtn.textContent = 'Abbrechen';
  abbrBtn.addEventListener('click', function(){ document.body.removeChild(ov); });
  box.appendChild(okBtn); box.appendChild(abbrBtn);
  ov.appendChild(box); document.body.appendChild(ov);
  setTimeout(function(){ const t=document.getElementById('regal-weisung'); if(t) t.focus(); }, 80);
}

function calcRegalQuote(tage) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - tage);
  const relevant = regalFotos.filter(function(f){ return f.slStatus && new Date(f.datum) >= cutoff; });
  if(!relevant.length) return null;
  const ok = relevant.filter(function(f){ return f.slStatus==='ok'; }).length;
  return Math.round(ok / relevant.length * 100);
}

// ═══════════════════════════════════════════
// BACKEN
// ═══════════════════════════════════════════
function openBacken(parentId){
  bkParentId=parentId;
  // Schnellmodus: wenn SL für diesen MA freigeschaltet
  if(st.name && backenFreigaben[st.name]) {
    if(confirm('Schnellmodus aktiv! Alle Backschritte als erledigt markieren?')) {
      backenTasks.forEach(bt=>{ bkState[bt.id]=true; });
      markDone(bkParentId);
      return;
    }
  }
  bkState={};renderBK();go('s-backen');
}

function renderBK(){
  const body=document.getElementById('bk-body');if(!body)return;body.innerHTML='';
  // Schnellmodus-Hinweis
  if(st.name && backenFreigaben[st.name]) {
    const hint=document.createElement('div');
    hint.style.cssText='background:#fef9c3;border-radius:10px;padding:10px 13px;margin:8px 16px;font-size:12px;font-weight:700;color:#92400e;';
    hint.innerHTML='⚡ Schnellmodus freigeschaltet – du kannst die Schritte einzeln oder alle auf einmal bestätigen';
    body.appendChild(hint);
    const allBtn=document.createElement('button');
    allBtn.style.cssText='width:calc(100% - 32px);margin:0 16px 10px;background:#b45309;color:#fff;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;';
    allBtn.textContent='⚡ Alle Schritte erledigt';
    allBtn.onclick=()=>{ backenTasks.forEach(bt=>{ bkState[bt.id]=true; }); markDone(bkParentId); go('s-cl'); };
    body.appendChild(allBtn);
  }
  backenTasks.forEach(t=>{
    const done=!!bkState[t.id];
    const row=document.createElement('div');row.className='cl-row'+(done?' done-row':'');
    const top=document.createElement('div');top.className='cl-top';
    const cb=document.createElement('div');cb.className='cl-cb';cb.innerHTML=done?'✓':'';
    const txt=document.createElement('div');txt.className='cl-txt';txt.textContent=t.text;
    if(t.warn){const w=document.createElement('div');w.className='cl-warn-txt';w.textContent=t.warn;txt.appendChild(w);}
    top.appendChild(cb);top.appendChild(txt);
    if(!done){
      const acts=document.createElement('div');acts.className='cl-actions';
      const db=document.createElement('button');db.className='cl-btn btn-done';db.textContent='✅ Erledigt';
      db.onclick=(e)=>{e.stopPropagation();bkState[t.id]=true;renderBK();
        if(backenTasks.every(bt=>bkState[bt.id])){setTimeout(function(){try{markDone(bkParentId);go('s-cl');}catch(e){}},600);}
      };acts.appendChild(db);row.appendChild(top);row.appendChild(acts);
    } else {row.appendChild(top);}
    body.appendChild(row);
  });
  const done=backenTasks.filter(t=>bkState[t.id]).length;
  $style('bk-prog', 'width', Math.round(done/backenTasks.length*100)+'%');
}

// ═══════════════════════════════════════════
// PERSÖNLICHE SL-AUFGABEN
// ═══════════════════════════════════════════
function getTodayPersAufgaben(name) {
  const today = new Date().toISOString().slice(0,10);
  return persAufgaben.filter(function(a){
    // Nur Aufgaben von heute oder zukünftig und noch offen
    return a.ma === name && a.datum >= today && a.status === 'offen';
  });
}

function renderPersAufgaben(body) {
  const aufg = getTodayPersAufgaben(st.name);
  if(!aufg.length) return;
  const sec = document.createElement('div'); sec.className = 'cl-sec';
  sec.innerHTML = '<span class="cl-tbadge" style="background:#c2410c;">📌</span>Aufgaben vom Schichtleiter';
  body.appendChild(sec);
  aufg.forEach(function(a) {
    const row = document.createElement('div');
    const done = a.status === 'erledigt';
    row.className = 'cl-row' + (done ? ' done-row' : ' warn-row');
    row.style.cssText = 'border-left:4px solid #c2410c;';
    const top = document.createElement('div'); top.className = 'cl-top';
    const cb = document.createElement('div'); cb.className = 'cl-cb';
    cb.innerHTML = done ? '✓' : '📌';
    const txt = document.createElement('div'); txt.className = 'cl-txt';
    txt.textContent = a.text;
    if(a.priority==='dringend'){const w=document.createElement('div');w.className='cl-warn-txt';w.textContent='⚠️ Dringend';txt.appendChild(w);}
    top.appendChild(cb); top.appendChild(txt); row.appendChild(top);
    if(!done) {
      const acts = document.createElement('div'); acts.className = 'cl-actions';
      const db = document.createElement('button'); db.className = 'cl-btn btn-done'; db.textContent = '✅ Erledigt';
      db.onclick = (function(id){ return function(e){ e.stopPropagation();
        const idx = persAufgaben.findIndex(function(x){return x.id===id;});
        if(idx!==-1){ persAufgaben[idx].status='erledigt'; persAufgaben[idx].erledigt_ts=new Date().toLocaleString('de-DE'); }
        lsSave('persAufgaben', persAufgaben); fbSave('persAufgaben', persAufgaben);
        // Als erledigt in der Checkliste markieren
        clState['pers_'+a.id] = {status:'done', who:st.name, ts:new Date().toLocaleString('de-DE')};
        lsSave('clState', clState);
        renderCL();
      };})(a.id);
      acts.appendChild(db); row.appendChild(acts);
    }
    body.appendChild(row);
  });
}

function renderSLPersAufgaben() {
  const pane = document.getElementById('sl-pers-aufg-pane');
  if(!pane) return;
  pane.innerHTML = '';
  const today = new Date().toISOString().slice(0,10);

  // ── Titel ──
  const titel = document.createElement('div');
  titel.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:10px;';
  titel.textContent = '📌 Aufgabe zuteilen';
  pane.appendChild(titel);

  // ── Formular-Card ──
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:14px;';

  // MA + Datum
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;';

  const maDiv = document.createElement('div');
  maDiv.innerHTML = '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">Mitarbeiter</label>';
  const maSel = document.createElement('select');
  maSel.id = 'pa-ma';
  maSel.style.cssText = 'width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:13px;font-family:inherit;outline:none;';
  (names&&names.length?names:['(Keine Mitarbeiter)']).forEach(function(n){ const o=document.createElement('option');o.value=n;o.textContent=n;maSel.appendChild(o); });
  if(!names||!names.length){ maSel.disabled=true; maSel.title='Bitte zuerst Mitarbeiter unter Admin anlegen.'; }
  maDiv.appendChild(maSel);

  const datDiv = document.createElement('div');
  datDiv.innerHTML = '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">Datum</label>';
  const datInp = document.createElement('input');
  datInp.type = 'date'; datInp.id = 'pa-datum'; datInp.value = today;
  datInp.style.cssText = 'width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:13px;font-family:inherit;outline:none;';
  datDiv.appendChild(datInp);

  grid.appendChild(maDiv); grid.appendChild(datDiv); card.appendChild(grid);

  // Aufgabe Text
  const txtLbl = document.createElement('label');
  txtLbl.style.cssText = 'font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;';
  txtLbl.textContent = 'Aufgabe';
  card.appendChild(txtLbl);
  const txtInp = document.createElement('input');
  txtInp.type = 'text'; txtInp.id = 'pa-text';
  txtInp.placeholder = 'z.B. Lagerbereich aufräumen – Ware kommt heute';
  txtInp.style.cssText = 'width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:13px;font-family:inherit;outline:none;margin-bottom:8px;';
  card.appendChild(txtInp);

  // Priorität
  const prioLbl = document.createElement('label');
  prioLbl.style.cssText = 'font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;';
  prioLbl.textContent = 'Priorität';
  card.appendChild(prioLbl);
  const prioSel = document.createElement('select');
  prioSel.id = 'pa-prio';
  prioSel.style.cssText = 'width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:13px;font-family:inherit;outline:none;margin-bottom:10px;';
  [['normal','Normal'],['dringend','⚠️ Dringend']].forEach(function(o){
    const opt=document.createElement('option');opt.value=o[0];opt.textContent=o[1];prioSel.appendChild(opt);
  });
  card.appendChild(prioSel);

  // Button
  const btn = document.createElement('button');
  btn.style.cssText = 'width:100%;background:#c2410c;color:#fff;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;';
  btn.textContent = '📌 Aufgabe zuteilen';
  btn.addEventListener('click', function() { addPersAufgabe(); });
  card.appendChild(btn);
  pane.appendChild(card);

  // ── Heutige Aufgaben Liste ──
  const listTitel = document.createElement('div');
  listTitel.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;';
  const heute = persAufgaben.filter(function(a){return a.datum>=new Date(Date.now()-7*24*60*60*1000).toISOString().slice(0,10);}).sort(function(a,b){return b.datum<a.datum?-1:1;});
  listTitel.textContent = 'Heutige Aufgaben (' + heute.length + ')';
  pane.appendChild(listTitel);

  if(!heute.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:13px;color:#ccc;text-align:center;padding:16px;';
    empty.textContent = 'Noch keine Aufgaben für heute';
    pane.appendChild(empty);
  } else {
    heute.forEach(function(a) {
      const col = a.status==='erledigt'?'#16a34a':'#c2410c';
      const row = document.createElement('div');
      row.style.cssText = 'background:#fff;border-radius:10px;padding:11px 13px;margin-bottom:7px;box-shadow:0 1px 5px rgba(0,0,0,.06);border-left:3px solid '+col+';';
      row.innerHTML =
        '<div style="font-size:13px;font-weight:700;">'+a.ma+'</div>'+
        '<div style="font-size:12px;color:#444;margin-top:2px;">'+a.text+'</div>'+
        '<div style="display:flex;justify-content:space-between;margin-top:4px;">'+
          '<div style="font-size:11px;color:#888;">'+(a.priority==='dringend'?'⚠️ Dringend':'Normal')+'</div>'+
          '<div style="font-size:11px;font-weight:700;color:'+col+';">'+(a.status==='erledigt'?'✅ Erledigt':'⏳ Offen')+'</div>'+
        '</div>'+
        (a.erledigt_ts?'<div style="font-size:10px;color:#ccc;margin-top:2px;">Erledigt: '+a.erledigt_ts+'</div>':'');
      // Löschen-Button
      if(a.status !== 'erledigt') {
        const del = document.createElement('button');
        del.style.cssText = 'margin-top:7px;background:#fee2e2;border:none;border-radius:7px;padding:5px 10px;font-size:11px;font-weight:700;color:#dc2626;cursor:pointer;font-family:inherit;';
        del.textContent = '🗑 Löschen';
        del.addEventListener('click', (function(id){ return function(){
          const idx=persAufgaben.findIndex(function(x){return x.id===id;});
          if(idx!==-1) persAufgaben.splice(idx,1);
          lsSave('persAufgaben',persAufgaben); fbSave('persAufgaben',persAufgaben);
          renderSLPersAufgaben();
        };})(a.id));
        row.appendChild(del);
      }
      pane.appendChild(row);
    });
  }
}

function addPersAufgabe() {
  const maSel = document.getElementById('pa-ma');
  const datInp = document.getElementById('pa-datum');
  const txtInp = document.getElementById('pa-text');
  const prioSel = document.getElementById('pa-prio');
  if(!maSel||!datInp||!txtInp||!prioSel) { alert('Formular nicht gefunden. Bitte Tab neu öffnen.'); return; }
  const ma = maSel.value;
  const datum = datInp.value;
  const text = txtInp.value.trim();
  const priority = prioSel.value;
  if(!text) { alert('Bitte Aufgabe eingeben.'); return; }
  if(!datum) { alert('Bitte Datum eingeben.'); return; }
  const entry = { id:'pa'+Date.now(), ts:new Date().toLocaleString('de-DE'), ma:ma, datum:datum, text:text, priority:priority, status:'offen' };
  persAufgaben.push(entry);
  lsSave('persAufgaben', persAufgaben);
  fbSave('persAufgaben', persAufgaben);
  mitarbeiterNachrichten.push({ts:entry.ts, name:ma, text:'📌 Neue Aufgabe vom Schichtleiter: '+text+(priority==='dringend'?' (DRINGEND!)':''), schicht:'–', gelesen:false});
  lsSave('mitNachrichten', mitarbeiterNachrichten);
  fbSave('mitNachrichten', mitarbeiterNachrichten);
  updateSLBadge();
  renderSLPersAufgaben();
  showSaveAnimation(function(){ renderSLPersAufgaben(); });
}

