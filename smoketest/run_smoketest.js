'use strict';
// End-zu-End-Smoketest: startet Chromium mit geladener WebWatch-Extension,
// besucht eine lokale Testseite, die echte Tracker-Endpunkte anspricht,
// und prüft Popup-Datenfluss + alle Dashboard-Ansichten.
// Aufruf: node smoketest/run_smoketest.js [screenshot-verzeichnis]
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright');

const EXT = path.resolve(__dirname, '..', 'dist', 'chrome');
const SHOT_DIR = process.argv[2] || path.join(__dirname, 'screenshots');
const PORT = 8899;

const TEST_PAGE = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>WebWatch Smoketest</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@300..900&display=swap">
</head><body>
<h1>WebWatch Smoketest-Seite</h1>
<img src="https://www.google-analytics.com/collect?v=1&tid=UA-1&cid=123456.789012&sr=1920x1080&dl=http%3A%2F%2Flocalhost%3A${PORT}%2F" width="1" height="1" alt="">
<script>
  fetch('https://www.google-analytics.com/g/collect?v=2&tid=G-TEST&cid=555.666&sid=111&sr=1920x1080&ul=de-de&dl='
    + encodeURIComponent(location.href), { method: 'POST', mode: 'no-cors', body: 'en=page_view&_p=1234567' }).catch(() => {});
  fetch('https://static.hotjar.com/c/hotjar-9999.js?sv=6', { mode: 'no-cors' }).catch(() => {});
  if (navigator.sendBeacon) navigator.sendBeacon('https://region1.google-analytics.com/g/collect?v=2&tid=G-TEST&cid=555.666', 'en=scroll');
</script>
</body></html>`;

let pass = 0;
let fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.error(`  FAIL ${name}${extra !== undefined ? ' — ' + String(extra).slice(0, 200) : ''}`); }
};

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(TEST_PAGE);
  }).listen(PORT);

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webwatch-smoke-'));
  const launchOpts = {
    headless: true,
    channel: 'chromium', // neues Headless — nötig, damit Extensions laufen
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  };
  let ctx;
  try {
    ctx = await chromium.launchPersistentContext(userDataDir, launchOpts);
  } catch (e) {
    console.log('Headless mit Extension fehlgeschlagen, versuche sichtbares Fenster …');
    ctx = await chromium.launchPersistentContext(userDataDir, { ...launchOpts, headless: false, channel: undefined });
  }

  try {
    // 1. Service Worker der Extension finden
    let sw = ctx.serviceWorkers()[0];
    if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 15000 });
    const extId = new URL(sw.url()).host;
    console.log('\nExtension geladen, ID:', extId);
    check('Service Worker läuft', sw.url().includes('background/sw.js'), sw.url());

    // 2. Testseite besuchen. Erster Aufruf direkt nach Browserstart kann
    // in die Extension-Installation fallen (Anfragen gehen verloren) —
    // deshalb wie in der echten Nutzung: einmal neu laden. Danach muss
    // ausnahmslos alles erfasst sein, inklusive main_frame und Stylesheet.
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(3500); // Anfragen + Flush (600 ms Drossel) abwarten

    // 3. Hintergrund-Zustand direkt im Service Worker prüfen
    const tabs = await sw.evaluate(() => WW.store.listTabs());
    const testTab = tabs.find((t) => (t.pageUrl || '').includes('localhost:' + 8899));
    check('Hintergrund hat Testseite erfasst', !!testTab, JSON.stringify(tabs));
    if (!testTab) throw new Error('Testseite nicht im Store — Abbruch');
    check('mehrere Anfragen erfasst', testTab.requests >= 4, testTab.requests);

    const summary = await sw.evaluate(async (tabId) => {
      const tab = await WW.store.getTab(tabId);
      const agg = WW.computeAgg(tab);
      return {
        score: WW.scoreTab(agg),
        entities: Object.keys(agg.entities),
        insights: Object.keys(agg.insights),
        types: [...new Set(tab.requests.map((r) => r.type))],
      };
    }, testTab.tabId);
    check('main_frame nach Neuladen erfasst', summary.types.includes('main_frame'), summary.types);
    check('Stylesheet nach Neuladen erfasst', summary.types.includes('stylesheet'), summary.types);
    console.log('  Auswertung:', JSON.stringify(summary));
    check('Google Analytics erkannt', summary.entities.includes('google-analytics'), summary.entities);
    check('Google Fonts erkannt', summary.entities.includes('google-fonts'), summary.entities);
    check('Hotjar erkannt', summary.entities.includes('hotjar'), summary.entities);
    check('Ampel rot (Session-Recorder)', summary.score.level === 'rot', summary.score.level);
    check('Kennung-Insight vorhanden', summary.insights.includes('id'), summary.insights);
    check('Bildschirm-Insight vorhanden', summary.insights.includes('screen'), summary.insights);
    check('KEIN E-Mail-Fehlalarm (wght@300..900)', !summary.insights.includes('email'), summary.insights);

    // 4. Dashboard öffnen und alle Ansichten prüfen
    const dash = await ctx.newPage();
    await dash.goto(`chrome-extension://${extId}/dashboard/dashboard.html?tab=${testTab.tabId}`);
    await dash.waitForSelector('.hero', { timeout: 10000 });

    const pickerDisplay = await dash.$eval('#picker', (el) => getComputedStyle(el).display);
    check('Picker-Overlay ist versteckt', pickerDisplay === 'none', pickerDisplay);
    const satz = await dash.$eval('.hero p', (el) => el.textContent);
    check('Zusammenfassungssatz vorhanden', /fremden Stellen/.test(satz), satz);
    check('Erkenntnis-Karten vorhanden', (await dash.$$('.ins')).length >= 2);
    await dash.screenshot({ path: path.join(SHOT_DIR, '1-uebersicht.png'), fullPage: true });

    await dash.click('.views button[data-view="anfragen"]');
    await dash.waitForSelector('table.req tbody tr');
    const rows = await dash.$$('table.req tbody tr');
    check('Anfragenliste gefüllt', rows.length >= 4, rows.length);
    const headers = await dash.$$eval('table.req th', (ths) => ths.map((t) => t.textContent));
    check('„Was passiert"-Spalte (Einfach-Modus)', headers.includes('Was passiert'), headers);
    check('Erstanbieter sichtbar (Default-Filter aus)', await dash.$$eval('td.firstparty', (t) => t.length) > 0);
    check('Kopier-Button auch im Einfach-Modus', !!(await dash.$('#btn-copy')));
    await dash.click('#btn-copy');
    await dash.waitForTimeout(400);
    const copyLabel = await dash.$eval('#btn-copy', (b) => b.textContent);
    check('Auswertung wurde kopiert', copyLabel.includes('Kopiert'), copyLabel);
    await rows[1].click();
    await dash.waitForSelector('#detail .card');
    check('Detailansicht öffnet sich', !!(await dash.$('#detail .card')));
    await dash.screenshot({ path: path.join(SHOT_DIR, '2-anfragen.png'), fullPage: true });

    await dash.click('.views button[data-view="netzwerk"]');
    await dash.waitForSelector('#view-netzwerk svg');
    const nodeCount = (await dash.$$('#view-netzwerk g.node')).length;
    check('Netzwerk-Graph hat Knoten', nodeCount >= 3, nodeCount);
    const svgText = await dash.$eval('#view-netzwerk', (el) => el.textContent);
    check('eigene Seite im Graph', svgText.includes('eigene Seite'), '');
    await dash.screenshot({ path: path.join(SHOT_DIR, '3-netzwerk.png'), fullPage: true });

    await dash.click('.views button[data-view="lexikon"]');
    await dash.waitForSelector('.glos dt');
    check('Lexikon/Glossar gerendert', (await dash.$$('.glos dt')).length >= 10);

    // Profi-Modus: Rohdaten sichtbar
    await dash.click('#mode-profi');
    await dash.click('.views button[data-view="anfragen"]');
    await dash.waitForSelector('table.req tbody tr');
    const profiHeaders = await dash.$$eval('table.req th', (ths) => ths.map((t) => t.textContent));
    check('Profi-Modus zeigt Rohspalten', profiHeaders.includes('Methode'), profiHeaders);
    check('Export-Button im Profi-Modus', !!(await dash.$('#btn-export')));
  } finally {
    await ctx.close().catch(() => {});
    server.close();
  }

  console.log(`\n${pass} Prüfungen bestanden, ${fail} fehlgeschlagen.`);
  console.log('Screenshots:', SHOT_DIR);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ABBRUCH:', e); process.exit(1); });
