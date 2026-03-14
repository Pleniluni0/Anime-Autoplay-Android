// Anime AutoPlay — main.js (Firefox)
// Usa browser.* API con promesas

(function () {
  'use strict';

  if (window.self !== window.top) return;

  // Firefox usa browser.*, Chrome usa chrome.*
  const ext = typeof browser !== 'undefined' ? browser : chrome;

  let settings = { autoplay: true, countdownSeconds: 5, skipBeforeEnd: 0, introSkip: false, introAuto: false, introFrom: 0, introTo: 90 };

  const HOST = window.location.hostname;
  const IS_ANIMEAV1 = HOST.includes('animeav1.com');
  const IS_ANIMEFLV = HOST.includes('animeflv.net');

  // ── Settings ──────────────────────────────────────────────────────────────
  function loadSettings(cb) {
    const defaults = { autoplay: true, countdownSeconds: 5, skipBeforeEnd: 0, introSkip: false, introAuto: false, introFrom: 0, introTo: 90 };
    const p = ext.storage.sync.get(defaults);
    // Firefox devuelve promesa, Chrome usa callback — manejar ambos
    if (p && typeof p.then === 'function') {
      p.then(d => { settings = d; if (cb) cb(); });
    } else {
      // fallback callback style
      ext.storage.sync.get(defaults, d => { settings = d; if (cb) cb(); });
    }
  }

  ext.storage.onChanged.addListener((c) => {
    if (c.autoplay)         settings.autoplay         = c.autoplay.newValue;
    if (c.countdownSeconds) settings.countdownSeconds = c.countdownSeconds.newValue;
    if (c.skipBeforeEnd)    settings.skipBeforeEnd    = c.skipBeforeEnd.newValue;
    if (c.introSkip)        settings.introSkip        = c.introSkip.newValue;
    if (c.introAuto)        settings.introAuto        = c.introAuto.newValue;
    if (c.introFrom !== undefined) settings.introFrom = c.introFrom.newValue;
    if (c.introTo   !== undefined) settings.introTo   = c.introTo.newValue;
    pushSettings();
  });

  // ── Navegación AnimeAV1 ───────────────────────────────────────────────────
  function av1_getNextUrl() {
    const btn = document.querySelector('a[aria-label="Siguiente"]');
    if (btn?.href) return btn.href;
    const sel = document.getElementById('selected-episode') || document.querySelector('a.on[href*="/media/"]');
    if (sel?.parentElement?.parentElement) {
      const kids = Array.from(sel.parentElement.parentElement.children);
      const i = kids.indexOf(sel.parentElement);
      if (i >= 0 && i < kids.length - 1) { const a = kids[i+1].querySelector('a'); if (a?.href) return a.href; }
    }
    const m = window.location.pathname.match(/^(.*\/)(\d+)\/?$/);
    if (m) return window.location.origin + m[1] + (parseInt(m[2]) + 1);
    return null;
  }

  function av1_getNextLabel() {
    const sel = document.getElementById('selected-episode') || document.querySelector('a.on[href*="/media/"]');
    if (sel?.parentElement?.parentElement) {
      const kids = Array.from(sel.parentElement.parentElement.children);
      const i = kids.indexOf(sel.parentElement);
      if (i >= 0 && i < kids.length - 1) { const num = kids[i+1].querySelector('a')?.textContent.trim(); if (num) return 'Episodio ' + num; }
    }
    return 'Episodio siguiente';
  }

  // ── Navegación AnimeFLV ───────────────────────────────────────────────────
  function flv_getNextUrl() {
    const btn = document.querySelector('a.CapNvNx, a[href*="/ver/"][class*="Nx"]');
    if (btn?.href) return btn.href;
    const m = window.location.pathname.match(/^(.*-)(\d+)\/?$/);
    if (m) return window.location.origin + m[1] + (parseInt(m[2]) + 1);
    return null;
  }

  function flv_getNextLabel() {
    const btn = document.querySelector('a.CapNvNx, a[href*="/ver/"][class*="Nx"]');
    if (btn?.href) { const m = btn.href.match(/-(\d+)\/?$/); if (m) return 'Episodio ' + m[1]; }
    const curr = document.querySelector('h2.SubTitle, .SubTitle');
    if (curr) { const m2 = curr.textContent.match(/(\d+)/); if (m2) return 'Episodio ' + (parseInt(m2[1]) + 1); }
    return 'Episodio siguiente';
  }

  function getNextUrl()   { return IS_ANIMEAV1 ? av1_getNextUrl()   : IS_ANIMEFLV ? flv_getNextUrl()   : null; }
  function getNextLabel() { return IS_ANIMEAV1 ? av1_getNextLabel() : IS_ANIMEFLV ? flv_getNextLabel() : 'Episodio siguiente'; }

  // ── Push settings a iframes ───────────────────────────────────────────────
  function pushSettings() {
    const payload = { ...settings, nextLabel: getNextLabel() };
    document.querySelectorAll('iframe').forEach(f => {
      try { f.contentWindow.postMessage({ _aap: true, type: 'SETTINGS', payload }, '*'); } catch (_) {}
    });
  }

  // ── Mensajes del iframe ───────────────────────────────────────────────────
  window.addEventListener('message', (e) => {
    if (!e.data || e.data._aap !== true) return;
    if (e.data.type === 'GET_SETTINGS') pushSettings();
    if (e.data.type === 'STARTING')     pushSettings();
    if (e.data.type === 'PLAY_NOW') {
      const url = getNextUrl();
      if (url) window.location.href = url;
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  loadSettings(() => {
    pushSettings();
    [500, 1500, 3000, 5000].forEach(ms => setTimeout(pushSettings, ms));
  });

  const obs = new MutationObserver(() => {
    const found = IS_ANIMEAV1
      ? (document.getElementById('selected-episode') || document.querySelector('a.on[href*="/media/"]'))
      : document.querySelector('a.CapNvNx');
    if (found) { pushSettings(); obs.disconnect(); }
  });
  obs.observe(document.body, { childList: true, subtree: true });

})();
