// ═══════════════════════════════════════════════════════
// SL-UMSATZ.JS
// Schichtleiter: Umsatzeingabe und Umsatzübersicht
// Abhängigkeiten: firebase.js (lsSave/fbSave), app.js (mkSec, dayKey)
// ═══════════════════════════════════════════════════════

function saveUmsatz() {
  const datum = document.getElementById('uz-datum').value;
  const betrag = parseFloat(document.getElementById('uz-betrag').value) || 0;
  const kunden = parseInt(document.getElementById('uz-kunden').value) || 0;
  if(!datum || betrag<=0) { alert('Bitte Datum und Umsatz eingeben.'); return; }
  // Remove existing entry for same date
  umsatzData = umsatzData.filter(u => u.date !== datum);
  umsatzData.push({date: datum, betrag, kunden});
  umsatzData.sort((a,b) => b.date.localeCompare(a.date));
  lsSave('umsatzData', umsatzData);
  $set('uz-betrag', 'value', '');
  $set('uz-kunden', 'value', '');
  renderUmsatz();
}

function renderUmsatz() {
  // Set today as default date
  const uzDatum = document.getElementById('uz-datum');
  if(uzDatum && !uzDatum.value) uzDatum.value = new Date().toISOString().slice(0,10);

  const now = new Date();
  const todayKey = now.toISOString().slice(0,10);

  // Weekly avg (last 7 days)
  const last7 = umsatzData.filter(u => {
    const d = new Date(u.date);
    return (now - d) <= 7*24*60*60*1000;
  });
  // Monthly avg
  const thisMonth = umsatzData.filter(u => u.date.startsWith(now.toISOString().slice(0,7)));

  const avg = arr => arr.length ? Math.round(arr.reduce((s,u)=>s+u.betrag,0)/arr.length) : 0;
  const avgK = arr => arr.length ? Math.round(arr.reduce((s,u)=>s+u.kunden,0)/arr.length) : 0;
  const bon = arr => {
    const validArr = arr.filter(u=>u.kunden>0);
    return validArr.length ? Math.round(validArr.reduce((s,u)=>s+(u.betrag/u.kunden),0)/validArr.length*100)/100 : 0;
  };

  const stats = document.getElementById('uz-stats');
  if(stats) {
    const items = [
      {val: avg(last7)+'€', lbl:'Ø Umsatz / Tag (7T)', color:'#0f3460'},
      {val: avgK(last7), lbl:'Ø Kunden / Tag (7T)', color:'#0f3460'},
      {val: avg(thisMonth)+'€', lbl:'Ø Umsatz / Tag (Monat)', color:'#16a34a'},
      {val: bon(thisMonth).toFixed(2)+'€', lbl:'Ø Bon / Kunde (Monat)', color:'#f0a500'},
    ];
    stats.innerHTML = items.map(s =>
      `<div style="background:#fff;border-radius:10px;padding:12px;box-shadow:0 2px 7px rgba(0,0,0,.06);text-align:center;">
        <div style="font-size:20px;font-weight:900;color:${s.color};">${s.val}</div>
        <div style="font-size:10px;color:#888;margin-top:2px;">${s.lbl}</div>
      </div>`
    ).join('');
  }

  const list = document.getElementById('uz-list');
  if(list) {
    list.innerHTML = '';
    if(!umsatzData.length) {
      list.innerHTML = '<div style="text-align:center;padding:30px;color:#ccc;">Noch keine Einträge</div>';
    } else {
      umsatzData.slice(0,14).forEach(function(u) {
        const bonVal = u.kunden>0 ? (u.betrag/u.kunden).toFixed(2) : '-';
        const d = new Date(u.date);
        const days = ['So','Mo','Di','Mi','Do','Fr','Sa'];
        const label = days[d.getDay()]+' '+d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
        const row = document.createElement('div');
        row.style.cssText = 'background:#fff;border-radius:10px;padding:12px 14px;margin-bottom:7px;box-shadow:0 1px 5px rgba(0,0,0,.06);display:flex;align-items:center;gap:10px;';
        const info = document.createElement('div');
        info.style.cssText = 'flex:1;';
        info.innerHTML = '<div style="font-size:13px;font-weight:700;">'+label+'</div>'+
          '<div style="font-size:14px;font-weight:800;color:#0f3460;margin-top:2px;">'+u.betrag.toLocaleString('de-DE')+' €</div>'+
          '<div style="font-size:11px;color:#888;">'+u.kunden+' Kunden · Ø'+bonVal+'€</div>';
        const editBtn = document.createElement('button');
        editBtn.style.cssText = 'background:#e8f0fe;border:none;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:700;color:#1a56db;cursor:pointer;font-family:inherit;flex-shrink:0;';
        editBtn.textContent = '✏️ Bearbeiten';
        (function(entry){
          editBtn.onclick = function(){
            $set('uz-datum', 'value', entry.date);
            $set('uz-betrag', 'value', entry.betrag);
            $set('uz-kunden', 'value', entry.kunden);
            const umsEl=document.getElementById('sl-tab-umsatz');if(umsEl)umsEl.scrollTop=0;
            setTimeout(function(){ const fEl=document.getElementById('uz-betrag');if(fEl)fEl.focus(); }, 100);
          };
        })(u);
        row.appendChild(info);
        row.appendChild(editBtn);
        list.appendChild(row);
      });
    }
  }
}

