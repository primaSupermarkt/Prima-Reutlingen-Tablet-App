// ═══════════════════════════════════════════════════════════════
// ADMIN.JS
// Admin-Bereich: Passwörter, Aufgaben-Editor, Namen, Infos
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════
function askAdmin(){
  pwTarget='admin';
  $set('pw-inp', 'value', '');
  $style('pw-err', 'display', 'none');
  openOv('ov-pw');
}

function checkPw(){
  const disp=document.getElementById('pw-pin-display');
  const val=disp?disp.getAttribute('data-pin')||'':'';
  if(pwTarget==='admin'&&val===ADMIN_PW){pwPinReset();closeOv('ov-pw');renderAdmin();go('s-admin');}
  else if(pwTarget==='sl'&&val===SL_PW){pwPinReset();closeOv('ov-pw');renderSL();go('s-sl');}
  else{$style('pw-err','display','block');if(disp){disp.setAttribute('data-pin','');disp.textContent='';}}
}

function pwPinReset(){
  const disp=document.getElementById('pw-pin-display');
  if(disp){
    disp.setAttribute('data-pin','');
    disp.style.color='#bbb';
    disp.innerHTML='&#9679;&#9679;&#9679;&#9679;';
  }
  $style('pw-err','display','none');
}

function renderAdmin(){
  const body=document.getElementById('admin-body');if(!body)return;body.innerHTML='';

  function mkAdd(txt,fn){const b=document.createElement('button');b.className='a-add';b.textContent=txt;b.onclick=fn;body.appendChild(b);}

  // Mitarbeiter
  mkSec('👥 Mitarbeiter');
  const nc=document.createElement('div');nc.className='a-card';
  const nw=document.createElement('div');nw.style.cssText='display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;';
  names.forEach((n,i)=>{
    const tag=document.createElement('div');tag.className='name-tag';tag.innerHTML=n; const xb=document.createElement('button');xb.className='name-x';xb.textContent='×';(function(idx){xb.addEventListener('click',function(e){e.stopPropagation();delItem('name',idx);});})(i);tag.appendChild(xb);nw.appendChild(tag);
  });
  nc.appendChild(nw);body.appendChild(nc);
  mkAdd('+ Mitarbeiter hinzufügen',()=>{$set('an-inp', 'value', '');openOv('ov-add-name');});

  // Begründungen
  mkSec('💬 Begründungen (bei nicht erledigt)');
  const rc=document.createElement('div');rc.className='a-card';
  reasons.forEach((r,i)=>{
    const row=document.createElement('div');row.className='a-row';
    row.innerHTML='<div class="a-label">'+r+'</div><button class="a-del" onclick="delItem(\'reason\','+i+')">Löschen</button>';
    rc.appendChild(row);
  });
  body.appendChild(rc);
  mkAdd('+ Begründung hinzufügen',()=>{$set('ar-inp', 'value', '');openOv('ov-add-reason');});

  // Aufgaben aus rollenAufgaben anzeigen
  mkSec('✅ Aufgaben pro Rolle');
  const rolLabels2={
    'early_bake':'🥐 Frühschicht – Bake-Off',
    'early_kasse':'🛒 Frühschicht – Kasse',
    'early_regal':'📦 Frühschicht – Regale',
    'early_lager':'🏭 Frühschicht – Lager',
    'mid_kasse':'🛒 Mittelschicht – Kasse',
    'mid_regal':'📦 Mittelschicht – Regale',
    'mid_lager':'🏭 Mittelschicht – Lager',
    'mid_springer':'🔄 Mittelschicht – Springer',
    'late_kasse':'🛒 Spätschicht – Kasse',
    'late_regal':'📦 Spätschicht – Regale',
    'late_lager':'🏭 Spätschicht – Lager',
    'sl':'👔 Schichtleiter'
  };
  const secLabels2={start:'Schichtbeginn',pause1:'Pause 1',pause2:'Pause 2',ende:'Schichtende'};
  const allRolKeys = Object.keys(rolLabels2);
  allRolKeys.forEach(function(k){
    const taskList = k==='sl' ? slTasks : (rollenAufgaben[k]||[]);
    const secWrap=document.createElement('div');secWrap.style.cssText='margin-bottom:6px;';
    const secBtn=document.createElement('button');
    secBtn.style.cssText='width:100%;background:#f4f4f4;border:none;border-radius:10px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;font-family:inherit;font-size:12px;font-weight:700;color:#333;touch-action:manipulation;';
    secBtn.innerHTML='<span>'+(rolLabels2[k]||k)+'</span>'+
      '<span style="display:flex;align-items:center;gap:8px;">'+
        '<span style="background:#e0e0e0;border-radius:10px;padding:2px 8px;font-size:11px;">'+taskList.length+'</span>'+
        '<span id="arrow-'+k+'">▼</span>'+
      '</span>';
    const secBody=document.createElement('div');
    secBody.id='group-'+k; secBody.style.display='none';
    secBtn.addEventListener('click',function(){
      const isOpen=secBody.style.display!=='none';
      secBody.style.display=isOpen?'none':'block';
      const arEl=document.getElementById('arrow-'+k);if(arEl)arEl.textContent=isOpen?'▼':'▲';
    });
    secWrap.appendChild(secBtn);
    const kc=document.createElement('div');kc.className='a-card';kc.style.marginTop='4px';
    taskList.forEach(function(t){
      const isSL=(k==='sl');
      const row=document.createElement('div');row.className='a-row';
      const lbl=document.createElement('div');lbl.style.flex='1';
      const secLabel = isSL ? (t.section||'') : (secLabels2[t.section]||t.section||'');
      lbl.innerHTML='<div class="a-label">'+t.text+'</div>'+
        '<div class="a-sub">'+(isSL?'🕐 '+t.time+' · ':'')+secLabel+'</div>';
      row.appendChild(lbl);
      const bw=document.createElement('div');bw.style.cssText='display:flex;gap:6px;flex-shrink:0;margin-left:8px;align-items:center;';
      const eb=document.createElement('button');
      eb.style.cssText='background:#e8f0fe;border:none;border-radius:7px;padding:5px 10px;font-size:11px;font-weight:700;color:#1a56db;cursor:pointer;font-family:inherit;touch-action:manipulation;';
      eb.textContent='✏️';
      if(isSL){
        (function(id){eb.addEventListener('click',function(e){e.stopPropagation();editSLTask(id);});})(t.id);
      } else {
        (function(rk,tid){eb.addEventListener('click',function(e){e.stopPropagation();openRolleEdit(rk);});})(k,t.id);
      }
      const db=document.createElement('button');db.className='a-del';
      db.style.cssText=(db.style.cssText||'')+'touch-action:manipulation;';
      db.textContent='Löschen';
      if(isSL){
        (function(id){db.addEventListener('click',function(e){e.stopPropagation();delItem('sltask',id);});})(t.id);
      } else {
        (function(rk,tid){db.addEventListener('click',function(e){
          e.stopPropagation();
          const arr=rollenAufgaben[rk]||[];
          const idx=arr.findIndex(function(x){return x.id===tid;});
          if(idx!==-1){arr.splice(idx,1);lsSave('rollenAufgaben',rollenAufgaben);fbSave('rollenAufgaben',rollenAufgaben);renderAdmin();}
        });})(k,t.id);
      }
      bw.appendChild(eb);bw.appendChild(db);row.appendChild(bw);
      kc.appendChild(row);
    });
    // Aufgabe hinzufügen Button
    const addBtn=document.createElement('button');
    addBtn.style.cssText='width:100%;background:#f0f4ff;border:none;border-radius:8px;padding:8px;font-size:12px;font-weight:700;color:#1e3a5f;cursor:pointer;font-family:inherit;margin-top:6px;touch-action:manipulation;';
    addBtn.textContent='+ Aufgabe hinzufügen';
    (function(rk){addBtn.addEventListener('click',function(){openRolleEdit(rk);});})(k);
    kc.appendChild(addBtn);
    secBody.appendChild(kc);
    secWrap.appendChild(secBody);
    body.appendChild(secWrap);
  });

  // Add buttons
  mkAdd('+ Mitarbeiter-Aufgabe hinzufügen',()=>{
    $set('at-time', 'value', '');
    $set('at-section', 'value', '');
    $set('at-text', 'value', '');
    $set('at-warn', 'value', '');
    $set('at-ub', 'checked', false);
    openOv('ov-add-task');
  });
  mkAdd('+ Schichtleiter-Aufgabe hinzufügen',()=>{
    $set('sl-at-time', 'value', '');
    $set('sl-at-section', 'value', '');
    $set('sl-at-text', 'value', '');
    $set('sl-at-warn', 'value', '');
    openOv('ov-add-sl-task');
  });

  // Info-Links
  mkSec('🔗 Info-Links');
  if(infoLinks.length){
    const ic=document.createElement('div');ic.className='a-card';
    infoLinks.forEach((l,i)=>{
      const row=document.createElement('div');row.className='a-row';
      row.innerHTML='<div><div class="a-label">'+l.title+'</div><div class="a-sub">'+l.bereich+' › '+l.sub+'</div></div><button class="a-del" onclick="delItem(\'info\','+i+')">Löschen</button>';
      ic.appendChild(row);
    });
    body.appendChild(ic);
  }
  mkAdd('+ Info-Link hinzufügen',()=>openAddInfo());

  // Wochenaufgaben
  mkSec('📅 Wochenaufgaben');
  const wtCard=document.createElement('div');wtCard.className='a-card';
  const dowLabels=['So','Mo','Di','Mi','Do','Fr','Sa'];
  const schichtLabels2={early:'🌅 Früh',mid:'☀️ Mittel',late:'🌙 Spät',all:'Alle'};
  const bereichLabels={bake:'🥐 Bake-Off',laden:'🛒 Laden',all:'Alle'};
  if(weeklyTasks.length){
    weeklyTasks.forEach(wt=>{
      const row=document.createElement('div');row.className='a-row';
      const lbl=document.createElement('div');lbl.style.flex='1';
      const daysStr=wt.days.map(d=>dowLabels[d]).join(', ');
      lbl.innerHTML='<div class="a-label">'+wt.text+'</div>'+
        '<div class="a-sub">📅 '+daysStr+' · '+(schichtLabels2[wt.schicht]||wt.schicht)+' · '+(bereichLabels[wt.bereich]||wt.bereich)+'</div>';
      row.appendChild(lbl);
      const bw=document.createElement('div');bw.style.cssText='display:flex;gap:6px;flex-shrink:0;margin-left:8px;';
      const eb=document.createElement('button');
      eb.style.cssText='background:#e8f0fe;border:none;border-radius:7px;padding:5px 10px;font-size:11px;font-weight:700;color:#1a56db;cursor:pointer;font-family:inherit;';
      eb.textContent='✏️';
      (function(id){eb.onclick=function(e){e.stopPropagation();editWeeklyTask(id);};})(wt.id);
      const db=document.createElement('button');db.className='a-del';db.textContent='Löschen';
      (function(id){db.onclick=function(e){e.stopPropagation();delItem('weekly',id);};})(wt.id);
      bw.appendChild(eb);bw.appendChild(db);row.appendChild(bw);
      wtCard.appendChild(row);
    });
  } else {
    const empty=document.createElement('div');empty.style.cssText='padding:10px 0;font-size:13px;color:#ccc;text-align:center;';
    empty.textContent='Noch keine Wochenaufgaben';wtCard.appendChild(empty);
  }
  body.appendChild(wtCard);
  mkAdd('+ Wochenaufgabe hinzufügen',()=>{
    $set('wt-text', 'value', '');
    $set('wt-section', 'value', 'Wochenaufgabe');
    $set('wt-time', 'value', '');
    $set('wt-warn', 'value', '');
    $set('wt-schicht', 'value', 'early');
    $set('wt-bereich', 'value', 'laden');
    ['wt-mo','wt-di','wt-mi','wt-do','wt-fr','wt-sa','wt-so'].forEach(id=>{const el=document.getElementById(id);if(el)el.checked=false;});
    openOv('ov-add-weekly');
  });

  // Passwörter
  mkSec('🔒 Passwörter ändern');
  const pwCard=document.createElement('div');pwCard.className='a-card';

  // Admin PW
  const adminPwRow=document.createElement('div');adminPwRow.style.cssText='margin-bottom:12px;';
  adminPwRow.innerHTML='<div class="a-label" style="margin-bottom:6px;">Admin-Passwort</div>'+
    '<div style="display:flex;gap:8px;">'+
    '<input type="password" id="new-admin-pw" placeholder="Neues Passwort" style="flex:1;border:1.5px solid #e0e0e0;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;outline:none;">'+
    '<button onclick="changeAdminPw()" style="background:var(--black);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Ändern</button>'+
    '</div>';
  pwCard.appendChild(adminPwRow);

  // SL PW
  const slPwRow=document.createElement('div');
  slPwRow.innerHTML='<div class="a-label" style="margin-bottom:6px;">Schichtleiter-Passwort</div>'+
    '<div style="display:flex;gap:8px;">'+
    '<input type="password" id="new-sl-pw" placeholder="Neues Passwort" style="flex:1;border:1.5px solid #e0e0e0;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;outline:none;">'+
    '<button onclick="changeSLPw()" style="background:#0f3460;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Ändern</button>'+
    '</div>';
  pwCard.appendChild(slPwRow);

  // Regal-Target
  const targetRow = document.createElement('div');
  targetRow.style.cssText = 'margin-top:12px;';
  targetRow.innerHTML = '<div class="a-label" style="margin-bottom:6px;">&#127919; Regalpflege-Target (%)</div>' +
    '<div style="display:flex;gap:8px;">' +
    '<input type="number" id="regal-target-inp" min="50" max="100" value="'+regalTarget+'" style="flex:1;border:1.5px solid #e0e0e0;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;outline:none;">' +
    '<button onclick="saveRegalTarget()" style="background:#0f766e;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Speichern</button>' +
    '</div>' +
    '<div style="font-size:11px;color:#888;margin-top:4px;">Aktuell: <strong>'+regalTarget+'%</strong> · Empfehlung: 85%+</div>';
  pwCard.appendChild(targetRow);
  body.appendChild(pwCard);

  // Backen-Schnellmodus Freischaltung
  const bakeCard = document.createElement('div'); bakeCard.className = 'a-card';
  body.appendChild(mkSec('&#9889; Backen-Schnellmodus'));
  body.appendChild(bakeCard);
  names.forEach(function(n) {
    const row = document.createElement('div'); row.className = 'a-row';
    const lbl = document.createElement('div'); lbl.style.flex = '1';
    const freigabe = backenFreigaben[n] || false;
    lbl.innerHTML = '<div class="a-label">' + n + '</div><div class="a-sub">' + (freigabe ? '&#9889; Schnellmodus aktiv' : 'Standard (alle Schritte)') + '</div>';
    const btn = document.createElement('button');
    btn.style.cssText = 'background:' + (freigabe ? '#fef3c7' : '#f0fdf4') + ';border:none;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;color:' + (freigabe ? '#92400e' : '#15803d') + ';';
    btn.textContent = freigabe ? 'Freigabe entziehen' : '&#9889; Schnellmodus freigeben';
    (function(name) {
      btn.addEventListener('click', function() {
        backenFreigaben[name] = !backenFreigaben[name];
        lsSave('backenFreigaben', backenFreigaben);
        fbSave('backenFreigaben', backenFreigaben);
        renderAdmin();
      });
    })(n);
    row.appendChild(lbl); row.appendChild(btn); bakeCard.appendChild(row);
  });

  // Schwarzes Brett
  mkSec('📌 Schwarzes Brett');
  const brettCard=document.createElement('div');brettCard.className='a-card';
  schwarzesBrett.forEach((m,i)=>{
    const row=document.createElement('div');row.className='a-row';
    const lbl=document.createElement('div');lbl.style.flex='1';
    lbl.innerHTML='<div class="a-label">'+(m.aktiv?'🟢 ':'🔴 ')+m.text+'</div><div class="a-sub">'+m.ts+(m.bestaetigt?' · '+m.bestaetigt.length+' bestätigt':'')+'</div>';
    row.appendChild(lbl);
    const bw=document.createElement('div');bw.style.cssText='display:flex;gap:6px;flex-shrink:0;';
    const tb=document.createElement('button');
    tb.style.cssText='background:'+(m.aktiv?'#fef3c7':'#dcfce7')+';border:none;border-radius:7px;padding:5px 9px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;color:'+(m.aktiv?'#92400e':'#15803d')+';';
    tb.textContent=m.aktiv?'Deaktivieren':'Aktivieren';
    (function(idx2,m2){tb.onclick=function(){m2.aktiv=!m2.aktiv;lsSave('schwarzesBrett',schwarzesBrett);renderAdmin();};})(i,m);
    const db=document.createElement('button');db.className='a-del';db.textContent='Löschen';
    (function(idx2){db.onclick=function(){schwarzesBrett.splice(idx2,1);lsSave('schwarzesBrett',schwarzesBrett);renderAdmin();};})(i);
    bw.appendChild(tb);bw.appendChild(db);row.appendChild(bw);brettCard.appendChild(row);
  });
  body.appendChild(brettCard);
  const addBrettBtn=document.createElement('button');addBrettBtn.className='a-add';addBrettBtn.textContent='+ Aushang hinzufügen';
  addBrettBtn.onclick=function(){
    const txt=prompt('Text für Schwarzes Brett:');
    if(!txt||!txt.trim())return;
    schwarzesBrett.push({id:'bb'+Date.now(),ts:new Date().toLocaleString('de-DE'),text:txt.trim(),aktiv:true,bestaetigt:[]});
    lsSave('schwarzesBrett',schwarzesBrett);renderAdmin();updateBadges();
  };
  body.appendChild(addBrettBtn);

  // Defektmeldungen
  mkSec('🔧 Defektmeldungen');
  const openDefs=defektMeldungen.filter(d=>d.status==='offen');
  if(openDefs.length){
    const defCard=document.createElement('div');defCard.className='a-card';
    openDefs.forEach((d,i)=>{
      const row=document.createElement('div');row.className='a-row';
      const lbl=document.createElement('div');lbl.style.flex='1';
      lbl.innerHTML='<div class="a-label">🔧 '+d.geraet+'</div><div class="a-sub">'+d.ma+' · '+d.ts+'<br>'+d.beschreibung+'</div>';
      row.appendChild(lbl);
      const rb=document.createElement('button');rb.style.cssText='background:#dcfce7;border:none;border-radius:7px;padding:5px 9px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;color:#15803d;';
      rb.textContent='✅ Erledigt';
      const idx2=defektMeldungen.indexOf(d);
      (function(idx3){rb.onclick=function(){defektMeldungen[idx3].status='erledigt';lsSave('defektMeldungen',defektMeldungen);renderAdmin();updateBadges();};})(idx2);
      row.appendChild(rb);defCard.appendChild(row);
    });
    body.appendChild(defCard);
  } else {
    const nodef=document.createElement('div');nodef.style.cssText='background:#f0fdf4;border-radius:10px;padding:12px;font-size:13px;color:#15803d;font-weight:600;';
    nodef.textContent='✅ Keine offenen Defekte';body.appendChild(nodef);
  }

  // Urlaubsanträge
  mkSec('🌴 Urlaubsanträge');
  const pendingUrlaub=urlaubAntraege.filter(a=>a.status==='ausstehend');
  if(pendingUrlaub.length){
    const urlCard=document.createElement('div');urlCard.className='a-card';
    pendingUrlaub.forEach(a=>{
      const row=document.createElement('div');row.className='a-row';
      const lbl=document.createElement('div');lbl.style.flex='1';
      lbl.innerHTML='<div class="a-label">🌴 '+a.ma+'</div><div class="a-sub">'+a.von+' – '+a.bis+(a.grund?' · '+a.grund:'')+'</div>';
      row.appendChild(lbl);
      const bw=document.createElement('div');bw.style.cssText='display:flex;gap:6px;flex-shrink:0;';
      const ab=document.createElement('button');ab.style.cssText='background:#dcfce7;border:none;border-radius:7px;padding:5px 9px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;color:#15803d;';
      ab.textContent='✅';
      const rb2=document.createElement('button');rb2.style.cssText='background:#fee2e2;border:none;border-radius:7px;padding:5px 9px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;color:#dc2626;';
      rb2.textContent='❌';
      (function(entry){
        ab.onclick=function(){entry.status='genehmigt';lsSave('urlaubAntraege',urlaubAntraege);renderAdmin();};
        rb2.onclick=function(){entry.status='abgelehnt';lsSave('urlaubAntraege',urlaubAntraege);renderAdmin();};
      })(a);
      bw.appendChild(ab);bw.appendChild(rb2);row.appendChild(bw);urlCard.appendChild(row);
    });
    body.appendChild(urlCard);
  } else {
    const nour=document.createElement('div');nour.style.cssText='background:#f0fdf4;border-radius:10px;padding:12px;font-size:13px;color:#15803d;font-weight:600;';
    nour.textContent='✅ Keine ausstehenden Anträge';body.appendChild(nour);
  }

  // Mitarbeiter-Kompetenzen
  mkSec('🎓 Mitarbeiter-Kompetenzen');
  const kompCard=document.createElement('div');kompCard.className='a-card';
  names.forEach(n=>{
    const komp=maKompetenzen[n]||{bake:true};
    const row=document.createElement('div');row.className='a-row';
    const lbl=document.createElement('div');lbl.style.flex='1';
    lbl.innerHTML='<div class="a-label">'+n+'</div>';
    row.appendChild(lbl);
    const cb=document.createElement('label');
    cb.style.cssText='display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;cursor:pointer;';
    const inp=document.createElement('input');inp.type='checkbox';inp.checked=!!komp.bake;inp.style.width='16px';inp.style.height='16px';
    (function(name2){inp.onchange=function(){if(!maKompetenzen[name2])maKompetenzen[name2]={};maKompetenzen[name2].bake=this.checked;lsSave('maKompetenzen',maKompetenzen);};})(n);
    cb.appendChild(inp);cb.appendChild(document.createTextNode('Bake-Off'));
    row.appendChild(cb);kompCard.appendChild(row);
  });
  body.appendChild(kompCard);

  // Historie
  // Export
  mkSec('📤 Daten exportieren');
  const expCard=document.createElement('div');expCard.className='a-card';expCard.style.cssText='padding:12px;display:flex;flex-direction:column;gap:8px;';
  const expBtns=[
    {lbl:'📊 HACCP Temperaturbericht (HTML)',fn:'exportHACCP()'},
    {lbl:'📋 Temperaturen als CSV',fn:'exportCSV()'},
  ];
  expBtns.forEach(b=>{
    const btn=document.createElement('button');
    btn.style.cssText='background:#0f3460;color:#fff;border:none;border-radius:9px;padding:11px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;width:100%;';
    btn.textContent=b.lbl;
    btn.setAttribute('onclick',b.fn);
    expCard.appendChild(btn);
  });
  body.appendChild(expCard);

  mkSec('📊 Historie');
  const hb=document.createElement('button');hb.className='a-add';hb.style.background='#1a1a2e';
  hb.textContent='📊 Alle Einträge anzeigen ('+history.length+')';
  hb.onclick=()=>{renderHist();go('s-hist');};body.appendChild(hb);

  const cb=document.createElement('button');cb.className='a-add';cb.style.cssText='background:#dc2626;margin-top:6px;';
  cb.textContent='🗑️ Historie löschen';
  cb.onclick=()=>{if(confirm('Gesamte Historie löschen?')){history=[];renderAdmin();}};body.appendChild(cb);
}

// ═══════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════
function delItem(type,id){
  pendingDelType=type;pendingDel=id;
  $set('delpw-inp', 'value', '');
  $style('delpw-err', 'display', 'none');
  openOv('ov-del-pw');
}

function checkDelPw(){
  const delDisp=document.getElementById('delpw-inp'); const delVal=delDisp?(delDisp.value!==undefined&&delDisp.tagName==='INPUT'?delDisp.value:delDisp.getAttribute('data-pin')||''):''; if(delVal!==ADMIN_PW){
    $style('delpw-err', 'display', 'block');return;
  }
  closeOv('ov-del-pw');
  if(pendingDelType==='task'){ /* task löschen via rollenAufgaben – TODO */ }
  if(pendingDelType==='sltask')slTasks=slTasks.filter(t=>t.id!==pendingDel);
  if(pendingDelType==='weekly'){weeklyTasks=weeklyTasks.filter(t=>t.id!==pendingDel);lsSave('weeklyTasks',weeklyTasks);}
  if(pendingDelType==='reason')reasons.splice(pendingDel,1);
  if(pendingDelType==='name')names.splice(pendingDel,1);
  if(pendingDelType==='info')infoLinks.splice(pendingDel,1);
  renderAdmin();
}

// ═══════════════════════════════════════════
// ADD
// ═══════════════════════════════════════════
function saveTask(){
  const sk=document.getElementById('at-schicht').value;
  const [schicht,bereich]=sk.split('_');
  const txt=document.getElementById('at-text').value.trim();
  if(!txt)return;
  tasks.push({id:'t'+Date.now(),schicht,bereich,time:document.getElementById('at-time').value||'00:00',section:document.getElementById('at-section').value||'Allgemein',text:txt,warn:document.getElementById('at-warn').value,ub:document.getElementById('at-ub').checked});
  closeOv('ov-add-task');renderAdmin();
}

function saveName(){
  const n=document.getElementById('an-inp').value.trim();if(!n)return;
  names.push(n);closeOv('ov-add-name');renderAdmin();
}

function saveReason(){
  const r=document.getElementById('ar-inp').value.trim();if(!r)return;
  reasons.push(r);closeOv('ov-add-reason');renderAdmin();
}

function updateSubSelect(){
  const bereich=document.getElementById('ai-bereich').value;
  const sel=document.getElementById('ai-sub');
  sel.innerHTML='';
  const cat=infoStruct.find(c=>c.key===bereich);
  if(cat){
    cat.subs.forEach(s=>{
      const opt=document.createElement('option');opt.value=s;opt.textContent=s;sel.appendChild(opt);
    });
  }
}

function openAddInfo(){
  $set('ai-title', 'value', '');
  $set('ai-url', 'value', '');
  $set('ai-bereich', 'value', 'Lager');
  updateSubSelect();
  openOv('ov-add-info');
}

function saveInfo(){
  const title=document.getElementById('ai-title').value.trim();
  const url=document.getElementById('ai-url').value.trim();
  if(!title||!url){alert('Bitte Titel und Link ausfüllen.');return;}
  const bereich=document.getElementById('ai-bereich').value;
  const sub=document.getElementById('ai-sub').value;
  infoLinks.push({id:'i'+Date.now(),bereich,sub,title,url});
  closeOv('ov-add-info');
  renderAdmin();
  renderInfo();
}

function openRolleEdit(key) {
  const labels = {start:'Schichtbeginn',pause1:'Pause 1',pause2:'Pause 2',ende:'Schichtende'};
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:600;display:flex;align-items:center;justify-content:center;padding:12px;';
  const box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:16px;padding:16px;width:100%;max-width:420px;max-height:90vh;overflow-y:auto;';
  const tasks = JSON.parse(JSON.stringify(rollenAufgaben[key]||[]));
  var renderEdit = function(){
    box.innerHTML='';
    const h1=document.createElement('div');h1.style.cssText='font-size:16px;font-weight:800;margin-bottom:12px;';h1.textContent='Aufgaben: '+key;box.appendChild(h1);
    ['start','pause1','pause2','ende'].forEach(function(sec){
      const secLabel={start:'Schichtbeginn',pause1:'Pause 1',pause2:'Pause 2',ende:'Schichtende'};
      const secDiv=document.createElement('div');secDiv.style.cssText='font-size:11px;font-weight:700;text-transform:uppercase;color:#888;margin:10px 0 4px;';secDiv.textContent=secLabel[sec];box.appendChild(secDiv);
      (rollenAufgaben[currentEditRolle]||[]).filter(function(t){return t.section===sec;}).forEach(function(t){
        const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;align-items:center;margin-bottom:4px;';
        const inp=document.createElement('input');inp.type='text';inp.value=t.text;inp.style.cssText='flex:1;border:1px solid #e0e0e0;border-radius:7px;padding:7px;font-size:12px;font-family:inherit;outline:none;';
        inp.addEventListener('input',function(){t.text=this.value;});
        const del=document.createElement('button');del.style.cssText='background:#fee2e2;border:none;border-radius:7px;padding:7px 9px;font-size:11px;color:#dc2626;cursor:pointer;';del.textContent='x';
        del.addEventListener('click',(function(task){return function(){var idx=tasks.indexOf(task);if(idx!==-1)tasks.splice(idx,1);renderEdit();};})(t));
        row.appendChild(inp);row.appendChild(del);box.appendChild(row);
      });
      const addBtn=document.createElement('button');addBtn.style.cssText='background:#f0f4ff;border:none;border-radius:7px;padding:6px 12px;font-size:11px;font-weight:700;color:#1e3a5f;cursor:pointer;margin-bottom:4px;';addBtn.textContent='+ Aufgabe';
      addBtn.addEventListener('click',function(){tasks.push({id:'c'+Date.now(),section:sec,text:'Neue Aufgabe',warn:'',ub:false});renderEdit();});
      box.appendChild(addBtn);
    });
    const saveBtn=document.createElement('button');saveBtn.style.cssText='width:100%;background:#1e3a5f;color:#fff;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;margin-top:12px;';saveBtn.textContent='Speichern';
    saveBtn.addEventListener('click',function(){rollenAufgaben[key]=tasks;lsSave('rollenAufgaben',rollenAufgaben);fbSave('rollenAufgaben',rollenAufgaben);document.body.removeChild(overlay);showSaveAnimation(function(){renderAdmin();});});
    box.appendChild(saveBtn);
    const cancelBtn=document.createElement('button');cancelBtn.style.cssText='width:100%;background:none;border:none;color:#888;font-size:12px;cursor:pointer;margin-top:6px;';cancelBtn.textContent='Abbrechen';
    cancelBtn.addEventListener('click',function(){document.body.removeChild(overlay);});
    box.appendChild(cancelBtn);
  }
  renderEdit();overlay.appendChild(box);document.body.appendChild(overlay);
}

// ═══════════════════════════════════════════
// PASSWORD CHANGE
// ═══════════════════════════════════════════
function changeAdminPw(){
  const val=document.getElementById('new-admin-pw').value.trim();
  if(!val){alert('Bitte neues Passwort eingeben.');return;}
  if(val.length<3){alert('Passwort muss mindestens 3 Zeichen haben.');return;}
  ADMIN_PW=val; lsSave('adminPw',val);
  $set('new-admin-pw', 'value', '');
  alert('✅ Admin-Passwort gespeichert.');
}

function saveRegalTarget() {
  const val = parseInt(document.getElementById('regal-target-inp').value);
  if(isNaN(val)||val<50||val>100){ alert('Bitte einen Wert zwischen 50 und 100 eingeben.'); return; }
  regalTarget = val;
  lsSave('regalTarget', regalTarget);
  fbSave('regalTarget', regalTarget);
  renderAdmin();
  alert('Target gespeichert: '+val+'%');
}

function changeSLPw(){
  const val=document.getElementById('new-sl-pw').value.trim();
  if(!val){alert('Bitte neues Passwort eingeben.');return;}
  if(val.length<3){alert('Passwort muss mindestens 3 Zeichen haben.');return;}
  SL_PW=val; lsSave('slPw',val);
  $set('new-sl-pw', 'value', '');
  alert('✅ Schichtleiter-Passwort gespeichert.');
}


function goInfo(){renderInfo();go('s-info');}
function openInfoUnterkategorie(kat) {
  const body = document.getElementById('info-sub-body');
  const titel = document.getElementById('info-sub-titel');
  if(!body||!titel) return;
  body.innerHTML = '';

  var tile = function(ico, label, sub, onclick) {
    const d = document.createElement('div');
    d.style.cssText = 'background:#fff;border-radius:13px;padding:14px 16px;margin-bottom:9px;box-shadow:0 2px 8px rgba(0,0,0,.06);cursor:pointer;display:flex;align-items:center;gap:14px;';
    d.innerHTML = '<div style="font-size:26px;">'+ico+'</div>'+
      '<div style="flex:1;"><div style="font-size:14px;font-weight:700;">'+label+'</div>'+
      (sub?'<div style="font-size:11px;color:#888;margin-top:2px;">'+sub+'</div>':'')+
      '</div><div style="font-size:16px;color:#ccc;">&#8250;</div>';
    d.addEventListener('click', onclick);
    return d;
  }

  if(kat==='anleitungen') {
    titel.textContent = 'Anleitungen';
    ['Laden','Lager','Technik'].forEach(function(key){
      const cat = infoStruct.find(function(c){return c.key===key;});
      const ico = key==='Laden'?'&#128717;':key==='Lager'?'&#127981;':'&#9881;&#65039;';
      const sub = cat ? cat.subs.slice(0,3).join(' · ')+(cat.subs.length>3?' ...':'') : '';
      body.appendChild(tile(ico, key, sub, function(){openInfoKat(key.toLowerCase());}));
    });
  } else if(kat==='reinigung') {
    titel.textContent = 'Reinigung & Kontrollen';
    [{ico:'&#127777;&#65039;',label:'Temperaturkontrolle',sub:'Kühl- & Tiefkühlgeräte',fn:function(){showInfoChecklist('temp');}},
     {ico:'&#9749;',label:'Kaffeemaschine',sub:'Tägliche Reinigung',fn:function(){showInfoChecklist('kaffeemaschine');}},
     {ico:'&#129482;',label:'Slushmaschine',sub:'Wöchentlich',fn:function(){showInfoChecklist('slush');}},
     {ico:'&#129529;',label:'Bodenmaschine',sub:'Wöchentlich',fn:function(){showInfoChecklist('waschmaschine');}},
    ].forEach(function(t){body.appendChild(tile(t.ico,t.label,t.sub,t.fn));});
  } else if(kat==='formulare') {
    titel.textContent = 'Formulare & Reports';
    body.appendChild(tile('&#128110;','Strafantrag stellen','Formulare · Historie · PDF',function(){openStrafantrag();}));
  }
  go('s-info-sub');
}


function openInfoKat(kat) {
  // Map neue Kategorien auf bestehende infoStruct keys
  const katMap = {
    'laden':    'Laden',
    'lager':    'Lager',
    'technik':  'Technik',
    'sonstiges': null
  };
  const key = katMap[kat];
  const cat = key ? infoStruct.find(function(c){ return c.key === key; }) : null;
  const body = document.getElementById('id-body');
  if(!body) return;
  body.innerHTML = '';
  const lbl = {laden:'🛒 Laden', lager:'🏭 Lager', technik:'⚙️ Technik', sonstiges:'📄 Sonstiges'}[kat]||kat;
  $text('id-lbl', lbl);
  if(cat) {
    cat.subs.forEach(function(sub){
      const links = infoLinks.filter(function(l){ return l.bereich===cat.key&&l.sub===sub; });
      const d = document.createElement('div');
      d.style.cssText = 'background:#fff;border-radius:11px;padding:12px 14px;margin-bottom:8px;box-shadow:0 1px 5px rgba(0,0,0,.06);cursor:pointer;display:flex;justify-content:space-between;align-items:center;';
      d.innerHTML = '<div><div style="font-size:14px;font-weight:700;">'+sub+'</div>'+
        (links.length ? '<div style="font-size:11px;color:#888;margin-top:2px;">'+links.length+' Link'+(links.length>1?'s':'')+'</div>' : '<div style="font-size:11px;color:#ccc;margin-top:2px;">Noch kein Inhalt</div>')+
        '</div><div style="font-size:16px;color:#ccc;">›</div>';
      d.addEventListener('click', function(){ openInfoDetail(cat.key, sub); });
      body.appendChild(d);
    });
  } else {
    // Sonstiges: alle Links ohne Kategorie
    const allLinks = infoLinks.filter(function(l){ return !infoStruct.find(function(c){ return c.key===l.bereich; }); });
    if(!allLinks.length) {
      body.innerHTML = '<div style="text-align:center;padding:40px;color:#ccc;">Noch kein Inhalt</div>';
    } else {
      allLinks.forEach(function(l){
        const card = document.createElement('div');
        card.style.cssText = 'background:#fff;border-radius:11px;padding:12px 14px;margin-bottom:8px;box-shadow:0 1px 5px rgba(0,0,0,.06);';
        card.innerHTML = '<div style="font-size:14px;font-weight:700;">'+l.title+'</div>';
        body.appendChild(card);
      });
    }
  }
  go('s-info-detail');
}

function openStrafantrag() {
  renderStrafantragForm();
  go('s-strafantrag');
}

function renderInfo(){
  const list=document.getElementById('info-list');if(!list)return;list.innerHTML='';
  infoStruct.forEach(cat=>{
    const card=document.createElement('div');card.className='i-card';
    const hdr=document.createElement('div');hdr.className='i-hdr';
    hdr.innerHTML='<div class="i-title"><div class="i-ico">'+cat.ico+'</div><div><div class="i-name">'+cat.key+'</div><div class="i-cnt">'+cat.subs.join(' · ')+'</div></div></div><div class="i-chev">›</div>';
    hdr.addEventListener('click', function(){ card.classList.toggle('open'); });
    const bdy=document.createElement('div');bdy.className='i-body';
    cat.subs.forEach(sub=>{
      const links=infoLinks.filter(l=>l.bereich===cat.key&&l.sub===sub);
      const d=document.createElement('div');d.className='i-sub';
      d.innerHTML=sub+(links.length?'<span style="background:#dcfce7;color:var(--green);border-radius:10px;padding:1px 7px;font-size:10px;font-weight:700;margin-left:7px;">'+links.length+'</span>':'')+'<span style="font-size:13px;color:#ccc;">›</span>';
      d.onclick=()=>openInfoDetail(cat.key,sub);bdy.appendChild(d);
    });
    card.appendChild(hdr);card.appendChild(bdy);list.appendChild(card);
  });
}

function renderStrafantragForm() {
  const body = document.getElementById('strafantrag-body');
  if(!body) return;
  body.innerHTML = '';

  var section = function(title, content) {
    const d = document.createElement('div');
    d.style.cssText = 'background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:12px;';
    d.innerHTML = '<div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1a1a2e;margin-bottom:10px;">'+title+'</div>'+content;
    return d;
  }
  var field = function(label, id, type, placeholder, val) {
    return '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">'+label+'</label>'+
      '<input type="'+type+'" id="sa-'+id+'" value="'+(val||'')+'" placeholder="'+(placeholder||'')+'" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:13px;font-family:inherit;outline:none;margin-bottom:8px;">';
  }

  // ── 1. Tatverdächtige(r) ──
  const ta = sa.ta||{};
  const minderjaehrig = sa.minderjaehrig||false;
  let tvHtml = field('Name', 'tv-name', 'text', '', ta.name) +
    field('Vorname', 'tv-vorname', 'text', '', ta.vorname) +
    field('Geburtsdatum', 'tv-geb', 'date', '', ta.geb) +
    field('Wohnort', 'tv-wohnort', 'text', '', ta.wohnort) +
    field('Straße & Nr.', 'tv-strasse', 'text', '', ta.strasse) +
    field('Nationalität', 'tv-nat', 'text', '', ta.nat) +
    '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:4px;">Personalien festgestellt durch</label>'+
    '<select id="sa-tv-durch" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:13px;font-family:inherit;outline:none;margin-bottom:8px;">'+
      '<option'+(ta.durch==='eigene'?' selected':'')+' value="eigene">Eigene Feststellung</option>'+
      '<option'+(ta.durch==='polizei'?' selected':'')+' value="polizei">Durch die Polizei</option>'+
    '</select>'+
    '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:4px;"><input type="checkbox" id="sa-minderjahrig" '+(minderjaehrig?'checked':'')+' style="margin-right:6px;">Person unter 18 Jahren</label>';

  const sTV = section('👤 Tatverdächtige(r)', tvHtml);
  body.appendChild(sTV);

  // Checkbox Listener
  const mjCb = document.getElementById('sa-minderjahrig');
  if(mjCb) mjCb.addEventListener('change', function(){ sa.minderjaehrig=this.checked; renderStrafantragForm(); });

  // ── Erziehungsberechtigter (nur wenn minderjährig) ──
  if(minderjaehrig) {
    const eb = sa.eb||{};
    const ebHtml = field('Name EB', 'eb-name', 'text', '', eb.name) +
      field('Vorname EB', 'eb-vorname', 'text', '', eb.vorname) +
      field('Wohnort EB', 'eb-wohnort', 'text', '', eb.wohnort) +
      field('Telefon EB', 'eb-tel', 'tel', '', eb.tel);
    body.appendChild(section('👨‍👧 Erziehungsberechtigte(r)', ebHtml));
  }

  // ── 2. Tatort ──
  const tatortHtml = '<div style="background:#f0f4ff;border-radius:8px;padding:10px;font-size:13px;font-weight:700;color:#1e3a5f;margin-bottom:8px;">'+
    firmaConfig.name+'<br>'+firmaConfig.strasse+', '+firmaConfig.plz+' '+firmaConfig.ort+'</div>';
  body.appendChild(section('📍 Tatort', tatortHtml));

  // ── 3. Entwendete Gegenstände ──
  let itemsHtml = '';
  const itemsSec = section('Entwendete Gegenstaende', '');
  const itemsContainer = document.createElement('div');

  // Spalten-Header
  const header = document.createElement('div');
  header.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1.2fr 32px;gap:5px;margin-bottom:4px;';
  header.innerHTML = '<div style="font-size:10px;font-weight:700;color:#888;">Bezeichnung</div>'+
    '<div style="font-size:10px;font-weight:700;color:#888;text-align:center;">Anz.</div>'+
    '<div style="font-size:10px;font-weight:700;color:#888;text-align:right;">Einzelpreis</div>'+
    '<div></div>';
  itemsContainer.appendChild(header);

  var renderItems = function() {
    // Nur Zeilen entfernen, nicht Header
    while(itemsContainer.children.length > 1) itemsContainer.removeChild(itemsContainer.lastChild);
    saItems.forEach(function(item, idx) {
      const row = document.createElement('div');
      row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1.2fr 32px;gap:5px;margin-bottom:5px;align-items:center;';

      const bezInp = document.createElement('input');
      bezInp.type='text'; bezInp.value=item.bez||''; bezInp.placeholder='Bezeichnung';
      bezInp.style.cssText='border:1.5px solid #e0e0e0;border-radius:7px;padding:7px;font-size:12px;font-family:inherit;outline:none;';
      bezInp.addEventListener('input',(function(i){return function(){saItems[i].bez=this.value;};})(idx));

      const anzInp = document.createElement('input');
      anzInp.type='number'; anzInp.value=item.anz||1; anzInp.min=1; anzInp.placeholder='1';
      anzInp.style.cssText='border:1.5px solid #e0e0e0;border-radius:7px;padding:7px;font-size:12px;font-family:inherit;outline:none;text-align:center;';
      anzInp.addEventListener('input',function(){
        saItems[idx].anz=parseInt(this.value)||1;
        updateTotal();
      });

      const preisInp = document.createElement('input');
      preisInp.type='number'; preisInp.value=item.preis||''; preisInp.placeholder='0.00';
      preisInp.style.cssText='border:1.5px solid #e0e0e0;border-radius:7px;padding:7px;font-size:12px;font-family:inherit;outline:none;text-align:right;';
      preisInp.addEventListener('input',function(){
        saItems[idx].preis=parseFloat(this.value)||0;
        saItems[idx].wert=(saItems[idx].anz||1)*saItems[idx].preis;
        updateTotal();
      });

      const delBtn = document.createElement('button');
      delBtn.style.cssText='background:#fee2e2;border:none;border-radius:7px;padding:7px 8px;cursor:pointer;font-size:12px;color:#dc2626;';
      delBtn.textContent='✕';
      delBtn.addEventListener('click',(function(i){return function(){saItems.splice(i,1);renderItems();};})(idx));

      row.appendChild(bezInp); row.appendChild(anzInp); row.appendChild(preisInp); row.appendChild(delBtn);
      itemsContainer.appendChild(row);
    });
    updateTotal();
  }

  var updateTotal = function() {
    const g = saItems.reduce(function(s,i){return s+((i.anz||1)*(i.preis||i.wert||0));},0);
    if(totalDiv) totalDiv.textContent = 'Gesamtwert: '+g.toFixed(2)+' €';
  }

  const addItemBtn = document.createElement('button');
  addItemBtn.style.cssText = 'width:100%;background:#f0f4ff;border:none;border-radius:8px;padding:9px;font-size:13px;font-weight:700;color:#1e3a5f;cursor:pointer;font-family:inherit;margin-top:4px;';
  addItemBtn.textContent = '+ Gegenstand hinzufügen';
  addItemBtn.addEventListener('click', function(){ saItems.push({bez:'',wert:0}); renderItems(); });
  const totalDiv = document.createElement('div');
  totalDiv.style.cssText = 'text-align:right;font-size:14px;font-weight:900;color:#1a1a2e;margin-top:8px;padding-top:8px;border-top:1.5px solid #e0e0e0;';
  totalDiv.textContent = 'Gesamtwert: 0.00 €';

  itemsSec.querySelector('div:last-child').appendChild(itemsContainer);
  itemsSec.querySelector('div:last-child').appendChild(addItemBtn);
  itemsSec.querySelector('div:last-child').appendChild(totalDiv);
  renderItems();
  body.appendChild(itemsSec);

  // ── 4. Strafantrag ──
  const sa_ja = sa.strafantrag !== false;
  const saHtml = '<label style="font-size:13px;font-weight:700;display:block;margin-bottom:8px;"><input type="radio" name="sa-r" value="ja" '+(sa_ja?'checked':'')+' onchange="sa.strafantrag=true"> Ja, ich stelle Strafantrag</label>'+
    '<label style="font-size:13px;font-weight:700;display:block;"><input type="radio" name="sa-r" value="nein" '+(!sa_ja?'checked':'')+' onchange="sa.strafantrag=false"> Nein, kein Strafantrag</label>';
  body.appendChild(section('⚖️ Strafantrag', saHtml));

  // ── 5. Zeugen ──
  const selZeugen = sa.zeugen||[];
  let zeugenHtml = '<div style="margin-bottom:8px;font-size:11px;color:#888;">Mitarbeiter aus Liste auswählen oder eigene Angaben:</div>';
  zeugenHtml += mitarbeiterZeugen.map(function(z,i){
    const sel = selZeugen.find(function(s){return s.id===z.id;});
    return '<label style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:13px;font-weight:600;">'+
      '<input type="checkbox" data-zid="'+z.id+'" '+(sel?'checked':'')+'>'+
      z.vorname+' '+z.name+'</label>';
  }).join('');
  // Checkboxes get listeners after render via delegation
  zeugenHtml += '<button onclick="addManuellerZeuge()" style="width:100%;background:#f0f4ff;border:none;border-radius:8px;padding:9px;font-size:12px;font-weight:700;color:#1e3a5f;cursor:pointer;font-family:inherit;margin-top:8px;">+ Sonstiger Zeuge</button>';
  (sa.manuelleZeugen||[]).forEach(function(z,i){
    zeugenHtml += '<div style="background:#f9f9f9;border-radius:8px;padding:8px;margin-top:6px;font-size:12px;">'+z.name+' – '+z.adresse+
      '<button onclick="(sa.manuelleZeugen||[]).splice('+i+',1);renderStrafantragForm()" style="float:right;background:none;border:none;color:#dc2626;cursor:pointer;font-size:12px;">✕</button></div>';
  });
  const zeugenSec = section('Zeugen', zeugenHtml);
  body.appendChild(zeugenSec);
  zeugenSec.querySelectorAll('input[data-zid]').forEach(function(cb){
    cb.addEventListener('change', function(){ toggleZeuge(this.getAttribute('data-zid'), this.checked); });
  });

  // ── 6. Hausverbot ──
  const hvJa = sa.hausverbot||false;
  let hvHtml = '<label style="font-size:13px;font-weight:700;display:block;margin-bottom:8px;"><input type="checkbox" '+(hvJa?'checked':'')+' onchange="sa.hausverbot=this.checked;renderStrafantragForm()"> Hausverbot aussprechen</label>';
  if(hvJa) {
    hvHtml += '<select id="sa-hv-dauer" onchange="sa.hvDauer=this.value" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:13px;font-family:inherit;outline:none;">'+
      ['1 Jahr','2 Jahre','3 Jahre','Lebenszeit'].map(function(d){return '<option'+(sa.hvDauer===d?' selected':'')+'>'+d+'</option>';}).join('')+'</select>';
  }
  hvHtml += '<div style="margin-top:10px;font-size:12px;color:#666;">Vertragsstrafe: <strong>'+firmaConfig.vertragsstrafe+' €</strong></div>';
  body.appendChild(section('🚫 Hausverbot & Vertragsstrafe', hvHtml));

  // ── Buttons ──
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;';
  const saveBtn = document.createElement('button');
  saveBtn.style.cssText = 'background:#1a1a2e;color:#fff;border:none;border-radius:10px;padding:13px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;';
  saveBtn.textContent = '💾 Speichern';
  saveBtn.addEventListener('click', saveStrafantrag);

  const histBtn = document.createElement('button');
  histBtn.style.cssText = 'background:#f0f4ff;color:#1a1a2e;border:none;border-radius:10px;padding:13px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;';
  histBtn.textContent = '📋 Historie ('+strafantraege.length+')';
  histBtn.addEventListener('click', function(){ renderStrafantragHistorie(); go('s-strafantrag-hist'); });
  const pdfBtn2 = document.createElement('button');
  pdfBtn2.style.cssText = 'width:100%;background:#dc2626;color:#fff;border:none;border-radius:10px;padding:13px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:8px;';
  pdfBtn2.textContent = '📄 PDF generieren & drucken';
  pdfBtn2.addEventListener('click', pdfStrafantrag);
  body.appendChild(pdfBtn2);
  btnRow.appendChild(saveBtn); btnRow.appendChild(histBtn);
  body.appendChild(btnRow);
}

function toggleZeuge(id, checked) {
  if(!sa.zeugen) sa.zeugen = [];
  if(checked) {
    const z = mitarbeiterZeugen.find(function(x){return x.id===id;});
    if(z && !sa.zeugen.find(function(s){return s.id===id;})) sa.zeugen.push(z);
  } else {
    sa.zeugen = sa.zeugen.filter(function(s){return s.id!==id;});
  }
}

function addManuellerZeuge() {
  const name = prompt('Name, Vorname:');
  if(!name) return;
  const adresse = prompt('Adresse:');
  if(!sa.manuelleZeugen) sa.manuelleZeugen = [];
  sa.manuelleZeugen.push({name:name, adresse:adresse||''});
  renderStrafantragForm();
}

function collectSAData() {
  sa.ta = {
    name:    (document.getElementById('sa-tv-name')||{}).value||'',
    vorname: (document.getElementById('sa-tv-vorname')||{}).value||'',
    geb:     (document.getElementById('sa-tv-geb')||{}).value||'',
    wohnort: (document.getElementById('sa-tv-wohnort')||{}).value||'',
    strasse: (document.getElementById('sa-tv-strasse')||{}).value||'',
    nat:     (document.getElementById('sa-tv-nat')||{}).value||'',
    durch:   (document.getElementById('sa-tv-durch')||{}).value||'eigene',
  };
  if(sa.minderjaehrig) {
    sa.eb = {
      name:    (document.getElementById('sa-eb-name')||{}).value||'',
      vorname: (document.getElementById('sa-eb-vorname')||{}).value||'',
      wohnort: (document.getElementById('sa-eb-wohnort')||{}).value||'',
      tel:     (document.getElementById('sa-eb-tel')||{}).value||'',
    };
  }
  const hvSel = document.getElementById('sa-hv-dauer');
  if(hvSel) sa.hvDauer = hvSel.value;
  // Einzelpreis × Anzahl berechnen
  saItems.forEach(function(item){ item.wert = (item.anz||1)*(item.preis||item.wert||0); });
  saItems.forEach(function(item){ item.wert=(item.anz||1)*(item.preis||item.wert||0); });
  sa.items = saItems.slice();
  sa.gesamtWert = saItems.reduce(function(s,i){return s+(i.wert||0);},0);
  sa.datum = new Date().toLocaleDateString('de-DE');
  sa.ts = new Date().toLocaleString('de-DE');
  sa.firma = Object.assign({}, firmaConfig);
}

function saveStrafantrag() {
  collectSAData();
  if(!sa.ta||!sa.ta.name) { alert('Bitte Namen des Tatverdaechtigten eingeben.'); return; }
  const entry = Object.assign({id:'sa'+Date.now()}, sa);
  strafantraege.push(entry);
  lsSave('strafantraege', strafantraege);
  fbSave('strafantraege', strafantraege);
  // Zeige Speicher-Animation, dann zur Historie
  showSaveAnimation(function(){
    renderStrafantragHistorie();
    go('s-strafantrag-hist');
  });
}

function pdfStrafantrag() {
  // Direkt durch User-Tap – Safari erlaubt window.open
  collectSAData();
  if(!sa.ta||!sa.ta.name) { alert('Bitte zuerst Tatverdaechtigen eintragen.'); return; }
  const entry = Object.assign({id:'preview'}, sa);
  entry.firma = Object.assign({}, firmaConfig);
  generateStrafantragPDF(entry);
}

function renderStrafantragHistorie() {
  const body = document.getElementById('strafantrag-hist-body');
  if(!body) return;
  body.innerHTML = '';
  if(!strafantraege.length) {
    body.innerHTML = '<div style="text-align:center;padding:40px;color:#ccc;">Noch keine Anträge</div>';
    return;
  }
  [...strafantraege].reverse().forEach(function(e) {
    const card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:11px;padding:13px 14px;margin-bottom:8px;box-shadow:0 1px 5px rgba(0,0,0,.06);';
    card.innerHTML = '<div style="font-size:14px;font-weight:800;">'+e.ts+'</div>'+
      '<div style="font-size:13px;color:#444;margin-top:3px;">'+(e.ta?e.ta.vorname+' '+e.ta.name:'Unbekannt')+'</div>'+
      '<div style="font-size:11px;color:#888;margin-top:2px;">Gesamtwert: '+(e.gesamtWert||0).toFixed(2)+' €</div>';
    const pdfBtn = document.createElement('button');
    pdfBtn.style.cssText = 'margin-top:8px;background:#1a1a2e;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;';
    pdfBtn.textContent = '📄 PDF generieren';
    pdfBtn.addEventListener('click', (function(entry){ return function(){ generateStrafantragPDF(entry); }; })(e));
    card.appendChild(pdfBtn);
    body.appendChild(card);
  });
}

function generateStrafantragPDF(e) {
  const ta = e.ta||{};
  const eb = e.eb||{};
  const firma = e.firma||firmaConfig;
  const items = e.items||[];
  const zeugen = (e.zeugen||[]).concat(e.manuelleZeugen||[]);
  const gesamt = (e.gesamtWert||0).toFixed(2);
  const datum = e.datum || new Date().toLocaleDateString('de-DE');

  const pdfCss = '<style>@page{size:A4;margin:2cm;}@media print{body{margin:0;}}body{font-family:Arial,sans-serif;font-size:10.5pt;color:#000;}h1{font-size:15pt;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:14px;}h2{font-size:11pt;margin-top:16px;margin-bottom:5px;background:#f0f0f0;padding:3px 7px;page-break-inside:avoid;}table{width:100%;border-collapse:collapse;margin-bottom:8px;}td,th{border:1px solid #ccc;padding:4px 7px;font-size:10pt;}th{background:#eee;font-weight:bold;text-align:left;}.sig{margin-top:36px;border-top:1px solid #000;padding-top:5px;font-size:9pt;}</style>';
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Strafantrag</title>'+pdfCss+'</head><body>'+
    '<h1>&#128110; Strafantrag</h1>'+
    '<p><strong>Datum:</strong> '+datum+'</p>'+
    '<h2>Anzeigeerstatter (Geschädigte)</h2>'+
    '<p>'+firma.name+'<br>'+firma.strasse+'<br>'+firma.plz+' '+firma.ort+'</p>'+
    '<h2>Tatverdächtige(r)</h2>'+
    '<table><tr><th>Name</th><td>'+ta.name+', '+ta.vorname+'</td></tr>'+
    '<tr><th>Geburtsdatum</th><td>'+ta.geb+'</td></tr>'+
    '<tr><th>Wohnort</th><td>'+ta.strasse+', '+ta.wohnort+'</td></tr>'+
    '<tr><th>Nationalität</th><td>'+ta.nat+'</td></tr>'+
    '<tr><th>Personalien festgestellt durch</th><td>'+(ta.durch==='polizei'?'Die Polizei':'Eigene Feststellung')+'</td></tr></table>'+
    (e.minderjaehrig && eb.name ? '<h2>Erziehungsberechtigte(r)</h2>'+
      '<table><tr><th>Name</th><td>'+eb.name+', '+eb.vorname+'</td></tr>'+
      '<tr><th>Wohnort</th><td>'+eb.wohnort+'</td></tr>'+
      '<tr><th>Telefon</th><td>'+eb.tel+'</td></tr></table>' : '')+
    '<h2>Tatort</h2><p>'+firma.name+', '+firma.strasse+', '+firma.plz+' '+firma.ort+'</p>'+
    '<h2>Entwendete Gegenstaende</h2>'+
    '<table><tr><th>Bezeichnung</th><th style="width:60px;text-align:center;">Anzahl</th><th style="width:90px;text-align:right;">Einzelpreis</th><th style="width:90px;text-align:right;">Gesamt</th></tr>'+
    items.map(function(i){var anz=i.anz||1;var preis=i.preis||i.wert||0;var gesamt=anz*preis;return '<tr><td>'+i.bez+'</td><td style="text-align:center;">'+anz+'</td><td style="text-align:right;">'+parseFloat(preis).toFixed(2)+' €</td><td style="text-align:right;">'+parseFloat(gesamt).toFixed(2)+' €</td></tr>';}).join('')+
    '<tr><td colspan="3"><strong>Gesamtwert</strong></td><td style="text-align:right;"><strong>'+gesamt+' €</strong></td></tr></table>'+
    '<h2>Strafantrag</h2>'+
    '<p>'+(e.strafantrag!==false?'<strong>JA</strong> – Es wird Strafantrag gestellt.':'<strong>NEIN</strong> – Kein Strafantrag.')+'</p>'+
    (zeugen.length ? '<h2>Zeugen</h2><table><tr><th>Name</th><th>Adresse</th></tr>'+
      zeugen.map(function(z){return '<tr><td>'+(z.vorname?z.vorname+' ':'')+z.name+'</td><td>'+(z.adresse||z.wohnort||'')+'</td></tr>';}).join('')+'</table>' : '')+
    (e.hausverbot ? '<h2>Hausverbot</h2><p>Hausverbot ausgesprochen für: <strong>'+e.hvDauer+'</strong><br>'+
      'Vertragsstrafe: <strong>'+firma.vertragsstrafe+' €</strong></p>' : '')+
    '<div class="sig">'+firma.name+' · '+firma.strasse+' · '+firma.plz+' '+firma.ort+'</div>'+
    '</body></html>';

  // Safari-kompatibel: neues Fenster öffnen, dann drucken
  const win = window.open('', '_blank');
  if(win) {
    win.document.write(html);
    win.document.close();
    setTimeout(function(){ win.print(); }, 500);
  } else {
    // Fallback: data URI
    const b64 = btoa(unescape(encodeURIComponent(html)));
    const a = document.createElement('a');
    a.href = 'data:text/html;base64,'+b64;
    a.download = 'Strafantrag_'+ta.name+'_'+datum.replace(/\./g,'-')+'.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
}

function openInfoDetail(bereich,sub){
  $text('id-lbl', bereich+' › '+sub);
  $text('id-title', sub);
  const body=document.getElementById('id-body');if(!body)return;body.innerHTML='';
  const links=infoLinks.filter(l=>l.bereich===bereich&&l.sub===sub);
  if(!links.length){
    body.innerHTML='<div style="text-align:center;padding:40px 20px;color:var(--gt);"><div style="font-size:40px;margin-bottom:10px;">🔗</div><div style="font-size:15px;font-weight:700;color:var(--black);">Noch kein Inhalt</div><div style="font-size:12px;margin-top:6px;">Im Admin-Bereich Links hinzufügen.</div></div>';
  } else {
    links.forEach(l=>{
      const card=document.createElement('div');
      card.style.cssText='background:#fff;border-radius:12px;padding:16px;margin-bottom:9px;box-shadow:0 2px 7px rgba(0,0,0,.07);display:flex;align-items:center;gap:12px;';
      const ico=l.url.includes('youtu')?'▶️':l.url.includes('.pdf')?'📄':'🔗';
      card.innerHTML='<div style="font-size:26px;">'+ico+'</div><div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:700;">'+l.title+'</div><div style="font-size:10px;color:var(--gt);margin-top:2px;word-break:break-all;">'+l.url+'</div></div>';
      const btn=document.createElement('button');btn.style.cssText='background:var(--black);color:#fff;border:none;border-radius:9px;padding:8px 13px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;';btn.textContent='Öffnen';
      btn.addEventListener('click', function(){ window.open(l.url,'_blank'); });card.appendChild(btn);body.appendChild(card);
    });
  }
  go('s-info-detail');
}

