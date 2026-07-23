'use strict';
// Feld-Erhebung: besucht echte Websites mit geladener Extension und sammelt
// alle Drittanbieter-Domains, die die Tracker-DB (noch) nicht kennt.
// Aufruf: node smoketest/crawl_unknown.js [ausgabe.json]
const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright');

const EXT = path.resolve(__dirname, '..', 'dist', 'chrome');
const OUT = process.argv[2] || path.join(__dirname, 'unknown_domains.json');

const SITES = [
  'https://www.spiegel.de/', 'https://www.bild.de/', 'https://www.focus.de/',
  'https://www.chip.de/', 'https://www.heise.de/', 'https://www.t-online.de/',
  'https://web.de/', 'https://www.otto.de/', 'https://www.zalando.de/',
  'https://www.ebay.de/', 'https://www.kicker.de/', 'https://www.wetter.com/',
  'https://www.mobile.de/', 'https://www.immobilienscout24.de/',
  'https://www.idealo.de/', 'https://www.gutefrage.net/', 'https://www.golem.de/',
  'https://www.computerbild.de/', 'https://edition.cnn.com/', 'https://www.theverge.com/',
];

(async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'datenspur-crawl-'));
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    channel: 'chromium',
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  let sw = ctx.serviceWorkers()[0];
  if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 15000 });

  // Aufwärmen: die allererste Navigation fällt in die Extension-Installation
  const warm = await ctx.newPage();
  await warm.goto('https://example.com/', { timeout: 30000 }).catch(() => {});
  await warm.waitForTimeout(1500);
  await warm.close();

  const unknown = new Map(); // base → {count, hosts:Set, sites:Set}
  const stats = [];

  for (const site of SITES) {
    const page = await ctx.newPage();
    let ok = true;
    try {
      await page.goto(site, { waitUntil: 'load', timeout: 45000 });
    } catch (e) { ok = false; }
    if (ok) {
      await page.waitForTimeout(5000);
      await page.evaluate(() => window.scrollTo(0, 1800)).catch(() => {});
      await page.waitForTimeout(3000);

      const siteHost = new URL(site).hostname.replace(/^www\./, '');
      const data = await sw.evaluate(async (needle) => {
        const tabs = await WW.store.listTabs();
        const t = tabs.find((x) => (x.pageHost || '').includes(needle));
        if (!t) return null;
        const tab = await WW.store.getTab(t.tabId);
        const out = { page: tab.pageHost, total: tab.requests.length, tp: 0, known: 0, unknown: [] };
        for (const r of tab.requests) {
          if (!r.tp) continue;
          out.tp++;
          if (r.entity) out.known++;
          else out.unknown.push({ base: r.base, host: r.host });
        }
        return out;
      }, siteHost);

      if (data) {
        stats.push({ site: data.page, total: data.total, tp: data.tp, known: data.known, unknown: data.tp - data.known });
        for (const u of data.unknown) {
          let e = unknown.get(u.base);
          if (!e) unknown.set(u.base, e = { count: 0, hosts: new Set(), sites: new Set() });
          e.count++;
          e.hosts.add(u.host);
          e.sites.add(data.page);
        }
        console.log(`${data.page}: ${data.total} Anfragen, ${data.tp} Drittanbieter, davon ${data.tp - data.known} unbekannt`);
      } else {
        console.log(`${site}: keine Daten im Store`);
      }
    } else {
      console.log(`${site}: Laden fehlgeschlagen`);
    }
    await page.close().catch(() => {});
  }
  await ctx.close().catch(() => {});

  const list = [...unknown.entries()]
    .map(([base, e]) => ({ base, count: e.count, sites: e.sites.size, hosts: [...e.hosts].slice(0, 5) }))
    .sort((a, b) => b.sites - a.sites || b.count - a.count);

  fs.writeFileSync(OUT, JSON.stringify({ erhoben: new Date().toISOString(), stats, unbekannt: list }, null, 2));
  console.log(`\n${list.length} unbekannte Basis-Domains → ${OUT}`);
  console.log('\nTop 40 (Seiten / Anfragen / Domain):');
  for (const u of list.slice(0, 40)) {
    console.log(`  ${String(u.sites).padStart(2)}  ${String(u.count).padStart(4)}  ${u.base}  (${u.hosts[0] || ''})`);
  }
})().catch((e) => { console.error('ABBRUCH:', e); process.exit(1); });
