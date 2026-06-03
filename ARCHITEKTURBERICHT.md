# ARCHITEKTURBERICHT – Prima Supermarkt App
Erstellt: 03.06.2026 06:54
Typ: Strukturverbesserung ohne Funktionsänderung

---

## 1. GESAMTSTATUS

- ✅ 19 JS-Dateien – alle Syntax-Checks bestanden
- ✅ 0 Funktionsduplikate
- ✅ 0 HTML-onclick ohne zugehörige Funktion
- ✅ 43 kritische Funktionen geprüft – alle vorhanden
- ✅ Keine Funktion verändert
- ✅ Keine Variable umbenannt

---

## 2. NEUE DATEIEN (diese Session)

| Datei | Inhalt | Funktionen |
|---|---|---|
| `js/utils.js` | Datums- und DOM-Hilfsfunktionen | dayKey, dayLabel, mkSec, getHistForDay, getUBForDay, nowStr |
| `js/sl-report.js` | HACCP-Export, CSV, Report-Viewer | getCheckedDays, showReportOverlay, exportHACCP, exportCSV |
| `js/sl-umsatz.js` | Umsatzeingabe und -anzeige | saveUmsatz, renderUmsatz |
| `js/sl-aufgaben.js` | SL-Tasks und Wochenaufgaben | saveSLTask, editSLTask, updateSLTask, saveWeeklyTask, editWeeklyTask, updateWeeklyTask |
| `js/sl-regal.js` | Regal-Nachbesserungen | openRegalNachbesserung, renderSLRegalNachbesserungen, renderSLRegalArchiv, getRegalArchiv |

---

## 3. VERSCHOBENE FUNKTIONEN

Von `js/schichtleiter.js` → neue Module (16 Funktionen, ~450 Zeilen):

| Funktion | Von | Nach |
|---|---|---|
| saveUmsatz, renderUmsatz | schichtleiter.js | sl-umsatz.js |
| getCheckedDays, showReportOverlay, exportHACCP, exportCSV | schichtleiter.js | sl-report.js |
| saveSLTask, editSLTask, updateSLTask, saveWeeklyTask, editWeeklyTask, updateWeeklyTask | schichtleiter.js | sl-aufgaben.js |
| openRegalNachbesserung, renderSLRegalNachbesserungen, renderSLRegalArchiv, getRegalArchiv | schichtleiter.js | sl-regal.js |

Von `app.js` → utils.js (6 Funktionen):

| Funktion | Von | Nach |
|---|---|---|
| dayKey, dayLabel, mkSec, getHistForDay, getUBForDay, nowStr | app.js | js/utils.js |

---

## 4. NICHT DURCHGEFÜHRTE ÄNDERUNGEN (bewusst)

### renderSL (643 Zeilen) – NICHT aufgeteilt
**Grund:** renderSL enthält alle Tab-Render-Logiken inline und hat tiefe
Verschachtelung. Eine Aufteilung würde Lade-Reihenfolge-Abhängigkeiten
erzeugen die schwer zu testen sind. Risiko > Nutzen.

### askSL und slTab – IN schichtleiter.js belassen
**Grund:** Sie rufen direkt renderSL auf. Wenn schichtleiter.js aufgeteilt wird,
müssen sie zuletzt geladen sein. Zu geringe Größe (je <20 Zeilen) für eigene Datei.

### sl-dienstplan.js – NICHT erstellt
**Grund:** renderDP und alle dp_-Funktionen sind bereits sauber in
firebase-sync.js. Eine weitere Verschiebung brächte keinen Mehrwert.

### Passwörter (ADMIN_PW, SL_PW) – NICHT geändert
**Grund:** Änderung gehört zu Phase 3 (Firebase Auth). Jetzt nicht anfassen.

### urlBtn.onclick in hr.js L956 – NICHT geändert
**Grund:** Einzelne Zeile, Funktion läuft. Separates Ticket.

### globale Variablen reduzieren – NICHT durchgeführt
**Grund:** Alle 91 globalen Variablen werden über mehrere Dateien geteilt.
Kein sicherer Weg ohne Risiko.

---

## 5. VERBLEIBENDE BEKANNTE SCHWACHSTELLEN

| Nr | Beschreibung | Risiko | Empfehlung |
|---|---|---|---|
| 1 | ADMIN_PW, SL_PW im Klartext | Mittel | Phase 3: Firebase Auth |
| 2 | prima_logo.png fehlt im Ordner | Niedrig | Datei hochladen |
| 3 | urlBtn.onclick in hr.js | Niedrig | Einzelkorrektur nach Freigabe |
| 4 | renderSL 643 Zeilen monolithisch | Niedrig | Akzeptiert – zu hohes Umbaurisiko |

---

## 6. LADE-REIHENFOLGE (finale Struktur)

```
1.  firebase-app-compat.js      (CDN)
2.  firebase-firestore-compat.js (CDN)
3.  store-config.js             (Laden-Konfiguration)
4.  firebase.js                 (Firebase + lsLoad/lsSave)
5.  data.js                     (Stammdaten)
6.  js/utils.js                 (Hilfsfunktionen – NEU)
7.  js/sl-report.js             (vor sl-aufgaben.js wegen getCheckedDays)
8.  js/sl-umsatz.js
9.  js/sl-aufgaben.js
10. js/sl-regal.js
11. js/schichtleiter.js         (renderSL, askSL, slTab)
12. js/checklist.js
13. js/dashboard.js
14. js/admin.js
15. js/inventur.js
16. js/urlaub.js
17. js/hr.js
18. js/firebase-sync.js
19. app.js                      (Kern: Navigation, State, Stempeluhr)
```

---

## 7. REGELN DIE EINGEHALTEN WURDEN

- ✅ Keine Funktion verändert
- ✅ Keine Variable umbenannt
- ✅ Keine HTML-Struktur geändert
- ✅ Keine Firebase-Logik geändert
- ✅ Keine CSS-Klassen geändert
- ✅ Keine Event-Handler geändert
- ✅ Keine Benutzerabläufe geändert
- ✅ Kein Code gelöscht
