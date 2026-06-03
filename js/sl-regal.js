// ═══════════════════════════════════════════════════════
// SL-REGAL.JS
// Schichtleiter: Regal-Nachbesserungen und Regal-Archiv
// Abhängigkeiten: firebase.js (lsSave/fbSave), app.js (go, openOv, closeOv)
// ═══════════════════════════════════════════════════════

function openRegalNachbesserung(id) {
  const nb = (Array.isArray(regalNachbesserungen)?regalNachbesserungen:[]).find(function(n){return n.id===id;});
  if(!nb) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:600;display:flex;align-items:center;justify-content:center;padding:16px;';
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border-radius:16px;padding:18px;width:100%;max-width:380px;max-height:90vh;overflow-y:auto;';
  card.innerHTML =
    '<div style="font-size:18px;font-weight:900;margin-bottom:4px;">📸 Nachbesserung</div>'+
    '<div style="font-size:13px;color:#dc2626;font-weight:700;margin-bottom:12px;">'+nb.bereich+' – '+nb.weisung+'</div>';

  // Letztes SL-Foto anzeigen
  const letztesFoto = nb.fotos && nb.fotos[nb.fotos.length-1];
  if(letztesFoto && letztesFoto.dataUrl) {
    const img = document.createElement('img');
    img.src = letztesFoto.dataUrl;
    img.style.cssText = 'width:100%;border-radius:10px;margin-bottom:12px;max-height:180px;object-fit:cover;';
    card.appendChild(img);
  }

  card.innerHTML += '<div style="font-size:13px;font-weight:700;margin-bottom:8px;">Neues Foto aufnehmen:</div>';
  const label = document.createElement('label');
  label.style.cssText = 'display:block;background:#fef3c7;border:2px dashed #d97706;border-radius:10px;padding:20px;text-align:center;cursor:pointer;font-size:14px;font-weight:700;color:#92400e;margin-bottom:12px;';
  label.textContent = '📸 Foto aufnehmen';
  const input = document.createElement('input');
  input.type='file'; input.accept='image/*'; input.setAttribute('capture','environment'); input.style.display='none';
  input.addEventListener('change', function(){
    if(!this.files||!this.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(e){
      const dataUrl = e.target.result;
      // Nachbesserungsfoto speichern
      const neuesFoto = {
        id:'rf'+Date.now(), datum:new Date().toISOString().slice(0,10),
        ma:st.name, bereich:nb.bereich, dataUrl:dataUrl,
        slStatus:'', slKommentar:'', slTs:''
      };
      nb.fotos.push(neuesFoto);
      nb.status = 'bearbeitet';
      nb.verlauf.push({ts:new Date().toLocaleString('de-DE'), aktion:'nachgebessert', ma:st.name, fotoId:neuesFoto.id});
      lsSave('regalNachbesserungen','ubAblehnungsGruende',regalNachbesserungen);
      fbSave('regalNachbesserungen','ubAblehnungsGruende',regalNachbesserungen);
      // Task als erledigt
      const taskId = 'rn_'+nb.id;
      markDone(taskId);
      document.body.removeChild(overlay);
      alert('✅ Foto gesendet. Der Schichtleiter prüft die Nachbesserung.');
    };
    reader.readAsDataURL(this.files[0]);
  });
  label.appendChild(input);
  card.appendChild(label);
  const cancelBtn = document.createElement('button');
  cancelBtn.style.cssText='width:100%;background:none;border:none;color:#888;font-size:13px;cursor:pointer;';
  cancelBtn.textContent='Abbrechen';
  cancelBtn.addEventListener('click',function(){document.body.removeChild(overlay);});
  card.appendChild(cancelBtn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function renderSLRegalNachbesserungen() {
  // Im SL-Regal-Tab: offene Nachbesserungen anzeigen
  const offen = (Array.isArray(regalNachbesserungen)?regalNachbesserungen:[]).filter(function(n){
    return n.status==='bearbeitet'||n.status==='offen';
  });
  return offen;
}

function renderSLRegalArchiv() {
  const pane = document.getElementById('sl-regal-pane');
  if(!pane) return;

  // Offene Nachbesserungen
  const offen = (Array.isArray(regalNachbesserungen)?regalNachbesserungen:[]).filter(function(n){return n.status==='bearbeitet';});
  if(offen.length) {
    const h=document.createElement('div');h.style.cssText='font-size:11px;font-weight:700;text-transform:uppercase;color:#dc2626;margin:12px 0 6px;';
    h.textContent='⚠️ Nachbesserungen zur Prüfung ('+offen.length+')';pane.appendChild(h);
    offen.forEach(function(nb){
      const c=document.createElement('div');c.style.cssText='background:#fff;border-radius:10px;padding:12px;margin-bottom:8px;border-left:3px solid #dc2626;box-shadow:0 1px 5px rgba(0,0,0,.06);';
      const t=document.createElement('div');t.style.cssText='font-size:13px;font-weight:700;';t.textContent=nb.bereich;c.appendChild(t);
      const w=document.createElement('div');w.style.cssText='font-size:11px;color:#888;margin-top:2px;margin-bottom:6px;';w.textContent=nb.weisung;c.appendChild(w);
      const lf=nb.fotos&&nb.fotos[nb.fotos.length-1];
      if(lf&&lf.dataUrl){const img=document.createElement('img');img.src=lf.dataUrl;img.style.cssText='width:100%;border-radius:8px;margin-bottom:8px;max-height:140px;object-fit:cover;display:block;';c.appendChild(img);}
      const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;';
      const okBtn=document.createElement('button');okBtn.style.cssText='background:#dcfce7;color:#15803d;border:none;border-radius:8px;padding:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;';okBtn.textContent='✅ In Ordnung';
      okBtn.addEventListener('click',(function(n){return function(){n.status='ok';n.verlauf.push({ts:new Date().toLocaleString('de-DE'),aktion:'ok'});lsSave('regalNachbesserungen','ubAblehnungsGruende',regalNachbesserungen);fbSave('regalNachbesserungen','ubAblehnungsGruende',regalNachbesserungen);renderSLRegalBewertung();};})(nb));
      const nokBtn=document.createElement('button');nokBtn.style.cssText='background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation;';nokBtn.textContent='❌ Wieder schlecht';
      nokBtn.addEventListener('click',(function(n){return function(){
        const ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:700;display:flex;align-items:center;justify-content:center;padding:20px;';
        const box=document.createElement('div');box.style.cssText='background:#fff;border-radius:16px;padding:20px;width:100%;max-width:360px;';
        box.innerHTML='<div style="font-size:16px;font-weight:900;color:#dc2626;margin-bottom:10px;">❌ Erneut ablehnen</div>'+
          '<textarea id="nb-grund" rows="3" placeholder="Grund..." style="width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:10px;font-size:14px;font-family:inherit;outline:none;margin-bottom:10px;box-sizing:border-box;resize:none;"></textarea>';
        const sb=document.createElement('button');sb.style.cssText='width:100%;background:#dc2626;color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:8px;touch-action:manipulation;';sb.textContent='Ablehnen';
        sb.addEventListener('click',function(){
          const g=(document.getElementById('nb-grund')||{}).value||'';if(!g.trim()){alert('Bitte Grund eingeben.');return;}
          document.body.removeChild(ov);
          n.status='offen';n.weisung=g;n.verlauf.push({ts:new Date().toLocaleString('de-DE'),aktion:'erneut_abgelehnt',kommentar:g});
          lsSave('regalNachbesserungen','ubAblehnungsGruende',regalNachbesserungen);fbSave('regalNachbesserungen','ubAblehnungsGruende',regalNachbesserungen);renderSLRegalBewertung();
        });
        const ab=document.createElement('button');ab.style.cssText='width:100%;background:none;border:none;color:#888;font-size:12px;cursor:pointer;font-family:inherit;';ab.textContent='Abbrechen';
        ab.addEventListener('click',function(){document.body.removeChild(ov);});
        box.appendChild(sb);box.appendChild(ab);ov.appendChild(box);document.body.appendChild(ov);
        setTimeout(function(){const t=document.getElementById('nb-grund');if(t)t.focus();},80);
      };})(nb));
      row.appendChild(okBtn);row.appendChild(nokBtn);c.appendChild(row);pane.appendChild(c);
    });
  }

  // Wochenarchiv
  const archiv=getRegalArchiv();
  const tage=Object.keys(archiv).sort().reverse();
  if(tage.some(function(d){return archiv[d].length>0;})){
    const ah=document.createElement('div');ah.style.cssText='font-size:11px;font-weight:700;text-transform:uppercase;color:#999;margin:14px 0 6px;';ah.textContent='📅 Archiv letzte 7 Tage';pane.appendChild(ah);
    tage.forEach(function(datum){
      const fotos=archiv[datum];if(!fotos.length)return;
      const dh=document.createElement('div');dh.style.cssText='font-size:12px;font-weight:700;margin-bottom:4px;color:#444;';
      dh.textContent=new Date(datum).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'});pane.appendChild(dh);
      const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px;';
      fotos.forEach(function(f){
        const item=document.createElement('div');item.style.cssText='border-radius:8px;overflow:hidden;position:relative;background:#f0f0f0;';
        if(f.dataUrl){const img=document.createElement('img');img.src=f.dataUrl;img.style.cssText='width:100%;height:80px;object-fit:cover;display:block;';item.appendChild(img);}
        const lbl=document.createElement('div');lbl.style.cssText='font-size:9px;padding:2px 4px;background:rgba(0,0,0,.5);color:#fff;';lbl.textContent=(f.bereich||'').slice(0,12);item.appendChild(lbl);
        const st=document.createElement('div');st.style.cssText='position:absolute;top:2px;right:2px;font-size:14px;';
        st.textContent=f.slStatus==='ok'?'✅':f.slStatus==='schlecht'?'❌':'⏳';item.appendChild(st);
        grid.appendChild(item);
      });pane.appendChild(grid);
    });
  }
}

function getRegalArchiv() {
  const archiv = {};
  const heute = new Date();
  for(let i=0;i<7;i++){
    const d = new Date(heute);
    d.setDate(d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    archiv[key] = regalFotos.filter(function(f){return f.datum===key;});
  }
  return archiv;
}

