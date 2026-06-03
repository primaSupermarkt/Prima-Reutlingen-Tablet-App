// ═══════════════════════════════════════════════════════════════
// SCHICHTLEITER.JS
// Schichtleiter-Dashboard, Umsatz, Wochenaufgaben, SL-Tasks
// ═══════════════════════════════════════════════════════════════

function askSL(){
  pwTarget='sl';
  $set('pw-inp', 'value', '');
  $style('pw-err', 'display', 'none');
  openOv('ov-pw');
}

function slTab(tab) {
  currentSLTab = tab;
  const tabs = ['dash','umsatz','dp','rep','aufg','regal'];
  tabs.forEach(t => {
    const btn = document.getElementById('slt-'+t);
    const pane = document.getElementById('sl-tab-'+t);
    if(btn) {
      btn.style.background = t===tab ? '#fff' : 'rgba(255,255,255,.18)';
      btn.style.color = t===tab ? '#0f3460' : '#fff';
    }
    if(pane) pane.style.display = t===tab ? (t==='aufg'||t==='regal'?'flex':'block') : 'none';
  });
  if(tab==='dash') renderSL();
  if(tab==='umsatz') renderUmsatz();
  if(tab==='dp') renderDP();
  if(tab==='rep') renderSLReport();
  if(tab==='aufg') { renderSLPersAufgaben(); }
  if(tab==='regal') setTimeout(function(){ renderSLRegalBewertung(); }, 50);
}










// ── REGAL-NACHBESSERUNG ─────────────────────────────────────────────────────



// Regalfotos Wochenarchiv: letzte 7 Tage




function renderSL(){
  const body=document.getElementById('sl-tab-dash');
  if(!body) return;
  body.innerHTML='';

  // ── NACHRICHTEN VON MITARBEITERN ──
  const unreadMsgs = mitarbeiterNachrichten.filter(m=>!m.gelesen);
  if(unreadMsgs.length>0){
    const msgSec=document.createElement('div');msgSec.className='a-sec';msgSec.style.color='#ef4444';
    msgSec.textContent='📬 Neue Nachrichten von Mitarbeitern ('+unreadMsgs.length+')';body.appendChild(msgSec);
    const msgCard=document.createElement('div');msgCard.className='sl-card';
    unreadMsgs.forEach(msg=>{
      const item=document.createElement('div');item.className='sl-item';
      item.style.cssText='padding:10px 0;border-bottom:1px solid #f0f0f0;';
      const isStempel = msg.typ==='stempel_kommen'||msg.typ==='stempel_gehen';
      const stempelColor = msg.typ==='stempel_kommen'?'#16a34a':'#dc2626';
      const textDiv=document.createElement('div');
      textDiv.innerHTML='<div style="font-size:13px;font-weight:700;color:'+stempelColor+';">'+msg.text+'</div>'+
        '<div style="font-size:11px;color:#888;margin-top:3px;">👤 '+msg.name+' · '+msg.schicht+' · '+msg.ts+'</div>';
      item.appendChild(textDiv);
      const ackBtn=document.createElement('button');
      ackBtn.style.cssText='background:#dcfce7;border:none;border-radius:7px;padding:5px 10px;font-size:11px;font-weight:700;color:#15803d;cursor:pointer;margin-top:6px;font-family:inherit;touch-action:manipulation;-webkit-tap-highlight-color:transparent;';
      ackBtn.textContent = isStempel ? '✅ Bestätigen' : '✅ Zur Kenntnis genommen';
      (function(msgId){ackBtn.addEventListener('click', function(){
        const idx=mitarbeiterNachrichten.findIndex(function(x){return x.id===msgId||(!x.id&&x.ts===msgId);});
        if(idx!==-1) mitarbeiterNachrichten[idx].gelesen=true;
        // Zeiterfassung bestätigen
        const mObj=idx!==-1?mitarbeiterNachrichten[idx]:null;
        if(mObj&&mObj.zeId){
          const ze=zeiterfassung.find(function(z){return z.id===mObj.zeId;});
          if(ze){ze.slBestaetigt=true;lsSave('zeiterfassung',zeiterfassung);fbSave('zeiterfassung',zeiterfassung);}
        }
        lsSave('mitNachrichten',mitarbeiterNachrichten);
        fbSave('mitNachrichten',mitarbeiterNachrichten);
        updateSLBadge();renderSL();
      });})(msg.id||msg.ts);
      item.appendChild(ackBtn);
      // Ablehnen-Button nur für Stempel-Nachrichten
      if(isStempel) {
        const rejectBtn = document.createElement('button');
        rejectBtn.style.cssText = 'background:#fee2e2;border:none;border-radius:7px;padding:5px 10px;font-size:11px;font-weight:700;color:#dc2626;cursor:pointer;margin-top:6px;margin-left:6px;font-family:inherit;touch-action:manipulation;-webkit-tap-highlight-color:transparent;';
        rejectBtn.textContent = '❌ Ablehnen & korrigieren';
        (function(m){ rejectBtn.addEventListener('click', function(){
          // Overlay statt prompt()
          const ov=document.createElement('div');
          ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:700;display:flex;align-items:center;justify-content:center;padding:20px;';
          const box=document.createElement('div');
          box.style.cssText='background:#fff;border-radius:16px;padding:20px;width:100%;max-width:360px;';
          box.innerHTML='<div style="font-size:16px;font-weight:800;margin-bottom:12px;color:#dc2626;">❌ Ablehnen</div>'+
            '<div style="font-size:13px;color:#666;margin-bottom:10px;">Grund / korrigierte Zeit:</div>'+
            '<textarea id="reject-grund" rows="3" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:10px;font-size:14px;font-family:inherit;outline:none;margin-bottom:12px;box-sizing:border-box;resize:none;"></textarea>';
          const okBtn=document.createElement('button');
          okBtn.style.cssText='width:100%;background:#dc2626;color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:8px;';
          okBtn.textContent='Ablehnen bestätigen';
          okBtn.addEventListener('click', function(){
            const grund=(document.getElementById('reject-grund')||{}).value||'';
            if(!grund.trim()){alert('Bitte Grund eingeben.');return;}
            document.body.removeChild(ov);
            m.gelesen=true;
            if(m.zeId){
              const ze=zeiterfassung.find(function(z){return z.id===m.zeId;});
              if(ze){ze.slAbgelehnt=true;ze.slGrund=grund;lsSave('zeiterfassung',zeiterfassung);fbSave('zeiterfassung',zeiterfassung);}
            }
            mitarbeiterNachrichten.push({id:'rej'+Date.now(),ts:new Date().toLocaleString('de-DE'),name:m.name,text:'⚠️ Stempelzeit abgelehnt: '+grund,schicht:'–',gelesen:false});
            lsSave('mitNachrichten',mitarbeiterNachrichten);fbSave('mitNachrichten',mitarbeiterNachrichten);
            updateSLBadge();renderSL();
          });
          const abbrBtn=document.createElement('button');
          abbrBtn.style.cssText='width:100%;background:none;border:none;color:#888;font-size:12px;cursor:pointer;font-family:inherit;';
          abbrBtn.textContent='Abbrechen';
          abbrBtn.addEventListener('click',function(){document.body.removeChild(ov);});
          box.appendChild(okBtn);box.appendChild(abbrBtn);
          ov.appendChild(box);document.body.appendChild(ov);
          setTimeout(function(){const t=document.getElementById('reject-grund');if(t)t.focus();},80);
        });})(msg);
        item.appendChild(rejectBtn);
      }
      msgCard.appendChild(item);
    });
    // Alle auf einmal zur Kenntnis nehmen
    if(unreadMsgs.length > 1) {
      const allAckBtn = document.createElement('button');
      allAckBtn.style.cssText = 'width:100%;background:#1e3a5f;color:#fff;border:none;border-radius:9px;padding:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:8px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;';
      allAckBtn.textContent = '✅ Alle ('+unreadMsgs.length+') zur Kenntnis nehmen';
      allAckBtn.addEventListener('click', function(){
        mitarbeiterNachrichten.forEach(function(m){ m.gelesen=true; });
        lsSave('mitNachrichten',mitarbeiterNachrichten);
        fbSave('mitNachrichten',mitarbeiterNachrichten);
        updateSLBadge();renderSL();
      });
      msgCard.appendChild(allAckBtn);
    }
    body.appendChild(msgCard);
    const divSep=document.createElement('div');divSep.style.cssText='height:1px;background:#e0e0e0;margin:8px 0;';body.appendChild(divSep);
  }

  // ── LIVE STATUS: Wer ist gerade eingeloggt? ──
  const liveBlock=document.createElement('div');
  const allNames=names||[];
  const slbMap={'early':'Frühschicht','mid':'Mittelschicht','late':'Spätschicht'};
  const berMap={'laden':'🛒 Laden','bake':'🥐 Bake-Off'};
  let liveHTML='<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">🟢 Wer ist gerade aktiv?</div>'+
    '<div style="background:#fff;border-radius:12px;padding:10px 12px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:4px;">';
  allNames.forEach(function(n){
    const a=activeLogins[n];
    if(a){
      const pct=a.clTotal>0?Math.round(a.clDone/a.clTotal*100):0;
      const barCol=pct===100?'#16a34a':pct>50?'#f59e0b':'#3b82f6';
      liveHTML+='<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f5f5f5;">'+
        '<div style="width:9px;height:9px;border-radius:50%;background:#16a34a;flex-shrink:0;box-shadow:0 0 0 3px #bbf7d0;"></div>'+
        '<div style="flex:1;">'+
          '<div style="font-size:13px;font-weight:800;">'+n+'</div>'+
          '<div style="font-size:11px;color:#666;">'+(slbMap[a.schicht]||a.schicht)+' · '+(berMap[a.bereich]||a.bereich)+(a.startTime?' · ab '+a.startTime+' Uhr':'')+'</div>'+
          '<div style="margin-top:5px;background:#f0f0f0;border-radius:99px;height:6px;overflow:hidden;">'+
            '<div style="height:100%;border-radius:99px;background:'+barCol+';width:'+pct+'%;transition:width .4s;"></div></div>'+
          '<div style="font-size:10px;color:#aaa;margin-top:2px;">'+a.clDone+' / '+a.clTotal+' Aufgaben · '+pct+'%'+(a.lastSeen?' · zuletzt '+a.lastSeen:'')+'</div>'+
        '</div></div>';
    } else {
      liveHTML+='<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f5f5f5;opacity:.4;">'+
        '<div style="width:9px;height:9px;border-radius:50%;background:#d1d5db;flex-shrink:0;"></div>'+
        '<div style="font-size:13px;font-weight:600;color:#888;">'+n+'</div>'+
        '<div style="margin-left:auto;font-size:11px;color:#ccc;">nicht eingeloggt</div></div>';
    }
  });
  liveHTML+='</div>';
  liveBlock.innerHTML=liveHTML;
  body.appendChild(liveBlock);


  // ── ÜBERGABE-ÜBERSICHT ──
  const recentUB = ubergaben.filter(function(u){
    return u.ts && u.ts.includes(new Date().toLocaleDateString('de-DE').slice(0,6));
  }).slice(-10).reverse();
  if(recentUB.length) {
    const ubSec = document.createElement('div');
    ubSec.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:6px;';
    ubSec.textContent = '🔄 Schichtübergaben heute';
    body.appendChild(ubSec);
    const ubCard = document.createElement('div');
    ubCard.style.cssText = 'background:#fff;border-radius:12px;padding:12px;box-shadow:0 2px 7px rgba(0,0,0,.06);margin-bottom:10px;';
    recentUB.forEach(function(u){
      const row = document.createElement('div');
      row.style.cssText = 'padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:12px;';
      const status = u.status==='accepted'?'✅':u.status==='rejected'?'❌':'⏳';
      const statusColor = u.status==='accepted'?'#16a34a':u.status==='rejected'?'#dc2626':'#f59e0b';
      row.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">'+
          '<div style="font-weight:800;">'+status+' '+u.von+' → '+(u.schicht||'')+'</div>'+
          '<div style="font-size:11px;color:#888;">'+u.ts.slice(12,17)+' Uhr</div>'+
        '</div>'+
        '<div style="color:#666;font-size:11px;">'+
          '📋 Vorbereitet von: <b>'+u.von+'</b>'+
          (u.status==='accepted'?' · ✅ Angenommen von: <b style="color:#16a34a;">'+u.acceptedBy+'</b>':'')+
          (u.status==='rejected'?' · ❌ Abgelehnt von: <b style="color:#dc2626;">'+u.rejectedBy+'</b> – '+u.rejectedKommentar:'')+
          (u.status==='open'?' · <span style="color:#f59e0b;">⏳ Wartet auf Annahme</span>':'')+
        '</div>';
      ubCard.appendChild(row);
    });
    body.appendChild(ubCard);
  }
  // ── SL CHECKLISTE ──
  // ── SL CHECKLISTE ──
  // ── SL CHECKLISTE ──
  if(slTasks.length>0){
    const slSec=document.createElement('div');slSec.className='a-sec';slSec.textContent='👔 Meine Aufgaben heute';body.appendChild(slSec);
    const slCard=document.createElement('div');slCard.className='sl-card';
    slTasks.forEach(task=>{
      const cs=slCheckState[task.id]||{};
      const done=cs.status==='done';
      const row=document.createElement('div');
      row.className='cl-row'+(done?' done-row':'');
      row.style.cssText='background:#fff;border-radius:11px;padding:11px 13px;display:flex;align-items:center;gap:11px;box-shadow:0 1px 5px rgba(0,0,0,.06);margin-bottom:6px;border:2px solid transparent;';
      if(done) row.style.opacity='0.5';
      const cb=document.createElement('div');
      cb.style.cssText='width:24px;height:24px;border-radius:50%;border:2.5px solid #ddd;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;';
      if(done){cb.style.background='#16a34a';cb.style.borderColor='#16a34a';cb.style.color='#fff';cb.textContent='✓';}
      const txt=document.createElement('div');
      txt.style.flex='1';
      txt.innerHTML='<div style="font-size:13px;font-weight:500;'+(done?'text-decoration:line-through;color:#aaa;':'')+'">'+task.text+'</div>'+
        '<div style="font-size:10px;color:#888;margin-top:2px;">🕐 '+task.time+' · '+task.section+'</div>'+
        (done&&cs.ts?'<div style="font-size:10px;color:#16a34a;font-weight:700;margin-top:2px;">✓ '+cs.ts+'</div>':'');
      row.appendChild(cb);row.appendChild(txt);
      if(!done){
        const btn=document.createElement('button');
        btn.style.cssText='background:#dcfce7;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;color:#15803d;cursor:pointer;font-family:inherit;flex-shrink:0;';
        btn.textContent='✅ Erledigt';
        (function(id){btn.addEventListener('click',function(e){
          e.stopPropagation();
          const now=new Date();
          const ts=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
          slCheckState[id]={status:'done',ts};
          lsSave('slCheckState',slCheckState);
          renderSL();
        });})(task.id);
        row.appendChild(btn);
      } else {
        // Double tap to undo
        let lastTap=0;
        row.addEventListener('touchend',function(){
          const now=Date.now();
          if(now-lastTap<350){delete slCheckState[task.id];renderSL();}
          lastTap=now;
        });
      }
      slCard.appendChild(row);
    });
    body.appendChild(slCard);
    const divider=document.createElement('div');divider.style.cssText='height:1px;background:#e0e0e0;margin:8px 0;';body.appendChild(divider);
  }

  const now=new Date();

  // Build last 7 days array
  const last7=[];
  for(let i=0;i<7;i++){const d=new Date(now);d.setDate(d.getDate()-i);last7.push(d);}

  // getHistForDay and getUBForDay are global helpers

  // ── TAB NAV ──────────────────────────────────
  const tabBar=document.createElement('div');
  tabBar.style.cssText='display:flex;gap:6px;margin-bottom:14px;';
  const tabs=[{id:'tab-heute',label:'Heute'},
              {id:'tab-woche',label:'7 Tage'},
              {id:'tab-report',label:'📊 Report'}];
  let activeTab='tab-heute';

  var renderTab = function(tid){
    activeTab=tid;
    tabs.forEach(t=>{
      const btn=document.getElementById(t.id);
      if(btn){btn.style.background=t.id===tid?'#fff':'#1a2a4a';btn.style.color=t.id===tid?'#0f3460':'#fff';}
    });
    document.querySelectorAll('.sl-tab-content').forEach(c=>c.style.display='none');
    const el=document.getElementById('content-'+tid.replace('tab-',''));
    if(el)el.style.display='block';
  }

  tabs.forEach(t=>{
    const btn=document.createElement('button');
    btn.id=t.id;btn.textContent=t.label;
    btn.style.cssText='flex:1;border:none;border-radius:10px;padding:10px 6px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;';
    btn.style.background=t.id==='tab-heute'?'#fff':'#1a2a4a';
    btn.style.color=t.id==='tab-heute'?'#0f3460':'#fff';
    btn.addEventListener('click', function(){ renderTab(t.id); });
    tabBar.appendChild(btn);
  });
  body.appendChild(tabBar);

  // ── HEUTE ────────────────────────────────────
  const todayDiv=document.createElement('div');
  todayDiv.id='content-heute';todayDiv.className='sl-tab-content';

  const todayHist=getHistForDay(now);
  const todayUB=getUBForDay(now);
  const todayDone=todayHist.filter(h=>h.done).length;
  const todayND=todayHist.filter(h=>!h.done).length;
  const todayTotal=todayDone+todayND;
  const todayPct=todayTotal>0?Math.round(todayDone/todayTotal*100):0;

  // Stats row
  const statsGrid=document.createElement('div');
  statsGrid.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;';
  [
    {num:todayPct+'%',lbl:'Quote heute',color:todayPct>=80?'#16a34a':todayPct>=50?'#f0a500':'#ef4444'},
    {num:todayDone,lbl:'Erledigt',color:'#16a34a'},
    {num:todayND,lbl:'Nicht erledigt',color:todayND>0?'#ef4444':'#16a34a'},
  ].forEach(s=>{
    const c=document.createElement('div');c.className='sl-stat';
    c.innerHTML='<div class="sl-stat-num" style="color:'+s.color+'">'+s.num+'</div><div class="sl-stat-lbl">'+s.lbl+'</div>';
    statsGrid.appendChild(c);
  });
  todayDiv.appendChild(statsGrid);

  // Übergaben heute

  todayDiv.appendChild(mkSec('🔄 Schichtübergaben heute'));
  const ubCard=document.createElement('div');ubCard.className='sl-card';
  if(todayUB.length===0){
    ubCard.innerHTML='<div style="padding:8px 0;font-size:13px;color:#ef4444;font-weight:600;">⚠️ Keine Übergabe heute erfasst</div>';
  } else {
    todayUB.forEach(u=>{
      const item=document.createElement('div');item.className='sl-item';
      const stColor=u.status==='accepted'?'#16a34a':u.status==='rejected'?'#ef4444':'#f0a500';
      const stLabel=u.status==='accepted'?'✅ Angenommen':u.status==='rejected'?'❌ Abgelehnt':'⏳ Offen';
      item.innerHTML='<div class="si-name">'+u.schicht+' · '+u.von+'</div>'+
        '<div class="si-detail" style="color:'+stColor+';font-weight:700;">'+stLabel+'</div>'+
        '<div class="si-detail">'+u.ts+'</div>';
      ubCard.appendChild(item);
    });
  }
  todayDiv.appendChild(ubCard);

  // Temp kontrolle heute
  const todayKey2 = dayKey(now);
  const todayTempEntry = tempHistory.find(h => h.date === todayKey2);
  todayDiv.appendChild(mkSec('🌡️ Temperaturkontrolle heute'));
  const tCard=document.createElement('div');tCard.className='sl-card';
  if(!todayTempEntry){
    tCard.innerHTML='<div style="padding:8px 0;font-size:13px;color:#f59e0b;font-weight:600;">⚠️ Noch keine Messung heute</div>';
  } else {
    const alarms=todayTempEntry.readings.filter(r=>r.alarm);
    const warns=todayTempEntry.readings.filter(r=>r.warn);
    const okCount=todayTempEntry.readings.filter(r=>r.ok).length;
    const confirmed=todayTempEntry.slConfirmed;

    // Summary row
    const sumDiv=document.createElement('div');
    sumDiv.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;';
    sumDiv.innerHTML=
      (alarms.length?`<span style="background:#fee2e2;color:#dc2626;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;">🚨 ${alarms.length} Alarm(e)</span>`:'') +
      (warns.length?`<span style="background:#fef3c7;color:#92400e;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;">⚠️ ${warns.length} Warnung(en)</span>`:'') +
      `<span style="background:#dcfce7;color:#15803d;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;">✅ ${okCount} OK</span>` +
      `<span style="font-size:11px;color:#888;padding:4px 0;">von ${todayTempEntry.ma} · ${todayTempEntry.ts}</span>`;
    tCard.appendChild(sumDiv);

    // Show alarms/warns details
    if(alarms.length>0||warns.length>0){
      const detDiv=document.createElement('div');
      [...alarms,...warns].forEach(r=>{
        const row=document.createElement('div');row.style.cssText='padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px;';
        row.innerHTML='<span class="status-dot '+(r.alarm?'sd-red':'sd-orange')+'" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;background:'+(r.alarm?'#ef4444':'#f59e0b')+';"></span>'+
          '<strong>'+r.name+'</strong>: '+r.ist+'°C '+
          (r.alarm?'<span style="color:#dc2626;font-weight:700;">🚨 ALARM</span>':'<span style="color:#92400e;font-weight:700;">⚠️ Warnung</span>');
        detDiv.appendChild(row);
      });
      tCard.appendChild(detDiv);
    }

    // SL confirm button
    if(!confirmed){
      const cfmBtn=document.createElement('button');
      cfmBtn.style.cssText='width:100%;background:#0f3460;color:#fff;border:none;border-radius:9px;padding:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:10px;';
      cfmBtn.textContent='👔 Kontrolle bestätigt';
      cfmBtn.onclick=()=>{
        todayTempEntry.slConfirmed=true;
        todayTempEntry.slConfirmedBy='Schichtleiter';
        todayTempEntry.slConfirmedTs=new Date().toLocaleString('de-DE');
        lsSave('tempHistory',tempHistory);
        renderSL();
      };
      tCard.appendChild(cfmBtn);
    } else {
      const cfmDiv=document.createElement('div');
      cfmDiv.style.cssText='margin-top:8px;font-size:11px;color:#16a34a;font-weight:700;';
      cfmDiv.textContent='✅ Bestätigt von Schichtleiter · '+todayTempEntry.slConfirmedTs;
      tCard.appendChild(cfmDiv);
    }
  }
  todayDiv.appendChild(tCard);

  // Inventur Differenzen heute
  const todayInv = inventurHistory.filter(h=>h.date===todayKey2);
  const todayDiffs = todayInv.reduce((s,h)=>s+h.differenzen.length,0);
  if(todayDiffs>0){
    todayDiv.appendChild(mkSec('📋 Inventur-Abweichungen heute'));
    const invCard=document.createElement('div');invCard.className='sl-card';
    todayInv.forEach(session=>{
      session.differenzen.forEach(r=>{
        const diff=parseFloat(r.ist)-parseFloat(r.soll);
        const item=document.createElement('div');item.className='sl-item';
        const eurStr = r.diffEur!==undefined ? ' · <strong style="color:'+(r.diffEur<0?'#dc2626':'#f59e0b')+';">'+(r.diffEur>0?'+':'')+r.diffEur.toFixed(2).replace('.',',')+'€</strong>' : '';
        item.innerHTML='<div class="si-name"><span class="status-dot sd-red"></span>'+r.artikel+(r.barcode?' ('+r.barcode+')':'')+'</div>'+
          '<div class="si-detail">Soll: '+r.soll+' · Ist: '+r.ist+eurStr+' · '+session.ma+'</div>';
        invCard.appendChild(item);
      });
    });
    todayDiv.appendChild(invCard);
  }

  // Slush status
  todayDiv.appendChild(mkSec('🧊 Slushmaschine'));
  const slCard2=document.createElement('div');slCard2.className='sl-card';
  const lastSlush=slushHistory.length?slushHistory[slushHistory.length-1]:null;
  const daysSinceSlush=lastSlush?Math.floor((now-new Date(lastSlush.date))/(1000*60*60*24)):999;
  slCard2.innerHTML='<div style="font-size:13px;font-weight:600;color:'+(daysSinceSlush<=7?'#16a34a':daysSinceSlush<=14?'#f59e0b':'#ef4444')+'">'+(daysSinceSlush<=7?'✅ Diese Woche gereinigt (vor '+daysSinceSlush+' Tagen)':daysSinceSlush<=14?'⚠️ Letzte Reinigung vor '+daysSinceSlush+' Tagen':'🚨 ÜBERFÄLLIG – keine Reinigung seit '+daysSinceSlush+' Tagen!')+'</div>';
  todayDiv.appendChild(slCard2);

  // Nicht erledigte heute
  const ndToday=todayHist.filter(h=>!h.done);
  if(ndToday.length>0){
    todayDiv.appendChild(mkSec('❌ Nicht erledigt heute'));
    const ndCard=document.createElement('div');ndCard.className='sl-card';
    ndToday.forEach(h=>{
      const item=document.createElement('div');item.className='sl-item';
      item.innerHTML='<div class="si-name">'+h.taskText+'</div>'+
        '<div class="si-detail">'+h.name+' · '+(h.reason||'kein Grund')+'</div>';
      ndCard.appendChild(item);
    });
    todayDiv.appendChild(ndCard);
  }

  // Erledigte heute
  const doneToday=todayHist.filter(h=>h.done);
  todayDiv.appendChild(mkSec('✅ Erledigt heute ('+doneToday.length+')'));
  const doneCard=document.createElement('div');doneCard.className='sl-card';
  if(doneToday.length===0){
    doneCard.innerHTML='<div style="padding:8px 0;font-size:13px;color:var(--gt);">Noch keine Einträge heute</div>';
  } else {
    doneToday.slice(-10).reverse().forEach(h=>{
      const item=document.createElement('div');item.className='sl-item';
      item.innerHTML='<div class="si-name">'+h.taskText+'</div>'+
        '<div class="si-detail">'+h.name+' · '+h.ts+'</div>';
      doneCard.appendChild(item);
    });
  }
  todayDiv.appendChild(doneCard);
  body.appendChild(todayDiv);

  // ── 7 TAGE ───────────────────────────────────
  const wocheDiv=document.createElement('div');
  wocheDiv.id='content-woche';wocheDiv.className='sl-tab-content';wocheDiv.style.display='none';

  // Bar chart last 7 days
  wocheDiv.appendChild(mkSec('📊 Erfüllungsquote letzte 7 Tage'));
  const chartCard=document.createElement('div');chartCard.className='sl-card';
  chartCard.style.paddingBottom='6px';

  const chartWrap=document.createElement('div');
  chartWrap.style.cssText='display:flex;align-items:flex-end;gap:6px;height:80px;padding:0 4px 0;';

  last7.slice().reverse().forEach(d=>{
    const dh=getHistForDay(d);
    const done=dh.filter(h=>h.done).length;
    const nd=dh.filter(h=>!h.done).length;
    const total=done+nd;
    const pct=total>0?Math.round(done/total*100):0;
    const hasData=total>0;
    const barCol=!hasData?'#e0e0e0':pct>=80?'#16a34a':pct>=50?'#f0a500':'#ef4444';
    const barH=hasData?Math.max(8,pct*0.7):8;

    const col=document.createElement('div');
    col.style.cssText='flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;';
    const bar=document.createElement('div');
    bar.style.cssText='width:100%;border-radius:4px 4px 0 0;background:'+barCol+';height:'+barH+'px;';
    const pctLbl=document.createElement('div');
    pctLbl.style.cssText='font-size:10px;font-weight:700;color:'+barCol+';';
    pctLbl.textContent=hasData?pct+'%':'–';
    const dayLbl=document.createElement('div');
    dayLbl.style.cssText='font-size:9px;color:var(--gt);text-align:center;';
    dayLbl.textContent=dayLabel(d).split(' ')[0];
    col.appendChild(pctLbl);col.appendChild(bar);col.appendChild(dayLbl);
    chartWrap.appendChild(col);
  });
  chartCard.appendChild(chartWrap);
  wocheDiv.appendChild(chartCard);

  // Weekly summary
  wocheDiv.appendChild(mkSec('📅 Tagesübersicht'));
  const weekCard=document.createElement('div');weekCard.className='sl-card';
  last7.forEach(d=>{
    const dh=getHistForDay(d);
    const dub=getUBForDay(d);
    const done=dh.filter(h=>h.done).length;
    const nd=dh.filter(h=>!h.done).length;
    const total=done+nd;
    const pct=total>0?Math.round(done/total*100):null;
    const openUB=dub.filter(u=>u.status==='open').length;
    const rejUB=dub.filter(u=>u.status==='rejected').length;
    const isToday=dayKey(d)===dayKey(now);

    const item=document.createElement('div');item.className='sl-item';
    item.style.cssText='padding:10px 0;'+(isToday?'background:#f0f8ff;margin:0 -14px;padding:10px 14px;border-radius:8px;':'');

    let statusHtml='';
    if(pct===null) statusHtml='<span style="color:#ccc;font-size:11px;">Keine Daten</span>';
    else {
      const col=pct>=80?'#16a34a':pct>=50?'#f0a500':'#ef4444';
      statusHtml='<span style="color:'+col+';font-weight:800;font-size:13px;">'+pct+'%</span> '+
        '<span style="font-size:11px;color:var(--gt);">'+done+' ✅ · '+nd+' ❌</span>';
    }
    let ubHtml='';
    if(dub.length===0) ubHtml='<span style="color:#ef4444;font-size:10px;">Keine Übergabe</span>';
    else if(rejUB>0) ubHtml='<span style="color:#ef4444;font-size:10px;">'+rejUB+' abgelehnt</span>';
    else if(openUB>0) ubHtml='<span style="color:#f0a500;font-size:10px;">'+openUB+' offen</span>';
    else ubHtml='<span style="color:#16a34a;font-size:10px;">✅ Übergaben OK</span>';

    item.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;">'+
      '<div class="si-name">'+(isToday?'📍 ':'')+dayLabel(d)+'</div>'+
      '<div>'+statusHtml+'</div></div>'+
      '<div class="si-detail" style="margin-top:3px;">'+ubHtml+'</div>';
    weekCard.appendChild(item);
  });
  wocheDiv.appendChild(weekCard);

  // Schwerpunkte (most frequent nd reasons)
  const ndAll=history.filter(h=>!h.done&&h.ts);
  const reasonCount={};
  ndAll.forEach(h=>{const r=h.reason||'Kein Grund';reasonCount[r]=(reasonCount[r]||0)+1;});
  const sorted=Object.entries(reasonCount).sort((a,b)=>b[1]-a[1]);
  // Temp history last 7 days
  wocheDiv.appendChild(mkSec('🌡️ Temperaturhistorie (7 Tage)'));
  const tempCard=document.createElement('div');tempCard.className='sl-card';
  if(!tempHistory.length){
    tempCard.innerHTML='<div style="padding:8px 0;font-size:13px;color:#ccc;">Noch keine Einträge</div>';
  } else {
    last7.forEach(d=>{
      const key=dayKey(d);
      const entry=tempHistory.find(h=>h.date===key);
      const item=document.createElement('div');item.className='sl-item';
      if(!entry){
        item.innerHTML='<div class="si-name">'+dayLabel(d)+'</div><div class="si-detail" style="color:#ccc;">Keine Messung</div>';
      } else {
        const alarmC=entry.readings.filter(r=>r.alarm).length;
        const warnC=entry.readings.filter(r=>r.warn).length;
        const col=alarmC>0?'#ef4444':warnC>0?'#f59e0b':'#16a34a';
        const lbl=alarmC>0?alarmC+' Alarm(e)':warnC>0?warnC+' Warnung(en)':'Alle OK';
        item.innerHTML='<div class="si-name"><span class="status-dot" style="background:'+col+';"></span>'+dayLabel(d)+'</div>'+
          '<div class="si-detail" style="color:'+col+';font-weight:700;">'+lbl+' · '+entry.ma+'</div>';
      }
      tempCard.appendChild(item);
    });
  }
  wocheDiv.appendChild(tempCard);

  if(sorted.length>0){
    wocheDiv.appendChild(mkSec('🔍 Häufigste Probleme'));
    const spCard=document.createElement('div');spCard.className='sl-card';
    sorted.slice(0,5).forEach(([r,c])=>{
      const item=document.createElement('div');item.className='sl-item';
      const maxC=sorted[0][1];
      const barW=Math.round(c/maxC*100);
      item.innerHTML='<div class="si-name">'+r+'</div>'+
        '<div style="display:flex;align-items:center;gap:8px;margin-top:4px;">'+
        '<div style="flex:1;height:6px;background:#f0f0f0;border-radius:3px;">'+
        '<div style="width:'+barW+'%;height:100%;background:#ef4444;border-radius:3px;"></div></div>'+
        '<div style="font-size:11px;font-weight:700;color:#ef4444;min-width:20px;">'+c+'×</div></div>';
      spCard.appendChild(item);
    });
    wocheDiv.appendChild(spCard);
  }
  body.appendChild(wocheDiv);

  // ── REPORT ───────────────────────────────────
  const reportDiv=document.createElement('div');
  reportDiv.id='content-report';reportDiv.className='sl-tab-content';reportDiv.style.display='none';

  // Calculate monthly stats
  const thisMonth=now.getMonth();
  const thisYear=now.getFullYear();
  const monthHist=history.filter(h=>{
    try{const d=new Date(h.ts.split(', ')[0].split('.').reverse().join('-'));return d.getMonth()===thisMonth&&d.getFullYear()===thisYear;}catch(e){return false;}
  });
  const monthDone=monthHist.filter(h=>h.done).length;
  const monthND=monthHist.filter(h=>!h.done).length;
  const monthTotal=monthDone+monthND;
  const monthPct=monthTotal>0?Math.round(monthDone/monthTotal*100):0;

  const weekHist=history.filter(h=>{
    try{const d=new Date(h.ts.split(', ')[0].split('.').reverse().join('-'));const diff=(now-d)/(1000*60*60*24);return diff<=7;}catch(e){return false;}
  });
  const weekPct=weekHist.length>0?Math.round(weekHist.filter(h=>h.done).length/weekHist.length*100):0;

  // Report container (screenshot-ready)
  const reportBox=document.createElement('div');
  reportBox.id='report-box';
  reportBox.style.cssText='background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.1);';

  const mo=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  reportBox.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;border-bottom:2px solid #0f3460;padding-bottom:12px;">
      <div>
        <div style="font-size:18px;font-weight:900;color:#0f3460;">Schichtbericht</div>
        <div style="font-size:12px;color:var(--gt);margin-top:2px;">Prima Supermarkt Reutlingen · ${mo[thisMonth]} ${thisYear}</div>
      </div>
      <div style="font-size:10px;color:var(--gt);text-align:right;">Erstellt: ${now.toLocaleString('de-DE')}</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
      <div style="background:#f0f8f0;border-radius:10px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:900;color:${monthPct>=80?'#16a34a':monthPct>=50?'#f0a500':'#ef4444'};">${monthPct}%</div>
        <div style="font-size:10px;color:var(--gt);margin-top:2px;">Monatsquote</div>
      </div>
      <div style="background:#f0f8f0;border-radius:10px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:900;color:${weekPct>=80?'#16a34a':weekPct>=50?'#f0a500':'#ef4444'};">${weekPct}%</div>
        <div style="font-size:10px;color:var(--gt);margin-top:2px;">Wochenquote</div>
      </div>
      <div style="background:#fff5f5;border-radius:10px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:900;color:#ef4444;">${monthND}</div>
        <div style="font-size:10px;color:var(--gt);margin-top:2px;">Nicht erledigt</div>
      </div>
    </div>

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">Letzte 7 Tage</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px;">
      <tr style="background:#f4f4f4;">
        <th style="padding:7px 10px;text-align:left;border-radius:6px 0 0 6px;">Tag</th>
        <th style="padding:7px 10px;text-align:center;">Quote</th>
        <th style="padding:7px 10px;text-align:center;">Erledigt</th>
        <th style="padding:7px 10px;text-align:center;">Offen</th>
        <th style="padding:7px 10px;text-align:center;border-radius:0 6px 6px 0;">Übergabe</th>
      </tr>
      ${last7.slice().reverse().map(d=>{
        const dh=getHistForDay(d);
        const done=dh.filter(h=>h.done).length;
        const nd=dh.filter(h=>!h.done).length;
        const total=done+nd;
        const pct=total>0?Math.round(done/total*100):null;
        const dub=getUBForDay(d);
        const ubOK=dub.length>0&&dub.every(u=>u.status==='accepted');
        const ubBad=dub.some(u=>u.status==='rejected');
        const ubOpen=dub.some(u=>u.status==='open');
        const ubLabel=dub.length===0?'<span style="color:#ef4444;">Keine</span>':ubBad?'<span style="color:#ef4444;">Abgelehnt</span>':ubOpen?'<span style="color:#f0a500;">Offen</span>':'<span style="color:#16a34a;">✅ OK</span>';
        const isToday=dayKey(d)===dayKey(now);
        return '<tr style="border-bottom:1px solid #f0f0f0;'+(isToday?'background:#f0f7ff;':'')+'">'+
          '<td style="padding:7px 10px;font-weight:'+(isToday?'700':'500')+';">'+dayLabel(d)+(isToday?' 📍':'')+'</td>'+
          '<td style="padding:7px 10px;text-align:center;font-weight:700;color:'+(pct===null?'#ccc':pct>=80?'#16a34a':pct>=50?'#f0a500':'#ef4444')+'">'+(pct===null?'–':pct+'%')+'</td>'+
          '<td style="padding:7px 10px;text-align:center;color:#16a34a;">'+done+'</td>'+
          '<td style="padding:7px 10px;text-align:center;color:'+(nd>0?'#ef4444':'#16a34a')+'">'+nd+'</td>'+
          '<td style="padding:7px 10px;text-align:center;">'+ubLabel+'</td>'+
          '</tr>';
      }).join('')}
    </table>

    ${sorted.length>0?`
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">Top Problemgründe</div>
    <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:14px;">
      ${sorted.slice(0,4).map(([r,c])=>`
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:12px;flex:1;">${r}</div>
          <div style="width:80px;height:6px;background:#f0f0f0;border-radius:3px;">
            <div style="width:${Math.round(c/sorted[0][1]*100)}%;height:100%;background:#ef4444;border-radius:3px;"></div>
          </div>
          <div style="font-size:11px;font-weight:700;color:#ef4444;min-width:24px;">${c}×</div>
        </div>`).join('')}
    </div>`:''}

    <div style="font-size:9px;color:#ccc;text-align:center;border-top:1px solid #f0f0f0;padding-top:8px;">
      Prima Supermarkt Reutlingen GmbH · Automatisch generierter Schichtbericht
    </div>
  `;

  reportDiv.appendChild(reportBox);

  // Screenshot button
  const screenshotBtn=document.createElement('button');
  screenshotBtn.style.cssText='width:100%;background:#0f3460;color:#fff;border:none;border-radius:12px;padding:14px;font-size:14px;font-weight:800;cursor:pointer;margin-top:12px;font-family:inherit;';
  screenshotBtn.innerHTML='📸 Report als Screenshot speichern';
  screenshotBtn.onclick=()=>{
    alert('📸 Anleitung:\n\n1. Tippe auf den Report oben\n2. Mache einen Screenshot (Seitentaste + Lauter)\n3. Zuschneiden auf den Report-Bereich\n4. An Geschäftsleitung senden\n\nOder: Teile den Screenshot direkt über WhatsApp / E-Mail.');
  };
  reportDiv.appendChild(screenshotBtn);
  body.appendChild(reportDiv);
}





