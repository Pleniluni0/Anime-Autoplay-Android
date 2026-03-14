// popup.js — Anime AutoPlay (Firefox)
// Usa browser.* con promesas, con fallback a chrome.* callbacks

const ext = typeof browser !== 'undefined' ? browser : chrome;

const autoplayToggle   = document.getElementById('autoplay-toggle');
const countdownSlider  = document.getElementById('countdown-slider');
const countdownDisplay = document.getElementById('countdown-display');
const skipSlider       = document.getElementById('skip-slider');
const skipDisplay      = document.getElementById('skip-display');
const skipPreview      = document.getElementById('skip-preview');
const introToggle      = document.getElementById('intro-toggle');
const introBody        = document.getElementById('intro-body');
const pillManual       = document.getElementById('pill-manual');
const pillAuto         = document.getElementById('pill-auto');
const introFrom        = document.getElementById('intro-from');
const introTo          = document.getElementById('intro-to');
const introPreview     = document.getElementById('intro-preview');
const statusText       = document.getElementById('status-text');
const sectionCountdown = document.getElementById('section-countdown');
const sectionSkip      = document.getElementById('section-skip');

// ── Time helpers ──────────────────────────────────────────────────────────────
function parseTime(str) {
  str = (str || '').trim();
  if (!str) return null;
  const parts = str.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}
function formatTime(secs) {
  if (secs == null || isNaN(secs)) return '';
  secs = Math.round(secs);
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

// ── Load ──────────────────────────────────────────────────────────────────────
const defaults = { autoplay:true, countdownSeconds:5, skipBeforeEnd:0, introSkip:false, introAuto:false, introFrom:0, introTo:90 };

function applySettings(d) {
  autoplayToggle.checked       = d.autoplay;
  countdownSlider.value        = d.countdownSeconds;
  countdownDisplay.textContent = d.countdownSeconds;
  skipSlider.value             = d.skipBeforeEnd;
  skipDisplay.textContent      = d.skipBeforeEnd;
  introToggle.checked          = d.introSkip;
  introFrom.value              = formatTime(d.introFrom);
  introTo.value                = formatTime(d.introTo);
  setIntroPillMode(d.introAuto);
  updateSkipPreview(d.skipBeforeEnd);
  updateIntroBodyState(d.introSkip);
  updateIntroPreview();
  updateSectionsState(d.autoplay);
  updateStatus(d.autoplay);
}

const p = ext.storage.sync.get(defaults);
if (p && typeof p.then === 'function') {
  p.then(applySettings);
} else {
  ext.storage.sync.get(defaults, applySettings);
}

// ── Helpers para guardar ──────────────────────────────────────────────────────
function save(obj) {
  const p = ext.storage.sync.set(obj);
  if (p && typeof p.catch === 'function') p.catch(() => {});
}

// ── Eventos ───────────────────────────────────────────────────────────────────
autoplayToggle.addEventListener('change', () => {
  save({ autoplay: autoplayToggle.checked });
  updateSectionsState(autoplayToggle.checked);
  updateStatus(autoplayToggle.checked);
});

countdownSlider.addEventListener('input', () => {
  const v = parseInt(countdownSlider.value);
  countdownDisplay.textContent = v;
  save({ countdownSeconds: v });
});

skipSlider.addEventListener('input', () => {
  const v = parseInt(skipSlider.value);
  skipDisplay.textContent = v;
  save({ skipBeforeEnd: v });
  updateSkipPreview(v);
});

introToggle.addEventListener('change', () => {
  save({ introSkip: introToggle.checked });
  updateIntroBodyState(introToggle.checked);
});

let introAutoMode = false;
function setIntroPillMode(auto) {
  introAutoMode = auto;
  pillManual.classList.toggle('active', !auto);
  pillAuto.classList.toggle('active', auto);
}
pillManual.addEventListener('click', () => { setIntroPillMode(false); save({ introAuto: false }); updateIntroPreview(); });
pillAuto.addEventListener('click',   () => { setIntroPillMode(true);  save({ introAuto: true  }); updateIntroPreview(); });

function saveIntroTimes() {
  const from = parseTime(introFrom.value), to = parseTime(introTo.value);
  const valid = from !== null && to !== null && to > from;
  introFrom.classList.toggle('valid', from !== null && from >= 0);
  introFrom.classList.toggle('error', !valid && introFrom.value.trim() !== '');
  introTo.classList.toggle('valid', valid);
  introTo.classList.toggle('error', introTo.value.trim() !== '' && !valid);
  if (valid) save({ introFrom: from, introTo: to });
  updateIntroPreview();
}
introFrom.addEventListener('input', saveIntroTimes);
introTo.addEventListener('input',   saveIntroTimes);
introFrom.addEventListener('blur', () => { const v = parseTime(introFrom.value); if (v !== null) introFrom.value = formatTime(v); });
introTo.addEventListener('blur',   () => { const v = parseTime(introTo.value);   if (v !== null) introTo.value   = formatTime(v); });

// ── UI helpers ────────────────────────────────────────────────────────────────
function updateSkipPreview(s) {
  if (s === 0) { skipPreview.textContent = 'Desactivado — aparece al terminar el vídeo'; skipPreview.classList.remove('active'); return; }
  const m = Math.floor(s/60), sec = s%60;
  skipPreview.textContent = `⏭ Aparece ${m>0?m+'m ':''}${sec>0?sec+'s':''} antes del final`;
  skipPreview.classList.add('active');
}
function updateIntroBodyState(on) { introBody.classList.toggle('disabled-section', !on); }
function updateIntroPreview() {
  const from = parseTime(introFrom.value), to = parseTime(introTo.value);
  if (from !== null && to !== null && to > from) {
    const mode = introAutoMode ? 'Saltará automáticamente' : 'Mostrará botón para saltar';
    introPreview.textContent = `${to-from}s — ${mode} (${formatTime(from)} → ${formatTime(to)})`;
    introPreview.classList.add('active');
  } else {
    introPreview.textContent = 'Introduce los tiempos de la intro';
    introPreview.classList.remove('active');
  }
}
function updateSectionsState(on) {
  sectionCountdown.classList.toggle('disabled-section', !on);
  sectionSkip.classList.toggle('disabled-section', !on);
}
function updateStatus(on) {
  const p = ext.tabs.query({ active: true, currentWindow: true });
  const handle = (tabs) => {
    const url = tabs[0]?.url || '';
    const ok = url.includes('animeav1.com') || url.includes('animeflv.net');
    // Usar DOM seguro en lugar de innerHTML
    statusText.textContent = '';
    if (ok) {
      statusText.textContent = on ? '✅ Activo en esta página' : '⏸ Desactivado';
    } else {
      statusText.textContent = 'Navega a AnimeAV1 o AnimeFLV';
      // Poner en negrita los nombres de forma segura
      statusText.textContent = '';
      const pre  = document.createTextNode('Navega a ');
      const b1   = document.createElement('strong'); b1.textContent = 'AnimeAV1';
      const mid  = document.createTextNode(' o ');
      const b2   = document.createElement('strong'); b2.textContent = 'AnimeFLV';
      statusText.append(pre, b1, mid, b2);
    }
  };
  if (p && typeof p.then === 'function') p.then(handle);
  else ext.tabs.query({ active: true, currentWindow: true }, handle);
}
