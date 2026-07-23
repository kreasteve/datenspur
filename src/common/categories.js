'use strict';
// Kategorien von Drittanbieter-Diensten, mit deutschen Erklärtexten.
// risiko: 1 = gering, 2 = mittel, 3 = hoch
globalThis.WW = globalThis.WW || {};

WW.CATEGORIES = {
  advertising: {
    titel: 'Werbung & Tracking',
    risiko: 3,
    kurz: 'Werbenetzwerke verfolgen Besuche über viele Websites hinweg und bauen daraus Interessenprofile.',
    lang: 'Werbenetzwerke sind auf zigtausenden Websites gleichzeitig eingebaut. Dadurch sehen sie nicht nur, dass du diese eine Seite besuchst — sie können Besuche über viele Seiten hinweg zu einem Profil verknüpfen, meist über Cookies, Klick-Kennungen in Links oder Browser-IDs. Aus dem Surfverlauf lassen sich Interessen, Kaufabsichten, finanzielle Verhältnisse, Gesundheitsthemen oder politische Neigungen ableiten. Beim sogenannten Real-Time Bidding wird bei jedem Seitenaufruf in Millisekunden eine Auktion um den Werbeplatz abgehalten — dabei werden Daten über dich (besuchte Seite, ungefährer Standort, Gerätemerkmale, Profil-Kennungen) an hunderte Bieter gleichzeitig gestreut. Gefahren: Kontrollverlust darüber, wer was über dich weiß; sensible Interessen (Krankheit, Schulden, Religion) landen in fremden Datenbanken; Profile können weiterverkauft, geleakt oder von Behörden abgefragt werden.',
  },
  audience: {
    titel: 'Datenhändler & ID-Abgleich',
    risiko: 3,
    kurz: 'Firmen, deren Geschäftsmodell das Sammeln, Verknüpfen und Verkaufen von Nutzerprofilen ist.',
    lang: 'Diese Dienste tauchen selten sichtbar auf, sind aber das Bindegewebe der Tracking-Industrie: Sie gleichen Kennungen zwischen verschiedenen Werbefirmen ab („Cookie-Syncing", „ID-Matching"), damit Profil A von Firma X mit Profil B von Firma Y zur selben Person zusammengeführt werden kann. Manche verknüpfen das Surfverhalten sogar mit Offline-Daten wie Einkäufen, Adressen oder Kundenkarten. Wenn so ein Dienst auftaucht, wird gerade deine Kennung zwischen Firmen abgeglichen oder dein Profil angereichert. Gefahren: Aus vielen harmlosen Einzeldaten entsteht ein erstaunlich vollständiges Bild einer Person, das ohne ihr Wissen gehandelt wird — die betroffene Person hat praktisch keine Möglichkeit mehr nachzuvollziehen, wo ihre Daten überall liegen.',
  },
  session: {
    titel: 'Sitzungsaufzeichnung',
    risiko: 3,
    kurz: 'Zeichnet Mausbewegungen, Klicks, Scrollen und teils Tastatureingaben auf — wie ein Video deines Besuchs.',
    lang: 'Session-Recording-Dienste zeichnen detailliert auf, was du auf der Seite tust: jede Mausbewegung, jeden Klick, jedes Scrollen, die Verweildauer auf einzelnen Elementen — und je nach Konfiguration auch Tastatureingaben in Formularfelder. Der Website-Betreiber kann sich deinen Besuch anschließend wie einen Film ansehen oder als „Heatmap" auswerten. Gedacht ist das zur Verbesserung der Bedienbarkeit. Das Problem: Die Aufzeichnung läuft ohne dein Wissen, die Daten liegen bei einem Dritten, und es kam wiederholt vor, dass Passwörter, Kreditkartennummern oder Krankendaten versehentlich mitgeschnitten wurden, weil Formularfelder nicht sauber ausgenommen waren. Gefahr: sehr intime Verhaltensdaten und womöglich sensible Eingaben in fremder Hand.',
  },
  analytics: {
    titel: 'Statistik & Analyse',
    risiko: 2,
    kurz: 'Misst, wie viele Menschen die Seite besuchen, woher sie kommen und was sie anklicken.',
    lang: 'Analyse-Dienste beantworten dem Website-Betreiber Fragen wie: Wie viele Besucher hatte ich? Woher kamen sie? Welche Artikel wurden gelesen? Dazu bekommt jeder Browser meist eine Kennung (Client-ID), damit Wiederkehrer erkannt werden. Das ist zunächst ein legitimes Interesse — der Unterschied liegt darin, WER die Daten bekommt: Selbst gehostete Werkzeuge (z. B. Matomo auf eigenem Server) behalten die Daten beim Betreiber. Bei kostenlosen Diensten großer Konzerne (allen voran Google Analytics) fließen die Daten dagegen an einen Konzern, der sie mit seinen übrigen Datenquellen zusammenführen kann — der Preis für „kostenlos" sind die Daten der Besucher. Gefahr: Ein einzelner Konzern sieht einen großen Teil des gesamten Surfverhaltens im Web.',
  },
  social: {
    titel: 'Soziale Netzwerke & Einbettungen',
    risiko: 2,
    kurz: 'Eingebettete Videos, Like-Buttons oder Posts melden dem Netzwerk deinen Besuch — auch ohne Klick.',
    lang: 'Wenn eine Seite ein YouTube-Video, einen Facebook-Button, einen eingebetteten Beitrag von X/Twitter oder Instagram enthält, lädt dein Browser Inhalte direkt von den Servern dieses Netzwerks — und teilt ihm damit automatisch mit, welche Seite du gerade liest, samt deiner IP-Adresse und oft vorhandener Cookies. Bist du beim Netzwerk eingeloggt, kann der Besuch direkt deinem Konto zugeordnet werden; ohne Login wird häufig trotzdem ein Wiedererkennungs-Cookie gesetzt. Du musst dafür nichts anklicken — das Laden genügt. Gefahr: Soziale Netzwerke erfahren, welche Artikel, Themen und Nischenseiten dich interessieren, weit über ihre eigene Plattform hinaus, und ergänzen damit dein dortiges Profil.',
  },
  marketing: {
    titel: 'Marketing & Kundenbindung',
    risiko: 2,
    kurz: 'Newsletter-, CRM- und Chat-Dienste, die Besucher wiedererkennen und mit Kundendaten verknüpfen.',
    lang: 'Marketing-Plattformen (Newsletter-Systeme, CRM, Chat-Widgets, Push-Dienste) verfolgen ein Ziel: aus anonymen Besuchern identifizierte Kontakte machen. Klickst du einen Link in einem Newsletter, trägt er oft eine persönliche Kennung — ab dann kann dein Surfverhalten auf der Seite deiner E-Mail-Adresse zugeordnet werden. Chat-Widgets übertragen häufig schon beim Laden Gerätedaten und legen ein Besucherprofil an, bevor du überhaupt etwas eintippst. Gefahr: Die Grenze zwischen „anonym surfen" und „als Person bekannt sein" verschwimmt, ohne dass ein bewusster Schritt (wie ein Login) nötig war.',
  },
  affiliate: {
    titel: 'Affiliate & Partnerprogramme',
    risiko: 2,
    kurz: 'Verfolgt, ob du über einen Empfehlungslink kommst und später etwas kaufst.',
    lang: 'Affiliate-Netzwerke vermitteln Provisionen: Wenn du über einen Link einer Website in einen Shop gelangst und dort kaufst, bekommt die Website Geld. Damit das abgerechnet werden kann, wird dein Klick markiert (Cookie oder Kennung in der Adresse) und beim Kauf wiedererkannt. Dafür beobachten diese Netzwerke Klickwege über viele Shops und Medienseiten hinweg. Gefahr: Auch hier entsteht nebenbei ein seitenübergreifendes Bild deines Kaufverhaltens; zudem beeinflusst das Provisionsmodell, welche Produkte dir „empfohlen" werden.',
  },
  tagmanager: {
    titel: 'Tag-Manager',
    risiko: 2,
    kurz: 'Ein Werkzeug, das weitere Tracking-Skripte nachlädt — die eigentliche Schaltzentrale.',
    lang: 'Ein Tag-Manager ist ein Container-Skript, über das Website-Betreiber beliebige weitere Skripte („Tags") einbinden und fernsteuern können, ohne die Seite selbst zu ändern — meist Analyse- und Werbeskripte. Er selbst sammelt wenig, ist aber die Schaltzentrale: Was er nachlädt, kann sich jederzeit ändern, ohne dass man es der Seite ansieht. Taucht ein Tag-Manager auf, lohnt der Blick darauf, welche Anfragen kurz danach folgen — das sind die Dienste, die er gestartet hat.',
  },
  errortracking: {
    titel: 'Fehler- & Leistungsüberwachung',
    risiko: 1,
    kurz: 'Meldet dem Betreiber technische Fehler und Ladezeiten; überträgt dabei Geräte- und teils Sitzungsdaten.',
    lang: 'Diese Dienste melden dem Website-Betreiber, wenn auf der Seite etwas schiefgeht (JavaScript-Fehler, Abstürze) oder wie schnell sie lädt. Das ist für den Betrieb nützlich und zielt nicht auf Werbung. Trotzdem fließen dabei Daten an einen Dritten: Browser- und Gerätedetails, die besuchte Unterseite, teils die letzten Aktionen vor einem Fehler („Breadcrumbs") — und darin können versehentlich persönliche Daten stecken. Risiko: gering bis mittel, eher Datenschutz-Beifang als gezieltes Tracking.',
  },
  cmp: {
    titel: 'Consent-Management (Cookie-Banner)',
    risiko: 1,
    kurz: 'Der technische Dienst hinter dem Cookie-Banner; speichert deine Einwilligungs-Entscheidung.',
    lang: 'Consent-Management-Plattformen liefern die Cookie-Banner aus und speichern, was du dort angeklickt hast. Sie sind eine Folge der DSGVO: Vieles vom Tracking auf dieser Liste ist rechtlich nur mit Einwilligung erlaubt. Der Dienst selbst sammelt wenig — interessant ist er als Indikator: Er zeigt, dass die Seite einwilligungspflichtige Dienste einsetzt. Beachte: Was WebWatch anzeigt, hängt von deiner Banner-Entscheidung ab — mit „Alles akzeptieren" siehst du hier meist deutlich mehr Verbindungen als mit „Ablehnen". Ein aufschlussreiches Experiment: dieselbe Seite einmal mit und einmal ohne Einwilligung laden und vergleichen.',
  },
  cdn: {
    titel: 'Inhalte & Infrastruktur (CDN)',
    risiko: 1,
    kurz: 'Liefert Bilder, Skripte und Schriften aus — sieht dabei aber IP-Adresse und besuchte Seite.',
    lang: 'Content Delivery Networks (CDNs) liefern Bausteine der Seite aus: Bilder, Videos, JavaScript-Bibliotheken, Schriftarten. Sie sind technisch notwendig oder zumindest üblich und wollen in der Regel nicht tracken. Aber: Jede Anfrage verrät dem CDN zwangsläufig deine IP-Adresse und meist die Seite, die du gerade besuchst (Referrer). Bei sehr großen Anbietern läuft so ein erheblicher Teil des gesamten Webverkehrs über wenige Firmen — die theoretisch mitlesen könnten, wer wann was besucht. Bekanntes Beispiel: Google Fonts. Deutsche Gerichte haben entschieden, dass schon die Übertragung der IP-Adresse an Google beim Laden von Schriften ohne Einwilligung problematisch ist.',
  },
  functional: {
    titel: 'Funktionale Dienste',
    risiko: 1,
    kurz: 'Bezahldienste, Captchas, Karten, Support — für Funktionen nötig, übertragen aber teils viele Gerätedaten.',
    lang: 'Hierunter fallen Dienste, die eine sichtbare Funktion erfüllen: Bezahlvorgänge, Bot-Schutz (Captchas), Kartendienste, Support-Systeme. Sie sind nicht primär zum Tracken da — aber einige sammeln erstaunlich viel: Bezahldienste betreiben Betrugserkennung und erfassen dafür detaillierte Gerätemerkmale; Captcha-Dienste bewerten anhand von Verhalten und Browserdaten, ob du ein Mensch bist. Das ist ein Tausch: Sicherheit und Komfort gegen Daten. Risiko: gering für den Einzelfall, erwähnenswert wegen der Detailtiefe der erfassten Gerätedaten.',
  },
  unknown: {
    titel: 'Unbekannter Drittanbieter',
    risiko: 2,
    kurz: 'Eine fremde Gegenstelle, die nicht in der WebWatch-Datenbank steht.',
    lang: 'Nicht jede fremde Domain lässt sich automatisch einordnen — die WebWatch-Datenbank umfasst die verbreitetsten Dienste, aber bei weitem nicht alle. „Unbekannt" heißt also nicht harmlos und nicht gefährlich, sondern: hier lohnt ein eigener Blick. Hilfreiche Fragen: Was wurde übertragen (siehe Detailansicht)? Klingt der Domainname nach einem CDN des Seitenbetreibers oder nach etwas Fremdem? Eine Websuche nach der Domain bringt oft schnell Klarheit.',
  },
};

// Reihenfolge für Anzeigen (nach Risiko, dann thematisch)
WW.CATEGORY_ORDER = [
  'advertising', 'audience', 'session', 'analytics', 'social', 'marketing',
  'affiliate', 'tagmanager', 'errortracking', 'cmp', 'cdn', 'functional',
  'unknown',
];

WW.LEXIKON_INTRO = {
  titel: 'Was passiert, wenn du eine Website öffnest?',
  text: 'Wenn du eine Adresse aufrufst, lädt dein Browser zuerst die Seite selbst — vom Server des Betreibers („Erstanbieter"). Diese Seite enthält aber fast immer Anweisungen, weitere Dinge von ganz anderen Servern nachzuladen: Bilder, Schriften, vor allem aber JavaScript-Programme. Diese Programme laufen in deinem Browser und dürfen dort einiges: Sie sehen, was auf der Seite steht und was du tust, können Gerätedaten auslesen (Bildschirmgröße, Sprache, Zeitzone …) und all das an beliebige Server schicken — im Hintergrund, ohne sichtbares Zeichen. Jede einzelne dieser Verbindungen verrät der Gegenstelle außerdem automatisch deine IP-Adresse und meist die Seite, auf der du dich befindest. Genau diese Verbindungen macht WebWatch sichtbar: wohin sie gehen, wem die Gegenstelle gehört und welche Daten mitgeschickt wurden. WebWatch beobachtet nur — es blockiert nichts und verändert nichts. Wichtig für die Einordnung: Was du siehst, hängt von deiner Cookie-Banner-Entscheidung und installierten Werbeblockern ab. Und: WebWatch sieht nur, was der Browser abschickt — was der Empfänger mit den Daten dann macht, kann keine Software der Welt von außen sehen; hier helfen die Kategorie-Texte mit dem typischen Geschäftsmodell weiter.',
};

// Anfragetypen (webRequest ResourceType) → Klartext, was da gerade passiert.
WW.TYPE_LABELS = {
  main_frame: 'Seite laden',
  sub_frame: 'Eingebettete Seite laden',
  stylesheet: 'Gestaltung (CSS) laden',
  script: 'Programm (Skript) laden',
  image: 'Bild laden',
  imageset: 'Bild laden',
  font: 'Schriftart laden',
  media: 'Video/Audio laden',
  object: 'Plugin-Inhalt laden',
  object_subrequest: 'Plugin-Inhalt laden',
  ping: 'Tracking-Signal senden',
  beacon: 'Tracking-Signal senden',
  csp_report: 'Sicherheitsbericht senden',
  websocket: 'Dauerverbindung öffnen',
  web_manifest: 'App-Infos laden',
  speculative: 'Vorab-Verbindung aufbauen',
  xslt: 'Umwandlungs-Vorlage laden',
  other: 'Sonstige Übertragung',
};

WW.typeLabel = (type, method) => {
  if (type === 'xmlhttprequest' || type === 'fetch') {
    return method && method !== 'GET' ? 'Daten senden (im Hintergrund)' : 'Daten abrufen (im Hintergrund)';
  }
  const label = WW.TYPE_LABELS[type];
  if (label) return label;
  return method && method !== 'GET' ? 'Daten senden' : 'Sonstige Übertragung';
};

WW.GLOSSAR = [
  { begriff: 'Erstanbieter / Drittanbieter', text: 'Erstanbieter ist die Website, deren Adresse in deiner Adresszeile steht. Drittanbieter sind alle anderen Server, zu denen dein Browser beim Besuch Verbindungen aufbaut — oft Dutzende, ohne dass man es merkt.' },
  { begriff: 'Cookie', text: 'Ein kleiner Datensatz, den ein Server in deinem Browser ablegt und den der Browser bei jeder weiteren Anfrage an denselben Server automatisch mitschickt. Nützlich für Logins — als Drittanbieter-Cookie aber das klassische Werkzeug, um dich über viele Websites hinweg wiederzuerkennen.' },
  { begriff: 'IP-Adresse', text: 'Die Absenderadresse deines Internetanschlusses. Jeder Server, den dein Browser kontaktiert, sieht sie zwangsläufig. Sie verrät deinen Anbieter und ungefähren Standort und bleibt oft über Stunden bis Tage gleich — genug, um Aktivitäten zu verknüpfen.' },
  { begriff: 'Referrer', text: 'Eine Kopfzeile, mit der der Browser einer Gegenstelle mitteilt, von welcher Seite die Anfrage stammt. So erfährt ein Werbenetzwerk auch ohne besondere Tricks, welchen Artikel du gerade liest.' },
  { begriff: 'Zählpixel', text: 'Ein unsichtbares Mini-Bild (oft 1×1 Pixel), das nur zu einem Zweck geladen wird: Der Abruf selbst ist die Nachricht — „dieser Browser war um diese Uhrzeit auf dieser Seite". Die eigentlichen Daten stecken in der Abruf-Adresse.' },
  { begriff: 'Beacon', text: 'Eine spezielle Hintergrund-Anfrage, die der Browser auch dann noch zuverlässig abschickt, wenn du die Seite gerade verlässt. Beliebt, um Verweildauer und letzte Aktionen zu übermitteln.' },
  { begriff: 'Client-ID / Nutzer-ID', text: 'Eine zufällig erzeugte Kennung, die deinem Browser einmal zugeteilt und dann bei jedem Besuch mitgeschickt wird. Sie macht aus vielen einzelnen Seitenaufrufen ein zusammenhängendes Profil.' },
  { begriff: 'Klick-ID (gclid, fbclid …)', text: 'Eine Kennung, die Werbeplattformen an Links anhängen, wenn du auf eine Anzeige oder ein Suchergebnis klickst. Die Zielseite meldet sie zurück — so weiß die Plattform, dass genau dein Klick zu diesem Besuch (und ggf. Kauf) geführt hat.' },
  { begriff: 'Fingerprinting', text: 'Wiedererkennung ohne Cookies: Viele einzelne Gerätemerkmale (Bildschirmgröße, Schriften, Grafikkarte, Zeitzone, Browserversion …) ergeben zusammen ein fast einmaliges Muster — einen „Fingerabdruck", den man nicht wie Cookies löschen kann.' },
  { begriff: 'Cookie-Syncing / ID-Matching', text: 'Werbefirmen gleichen ihre Kennungen untereinander ab („Nutzer 123 bei mir = Nutzer ABC bei dir"), damit ihre getrennten Profile derselben Person zusammengeführt werden können.' },
  { begriff: 'Real-Time Bidding', text: 'Auktionsverfahren für Werbeplätze: Beim Seitenaufruf werden in Millisekunden Daten über dich an viele Bieter gesendet, die dann um die Werbeeinblendung bieten. Die Daten fließen dabei an alle Bieter — auch an die, die nicht gewinnen.' },
  { begriff: 'CDN', text: 'Content Delivery Network — Server-Netz, das Bilder, Skripte und Schriften schnell ausliefert. Kein Tracking-Dienst im engeren Sinn, sieht aber bei jedem Abruf IP-Adresse und besuchte Seite.' },
  { begriff: 'Hashing', text: 'Ein Verfahren, das Daten (z. B. eine E-Mail-Adresse) in eine feste Zeichenfolge verwandelt. Wird oft als „anonymisiert" verkauft — dieselbe E-Mail ergibt aber immer denselben Hash, weshalb er sich bestens als seitenübergreifende Kennung eignet.' },
  { begriff: 'WebSocket', text: 'Eine Dauerverbindung zwischen Browser und Server, über die laufend Daten in beide Richtungen fließen können — z. B. für Chats, Live-Kurse oder auch kontinuierliche Verhaltensübertragung.' },
];
