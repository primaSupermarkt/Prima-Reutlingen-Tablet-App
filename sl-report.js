// ═══════════════════════════════════════════════════════
// SL-REPORT.JS
// Schichtleiter: HACCP-Bericht, CSV-Export, In-App-Report-Viewer
// Abhängigkeiten: firebase.js, app.js (dayKey), js/inventur.js
// ═══════════════════════════════════════════════════════

function getCheckedDays() {
  return Object.entries(DOW_MAP)
    .filter(([key]) => document.getElementById('wt-'+key) && document.getElementById('wt-'+key).checked)
    .map(([,val]) => val);
}

function showReportOverlay(reportHtml, filename) {
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:9000;display:flex;flex-direction:column;';

  // Header
  var hdr = document.createElement('div');
  hdr.style.cssText = 'background:#0f3460;color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
  hdr.innerHTML = '<div style="font-size:14px;font-weight:700;">📊 HACCP Bericht</div>';

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;';

  var printBtn = document.createElement('button');
  printBtn.style.cssText = 'background:#16a34a;color:#fff;border:none;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer;touch-action:manipulation;';
  printBtn.textContent = '🖨️ Drucken';
  printBtn.addEventListener('click', function() {
    var iframe = document.getElementById('report-iframe');
    if(iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  });

  var closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer;touch-action:manipulation;';
  closeBtn.textContent = '✕ Schließen';
  closeBtn.addEventListener('click', function() { document.body.removeChild(ov); });

  btnRow.appendChild(printBtn);
  btnRow.appendChild(closeBtn);
  hdr.appendChild(btnRow);
  ov.appendChild(hdr);

  // iFrame mit Bericht-Inhalt
  var iframe = document.createElement('iframe');
  iframe.id = 'report-iframe';
  iframe.style.cssText = 'flex:1;border:none;width:100%;';
  ov.appendChild(iframe);

  document.body.appendChild(ov);

  // Inhalt in iFrame schreiben
  setTimeout(function() {
    var doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(reportHtml);
    doc.close();
  }, 50);
}

function exportHACCP() {
  const now = new Date();
  const mo = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  let html = '<!DOCTYPE html><html><head><meta charset="UTF-8">';
  html += '<title>HACCP Temperaturbericht '+mo[now.getMonth()]+' '+now.getFullYear()+'</title>';
  html += '<style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px;}';
  html += 'h1{font-size:16px;border-bottom:2px solid #000;padding-bottom:6px;}';
  html += 'h2{font-size:13px;margin-top:16px;}';
  html += 'table{width:100%;border-collapse:collapse;margin-bottom:12px;}';
  html += 'th,td{border:1px solid #ccc;padding:5px 7px;text-align:left;}';
  html += 'th{background:#f4f4f4;font-weight:700;}';
  html += '.ok{color:green;}.warn{color:orange;}.alarm{color:red;font-weight:700;}';
  html += '</style></head><body>';
  html += '<h1>Temperaturüberwachung – Prima Supermarkt Reutlingen</h1>';
  html += '<p>Exportiert: '+now.toLocaleString('de-DE')+'</p>';

  // Group by month
  const thisMonth = now.toISOString().slice(0,7);
  const monthData = tempHistory.filter(h=>h.date.startsWith(thisMonth));

  html += '<h2>Monat: '+mo[now.getMonth()]+' '+now.getFullYear()+'</h2>';
  html += '<table><tr><th>Datum</th><th>Zeit</th><th>Mitarbeiter</th><th>SL Bestätigt</th>';
  TEMP_DEVICES.forEach(d=>{html+='<th>'+d.name+'</th>';});
  html += '</tr>';

  monthData.forEach(entry=>{
    html += '<tr>';
    html += '<td>'+new Date(entry.date).toLocaleDateString('de-DE')+'</td>';
    html += '<td>'+entry.ts.split(', ')[1]+'</td>';
    html += '<td>'+entry.ma+'</td>';
    html += '<td>'+(entry.slConfirmed?'✓ '+entry.slConfirmedTs:'–')+'</td>';
    TEMP_DEVICES.forEach(dev=>{
      const r=entry.readings.find(r2=>r2.deviceId===dev.id);
      const cls=!r?'':r.alarm?'alarm':r.warn?'warn':'ok';
      html+='<td class="'+cls+'">'+(r?r.ist+'°C':'–')+'</td>';
    });
    html += '</tr>';
  });
  html += '</table>';

  // Slush history
  html += '<h2>Slushmaschine Reinigungsprotokoll</h2>';
  html += '<table><tr><th>Datum</th><th>Uhrzeit</th><th>Mitarbeiter</th></tr>';
  const monthSlush = slushHistory.filter(h=>h.date.startsWith(thisMonth));
  if(monthSlush.length){
    monthSlush.forEach(h=>{html+='<tr><td>'+new Date(h.date).toLocaleDateString('de-DE')+'</td><td>'+h.ts.split(', ')[1]+'</td><td>'+h.ma+'</td></tr>';});
  } else { html+='<tr><td colspan="3">Keine Einträge</td></tr>'; }
  html += '</table>';

  html += '<p style="font-size:9px;color:#999;margin-top:20px;">Prima Supermarkt Reutlingen GmbH – Automatisch generiert</p>';
  html += '</body></html>';

  // In-App-Viewer: Bericht als Overlay mit Drucken-Option
  showReportOverlay(html, 'HACCP_Temperaturbericht_' + thisMonth + '.html');
}

function exportCSV() {
  const NL = String.fromCharCode(13,10);
  let csv = 'Datum;Zeit;Mitarbeiter;';
  TEMP_DEVICES.forEach(function(d){csv+=d.name+';';});
  csv += NL;
  tempHistory.forEach(function(entry){
    csv += new Date(entry.date).toLocaleDateString('de-DE')+';';
    csv += (entry.ts.split(', ')[1]||'')+';';
    csv += entry.ma+';';
    TEMP_DEVICES.forEach(function(dev){
      const r=entry.readings.find(function(r2){return r2.deviceId===dev.id;});
      csv+=(r?r.ist:'')+';';
    });
    csv+=NL;
  });
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='Temperaturen_'+new Date().toISOString().slice(0,7)+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

