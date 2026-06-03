// ═══════════════════════════════════════════════════════════════
// GLEITZEITKONTO.JS
// Berechnet und zeigt das kumulative Gleitzeitkonto pro Mitarbeiter.
// Liest nur: zeiterfassung, maProfiles, urlaubAntraege, isFeiertag
// Schreibt nichts. Verändert keine bestehende Funktion.
// Einbindung: index.html nach hr.js, vor app.js
// ═══════════════════════════════════════════════════════════════

// ── Tagessoll berechnen ──────────────────────────────────────────
// Gibt Soll-Minuten für einen bestimmten Tag zurück.
// Sonntage und Feiertage = 0 Soll (kein Arbeitstag).
// Urlaubstage = voller Tagessoll (gilt als gearbeitet).
function _gzTagSollMin(name, datumStr) {
  var d = new Date(datumStr + 'T12:00:00');
  // Sonntag oder Feiertag → kein Arbeitstag
  if(d.getDay() === 0) return 0;
  if(typeof isFeiertag === 'function' && isFeiertag(datumStr)) return 0;
  // Wochenstunden / 5 Arbeitstage = Tagessoll
  var prof = (typeof maProfiles !== 'undefined' && maProfiles[name]) ? maProfiles[name] : {};
  var wocheH = prof.stundenSoll || 0;
  if(!wocheH) return 0;
  return Math.round(wocheH * 60 / 5);
}

// ── Prüft ob ein Tag ein genehmigter Urlaubstag ist ─────────────
function _gzIstUrlaub(name, datumStr) {
  if(typeof urlaubAntraege === 'undefined') return false;
  return urlaubAntraege.some(function(a) {
    return a.ma === name && a.status === 'genehmigt' &&
           a.von <= datumStr && a.bis >= datumStr;
  });
}

// ── Gleitzeitkonto berechnen ────────────────────────────────────
// Gibt Array aller Tage mit Eintrag zurück, plus Gesamtsaldo.
// tageSaldo: [{datum, istMin, sollMin, saldoMin, urlaub}]
// saldoGesamt: Summe aller Tagessalden in Minuten
function calcGleitzeitSaldo(name) {
  if(typeof zeiterfassung === 'undefined') return {tage:[], saldoGesamt:0};

  // Alle Zeiteinträge für diesen Mitarbeiter
  var alleEintraege = zeiterfassung.filter(function(z){ return z.ma === name; });
  if(!alleEintraege.length) return {tage:[], saldoGesamt:0};

  // Alle Tage zwischen erstem Eintrag und heute
  var heute = new Date().toISOString().slice(0,10);
  var erstDatum = alleEintraege.slice().sort(function(a,b){
    return a.datum < b.datum ? -1 : 1;
  })[0].datum;

  // Tage durchgehen
  var tage = [];
  var saldoGesamt = 0;
  var d = new Date(erstDatum + 'T12:00:00');
  var endD = new Date(heute + 'T12:00:00');

  while(d <= endD) {
    var datStr = d.toISOString().slice(0,10);
    var sollMin = _gzTagSollMin(name, datStr);

    // Ist-Stunden an diesem Tag (alle Einträge summieren)
    var tagesEintraege = alleEintraege.filter(function(z){ return z.datum === datStr; });
    var istMin = tagesEintraege.reduce(function(s,z){ return s + (z.nettoMin||0); }, 0);

    // Urlaubstag: Soll gilt als geleistet
    var urlaub = _gzIstUrlaub(name, datStr);
    if(urlaub && sollMin > 0) {
      istMin = sollMin; // Urlaubstag = neutral
    }

    // Nur Tage mit Soll > 0 oder Ist > 0 berücksichtigen
    if(sollMin > 0 || istMin > 0) {
      var tagSaldo = istMin - sollMin;
      saldoGesamt += tagSaldo;
      tage.push({
        datum:    datStr,
        istMin:   istMin,
        sollMin:  sollMin,
        saldoMin: tagSaldo,
        urlaub:   urlaub
      });
    }
    d.setDate(d.getDate() + 1);
  }

  return {tage: tage, saldoGesamt: saldoGesamt};
}

// ── Minuten als lesbaren String ──────────────────────────────────
function _gzMinStr(min) {
  var abs = Math.abs(min);
  var h = Math.floor(abs / 60);
  var m = abs % 60;
  var sign = min < 0 ? '-' : '+';
  return sign + h + 'h ' + (m < 10 ? '0' : '') + m + 'min';
}

// ── Gleitzeitkonto-Widget rendern ────────────────────────────────
// container: DOM-Element in das gerendert wird
// showDetails: true = Monatsübersicht anzeigen
function renderGleitzeit(name, container, showDetails) {
  if(!container) return;
  var gz = calcGleitzeitSaldo(name);
  var saldo = gz.saldoGesamt;
  var saldoColor = saldo >= 0 ? '#16a34a' : '#dc2626';
  var saldoBg    = saldo >= 0 ? '#f0fdf4' : '#fff5f5';
  var saldoStr   = _gzMinStr(saldo);

  // ── Übersichts-Karte ──
  var card = document.createElement('div');
  card.style.cssText = 'background:' + saldoBg + ';border-radius:12px;padding:13px 14px;margin-bottom:10px;';

  var headerDiv = document.createElement('div');
  headerDiv.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';
  headerDiv.innerHTML =
    '<div style="font-size:12px;font-weight:800;color:#444;">&#9200; Gleitzeitkonto</div>' +
    '<div style="font-size:18px;font-weight:900;color:' + saldoColor + ';">' + saldoStr + '</div>';
  card.appendChild(headerDiv);

  var hint = document.createElement('div');
  hint.style.cssText = 'font-size:10px;color:#888;';
  hint.textContent = gz.tage.length + ' Arbeitstage erfasst · kumuliert seit ' +
    (gz.tage.length ? gz.tage[0].datum : '–');
  card.appendChild(hint);

  // Details-Toggle
  if(gz.tage.length > 0) {
    var toggleBtn = document.createElement('button');
    toggleBtn.style.cssText = 'width:100%;background:rgba(0,0,0,.06);border:none;border-radius:8px;padding:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:8px;touch-action:manipulation;';
    toggleBtn.textContent = showDetails ? 'Details ausblenden' : 'Details anzeigen';

    var detailDiv = document.createElement('div');
    detailDiv.style.display = showDetails ? 'block' : 'none';
    detailDiv.style.marginTop = '10px';

    // Monatsweise gruppieren
    var monate = {};
    gz.tage.forEach(function(t) {
      var mo = t.datum.slice(0,7);
      if(!monate[mo]) monate[mo] = [];
      monate[mo].push(t);
    });

    var DAYS = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    Object.keys(monate).sort().reverse().forEach(function(mo) {
      var moTage = monate[mo];
      var moSaldo = moTage.reduce(function(s,t){ return s+t.saldoMin; }, 0);
      var moSaldoColor = moSaldo >= 0 ? '#16a34a' : '#dc2626';

      // Monats-Header
      var moHeader = document.createElement('div');
      moHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;' +
        'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;' +
        'color:#999;margin:10px 0 5px;padding-bottom:4px;border-bottom:1px solid #e5e5e5;';
      var d = new Date(mo + '-01');
      moHeader.innerHTML =
        '<span>' + d.toLocaleDateString('de-DE',{month:'long',year:'numeric'}) + '</span>' +
        '<span style="color:' + moSaldoColor + ';font-size:12px;">' + _gzMinStr(moSaldo) + '</span>';
      detailDiv.appendChild(moHeader);

      // Tageseinträge
      moTage.slice().reverse().forEach(function(t) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;' +
          'padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px;';
        var td = new Date(t.datum + 'T12:00:00');
        var dayStr = DAYS[td.getDay()] + ' ' + td.getDate() + '.' +
          String(td.getMonth()+1).padStart(2,'0') + '.';
        var tagColor = t.saldoMin > 0 ? '#16a34a' : t.saldoMin < 0 ? '#dc2626' : '#888';
        var istStr = t.urlaub ? '<em style="color:#0f766e;">Urlaub</em>' :
          Math.floor(t.istMin/60) + 'h ' + String(t.istMin%60).padStart(2,'0') + 'min';
        row.innerHTML =
          '<span style="color:#555;min-width:60px;">' + dayStr + '</span>' +
          '<span style="color:#888;flex:1;text-align:center;">' + istStr + '</span>' +
          '<span style="font-weight:700;color:' + tagColor + ';min-width:60px;text-align:right;">' +
          _gzMinStr(t.saldoMin) + '</span>';
        detailDiv.appendChild(row);
      });
    });

    toggleBtn.addEventListener('click', function() {
      var visible = detailDiv.style.display !== 'none';
      detailDiv.style.display = visible ? 'none' : 'block';
      toggleBtn.textContent = visible ? 'Details anzeigen' : 'Details ausblenden';
    });

    card.appendChild(toggleBtn);
    card.appendChild(detailDiv);
  } else {
    var noData = document.createElement('div');
    noData.style.cssText = 'font-size:11px;color:#aaa;margin-top:6px;';
    noData.textContent = 'Noch keine Zeiteinträge vorhanden.';
    card.appendChild(noData);
  }

  container.appendChild(card);
}

// ── Gleitzeitkonto in HR Zeiten-Tab einblenden ───────────────────
// Wird von renderHRZeiten() aufgerufen NACH dem Rendern.
// Hängt sich an die bestehenden Mitarbeiter-Karten.
function attachGleitzeitToHRZeiten() {
  names.forEach(function(name) {
    var btn = document.getElementById('hrzd-btn-' + name);
    if(!btn) return;
    // Container direkt vor dem Details-Button einfügen
    var existing = document.getElementById('gz-widget-' + name);
    if(existing) return; // bereits vorhanden
    var container = document.createElement('div');
    container.id = 'gz-widget-' + name;
    btn.parentNode.insertBefore(container, btn);
    renderGleitzeit(name, container, false);
  });
}

// ── Gleitzeitkonto im Mitarbeiter-Profil einblenden ──────────────
// Wird aufgerufen nachdem renderMaProfilDetails() fertig ist.
function attachGleitzeitToMaProfil(name) {
  var body = document.getElementById('maprofil-body');
  if(!body) return;
  var existing = document.getElementById('gz-profil-' + name);
  if(existing) return;
  var sec = document.createElement('div');
  sec.id = 'gz-profil-' + name;
  sec.style.cssText = 'margin-top:4px;';
  body.appendChild(sec);
  renderGleitzeit(name, sec, false);
}
