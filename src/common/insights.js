'use strict';
// Erkenntnis-Engine: untersucht eine einzelne Anfrage und benennt in
// Klartext, welche Daten übertragen wurden.
// Schweregrade: 1 = Hinweis, 2 = bemerkenswert, 3 = heikel
globalThis.WW = globalThis.WW || {};

(() => {
  // TLD bewusst nur Buchstaben: "wght@300..900" (Google-Fonts-Parameter)
  // oder ähnliche technische Werte dürfen nie als E-Mail gelten.
  const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  // Dateiendungen, die keine E-Mail-TLD sein können — verhindert
  // Fehlalarme durch Asset-Namen wie "logo@2x.png".
  const NOT_EMAIL_TLD = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'ico', 'css', 'js',
    'mjs', 'json', 'map', 'woff', 'woff2', 'ttf', 'otf', 'html', 'htm',
    'txt', 'xml', 'webm', 'mp4', 'mp3', 'pdf',
  ]);
  const findEmail = (val) => {
    const m = val.match(EMAIL_RE);
    if (!m) return null;
    const dom = m[0].split('@')[1] || '';
    const tld = dom.split('.').pop().toLowerCase();
    if (NOT_EMAIL_TLD.has(tld)) return null;
    if (/^\d+x(\.|$)/i.test(dom)) return null; // "name@2x.png"-Muster
    return m[0];
  };
  const HASH_RE = /^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$/i;
  const SCREEN_RE = /^\d{3,4}\s?[x×]\s?\d{3,4}(x\d{1,2})?$/i;
  const SCREEN_KEYS = /^(sr|res|vp|sd|screen|screens|viewport|resolution|screen_resolution|screensize|window_size)$/i;
  const ID_KEY_RE = /(^|[_.\-[])(id|uid|cid|sid|uuid|guid|visitor|client|user|device|anon(ymous)?|distinct|instance)([_.\-\]]|$)/i;
  const ID_VAL_RE = /^[A-Za-z0-9._:-]{10,}$/;
  const EMAIL_KEY_RE = /(^|[_.\-[])(em|email|e_mail|mail|he|hem|hashed_?email)([_.\-\]]|$)/i;
  const LANG_TZ_KEYS = /^(ul|lang|language|hl|locale|tz|timezone|tzo|timezone_offset)$/i;
  const GEO_KEYS = /^(lat|latitude|lon|lng|longitude|geo|geolat|geolng)$/i;
  const PIXEL_PATH_RE = /(pixel|collect|track|beacon|imp\b|\/i\.gif|\/p\.gif|\/1x1|\/tr\b|\/ping\b|\/event|\/rec\b|\/log\b)/i;
  const SYNC_PATH_RE = /(sync|match|usermatch|getuid|cksync|rtset|pixel\/attr)/i;
  // Verbreitete Kennungs-Parameter (GA, Meta, Microsoft, Segment …)
  const KNOWN_ID_KEYS = new Set([
    'cid', 'sid', 'uid', '_ga', '_gid', 'fbp', '_fbp', 'fbc', '_fbc',
    'gclid', 'dclid', 'msclkid', 'ttclid', 'twclid', 'muid', 'mid',
    'distinct_id', 'device_id', 'client_id', 'user_id', 'visitor_id',
    'anonymous_id', 'anonid', '_gcl_au', '_uetsid', '_uetvid', 'mc_eid',
  ]);
  const FP_KEYS = new Set([
    'colordepth', 'color_depth', 'pixeldepth', 'timezone', 'timezoneoffset',
    'plugins', 'canvas', 'webgl', 'webgl_vendor', 'fonts', 'audio',
    'hardwareconcurrency', 'hardware_concurrency', 'devicememory',
    'device_memory', 'platform', 'maxtouchpoints', 'touchsupport',
    'donottrack', 'cookieenabled', 'cpuclass', 'oscpu', 'gpu', 'renderer',
  ]);

  // Untersucht eine Anfrage. rec: Anfrage-Datensatz (siehe store.js),
  // page: {url, base} der gerade besuchten Seite.
  WW.analyzeRequest = (rec, page) => {
    const found = new Map(); // kind → insight

    const add = (kind, sev, label, detail) => {
      const prev = found.get(kind);
      if (!prev) found.set(kind, { kind, sev, label, detail: WW.cap(detail || '', 300) });
      else if (sev > prev.sev) { prev.sev = sev; prev.label = label; if (detail) prev.detail = WW.cap(detail, 300); }
    };

    const params = [];
    for (const p of rec.query || []) params.push(p);
    if (rec.body && rec.body.params) for (const p of rec.body.params) params.push(p);

    const tp = !!rec.tp;
    let fpCount = 0;
    const fpSeen = [];

    for (const { k, v } of params) {
      const key = String(k || '');
      const keyLc = key.toLowerCase();
      const raw = String(v || '');
      const val = typeof WW.tryDecodeValue === 'function' ? String(WW.tryDecodeValue(raw)) : raw;

      // E-Mail im Klartext
      const em = findEmail(val);
      if (em) add('email', 3, 'E-Mail-Adresse übertragen', `${key} = ${em}`);
      // E-Mail/Telefon gehasht (Meta "ud[em]" & Co.)
      else if (EMAIL_KEY_RE.test(keyLc) && HASH_RE.test(val)) {
        add('email-hash', 3, 'E-Mail-Adresse (gehasht) übertragen', `${key} = ${WW.cap(val, 40)}`);
      }

      // Bildschirmgröße
      if (SCREEN_RE.test(val) || (SCREEN_KEYS.test(keyLc) && val)) {
        add('screen', tp ? 2 : 1, 'Bildschirmgröße übertragen', `${key} = ${WW.cap(val, 40)}`);
      }

      // Besuchte Seite / Referrer an Dritte
      if (tp && page && page.base && /^https?:\/\//i.test(val)) {
        try {
          if (WW.domain.getBaseDomain(WW.domain.getHost(val)) === page.base) {
            add('url-leak', 2, 'Besuchte Seite weitergegeben', `${key} = ${WW.cap(val, 120)}`);
          }
        } catch (e) { /* Wert war keine URL */ }
      }

      // Eindeutige Kennungen
      if (tp && ID_KEY_RE.test(key) && ID_VAL_RE.test(val) && !SCREEN_RE.test(val)) {
        add('id', 2, 'Eindeutige Kennung übertragen', `${key} = ${WW.cap(val, 60)}`);
      }
      if (tp && KNOWN_ID_KEYS.has(keyLc) && val.length >= 6) {
        add('id', 2, 'Eindeutige Kennung übertragen', `${key} = ${WW.cap(val, 60)}`);
      }

      // Sprache/Zeitzone
      if (tp && LANG_TZ_KEYS.test(keyLc) && val) {
        add('lang-tz', 1, 'Sprache/Zeitzone übertragen', `${key} = ${WW.cap(val, 40)}`);
      }

      // Standort
      if (GEO_KEYS.test(keyLc) && /^-?\d{1,3}\.\d+$/.test(val)) {
        add('geo', 3, 'Standort-Koordinaten übertragen', `${key} = ${val}`);
      }

      // Fingerprinting-Merkmale zählen (nur letzte Namenskomponente prüfen)
      const leaf = keyLc.split(/[._[\]]/).filter(Boolean).pop() || keyLc;
      if (FP_KEYS.has(leaf)) { fpCount++; if (fpSeen.length < 8) fpSeen.push(key); }
    }

    if (fpCount >= 3) {
      add('fingerprint', 3, 'Geräte-Fingerabdruck übertragen', `${fpCount} Gerätemerkmale, u. a. ${fpSeen.slice(0, 5).join(', ')}`);
    }

    // Referrer-Kopfzeile an Dritte
    if (tp && rec.referer && page && page.base) {
      const rBase = WW.domain.getBaseDomain(WW.domain.getHost(rec.referer));
      if (rBase === page.base) add('url-leak', 2, 'Besuchte Seite weitergegeben', `Referer: ${WW.cap(rec.referer, 120)}`);
    }

    // Cookies an Drittanbieter
    if (tp && rec.cookieCount > 0) {
      add('cookies', 2, 'Cookies an Drittanbieter mitgesendet',
        `${rec.cookieCount} Cookie(s): ${(rec.cookieNames || []).slice(0, 6).join(', ')}`);
    }

    let path = '';
    try { path = new URL(rec.url).pathname; } catch (e) { /* egal */ }

    // Beacon (sendBeacon/ping) — geht auch beim Verlassen der Seite raus
    if (rec.type === 'ping' || rec.type === 'beacon') {
      add('beacon', tp ? 2 : 1, 'Unsichtbares Tracking-Signal (Beacon)', path);
    }

    // Zählpixel: als Bild getarnte Datenübertragung
    if (tp && (rec.type === 'image' || rec.type === 'imageset')) {
      const q = rec.query || [];
      if (PIXEL_PATH_RE.test(path) || (/\.gif$/i.test(path) && q.length >= 3)) {
        add('pixel', 2, 'Zählpixel geladen', `${rec.host}${WW.cap(path, 80)} (${q.length} Parameter)`);
      }
    }

    // Cookie-Syncing / ID-Abgleich zwischen Werbefirmen
    if (tp && rec.entity && (rec.entity.cat === 'audience' || rec.entity.cat === 'advertising') && SYNC_PATH_RE.test(path + (rec.url.split('?')[1] || ''))) {
      add('sync', 3, 'Kennungs-Abgleich zwischen Werbefirmen (Cookie-Syncing)', `${rec.host}${WW.cap(path, 60)}`);
    }

    // Sitzungsaufzeichner kontaktiert
    if (tp && rec.entity && rec.entity.cat === 'session' && rec.method === 'POST') {
      add('session-rec', 3, 'Verhaltensdaten an Sitzungsaufzeichner gesendet', rec.host);
    }

    // Dauerverbindung
    if (rec.type === 'websocket') {
      add('ws', tp ? 2 : 1, 'Dauerverbindung aufgebaut (WebSocket)', rec.host);
    }

    return [...found.values()].sort((a, b) => b.sev - a.sev);
  };

  // Wird nachträglich ergänzt, wenn die Antwort eintrifft (Set-Cookie).
  WW.analyzeResponse = (rec, responseHeaders) => {
    if (!rec.tp || !responseHeaders) return null;
    let count = 0;
    let maxDays = 0;
    for (const h of responseHeaders) {
      if (String(h.name).toLowerCase() !== 'set-cookie') continue;
      count++;
      const m = /max-age=(\d+)/i.exec(h.value || '');
      if (m) maxDays = Math.max(maxDays, parseInt(m[1], 10) / 86400);
      const ex = /expires=([^;]+)/i.exec(h.value || '');
      if (ex) {
        const d = (new Date(ex[1]).getTime() - Date.now()) / 86400000;
        if (!isNaN(d)) maxDays = Math.max(maxDays, d);
      }
    }
    if (!count) return null;
    if (maxDays > 365) {
      return { kind: 'set-cookie', sev: 3, label: 'Langzeit-Cookie gesetzt', detail: `${count} Cookie(s), gültig ~${Math.round(maxDays / 365 * 10) / 10} Jahre` };
    }
    return { kind: 'set-cookie', sev: 2, label: 'Drittanbieter setzt Cookie', detail: `${count} Cookie(s)${maxDays >= 1 ? `, gültig ~${Math.round(maxDays)} Tage` : ''}` };
  };
})();
