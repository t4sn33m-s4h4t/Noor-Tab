// settings.js — v3: real-time preview, no inline handlers, export/import backup

const SETTINGS_DEFAULTS = {
  userName: '',
  theme: 'dark',
  bgCategory: 'nature landscape',
  unsplashKey: '',
  bgInterval: 30,
  bgBlur: 22,
  iconSize: 32,
  iconsPerRow: 0,
  visibilityClock:    true,
  visibilityLinks:    true,
  visibilityLinksTab: true,
  visibilityStats:    true,
  visibilityQuran:    true,
  visibilityPrayer:   true,
  visibilitySalah:    true,
  visibilityHabits:   true,
  quranShowArabic:    true,
  quranShowEnglish:   true,
  quranShowBangla:    true,
  quranShowRef:       true,
  quranInterval:      'daily',
  quranSizePercent:   33,
  dhikrEnabled:       false,
  dhikrInterval:      15,
};

const ALL_THEMES = ['dark','light','amoled','ocean','forest'];

// ── Saved snapshot for "discard on reload" ──────────────
let _savedSnapshot = null;

async function loadSettings() {
  const data = await Storage.get(Object.keys(SETTINGS_DEFAULTS));
  const s = { ...SETTINGS_DEFAULTS, ...data };
  _savedSnapshot = { ...s };

  applyTheme(s.theme);
  applyVisibility(s);
  applyIconSize(s.iconSize ?? 32);
  applyIconsPerRow(s.iconsPerRow ?? 0);
  applyQuranSize(s.quranSizePercent ?? 33);
  applyBlur(s.bgBlur ?? 22);

  document.getElementById('setting-name').value           = s.userName || '';
  document.getElementById('setting-theme').value          = s.theme || 'dark';
  document.getElementById('setting-category').value       = s.bgCategory || '';
  document.getElementById('setting-unsplash-key').value   = s.unsplashKey || '';
  document.getElementById('setting-bg-interval').value    = String(s.bgInterval ?? 30);
  document.getElementById('setting-quran-interval').value = s.quranInterval || 'daily';
  document.getElementById('dhikr-enabled').checked        = !!s.dhikrEnabled;
  document.getElementById('dhikr-interval').value         = String(s.dhikrInterval || 15);

  const blur = s.bgBlur ?? 22;
  document.getElementById('setting-blur').value           = blur;
  document.getElementById('blur-val').textContent         = blur + 'px';

  const iconSz = s.iconSize ?? 32;
  document.getElementById('setting-icon-size').value      = iconSz;
  document.getElementById('icon-size-val').textContent    = iconSz + 'px';

  const ipr = s.iconsPerRow ?? 0;
  document.getElementById('setting-icons-per-row').value  = ipr || '';

  const qSize = s.quranSizePercent ?? 33;
  document.getElementById('setting-quran-size').value     = qSize;
  document.getElementById('quran-size-val').textContent   = qSize + '%';

  document.getElementById('vis-clock').checked      = s.visibilityClock    !== false;
  document.getElementById('vis-links').checked      = s.visibilityLinks    !== false;
  document.getElementById('vis-links-tab').checked  = s.visibilityLinksTab !== false;
  document.getElementById('vis-stats').checked      = s.visibilityStats    !== false;
  document.getElementById('vis-quran').checked      = s.visibilityQuran    !== false;
  document.getElementById('vis-prayer').checked     = s.visibilityPrayer   !== false;
  document.getElementById('vis-salah').checked      = s.visibilitySalah    !== false;
  document.getElementById('vis-habits').checked     = s.visibilityHabits   !== false;
  document.getElementById('quran-show-arabic').checked  = s.quranShowArabic  !== false;
  document.getElementById('quran-show-english').checked = s.quranShowEnglish !== false;
  document.getElementById('quran-show-bangla').checked  = s.quranShowBangla  !== false;
  document.getElementById('quran-show-ref').checked     = s.quranShowRef     !== false;
}

// ── Apply helpers ─────────────────────────────────────
function applyBlur(px) { document.documentElement.style.setProperty('--glass-blur', px + 'px'); }
function applyIconSize(px) { document.documentElement.style.setProperty('--icon-size', px + 'px'); }

function applyIconsPerRow(n) {
  const grid = document.getElementById('links-grid');
  if (!grid) return;
  grid.style.gridTemplateColumns = (n && n > 0) ? `repeat(${n}, minmax(0, 1fr))` : '';
}

function applyQuranSize(percent) {
  const quranHalf = document.getElementById('quran-half');
  const linksHalf = document.getElementById('links-half');
  if (!quranHalf || !linksHalf) return;
  const q = Math.max(10, Math.min(90, percent));
  quranHalf.style.flex = `0 0 ${q}%`;
  linksHalf.style.flex = `0 0 ${100 - q}%`;
}

function applyTheme(theme) {
  document.body.classList.remove(...ALL_THEMES.map(t => `theme-${t}`));
  document.body.classList.add(`theme-${theme || 'dark'}`);
}

function applyVisibility(s) {
  const clockEl    = document.getElementById('clock-widget');
  const linksHalf  = document.getElementById('links-half');
  const linksEl    = document.getElementById('links-section');
  const statsBtn   = document.getElementById('stats-btn');
  const quranEl    = document.getElementById('quran-widget');
  const quranHalf  = document.getElementById('quran-half');
  const prayerCard = document.getElementById('prayer-card');

  if (clockEl)    clockEl.style.display    = s.visibilityClock   === false ? 'none' : '';
  if (statsBtn)   statsBtn.style.display   = s.visibilityStats   === false ? 'none' : '';
  if (prayerCard) prayerCard.style.display = s.visibilityPrayer  === false ? 'none' : '';

  const salahBtn  = document.getElementById('salah-btn');
  const habitsBtn = document.getElementById('habits-btn');
  if (salahBtn)  salahBtn.style.display  = s.visibilitySalah  === false ? 'none' : '';
  if (habitsBtn) habitsBtn.style.display = s.visibilityHabits === false ? 'none' : '';

  const showQuran = s.visibilityQuran !== false;
  if (quranEl)   quranEl.style.display   = showQuran ? '' : 'none';
  if (quranHalf) quranHalf.style.display = showQuran ? '' : 'none';

  const showLinks = s.visibilityLinks !== false;
  if (linksHalf) linksHalf.style.display = showLinks ? '' : 'none';

  const showLinksTab = s.visibilityLinksTab !== false;
  if (linksEl) linksEl.style.display = showLinksTab ? '' : 'none';

  const pageSplit = document.querySelector('.page-split');
  if (pageSplit) {
    pageSplit.style.justifyContent = (!showQuran && showLinks) ? 'center' : '';
  }

  const arabicEl = document.getElementById('quran-arabic');
  const engEl    = document.getElementById('quran-translation');
  const bnEl     = document.getElementById('quran-bangla');
  const refEl    = document.getElementById('quran-ref');
  if (arabicEl) arabicEl.style.display = s.quranShowArabic  === false ? 'none' : '';
  if (engEl)    engEl.style.display    = s.quranShowEnglish === false ? 'none' : '';
  if (bnEl)     bnEl.style.display     = s.quranShowBangla  === false ? 'none' : '';
  if (refEl)    refEl.style.display    = s.quranShowRef     === false ? 'none' : '';
}

// ── Read current UI state into an object ─────────────
function readCurrentUI() {
  const iprVal = parseInt(document.getElementById('setting-icons-per-row').value);
  return {
    userName:           document.getElementById('setting-name').value.trim(),
    theme:              document.getElementById('setting-theme').value,
    bgCategory:         document.getElementById('setting-category').value.trim(),
    unsplashKey:        document.getElementById('setting-unsplash-key').value.trim(),
    bgInterval:         parseInt(document.getElementById('setting-bg-interval').value) || 30,
    bgBlur:             parseInt(document.getElementById('setting-blur').value) ?? 22,
    iconSize:           parseInt(document.getElementById('setting-icon-size').value) ?? 32,
    iconsPerRow:        isNaN(iprVal) ? 0 : iprVal,
    quranSizePercent:   parseInt(document.getElementById('setting-quran-size').value) || 33,
    quranInterval:      document.getElementById('setting-quran-interval').value,
    dhikrEnabled:       document.getElementById('dhikr-enabled').checked,
    dhikrInterval:      parseInt(document.getElementById('dhikr-interval').value) || 15,
    visibilityClock:    document.getElementById('vis-clock').checked,
    visibilityLinks:    document.getElementById('vis-links').checked,
    visibilityLinksTab: document.getElementById('vis-links-tab').checked,
    visibilityStats:    document.getElementById('vis-stats').checked,
    visibilityQuran:    document.getElementById('vis-quran').checked,
    visibilityPrayer:   document.getElementById('vis-prayer').checked,
    visibilitySalah:    document.getElementById('vis-salah').checked,
    visibilityHabits:   document.getElementById('vis-habits').checked,
    quranShowArabic:    document.getElementById('quran-show-arabic').checked,
    quranShowEnglish:   document.getElementById('quran-show-english').checked,
    quranShowBangla:    document.getElementById('quran-show-bangla').checked,
    quranShowRef:       document.getElementById('quran-show-ref').checked,
  };
}

// ── Live preview: apply without saving ───────────────
function livePreview() {
  const s = readCurrentUI();
  applyTheme(s.theme);
  applyBlur(s.bgBlur);
  applyIconSize(s.iconSize);
  applyIconsPerRow(s.iconsPerRow);
  applyQuranSize(s.quranSizePercent);
  applyVisibility(s);
  if (typeof window.applyDhikrSettings === 'function') {
    window.applyDhikrSettings(s.dhikrEnabled, s.dhikrInterval);
  }
}

// ── Save ──────────────────────────────────────────────
async function saveSettings() {
  try {
    const settings = readCurrentUI();
    await Storage.set(settings);
    _savedSnapshot = { ...settings };
    if (typeof window.applyDhikrSettings === 'function') {
      window.applyDhikrSettings(settings.dhikrEnabled, settings.dhikrInterval);
    }
    const fb = document.getElementById('save-feedback');
    fb.textContent = '✓ Settings saved!';
    fb.style.color = 'var(--success)';
    setTimeout(() => { fb.textContent = ''; }, 2500);
  } catch (err) {
    const fb = document.getElementById('save-feedback');
    fb.textContent = '✗ Save failed';
    fb.style.color = 'var(--danger)';
  }
}

// ── Revert to saved snapshot when settings panel closes ──
function revertToSaved() {
  if (!_savedSnapshot) return;
  applyTheme(_savedSnapshot.theme);
  applyBlur(_savedSnapshot.bgBlur ?? 22);
  applyIconSize(_savedSnapshot.iconSize ?? 32);
  applyIconsPerRow(_savedSnapshot.iconsPerRow ?? 0);
  applyQuranSize(_savedSnapshot.quranSizePercent ?? 33);
  applyVisibility(_savedSnapshot);
  // re-sync UI inputs
  loadSettings();
}
window.revertSettingsToSaved = revertToSaved;

// ── Wire up ALL inputs for live preview ──────────────
function wireAllLivePreviews() {
  const ids = [
    'setting-theme','setting-blur','setting-icon-size','setting-quran-size',
    'setting-icons-per-row','vis-clock','vis-links','vis-links-tab','vis-stats',
    'vis-quran','vis-prayer','vis-salah','vis-habits','quran-show-arabic','quran-show-english',
    'quran-show-bangla','quran-show-ref','dhikr-enabled','dhikr-interval',
    'setting-quran-interval',
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const evt = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
    el.addEventListener(evt, () => {
      // Update display labels
      if (id === 'setting-blur') document.getElementById('blur-val').textContent = el.value + 'px';
      if (id === 'setting-icon-size') document.getElementById('icon-size-val').textContent = el.value + 'px';
      if (id === 'setting-quran-size') document.getElementById('quran-size-val').textContent = el.value + '%';
      livePreview();
    });
  });
}

// ── Export / Import backup ────────────────────────────
async function exportBackup() {
  const ALL_KEYS = [
    ...Object.keys(SETTINGS_DEFAULTS),
    'links', 'bookmarks', 'quranCache', 'quranFavs',
    'siteStats', 'siteStatsDate', 'prayerTimesCache', 'prayerLocation',
    'salahData', 'habitsData', 'quickNotes',
  ];
  const data = await Storage.get(ALL_KEYS);
  const json = JSON.stringify({ _noorTabBackup: true, _version: '1.2', _date: new Date().toISOString(), ...data }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `noor-tab-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  const fb = document.getElementById('save-feedback');
  fb.textContent = '✓ Backup downloaded!';
  fb.style.color = 'var(--success)';
  setTimeout(() => { fb.textContent = ''; }, 2500);
}

function importBackup() {
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data._noorTabBackup) throw new Error('Not a Noor Tab backup file');
      // Strip meta keys
      const { _noorTabBackup, _version, _date, ...toRestore } = data;
      await Storage.set(toRestore);
      const fb = document.getElementById('save-feedback');
      fb.textContent = '✓ Backup imported! Reloading…';
      fb.style.color = 'var(--success)';
      setTimeout(() => location.reload(), 1200);
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  });
  input.click();
}

// ── Button wiring ─────────────────────────────────────
document.getElementById('settings-save').addEventListener('click', saveSettings);
document.getElementById('export-backup-btn').addEventListener('click', exportBackup);
document.getElementById('import-backup-btn').addEventListener('click', importBackup);

document.getElementById('reload-bg-btn').addEventListener('click', async function () {
  this.textContent = 'Reloading…';
  await Storage.remove(['cachedBg', 'cachedBgTime']);
  if (typeof loadBackground === 'function') await loadBackground(true);
  setTimeout(() => { this.textContent = 'Reload Background Now'; }, 1200);
});

wireAllLivePreviews();
loadSettings();
