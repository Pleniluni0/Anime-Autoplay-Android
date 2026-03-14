// Anime AutoPlay — player.js (Firefox)
// Usa DOMParser en lugar de innerHTML para cumplir políticas de AMO

(function () {
  'use strict';

  if (window.self === window.top) return;

  const ext = typeof browser !== 'undefined' ? browser : chrome;

  let S = {
    autoplay: true, countdownSeconds: 5, skipBeforeEnd: 0,
    introSkip: false, introAuto: false, introFrom: 0, introTo: 90,
    nextLabel: 'Episodio siguiente',
  };

  let earlyFired    = false;
  let introSkipDone = false;
  let countdownTimer  = null;
  let countdownActive = false;
  let wrapperEl = null;
  let cdEl      = null;
  let skipBtnEl = null;
  let skipBtnInterval = null;

  // ── Settings ────────────────────────────────────────────────────────────────
  window.addEventListener('message', (e) => {
    if (!e.data || e.data._aap !== true) return;
    if (e.data.type === 'SETTINGS') S = { ...S, ...e.data.payload };
  });
  function ask() {
    try { window.parent.postMessage({ _aap: true, type: 'GET_SETTINGS' }, '*'); } catch (_) {}
  }
  ask(); setTimeout(ask, 1500);

  function notify(type) {
    try { window.parent.postMessage({ _aap: true, type }, '*'); } catch (_) {}
    try { window.top.postMessage({ _aap: true, type }, '*'); } catch (_) {}
  }

  // ── Wrapper ─────────────────────────────────────────────────────────────────
  function getRoot() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.body;
  }
  function getWrapper() {
    const root = getRoot();
    if (wrapperEl && root.contains(wrapperEl)) return wrapperEl;
    if (wrapperEl) wrapperEl.remove();
    wrapperEl = document.createElement('div');
    wrapperEl.id = '_aap_wrapper';
    wrapperEl.style.cssText = 'position:absolute!important;inset:0!important;pointer-events:none!important;z-index:2147483640!important;overflow:visible!important;';
    if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
    root.appendChild(wrapperEl);
    return wrapperEl;
  }
  document.addEventListener('fullscreenchange', relocate);
  document.addEventListener('webkitfullscreenchange', relocate);
  function relocate() {
    if (wrapperEl) { wrapperEl.remove(); wrapperEl = null; }
    const w = getWrapper();
    if (cdEl)      w.appendChild(cdEl);
    if (skipBtnEl) w.appendChild(skipBtnEl);
  }

  // ── Utilidad: construir Shadow DOM con DOMParser (sin innerHTML) ─────────────
  // DOMParser crea un documento separado — Mozilla no lo marca como unsafe.
  function buildShadow(host, cssText, htmlText) {
    const sh = host.attachShadow({ mode: 'open' });
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      `<!DOCTYPE html><html><head><style>${cssText}</style></head><body>${htmlText}</body></html>`,
      'text/html'
    );
    // Adoptar los nodos al documento actual
    const style = document.adoptNode(doc.head.querySelector('style'));
    sh.appendChild(style);
    Array.from(doc.body.childNodes).forEach(node => {
      sh.appendChild(document.adoptNode(node));
    });
    return sh;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // COUNTDOWN
  // ══════════════════════════════════════════════════════════════════════════════
  const CD_CSS = `
    * { box-sizing:border-box; margin:0; padding:0; }
    #card { background:rgba(8,10,18,0.97); border:1px solid rgba(0,188,164,0.35); border-radius:14px; padding:18px 22px 16px; display:flex; flex-direction:column; align-items:center; gap:10px; min-width:210px; box-shadow:0 8px 40px rgba(0,0,0,0.7); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    #lbl { font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.38); font-weight:700; }
    #wrap { position:relative; width:60px; height:60px; display:flex; align-items:center; justify-content:center; }
    svg { position:absolute; top:0; left:0; width:60px; height:60px; transform:rotate(-90deg); }
    .rb { fill:none; stroke:rgba(255,255,255,0.08); stroke-width:3; }
    .rf { fill:none; stroke:#00BCA4; stroke-width:3; stroke-linecap:round; transition:stroke-dashoffset 0.9s linear; }
    #num { font-size:22px; font-weight:800; color:#fff; position:relative; z-index:1; line-height:1; }
    #ttl { font-size:12px; font-weight:600; color:rgba(255,255,255,0.78); text-align:center; max-width:170px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #btns { display:flex; gap:8px; margin-top:3px; }
    button { border:none; border-radius:7px; font-size:11px; font-weight:700; cursor:pointer; padding:7px 14px; transition:all 0.15s; font-family:inherit; letter-spacing:0.02em; pointer-events:all; }
    #no  { background:rgba(255,255,255,0.09); color:rgba(255,255,255,0.55); }
    #no:hover  { background:rgba(255,255,255,0.16); color:#fff; }
    #yes { background:#00BCA4; color:#061212; }
    #yes:hover { background:#00d4b8; }
  `;

  function buildCountdown() {
    if (cdEl) return;
    const circ = 2 * Math.PI * 25;

    cdEl = document.createElement('div');
    cdEl.id = '_aap_cd';
    cdEl.style.cssText = 'position:absolute!important;bottom:80px!important;right:20px!important;z-index:2147483647!important;opacity:0!important;transform:translateY(14px) scale(0.96)!important;transition:opacity 0.3s ease,transform 0.3s ease!important;pointer-events:none!important;';
    getWrapper().appendChild(cdEl);

    // HTML estático del countdown — sin datos de usuario, seguro para DOMParser
    const CD_HTML = `
      <div id="card">
        <div id="lbl">Siguiente episodio en</div>
        <div id="wrap">
          <svg viewBox="0 0 60 60">
            <circle class="rb" cx="30" cy="30" r="25"/>
            <circle class="rf" cx="30" cy="30" r="25" id="ring"/>
          </svg>
          <span id="num">5</span>
        </div>
        <div id="ttl">Episodio siguiente</div>
        <div id="btns">
          <button id="no">Cancelar</button>
          <button id="yes">&#9654; Ver ahora</button>
        </div>
      </div>
    `;

    const sh = buildShadow(cdEl, CD_CSS, CD_HTML);

    // Aplicar valor dinámico de forma segura (atributo, no innerHTML)
    const ring = sh.getElementById('ring');
    if (ring) {
      ring.setAttribute('style', `stroke-dasharray:${circ};stroke-dashoffset:0`);
    }

    sh.getElementById('no').onclick  = () => { stopCountdown(); notify('CANCELLED'); };
    sh.getElementById('yes').onclick = () => { stopCountdown(); notify('PLAY_NOW'); };
    cdEl._sh = sh;
  }

  function showCountdown() {
    buildCountdown();
    // textContent es seguro — actualiza solo texto, sin HTML
    cdEl._sh.getElementById('ttl').textContent = S.nextLabel || 'Episodio siguiente';
    cdEl.getBoundingClientRect();
    cdEl.style.setProperty('opacity', '1', 'important');
    cdEl.style.setProperty('transform', 'translateY(0) scale(1)', 'important');
    cdEl.style.setProperty('pointer-events', 'all', 'important');
    countdownActive = true;
  }

  function hideCountdown() {
    if (cdEl) {
      cdEl.style.setProperty('opacity', '0', 'important');
      cdEl.style.setProperty('transform', 'translateY(14px) scale(0.96)', 'important');
      cdEl.style.setProperty('pointer-events', 'none', 'important');
    }
    countdownActive = false;
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  }

  function stopCountdown() { hideCountdown(); }

  function tickCountdown(secs) {
    if (!cdEl?._sh) return;
    cdEl._sh.getElementById('num').textContent = String(secs);
    const ring = cdEl._sh.getElementById('ring');
    if (ring) {
      const circ = 2 * Math.PI * 25;
      ring.style.strokeDashoffset = String(circ - (secs / Math.max(S.countdownSeconds, 1)) * circ);
    }
  }

  function startCountdown() {
    if (!S.autoplay || countdownActive) return;
    notify('STARTING');
    let secs = S.countdownSeconds;
    showCountdown(); tickCountdown(secs);
    countdownTimer = setInterval(() => {
      secs--;
      if (secs <= 0) { clearInterval(countdownTimer); countdownTimer = null; hideCountdown(); notify('PLAY_NOW'); }
      else tickCountdown(secs);
    }, 1000);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // INTRO SKIP
  // ══════════════════════════════════════════════════════════════════════════════
  const SKIP_CSS = `
    button { background:rgba(8,10,18,0.92); border:2px solid rgba(0,188,164,0.6); border-radius:10px; color:#00BCA4; font-size:15px; font-weight:800; padding:11px 22px; cursor:pointer; font-family:-apple-system,'Segoe UI',sans-serif; letter-spacing:0.04em; transition:all 0.15s; white-space:nowrap; box-shadow:0 4px 20px rgba(0,0,0,0.5),0 0 12px rgba(0,188,164,0.2); pointer-events:all; }
    button:hover { background:#00BCA4; color:#061212; box-shadow:0 4px 24px rgba(0,188,164,0.4); transform:scale(1.04); }
  `;
  const SKIP_HTML = `<button id="btn">&#9193; Saltar intro</button>`;

  function buildSkipBtn(video) {
    if (skipBtnEl) return;
    skipBtnEl = document.createElement('div');
    skipBtnEl.id = '_aap_skip';
    skipBtnEl.style.cssText = 'position:absolute!important;bottom:80px!important;right:20px!important;z-index:2147483646!important;pointer-events:all!important;';
    getWrapper().appendChild(skipBtnEl);

    const sh = buildShadow(skipBtnEl, SKIP_CSS, SKIP_HTML);
    sh.getElementById('btn').onclick = () => doIntroSkip(video);
    skipBtnEl._sh = sh;

    const hideAt = S.introTo + 2;
    skipBtnInterval = setInterval(() => {
      if (!video || video.currentTime >= hideAt) hideSkipBtn();
    }, 300);
  }

  function hideSkipBtn() {
    if (skipBtnInterval) { clearInterval(skipBtnInterval); skipBtnInterval = null; }
    if (skipBtnEl) { skipBtnEl.remove(); skipBtnEl = null; }
  }

  function doIntroSkip(video) {
    introSkipDone = true;
    hideSkipBtn();
    const wasPlaying = !video.paused;
    video.currentTime = S.introTo;
    if (wasPlaying) {
      const resume = () => { video.play().catch(() => {}); video.removeEventListener('seeked', resume); };
      video.addEventListener('seeked', resume);
      setTimeout(() => { if (video.paused) video.play().catch(() => {}); }, 250);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ATTACH VIDEO
  // ══════════════════════════════════════════════════════════════════════════════
  function attach(v) {
    if (v._aap) return;
    v._aap = true;

    v.addEventListener('loadedmetadata', () => {
      earlyFired = false; introSkipDone = false;
      hideSkipBtn(); hideCountdown();
    });

    v.addEventListener('ended', () => {
      hideSkipBtn();
      if (S.autoplay) setTimeout(startCountdown, 500);
    });

    v.addEventListener('timeupdate', () => {
      const t = v.currentTime, dur = v.duration;

      if (S.introSkip && !introSkipDone && S.introTo > S.introFrom && S.introFrom >= 0) {
        if (t >= S.introFrom && t < S.introTo) {
          S.introAuto ? doIntroSkip(v) : buildSkipBtn(v);
        } else if (skipBtnEl) hideSkipBtn();
      }

      const skip = S.skipBeforeEnd || 0;
      if (!S.autoplay || earlyFired || countdownActive || skip <= 0 || !dur || dur < 30) return;
      const rem = dur - t;
      if (rem > 0 && rem <= skip) {
        earlyFired = true;
        v.addEventListener('seeking', () => { earlyFired = false; }, { once: true });
        startCountdown();
      }
    });
  }

  function scan() { document.querySelectorAll('video').forEach(attach); }
  scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(scan, 2000);
})();
