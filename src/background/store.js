'use strict';
// Pro-Tab-Speicher für erfasste Anfragen.
// In-Memory mit optionaler Persistenz in storage.session — wichtig für
// Chrome (MV3), wo der Service Worker jederzeit beendet werden kann.
globalThis.WW = globalThis.WW || {};

(() => {
  const B = WW.B;
  const MAX_REQ = 600;      // Obergrenze pro Tab; Älteste fliegen raus
  const DROP_CHUNK = 100;
  const FLUSH_MS = 600;

  const tabs = new Map();       // tabId → tabData
  const flushTimers = new Map();
  const session = B && B.storage && B.storage.session ? B.storage.session : null;

  const mkTab = (tabId, url) => {
    const host = url ? WW.domain.getHost(url) : '';
    return {
      tabId,
      pageUrl: url || '',
      pageHost: host,
      pageBase: host ? WW.domain.getBaseDomain(host) : '',
      startedAt: Date.now(),
      requests: [],
      dropped: 0,
      ver: 0,
    };
  };

  // Meta nachtragen (z. B. nach Service-Worker-Neustart mitten auf einer
  // Seite) und Erst-/Drittanbieter-Einstufung der bisherigen Anfragen
  // korrigieren.
  const refreshMeta = (tab, url) => {
    const host = WW.domain.getHost(url);
    if (!host || host === tab.pageHost) return;
    tab.pageUrl = url;
    tab.pageHost = host;
    tab.pageBase = WW.domain.getBaseDomain(host);
    const page = { url: tab.pageUrl, base: tab.pageBase };
    for (const r of tab.requests) {
      r.tp = WW.domain.isThirdParty(r.host, tab.pageBase);
      r.insights = WW.analyzeRequest(r, page);
    }
    tab.ver++;
  };

  const store = {
    // Von main.js gesetzt: wird nach (gedrosseltem) Flush aufgerufen,
    // aktualisiert Badge und benachrichtigt offene UI-Seiten.
    onFlush: null,

    getOrCreateTab(tabId, urlGuess) {
      let tab = tabs.get(tabId);
      if (!tab) {
        tab = mkTab(tabId, urlGuess || '');
        tabs.set(tabId, tab);
        // Chrome-MV3: Wenn der Service Worker von einer Unterressource
        // geweckt wurde, liegt die bisherige Historie noch in
        // storage.session → asynchron wieder einspielen, statt sie beim
        // nächsten Flush mit dem leeren Tab zu überschreiben.
        if (session) {
          tab._hydrating = true;
          session.get('tab:' + tabId).then((obj) => {
            const saved = obj && obj['tab:' + tabId];
            const cur = tabs.get(tabId);
            // Nur mergen, wenn der Tab inzwischen nicht durch eine neue
            // Navigation (resetTab) ersetzt wurde und die Seite passt.
            if (saved && saved.requests && cur === tab
                && (!cur.pageBase || !saved.pageBase || saved.pageBase === cur.pageBase)) {
              cur.requests = saved.requests.concat(cur.requests).slice(-MAX_REQ);
              cur.dropped = saved.dropped || 0;
              cur.startedAt = saved.startedAt || cur.startedAt;
              if (!cur.pageUrl && saved.pageUrl) {
                cur.pageUrl = saved.pageUrl;
                cur.pageHost = saved.pageHost;
                cur.pageBase = saved.pageBase;
              }
              cur.ver++;
            }
            delete tab._hydrating;
            this.flush(tabId);
          }).catch(() => { delete tab._hydrating; });
        }
        // Seite unbekannt (Neustart mitten in einer Sitzung) → echte
        // Tab-URL asynchron nachschlagen.
        if (!urlGuess && B && B.tabs && B.tabs.get) {
          Promise.resolve(B.tabs.get(tabId))
            .then((t) => { if (t && t.url) { refreshMeta(tab, t.url); this.flush(tabId); } })
            .catch(() => {});
        }
      }
      return tab;
    },

    resetTab(tabId, url) {
      tabs.set(tabId, mkTab(tabId, url));
      this.flush(tabId);
    },

    addRequest(tabId, rec) {
      const tab = this.getOrCreateTab(tabId);
      tab.requests.push(rec);
      if (tab.requests.length > MAX_REQ) {
        tab.requests.splice(0, DROP_CHUNK);
        tab.dropped += DROP_CHUNK;
      }
      tab.ver++;
      this.flush(tabId);
    },

    touch(tabId) {
      const tab = tabs.get(tabId);
      if (tab) { tab.ver++; this.flush(tabId); }
    },

    async getTab(tabId) {
      let tab = tabs.get(tabId);
      if (!tab && session) {
        // Chrome: Service Worker wurde neu gestartet → aus storage.session laden
        try {
          const obj = await session.get('tab:' + tabId);
          if (obj && obj['tab:' + tabId]) {
            tab = obj['tab:' + tabId];
            tabs.set(tabId, tab);
          }
        } catch (e) { /* Persistenz ist optional */ }
      }
      return tab || null;
    },

    // Auch persistierte Tabs auflisten — nach einem Service-Worker-Neustart
    // ist die In-Memory-Map sonst leer, obwohl Daten vorliegen.
    async listTabs() {
      const out = new Map();
      for (const t of tabs.values()) {
        out.set(t.tabId, {
          tabId: t.tabId, pageUrl: t.pageUrl, pageHost: t.pageHost,
          requests: t.requests.length, startedAt: t.startedAt,
        });
      }
      if (session) {
        try {
          const all = await session.get(null);
          for (const [k, v] of Object.entries(all || {})) {
            if (!k.startsWith('tab:') || !v || out.has(v.tabId)) continue;
            out.set(v.tabId, {
              tabId: v.tabId, pageUrl: v.pageUrl, pageHost: v.pageHost,
              requests: (v.requests || []).length, startedAt: v.startedAt,
            });
          }
        } catch (e) { /* Persistenz optional */ }
      }
      return [...out.values()];
    },

    removeTab(tabId) {
      tabs.delete(tabId);
      const timer = flushTimers.get(tabId);
      if (timer) { clearTimeout(timer); flushTimers.delete(tabId); }
      if (session) session.remove('tab:' + tabId).catch(() => {});
    },

    // Gedrosselt: persistieren + Badge/UI aktualisieren
    flush(tabId) {
      if (flushTimers.has(tabId)) return;
      flushTimers.set(tabId, setTimeout(() => {
        flushTimers.delete(tabId);
        const tab = tabs.get(tabId);
        if (!tab) return;
        // Während der Rehydrierung nicht persistieren — sonst würde der
        // noch leere Tab die gespeicherte Historie überschreiben.
        if (session && !tab._hydrating) {
          session.set({ ['tab:' + tabId]: tab }).catch(() => {});
        }
        if (typeof store.onFlush === 'function') {
          try { store.onFlush(tabId, tab); } catch (e) { /* UI-Fehler nicht eskalieren */ }
        }
      }, FLUSH_MS));
    },
  };

  WW.store = store;
})();
