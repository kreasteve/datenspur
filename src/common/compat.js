'use strict';
// WebWatch — gemeinsamer Namespace + kleine Helfer.
// Läuft als klassisches Skript in Background (FF-Event-Page / Chrome-SW via
// importScripts), in Extension-Seiten und im Node-Testharness.
globalThis.WW = globalThis.WW || {};

(() => {
  // Browser-API vereinheitlichen: Firefox `browser` (Promises), Chrome MV3
  // `chrome` (Promises, wenn kein Callback übergeben wird).
  const B = globalThis.browser ?? globalThis.chrome ?? null;
  WW.B = B;
  WW.isFirefox = typeof globalThis.browser !== 'undefined';
  // MV2: browserAction, MV3: action
  WW.action = B ? (B.action ?? B.browserAction ?? null) : null;

  WW.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  WW.cap = (s, n) => {
    s = String(s ?? '');
    return s.length > n ? s.slice(0, n) + '…' : s;
  };

  WW.fmtBytes = (n) => {
    if (n == null || isNaN(n)) return '–';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  };

  WW.fmtTime = (ts) => {
    try {
      return new Date(ts).toLocaleTimeString('de-DE', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    } catch (e) { return String(ts); }
  };

  WW.fmtDate = (ts) => {
    try {
      return new Date(ts).toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    } catch (e) { return String(ts); }
  };
})();
