# Datenschutzerklärung — WebWatch

Stand: Juli 2026

WebWatch macht sichtbar, welche Verbindungen dein Browser beim Besuch von
Websites aufbaut. Der Zweck der Erweiterung ist Transparenz — und sie hält
sich selbst daran:

- **WebWatch sammelt nichts.** Es werden keine Daten an die Entwickler oder
  an Dritte übertragen. Die Erweiterung baut keine eigenen Netzwerk-
  verbindungen auf ("phones home" nicht) und enthält keine Telemetrie.
- **Alles bleibt lokal.** Die aufgezeichneten Verbindungsdaten liegen
  ausschließlich im Speicher deines Browsers (`storage.session`) und werden
  beim Schließen des Tabs bzw. des Browsers verworfen. Einzige dauerhafte
  Einstellung: der gewählte Anzeigemodus (Einfach/Profi) in
  `storage.local`.
- **Nichts wird verändert oder blockiert.** WebWatch beobachtet nur.
- **Export nur auf deinen Befehl.** Die Kopier-/Export-Funktionen legen
  Daten ausschließlich in deine Zwischenablage bzw. in eine von dir
  gespeicherte Datei. Was du damit machst (z. B. einer KI geben),
  entscheidest du.

## Warum welche Berechtigungen?

- **webRequest + Zugriff auf alle Websites (`<all_urls>`)**: nötig, um die
  Verbindungen zu sehen, die eine beliebige besuchte Seite aufbaut — das
  ist die Kernfunktion.
- **tabs**: um Anfragen dem richtigen Tab zuzuordnen und die beobachtete
  Seite anzuzeigen.
- **storage**: für die lokale Zwischenspeicherung pro Tab und die
  Moduseinstellung.

## Kontakt

Fragen und Meldungen: über den [Issue-Tracker des Quellcode-Repositories](https://github.com/kreasteve/webwatch/issues)
oder das [Impressum](https://kreasteve.de/impressum.html).
Der vollständige Quellcode ist offen (MIT-Lizenz) und überprüfbar.
Hinweise für betroffene Unternehmen: [KORREKTUREN.md](KORREKTUREN.md).
