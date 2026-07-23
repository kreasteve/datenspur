'use strict';
// Aggregation pro Tab (Firmen, Kategorien, Erkenntnisse) und die
// Ampel-Bewertung samt Klartext-Zusammenfassung.
globalThis.WW = globalThis.WW || {};

(() => {
  // Aggregiert die Anfrageliste eines Tabs zu Firmen-/Erkenntnis-Übersichten.
  WW.computeAgg = (tab) => {
    const agg = {
      total: 0, tp: 0, blocked: 0, cookiesSent: 0,
      entities: {},   // key → {key,name,owner,cat,known,count,cookies,maxSev,kinds,hosts}
      insights: {},   // kind → {kind,sev,label,count,sample,sampleHost}
      byCat: {},      // cat → Anzahl Entities
    };
    if (!tab || !tab.requests) return agg;

    for (const r of tab.requests) {
      agg.total++;
      if (r.err && /BLOCKED|NS_ERROR_ABORT/i.test(r.err)) agg.blocked++;
      if (!r.tp) continue;
      agg.tp++;
      if (r.cookieCount) agg.cookiesSent++;

      const key = r.entity ? r.entity.id : 'd:' + (r.base || r.host);
      let ent = agg.entities[key];
      if (!ent) {
        ent = agg.entities[key] = {
          key,
          known: !!r.entity,
          name: r.entity ? r.entity.name : (r.base || r.host),
          owner: r.entity ? r.entity.owner : null,
          cat: r.entity ? r.entity.cat : 'unknown',
          count: 0, cookies: 0, maxSev: 0, kinds: {}, hosts: {},
        };
      }
      ent.count++;
      if (r.cookieCount) ent.cookies++;
      if (Object.keys(ent.hosts).length < 8) ent.hosts[r.host] = true;

      for (const ins of r.insights || []) {
        ent.maxSev = Math.max(ent.maxSev, ins.sev);
        ent.kinds[ins.kind] = (ent.kinds[ins.kind] || 0) + 1;
        let g = agg.insights[ins.kind];
        if (!g) {
          g = agg.insights[ins.kind] = { kind: ins.kind, sev: ins.sev, label: ins.label, count: 0, sample: ins.detail, sampleHost: r.host };
        }
        g.count++;
        if (ins.sev > g.sev) { g.sev = ins.sev; g.label = ins.label; g.sample = ins.detail; g.sampleHost = r.host; }
      }
    }

    // Dienste, die demselben Anbieter wie die besuchte Seite gehören
    // (z. B. ytimg.com auf youtube.com): markieren und nicht als fremde
    // Kategorie werten — technisch Drittanbieter, faktisch derselbe Konzern.
    // Wichtig: nur für Infrastruktur-Kategorien! Werbung/Datenhandel/
    // Aufzeichnung bleiben auch beim selben Konzern voll gewertet.
    const SAME_OWNER_OK = new Set(['cdn', 'functional', 'social']);
    const pageEnt = (typeof WW.classifyHost === 'function' && tab.pageHost)
      ? WW.classifyHost(tab.pageHost) : null;

    for (const ent of Object.values(agg.entities)) {
      if (pageEnt && ent.known && (ent.key === pageEnt.id
          || (ent.owner && ent.owner === pageEnt.owner && SAME_OWNER_OK.has(ent.cat)))) {
        ent.sameOwner = true;
        continue;
      }
      agg.byCat[ent.cat] = (agg.byCat[ent.cat] || 0) + 1;
    }
    return agg;
  };

  const CAT_PLURAL = {
    advertising: ['Werbe-/Tracking-Dienst', 'Werbe-/Tracking-Dienste'],
    audience: ['Datenhändler', 'Datenhändler'],
    session: ['Sitzungsaufzeichner', 'Sitzungsaufzeichner'],
    analytics: ['Analysedienst', 'Analysedienste'],
    social: ['soziales Netzwerk', 'soziale Netzwerke'],
    marketing: ['Marketing-Dienst', 'Marketing-Dienste'],
    affiliate: ['Affiliate-Netzwerk', 'Affiliate-Netzwerke'],
    tagmanager: ['Tag-Manager', 'Tag-Manager'],
    errortracking: ['Überwachungsdienst', 'Überwachungsdienste'],
    cmp: ['Cookie-Banner-Dienst', 'Cookie-Banner-Dienste'],
    cdn: ['Infrastruktur-Dienst', 'Infrastruktur-Dienste'],
    functional: ['funktionaler Dienst', 'funktionale Dienste'],
    unknown: ['unbekannte Gegenstelle', 'unbekannte Gegenstellen'],
  };

  // Ampel: rot = eingriffstiefe Verfahren beobachtet, gelb = übliches
  // Tracking, grün = keine Auffälligkeiten.
  WW.scoreTab = (agg) => {
    const c = agg.byCat || {};
    const n = (k) => c[k] || 0;
    const ins = agg.insights || {};
    const entTotal = Object.keys(agg.entities || {}).length;

    let level = 'gruen';
    const reasons = [];

    if (ins['email'] || ins['email-hash']) { level = 'rot'; reasons.push('persönliche Daten (E-Mail) wurden übertragen'); }
    if (ins['fingerprint']) { level = 'rot'; reasons.push('ein Geräte-Fingerabdruck wurde übertragen'); }
    if (ins['geo']) { level = 'rot'; reasons.push('Standortdaten wurden übertragen'); }
    if (n('session') > 0) { level = 'rot'; reasons.push('das Verhalten auf der Seite wird aufgezeichnet'); }
    if (n('audience') > 0) { level = 'rot'; reasons.push('Datenhändler wurden kontaktiert'); }
    if (n('advertising') >= 4) { level = 'rot'; reasons.push('sehr viele Werbenetzwerke sind eingebunden'); }

    if (level !== 'rot') {
      if (n('advertising') > 0) { level = 'gelb'; reasons.push('Werbenetzwerke verfolgen den Besuch'); }
      else if (ins['id'] || ins['cookies'] || ins['sync']) { level = 'gelb'; reasons.push('Kennungen oder Cookies gingen an Dritte'); }
      else if (n('analytics') > 0) { level = 'gelb'; reasons.push('der Besuch wird statistisch ausgewertet'); }
      else if (n('unknown') >= 5) { level = 'gelb'; reasons.push('viele nicht zuordenbare Drittverbindungen'); }
    }

    // Zusammenfassungssatz
    let satz;
    if (entTotal === 0) {
      satz = 'Diese Seite hat keine Verbindungen zu fremden Servern aufgebaut — das ist heute selten.';
    } else {
      const parts = [];
      for (const cat of ['advertising', 'audience', 'session', 'analytics', 'social']) {
        const k = n(cat);
        if (k > 0) parts.push(`${k} ${CAT_PLURAL[cat][k === 1 ? 0 : 1]}`);
      }
      satz = `Diese Seite hat Verbindungen zu ${entTotal} ${entTotal === 1 ? 'fremden Stelle' : 'fremden Stellen'} aufgebaut`
        + (parts.length ? `, darunter ${parts.join(', ')}` : '') + '.';
      if (reasons.length) {
        satz += ' ' + reasons[0].charAt(0).toUpperCase() + reasons[0].slice(1) + '.';
      }
    }

    return { level, satz, reasons, entTotal };
  };

  // Farben: validierte Status-Palette (gut/warnend/kritisch)
  WW.LEVEL_INFO = {
    gruen: { titel: 'Unauffällig', farbe: '#0ca30c' },
    gelb: { titel: 'Übliches Tracking', farbe: '#fab219' },
    rot: { titel: 'Intensives Tracking', farbe: '#d03b3b' },
  };
})();
