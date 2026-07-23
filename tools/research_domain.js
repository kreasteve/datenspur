'use strict';
// Recherche-Werkzeug für die Tracker-DB: sammelt zu einer unbekannten Domain
// automatisch Belege (Wem gehört sie? Was macht sie?) und schlägt einen
// Eintrag für src/common/trackerdb.js vor. Nur Node-Bordmittel, keine Deps.
//
// Aufruf: node tools/research_domain.js domain1 [domain2 …]
//
// Quellen (nur zur Recherche abgefragt, es werden keine fremden Datensätze
// eingebettet — die Einträge und Texte bleiben handgeschrieben):
//  - RDAP (Registrierungsdaten / Inhaber-Organisation)
//  - DNS-CNAME-Kette (enttarnt getarntes „First-Party"-Tracking)
//  - TLS-Zertifikat (Organisation)
//  - Homepage (Titel + Beschreibung)
//  - DuckDuckGo Tracker Radar (offener Datensatz mit Betreiber-Zuordnung)
const dns = require('node:dns').promises;
const tls = require('node:tls');

const TIMEOUT = 8000;

const jfetch = async (url) => {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { 'user-agent': 'WebWatch-Kuratierung' } });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
};

const tfetch = async (url) => {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { 'user-agent': 'Mozilla/5.0 (WebWatch-Kuratierung)' } });
    if (!r.ok) return null;
    return await r.text();
  } catch (e) { return null; }
};

const cnames = async (host) => {
  const chain = [];
  let cur = host;
  for (let i = 0; i < 5; i++) {
    try {
      const c = await dns.resolveCname(cur);
      if (!c || !c.length) break;
      chain.push(c[0]);
      cur = c[0];
    } catch (e) { break; }
  }
  return chain;
};

const certOrg = (host) => new Promise((resolve) => {
  const sock = tls.connect({ host, port: 443, servername: host, timeout: TIMEOUT, rejectUnauthorized: false }, () => {
    const c = sock.getPeerCertificate();
    sock.destroy();
    resolve(c && c.subject ? (c.subject.O || null) : null);
  });
  sock.on('error', () => resolve(null));
  sock.on('timeout', () => { sock.destroy(); resolve(null); });
});

const rdap = async (domain) => {
  const j = await jfetch('https://rdap.org/domain/' + domain);
  if (!j) return null;
  const out = { registrar: null, org: null, name: null };
  for (const e of j.entities || []) {
    const roles = e.roles || [];
    const vc = e.vcardArray && e.vcardArray[1];
    const get = (k) => { const row = (vc || []).find((x) => x[0] === k); return row ? row[3] : null; };
    if (roles.includes('registrar')) out.registrar = get('fn');
    if (roles.includes('registrant')) { out.org = get('org') || get('fn'); out.name = get('fn'); }
  }
  return out;
};

const homepage = async (domain) => {
  const html = await tfetch('https://' + domain + '/') || await tfetch('https://www.' + domain + '/');
  if (!html) return null;
  const title = (/<title[^>]*>([^<]{1,200})/i.exec(html) || [])[1];
  const desc = (/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})/i.exec(html)
    || /<meta[^>]+content=["']([^"']{1,300})["'][^>]+name=["']description["']/i.exec(html) || [])[1];
  return { title: title && title.trim(), desc: desc && desc.trim() };
};

const trackerRadar = async (domain) => {
  for (const region of ['US', 'DE', 'GB', 'FR']) {
    const j = await jfetch(`https://raw.githubusercontent.com/duckduckgo/tracker-radar/main/domains/${region}/${domain}.json`);
    if (j) {
      return {
        owner: j.owner && (j.owner.displayName || j.owner.name),
        categories: j.categories,
        prevalence: j.prevalence,
        region,
      };
    }
  }
  return null;
};

(async () => {
  const domains = process.argv.slice(2);
  if (!domains.length) {
    console.error('Aufruf: node tools/research_domain.js <domain> [weitere …]');
    process.exit(1);
  }
  for (const domain of domains) {
    console.log('\n══ ' + domain + ' ' + '═'.repeat(Math.max(0, 60 - domain.length)));
    const [cn, wwwCn, cert, reg, home, radar] = await Promise.all([
      cnames(domain), cnames('www.' + domain), certOrg(domain), rdap(domain), homepage(domain), trackerRadar(domain),
    ]);
    if (cn.length || wwwCn.length) console.log('  CNAME:        ', [...cn, ...wwwCn].join(' → ') || '—');
    if (cert) console.log('  TLS-Zert-Org: ', cert);
    if (reg && (reg.org || reg.name || reg.registrar)) {
      console.log('  RDAP:         ', [reg.org, reg.name].filter(Boolean).join(' / ') || '(Inhaber verborgen)', reg.registrar ? `[Registrar: ${reg.registrar}]` : '');
    }
    if (home && (home.title || home.desc)) {
      console.log('  Homepage:     ', home.title || '');
      if (home.desc) console.log('                ', home.desc);
    }
    if (radar) {
      console.log('  TrackerRadar: ', radar.owner || '?', '| Kategorien:', (radar.categories || []).join(', ') || '—', '| Verbreitung:', radar.prevalence);
    }
    const owner = (radar && radar.owner) || (reg && reg.org) || cert || '?';
    console.log('\n  Vorschlag (prüfen, Kategorie wählen, deutschen Info-Text schreiben!):');
    console.log(`    E('${domain.split('.')[0]}', '${home && home.title ? home.title.split(/[|–-]/)[0].trim() : domain}', '${owner}', 'KATEGORIE',`);
    console.log(`      ['${domain}'],`);
    console.log(`      'BESCHREIBUNG'),`);
  }
})();
