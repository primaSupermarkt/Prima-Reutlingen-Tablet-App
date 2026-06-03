// ═══════════════════════════════════════════════════════════════
// INVENTUR.JS
// Temperaturkontrolle, Inventur, Slush, Kaffee, Waschmaschine
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════
// TEMPERATURKONTROLLE
// ═══════════════════════════════════════════
function openTempControl() {
  var todayStr = new Date().toISOString().slice(0,10);
  var bereitsHeute = tempHistory.some(function(h){ return (h.date||h.datum)===todayStr; });
  if(bereitsHeute) {
    var entry = tempHistory.slice().reverse().find(function(h){ return (h.date||h.datum)===todayStr; });
    var wer = entry&&entry.ma ? ' von '+entry.ma : '';
    var wann = entry&&entry.ts ? ' um '+(entry.ts.slice(11,16)||entry.ts.slice(0,5))+' Uhr' : '';
    alert('\u2705 Temperaturkontrolle heute bereits erfasst'+wer+wann+'. Eine erneute Erfassung ist erst morgen m\u00f6glich.');
    return;
  }
  tempCurrentSession = {};
  renderTempBody();
  go('s-temp');
}

function renderTempBody() {
  var body = document.getElementById('temp-body');
  if(!body) return;
  body.innerHTML = '';

  var todayStr = new Date().toISOString().slice(0,10);
  var tempBereitsHeute = tempHistory.some(function(h){ return (h.date||h.datum)===todayStr; });

  // Wenn heute schon erfasst: zeige Hinweis
  if(tempBereitsHeute) {
    var entry = tempHistory.slice().reverse().find(function(h){ return (h.date||h.datum)===todayStr; });
    var infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'background:#dcfce7;border-radius:10px;padding:12px;margin-bottom:12px;font-size:13px;font-weight:700;color:#15803d;text-align:center;';
    infoDiv.textContent = '✅ Heute bereits erfasst' + (entry&&entry.ma?' von '+entry.ma:'') + (entry&&entry.ts?' um '+entry.ts.slice(11,16)+' Uhr':'');
    body.appendChild(infoDiv);
  }

  var kuehl = TEMP_DEVICES.filter(function(d){ return d.type==='kuehl'; });
  var tiefkuehl = TEMP_DEVICES.filter(function(d){ return d.type==='tiefkuehl'; });

  var renderGruppe = function(titel, devices) {
    var h = document.createElement('div');
    h.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin:10px 0 6px;';
    h.textContent = titel;
    body.appendChild(h);

    devices.forEach(function(dev) {
      // Vorausgefüllter Wert: Mitte des Sollbereichs
      var defaultVal = dev.type === 'tiefkuehl' ? -20 : Math.round((dev.sollMin + dev.sollMax) / 2);
      // Bereits eingegebener Wert nutzen falls vorhanden
      var sessVal = (tempCurrentSession[dev.id] && tempCurrentSession[dev.id].ist !== undefined)
        ? tempCurrentSession[dev.id].ist : defaultVal;

      // Wert in Session vorbelegen
      if(!tempCurrentSession[dev.id]) {
        tempCurrentSession[dev.id] = {ist: defaultVal};
      }

      var alarm = isAlarmTemp(dev, sessVal);
      var warn  = !alarm && isWarnTemp(dev, sessVal);
      var bgColor = alarm ? '#fff5f5' : warn ? '#fffbeb' : '#f0fdf4';
      var borderColor = alarm ? '#ef4444' : warn ? '#f59e0b' : '#16a34a';
      var statusIcon = alarm ? '🚨' : warn ? '⚠️' : '✅';
      var sollLabel = dev.type === 'tiefkuehl' ? '≤ −18°C' : '+'+dev.sollMin+' bis +'+dev.sollMax+'°C';

      var card = document.createElement('div');
      card.id = 'temp-card-' + dev.id;
      card.style.cssText = 'background:'+bgColor+';border:2px solid '+borderColor+';border-radius:12px;padding:12px 14px;margin-bottom:8px;';

      card.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
          '<div>' +
            '<div style="font-size:13px;font-weight:700;">Nr.'+dev.nr+' – '+dev.name+'</div>' +
            '<div style="font-size:11px;color:#888;margin-top:1px;">Soll: '+sollLabel+'</div>' +
          '</div>' +
          '<div id="temp-status-'+dev.id+'" style="font-size:22px;">'+statusIcon+'</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<button data-dev="'+dev.id+'" data-dir="-1" style="background:#f0f0f0;border:none;border-radius:8px;width:42px;height:42px;font-size:22px;font-weight:900;cursor:pointer;touch-action:manipulation;">−</button>' +
          '<div style="flex:1;text-align:center;">' +
            '<span id="temp-val-'+dev.id+'" style="font-size:30px;font-weight:900;color:#1e3a5f;">'+sessVal+'</span>' +
            '<span style="font-size:16px;color:#888;">°C</span>' +
          '</div>' +
          '<button data-dev="'+dev.id+'" data-dir="1" style="background:#f0f0f0;border:none;border-radius:8px;width:42px;height:42px;font-size:22px;font-weight:900;cursor:pointer;touch-action:manipulation;">+</button>' +
        '</div>';

      body.appendChild(card);

      // +/- Buttons per addEventListener
      card.querySelectorAll('button[data-dev]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var devId = this.getAttribute('data-dev');
          var dir = parseInt(this.getAttribute('data-dir'));
          var curDev = TEMP_DEVICES.find(function(d){ return d.id===devId; });
          if(!tempCurrentSession[devId]) tempCurrentSession[devId] = {ist: defaultVal};
          var newVal = Math.round((tempCurrentSession[devId].ist + dir * 0.5) * 10) / 10;
          tempCurrentSession[devId].ist = newVal;
          document.getElementById('temp-val-'+devId).textContent = newVal;
          // Status aktualisieren
          var a = isAlarmTemp(curDev, newVal);
          var w = !a && isWarnTemp(curDev, newVal);
          var cardEl = document.getElementById('temp-card-'+devId);
          if(cardEl) {
            cardEl.style.background = a?'#fff5f5':w?'#fffbeb':'#f0fdf4';
            cardEl.style.borderColor = a?'#ef4444':w?'#f59e0b':'#16a34a';
          }
          document.getElementById('temp-status-'+devId).textContent = a?'🚨':w?'⚠️':'✅';
          // Fortschritt aktualisieren
          var done2 = TEMP_DEVICES.filter(function(d){ return tempCurrentSession[d.id]!==undefined; }).length;
          document.getElementById('temp-submit-btn').style.display = done2===TEMP_DEVICES.length?'block':'none';
        });
      });
    });
  }

  renderGruppe('🥛 Kühlgeräte (Laden)', kuehl);
  renderGruppe('🧊 Tiefkühlgeräte', tiefkuehl);

  // Fortschrittsbalken
  var done = TEMP_DEVICES.filter(function(d){ return tempCurrentSession[d.id]!==undefined; }).length;
  $style('temp-prog', 'width', Math.round(done/TEMP_DEVICES.length*100)+'%');
  $style('temp-submit-btn', 'display', 'block');  // Immer sichtbar weil Werte vorausgefüllt
}

function buildDeviceCard(dev) {
  const sess = tempCurrentSession[dev.id];
  const hasMeasured = sess !== undefined;
  const ist = sess ? sess.ist : null;
  const alarm = hasMeasured ? isAlarmTemp(dev, ist) : false;
  const warn  = hasMeasured && !alarm ? isWarnTemp(dev, ist) : false;
  const bg = !hasMeasured ? '#fff' : alarm ? '#fff5f5' : warn ? '#fffbeb' : '#f0fdf4';
  const border = !hasMeasured ? '#e0e0e0' : alarm ? '#ef4444' : warn ? '#f59e0b' : '#16a34a';
  const sollLabel = dev.type === 'tiefkuehl' ? '≤ −18°C' : '+'+dev.sollMin+' bis +'+dev.sollMax+'°C';
  return `<div style="background:${bg};border:2px solid ${border};border-radius:12px;padding:12px 14px;margin-bottom:8px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${hasMeasured?'8':'0'}px;">
      <div><div style="font-size:13px;font-weight:700;">Nr.${dev.nr} – ${dev.name}</div><div style="font-size:11px;color:#888;margin-top:2px;">Soll: ${sollLabel}</div></div>
      ${hasMeasured ? `<div style="font-size:22px;font-weight:900;color:${alarm?'#ef4444':warn?'#f59e0b':'#16a34a'};">${ist}°C</div>` : ''}
    </div>
    ${hasMeasured ? `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
      ${alarm ? '<span style="background:#fee2e2;color:#dc2626;border-radius:6px;padding:3px 9px;font-size:11px;font-weight:700;">🚨 ALARM!</span>' : ''}
      ${warn  ? '<span style="background:#fef3c7;color:#92400e;border-radius:6px;padding:3px 9px;font-size:11px;font-weight:700;">⚠️ Warnung</span>' : ''}
      ${(!alarm&&!warn) ? '<span style="background:#dcfce7;color:#15803d;border-radius:6px;padding:3px 9px;font-size:11px;font-weight:700;">✅ OK</span>' : ''}
      <button onclick="inputTempDevice('${dev.id}')" style="background:#f4f4f4;border:none;border-radius:6px;padding:3px 9px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">✏️</button>
    </div>` :
    `<button onclick="inputTempDevice('${dev.id}')" style="width:100%;background:#0369a1;color:#fff;border:none;border-radius:9px;padding:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">🌡️ Temperatur eingeben</button>`}
  </div>`;
}

function checkTemp(dev, ist) {
  if(dev.type==='tiefkuehl') return ist <= -18;
  return ist >= dev.sollMin && ist <= dev.sollMax;
}

function isWarnTemp(dev, ist) {
  if(dev.type==='tiefkuehl') return ist > -18 && ist <= dev.alarmAt;
  return ist > dev.warnAt && ist <= dev.alarmAt;
}

function isAlarmTemp(dev, ist) {
  if(dev.type==='tiefkuehl') return ist > dev.alarmAt;
  return ist > dev.alarmAt;
}

function inputTempDevice(devId) {
  tempInputTarget = devId;
  const dev = TEMP_DEVICES.find(d => d.id === devId);
  const prev = tempCurrentSession[devId];
  $text('temp-inp-title', dev.name);
  $text('temp-inp-soll', dev.type==='tiefkuehl' ? '≤ −18°C' : '+'+dev.sollMin+' bis +'+dev.sollMax+'°C');
  $set('temp-inp-val', 'value', prev ? prev.ist : '');
  const ovTmp=document.getElementById('ov-temp-input');if(ovTmp)ovTmp.classList.add('show');
  setTimeout(function(){try{const el=document.getElementById('temp-inp-val');if(el)el.focus();}catch(e){}},100);
}

function editTempDevice(devId) { inputTempDevice(devId); }

function saveTempInput() {
  const val = parseFloat(document.getElementById('temp-inp-val').value);
  if(isNaN(val)) { alert('Bitte eine Zahl eingeben.'); return; }
  tempCurrentSession[tempInputTarget] = {ist: val};
  closeOv('ov-temp-input');
  renderTempBody();
}


function submitTemp() {
  const today = new Date().toISOString().slice(0,10);
  // Doppelte Erfassung verhindern
  if(tempHistory.some(function(h){ return (h.date||h.datum)===today; })) {
    alert('Temperaturkontrolle für heute wurde bereits erfasst.');
    go('s-cl');
    return;
  }
  const readings = TEMP_DEVICES.map(dev => {
    const sess = tempCurrentSession[dev.id] || {ist: null};
    const alarm = sess.ist !== null ? isAlarmTemp(dev, sess.ist) : false;
    const warn  = sess.ist !== null ? isWarnTemp(dev, sess.ist) : false;
    return {deviceId:dev.id, name:dev.name, nr:dev.nr, ist:sess.ist, alarm, warn, ok:!alarm&&!warn};
  });
  const entry = {
    id: 'tmp'+Date.now(),
    date: today,
    ts: new Date().toLocaleString('de-DE'),
    ma: st.name,
    readings
  };
  tempHistory.push(entry);
  // Keep 30 days
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-30);
  tempHistory = tempHistory.filter(h => new Date(h.date) >= cutoff);
  lsSave('tempHistory', tempHistory);

  const alarmCount = readings.filter(r=>r.alarm).length;
  const warnCount  = readings.filter(r=>r.warn).length;

  // Mark the task as done
  const tempTaskId = getMyTasks().find(function(t){return t.special==='temp';});
  // Alle Temp-Tasks aller Rollen als erledigt markieren (oncePerDay für den ganzen Tag)
  var doneTs = new Date().toLocaleString('de-DE');
  var doneBy = st.name || 'Unbekannt';
  Object.keys(rollenAufgaben).forEach(function(key) {
    (rollenAufgaben[key] || []).forEach(function(t) {
      if(t.special === 'temp') {
        clState[t.id] = {status:'done', who:doneBy, ts:doneTs};
      }
    });
  });
  // Auch Bake-Off Task (eb7)
  clState['eb7'] = {status:'done', who:doneBy, ts:doneTs};
  lsSave('clState', clState);
  fbSave('clState', clState);

  go('s-cl');
  if(alarmCount>0) setTimeout(function(){try{alert('ACHTUNG: '+alarmCount+' Geraet(e) haben Alarmtemperatur!');}catch(e){}},300);
  else renderCL();
}

function openInventurInfo() {
  const dow = new Date().getDay();
  const bereich = INV_BEREICHE[dow] || 'Allgemein';
  const anzahl = INV_ANZAHL[dow] || 10;
  $text('inv-title', 'Inventur: ' + bereich + ' (' + anzahl + ' Artikel)');
  inventurRows = [];
  // Pre-fill empty rows
  for(let i=0;i<anzahl;i++){
    inventurRows.push({id:'ir'+Date.now()+i, artikel:'', barcode:'', soll:'', ist:''});
  }
  renderInventur();
  go('s-inventur');
}

function renderInventur(){
  const body = document.getElementById('inv-body');
  body.innerHTML = '';
  const filled = inventurRows.filter(r=>r.artikel.trim()).length;
  $style('inv-prog', 'width', (inventurRows.length?Math.round(filled/inventurRows.length*100):0)+'%');

  inventurRows.forEach((row,idx)=>{
    const card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:12px;padding:12px 13px;margin-bottom:8px;box-shadow:0 1px 6px rgba(0,0,0,.07);';

    const rowNum = document.createElement('div');
    rowNum.style.cssText = 'font-size:10px;font-weight:700;color:#999;margin-bottom:8px;';
    rowNum.textContent = 'Artikel ' + (idx+1);
    card.appendChild(rowNum);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';

    var mkInput = function(label, field, placeholder, type) {
      const wrap = document.createElement('div');
      const lbl = document.createElement('label');
      lbl.style.cssText = 'font-size:10px;font-weight:700;color:#666;display:block;margin-bottom:3px;';
      lbl.textContent = label;
      const inp = document.createElement('input');
      inp.type = type||'text';
      inp.placeholder = placeholder;
      inp.value = row[field]||'';
      inp.style.cssText = 'width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:8px 9px;font-size:14px;font-family:inherit;outline:none;';
      inp.addEventListener('input', (function(r,f,i){
        return function(){r[f]=this.value;updateDiff(idx);};
      })(row,field,inp));
      inp.addEventListener('focus', function(){this.style.borderColor='#0f766e';});
      inp.addEventListener('blur', function(){this.style.borderColor='#e0e0e0';});
      wrap.appendChild(lbl);wrap.appendChild(inp);
      return wrap;
    }

    // Row 1: Artikel + Barcode
    const artWrap = document.createElement('div');
    artWrap.style.cssText = 'grid-column:1/-1;';
    const artLbl = document.createElement('label');
    artLbl.style.cssText = 'font-size:10px;font-weight:700;color:#666;display:block;margin-bottom:3px;';
    artLbl.textContent = 'Artikelname';
    const artInp = document.createElement('input');
    artInp.type='text';artInp.placeholder='z.B. Alpenmilch 3,5%';artInp.value=row.artikel||'';
    artInp.style.cssText='width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:8px 9px;font-size:14px;font-family:inherit;outline:none;margin-bottom:0;';
    artInp.addEventListener('input',(function(r){return function(){r.artikel=this.value;};})(row));
    artWrap.appendChild(artLbl);artWrap.appendChild(artInp);
    grid.appendChild(artWrap);

    // Barcode field with scan button
    const bcWrap = document.createElement('div');
    const bcLbl = document.createElement('label');
    bcLbl.style.cssText = 'font-size:10px;font-weight:700;color:#666;display:block;margin-bottom:3px;';
    bcLbl.textContent = 'Barcode/EAN';
    const bcRow = document.createElement('div');
    bcRow.style.cssText = 'display:flex;gap:6px;align-items:center;';
    const bcInp = document.createElement('input');
    bcInp.type='text';bcInp.placeholder='z.B. 4000521021009';bcInp.value=row.barcode||'';
    bcInp.style.cssText='flex:1;border:1.5px solid #e0e0e0;border-radius:8px;padding:8px 9px;font-size:14px;font-family:inherit;outline:none;';
    bcInp.addEventListener('input',(function(r){return function(){r.barcode=this.value;};})(row));
    bcInp.addEventListener('focus',function(){this.style.borderColor='#0f766e';});
    bcInp.addEventListener('blur',function(){this.style.borderColor='#e0e0e0';});
    const scanBtn = document.createElement('button');
    scanBtn.className='scan-btn';
    scanBtn.innerHTML='&#x1F4F7;';
    scanBtn.title='Barcode scannen';
    (function(r,inp){
      scanBtn.onclick=function(e){
        e.stopPropagation();
        openScanner(function(code){
          r.barcode=code;
          inp.value=code;
        });
      };
    })(row, bcInp);
    bcRow.appendChild(bcInp);bcRow.appendChild(scanBtn);
    bcWrap.appendChild(bcLbl);bcWrap.appendChild(bcRow);
    grid.appendChild(bcWrap);
    grid.appendChild(mkInput('Soll-Menge','soll','z.B. 12','number'));
    grid.appendChild(mkInput('Ist-Menge','ist','Gezählt...','number'));

    // VK Preis field (full width)
    const vkWrap = document.createElement('div');
    vkWrap.style.cssText = 'grid-column:1/-1;';
    const vkLbl = document.createElement('label');
    vkLbl.style.cssText = 'font-size:10px;font-weight:700;color:#666;display:block;margin-bottom:3px;';
    vkLbl.textContent = 'VK-Preis (€)';
    const vkInp = document.createElement('input');
    vkInp.type='number';vkInp.step='0.01';vkInp.placeholder='z.B. 1.99';vkInp.value=row.vk||'';
    vkInp.style.cssText='width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:8px 9px;font-size:14px;font-family:inherit;outline:none;';
    vkInp.addEventListener('input',(function(r){return function(){r.vk=this.value;updateDiff(idx);};})(row));
    vkInp.addEventListener('focus',function(){this.style.borderColor='#0f766e';});
    vkInp.addEventListener('blur',function(){this.style.borderColor='#e0e0e0';});
    vkWrap.appendChild(vkLbl);vkWrap.appendChild(vkInp);
    grid.appendChild(vkWrap);

    const istWrap = {querySelector:function(){return null;}}; // placeholder
    // ist field already added above

    card.appendChild(grid);

    // Diff display
    const diffDiv = document.createElement('div');
    diffDiv.id = 'diff-'+row.id;
    diffDiv.style.cssText = 'margin-top:8px;font-size:12px;font-weight:700;display:none;';
    card.appendChild(diffDiv);

    body.appendChild(card);

    // Update diff if values exist
    if(row.soll && row.ist) updateDiff(idx);
  });
}

function updateDiff(idx){
  const row = inventurRows[idx];
  const diffDiv = document.getElementById('diff-'+row.id);
  if(!diffDiv) return;
  const soll = parseFloat(row.soll);
  const ist  = parseFloat(row.ist);
  const vk   = parseFloat(row.vk);
  if(isNaN(soll)||isNaN(ist)){diffDiv.style.display='none';return;}
  const diffStk = ist - soll;
  const diffEur = !isNaN(vk) ? Math.round(diffStk*vk*100)/100 : null;
  diffDiv.style.display = 'block';
  if(diffStk===0){
    diffDiv.style.color='#16a34a';
    diffDiv.textContent='✅ Kein Fehlbestand';
  } else if(diffStk<0){
    diffDiv.style.color='#dc2626';
    const eurTxt = diffEur!==null ? ' = ' + Math.abs(diffEur).toFixed(2).replace('.',',') + ' €' : '';
    diffDiv.textContent='⚠️ Fehlbestand: '+Math.abs(diffStk)+' Stück fehlen'+eurTxt;
  } else {
    diffDiv.style.color='#f59e0b';
    const eurTxt = diffEur!==null ? ' = +' + diffEur.toFixed(2).replace('.',',') + ' €' : '';
    diffDiv.textContent='ℹ️ Überschuss: '+diffStk+' Stück mehr'+eurTxt;
  }
}

function addInventurRow(){
  inventurRows.push({id:'ir'+Date.now(), artikel:'', barcode:'', soll:'', ist:''});
  renderInventur();
  // Scroll to bottom
  const body=document.getElementById('inv-body');
  setTimeout(function(){try{if(body)body.scrollTop=body.scrollHeight;}catch(e){}},100);
}

function submitInventur(){
  const filled = inventurRows.filter(r=>r.artikel.trim()&&r.soll!==''&&r.ist!=='');
  if(!filled.length){alert('Bitte mindestens einen Artikel mit Soll- und Ist-Menge eingeben.');return;}

  const dow=new Date().getDay();
  const diffs = filled.filter(r=>parseFloat(r.ist)!==parseFloat(r.soll)).map(r=>{
    const diffStk = parseFloat(r.ist)-parseFloat(r.soll);
    const vk = parseFloat(r.vk)||0;
    const diffEur = Math.round(diffStk*vk*100)/100;
    return Object.assign({},r,{diffStk,diffEur});
  });
  const totalDiffEur = Math.round(diffs.reduce((s,r)=>s+r.diffEur,0)*100)/100;
  const session = {
    id:'inv'+Date.now(),
    date:new Date().toISOString().slice(0,10),
    ts:new Date().toLocaleString('de-DE'),
    ma:st.name||'Unbekannt',
    bereich:INV_BEREICHE[dow]||'Allgemein',
    rows:filled,
    differenzen:diffs,
    totalDiffEur,
  };
  inventurHistory.push(session);
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-90);
  inventurHistory=inventurHistory.filter(h=>new Date(h.date)>=cutoff);
  lsSave('inventurHistory',inventurHistory);

  // Alert if differenzen
  if(session.differenzen.length>0){
    const diffsText=session.differenzen.map(r=>r.artikel+': '+r.diffEur.toFixed(2).replace('.',',')+' €').join('\n');
    alert('⚠️ '+session.differenzen.length+' Abweichung(en):\n\n'+diffsText+'\n\nGesamt: '+totalDiffEur.toFixed(2).replace('.',',')+'€\n\nSchichtleiter wurde informiert!');
    mitarbeiterNachrichten.push({
      ts:session.ts,
      name:st.name||'Unbekannt',
      text:'📋 Inventur '+session.bereich+': '+session.differenzen.length+' Abweichung(en), Differenz gesamt: '+totalDiffEur.toFixed(2).replace('.',',')+'€',
      schicht:slbls[st.schicht],
      gelesen:false,
      type:'inventur'
    });
    lsSave('mitNachrichten',mitarbeiterNachrichten);
    updateSLBadge();
  }

  // Mark task done
  const invTask=getMyTasks().find(t=>t.special==='inventur');
  if(invTask)markDone(invTask.id);

  go('s-cl');renderCL();
}

function openSlushScreen() {
  const lastEntry = slushHistory.length ? slushHistory[slushHistory.length-1] : null;
  const lastDate = lastEntry ? lastEntry.date : null;
  const now = new Date();
  const nowStr2 = now.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});

  // Check if already done this week
  let daysSince = 999;
  if(lastDate) {
    const last = new Date(lastDate);
    daysSince = Math.floor((now - last) / (1000*60*60*24));
  }

  $text('slush-ma-name', st.name || '–');
  $text('slush-date-display', nowStr2);
  $text('slush-last-date', lastDate ?
    new Date(lastDate).toLocaleDateString('de-DE') + (daysSince<=7?' ✅ (diese Woche)':' ⚠️ ('+daysSince+' Tage her)') : 'Noch nie');

  // Render history
  const list = document.getElementById('slush-history-list');
  if(list) {
    if(!slushHistory.length) {
      list.innerHTML = '<div style="text-align:center;padding:20px;color:#ccc;">Noch keine Einträge</div>';
    } else {
      list.innerHTML = [...slushHistory].reverse().slice(0,20).map(h =>
        `<div style="background:#fff;border-radius:10px;padding:11px 13px;margin-bottom:7px;box-shadow:0 1px 5px rgba(0,0,0,.06);">
          <div style="font-size:13px;font-weight:700;">✅ Reinigung durchgeführt</div>
          <div style="font-size:11px;color:#888;margin-top:2px;">👤 ${h.ma} · 🕐 ${h.ts}</div>
        </div>`
      ).join('');
    }
  }
  go('s-slush');
}

function confirmSlush() {
  const entry = {
    id: 'sl'+Date.now(),
    date: new Date().toISOString().slice(0,10),
    ts: new Date().toLocaleString('de-DE'),
    ma: st.name
  };
  slushHistory.push(entry);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-90); // keep 90 days for slush
  slushHistory = slushHistory.filter(h => new Date(h.date) >= cutoff);
  lsSave('slushHistory', slushHistory);

  // Mark task done
  const slushTask = getMyTasks().find(function(t){return t.special==='slush';});
  if(slushTask) markDone(slushTask.id);

  alert('✅ Slushmaschinen-Reinigung bestätigt und gespeichert!');
  go('s-cl');
  renderCL();
}

function showInfoChecklist(type) {
  const hdr = document.getElementById('icl-hdr');
  const sub = document.getElementById('icl-sub');
  const body = document.getElementById('icl-body');

  if(type==='temp') {
    hdr.style.background = '#0369a1';
    sub.textContent = '🌡️ Temperaturkontrolle';
    renderInfoTempCL(body);
  } else if(type==='slush') {
    hdr.style.background = '#7c3aed';
    sub.textContent = '🧊 Slushmaschine';
    renderInfoSlushCL(body);
  } else if(type==='kaffeemaschine') {
    hdr.style.background = '#92400e';
    sub.textContent = '☕ Kaffeemaschine';
    renderInfoKaffeeCL(body);
  } else if(type==='waschmaschine') {
    hdr.style.background = '#0f766e';
    sub.textContent = '🧹 Bodenmaschine';
    renderInfoWaschCL(body);
  }
  go('s-info-cl');
}

// ── TEMPERATURKONTROLLE INFO VIEW ────────────────────────────────────
function renderInfoTempCL(body) {
  body.innerHTML = '';
  const todayKey = new Date().toISOString().slice(0,10);
  const todayEntry = tempHistory.find(h=>h.date===todayKey);

  // Input section
  const inputSec = document.createElement('div');
  inputSec.style.cssText = 'padding:12px 14px;';
  inputSec.innerHTML = '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">📝 Heutige Messung</div>';

  if(todayEntry && !tempInputSession._editing) {
    // Show existing measurement
    const summary = document.createElement('div');
    summary.style.cssText = 'background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:10px;';
    const alarms = todayEntry.readings.filter(r=>r.alarm).length;
    const warns  = todayEntry.readings.filter(r=>r.warn).length;
    summary.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'+
      '<div style="font-size:13px;font-weight:700;">Gemessen von '+todayEntry.ma+'<br><span style="font-size:11px;color:#888;font-weight:400;">'+todayEntry.ts+'</span></div>'+
      '<div style="display:flex;gap:6px;">'+
      (alarms?'<span style="background:#fee2e2;color:#dc2626;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;">🚨'+alarms+'</span>':'')+
      (warns?'<span style="background:#fef3c7;color:#92400e;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;">⚠️'+warns+'</span>':'')+
      (!alarms&&!warns?'<span style="background:#dcfce7;color:#15803d;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;">✅ OK</span>':'')+
      '</div></div>';
    // Device table
    let tbl = '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    tbl += '<tr style="background:#f4f4f4;"><th style="padding:5px 8px;text-align:left;">Gerät</th><th style="padding:5px;text-align:center;">Soll</th><th style="padding:5px;text-align:center;">Ist</th><th style="padding:5px;text-align:center;">Status</th></tr>';
    todayEntry.readings.forEach(r=>{
      const dev=TEMP_DEVICES.find(d=>d.id===r.deviceId);
      const col=r.alarm?'#dc2626':r.warn?'#f59e0b':'#16a34a';
      const lbl=r.alarm?'🚨':r.warn?'⚠️':'✅';
      const soll=dev?(dev.type==='tiefkuehl'?'≤−18°C':'+'+dev.sollMin+'–+'+dev.sollMax+'°C'):'–';
      tbl+='<tr style="border-bottom:1px solid #f0f0f0;">'+
        '<td style="padding:5px 8px;font-size:11px;">'+r.name+'</td>'+
        '<td style="padding:5px;text-align:center;font-size:11px;color:#888;">'+soll+'</td>'+
        '<td style="padding:5px;text-align:center;font-size:12px;font-weight:700;color:'+col+';">'+r.ist+'°C</td>'+
        '<td style="padding:5px;text-align:center;">'+lbl+'</td>'+
        '</tr>';
    });
    tbl += '</table>';
    summary.innerHTML += tbl;
    inputSec.appendChild(summary);
    const editBtn = document.createElement('button');
    editBtn.style.cssText='width:100%;background:#f4f4f4;border:none;border-radius:9px;padding:11px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:10px;';
    editBtn.textContent='✏️ Werte korrigieren';
    editBtn.onclick=()=>{ tempInputSession={_editing:true}; renderInfoTempCL(body); };
    inputSec.appendChild(editBtn);
  } else {
    // Input form with pre-filled defaults
    const form = document.createElement('div');
    form.style.cssText='background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:10px;';

    let formHtml = '<div style="font-size:12px;color:#666;margin-bottom:10px;">Sollwerte sind vorausgefüllt. Nur bei Abweichung ändern.</div>';

    // Kühlgeräte
    formHtml += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:6px;">🥛 Kühlgeräte</div>';
    TEMP_DEVICES.filter(d=>d.type==='kuehl').forEach(dev=>{
      // Use last measured value as default, fallback to TEMP_DEFAULTS
      const lastEntry = tempHistory.length ? tempHistory[tempHistory.length-1] : null;
      const lastReading = lastEntry ? lastEntry.readings.find(r=>r.deviceId===dev.id) : null;
      const defaultVal = lastReading ? lastReading.ist : (TEMP_DEFAULTS[dev.id] || dev.sollMax);
      const curVal = tempInputSession[dev.id] !== undefined ? tempInputSession[dev.id] : defaultVal;
      const ok = curVal >= dev.sollMin && curVal <= dev.sollMax;
      formHtml += '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f0f0f0;">'+
        '<div style="flex:1;font-size:12px;font-weight:600;">'+dev.name+'<div style="font-size:10px;color:#888;">Soll: +'+dev.sollMin+' bis +'+dev.sollMax+'°C</div></div>'+
        '<div style="display:flex;align-items:center;gap:6px;">'+
          '<input type="number" step="0.1" value="'+curVal+'" id="ti-'+dev.id+'" data-devid="'+dev.id+'"'+
            ' style="width:70px;border:2px solid '+(ok?'#16a34a':'#ef4444')+';border-radius:8px;padding:7px 8px;font-size:14px;font-weight:700;text-align:center;font-family:inherit;outline:none;"'+
            ' onchange="updateTempInput(this.dataset.devid,this.value)">'+
          '<span style="font-size:11px;color:#888;">°C</span>'+
        '</div>'+
      '</div>';
    });

    // Tiefkühlgeräte
    formHtml += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin:10px 0 6px;">🧊 Tiefkühlgeräte</div>';
    TEMP_DEVICES.filter(d=>d.type==='tiefkuehl').forEach(dev=>{
      const lastEntry2 = tempHistory.length ? tempHistory[tempHistory.length-1] : null;
      const lastReading2 = lastEntry2 ? lastEntry2.readings.find(r=>r.deviceId===dev.id) : null;
      const defaultVal = lastReading2 ? lastReading2.ist : (TEMP_DEFAULTS[dev.id] || -21);
      const curVal = tempInputSession[dev.id] !== undefined ? tempInputSession[dev.id] : defaultVal;
      const ok = curVal <= -18;
      formHtml += '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f0f0f0;">'+
        '<div style="flex:1;font-size:12px;font-weight:600;">'+dev.name+'<div style="font-size:10px;color:#888;">Soll: ≤ −18°C</div></div>'+
        '<div style="display:flex;align-items:center;gap:6px;">'+
          '<input type="number" step="0.1" value="'+curVal+'" id="ti-'+dev.id+'" data-devid="'+dev.id+'"'+
            ' style="width:70px;border:2px solid '+(ok?'#16a34a':'#ef4444')+';border-radius:8px;padding:7px 8px;font-size:14px;font-weight:700;text-align:center;font-family:inherit;outline:none;"'+
            ' onchange="updateTempInput(this.dataset.devid,this.value)">'+
          '<span style="font-size:11px;color:#888;">°C</span>'+
        '</div>'+
      '</div>';
    });

    form.innerHTML = formHtml;
    inputSec.appendChild(form);

    const saveBtn = document.createElement('button');
    saveBtn.style.cssText='width:100%;background:#0369a1;color:#fff;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:10px;';
    saveBtn.textContent='✅ Temperaturkontrolle speichern';
    saveBtn.onclick=()=>saveInfoTemp(body);
    inputSec.appendChild(saveBtn);
  }
  body.appendChild(inputSec);

  // History
  renderTempHistorySection(body);
}

function updateTempInput(devId, val) {
  tempInputSession[devId] = parseFloat(val);
  // Update border color
  const inp = document.getElementById('ti-'+devId);
  const dev = TEMP_DEVICES.find(d=>d.id===devId);
  if(inp && dev) {
    const v = parseFloat(val);
    const ok = dev.type==='tiefkuehl' ? v<=-18 : v>=dev.sollMin && v<=dev.sollMax;
    inp.style.borderColor = ok ? '#16a34a' : '#ef4444';
  }
}

function saveInfoTemp(body) {
  const todayKey = new Date().toISOString().slice(0,10);
  const readings = TEMP_DEVICES.map(dev => {
    const defaultVal = TEMP_DEFAULTS[dev.id] || (dev.type==='tiefkuehl'?-21:4);
    const ist = tempInputSession[dev.id] !== undefined ? tempInputSession[dev.id] : defaultVal;
    const alarm = isAlarmTemp(dev, ist);
    const warn  = !alarm && isWarnTemp(dev, ist);
    return {deviceId:dev.id, name:dev.name, nr:dev.nr, ist, alarm, warn, ok:!alarm&&!warn};
  });
  const entry = {
    id:'tmp'+Date.now(),
    date:todayKey,
    ts:new Date().toLocaleString('de-DE'),
    ma:st.name||'Unbekannt',
    readings
  };
  // Remove existing today entry
  tempHistory = tempHistory.filter(h=>h.date!==todayKey);
  tempHistory.push(entry);
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-30);
  tempHistory=tempHistory.filter(h=>new Date(h.date)>=cutoff);
  lsSave('tempHistory',tempHistory);
  tempInputSession={};

  // Save once-per-day
  const doneKey='t_temp2_'+todayKey;
  onceDoneToday[doneKey]={who:st.name||'Info',ts:nowStr()};
  lsSave('onceDoneToday',onceDoneToday);

  renderInfoTempCL(body);
}

function renderTempHistorySection(body) {
  const sec = document.createElement('div');
  sec.style.cssText = 'padding:0 14px 24px;';
  sec.innerHTML = '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">📅 Historie (30 Tage)</div>';

  if(!tempHistory.length) {
    sec.innerHTML += '<div style="text-align:center;padding:20px;color:#ccc;">Noch keine Einträge</div>';
  } else {
    [...tempHistory].reverse().forEach(entry => {
      const alarms=entry.readings.filter(r=>r.alarm).length;
      const warns=entry.readings.filter(r=>r.warn).length;
      const d=document.createElement('div');
      d.style.cssText='background:#fff;border-radius:11px;padding:12px 14px;margin-bottom:8px;box-shadow:0 1px 5px rgba(0,0,0,.06);cursor:pointer;';
      const col=alarms?'#ef4444':warns?'#f59e0b':'#16a34a';
      d.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;">'+
        '<div style="font-size:13px;font-weight:700;">'+new Date(entry.date).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})+'</div>'+
        '<div style="color:'+col+';font-size:12px;font-weight:700;">'+(alarms?'🚨'+alarms+' Alarm':warns?'⚠️'+warns+' Warn.':'✅ Alle OK')+'</div>'+
      '</div>'+
      '<div style="font-size:11px;color:#888;margin-top:3px;">👤 '+entry.ma+' · '+entry.ts+(entry.slConfirmed?'<span style="color:#16a34a;"> · ✅ SL bestätigt</span>':'')+'</div>';
      // Toggle detail
      // Toggle detail table on tap
      let open=false;
      const toggleIcon=document.createElement('div');
      toggleIcon.style.cssText='font-size:11px;color:#888;margin-top:4px;';
      toggleIcon.textContent='▼ Alle Werte anzeigen';
      d.appendChild(toggleIcon);
      d.style.cursor='pointer';
      d.onclick=function(){
        open=!open;
        toggleIcon.textContent=open?'▲ Zuklappen':'▼ Alle Werte anzeigen';
        let det=d.querySelector('.temp-det');
        if(!det){
          det=document.createElement('div');det.className='temp-det';det.style.marginTop='8px';
          let tbl='<table style="width:100%;border-collapse:collapse;font-size:11px;">';
          tbl+='<tr style="background:#f4f4f4;"><th style="padding:5px 8px;text-align:left;">Gerät</th><th style="padding:5px 4px;text-align:center;">Soll</th><th style="padding:5px 4px;text-align:center;">Ist</th><th style="padding:5px;text-align:center;">Status</th></tr>';
          entry.readings.forEach(r=>{
            const dev=TEMP_DEVICES.find(d2=>d2.id===r.deviceId);
            const c=r.alarm?'#dc2626':r.warn?'#f59e0b':'#16a34a';
            const soll=dev?(dev.type==='tiefkuehl'?'≤−18°C':'+'+dev.sollMin+'-+'+dev.sollMax+'°C'):'';
            tbl+='<tr style="border-bottom:1px solid #f0f0f0;">'+
              '<td style="padding:5px 8px;font-size:11px;">'+r.name+'</td>'+
              '<td style="padding:5px 4px;text-align:center;font-size:10px;color:#888;">'+soll+'</td>'+
              '<td style="padding:5px 4px;text-align:center;font-weight:700;color:'+c+';">'+r.ist+'°C</td>'+
              '<td style="padding:5px;text-align:center;">'+(r.alarm?'🚨':r.warn?'⚠️':'✅')+'</td>'+
              '</tr>';
          });
          tbl+='</table>';
          det.innerHTML=tbl;d.appendChild(det);
        }
        det.style.display=open?'block':'none';
      };
      sec.appendChild(d);
    });
  }
  body.appendChild(sec);
}

// ── SLUSH INFO VIEW ─────────────────────────────────────────────────
function renderInfoSlushCL(body) {
  body.innerHTML='';
  const now=new Date();
  const lastEntry=slushHistory.length?slushHistory[slushHistory.length-1]:null;
  const daysSince=lastEntry?Math.floor((now-new Date(lastEntry.date))/(1000*60*60*24)):999;

  const sec=document.createElement('div');sec.style.cssText='padding:12px 14px 24px;';

  // Status card
  const statusCard=document.createElement('div');
  statusCard.style.cssText='background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:10px;';
  statusCard.innerHTML='<div style="font-size:15px;font-weight:800;color:'+(daysSince<=7?'#16a34a':daysSince<=14?'#f59e0b':'#ef4444')+';">'+(daysSince<=7?'✅ Diese Woche gereinigt':daysSince<=14?'⚠️ Vor '+daysSince+' Tagen':'🚨 Überfällig – seit '+daysSince+' Tagen!')+'</div>'+
    (lastEntry?'<div style="font-size:11px;color:#888;margin-top:4px;">Letzte Reinigung: 👤 '+lastEntry.ma+' · '+lastEntry.ts+'</div>':'<div style="font-size:11px;color:#ccc;margin-top:4px;">Noch keine Einträge</div>');
  sec.appendChild(statusCard);

  // Confirm form
  const formCard=document.createElement('div');
  formCard.style.cssText='background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:12px;';
  formCard.innerHTML='<div style="font-size:13px;font-weight:700;margin-bottom:10px;">🧊 Reinigung bestätigen</div>'+
    '<div style="font-size:12px;color:#666;margin-bottom:6px;">Durchgeführt von:</div>'+
    '<select id="slush-info-name" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px 10px;font-size:14px;font-family:inherit;margin-bottom:10px;outline:none;">'+
    names.map(n=>'<option'+(n===(st.name||'')?' selected':'')+'>'+n+'</option>').join('')+
    '</select>';
  const cfmBtn=document.createElement('button');
  cfmBtn.style.cssText='width:100%;background:#7c3aed;color:#fff;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;';
  cfmBtn.textContent='✅ Reinigung bestätigen';
  cfmBtn.onclick=()=>{
    const name=document.getElementById('slush-info-name').value||st.name||'Unbekannt';
    const entry={
      date:now.toISOString().slice(0,10),
      ts:now.toLocaleString('de-DE'),
      ma:name
    };
    slushHistory.push(entry);
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-365);// keep 1 year
    slushHistory=slushHistory.filter(h=>new Date(h.date)>=cutoff);
    lsSave('slushHistory',slushHistory);
    renderInfoSlushCL(body);
  };
  formCard.appendChild(cfmBtn);
  sec.appendChild(formCard);

  // Full history
  const histLabel=document.createElement('div');
  histLabel.style.cssText='font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;';
  histLabel.textContent='📅 Reinigungshistorie (komplett)';
  sec.appendChild(histLabel);

  if(!slushHistory.length){
    const empty=document.createElement('div');empty.style.cssText='text-align:center;padding:20px;color:#ccc;';empty.textContent='Noch keine Einträge';sec.appendChild(empty);
  } else {
    [...slushHistory].reverse().forEach(h=>{
      const item=document.createElement('div');
      item.style.cssText='background:#fff;border-radius:11px;padding:11px 13px;margin-bottom:7px;box-shadow:0 1px 5px rgba(0,0,0,.06);display:flex;align-items:center;justify-content:space-between;';
      item.innerHTML='<div><div style="font-size:13px;font-weight:700;">✅ '+new Date(h.date).toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})+'</div>'+
        '<div style="font-size:11px;color:#888;margin-top:2px;">👤 '+h.ma+' · 🕐 '+h.ts+'</div></div>';
      sec.appendChild(item);
    });
  }
  body.appendChild(sec);
}

// ── KAFFEEMASCHINE INFO VIEW ──────────────────────────────────────────
function renderInfoKaffeeCL(body) {
  body.innerHTML='';
  const today=new Date().toISOString().slice(0,10);
  const todayEntry=kaffeeHistory.find(h=>h.date===today);

  const inputSec=document.createElement('div');inputSec.style.padding='12px 14px';
  inputSec.innerHTML='<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">☕ Tägliche Reinigung</div>';

  if(todayEntry) {
    const card=document.createElement('div');
    card.style.cssText='background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:10px;';
    card.innerHTML='<div style="font-size:13px;font-weight:700;color:#16a34a;">✅ Heute erledigt</div>'+
      '<div style="font-size:11px;color:#888;margin-top:4px;">👤 '+todayEntry.ma+' · '+todayEntry.ts+'</div>';
    inputSec.appendChild(card);
  } else {
    if(!Object.keys(kaffeeStepState).length) kaffeeStepState={};
    const card=document.createElement('div');
    card.style.cssText='background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:10px;';
    KAFFEE_STEPS.forEach(step=>{
      const done=!!kaffeeStepState[step.id];
      const row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;gap:11px;padding:9px 0;border-bottom:1px solid #f0f0f0;cursor:pointer;';
      const cb=document.createElement('div');
      cb.style.cssText='width:22px;height:22px;border-radius:50%;border:2.5px solid '+(done?'#16a34a':'#ddd')+';flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;background:'+(done?'#16a34a':'#fff')+';color:'+(done?'#fff':'')+';';
      cb.textContent=done?'✓':'';
      const txt=document.createElement('div');
      txt.style.cssText='font-size:13px;font-weight:500;'+(done?'text-decoration:line-through;color:#aaa;':'');
      txt.textContent=step.text;
      row.appendChild(cb);row.appendChild(txt);
      (function(id,r){r.onclick=function(){kaffeeStepDOM(id,r,card,saveBtn);};})(step.id,row);
      card.appendChild(row);
    });
    inputSec.appendChild(card);
    const allDone=KAFFEE_STEPS.every(s=>kaffeeStepState[s.id]);
    const saveBtn=document.createElement('button');
    saveBtn.style.cssText='width:100%;background:'+(allDone?'#92400e':'#ccc')+';color:#fff;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:10px;';
    saveBtn.textContent='☕ Reinigung bestätigen';
    saveBtn.disabled=!allDone;
    saveBtn.onclick=function(){
      const entry={date:today,ts:new Date().toLocaleString('de-DE'),ma:st.name||'Unbekannt'};
      kaffeeHistory=kaffeeHistory.filter(h=>h.date!==today);
      kaffeeHistory.push(entry);
      const cutoff=new Date();cutoff.setDate(cutoff.getDate()-30);
      kaffeeHistory=kaffeeHistory.filter(h=>new Date(h.date)>=cutoff);
      lsSave('kaffeeHistory',kaffeeHistory);
      kaffeeStepState={};
      renderInfoKaffeeCL(body);
    };
    inputSec.appendChild(saveBtn);
  }
  body.appendChild(inputSec);

  // History
  const histSec=document.createElement('div');histSec.style.padding='0 14px 24px';
  histSec.innerHTML='<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">📅 Historie (30 Tage)</div>';
  if(!kaffeeHistory.length){
    histSec.innerHTML+='<div style="text-align:center;padding:20px;color:#ccc;">Noch keine Einträge</div>';
  } else {
    [...kaffeeHistory].reverse().forEach(h=>{
      histSec.innerHTML+='<div style="background:#fff;border-radius:11px;padding:11px 13px;margin-bottom:7px;box-shadow:0 1px 5px rgba(0,0,0,.06);">'+
        '<div style="font-size:13px;font-weight:700;">✅ '+new Date(h.date).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})+'</div>'+
        '<div style="font-size:11px;color:#888;margin-top:2px;">👤 '+h.ma+' · '+h.ts+'</div>'+
      '</div>';
    });
  }
  body.appendChild(histSec);
}

function kaffeeStepDOM(id, row, card, saveBtn) {
  kaffeeStepState[id]=!kaffeeStepState[id];
  const done=kaffeeStepState[id];
  const cb=row.children[0];
  const txt=row.children[1];
  if(cb){cb.style.background=done?'#16a34a':'#fff';cb.style.borderColor=done?'#16a34a':'#ddd';cb.style.color=done?'#fff':'';cb.textContent=done?'✓':'';}
  if(txt){txt.style.textDecoration=done?'line-through':'none';txt.style.color=done?'#aaa':'';}
  const allDone=KAFFEE_STEPS.every(s=>kaffeeStepState[s.id]);
  if(saveBtn){saveBtn.disabled=!allDone;saveBtn.style.background=allDone?'#92400e':'#ccc';}
}

function kaffeeStep(id, el) { /* legacy - not used */ }

// ── WASCHMASCHINE INFO VIEW ──────────────────────────────────────────
function renderInfoWaschCL(body) {
  body.innerHTML='';
  const sec=document.createElement('div');sec.style.padding='12px 14px 24px';

  const lastEntry=waschHistory.length?waschHistory[waschHistory.length-1]:null;
  const daysSince=lastEntry?Math.floor((new Date()-new Date(lastEntry.date))/(1000*60*60*24)):999;

  const infoCard=document.createElement('div');
  infoCard.style.cssText='background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:10px;';
  infoCard.innerHTML='<div style="font-size:13px;font-weight:700;color:'+(daysSince<=7?'#16a34a':daysSince<=14?'#f59e0b':'#ef4444')+';">'+(daysSince<=7?'✅ Diese Woche gereinigt':daysSince<=14?'⚠️ Letzte Reinigung vor '+daysSince+' Tagen':'🚨 Überfällig – seit '+daysSince+' Tagen!')+'</div>'+
    (lastEntry?'<div style="font-size:11px;color:#888;margin-top:4px;">👤 '+lastEntry.ma+' · '+lastEntry.ts+'</div>':'');
  sec.appendChild(infoCard);

  const cfmBtn=document.createElement('button');
  cfmBtn.style.cssText='width:100%;background:#0f766e;color:#fff;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:14px;';
  cfmBtn.textContent='🧹 Bodenmaschine gereinigt & gewischt';
  cfmBtn.onclick=()=>{
    const entry={date:new Date().toISOString().slice(0,10),ts:new Date().toLocaleString('de-DE'),ma:st.name||'Unbekannt'};
    waschHistory.push(entry);
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-90);
    waschHistory=waschHistory.filter(h=>new Date(h.date)>=cutoff);
    lsSave('waschHistory',waschHistory);
    renderInfoWaschCL(body);
  };
  sec.appendChild(cfmBtn);

  sec.innerHTML+='<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">📅 Reinigungshistorie</div>';
  if(!waschHistory.length){
    sec.innerHTML+='<div style="text-align:center;padding:20px;color:#ccc;">Noch keine Einträge</div>';
  } else {
    [...waschHistory].reverse().forEach(h=>{
      sec.innerHTML+='<div style="background:#fff;border-radius:11px;padding:11px 13px;margin-bottom:7px;box-shadow:0 1px 5px rgba(0,0,0,.06);">'+
        '<div style="font-size:13px;font-weight:700;">✅ '+new Date(h.date).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})+'</div>'+
        '<div style="font-size:11px;color:#888;margin-top:2px;">👤 '+h.ma+' · '+h.ts+'</div>'+
      '</div>';
    });
  }
  body.appendChild(sec);
}

// ── WASCHMASCHINE INFO VIEW ──────────────────────────────────────────

