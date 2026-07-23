# WebWatch 👁

**Sieh selbst, was Websites über dich verschicken.**

WebWatch ist eine Browser-Erweiterung (Firefox & Chrome), die beim Besuch einer
Website live sichtbar macht, welche Verbindungen dein Browser aufbaut: an den
Betreiber der Seite selbst — und an all die Drittserver, von denen man nichts
sieht. Zu jeder Verbindung zeigt WebWatch, **wem die Gegenstelle gehört**,
**welche Daten mitgeschickt wurden** (in Klartext übersetzt) und **welche
Risiken** dahinterstecken.

Zwei Ansichten, ein Ziel — Unsichtbares sichtbar machen:

- **Einfach**: Ampel-Bewertung, Klartext-Sätze („Diese Seite hat Daten an 14
  fremde Stellen geschickt, darunter 9 Werbenetzwerke"), verständliche
  Erklärungen zu jeder Firma und Kategorie, ein Lexikon.
- **Profi**: alle Anfragen mit Headern, dekodierten Query-Parametern und
  Bodys, Netzwerk-Graph, JSON-Export.

**Datenschutz der Erweiterung selbst:** WebWatch sendet nichts nach Hause,
baut keine eigenen Verbindungen auf und blockiert/verändert nichts. Alle
Daten bleiben im Browser und verschwinden beim Schließen des Tabs.

## Installation (aus dem Quellcode)

```sh
./build.sh
```

**Firefox** (empfohlen, sieht am meisten):
1. `about:debugging#/runtime/this-firefox` öffnen
2. „Temporäres Add-on laden…" → `dist/firefox/manifest.json` auswählen

**Chrome / Chromium / Edge / Brave:**
1. `chrome://extensions` öffnen, „Entwicklermodus" aktivieren
2. „Entpackte Erweiterung laden" → Ordner `dist/chrome` auswählen

Dann: beliebige Website besuchen (ggf. neu laden), auf das WebWatch-Symbol
klicken. Das Zahlen-Badge am Symbol zeigt, wie viele fremde Stellen die Seite
kontaktiert hat; die Farbe die Ampel-Einstufung.

## Was WebWatch erkennt

- Erst- vs. Drittanbieter-Anfragen (eTLD+1-basiert), pro Tab
- Zuordnung von ~100 Diensten / mehrere hundert Domains zu Firma & Kategorie
  (Werbung, Datenhändler, Sitzungsaufzeichnung, Analyse, Social, CMP, CDN …)
  — handkuratiert, mit Fokus auf im deutschsprachigen Raum verbreitete Dienste
- Dekodierte Übertragungen: Query-Parameter, Formulardaten, JSON-Bodys,
  Base64 — mit deutschen Labels für bekannte Tracking-Parameter (GA4, Meta
  Pixel, Matomo …)
- Erkenntnisse in Klartext: E-Mail-Adressen (auch gehasht), Bildschirmgröße,
  weitergegebene Seiten-URLs, eindeutige Kennungen, Cookies an Dritte,
  Langzeit-Cookies, Zählpixel, Beacons, Geräte-Fingerabdrücke,
  Standortdaten, Cookie-Syncing, WebSockets, blockierte Anfragen

## Grenzen (bewusst dokumentiert)

- WebWatch sieht nur, **was abgeschickt wird** — nicht, was der Empfänger
  damit macht. Die Kategorie-Texte erklären das typische Geschäftsmodell.
- Die Firmen-Datenbank ist kuratiert und unvollständig; „unbekannt" heißt
  nur: nicht in der Datenbank (`src/common/trackerdb.js`, Beiträge willkommen).
- Antwort-Inhalte (was der Server zurückschickt) sind per webRequest-API
  nicht lesbar; Set-Cookie-Header werden ausgewertet, soweit der Browser sie
  zeigt.
- Verkehr anderer Erweiterungen und des Betriebssystems erscheint nicht.
- Was du siehst, hängt von Cookie-Banner-Entscheidung und Adblockern ab.
- Die Erst/Drittanbieter-Erkennung nutzt eine kompakte Suffix-Liste statt
  der vollen Public Suffix List; exotische ccTLDs können falsch eingeordnet
  werden.

## Wie die Datenbank wächst

Die Tracker-DB (`src/common/trackerdb.js`) ist handkuratiert. Damit sie
wachsen kann, gibt es eine Werkzeugkette:

1. **Kandidaten sammeln** — `node smoketest/crawl_unknown.js` besucht eine
   Seitenliste mit geladener Extension und listet alle Drittanbieter-Domains,
   die die DB noch nicht kennt (sortiert nach Verbreitung).
2. **Belege recherchieren** — `node tools/research_domain.js <domain> …`
   sammelt pro Domain automatisch: RDAP-Inhaber, CNAME-Kette (enttarnt
   getarntes Tracking), TLS-Zertifikats-Organisation, Homepage-Titel/-Text
   und die Betreiber-Zuordnung aus dem offenen DuckDuckGo Tracker Radar —
   und schlägt einen Eintrag vor. (Die Quellen werden nur zur Recherche
   abgefragt; Einträge und Texte bleiben selbst geschrieben.)
3. **Eintrag schreiben** — Kategorie wählen, deutschen Ein-Satz-Infotext
   verfassen, in die passende Sektion von `trackerdb.js` einsortieren.
4. **Absichern** — `node tests/run_tests.js` prüft u. a., dass keine Domain
   doppelt vergeben ist; ein Klassifikations-Test pro neuem Eintrag ist
   erwünscht.

Regel: Was sich nicht belegen lässt, bleibt draußen — „unbekannt" ist eine
ehrliche Aussage und im Dashboard ein Hinweis, selbst genauer hinzuschauen.

## Entwicklung

```
src/
  common/      Kernlogik (auch im Test-Harness lauffähig, ohne Browser-APIs)
    domain.js      eTLD+1, Erst-/Drittanbieter
    trackerdb.js   kuratierte Firmen-Datenbank + Klassifikation
    decoder.js     Query/Body-Dekodierung, Parameter-Labels
    insights.js    Erkenntnis-Engine (was wurde übertragen?)
    score.js       Aggregation + Ampel-Bewertung
    categories.js  Kategorien, Lexikon, Glossar (deutsche Texte)
  background/  webRequest-Erfassung, Pro-Tab-Speicher, Messaging
  popup/       Kurzüberblick (Toolbar-Popup)
  dashboard/   Übersicht, Anfragen, Netzwerk-Graph, Lexikon
  manifest.firefox.json  (MV2, persistenter Hintergrund)
  manifest.chrome.json   (MV3, Service Worker + storage.session)
tools/gen_icons.py   erzeugt die Icons (nur Python-Stdlib)
tests/run_tests.js   Unit-Tests: node tests/run_tests.js
build.sh             baut dist/firefox, dist/chrome + ZIPs
```

Tests laufen ohne Browser: `node tests/run_tests.js`

## Redaktioneller Hinweis & Kontakt

Firmen-Zuordnungen und Beschreibungstexte beruhen auf öffentlich
zugänglichen Quellen (Registrierungsdaten, DNS, TLS-Zertifikate,
Selbstbeschreibungen der Dienste, offene Datensätze); Kategorien und
Risiko-Einstufungen sind **redaktionelle Bewertungen** auf dieser
Faktenbasis. Stand der Texte: **Juli 2026**.

Falsche Angaben korrigieren wir nach Prüfung umgehend — betroffene
Unternehmen finden das Verfahren in [KORREKTUREN.md](KORREKTUREN.md).
Verantwortlich im Sinne des Presserechts / Kontakt:
[Impressum](https://kreasteve.de/impressum.html).

## Lizenz

MIT — siehe [LICENSE](LICENSE).
