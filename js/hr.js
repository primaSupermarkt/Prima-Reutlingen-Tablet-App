// ═══════════════════════════════════════════════════════════════
// HR.JS
// HR-Konsole: Zeiten, Urlaub, Krank, Gehalt, Zuschläge, Profile
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════
// ZUSCHLAG BERECHNUNG
// ═══════════════════════════════════════════
function getZuschlagsPlan(planId) {
  if(!planId) return zuschlagsPlaene.find(function(p){return p.istDefault;}) || zuschlagsPlaene[0];
  return zuschlagsPlaene.find(function(p){return p.id===planId;}) || zuschlagsPlaene[0];
}

// ═══════════════════════════════════════════
// FEIERTAG-HELPER (Baden-Württemberg)
// ═══════════════════════════════════════════
function isFeiertag(datumStr) {
  if(!datumStr) return false;
  var d = new Date(datumStr + 'T12:00:00');
  var day = d.getDate(), month = d.getMonth()+1, year = d.getFullYear();

  // Ostern berechnen (Gauss'sche Formel)
  var a=year%19, b=Math.floor(year/100), c=year%100;
  var d2=Math.floor(b/4), e=b%4, f=Math.floor((b+8)/25);
  var g=Math.floor((b-f+1)/3), h=(19*a+b-d2-g+15)%30;
  var i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7;
  var m=Math.floor((a+11*h+22*l)/451);
  var osterMonat=Math.floor((h+l-7*m+114)/31);
  var osterTag=((h+l-7*m+114)%31)+1;
  var ostern = new Date(year, osterMonat-1, osterTag);

  // Bewegliche Feiertage
  var karfreitag  = new Date(ostern); karfreitag.setDate(ostern.getDate()-2);
  var ostermontag = new Date(ostern); ostermontag.setDate(ostern.getDate()+1);
  var himmelfahrt = new Date(ostern); himmelfahrt.setDate(ostern.getDate()+39);
  var pfingstmontag = new Date(ostern); pfingstmontag.setDate(ostern.getDate()+50);
  var fronleichnam = new Date(ostern); fronleichnam.setDate(ostern.getDate()+60);

  var feiertage = [
    // Feste Feiertage Deutschland
    month===1  && day===1,   // Neujahr
    month===1  && day===6,   // Heilige Drei Könige (BW)
    month===5  && day===1,   // Tag der Arbeit
    month===10 && day===3,   // Deutsche Einheit
    month===11 && day===1,   // Allerheiligen (BW)
    month===12 && day===25,  // 1. Weihnachtstag
    month===12 && day===26,  // 2. Weihnachtstag
    // Bewegliche Feiertage
    d.toDateString() === karfreitag.toDateString(),
    d.toDateString() === ostern.toDateString(),
    d.toDateString() === ostermontag.toDateString(),
    d.toDateString() === himmelfahrt.toDateString(),
    d.toDateString() === pfingstmontag.toDateString(),
    d.toDateString() === fronleichnam.toDateString(),
  ];

  return feiertage.some(function(f){ return f; });
}

function calcZuschlaege(datum, startMin, endMin, tagTyp, planId) {
  // tagTyp: 'wt' | 'so' | 'ft'
  const NACHT_AB = 22 * 60;
  let normalMin = 0, nachtMin = 0, soFtMin = 0, nachtSoFtMin = 0;
  for(let m = startMin; m < endMin; m++) {
    const h = m % (24*60);
    const isNacht = h >= NACHT_AB;
    const isSo = tagTyp === 'so';
    const isFt = tagTyp === 'ft';
    const isSoFt = isSo || isFt;
    if(isNacht && isSoFt) nachtSoFtMin++;
    else if(isNacht) nachtMin++;
    else if(isSoFt) soFtMin++;
    else normalMin++;
  }
  return {normalMin, nachtMin, soFtMin, nachtSoFtMin};
}

function calcZuschlagEuro(nachtMin, soFtMin, nachtSoFtMin, stundenlohn, planId) {
  const plan = getZuschlagsPlan(planId);
  const pNacht    = (plan.nacht    || 0) / 100;
  const pSoFt     = Math.max(plan.sonntag||0, plan.feiertag||0) / 100;
  const pNachtSoFt= (plan.nachtSoFt || 0) / 100;
  const zNacht     = stundenlohn * (nachtMin/60)    * pNacht;
  const zSoFt      = stundenlohn * (soFtMin/60)     * pSoFt;
  const zNachtSoFt = stundenlohn * (nachtSoFtMin/60)* pNachtSoFt;
  return { zNacht, zSoFt, zNachtSoFt, total: zNacht+zSoFt+zNachtSoFt, plan };
}

function timeToMin(timeStr) {
  const [h,m] = timeStr.split(':').map(Number);
  return h*60+m;
}

function minToTime(min) {
  const h = Math.floor(min/60) % 24;
  const m = min % 60;
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
}

function calcIstStart(schicht, einloggZeit) {
  // Returns the later of Sollstart and actual login time
  const sollStart = SCHICHT_SOLL[schicht] ? timeToMin(SCHICHT_SOLL[schicht].start) : 0;
  const istMin = timeToMin(einloggZeit);
  return minToTime(Math.max(sollStart, istMin));
}

// ═══════════════════════════════════════════
// ZEITERFASSUNG
// ═══════════════════════════════════════════
function openZeiterfassung() {
  renderZeiterfassung();
  go('s-ze');
}

function renderZeiterfassung() {
  const body = document.getElementById('ze-body');
  if(!body) return;
  const today = new Date().toISOString().slice(0,10);
  const todayEntries = zeiterfassung.filter(z=>z.datum===today&&z.ma===st.name);
  const tagTyp = st.day || 'wt';

  body.innerHTML = '';

  // Current session card
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border-radius:13px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.08);margin-bottom:12px;';

  const sollZeit = SCHICHT_SOLL[st.schicht] || {start:'00:00',end:'00:00'};
  const nowTime = new Date().toTimeString().slice(0,5);
  const istStart = calcIstStart(st.schicht, nowTime);

  card.innerHTML =
    '<div style="font-size:15px;font-weight:800;margin-bottom:10px;">⏱️ Schicht erfassen</div>'+
    '<div style="font-size:12px;color:#888;margin-bottom:10px;">Mitarbeiter: <strong>'+st.name+'</strong> · Datum: '+new Date().toLocaleDateString('de-DE')+'</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">'+
      '<div><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:4px;">Arbeitsbeginn</label>'+
      '<input type="time" id="ze-start" value="'+istStart+'" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:15px;font-family:inherit;outline:none;"></div>'+
      '<div><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:4px;">Arbeitsende</label>'+
      '<input type="time" id="ze-end" value="'+sollZeit.end+'" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:15px;font-family:inherit;outline:none;"></div>'+
    '</div>'+
    '<div style="font-size:11px;color:#888;margin-bottom:10px;">Sollzeit: '+sollZeit.start+' – '+sollZeit.end+' · Berechneter Start: <strong>'+istStart+'</strong></div>'+
    '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:4px;">Grund (falls abweichend)</label>'+
    '<input type="text" id="ze-grund" placeholder="z.B. Überstunden auf Anfrage, Vertretung..." style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:13px;font-family:inherit;outline:none;margin-bottom:12px;">';

  const saveBtn = document.createElement('button');
  saveBtn.style.cssText = 'width:100%;background:#1e3a5f;color:#fff;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;';
  saveBtn.textContent = '✅ Arbeitszeit speichern';
  saveBtn.onclick = function(){ saveZeiterfassung(); };
  card.appendChild(saveBtn);
  body.appendChild(card);

  // Today's entries
  if(todayEntries.length) {
    const histLabel = document.createElement('div');
    histLabel.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;';
    histLabel.textContent = '📅 Heutige Einträge';
    body.appendChild(histLabel);
    todayEntries.forEach(function(z) {
      const zCard = document.createElement('div');
      zCard.style.cssText = 'background:#fff;border-radius:11px;padding:12px 14px;margin-bottom:7px;box-shadow:0 1px 5px rgba(0,0,0,.06);';
      const netMin = z.nettoMin || 0;
      const h = Math.floor(netMin/60), m = netMin%60;
      zCard.innerHTML = '<div style="display:flex;justify-content:space-between;"><strong>'+z.istStart+' – '+z.istEnd+'</strong><span style="color:#1e3a5f;font-weight:700;">'+h+'h '+m+'min</span></div>'+
        (z.grund?'<div style="font-size:11px;color:#888;margin-top:3px;">'+z.grund+'</div>':'');
      body.appendChild(zCard);
    });
  }
}

function saveZeiterfassung() {
  const startVal = document.getElementById('ze-start').value;
  const endVal = document.getElementById('ze-end').value;
  const grund = document.getElementById('ze-grund').value;
  if(!startVal||!endVal){alert('Bitte Start- und Endzeit eingeben.');return;}

  const startMin = timeToMin(startVal);
  let endMin = timeToMin(endVal);
  if(endMin <= startMin) endMin += 24*60; // overnight

  // Apply Sollstart rule
  const schichtSoll = SCHICHT_SOLL[st.schicht];
  const sollStartMin = schichtSoll ? timeToMin(schichtSoll.start) : startMin;
  const effStart = Math.max(startMin, sollStartMin);

  // Pause deduction
  const grossMin = endMin - effStart;
  let pauseMin = 0;
  if(grossMin >= 9*60) pauseMin = 45;
  else if(grossMin >= 6*60) pauseMin = 30;
  else if(grossMin >= 4.5*60) pauseMin = 15;
  const nettoMin = grossMin - pauseMin;

  const tagTyp = st.day || 'wt';
  const zuschlaege = calcZuschlaege(new Date().toISOString().slice(0,10), effStart, endMin, tagTyp);

  const entry = {
    id: 'ze'+Date.now(),
    ma: st.name,
    datum: new Date().toISOString().slice(0,10),
    schicht: st.schicht,
    tagTyp: tagTyp,
    sollStart: schichtSoll ? schichtSoll.start : startVal,
    sollEnd: schichtSoll ? schichtSoll.end : endVal,
    istStart: minToTime(effStart),
    istEnd: endVal,
    grossMin,
    pauseMin,
    nettoMin,
    grund,
    zuschlaege,
    ts: new Date().toLocaleString('de-DE')
  };

  zeiterfassung.push(entry);
  lsSave('zeiterfassung', zeiterfassung);
  alert('Arbeitszeit gespeichert: '+entry.istStart+' bis '+entry.istEnd+' | Netto: '+Math.floor(nettoMin/60)+'h '+nettoMin%60+'min');
  go('s-cl');
}

function openHR() { renderHR(); go('s-hr'); }

function hrTab(tab) {
  currentHRTab = tab;
  const tabMap = {zeiten:1, urlaub:2, krank:3, profile:4, zuschlag:5, gehalt:6};
  Object.keys(tabMap).forEach(function(t) {
    const btn = document.getElementById('hr-t'+tabMap[t]);
    const pane = document.getElementById('hr-tab-'+t);
    if(btn){btn.style.background=t===tab?'#fff':'rgba(255,255,255,.18)';btn.style.color=t===tab?'#1e3a5f':'#fff';}
    if(pane) pane.style.display = t===tab ? (t==='zuschlag'?'flex':'block') : 'none';
  });
  if(tab==='zeiten')   renderHRZeiten();
  if(tab==='urlaub')   renderHRUrlaub();
  if(tab==='krank')    renderHRKrank();
  if(tab==='profile')  renderHRProfile();
  if(tab==='zuschlag') { renderHRZuschlag(); }
  if(tab==='gehalt') { renderHRGehalt(); }
}


function renderHR() { hrTab(currentHRTab); }

function renderHRZeiten() {
  var pane = document.getElementById('hr-tab-zeiten');
  if(!pane) return;
  var now = new Date();
  var todayStr  = now.toISOString().slice(0,10);
  var thisMonth = now.toISOString().slice(0,7);
  var thisWeek  = getWeekStart(now);
  var html = '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:10px;">Zeitkonto &middot; '+now.toLocaleDateString('de-DE',{month:'long',year:'numeric'})+'</div>';

  names.forEach(function(name) {
    var allEntries   = zeiterfassung.filter(function(z){return z.ma===name;});
    var monthEntries = allEntries.filter(function(z){return z.datum.startsWith(thisMonth);});
    var weekEntries  = allEntries.filter(function(z){return z.datum>=thisWeek;});
    var todayEntries = allEntries.filter(function(z){return z.datum===todayStr;});
    var monthMin = monthEntries.reduce(function(s,z){return s+(z.nettoMin||0);},0);
    var weekMin  = weekEntries.reduce(function(s,z){return s+(z.nettoMin||0);},0);
    var todayMin = todayEntries.reduce(function(s,z){return s+(z.nettoMin||0);},0);
    var prof = maProfiles[name]||{};
    var sollWocheH   = prof.stundenSoll||0;
    var sollMonatMin = Math.round(sollWocheH * 60 * 52 / 12);

    // Genehmigter Urlaub diesen Monat (8h/Tag, Mo-Sa)
    var urlaubH = 0;
    urlaubAntraege.forEach(function(a){
      if(a.ma!==name||a.status!=='genehmigt'||!a.von||!a.bis) return;
      var d=new Date(a.von+'T12:00:00'), end=new Date(a.bis+'T12:00:00');
      while(d<=end){
        if(d.toISOString().slice(0,7)===thisMonth&&d.getDay()!==0) urlaubH+=8;
        d.setDate(d.getDate()+1);
      }
    });

    var saldoMin = monthMin + urlaubH*60 - sollMonatMin;
    var saldoColor = saldoMin>=0?'#16a34a':'#ef4444';
    var saldoBg    = saldoMin>=0?'#f0fdf4':'#fff5f5';
    var saldoSign  = saldoMin>=0?'+':'-';

    html +=
      '<div style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:10px;">'+
      '<div style="font-size:14px;font-weight:800;margin-bottom:10px;">&#128100; '+name+'</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:8px;">'+
        '<div style="background:#f0f4ff;border-radius:9px;padding:9px;text-align:center;">'+
          '<div style="font-size:15px;font-weight:800;color:#1e3a5f;">'+Math.floor(monthMin/60)+'h '+monthMin%60+'m</div>'+
          '<div style="font-size:10px;color:#888;">Ist-Std</div></div>'+
        '<div style="background:#f5f5f5;border-radius:9px;padding:9px;text-align:center;">'+
          '<div style="font-size:15px;font-weight:800;color:#444;">'+(sollMonatMin?Math.floor(sollMonatMin/60)+'h':'&ndash;')+'</div>'+
          '<div style="font-size:10px;color:#888;">Soll-Std</div></div>'+
        '<div style="background:'+saldoBg+';border-radius:9px;padding:9px;text-align:center;">'+
          '<div style="font-size:15px;font-weight:800;color:'+saldoColor+';">'+saldoSign+_minStr(Math.abs(saldoMin))+'</div>'+
          '<div style="font-size:10px;color:#888;">Saldo</div></div>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:10px;">'+
        '<div style="background:#f5f5f5;border-radius:8px;padding:8px;text-align:center;">'+
          '<div style="font-size:14px;font-weight:700;color:#1e3a5f;">'+Math.floor(todayMin/60)+'h'+todayMin%60+'m</div>'+
          '<div style="font-size:10px;color:#888;">Heute</div></div>'+
        '<div style="background:#f5f5f5;border-radius:8px;padding:8px;text-align:center;">'+
          '<div style="font-size:14px;font-weight:700;color:#1e3a5f;">'+Math.floor(weekMin/60)+'h'+weekMin%60+'m</div>'+
          '<div style="font-size:10px;color:#888;">Woche</div></div>'+
        '<div style="background:#f5f5f5;border-radius:8px;padding:8px;text-align:center;">'+
          '<div style="font-size:14px;font-weight:700;color:#0f766e;">'+urlaubH+'h</div>'+
          '<div style="font-size:10px;color:#888;">Urlaub</div></div>'+
      '</div>'+
      '<button id="hrzd-btn-'+name+'" style="width:100%;background:#1e3a5f;color:#fff;border:none;border-radius:9px;padding:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;">Details anzeigen</button>'+
      '</div>';
  });

  pane.innerHTML = html;
  names.forEach(function(n){
    var btn=document.getElementById('hrzd-btn-'+n);
    if(btn)(function(nm){btn.addEventListener('click',function(){showMaZeitDetail(nm);});})(n);
  });
}



function getWeekStart(d) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day===0?-6:1);
  const mon = new Date(d.setDate(diff));
  return mon.toISOString().slice(0,10);
}

function _minStr(min) {
  var h = Math.floor(Math.abs(min)/60);
  var m = Math.abs(min)%60;
  return h+'h '+(m<10?'0':'')+m+'min';
}

function _calcZuschlaegeEntry(datum, startStr, endStr) {
  if(!datum||!startStr||!endStr) return {nachtMin:0,soFtMin:0,nachtSoFtMin:0,normalMin:0};
  var sm=timeToMin(startStr), em=timeToMin(endStr);
  if(em<=sm) em+=24*60;
  var dow=new Date(datum+'T12:00:00').getDay();
  var istSo=(dow===0), istFt=isFeiertag(datum);
  var N_AB=22*60, N_BIS=6*60;
  var nachtMin=0,soFtMin=0,nachtSoFtMin=0,normalMin=0;
  for(var m2=sm;m2<em;m2++){
    var t=m2%(24*60);
    var isN=(t>=N_AB)||(t<N_BIS);
    var isSF=istSo||istFt;
    if(isN&&isSF) nachtSoFtMin++;
    else if(isN)  nachtMin++;
    else if(isSF) soFtMin++;
    else          normalMin++;
  }
  return {nachtMin:nachtMin,soFtMin:soFtMin,nachtSoFtMin:nachtSoFtMin,normalMin:normalMin};
}

function showMaZeitDetail(name) {
  var _editId = null;

  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:#f5f5f5;z-index:800;display:flex;flex-direction:column;overflow:hidden;';

  var hdr = document.createElement('div');
  hdr.style.cssText = 'background:#1e3a5f;color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
  hdr.innerHTML = '<div style="font-size:15px;font-weight:800;">&#9201; '+name+' &ndash; Zeiten</div>';
  var closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:8px;padding:7px 12px;font-size:13px;font-weight:700;cursor:pointer;touch-action:manipulation;';
  closeBtn.textContent = 'Schliessen';
  closeBtn.addEventListener('click', function(){ document.body.removeChild(ov); });
  hdr.appendChild(closeBtn);
  ov.appendChild(hdr);

  var scroll = document.createElement('div');
  scroll.style.cssText = 'flex:1;overflow-y:auto;padding:12px;';
  ov.appendChild(scroll);

  function renderDetail() {
    scroll.innerHTML = '';
    var formCard = document.createElement('div');
    formCard.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 2px 7px rgba(0,0,0,.07);';
    var editEntry = _editId ? zeiterfassung.find(function(z){return z.id===_editId;}) : null;
    var today = new Date().toISOString().slice(0,10);
    var fTitle = _editId ? 'Eintrag bearbeiten' : '+ Eintrag hinzufügen';

    formCard.innerHTML =
      '<div style="font-size:13px;font-weight:800;margin-bottom:10px;color:#1e3a5f;">'+fTitle+'</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">'+
        '<div style="grid-column:1/-1;"><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">Datum</label>'+
        '<input type="date" id="hrd-datum" value="'+(editEntry?editEntry.datum:today)+'" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;"></div>'+
        '<div><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">Start</label>'+
        '<input type="time" id="hrd-start" value="'+(editEntry?editEntry.istStart:'06:00')+'" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;"></div>'+
        '<div><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">Ende</label>'+
        '<input type="time" id="hrd-end" value="'+(editEntry?editEntry.istEnd:'14:00')+'" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;"></div>'+
        '<div><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">Pause (Min)</label>'+
        '<input type="number" id="hrd-pause" min="0" max="120" value="'+(editEntry?(editEntry.pauseMin||0):30)+'" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;"></div>'+
        '<div style="grid-column:1/-1;"><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">Bemerkung (optional)</label>'+
        '<input type="text" id="hrd-bemerk" value="'+(editEntry&&editEntry.grund?editEntry.grund:'')+'" placeholder="z.B. Vertretung" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;"></div>'+
      '</div>'+
      '<div id="hrd-preview" style="background:#f0f4ff;border-radius:8px;padding:8px 10px;font-size:12px;color:#1e3a5f;margin-bottom:8px;display:none;"></div>';

    function updatePreview() {
      var s=document.getElementById('hrd-start').value;
      var e=document.getElementById('hrd-end').value;
      var p=parseInt(document.getElementById('hrd-pause').value)||0;
      var prev=document.getElementById('hrd-preview');
      if(!s||!e){prev.style.display='none';return;}
      var sm2=timeToMin(s),em2=timeToMin(e);
      if(em2<=sm2) em2+=24*60;
      var brutto=em2-sm2, netto=Math.max(0,brutto-p);
      prev.style.display='block';
      prev.innerHTML='Brutto: <strong>'+_minStr(brutto)+'</strong> &nbsp;|&nbsp; Pause: <strong>'+p+'min</strong> &nbsp;|&nbsp; Netto: <strong>'+_minStr(netto)+'</strong>';
    }
    setTimeout(function(){
      var sEl=document.getElementById('hrd-start');
      var eEl=document.getElementById('hrd-end');
      var pEl=document.getElementById('hrd-pause');
      if(sEl) sEl.addEventListener('change',updatePreview);
      if(eEl) eEl.addEventListener('change',updatePreview);
      if(pEl) pEl.addEventListener('input',updatePreview);
      updatePreview();
    },0);

    var saveBtn=document.createElement('button');
    saveBtn.style.cssText='width:100%;background:#1e3a5f;color:#fff;border:none;border-radius:9px;padding:11px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;touch-action:manipulation;';
    saveBtn.textContent=_editId?'Aenderung speichern':'Eintrag speichern';
    saveBtn.addEventListener('click',function(){
      var datum=document.getElementById('hrd-datum').value;
      var startV=document.getElementById('hrd-start').value;
      var endV=document.getElementById('hrd-end').value;
      var pauseV=parseInt(document.getElementById('hrd-pause').value)||0;
      var bemerk=document.getElementById('hrd-bemerk').value.trim();
      if(!datum||!startV||!endV){alert('Bitte Datum, Start und Ende eingeben.');return;}
      var sm2=timeToMin(startV), em2=timeToMin(endV);
      if(em2<=sm2) em2+=24*60;
      var grossMin2=em2-sm2, nettoMin2=Math.max(0,grossMin2-pauseV);
      var tagTyp2=new Date(datum+'T12:00:00').getDay()===0?'so':isFeiertag(datum)?'ft':'wt';
      var zu2=_calcZuschlaegeEntry(datum,startV,endV);
      if(_editId){
        var idx=zeiterfassung.findIndex(function(z){return z.id===_editId;});
        if(idx!==-1){
          zeiterfassung[idx].datum=datum; zeiterfassung[idx].istStart=startV;
          zeiterfassung[idx].istEnd=endV; zeiterfassung[idx].grossMin=grossMin2;
          zeiterfassung[idx].pauseMin=pauseV; zeiterfassung[idx].nettoMin=nettoMin2;
          zeiterfassung[idx].tagTyp=tagTyp2; zeiterfassung[idx].zuschlaege=zu2;
          zeiterfassung[idx].grund=bemerk;
        }
        _editId=null;
      } else {
        zeiterfassung.push({id:'ze'+Date.now(),ma:name,datum:datum,schicht:'',
          tagTyp:tagTyp2,istStart:startV,istEnd:endV,grossMin:grossMin2,
          pauseMin:pauseV,nettoMin:nettoMin2,grund:bemerk,zuschlaege:zu2,
          ts:new Date().toLocaleString('de-DE')});
      }
      lsSave('zeiterfassung',zeiterfassung);
      fbSave('zeiterfassung',zeiterfassung);
      renderDetail();
    });
    formCard.appendChild(saveBtn);
    if(_editId){
      var cancelEdit=document.createElement('button');
      cancelEdit.style.cssText='width:100%;background:none;border:none;color:#888;font-size:12px;cursor:pointer;font-family:inherit;padding:6px;touch-action:manipulation;';
      cancelEdit.textContent='Abbrechen';
      cancelEdit.addEventListener('click',function(){_editId=null;renderDetail();});
      formCard.appendChild(cancelEdit);
    }
    scroll.appendChild(formCard);

    var now2=new Date(), thisMonth2=now2.toISOString().slice(0,7);
    var entries=zeiterfassung.filter(function(z){return z.ma===name&&z.datum.startsWith(thisMonth2);});
    entries.sort(function(a,b){return b.datum>a.datum?1:b.datum<a.datum?-1:0;});

    var histTitle=document.createElement('div');
    histTitle.style.cssText='font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;';
    histTitle.textContent='Historie '+thisMonth2+' ('+entries.length+' Eintraege)';
    scroll.appendChild(histTitle);

    if(!entries.length){
      var empty=document.createElement('div');
      empty.style.cssText='text-align:center;padding:24px;color:#ccc;font-size:13px;';
      empty.textContent='Noch keine Eintraege diesen Monat';
      scroll.appendChild(empty);
    } else {
      var DAYS=['So','Mo','Di','Mi','Do','Fr','Sa'];
      entries.forEach(function(z){
        var row=document.createElement('div');
        row.style.cssText='background:#fff;border-radius:10px;padding:10px 12px;margin-bottom:7px;box-shadow:0 1px 4px rgba(0,0,0,.06);';
        var d=new Date(z.datum+'T12:00:00');
        var dlbl=DAYS[d.getDay()]+' '+d.getDate()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.';
        var netH=Math.floor((z.nettoMin||0)/60), netM=(z.nettoMin||0)%60;
        var isSoFt=(new Date(z.datum+'T12:00:00').getDay()===0)||isFeiertag(z.datum);
        var badge=isSoFt?'<span style="background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 5px;font-size:10px;font-weight:700;margin-left:4px;">'+(new Date(z.datum+'T12:00:00').getDay()===0?'So':'Ft')+'</span>':'';
        row.innerHTML=
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'+
            '<div style="font-size:13px;font-weight:700;">'+dlbl+badge+'</div>'+
            '<div style="font-size:14px;font-weight:800;color:#1e3a5f;">'+netH+'h '+netM+'min</div>'+
          '</div>'+
          '<div style="font-size:12px;color:#666;margin-bottom:5px;">'+
            (z.istStart||'?')+' - '+(z.istEnd||'?')+
            ' | Pause: '+(z.pauseMin||0)+'min'+
            (z.grund?' | '+z.grund:'')+
          '</div>';
        var btnRow=document.createElement('div');
        btnRow.style.cssText='display:flex;gap:7px;';
        var editBtn=document.createElement('button');
        editBtn.style.cssText='flex:1;background:#f0f4ff;border:none;border-radius:7px;padding:7px;font-size:11px;font-weight:700;color:#1e3a5f;cursor:pointer;font-family:inherit;touch-action:manipulation;';
        editBtn.textContent='Bearbeiten';
        (function(id){editBtn.addEventListener('click',function(){_editId=id;renderDetail();scroll.scrollTop=0;});})(z.id);
        var delBtn2=document.createElement('button');
        delBtn2.style.cssText='flex:1;background:#fee2e2;border:none;border-radius:7px;padding:7px;font-size:11px;font-weight:700;color:#dc2626;cursor:pointer;font-family:inherit;touch-action:manipulation;';
        delBtn2.textContent='Loeschen';
        (function(id){delBtn2.addEventListener('click',function(){
          if(!confirm('Eintrag loeschen?')) return;
          zeiterfassung=zeiterfassung.filter(function(z2){return z2.id!==id;});
          lsSave('zeiterfassung',zeiterfassung);
          fbSave('zeiterfassung',zeiterfassung);
          renderDetail();
        });})(z.id);
        btnRow.appendChild(editBtn);
        btnRow.appendChild(delBtn2);
        row.appendChild(btnRow);
        scroll.appendChild(row);
      });
    }
  }
  document.body.appendChild(ov);
  renderDetail();
}


function renderHRUrlaub() {
  const pane = document.getElementById('hr-tab-urlaub');
  if(!pane) return;
  const pending = urlaubAntraege.filter(function(a){return a.status==='ausstehend';});
  const approved = urlaubAntraege.filter(function(a){return a.status==='genehmigt';});

  let html = '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">⏳ Ausstehende Anträge ('+pending.length+')</div>';

  if(!pending.length) {
    html += '<div style="background:#f0fdf4;border-radius:10px;padding:12px;font-size:13px;color:#15803d;font-weight:600;margin-bottom:12px;">✅ Keine ausstehenden Anträge</div>';
  } else {
    pending.forEach(function(a) {
      const prof = maProfiles[a.ma]||{};
      const used = urlaubAntraege.filter(function(u){return u.ma===a.ma&&u.status==='genehmigt';})
        .reduce(function(s,u){ return s+(u.urlaubTage||0); },0);
      const anspruch = calcUrlaubsanspruchDiesesJahr(prof.urlaubAnspruch||0, prof.eintrittsDatum||'');
      const verfuegbar = anspruch - used;
      const beantragt = a.urlaubTage || '?';
      const ueberschreitung = anspruch > 0 && (a.urlaubTage||0) > verfuegbar;
      html += '<div style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:10px;'+(ueberschreitung?'border:2px solid #fbbf24;':'')+'">'+
        '<div style="font-size:14px;font-weight:800;">🌴 '+a.ma+'</div>'+
        '<div style="font-size:12px;color:#444;margin-top:4px;font-weight:600;">'+beantragt+' Urlaubstage · '+a.von+' bis '+a.bis+(a.grund?' · '+a.grund:'')+'</div>'+
        (anspruch>0 ? '<div style="font-size:11px;color:'+(ueberschreitung?'#dc2626':'#888')+';margin-top:3px;">Anspruch: '+anspruch+' · Verbraucht: '+used+' · Verfügbar: '+verfuegbar+(ueberschreitung?' ⚠️ Überschreitung!':'')+'</div>' : '')+
        '<div style="display:flex;gap:8px;margin-top:10px;">'+
          '<button onclick="approveUrlaub(this.dataset.id)" data-id="'+a.id+'" style="flex:1;background:#dcfce7;border:none;border-radius:8px;padding:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;color:#15803d;">✅ Genehmigen</button>'+
          '<button onclick="rejectUrlaub(this.dataset.id)" data-id="'+a.id+'" style="flex:1;background:#fee2e2;border:none;border-radius:8px;padding:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;color:#dc2626;">❌ Ablehnen</button>'+
        '</div></div>';
    });
  }

  html += '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin:12px 0 8px;">✅ Genehmigte Urlaube</div>';
  if(!approved.length) {
    html += '<div style="font-size:13px;color:#ccc;text-align:center;padding:16px;">Keine genehmigten Urlaube</div>';
  } else {
    approved.forEach(function(a) {
      html += '<div style="background:#fff;border-radius:11px;padding:12px 14px;margin-bottom:7px;box-shadow:0 1px 5px rgba(0,0,0,.06);display:flex;justify-content:space-between;align-items:center;">'+
        '<div><div style="font-size:13px;font-weight:700;">🌴 '+a.ma+'</div><div style="font-size:11px;color:#888;">'+a.von+' – '+a.bis+(a.urlaubTage?' · '+a.urlaubTage+' Tage':'')+'</div></div>'+
        '<button onclick="revokeUrlaub(this.dataset.id)" data-id="'+a.id+'" style="background:#fee2e2;border:none;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;color:#dc2626;">Rückgängig</button>'+
        '</div>';
    });
  }
  pane.innerHTML = html;
}

function approveUrlaub(id) {
  const a = urlaubAntraege.find(function(u){return u.id===id;});
  if(!a) return;
  a.status = 'genehmigt';
  a.genehmigt = new Date().toLocaleString('de-DE');
  lsSave('urlaubAntraege', urlaubAntraege);
  fbSave('urlaubAntraege', urlaubAntraege);
  // Benachrichtigung an Mitarbeiter
  mitarbeiterNachrichten.push({ts:new Date().toLocaleString('de-DE'), name:a.ma, text:'✅ Urlaubsantrag genehmigt: '+a.von+' bis '+a.bis+(a.urlaubTage?' ('+a.urlaubTage+' Tage)':''), schicht:'–', gelesen:false});
  lsSave('mitNachrichten', mitarbeiterNachrichten);
  fbSave('mitNachrichten', mitarbeiterNachrichten);
  renderHRUrlaub();
}

function rejectUrlaub(id) {
  const a = urlaubAntraege.find(function(u){return u.id===id;});
  if(!a) return;
  a.status = 'abgelehnt';
  a.abgelehnt = new Date().toLocaleString('de-DE');
  lsSave('urlaubAntraege', urlaubAntraege);
  fbSave('urlaubAntraege', urlaubAntraege);
  // Benachrichtigung an Mitarbeiter
  mitarbeiterNachrichten.push({ts:new Date().toLocaleString('de-DE'), name:a.ma, text:'❌ Urlaubsantrag abgelehnt: '+a.von+' bis '+a.bis, schicht:'–', gelesen:false});
  lsSave('mitNachrichten', mitarbeiterNachrichten);
  fbSave('mitNachrichten', mitarbeiterNachrichten);
  renderHRUrlaub();
}

function revokeUrlaub(id) {
  if(!confirm('Urlaub wirklich rückgängig machen?')) return;
  const a = urlaubAntraege.find(function(u){return u.id===id;});
  if(!a) return;
  a.status = 'storniert';
  lsSave('urlaubAntraege', urlaubAntraege);
  fbSave('urlaubAntraege', urlaubAntraege);
  renderHRUrlaub();
}

function renderHRKrank() {
  const pane = document.getElementById('hr-tab-krank');
  if(!pane) return;
  let html = '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">🤒 Krankmeldung eintragen</div>';
  html += '<div style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:12px;">'+
    '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:4px;">Mitarbeiter</label>'+
    '<select id="krank-ma" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:14px;font-family:inherit;margin-bottom:10px;outline:none;">'+
    names.map(function(n){return '<option>'+n+'</option>';}).join('')+
    '</select>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">'+
    '<div><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:4px;">Von</label><input type="date" id="krank-von" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:13px;font-family:inherit;outline:none;"></div>'+
    '<div><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:4px;">Bis</label><input type="date" id="krank-bis" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:13px;font-family:inherit;outline:none;"></div>'+
    '</div>'+
    '<button onclick="saveKrankmeldung()" style="width:100%;background:#dc2626;color:#fff;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">🤒 Krankmeldung speichern</button>'+
    '</div>';

  // Show active sick leaves
  html += '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">Aktuelle Krankmeldungen</div>';
  const now = new Date().toISOString().slice(0,10);
  let found = false;
  names.forEach(function(name) {
    const prof = maProfiles[name]||{};
    const kranks = (prof.krankmeldungen||[]).filter(function(k){return k.bis>=now;});
    if(kranks.length) {
      found = true;
      kranks.forEach(function(k) {
        html += '<div style="background:#fff5f5;border:1.5px solid #fecaca;border-radius:11px;padding:11px 13px;margin-bottom:7px;display:flex;justify-content:space-between;align-items:center;">'+
          '<div><div style="font-size:13px;font-weight:700;">🤒 '+name+'</div><div style="font-size:11px;color:#888;">'+k.von+' – '+k.bis+'</div></div>'+
          '</div>';
      });
    }
  });
  if(!found) html += '<div style="font-size:13px;color:#ccc;text-align:center;padding:16px;">Keine aktiven Krankmeldungen</div>';
  pane.innerHTML = html;
  $set('krank-von', 'value', now);
  $set('krank-bis', 'value', now);
}

function saveKrankmeldung() {
  const name = document.getElementById('krank-ma').value;
  const von = document.getElementById('krank-von').value;
  const bis = document.getElementById('krank-bis').value;
  if(!von||!bis||von>bis){alert('Bitte gültige Daten eingeben.');return;}
  if(!maProfiles[name]) maProfiles[name]={};
  if(!maProfiles[name].krankmeldungen) maProfiles[name].krankmeldungen=[];
  maProfiles[name].krankmeldungen.push({von,bis,ts:new Date().toLocaleString('de-DE')});
  lsSave('maProfiles',maProfiles);
  alert('✅ Krankmeldung für '+name+' gespeichert.');
  renderHRKrank();
}

// Anteiligen Urlaubsanspruch berechnen
// Logik: Im Eintrittsjahr: 1/12 pro vollem Monat (ab Eintrittsmonat).
// Ab dem Folgejahr: voller Anspruch.
// Sonderfälle: Eintritt in H2 → Anspruch erst ab dem Folgejahr vollständig.
// ── Urlaubsanspruch anteilig berechnen ──
// Regel: Eintritt am 1.  → voller Monat zählt
//        Eintritt am 15. → halber Monat zählt (0.5/12)
//        Ab Folgejahr    → voller Jahresanspruch
function calcUrlaubsanspruchDiesesJahr(anspruchJahr, eintrittsDatum) {
  if(!eintrittsDatum || !anspruchJahr) return anspruchJahr||0;
  const eintritt = new Date(eintrittsDatum);
  const diesJahr = new Date().getFullYear();
  if(eintritt.getFullYear() < diesJahr) return anspruchJahr;
  if(eintritt.getFullYear() > diesJahr) return 0;
  // Eintrittsjahr === dieses Jahr
  const monat = eintritt.getMonth(); // 0=Jan … 11=Dez
  const tag   = eintritt.getDate();  // 1 oder 15
  // Monate ab Eintrittsmonat bis Dez (inkl.)
  let monate;
  if(tag <= 1) {
    // Am 1. eingetreten → voller Eintrittsmonat zählt
    monate = 12 - monat;          // z.B. Mai(4) → 8
  } else {
    // Am 15. eingetreten → halber Monat → 0.5 draufrechnen
    monate = 12 - monat - 0.5;   // z.B. Mai(4) → 7.5
  }
  return Math.round((anspruchJahr / 12) * monate);
}

function updateUrlaubHinweis(name) {
  const hint = document.getElementById('prof-urlaub-hint-'+name);
  const anspruchEl = document.getElementById('prof-urlaub-'+name);
  const eintrittEl = document.getElementById('prof-eintritt-'+name);
  if(!hint||!anspruchEl||!eintrittEl) return;
  const anspruch = parseInt(anspruchEl.value)||30;
  const eintritt = eintrittEl.value;
  if(!eintritt) { hint.style.display='none'; return; }
  const eDate = new Date(eintritt);
  const diesJahr = new Date().getFullYear();
  const anteil = calcUrlaubsanspruchDiesesJahr(anspruch, eintritt);
  const tag = eDate.getDate();
  let text;
  if(eDate.getFullYear() < diesJahr) {
    text = 'Voller Anspruch '+diesJahr+': '+anspruch+' Tage';
  } else if(eDate.getFullYear() === diesJahr) {
    const monateVoll = 12 - eDate.getMonth();
    const monateLabel = tag <= 1 ? monateVoll+'/12' : (monateVoll-0.5)+'/12';
    text = 'Eintritt '+eDate.toLocaleDateString('de-DE')+' ('+
      (tag<=1?'am 1. → voller Monat':'am 15. → halber Monat')+
      ') → Anspruch '+diesJahr+': '+anteil+' Tage ('+monateLabel+' × '+anspruch+')';
  } else {
    text = 'Eintritt in der Zukunft – kein Anspruch dieses Jahr';
  }
  hint.textContent = text;
  hint.style.display = 'block';
}

function renderHRGehalt() {
  var pane = document.getElementById('hr-gehalt-pane');
  if(!pane) return;
  pane.innerHTML = '';
  var now = new Date();
  var thisMonth = now.toISOString().slice(0,7);

  var titel = document.createElement('div');
  titel.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:12px;';
  titel.textContent = 'Gehaltsübersicht · ' + now.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
  pane.appendChild(titel);

  names.forEach(function(name){
    var prof = maProfiles[name]||{};
    var brutto     = prof.bruttoGehalt||0;
    var stundenSoll= prof.stundenSoll||0;
    var stundenlohn= (brutto&&stundenSoll) ? (brutto*12)/(stundenSoll*52) : 0;
    var planId     = prof.zuschlagsPlanId||null;
    var sollMonatH = Math.round(stundenSoll * 52 / 12 * 10) / 10;

    var eintraege = zeiterfassung.filter(function(z){ return z.ma===name && z.datum.startsWith(thisMonth); });
    var istMin    = eintraege.reduce(function(s,z){ return s+(z.nettoMin||0); }, 0);
    var istH      = istMin / 60;

    // Genehmigter Urlaub diesen Monat (8h/Tag)
    var urlaubH = 0;
    urlaubAntraege.forEach(function(a){
      if(a.ma!==name||a.status!=='genehmigt'||!a.von||!a.bis) return;
      var d=new Date(a.von+'T12:00:00'), end=new Date(a.bis+'T12:00:00');
      while(d<=end){
        if(d.toISOString().slice(0,7)===thisMonth&&d.getDay()!==0) urlaubH+=8;
        d.setDate(d.getDate()+1);
      }
    });

    // Stundenkonto: Ist + Urlaub - Soll
    var saldoH    = istH + urlaubH - sollMonatH;
    var saldoColor= saldoH>=0?'#16a34a':'#ef4444';
    var saldoBg   = saldoH>=0?'#f0fdf4':'#fff5f5';
    var saldoSign = saldoH>=0?'+':'-';
    var absSaldo  = Math.abs(saldoH);
    var saldoStr  = saldoSign+Math.floor(absSaldo)+'h '+Math.round((absSaldo%1)*60)+'min';

    // Zuschläge §3b EStG – minutengenau
    var zNacht=0, zSonntag=0, zFeiertag=0, zNachtSo=0, zNachtFt=0;
    var stNacht=0, stSo=0, stFt=0, stNachtSo=0, stNachtFt=0;
    eintraege.forEach(function(z){
      if(!z.istStart||!z.istEnd) return;
      var res = _calcZuschlaegeEntry(z.datum, z.istStart, z.istEnd);
      var ze  = calcZuschlagEuro(res.nachtMin, res.soFtMin, res.nachtSoFtMin, stundenlohn, planId);
      var tagTyp = new Date(z.datum+'T12:00:00').getDay()===0?'so':isFeiertag(z.datum)?'ft':'wt';
      // Nacht immer separat
      zNacht += ze.zNacht; stNacht += res.nachtMin;
      if(tagTyp==='so'){
        // So/Ft-Stunden ohne Nacht
        zSonntag += ze.zSoFt; stSo += res.soFtMin;
        // Nacht+So kombiniert
        zNachtSo += ze.zNachtSoFt; stNachtSo += res.nachtSoFtMin;
      } else if(tagTyp==='ft'){
        zFeiertag += ze.zSoFt; stFt += res.soFtMin;
        zNachtFt  += ze.zNachtSoFt; stNachtFt += res.nachtSoFtMin;
      }
    });
    var zGesamt = zNacht+zSonntag+zFeiertag+zNachtSo+zNachtFt;
    var plan = getZuschlagsPlan(planId);

    var card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:10px;box-shadow:0 2px 7px rgba(0,0,0,.07);';

    // Header
    card.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'+
        '<div style="font-size:15px;font-weight:800;">'+name+'</div>'+
        '<div style="font-size:11px;background:#f0f4ff;color:#1e3a5f;border-radius:6px;padding:3px 8px;">'+(plan?plan.name:'Kein Plan')+'</div>'+
      '</div>'+
      // Gehalt & Stundenlohn
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">'+
        '<div style="background:#f9f9f9;border-radius:8px;padding:8px;">'+
          '<div style="font-size:10px;color:#888;">Bruttogehalt/Monat</div>'+
          '<div style="font-size:15px;font-weight:800;color:#1a1a1a;">'+(brutto?brutto.toFixed(2)+' &euro;':'&ndash;')+'</div></div>'+
        '<div style="background:#f9f9f9;border-radius:8px;padding:8px;">'+
          '<div style="font-size:10px;color:#888;">Stundenlohn (Basis)</div>'+
          '<div style="font-size:15px;font-weight:800;color:#1a1a1a;">'+(stundenlohn?stundenlohn.toFixed(2)+' &euro;/h':'&ndash;')+'</div></div>'+
      '</div>'+
      // Stundenkonto
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:7px;">Stundenkonto</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:10px;">'+
        '<div style="background:#f0f4ff;border-radius:8px;padding:8px;text-align:center;">'+
          '<div style="font-size:13px;font-weight:800;color:#1e3a5f;">'+Math.floor(istH)+'h '+Math.round((istH%1)*60)+'m</div>'+
          '<div style="font-size:9px;color:#888;">Ist-Std</div></div>'+
        '<div style="background:#f5f5f5;border-radius:8px;padding:8px;text-align:center;">'+
          '<div style="font-size:13px;font-weight:800;color:#444;">'+(sollMonatH?Math.floor(sollMonatH)+'h':'&ndash;')+'</div>'+
          '<div style="font-size:9px;color:#888;">Soll-Std</div></div>'+
        '<div style="background:#f5f5f5;border-radius:8px;padding:8px;text-align:center;">'+
          '<div style="font-size:13px;font-weight:800;color:#0f766e;">'+urlaubH+'h</div>'+
          '<div style="font-size:9px;color:#888;">Urlaub</div></div>'+
        '<div style="background:'+saldoBg+';border-radius:8px;padding:8px;text-align:center;">'+
          '<div style="font-size:13px;font-weight:800;color:'+saldoColor+';">'+saldoStr+'</div>'+
          '<div style="font-size:9px;color:#888;">Saldo</div></div>'+
      '</div>';

    // Zuschläge
    var zDiv = document.createElement('div');
    zDiv.style.cssText = 'border-top:1.5px solid #f0f0f0;padding-top:10px;';

    function zRow(ico, label, para, stunden, pct, euro, bg, col) {
      return '<div style="background:'+bg+';border-radius:8px;padding:8px 10px;margin-bottom:5px;">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;">'+
          '<div><div style="font-size:12px;font-weight:700;color:'+col+';">'+ico+' '+label+'</div>'+
          '<div style="font-size:10px;color:#999;">'+para+'</div></div>'+
          '<div style="text-align:right;"><div style="font-size:14px;font-weight:900;color:'+col+';">'+euro+' &euro;</div>'+
          '<div style="font-size:10px;color:#999;">'+stunden+' h &times; '+pct+'%</div></div>'+
        '</div></div>';
    }

    var pNacht  = plan ? (plan.nacht||0)    : 25;
    var pSo     = plan ? (plan.sonntag||0)  : 25;
    var pFt     = plan ? (plan.feiertag||0) : 25;
    var pNSF    = plan ? (plan.nachtSoFt||0): 50;

    zDiv.innerHTML =
      '<div style="font-size:11px;font-weight:700;color:#1e3a5f;margin-bottom:8px;">Steuerfreie Zuschläge (&sect;3b EStG)</div>'+
      zRow('Nacht','Nachtarbeit 22-06 Uhr','§3b Nr.1',Math.round(stNacht/60*100)/100,pNacht,zNacht.toFixed(2),'#fef3c7','#92400e')+
      (stSo>0 ? zRow('So','Sonntagsarbeit','§3b Nr.2',Math.round(stSo/60*100)/100,pSo,zSonntag.toFixed(2),'#dcfce7','#15803d') : '')+
      (stFt>0 ? zRow('Ft','Feiertagsarbeit','§3b Nr.3',Math.round(stFt/60*100)/100,pFt,zFeiertag.toFixed(2),'#ede9fe','#6d28d9') : '')+
      (stNachtSo>0 ? zRow('N+So','Nacht+Sonntag kombiniert','§3b kombiniert',Math.round(stNachtSo/60*100)/100,pNSF,zNachtSo.toFixed(2),'#fff7ed','#c2410c') : '')+
      (stNachtFt>0 ? zRow('N+Ft','Nacht+Feiertag kombiniert','§3b kombiniert',Math.round(stNachtFt/60*100)/100,pNSF,zNachtFt.toFixed(2),'#f0f4ff','#1e3a5f') : '')+
      '<div style="background:#1e3a5f;border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;margin-top:4px;">'+
        '<div><div style="font-size:13px;font-weight:800;color:#fff;">Gesamt Zuschläge</div>'+
        '<div style="font-size:10px;color:rgba(255,255,255,.6);">Zusätzlich zum Bruttogehalt · steuerfrei</div></div>'+
        '<div style="font-size:17px;font-weight:900;color:#fff;">'+zGesamt.toFixed(2)+' &euro;</div>'+
      '</div>';

    card.appendChild(zDiv);
    pane.appendChild(card);
  });
}


function renderHRZuschlag() {
  const pane = document.getElementById('hr-zuschlag-pane');
  if(!pane) return;
  pane.innerHTML = '';

  // ── Titel ──
  const titel = document.createElement('div');
  titel.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:10px;';
  titel.textContent = '💰 Zuschlagspläne verwalten';
  pane.appendChild(titel);

  // ── Neuer Plan Button ──
  const newBtn = document.createElement('button');
  newBtn.style.cssText = 'width:100%;background:#1e3a5f;color:#fff;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:14px;';
  newBtn.textContent = '+ Neuen Plan erstellen';
  newBtn.addEventListener('click', function() { renderZuschlagFormular(null, pane); });
  pane.appendChild(newBtn);

  // ── Bestehende Pläne ──
  zuschlagsPlaene.forEach(function(plan) {
    const card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:10px;border-left:4px solid ' + (plan.istDefault ? '#1e3a5f' : '#0f766e') + ';';

    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';
    const planName = document.createElement('div');
    planName.style.cssText = 'font-size:14px;font-weight:800;';
    planName.textContent = plan.name + (plan.istDefault ? ' ★' : '');
    head.appendChild(planName);

    if(!plan.istDefault) {
      const delBtn = document.createElement('button');
      delBtn.style.cssText = 'background:#fee2e2;border:none;border-radius:7px;padding:5px 10px;font-size:11px;font-weight:700;color:#dc2626;cursor:pointer;font-family:inherit;';
      delBtn.textContent = '🗑';
      delBtn.addEventListener('click', (function(id){ return function(){
        if(!confirm('Plan löschen?')) return;
        zuschlagsPlaene = zuschlagsPlaene.filter(function(p){return p.id!==id;});
        lsSave('zuschlagsPlaene', zuschlagsPlaene); fbSave('zuschlagsPlaene', zuschlagsPlaene);
        renderHRZuschlag();
      };})(plan.id));
      head.appendChild(delBtn);
    }
    card.appendChild(head);

    // Zuschlag-Werte anzeigen
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;';
    [
      ['🌙 Nachtzuschlag (22-6 Uhr)', plan.nacht+'%'],
      ['☀️ Sonntagszuschlag', plan.sonntag+'%'],
      ['🎉 Feiertagszuschlag', plan.feiertag+'%'],
      ['🌙☀️ Nacht + So/Ft kombiniert', plan.nachtSoFt+'%'],
    ].forEach(function(row) {
      const item = document.createElement('div');
      item.style.cssText = 'background:#f5f5f5;border-radius:8px;padding:8px;';
      item.innerHTML = '<div style="font-size:10px;color:#888;">' + row[0] + '</div><div style="font-size:16px;font-weight:800;color:#1e3a5f;">' + row[1] + '</div>';
      grid.appendChild(item);
    });
    card.appendChild(grid);

    // Wer nutzt diesen Plan
    const nutzer = names.filter(function(n){ return (maProfiles[n]||{}).zuschlagsPlanId === plan.id || (!( maProfiles[n]||{}).zuschlagsPlanId && plan.istDefault); });
    if(nutzer.length) {
      const nutzerDiv = document.createElement('div');
      nutzerDiv.style.cssText = 'font-size:11px;color:#888;margin-bottom:8px;';
      nutzerDiv.textContent = 'Mitarbeiter: ' + nutzer.join(', ');
      card.appendChild(nutzerDiv);
    }

    // Bearbeiten Button
    const editBtn = document.createElement('button');
    editBtn.style.cssText = 'width:100%;background:#f0f4ff;border:none;border-radius:8px;padding:8px;font-size:12px;font-weight:700;color:#1e3a5f;cursor:pointer;font-family:inherit;';
    editBtn.textContent = '✏️ Bearbeiten';
    editBtn.addEventListener('click', (function(p){ return function(){ renderZuschlagFormular(p, pane); }; })(plan));
    card.appendChild(editBtn);

    pane.appendChild(card);
  });
}

function renderZuschlagFormular(plan, pane) {
  const isNew = !plan;
  const id = plan ? plan.id : 'plan_' + Date.now();

  // Formular-Overlay über dem Pane
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;';

  const form = document.createElement('div');
  form.style.cssText = 'background:#fff;border-radius:16px;padding:20px;width:100%;max-width:380px;max-height:90vh;overflow-y:auto;';

  form.innerHTML =
    '<div style="font-size:18px;font-weight:900;margin-bottom:14px;">' + (isNew ? '+ Neuer Plan' : '✏️ Plan bearbeiten') + '</div>' +
    '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">Planname</label>' +
    '<input id="zp-name" type="text" value="' + (plan?plan.name:'') + '" placeholder="z.B. Aushilfe-Plan" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:14px;font-family:inherit;outline:none;margin-bottom:10px;">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">' +
      '<div><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">🌙 Nacht (22-6 Uhr) %</label>' +
      '<input id="zp-nacht" type="number" min="0" max="100" value="' + (plan?plan.nacht:25) + '" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:16px;font-weight:700;font-family:inherit;outline:none;text-align:center;"></div>' +
      '<div><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">☀️ Sonntag %</label>' +
      '<input id="zp-so" type="number" min="0" max="100" value="' + (plan?plan.sonntag:25) + '" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:16px;font-weight:700;font-family:inherit;outline:none;text-align:center;"></div>' +
      '<div><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">🎉 Feiertag %</label>' +
      '<input id="zp-ft" type="number" min="0" max="100" value="' + (plan?plan.feiertag:25) + '" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:16px;font-weight:700;font-family:inherit;outline:none;text-align:center;"></div>' +
      '<div><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">🌙☀️ Nacht+So/Ft %</label>' +
      '<input id="zp-nsoFt" type="number" min="0" max="100" value="' + (plan?plan.nachtSoFt:50) + '" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px;font-size:16px;font-weight:700;font-family:inherit;outline:none;text-align:center;"></div>' +
    '</div>' +
    '<div style="font-size:11px;color:#888;margin-bottom:14px;">Alle Zuschläge sind steuerfrei nach § 3b EStG. Nacht = 22:00–06:00 Uhr.</div>';

  const saveBtn = document.createElement('button');
  saveBtn.style.cssText = 'width:100%;background:#1e3a5f;color:#fff;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:8px;';
  saveBtn.textContent = '💾 Speichern';
  saveBtn.addEventListener('click', function() {
    const name = document.getElementById('zp-name').value.trim();
    if(!name) { alert('Bitte Planname eingeben.'); return; }
    const updated = {
      id: id,
      name: name,
      nacht:    parseInt(document.getElementById('zp-nacht').value)||0,
      sonntag:  parseInt(document.getElementById('zp-so').value)||0,
      feiertag: parseInt(document.getElementById('zp-ft').value)||0,
      nachtSoFt:parseInt(document.getElementById('zp-nsoFt').value)||0,
      istDefault: plan ? plan.istDefault : false
    };
    const idx = zuschlagsPlaene.findIndex(function(p){return p.id===id;});
    if(idx !== -1) zuschlagsPlaene[idx] = updated;
    else zuschlagsPlaene.push(updated);
    lsSave('zuschlagsPlaene', zuschlagsPlaene); fbSave('zuschlagsPlaene', zuschlagsPlaene);
    document.body.removeChild(overlay);
    renderHRZuschlag();
  });
  form.appendChild(saveBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.style.cssText = 'width:100%;background:none;border:none;color:#888;font-size:13px;cursor:pointer;font-family:inherit;';
  cancelBtn.textContent = 'Abbrechen';
  cancelBtn.addEventListener('click', function(){ document.body.removeChild(overlay); });
  form.appendChild(cancelBtn);

  overlay.appendChild(form);
  document.body.appendChild(overlay);
}

function renderHRProfile() {
  const pane = document.getElementById('hr-tab-profile');
  if(!pane) return;
  let html = '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">👤 Mitarbeiterprofile</div>';

  names.forEach(function(name) {
    const prof = maProfiles[name]||{};
    html += '<div style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:10px;">'+
      '<div style="font-size:14px;font-weight:800;margin-bottom:10px;">👤 '+name+'</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">'+
        '<div><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">Soll-Std/Woche</label>'+
        '<input type="number" id="prof-soll-'+name+'" value="'+(prof.stundenSoll||'')+'" placeholder="z.B. 40" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:8px;font-size:13px;font-family:inherit;outline:none;"></div>'+
        '<div><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">Brutto (€/Monat)</label>'+
        '<input type="number" id="prof-gehalt-'+name+'" value="'+(prof.bruttoGehalt||'')+'" placeholder="z.B. 2000" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:8px;font-size:13px;font-family:inherit;outline:none;"></div>'+
        '<div><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">Urlaub (Tage/Jahr, voll)</label>'+
        '<input type="number" id="prof-urlaub-'+name+'" value="'+(prof.urlaubAnspruch||30)+'" placeholder="30" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:8px;font-size:13px;font-family:inherit;outline:none;"></div>'+
        '<div><label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">PIN (4-stellig)</label>'+
        '<input type="password" id="prof-pin-'+name+'" value="'+(prof.pin||'')+'" placeholder="1234" maxlength="6" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:8px;font-size:13px;font-family:inherit;outline:none;"></div>'+
      '</div>'+
      '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">Zuschlagsplan</label>'+
      '<select id="prof-plan-'+name+'" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:8px;font-size:13px;font-family:inherit;outline:none;margin-bottom:10px;">'+
      '</select>'+
      '<div style="margin-bottom:10px;">'+
        '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:3px;">Eintrittsdatum</label>'+
        '<input type="date" id="prof-eintritt-'+name+'" value="'+(prof.eintrittsDatum||'')+'" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:8px;font-size:13px;font-family:inherit;outline:none;">'+
        '<div id="prof-urlaub-hint-'+name+'" style="font-size:11px;margin-top:5px;padding:7px 10px;border-radius:7px;background:#f0f4ff;color:#1e3a5f;font-weight:600;display:none;"></div>'+
      '</div>'+
      '<button onclick="saveMaProfile(this.dataset.name)" data-name="'+name+'" style="width:100%;background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">💾 Speichern</button>'+
      '</div>';
  });
  pane.innerHTML = html;
  // Attach live hints after render
  names.forEach(function(n){
    var urlEl=document.getElementById('prof-urlaub-'+n);
    var eintEl=document.getElementById('prof-eintritt-'+n);
    if(urlEl) urlEl.addEventListener('input',function(){ updateUrlaubHinweis(n); });
    if(eintEl) { eintEl.addEventListener('input',function(){ updateUrlaubHinweis(n); }); updateUrlaubHinweis(n); }
    // Plan-Dropdown befüllen
    var planSel = document.getElementById('prof-plan-'+n);
    if(planSel) {
      planSel.innerHTML = '';
      var profN = maProfiles[n]||{};
      zuschlagsPlaene.forEach(function(p){
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name + (p.istDefault?' (Standard)':'');
        if(profN.zuschlagsPlanId===p.id || (!profN.zuschlagsPlanId && p.istDefault)) opt.selected = true;
        planSel.appendChild(opt);
      });
    }
  });
}

function saveMaProfile(name) {
  if(!maProfiles[name]) maProfiles[name]={};
  const stundenSoll = parseFloat(document.getElementById('prof-soll-'+name).value)||0;
  maProfiles[name].stundenSoll = stundenSoll;
  maProfiles[name].sollTagMin = Math.round(stundenSoll * 60 / 5); // daily minutes (weekly/5)
  maProfiles[name].bruttoGehalt = parseFloat(document.getElementById('prof-gehalt-'+name).value)||0;
  maProfiles[name].urlaubAnspruch = parseInt(document.getElementById('prof-urlaub-'+name).value)||30;
  maProfiles[name].eintrittsDatum = document.getElementById('prof-eintritt-'+name).value||'';
  maProfiles[name].pin = document.getElementById('prof-pin-'+name).value;
  const planSel=document.getElementById('prof-plan-'+name);if(planSel) maProfiles[name].zuschlagsPlanId=planSel.value;
  lsSave('maProfiles',maProfiles);
  fbSave('maProfiles',maProfiles);
  showSaveAnimation(null);
}

// ═══════════════════════════════════════════
// MA PROFIL (Mitarbeiter-Ansicht)
// ═══════════════════════════════════════════
function openMaProfil() {
  // Show name + PIN selection
  const body = document.getElementById('maprofil-body');
  body.innerHTML = '';
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border-radius:13px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.08);margin-bottom:12px;';
  card.innerHTML = '<div style="font-size:15px;font-weight:800;margin-bottom:12px;">👤 Mein Profil</div>'+
    '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:4px;">Name auswählen</label>'+
    '<select id="mp-name" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:10px;font-size:14px;font-family:inherit;margin-bottom:10px;outline:none;">'+
    names.map(function(n){return '<option>'+n+'</option>';}).join('')+
    '</select>'+
    '<label style="font-size:11px;font-weight:700;color:#666;display:block;margin-bottom:4px;">PIN</label>'+
    '<div id="mp-pin-display" data-pin="" style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:10px;font-size:24px;letter-spacing:8px;text-align:center;margin-bottom:6px;min-height:44px;background:#f9f9f9;"></div>'+
    buildPinPad('mp-pin-display')+'<div style="margin-bottom:6px;"></div>';
  const loginBtn = document.createElement('button');
  loginBtn.style.cssText = 'width:100%;background:#0f3460;color:#fff;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;';
  loginBtn.textContent = '🔓 Profil öffnen';
  loginBtn.onclick = function() {
    const name = document.getElementById('mp-name').value;
    const mpDisp=document.getElementById('mp-pin-display'); const pin=mpDisp?mpDisp.getAttribute('data-pin')||'':'';
    const prof = maProfiles[name]||{};
    if(prof.pin && pin !== prof.pin) { alert('Falscher PIN.'); return; }
    renderMaProfilDetails(name, body);
  };
  card.appendChild(loginBtn);
  body.appendChild(card);
  $text('maprofil-title', 'Mein Profil');
  go('s-maprofil');
}

function renderMaProfilDetails(name, body) {
  const prof = maProfiles[name]||{};
  const now = new Date();
  const todayStr = now.toISOString().slice(0,10);
  const thisMonth = now.toISOString().slice(0,7);
  const allEntries   = zeiterfassung.filter(function(z){return z.ma===name;});
  const monthEntries = allEntries.filter(function(z){return z.datum.startsWith(thisMonth);});
  const monthMin = monthEntries.reduce(function(s,z){return s+(z.nettoMin||0);},0);

  // Soll nur ab erstem Eintrag zählen
  const firstEntry = allEntries.length ? allEntries.slice().sort(function(a,b){return a.datum<b.datum?-1:1;})[0] : null;
  const startDatum = firstEntry ? firstEntry.datum : todayStr;
  const sollWocheMin = (prof.stundenSoll||0)*60;
  const sollTagMin = sollWocheMin/5;
  var countAT = function(fromStr, toStr) {
    const from = new Date(fromStr < thisMonth+'-01' ? thisMonth+'-01' : fromStr);
    const to = new Date(toStr);
    let d = 0; const cur = new Date(from);
    while(cur<=to){ if(cur.getDay()!==0) d++; cur.setDate(cur.getDate()+1); }
    return d;
  }
  const arbeitstage = countAT(startDatum, todayStr);
  const sollMonat = Math.round(sollTagMin * arbeitstage);

  // Urlaub
  const anspruch = calcUrlaubsanspruchDiesesJahr(prof.urlaubAnspruch||0, prof.eintrittsDatum||'');
  const used = urlaubAntraege.filter(function(a){return a.ma===name&&a.status==='genehmigt';})
    .reduce(function(s,a){ return s+(a.urlaubTage||0); },0);
  const rest = anspruch-used;

  body.innerHTML = '';
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border-radius:13px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.08);margin-bottom:12px;';
  card.innerHTML =
    '<div style="font-size:18px;font-weight:900;margin-bottom:12px;">👤 '+name+'</div>'+
    '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">⏱️ Arbeitszeit '+thisMonth+'</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">'+
      '<div style="background:#f0f4ff;border-radius:9px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:900;color:#1e3a5f;">'+Math.floor(monthMin/60)+'h '+monthMin%60+'m</div><div style="font-size:10px;color:#888;">Geleistet</div></div>'+
      (sollMonat>0 ?
        '<div style="background:'+(monthMin>=sollMonat?'#f0fdf4':'#fff5f5')+';border-radius:9px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:900;color:'+(monthMin>=sollMonat?'#16a34a':'#ef4444')+'">'+(monthMin>=sollMonat?'+':'')+Math.floor(Math.abs(monthMin-sollMonat)/60)+'h</div><div style="font-size:10px;color:#888;">'+(monthMin>=sollMonat?'Überstunden':'Minus')+'</div></div>'
        : '<div style="background:#f5f5f5;border-radius:9px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:900;color:#888;">–</div><div style="font-size:10px;color:#888;">Kein Soll</div></div>'
      )+
    '</div>'+
    '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">🌴 Urlaub</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">'+
      '<div style="background:#f5f5f5;border-radius:9px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:900;">'+anspruch+'</div><div style="font-size:10px;color:#888;">Anspruch</div></div>'+
      '<div style="background:#f5f5f5;border-radius:9px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:900;color:#f59e0b;">'+used+'</div><div style="font-size:10px;color:#888;">Genommen</div></div>'+
      '<div style="background:#f0fdf4;border-radius:9px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:900;color:#16a34a;">'+rest+'</div><div style="font-size:10px;color:#888;">Verfügbar</div></div>'+
    '</div>';

  // Urlaub beantragen button
  const urlBtn = document.createElement('button');
  urlBtn.style.cssText = 'width:100%;background:#0f766e;color:#fff;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:8px;';
  urlBtn.textContent = '🌴 Urlaub beantragen';
  urlBtn.onclick = function() {
    openUrlaub(name);
  };
  card.appendChild(urlBtn);
  body.appendChild(card);
}

