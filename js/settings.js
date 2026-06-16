// settings.js — All settings, live preview, mirror layout, reset, lock
const SETTINGS_DEFAULTS = {
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
  visibilityFavVerses:true,
  visibilityNotes:    true,
  visibilitySearch:   true,
  quranShowArabic:    true,
  quranShowEnglish:   true,
  quranShowBangla:    true,
  favSaveLangs:       ['arabic','english','bangla'],
  quranInterval:      'daily',
  quranSizePercent:   33,
  mirrorLayout:       false,
  searchEngine:       'google',
  searchAlwaysVisible:true,
};

const ALL_THEMES = ['dark','light','amoled','ocean','forest','sunset','nord','rose-gold','solarized'];
let _savedSnapshot = null;

async function loadSettings() {
  const data = await Storage.get(Object.keys(SETTINGS_DEFAULTS));
  const s    = { ...SETTINGS_DEFAULTS, ...data };
  _savedSnapshot = { ...s };

  applyTheme(s.theme);
  applyVisibility(s);
  applyIconSize(s.iconSize ?? 32);
  applyIconsPerRow(s.iconsPerRow ?? 0);
  applyQuranSize(s.quranSizePercent ?? 33);
  applyBlur(s.bgBlur ?? 22);
  applyMirrorLayout(s.mirrorLayout);

  const set = (id, val) => { const el=document.getElementById(id); if(el) el.value=val; };
  const chk = (id, val) => { const el=document.getElementById(id); if(el) el.checked=!!val; };

  set('setting-theme',          s.theme || 'dark');
  set('setting-category',       s.bgCategory || '');
  set('setting-unsplash-key',   s.unsplashKey || '');
  set('setting-bg-interval',    String(s.bgInterval ?? 30));
  set('setting-quran-interval', s.quranInterval || 'daily');
  set('setting-search-engine',  s.searchEngine || 'google');

  const blur = s.bgBlur ?? 22;
  set('setting-blur', blur);
  const blurVal = document.getElementById('blur-val'); if(blurVal) blurVal.textContent=blur+'px';

  const iconSz = s.iconSize ?? 32;
  set('setting-icon-size', iconSz);
  const iconVal = document.getElementById('icon-size-val'); if(iconVal) iconVal.textContent=iconSz+'px';

  set('setting-icons-per-row', s.iconsPerRow || '');

  const qSize = s.quranSizePercent ?? 33;
  set('setting-quran-size', qSize);
  const qVal = document.getElementById('quran-size-val'); if(qVal) qVal.textContent=qSize+'%';

  chk('vis-clock',             s.visibilityClock    !== false);
  chk('vis-links',             s.visibilityLinks    !== false);
  chk('vis-links-tab',         s.visibilityLinksTab !== false);
  chk('vis-stats',             s.visibilityStats    !== false);
  chk('vis-quran',             s.visibilityQuran    !== false);
  chk('vis-prayer',            s.visibilityPrayer   !== false);
  chk('vis-salah',             s.visibilitySalah    !== false);
  chk('vis-habits',            s.visibilityHabits   !== false);
  chk('vis-favverses',         s.visibilityFavVerses !== false);
  chk('vis-notes',             s.visibilityNotes    !== false);
  chk('vis-search',            s.visibilitySearch   !== false);
  chk('quran-show-arabic',     s.quranShowArabic    !== false);
  chk('quran-show-english',    s.quranShowEnglish   !== false);
  chk('quran-show-bangla',     s.quranShowBangla    !== false);
  chk('setting-mirror-layout', s.mirrorLayout);
  chk('setting-search-always-visible', s.searchAlwaysVisible !== false);

  // Fav save langs checkboxes
  const saveLangs = s.favSaveLangs || ['arabic','english','bangla'];
  ['arabic','english','bangla','urdu','french','turkish','indonesian','russian'].forEach(lang => {
    const el = document.getElementById(`fav-save-${lang}`);
    if (el) el.checked = saveLangs.includes(lang);
  });
}

function applyBlur(px)     { document.documentElement.style.setProperty('--glass-blur', px+'px'); }
function applyIconSize(px) { document.documentElement.style.setProperty('--icon-size', px+'px'); }
function applyIconsPerRow(n) {
  const grid = document.getElementById('links-grid');
  if (grid) grid.style.gridTemplateColumns = (n&&n>0) ? `repeat(${n}, minmax(0,1fr))` : '';
}
function applyQuranSize(percent) {
  const qh=document.getElementById('quran-half'), lh=document.getElementById('links-half');
  if (!qh||!lh) return;
  const q=Math.max(10,Math.min(90,percent));
  qh.style.flex=`0 0 ${q}%`; lh.style.flex=`0 0 ${100-q}%`;
}
function applyTheme(theme) {
  document.body.classList.remove(...ALL_THEMES.map(t=>`theme-${t}`));
  document.body.classList.add(`theme-${theme||'dark'}`);
}
function applyMirrorLayout(mirror) {
  document.body.classList.toggle('layout-mirrored', !!mirror);
}
function applyVisibility(s) {
  const show = (id, val) => { const el=document.getElementById(id); if(el) el.style.display=val===false?'none':''; };

  const clockTime = document.getElementById('clock-time');
  const clockDate = document.getElementById('clock-date');
  if (clockTime) clockTime.style.display = s.visibilityClock===false ? 'none' : '';
  if (clockDate) clockDate.style.display = s.visibilityClock===false ? 'none' : '';

  show('stats-btn',       s.visibilityStats);
  show('prayer-card',     s.visibilityPrayer);
  show('salah-btn',       s.visibilitySalah);
  show('habits-btn',      s.visibilityHabits);
  show('favverses-fab',   s.visibilityFavVerses);
  show('notes-fab',       s.visibilityNotes);
  show('search-bar-wrap', s.visibilitySearch);
  show('quran-widget',    s.visibilityQuran);
  show('quran-half',      s.visibilityQuran);
  show('links-half',      s.visibilityLinks);
  show('links-section',   s.visibilityLinksTab);

  show('quran-arabic',      s.quranShowArabic);
  show('quran-translation', s.quranShowEnglish);
  show('quran-bangla',      s.quranShowBangla);
  ['urdu','french','turkish','indonesian','russian'].forEach(lang => {
    show(`quran-${lang}`, s[`quranShow${lang.charAt(0).toUpperCase()+lang.slice(1)}`]);
  });
}

function getFavSaveLangs() {
  const langs = [];
  ['arabic','english','bangla','urdu','french','turkish','indonesian','russian'].forEach(lang => {
    const el = document.getElementById(`fav-save-${lang}`);
    if (el && el.checked) langs.push(lang);
  });
  return langs.length ? langs : ['arabic','english'];
}

function readCurrentUI() {
  const get = id => { const el=document.getElementById(id); return el?el.value:''; };
  const chk = id => { const el=document.getElementById(id); return el?el.checked:true; };
  const iprVal = parseInt(get('setting-icons-per-row'));
  return {
    theme:              get('setting-theme'),
    bgCategory:         get('setting-category').trim(),
    unsplashKey:        get('setting-unsplash-key').trim(),
    bgInterval:         parseInt(get('setting-bg-interval'))??30,
    bgBlur:             parseInt(get('setting-blur'))??22,
    iconSize:           parseInt(get('setting-icon-size'))??32,
    iconsPerRow:        isNaN(iprVal)?0:iprVal,
    quranSizePercent:   parseInt(get('setting-quran-size'))||33,
    quranInterval:      get('setting-quran-interval'),
    searchEngine:       get('setting-search-engine'),
    searchAlwaysVisible:chk('setting-search-always-visible'),
    mirrorLayout:       chk('setting-mirror-layout'),
    visibilityClock:    chk('vis-clock'),
    visibilityLinks:    chk('vis-links'),
    visibilityLinksTab: chk('vis-links-tab'),
    visibilityStats:    chk('vis-stats'),
    visibilityQuran:    chk('vis-quran'),
    visibilityPrayer:   chk('vis-prayer'),
    visibilitySalah:    chk('vis-salah'),
    visibilityHabits:   chk('vis-habits'),
    visibilityFavVerses:chk('vis-favverses'),
    visibilityNotes:    chk('vis-notes'),
    visibilitySearch:   chk('vis-search'),
    quranShowArabic:    chk('quran-show-arabic'),
    quranShowEnglish:   chk('quran-show-english'),
    quranShowBangla:    chk('quran-show-bangla'),
    favSaveLangs:       getFavSaveLangs(),
  };
}

function livePreview() {
  const s = readCurrentUI();
  applyTheme(s.theme);
  applyBlur(s.bgBlur);
  applyIconSize(s.iconSize);
  applyIconsPerRow(s.iconsPerRow);
  applyQuranSize(s.quranSizePercent);
  applyVisibility(s);
  applyMirrorLayout(s.mirrorLayout);
  window._searchEngine = s.searchEngine;
}

async function saveSettings() {
  const settings = readCurrentUI();
  await Storage.set(settings);
  _savedSnapshot = { ...settings };
  window._searchEngine = settings.searchEngine;
  showToast('✓ Settings saved!', 'success');
}

function revertToSaved() {
  if (!_savedSnapshot) return;
  applyTheme(_savedSnapshot.theme);
  applyBlur(_savedSnapshot.bgBlur ?? 22);
  applyIconSize(_savedSnapshot.iconSize ?? 32);
  applyIconsPerRow(_savedSnapshot.iconsPerRow ?? 0);
  applyQuranSize(_savedSnapshot.quranSizePercent ?? 33);
  applyVisibility(_savedSnapshot);
  applyMirrorLayout(_savedSnapshot.mirrorLayout);
  loadSettings();
}
window.revertSettingsToSaved = revertToSaved;

async function exportBackup() {
  const ALL_KEYS = [...Object.keys(SETTINGS_DEFAULTS),'links','quranCache','quranFavs','siteStats','siteStatsDate','prayerTimesCache','prayerLocation','salahData','salahStreak','habits','quickNotes'];
  const data = await Storage.get(ALL_KEYS);
  const json = JSON.stringify({_noorTabBackup:true,_version:'2.0',_date:new Date().toISOString(),...data},null,2);
  const url  = URL.createObjectURL(new Blob([json],{type:'application/json'}));
  const a    = Object.assign(document.createElement('a'),{href:url,download:`noor-tab-backup-${new Date().toISOString().slice(0,10)}.json`});
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('✓ Backup downloaded!');
}

function importBackup() {
  const input = Object.assign(document.createElement('input'),{type:'file',accept:'.json,application/json'});
  input.addEventListener('change', async e => {
    const file = e.target.files[0]; if(!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data._noorTabBackup) throw new Error('Not a Noor Tab backup');
      const {_noorTabBackup,_version,_date,...toRestore}=data;
      await Storage.set(toRestore);
      showToast('✓ Backup imported! Reloading…');
      setTimeout(()=>location.reload(),1200);
    } catch(err) { showToast('Import failed: '+err.message,'error'); }
  });
  input.click();
}

function resetExtension() {
  showConfirm(
    'This will erase ALL your data: links, notes, habits, favourites, settings — everything. This cannot be undone.',
    async () => {
      await chrome.storage.local.clear();
      showToast('Extension reset. Reloading…');
      setTimeout(()=>location.reload(),1200);
    },
    { title: 'Reset Extension?', confirmLabel: 'Reset Everything', confirmClass: 'save-btn danger-btn' }
  );
}

function wireAllLivePreviews() {
  const ids = [
    'setting-theme','setting-blur','setting-icon-size','setting-quran-size',
    'setting-icons-per-row','vis-clock','vis-links','vis-links-tab','vis-stats',
    'vis-quran','vis-prayer','vis-salah','vis-habits','vis-favverses','vis-notes','vis-search',
    'setting-quran-interval','setting-mirror-layout','setting-search-engine','setting-search-always-visible',
  ];
  ids.forEach(id => {
    const el = document.getElementById(id); if(!el) return;
    const evt = (el.type==='checkbox'||el.tagName==='SELECT')?'change':'input';
    el.addEventListener(evt, () => {
      if(id==='setting-blur')       { const v=document.getElementById('blur-val');      if(v) v.textContent=el.value+'px'; }
      if(id==='setting-icon-size')  { const v=document.getElementById('icon-size-val'); if(v) v.textContent=el.value+'px'; }
      if(id==='setting-quran-size') { const v=document.getElementById('quran-size-val');if(v) v.textContent=el.value+'%';  }
      livePreview();
    });
  });
}

document.getElementById('settings-save').addEventListener('click', saveSettings);
document.getElementById('export-backup-btn').addEventListener('click', exportBackup);
document.getElementById('import-backup-btn').addEventListener('click', importBackup);
document.getElementById('reset-extension-btn').addEventListener('click', resetExtension);
document.getElementById('lock-settings-btn').addEventListener('click', () => window.openLockSettingsPage?.());

document.getElementById('reload-bg-btn').addEventListener('click', async function() {
  this.classList.add('spinning');
  await Storage.remove(['cachedBg','cachedBgTime']);
  if (typeof loadBackground==='function') await loadBackground(true);
  this.classList.remove('spinning');
});

document.getElementById('reload-bg-icon-btn').addEventListener('click', async () => {
  await Storage.remove(['cachedBg','cachedBgTime']);
  if (typeof loadBackground==='function') await loadBackground(true);
});

wireAllLivePreviews();
loadSettings();
