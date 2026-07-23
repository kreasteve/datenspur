'use strict';
// Dekodiert, was in Anfragen tatsächlich drinsteckt: Query-Parameter,
// Formulardaten, JSON-Bodys, Base64 — plus deutsche Klartext-Labels für
// bekannte Tracking-Parameter.
globalThis.WW = globalThis.WW || {};

(() => {
  const MAX_PARAMS = 80;
  const MAX_VAL = 500;
  const MAX_BODY_TEXT = 8192;

  // Bekannte Parameter → deutsche Bedeutung. Quellen: öffentlich
  // dokumentierte Mess-Protokolle (GA4, Meta Pixel, Matomo …).
  WW.PARAM_LABELS = {
    // Google Analytics (GA4 + Universal)
    tid: 'Mess-ID der Website', cid: 'Client-ID (Browser-Wiedererkennung)',
    sid: 'Sitzungs-ID', sct: 'Anzahl bisheriger Sitzungen',
    sr: 'Bildschirmauflösung', vp: 'Fenstergröße', ul: 'Sprache',
    dl: 'Adresse der besuchten Seite', dr: 'Herkunftsseite (Referrer)',
    dt: 'Titel der besuchten Seite', dp: 'Pfad der besuchten Seite',
    en: 'Ereignis-Name', uid: 'Nutzer-ID', _p: 'Zufalls-Kennung',
    seg: 'Sitzung aktiv', uip: 'IP-Adresse (vom Betreiber gesetzt)',
    je: 'Java aktiviert', sd: 'Farbtiefe des Bildschirms',
    gtm: 'Tag-Manager-Kennung', frm: 'Frame-Info', ir: 'Ignorierter Referrer',
    // Meta / Facebook Pixel
    ev: 'Ereignis-Name', fbp: 'Facebook-Browser-Kennung',
    fbc: 'Facebook-Klick-Kennung', rl: 'Herkunftsseite (Referrer)',
    sw: 'Bildschirmbreite', sh: 'Bildschirmhöhe',
    'ud[em]': 'E-Mail-Adresse (gehasht)', 'ud[ph]': 'Telefonnummer (gehasht)',
    'ud[fn]': 'Vorname (gehasht)', 'ud[ln]': 'Nachname (gehasht)',
    'ud[external_id]': 'Externe Nutzer-ID',
    // Matomo / Piwik
    idsite: 'Website-Kennung', _id: 'Besucher-ID', rec: 'Aufzeichnung aktiv',
    res: 'Bildschirmauflösung', urlref: 'Herkunftsseite (Referrer)',
    action_name: 'Seitentitel/Aktion', _idts: 'Zeitpunkt des ersten Besuchs',
    _idvc: 'Anzahl bisheriger Besuche',
    // Kampagnen-Parameter (in Seiten-URLs)
    utm_source: 'Kampagnen-Quelle', utm_medium: 'Kampagnen-Medium',
    utm_campaign: 'Kampagnen-Name', utm_term: 'Kampagnen-Suchwort',
    utm_content: 'Kampagnen-Variante',
    gclid: 'Google-Klick-Kennung', dclid: 'DoubleClick-Klick-Kennung',
    fbclid: 'Facebook-Klick-Kennung', msclkid: 'Microsoft-Klick-Kennung',
    ttclid: 'TikTok-Klick-Kennung', twclid: 'Twitter/X-Klick-Kennung',
    mc_eid: 'Mailchimp-Empfänger-ID (persönlich!)',
    // Allgemein verbreitet
    referrer: 'Herkunftsseite (Referrer)', referer: 'Herkunftsseite (Referrer)',
    ref: 'Herkunftsseite (Referrer)', url: 'Besuchte Adresse',
    page: 'Besuchte Seite', location: 'Besuchte Adresse',
    href: 'Besuchte Adresse', u: 'Besuchte Adresse',
    lang: 'Sprache', language: 'Sprache', hl: 'Sprache', locale: 'Sprache/Region',
    tz: 'Zeitzone', timezone: 'Zeitzone',
    ua: 'Browser-Kennung (User-Agent)', useragent: 'Browser-Kennung (User-Agent)',
    screen: 'Bildschirmdaten', viewport: 'Fenstergröße',
    session_id: 'Sitzungs-ID', visitor_id: 'Besucher-ID',
    user_id: 'Nutzer-ID', client_id: 'Client-ID', device_id: 'Geräte-ID',
    anonymous_id: '„Anonyme" Dauer-Kennung', distinct_id: 'Eindeutige Nutzer-Kennung',
    email: 'E-Mail-Adresse', e: 'Ereignis/Adresse (dienstabhängig)',
  };

  WW.paramLabel = (key) => {
    if (!key) return null;
    const k = String(key).toLowerCase();
    if (Object.prototype.hasOwnProperty.call(WW.PARAM_LABELS, k)) return WW.PARAM_LABELS[k];
    // ud[...]-Felder des Meta-Pixels
    if (k.startsWith('ud[')) return WW.PARAM_LABELS[k] || 'Nutzerdaten-Feld (Meta Pixel)';
    return null;
  };

  // URL-Query → [{k, v}]
  WW.parseQuery = (url) => {
    const out = [];
    try {
      const u = new URL(url);
      for (const [k, v] of u.searchParams) {
        out.push({ k: WW.cap(k, 100), v: WW.cap(v, MAX_VAL) });
        if (out.length >= MAX_PARAMS) break;
      }
    } catch (e) { /* keine gültige URL */ }
    return out;
  };

  // Verschachteltes JSON → flache Parameterliste ("a.b.c" → Wert)
  WW.flattenJson = (obj, prefix, out, depth) => {
    out = out || [];
    depth = depth || 0;
    if (out.length >= MAX_PARAMS || depth > 4 || obj == null) return out;
    if (Array.isArray(obj)) {
      obj.slice(0, 20).forEach((v, i) => WW.flattenJson(v, prefix + '[' + i + ']', out, depth + 1));
      return out;
    }
    if (typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        if (out.length >= MAX_PARAMS) break;
        const key = prefix ? prefix + '.' + k : k;
        if (v !== null && typeof v === 'object') WW.flattenJson(v, key, out, depth + 1);
        else out.push({ k: WW.cap(key, 100), v: WW.cap(String(v), MAX_VAL) });
      }
      return out;
    }
    out.push({ k: prefix || '(Wert)', v: WW.cap(String(obj), MAX_VAL) });
    return out;
  };

  const looksUrlEncoded = (s) => /^[^=&\s]+=[^&]*(&[^=&\s]+=[^&]*)*$/.test(s.slice(0, 2000));

  const parseUrlEncoded = (s) => {
    const out = [];
    for (const pair of s.split('&')) {
      if (out.length >= MAX_PARAMS) break;
      const i = pair.indexOf('=');
      if (i < 0) continue;
      try {
        out.push({
          k: WW.cap(decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' ')), 100),
          v: WW.cap(decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' ')), MAX_VAL),
        });
      } catch (e) {
        out.push({ k: WW.cap(pair.slice(0, i), 100), v: WW.cap(pair.slice(i + 1), MAX_VAL) });
      }
    }
    return out;
  };

  // Versucht, einen Wert weiter zu entschlüsseln (URL-Encoding, Base64-JSON).
  WW.tryDecodeValue = (v) => {
    if (typeof v !== 'string' || !v) return v;
    let s = v;
    if (/%[0-9a-fA-F]{2}/.test(s)) {
      try { s = decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { /* lassen */ }
    }
    // Base64-kodiertes JSON erkennen
    if (/^[A-Za-z0-9+/=_-]{12,}$/.test(s) && s.length % 4 === 0 && typeof atob === 'function') {
      try {
        const dec = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
        if (/^\s*[[{]/.test(dec)) { JSON.parse(dec); return dec; }
      } catch (e) { /* kein Base64-JSON */ }
    }
    return s;
  };

  // webRequest requestBody → {kind, params, text, bytes}
  WW.decodeRequestBody = (requestBody) => {
    if (!requestBody) return null;
    if (requestBody.formData) {
      const params = [];
      for (const [k, vals] of Object.entries(requestBody.formData)) {
        for (const v of [].concat(vals)) {
          if (params.length >= MAX_PARAMS) break;
          params.push({ k: WW.cap(k, 100), v: WW.cap(String(v), MAX_VAL) });
        }
      }
      return { kind: 'form', params, text: null, bytes: 0 };
    }
    if (requestBody.raw && requestBody.raw.length) {
      let bytes = 0;
      let text = '';
      let binary = false;
      try {
        const dec = new TextDecoder('utf-8', { fatal: false });
        for (const part of requestBody.raw) {
          if (!part.bytes) continue;
          bytes += part.bytes.byteLength;
          if (text.length < MAX_BODY_TEXT) text += dec.decode(part.bytes, { stream: true });
        }
      } catch (e) { binary = true; }
      text = text.slice(0, MAX_BODY_TEXT);
      // Steuerzeichen-Anteil als Binär-Heuristik
      if (!binary && text) {
        let ctrl = 0;
        for (let i = 0; i < Math.min(text.length, 512); i++) {
          const c = text.charCodeAt(i);
          if (c < 9 || (c > 13 && c < 32) || c === 0xfffd) ctrl++;
        }
        if (ctrl > Math.min(text.length, 512) * 0.1) binary = true;
      }
      if (binary || !text) return { kind: 'binary', params: [], text: null, bytes };
      const trimmed = text.trim();
      if (/^[[{]/.test(trimmed)) {
        try {
          const obj = JSON.parse(trimmed);
          return { kind: 'json', params: WW.flattenJson(obj, '', [], 0), text: WW.cap(trimmed, 4096), bytes };
        } catch (e) { /* abgeschnittenes oder ungültiges JSON */ }
      }
      if (looksUrlEncoded(trimmed)) {
        return { kind: 'form', params: parseUrlEncoded(trimmed), text: WW.cap(trimmed, 4096), bytes };
      }
      return { kind: 'text', params: [], text: WW.cap(trimmed, 4096), bytes };
    }
    return null;
  };
})();
