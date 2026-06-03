// HR.JS - Wiederhergestellt aus Original

function getZuschlagsPlan(planId) {
  if(!planId) return zuschlagsPlaene.find(function(p){return p.istDefault;}) || zuschlagsPlaene[0];
  return zuschlagsPlaene.find(function(p){return p.id===planId;}) || zuschlagsPlaene[0];
}

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
  const pane = document.getElementById('hr-tab-zeiten');
  if(!pane) return;
  const now = new Date();
  const todayStr = now.toISOString().slice(0,10);
  const thisMonth = now.toISOString().slice(0,7);
  const thisWeek = getWeekStart(now);

  let html = '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">Zeitkonto ' + now.toLocaleDateString('de-DE',{month:'long',year:'numeric'}) + '</div>';

  names.forEach(function(name) {
    const allEntries   = zeiterfassung.filter(function(z){return z.ma===name;});
    const monthEntries = allEntries.filter(function(z){return z.datum.startsWith(thisMonth);});
    const weekEntries  = allEntries.filter(function(z){return z.datum>=thisWeek;});
    const todayEntries = allEntries.filter(function(z){return z.datum===todayStr;});

    const monthMin = monthEntries.reduce(function(s,z){return s+(z.nettoMin||0);},0);
    const weekMin  = weekEntries.reduce(function(s,z){return s+(z.nettoMin||0);},0);
    const todayMin = todayEntries.reduce(function(s,z){return s+(z.nettoMin||0);},0);

    const prof = maProfiles[name] || {};
    const sollWocheMin = (prof.stundenSoll||0) * 60;

    // ── Soll: nur ab erstem Zeiteintrag zählen ──
    // Erster Eintrag dieses Mitarbeiters überhaupt
    const firstEntry = allEntries.length ? allEntries.slice().sort(function(a,b){return a.datum<b.datum?-1:1;})[0] : null;
    const startDatum = firstEntry ? firstEntry.datum : todayStr;

    // Anzahl der Werktage (Mo-Sa) zwischen Start und heute im laufenden Monat
    var countArbeitstage = function(fromStr, toStr) {
      const from = new Date(fromStr < thisMonth+'-01' ? thisMonth+'-01' : fromStr);
      const to   = new Date(toStr);
      let days = 0;
      const d = new Date(from);
      while(d <= to) {
        const dow = d.getDay();
        if(dow !== 0) days++; // alle außer Sonntag (Sonntag=0)
        d.setDate(d.getDate()+1);
      }
      return days;
    }

    // Soll pro Tag = Wochenstunden / 6 (Mo-Sa) oder / 5 (Mo-Fr)
    // Wir nehmen 5 Tage/Woche als Basis (Standardarbeitsvertrag)
    const sollTagMin = sollWocheMin / 5;
    const arbeitstage = countArbeitstage(startDatum, todayStr);
    const sollMonat = Math.round(sollTagMin * arbeitstage);

    const diffMin = monthMin - sollMonat;

    // Zuschlag berechnung
    const nachtMin = monthEntries.reduce(function(s,z){return s+(z.zuschlaege?z.zuschlaege.nachtMin:0);},0);
    const soFtMin  = monthEntries.reduce(function(s,z){return s+(z.zuschlaege?z.zuschlaege.soFtMin:0);},0);
    const nachtSoFtMin = monthEntries.reduce(function(s,z){return s+(z.zuschlaege?z.zuschlaege.nachtSoFtMin:0);},0);

    const stundenlohn = prof.bruttoGehalt&&prof.stundenSoll ? (prof.bruttoGehalt*12)/(prof.stundenSoll*52) : 0;
    const zuEuro = calcZuschlagEuro(nachtMin, soFtMin, nachtSoFtMin, stundenlohn, prof.zuschlagsPlanId);
    const totalZuschlag = zuEuro.total;

    const diffColor = diffMin>=0?'#16a34a':'#ef4444';
    const diffStr = (diffMin>=0?'+':'')+Math.floor(diffMin/60)+'h '+Math.abs(diffMin%60)+'min';

    html += '<div style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:10px;">'+
      '<div style="font-size:14px;font-weight:800;margin-bottom:8px;">👤 '+name+'</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">'+
        '<div style="background:#f5f5f5;border-radius:8px;padding:8px;text-align:center;"><div style="font-size:16px;font-weight:800;color:#1e3a5f;">'+Math.floor(todayMin/60)+'h'+todayMin%60+'m</div><div style="font-size:10px;color:#888;">Heute</div></div>'+
        '<div style="background:#f5f5f5;border-radius:8px;padding:8px;text-align:center;"><div style="font-size:16px;font-weight:800;color:#1e3a5f;">'+Math.floor(weekMin/60)+'h'+weekMin%60+'m</div><div style="font-size:10px;color:#888;">Woche</div></div>'+
        '<div style="background:#f5f5f5;border-radius:8px;padding:8px;text-align:center;"><div style="font-size:16px;font-weight:800;color:#1e3a5f;">'+Math.floor(monthMin/60)+'h'+monthMin%60+'m</div><div style="font-size:10px;color:#888;">Monat</div></div>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">'+
        '<span>Soll ab '+startDatum+': <strong>'+(sollMonat?Math.floor(sollMonat/60)+'h'+(sollMonat%60?''+sollMonat%60+'m':''):'–')+'</strong> ('+arbeitstage+'&nbsp;AT)</span>'+
        '<span style="color:'+diffColor+';font-weight:700;">'+(sollWocheMin?diffStr:'–')+'</span>'+
      '</div>'+
      (totalZuschlag>0?'<div style="background:#fffbeb;border-radius:8px;padding:8px;font-size:12px;margin-top:6px;">'+
        '💰 Zuschläge: <strong>'+totalZuschlag.toFixed(2)+'€</strong> (steuerfrei)'+
        '<div style="font-size:10px;color:#888;margin-top:2px;">Nacht: '+Math.round(nachtMin/60*10)/10+'h · So/Ft: '+Math.round(soFtMin/60*10)/10+'h · Nacht+So/Ft: '+Math.round(nachtSoFtMin/60*10)/10+'h</div>'+
        '</div>':'')+
      '<button onclick="showMaZeitDetail(this.dataset.name)" data-name='+name+'" style="width:100%;background:#f4f4f4;border:none;border-radius:8px;padding:8px;font-size:12px;font-weight:700;cursor:pointer;margin-top:8px;font-family:inherit;">📋 Details anzeigen</button>'+
      '</div>';
  });

  pane.innerHTML = html;
  // Attach live hints and plan options after render
  names.forEach(function(n){
    var urlEl=document.getElementById('prof-urlaub-'+n);
    var eintEl=document.getElementById('prof-eintritt-'+n);
    if(urlEl) urlEl.addEventListener('input',function(){ updateUrlaubHinweis(n); });
    if(eintEl) { eintEl.addEventListener('input',function(){ updateUrlaubHinweis(n); }); updateUrlaubHinweis(n); }
    // Plan-Options befüllen
    var planSel = document.getElementById('prof-plan-'+n);
    if(planSel && planSel.options.length === 0) {
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

function renderHRZeiten() {
  const pane = document.getElementById('hr-tab-zeiten');
  if(!pane) return;
  const now = new Date();
  const todayStr = now.toISOString().slice(0,10);
  const thisMonth = now.toISOString().slice(0,7);
  const thisWeek = getWeekStart(now);

  let html = '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">Zeitkonto ' + now.toLocaleDateString('de-DE',{month:'long',year:'numeric'}) + '</div>';

  names.forEach(function(name) {
    const allEntries   = zeiterfassung.filter(function(z){return z.ma===name;});
    const monthEntries = allEntries.filter(function(z){return z.datum.startsWith(thisMonth);});
    const weekEntries  = allEntries.filter(function(z){return z.datum>=thisWeek;});
    const todayEntries = allEntries.filter(function(z){return z.datum===todayStr;});

    const monthMin = monthEntries.reduce(function(s,z){return s+(z.nettoMin||0);},0);
    const weekMin  = weekEntries.reduce(function(s,z){return s+(z.nettoMin||0);},0);
    const todayMin = todayEntries.reduce(function(s,z){return s+(z.nettoMin||0);},0);

    const prof = maProfiles[name] || {};
    const sollWocheMin = (prof.stundenSoll||0) * 60;

    // ── Soll: nur ab erstem Zeiteintrag zählen ──
    // Erster Eintrag dieses Mitarbeiters überhaupt
    const firstEntry = allEntries.length ? allEntries.slice().sort(function(a,b){return a.datum<b.datum?-1:1;})[0] : null;
    const startDatum = firstEntry ? firstEntry.datum : todayStr;

    // Anzahl der Werktage (Mo-Sa) zwischen Start und heute im laufenden Monat
    var countArbeitstage = function(fromStr, toStr) {
      const from = new Date(fromStr < thisMonth+'-01' ? thisMonth+'-01' : fromStr);
      const to   = new Date(toStr);
      let days = 0;
      const d = new Date(from);
      while(d <= to) {
        const dow = d.getDay();
        if(dow !== 0) days++; // alle außer Sonntag (Sonntag=0)
        d.setDate(d.getDate()+1);
      }
      return days;
    }

    // Soll pro Tag = Wochenstunden / 6 (Mo-Sa) oder / 5 (Mo-Fr)
    // Wir nehmen 5 Tage/Woche als Basis (Standardarbeitsvertrag)
    const sollTagMin = sollWocheMin / 5;
    const arbeitstage = countArbeitstage(startDatum, todayStr);
    const sollMonat = Math.round(sollTagMin * arbeitstage);

    const diffMin = monthMin - sollMonat;

    // Zuschlag berechnung
    const nachtMin = monthEntries.reduce(function(s,z){return s+(z.zuschlaege?z.zuschlaege.nachtMin:0);},0);
    const soFtMin  = monthEntries.reduce(function(s,z){return s+(z.zuschlaege?z.zuschlaege.soFtMin:0);},0);
    const nachtSoFtMin = monthEntries.reduce(function(s,z){return s+(z.zuschlaege?z.zuschlaege.nachtSoFtMin:0);},0);

    const stundenlohn = prof.bruttoGehalt&&prof.stundenSoll ? (prof.bruttoGehalt*12)/(prof.stundenSoll*52) : 0;
    const zuEuro = calcZuschlagEuro(nachtMin, soFtMin, nachtSoFtMin, stundenlohn, prof.zuschlagsPlanId);
    const totalZuschlag = zuEuro.total;

    const diffColor = diffMin>=0?'#16a34a':'#ef4444';
    const diffStr = (diffMin>=0?'+':'')+Math.floor(diffMin/60)+'h '+Math.abs(diffMin%60)+'min';

    html += '<div style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 7px rgba(0,0,0,.07);margin-bottom:10px;">'+
      '<div style="font-size:14px;font-weight:800;margin-bottom:8px;">👤 '+name+'</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">'+
        '<div style="background:#f5f5f5;border-radius:8px;padding:8px;text-align:center;"><div style="font-size:16px;font-weight:800;color:#1e3a5f;">'+Math.floor(todayMin/60)+'h'+todayMin%60+'m</div><div style="font-size:10px;color:#888;">Heute</div></div>'+
        '<div style="background:#f5f5f5;border-radius:8px;padding:8px;text-align:center;"><div style="font-size:16px;font-weight:800;color:#1e3a5f;">'+Math.floor(weekMin/60)+'h'+weekMin%60+'m</div><div style="font-size:10px;color:#888;">Woche</div></div>'+
        '<div style="background:#f5f5f5;border-radius:8px;padding:8px;text-align:center;"><div style="font-size:16px;font-weight:800;color:#1e3a5f;">'+Math.floor(monthMin/60)+'h'+monthMin%60+'m</div><div style="font-size:10px;color:#888;">Monat</div></div>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">'+
        '<span>Soll ab '+startDatum+': <strong>'+(sollMonat?Math.floor(sollMonat/60)+'h'+(sollMonat%60?''+sollMonat%60+'m':''):'–')+'</strong> ('+arbeitstage+'&nbsp;AT)</span>'+
        '<span style="color:'+diffColor+';font-weight:700;">'+(sollWocheMin?diffStr:'–')+'</span>'+
      '</div>'+
      (totalZuschlag>0?'<div style="background:#fffbeb;border-radius:8px;padding:8px;font-size:12px;margin-top:6px;">'+
        '💰 Zuschläge: <strong>'+totalZuschlag.toFixed(2)+'€</strong> (steuerfrei)'+
        '<div style="font-size:10px;color:#888;margin-top:2px;">Nacht: '+Math.round(nachtMin/60*10)/10+'h · So/Ft: '+Math.round(soFtMin/60*10)/10+'h · Nacht+So/Ft: '+Math.round(nachtSoFtMin/60*10)/10+'h</div>'+
        '</div>':'')+
      '<button onclick="showMaZeitDetail(this.dataset.name)" data-name='+name+'" style="width:100%;background:#f4f4f4;border:none;border-radius:8px;padding:8px;font-size:12px;font-weight:700;cursor:pointer;margin-top:8px;font-family:inherit;">📋 Details anzeigen</button>'+
      '</div>';
  });

  pane.innerHTML = html;
  // Attach live hints and plan options after render
  names.forEach(function(n){
    var urlEl=document.getElementById('prof-urlaub-'+n);
    var eintEl=document.getElementById('prof-eintritt-'+n);
    if(urlEl) urlEl.addEventListener('input',function(){ updateUrlaubHinweis(n); });
    if(eintEl) { eintEl.addEventListener('input',function(){ updateUrlaubHinweis(n); }); updateUrlaubHinweis(n); }
    // Plan-Options befüllen
    var planSel = document.getElementById('prof-plan-'+n);
    if(planSel && planSel.options.length === 0) {
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

function getWeekStart(d) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day===0?-6:1);
  const mon = new Date(d.setDate(diff));
  return mon.toISOString().slice(0,10);
}

function showMaZeitDetail(name) {
  const now = new Date();
  const thisMonth = now.toISOString().slice(0,7);
  const entries = zeiterfassung.filter(z=>z.ma===name&&z.datum.startsWith(thisMonth));

  let msg = '📋 '+name+' – '+thisMonth+'\n\n';
  if(!entries.length) { msg += 'Keine Einträge'; }
  else {
    entries.forEach(function(z) {
      const d = new Date(z.datum);
      const days=['So','Mo','Di','Mi','Do','Fr','Sa'];
      msg += days[d.getDay()]+' '+d.getDate()+'. · '+z.istStart+'-'+z.istEnd+' · '+Math.floor(z.nettoMin/60)+'h'+z.nettoMin%60+'min';
      if(z.grund) msg += ' ('+z.grund+')';
      msg += '\n';
    });
  }
  alert(msg);
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
  titel.textContent = '💰 Gehaltsübersicht · ' + now.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
  pane.appendChild(titel);

  names.forEach(function(name){
    var prof = maProfiles[name]||{};
    var brutto = prof.bruttoGehalt||0;
    var stundenSoll = prof.stundenSoll||0;
    var stundenlohn = (brutto&&stundenSoll) ? (brutto*12)/(stundenSoll*52) : 0;
    var planId = prof.zuschlagsPlanId||null;

    var eintraege = zeiterfassung.filter(function(z){ return z.ma===name && z.datum.startsWith(thisMonth); });
    var nettoStd = eintraege.reduce(function(s,z){ return s+(z.nettoMin||0); },0)/60;
    var istGehalt = stundenlohn ? stundenlohn*nettoStd : 0;

    // Zuschläge getrennt nach §3b EStG
    var zNacht=0, zSonntag=0, zFeiertag=0, zNachtSo=0, zNachtFt=0;
    eintraege.forEach(function(z){
      if(!z.istStart||!z.istEnd) return;
      var p1=z.istStart.split(':'), p2=z.istEnd.split(':');
      var sh=parseInt(p1[0]),sm=parseInt(p1[1]),eh=parseInt(p2[0]),em=parseInt(p2[1]);
      var brMin=(eh*60+em)-(sh*60+sm); if(brMin<0) brMin+=24*60;
      var tagTyp = new Date(z.datum+'T12:00:00').getDay()===0?'so':isFeiertag(z.datum)?'ft':'wt';
      var res = calcZuschlaege(z.datum,sh*60+sm,sh*60+sm+brMin,tagTyp,planId);
      var ze  = calcZuschlagEuro(res.nachtMin,res.soFtMin,res.nachtSoFtMin,stundenlohn,planId);
      zNacht += ze.zNacht;
      if(tagTyp==='so'){ zSonntag+=ze.zSoFt; zNachtSo+=ze.zNachtSoFt; }
      else if(tagTyp==='ft'){ zFeiertag+=ze.zSoFt; zNachtFt+=ze.zNachtSoFt; }
    });
    var zGesamt = zNacht+zSonntag+zFeiertag+zNachtSo+zNachtFt;
    var plan = getZuschlagsPlan(planId);

    var card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:10px;box-shadow:0 2px 7px rgba(0,0,0,.07);';

    card.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'+
        '<div style="font-size:15px;font-weight:800;">'+name+'</div>'+
        '<div style="font-size:11px;background:#f0f4ff;color:#1e3a5f;border-radius:6px;padding:3px 8px;">'+( plan?plan.name:'Kein Plan')+'</div>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">'+
        '<div style="background:#f9f9f9;border-radius:8px;padding:8px;">'+
          '<div style="font-size:10px;color:#888;">Brutto/Monat</div>'+
          '<div style="font-size:15px;font-weight:800;color:#1a1a1a;">'+(brutto?brutto.toFixed(2)+' €':'–')+'</div>'+
        '</div>'+
        '<div style="background:#f9f9f9;border-radius:8px;padding:8px;">'+
          '<div style="font-size:10px;color:#888;">Stundenlohn</div>'+
          '<div style="font-size:15px;font-weight:800;color:#1a1a1a;">'+(stundenlohn?stundenlohn.toFixed(2)+' €/h':'–')+'</div>'+
        '</div>'+
        '<div style="background:#f9f9f9;border-radius:8px;padding:8px;">'+
          '<div style="font-size:10px;color:#888;">Ist-Stunden</div>'+
          '<div style="font-size:15px;font-weight:800;color:#1e3a5f;">'+nettoStd.toFixed(1)+'h</div>'+
        '</div>'+
        '<div style="background:#f9f9f9;border-radius:8px;padding:8px;">'+
          '<div style="font-size:10px;color:#888;">Ist-Gehalt ca.</div>'+
          '<div style="font-size:15px;font-weight:800;color:#1e3a5f;">'+(istGehalt?istGehalt.toFixed(2)+' €':'–')+'</div>'+
        '</div>'+
      '</div>';

    // Zuschläge (immer anzeigen für Steuerberater)
    var zDiv = document.createElement('div');
    zDiv.style.cssText = 'border-top:1.5px solid #f0f0f0;padding-top:10px;margin-top:2px;';

    var zRow = function(ico, label, para, val, bg, col) {
      return '<div style="background:'+bg+';border-radius:8px;padding:8px 10px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center;">'+
        '<div><div style="font-size:12px;font-weight:700;color:'+col+';">'+ico+' '+label+'</div>'+
        '<div style="font-size:10px;color:#999;">'+para+'</div></div>'+
        '<div style="font-size:14px;font-weight:900;color:'+col+';">'+val+'</div></div>';
    }

    zDiv.innerHTML =
      '<div style="font-size:11px;font-weight:700;color:#1e3a5f;margin-bottom:8px;">💰 Steuerfreie Zuschläge (§3b EStG)</div>'+
      zRow('🌙','Nachtarbeit','§3b Nr.1 · 22–06 Uhr', zNacht.toFixed(2)+' €','#fef3c7','#92400e')+
      zRow('☀️','Sonntagsarbeit','§3b Nr.2', zSonntag.toFixed(2)+' €','#dcfce7','#15803d')+
      zRow('🎉','Feiertagsarbeit','§3b Nr.3', zFeiertag.toFixed(2)+' €','#ede9fe','#6d28d9')+
      (zNachtSo>0 ? zRow('🌙☀️','Nacht+Sonntag','§3b kombiniert', zNachtSo.toFixed(2)+' €','#fff7ed','#c2410c') : '')+
      (zNachtFt>0 ? zRow('🌙🎉','Nacht+Feiertag','§3b kombiniert', zNachtFt.toFixed(2)+' €','#f0f4ff','#1e3a5f') : '')+
      '<div style="background:#1e3a5f;border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;margin-top:4px;">'+
        '<div>'+
          '<div style="font-size:13px;font-weight:800;color:#fff;">Gesamt Zuschläge</div>'+
          '<div style="font-size:10px;color:rgba(255,255,255,.6);">Zusätzlich zum Bruttogehalt</div>'+
        '</div>'+
        '<div style="font-size:17px;font-weight:900;color:#fff;">'+zGesamt.toFixed(2)+' €</div>'+
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

