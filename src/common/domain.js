'use strict';
// Domain-Helfer: Hostname extrahieren, registrierbare Domain (eTLD+1)
// bestimmen, Erst-/Drittanbieter unterscheiden.
//
// Bewusst KEINE vollständige Public-Suffix-List (mehrere hundert KB) —
// stattdessen die gängigen mehrteiligen Endungen plus verbreitete
// Hosting-/CDN-Suffixe. Für die Erst-/Drittanbieter-Frage reicht das;
// Fehlklassifikationen betreffen exotische ccTLD-Fälle.
globalThis.WW = globalThis.WW || {};

(() => {
  // Öffentliche mehrteilige Endungen (Auswahl der verbreitetsten)
  const MULTI = new Set([
    'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'net.uk', 'ltd.uk', 'plc.uk',
    'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp',
    'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
    'co.nz', 'net.nz', 'org.nz',
    'co.in', 'net.in', 'org.in', 'firm.in', 'gen.in',
    'com.br', 'net.br', 'org.br',
    'com.mx', 'com.ar', 'com.tr', 'com.co', 'com.pe', 'com.ve', 'com.uy',
    'com.cn', 'net.cn', 'org.cn', 'com.tw', 'com.hk', 'com.sg', 'com.my',
    'co.za', 'co.kr', 'or.kr', 'co.il', 'org.il', 'co.th', 'co.id',
    'com.ph', 'com.pk', 'com.vn', 'com.eg', 'com.sa', 'com.ua', 'com.pl',
    'net.pl', 'org.pl', 'com.ru', 'msk.ru', 'spb.ru',
  ]);

  // Private Suffixe: jeder Kunde bekommt eine eigene Subdomain, deshalb ist
  // erst die Ebene DARÜBER die "eigene" Domain (z. B. d1234.cloudfront.net).
  const PRIVATE = new Set([
    'github.io', 'gitlab.io', 'netlify.app', 'vercel.app', 'web.app',
    'firebaseapp.com', 'herokuapp.com', 'azurewebsites.net', 'cloudfront.net',
    'amazonaws.com', 'blogspot.com', 'wixsite.com', 'pages.dev', 'workers.dev',
    'b-cdn.net', 'azureedge.net', 'akamaized.net', 'akamaihd.net',
    'edgesuite.net', 'edgekey.net', 'llnwd.net', 'translate.goog',
  ]);

  const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

  function getHost(url) {
    try {
      let h = new URL(url).hostname.toLowerCase();
      if (h.endsWith('.')) h = h.slice(0, -1);
      return h;
    } catch (e) { return ''; }
  }

  function isIp(host) {
    return IPV4.test(host) || host.includes(':'); // IPv6-Hosts enthalten ':'
  }

  // Registrierbare Domain: "www.foo.co.uk" → "foo.co.uk",
  // "a.b.example.com" → "example.com", "x.cloudfront.net" → "x.cloudfront.net"
  function getBaseDomain(host) {
    if (!host) return '';
    if (isIp(host)) return host;
    const labels = host.split('.');
    if (labels.length <= 2) return host;
    for (const k of [3, 2]) {
      if (labels.length > k) {
        const suffix = labels.slice(-k).join('.');
        if (MULTI.has(suffix) || PRIVATE.has(suffix)) {
          return labels.slice(-(k + 1)).join('.');
        }
      }
    }
    return labels.slice(-2).join('.');
  }

  function isThirdParty(host, pageBase) {
    if (!host || !pageBase) return false;
    return getBaseDomain(host) !== pageBase;
  }

  WW.domain = { getHost, getBaseDomain, isThirdParty, isIp };
})();
