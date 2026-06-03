// ═══════════════════════════════════════════════════════════════
// FIREBASE-SYNC.JS
// Dienstplan (DP) - Schichtplanung und Stundenverwaltung
// ═══════════════════════════════════════════════════════════════

function dp_calcNetHours(von,bis){
  const[vh,vm]=von.split(':').map(Number);
  const[bh,bm]=bis.split(':').map(Number);
  let startM=vh*60+vm,endM=bh*60+bm;
  if(endM<=startM)endM+=24*60;
  let gross=(endM-startM)/60;
  return Math.round((gross>=8?gross-0.75:gross)*100)/100;
}

function dp_calcWeekHours(data){
  let total=0;
  for(const sh of DP_SHIFTS)for(let d=0;d<7;d++)for(const e of(data[sh]||[])[d]||[])total+=dp_calcNetHours(e.von,e.bis);
  return Math.round(total*100)/100;
}

function dp_load(){
  try{const r=localStorage.getItem(DP_SK);if(r)return JSON.parse(r);}catch(e){}
  return{mitarbeiter:DP_IMA,weeks:{[DP_IWK]:DP_IW},activeWeek:DP_IWK};
}

function dp_save(){
  // Immer speichern - Budget-Warnung aber nicht blockieren
  try{localStorage.setItem(DP_SK,JSON.stringify(DP));}catch(e){}
  // Firebase sync
  try{
    const dpData = {mitarbeiter:DP.mitarbeiter, weeks:DP.weeks, budget:DP.budget, activeWeek:DP.activeWeek};
    fbSave('DP', dpData);
    lsSave('DP', dpData);
  }catch(e){}
  // Budget-Warnung anzeigen (aber nicht blockieren)
  const data=DP.weeks[DP.activeWeek]||dp_emon();
  const h=dp_calcWeekHours(data);
  if(h>DP.budget){dp_toast('⚠️ Budget überschritten um '+(Math.round((h-DP.budget)*100)/100)+'h');}
  return true;
}

function dp_toast(msg){
  let t=document.getElementById('dp-toast');
  if(!t){t=document.createElement('div');t.id='dp-toast';t.style.cssText='position:fixed;bottom:70px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:700;z-index:9999;display:none;max-width:90vw;text-align:center;';document.body.appendChild(t);}
  t.textContent=msg;t.style.display='block';clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',3000);
}

function dp_updateDash(){
  const data=DP.weeks[DP.activeWeek]||dp_emon();
  const BUDGET=280,h=dp_calcWeekHours(data);
  const remain=Math.round((BUDGET-h)*100)/100;
  const pct=Math.round(h/BUDGET*1000)/10;
  const el=id=>document.getElementById(id);
  if(el('dp-planned'))el('dp-planned').textContent=h.toFixed(2).replace('.',',')+' h';
  if(el('dp-remain'))el('dp-remain').textContent=remain.toFixed(2).replace('.',',')+' h';
  if(el('dp-pct'))el('dp-pct').textContent=pct.toFixed(1).replace('.',',')+' %';
  let color=h>BUDGET?'#dc2626':pct>=90?'#ea580c':'#16a34a';
  if(el('dp-bar')){el('dp-bar').style.width=Math.min(pct,100)+'%';el('dp-bar').style.background=color;}
  if(el('dp-planned'))el('dp-planned').style.color=color;
  const warn=el('dp-warn');
  if(warn){if(h>BUDGET){const over=Math.round((h-BUDGET)*100)/100;warn.style.display='block';warn.innerHTML='⚠️ Budget überschritten um '+over.toFixed(2).replace('.',',')+'h';}else warn.style.display='none';}
}

function dp_renderMaHours(){
  const w=DP.activeWeek,data=DP.weeks[w]||dp_emon();
  const maMap={};
  DP_SHIFTS.forEach(sh=>{for(let d=0;d<7;d++)((data[sh]||[])[d]||[]).forEach(e=>{if(!maMap[e.name])maMap[e.name]=[0,0,0,0,0,0,0];maMap[e.name][d]+=dp_calcNetHours(e.von,e.bis);});});
  const names=Object.keys(maMap).sort();
  const tbody=document.getElementById('dp-ma-body');
  if(!tbody)return;
  if(!names.length){tbody.innerHTML='<tr><td colspan="9" style="text-align:center;color:#ccc;padding:12px;font-style:italic">Keine Einträge</td></tr>';return;}
  const maxH=Math.max(...names.map(n=>maMap[n].reduce((a,b)=>a+b,0)));
  tbody.innerHTML=names.map(n=>{
    const days=maMap[n],total=Math.round(days.reduce((a,b)=>a+b,0)*100)/100;
    const pct=maxH>0?Math.round(total/maxH*100):0;
    const dCells=days.map(h=>h===0?'<td style="color:#ccc;text-align:right;padding:6px 8px;font-size:11px;">–</td>':`<td style="text-align:right;padding:6px 8px;font-size:11px;font-weight:700;">${h.toFixed(1).replace('.',',')}</td>`).join('');
    return`<tr><td style="font-weight:700;padding:6px 8px;font-size:12px;"><div>${n}</div><div style="height:4px;border-radius:2px;background:#e2ddd6;margin-top:3px;"><div style="width:${pct}%;height:100%;border-radius:2px;background:#2563a8;"></div></div></td>${dCells}<td style="font-weight:700;font-size:12px;color:#c8453a;text-align:right;padding:6px 8px;">${total.toFixed(2).replace('.',',')}h</td></tr>`;
  }).join('');
}

function renderDP(){
  const root=document.getElementById('dp-root');
  if(!root)return;

  const w=DP.activeWeek,data=DP.weeks[w]||dp_emon(),t=dp_today();
  const ws=Object.keys(DP.weeks).sort();

  root.innerHTML=`
  <!-- DP Header -->
  <div style="background:#1a1714;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;">
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="background:#c8453a;color:#fff;font-weight:700;font-size:12px;padding:3px 8px;border-radius:4px;">PRIMA</span>
      <div style="font-weight:700;font-size:13px;color:#fff;">Dienstplan</div>
    </div>
    <div style="display:flex;gap:6px;">
      <button onclick="dp_openMa()" style="background:#333;border:none;border-radius:6px;color:#fff;font-size:11px;font-weight:700;padding:6px 10px;cursor:pointer;font-family:inherit;">👤 Team</button>
      <button onclick="dp_openWeek()" style="background:#333;border:none;border-radius:6px;color:#fff;font-size:11px;font-weight:700;padding:6px 10px;cursor:pointer;font-family:inherit;">＋ Woche</button>
    </div>
  </div>
  <!-- Week chips -->
  <div style="padding:8px 12px;display:flex;gap:6px;flex-wrap:wrap;background:#f5f2ed;" id="dp-chips"></div>
  <!-- Week nav -->
  <div style="padding:6px 14px;display:flex;align-items:center;gap:8px;background:#f5f2ed;">
    <div style="font-weight:700;font-size:13px;flex:1;" id="dp-wlbl"></div>
    <button onclick="dp_prevW()" style="background:#fff;border:1px solid #e2ddd6;border-radius:6px;padding:5px 10px;cursor:pointer;font-family:inherit;">◀</button>
    <button onclick="dp_nextW()" style="background:#fff;border:1px solid #e2ddd6;border-radius:6px;padding:5px 10px;cursor:pointer;font-family:inherit;">▶</button>
  </div>
  <!-- Budget warn -->
  <div id="dp-warn" style="display:none;background:#fef2f2;color:#dc2626;padding:8px 14px;font-size:12px;font-weight:700;border-top:2px solid #fecaca;border-bottom:2px solid #fecaca;"></div>
  <!-- Dashboard -->
  <div style="padding:8px 12px;background:#fff;border-bottom:1px solid #e2ddd6;display:flex;gap:8px;flex-wrap:wrap;">
    <div style="background:#f5f2ed;border-radius:8px;padding:8px 12px;flex:1;min-width:100px;">
      <div style="font-size:18px;font-weight:900;" id="dp-planned">0h</div>
      <div style="font-size:10px;color:#888;">Geplant</div>
      <div style="height:6px;border-radius:3px;background:#e2ddd6;margin-top:5px;"><div id="dp-bar" style="height:100%;border-radius:3px;background:#16a34a;width:0%;transition:width .3s;"></div></div>
    </div>
    <div style="background:#f5f2ed;border-radius:8px;padding:8px 12px;flex:1;min-width:80px;">
      <div style="font-size:18px;font-weight:900;" id="dp-remain">280h</div>
      <div style="font-size:10px;color:#888;">Budget rest</div>
    </div>
    <div style="background:#f5f2ed;border-radius:8px;padding:8px 12px;flex:1;min-width:80px;">
      <div style="font-size:18px;font-weight:900;" id="dp-pct">0%</div>
      <div style="font-size:10px;color:#888;">Auslastung</div>
    </div>
  </div>
  <!-- Table -->
  <div style="overflow-x:auto;padding:8px 0;">
  // Doppelte Erfassung verhindern
  if(tempHistory.some(function(h){ return (h.date||h.datum)===today; })) {
    alert('Temperaturkontrolle für heute wurde bereits erfasst.');
    go('s-cl');
    return;
  }
    <table style="width:100%;border-collapse:separate;border-spacing:0;background:#fff;min-width:580px;">
      <thead><tr id="dp-th"></tr></thead>
      <tbody id="dp-tb"></tbody>
    </table>
  </div>
  <div style="padding:8px 14px;background:#fff;border-top:1px solid #e2ddd6;font-size:12px;color:#666;" id="dp-sum"></div>
  <!-- MA Hours -->
  <div style="padding:6px 12px 4px;font-weight:700;font-size:12px;color:#1a1714;">👤 Stunden je Mitarbeiter</div>
  <div style="overflow-x:auto;padding:0 12px 16px;">
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 7px rgba(0,0,0,.07);min-width:460px;">
      <thead><tr style="background:#1a1714;">
        <th style="color:#fff;padding:7px 8px;font-size:10px;text-align:left;">Mitarbeiter</th>
        <th style="color:#fff;padding:7px 4px;font-size:10px;text-align:right;">Mo</th><th style="color:#fff;padding:7px 4px;font-size:10px;text-align:right;">Di</th>
        <th style="color:#fff;padding:7px 4px;font-size:10px;text-align:right;">Mi</th><th style="color:#fff;padding:7px 4px;font-size:10px;text-align:right;">Do</th>
        <th style="color:#fff;padding:7px 4px;font-size:10px;text-align:right;">Fr</th><th style="color:#fff;padding:7px 4px;font-size:10px;text-align:right;">Sa</th>
        <th style="color:#fff;padding:7px 4px;font-size:10px;text-align:right;">So</th>
        <th style="color:#fff;padding:7px 8px;font-size:10px;text-align:right;">Gesamt</th>
      </tr></thead>
      <tbody id="dp-ma-body"></tbody>
    </table>
  </div>`;

  // Fill chips
  const chips=document.getElementById('dp-chips');
  if(chips)chips.innerHTML=ws.map(wk=>`<div style="display:flex;align-items:center;border-radius:16px;overflow:hidden;border:1.5px solid ${wk===w?'#1a1714':'#e2ddd6'};background:${wk===w?'#1a1714':'#fff'};font-size:11px;font-weight:700;"><button onclick="dp_selW('${wk}')" style="padding:5px 9px;background:none;border:none;cursor:pointer;font-family:inherit;font-size:11px;font-weight:700;color:${wk===w?'#fff':'#333'};">KW ${dp_kw(wk)}</button>${ws.length>1?`<button onclick="dp_delW('${wk}')" style="padding:5px 8px 5px 0;background:none;border:none;cursor:pointer;font-size:13px;color:${wk===w?'rgba(255,255,255,.5)':'#ccc'};">×</button>`:''}</div>`).join('');

  if(document.getElementById('dp-wlbl'))$text('dp-wlbl', dp_wl(w));

  // Table header
  const th=document.getElementById('dp-th');
  if(th)th.innerHTML=`<th style="background:#1a1714;color:#fff;padding:8px 6px;font-size:10px;text-align:left;width:80px;">SCHICHT</th>`+
    Array(7).fill(0).map((_,i)=>{const iso=dp_ad(w,i),isT=iso===t;
      return`<th style="background:${isT?'#c8453a':'#1a1714'};color:#fff;padding:7px 3px;font-size:10px;text-align:center;"><div>${DP_DF[i].slice(0,2)}</div><div style="font-weight:400;opacity:.7;font-size:9px;">${dp_fmt(iso)}</div></th>`;
    }).join('');

  // Table body
  const tb=document.getElementById('dp-tb');
  if(tb)tb.innerHTML=DP_SHIFTS.map(sh=>{
    const sm=DP_SM[sh];
    let c=`<td style="border-left:3px solid ${sm.color};background:#f5f2ed;color:${sm.color};font-weight:700;font-size:10px;padding:6px 5px;border-bottom:1px solid #e2ddd6;vertical-align:middle;white-space:nowrap;">${sm.label}</td>`;
    for(let d=0;d<7;d++){
      const iso=dp_ad(w,d),isT=iso===t,en=(data[sh]||[])[d]||[];
      c+=`<td style="border-bottom:1px solid #e2ddd6;border-right:1px solid #f0ece6;padding:4px;vertical-align:top;background:${isT?'#fffbf0':'#fff'};cursor:pointer;" onclick="dp_openAdd('${sh}',${d})">`;
      if(en.length){c+=en.map((e,i)=>`<div style="background:${sm.bg};color:${sm.color};border-radius:4px;padding:3px 5px;margin-bottom:2px;font-size:10px;display:flex;align-items:center;gap:3px;">
        <span onclick="dp_openEdit('${sh}',${d},${i});event.stopPropagation()" style="flex:1;cursor:pointer;border-bottom:1px dashed ${sm.color};" title="Bearbeiten"><b>${e.name}</b> <span style="opacity:.7;font-family:monospace;font-size:9px;">${e.von}–${e.bis}</span></span>
        <button onclick="dp_delE('${sh}',${d},${i});event.stopPropagation()" style="background:rgba(0,0,0,.12);border:none;cursor:pointer;font-size:10px;padding:1px 4px;border-radius:3px;color:${sm.color};min-width:18px;">✕</button>
        </div>`).join('');}
      else c+='<span style="font-size:10px;color:#ccc;font-style:italic;">Tippen…</span>';
      c+='</td>';
    }
    return`<tr>${c}</tr>`;
  }).join('');

  let tot=0;const pp=new Set();
  DP_SHIFTS.forEach(s=>Array(7).fill(0).forEach((_,d2)=>((data[s]||[])[d2]||[]).forEach(e=>{tot++;pp.add(e.name);})));
  if(document.getElementById('dp-sum'))$html('dp-sum', `<span><b>${tot}</b> Einträge</span> &nbsp; <span><b>${pp.size}</b> im Einsatz</span>`);

  dp_updateDash();
  dp_renderMaHours();
}

function dp_selW(w){DP.activeWeek=w;dp_save();renderDP();}
function dp_prevW(){const ws=Object.keys(DP.weeks).sort(),i=ws.indexOf(DP.activeWeek);if(i>0)dp_selW(ws[i-1]);}
function dp_nextW(){const ws=Object.keys(DP.weeks).sort(),i=ws.indexOf(DP.activeWeek);if(i<ws.length-1)dp_selW(ws[i+1]);}
function dp_delW(w){
  if(Object.keys(DP.weeks).length<=1){dp_toast('Letzte Woche kann nicht gelöscht werden.');return;}
  if(!confirm('Woche '+w+' wirklich löschen? Alle Einträge dieser Woche gehen verloren.')) return;
  delete DP.weeks[w];
  if(DP.activeWeek===w){const ws=Object.keys(DP.weeks).sort();DP.activeWeek=ws[ws.length-1];}
  dp_save();renderDP();
}




function dp_delE(sh,d,i){DP.weeks[DP.activeWeek][sh][d].splice(i,1);dp_save();renderDP();}

function dp_openAdd(sh,d){
  dp_as=sh;dp_ad2=d;
  const dv={frueh:'04:00',mittel:'13:00',spaet:'16:00'},db={frueh:'12:45',mittel:'21:45',spaet:'00:00'};
  $set('dp-aVon', 'value', dv[sh]||'08:00');
  $set('dp-aBis', 'value', db[sh]||'17:00');
  $html('dp-aName', '<option value="">– auswählen –</option>'+DP.mitarbeiter.map(m=>`<option>${m}</option>`).join(''));
  $html('dp-aShift', DP_SHIFTS.map(s=>`<option value="${s}" ${s===sh?'selected':''}>${DP_SM[s].label}</option>`).join(''));
  dp_editIdx = -1;
  $text('dp-aTitle', DP_DF[d]+' – hinzufügen');
  $style('dp-mAdd', 'display', 'flex');
}


function dp_closeAdd(){$style('dp-mAdd', 'display', 'none'); dp_editIdx=-1;}
let dp_editIdx = -1; // -1 = neu, sonst Index des zu bearbeitenden Eintrags

function dp_openEdit(sh, d, i) {
  dp_as = sh; dp_ad2 = d; dp_editIdx = i;
  const entry = DP.weeks[DP.activeWeek][sh][d][i];
  if(!entry) return;
  $html('dp-aName', '<option value="">– auswählen –</option>'+DP.mitarbeiter.map(function(m){
    return '<option'+(m===entry.name?' selected':'')+'>'+m+'</option>';
  }).join(''));
  $set('dp-aVon', 'value', entry.von);
  $set('dp-aBis', 'value', entry.bis);
  $html('dp-aShift', DP_SHIFTS.map(function(s){
    return '<option value="'+s+'"'+(s===sh?' selected':'')+'>'+DP_SM[s].label+'</option>';
  }).join(''));
  $text('dp-aTitle', DP_DF[d]+' – bearbeiten');
  $style('dp-mAdd', 'display', 'flex');
}


function dp_confirmAdd(){
  const name=document.getElementById('dp-aName').value,von=document.getElementById('dp-aVon').value,bis=document.getElementById('dp-aBis').value,sh=document.getElementById('dp-aShift').value;
  if(!name)return;
  const w=DP.activeWeek;
  if(!DP.weeks[w][sh])DP.weeks[w][sh]=Array(7).fill(null).map(()=>[]);
  if(dp_editIdx >= 0) {
    // Bearbeiten-Modus: bestehenden Eintrag aktualisieren
    DP.weeks[w][dp_as][dp_ad2][dp_editIdx] = {name, von, bis};
  } else {
    // Neu-Modus: Eintrag hinzufügen
    DP.weeks[w][sh][dp_ad2].push({name, von, bis});
  }
  const saved=dp_save();dp_closeAdd();renderDP();
  if(saved)dp_toast(dp_editIdx>=0?'✓ Aktualisiert':'✓ Gespeichert');
}

function dp_openMa(){
  let html='<div style="padding:0 0 10px;display:flex;flex-direction:column;gap:6px;">';
  DP.mitarbeiter.forEach(m=>{
    html+=`<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#faf8f5;border-radius:8px;">
      <div style="width:32px;height:32px;border-radius:50%;background:#e8f0fb;color:#2563a8;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;">${m.slice(0,2).toUpperCase()}</div>
      <div style="flex:1;font-weight:600;font-size:14px;">${m}</div>
      <button onclick="dp_rmMa('${m}')" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit;">Entfernen</button>
    </div>`;
  });
  html+=`</div><div style="display:flex;gap:8px;padding-top:8px;border-top:1px solid #e2ddd6;">
    <input id="dp-newMa" placeholder="Name" style="flex:1;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px 10px;font-size:14px;font-family:inherit;outline:none;" onkeydown="if(event.key==='Enter')dp_addMa()">
    <button onclick="dp_addMa()" style="background:#c8453a;color:#fff;border:none;border-radius:8px;padding:9px 14px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">＋</button>
  </div>`;
  $html('dp-mMaBody', html);
  $style('dp-mMa', 'display', 'flex');
}

function dp_closeMa(){$style('dp-mMa', 'display', 'none');}
function dp_addMa(){const n=document.getElementById('dp-newMa').value.trim();if(!n||DP.mitarbeiter.includes(n))return;DP.mitarbeiter.push(n);dp_save();dp_openMa();}
function dp_rmMa(m){DP.mitarbeiter=DP.mitarbeiter.filter(x=>x!==m);dp_save();dp_openMa();}

function dp_openWeek(){
  const ws=Object.keys(DP.weeks).sort(),last=ws[ws.length-1];
  $set('dp-wDate', 'value', dp_ad(last,7));
  $style('dp-mWeek', 'display', 'flex');
}




function dp_closeWeek(){$style('dp-mWeek', 'display', 'none');}
function dp_confirmWeek(){
  const mon=dp_isoMon(document.getElementById('dp-wDate').value);
  if(!mon||DP.weeks[mon])return;
  const tplEl=document.getElementById('dp-wTpl'); const tplVal=tplEl?tplEl.value:'';
  DP.weeks[mon]=tplVal==='copy'?JSON.parse(JSON.stringify(DP.weeks[DP.activeWeek])):dp_emon();
  DP.activeWeek=mon;dp_save();dp_closeWeek();renderDP();
}


