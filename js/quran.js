// quran.js — Quran Verse of the Day  v4 (fixed: dynamic verses, single audio, overflow fix)

const QURAN_CACHE_KEY  = 'quranCache';
const QURAN_FAV_KEY    = 'quranFavs';

const DAILY_AYAHS = [
  2,255,  1,1,   2,286, 3,173, 39,53,
  94,5,   2,152, 14,7,  65,3,  13,28,
  2,45,   3,139, 57,4,  2,186, 17,7,
  24,35,  16,97, 40,60, 3,26,  93,5,
  6,162,  18,10, 10,62, 49,13, 55,13,
  112,1,  103,1, 67,1,  2,153, 29,69,
];

let _verse      = null;
let _audio      = null;
let _audioPlay  = false;
let _verseIdx   = 0;

function todayStr()   { return new Date().toDateString(); }
function weekStr()    {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return `${d.getFullYear()}-W${Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7)}`;
}
function dayOfYear()  {
  const now = new Date(), jan1 = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - jan1) / 86400000);
}

function getDefaultIdx() {
  return dayOfYear() % (DAILY_AYAHS.length / 2);
}

async function fetchAyah(idx) {
  const surah = DAILY_AYAHS[idx * 2];
  const ayah  = DAILY_AYAHS[idx * 2 + 1];

  document.getElementById('quran-arabic').textContent      = '﷽';
  document.getElementById('quran-translation').textContent = 'Loading…';
  document.getElementById('quran-bangla').textContent      = '';
  document.getElementById('quran-ref').textContent         = '';

  try {
    const [arRes, enRes, bnRes] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`),
      fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/en.sahih`),
      fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/bn.bengali`),
    ]);
    if (!arRes.ok || !enRes.ok) throw new Error('API error');
    const [arD, enD, bnD] = await Promise.all([arRes.json(), enRes.json(), bnRes.json()]);

    const arabic      = arD.data?.text || '';
    const english     = enD.data?.text || '';
    const bangla      = bnD.data?.text || '';
    const surahName   = enD.data?.surah?.englishName || '';
    const surahNameAr = enD.data?.surah?.name || '';
    const ayahNum     = enD.data?.numberInSurah || ayah;
    const ref         = `${surahName} (${surahNameAr}) — ${surah}:${ayahNum}`;

    return { arabic, english, bangla, ref, surah, ayah: ayahNum, idx };
  } catch (e) {
    console.warn('[Quran] Fetch failed:', e.message);
    return {
      arabic:  'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
      english: 'Indeed, with hardship comes ease.',
      bangla:  'নিশ্চয়ই কষ্টের সাথে স্বস্তি আছে।',
      ref:     'Ash-Sharh (الشرح) — 94:6',
      surah: 94, ayah: 6, idx
    };
  }
}

async function loadQuranVerse(forceNew = false) {
  const widget = document.getElementById('quran-widget');
  if (!widget) return;

  const prefs  = await Storage.get([QURAN_CACHE_KEY, 'quranInterval']);
  const cache  = prefs[QURAN_CACHE_KEY];
  const interval = prefs.quranInterval || 'daily';

  let cacheValid = false;
  if (!forceNew && cache) {
    if (interval === 'daily'  && cache.date === todayStr()) cacheValid = true;
    if (interval === 'weekly' && cache.week === weekStr())  cacheValid = true;
    if (interval === 'manual')                              cacheValid = true;
  }

  if (cacheValid) {
    _verseIdx = cache.idx ?? getDefaultIdx();
    renderVerse(cache);
    return;
  }

  // Pick next index (rotate if forced, else use default)
  let idx = getDefaultIdx();
  if (forceNew && cache) {
    idx = ((cache.idx ?? getDefaultIdx()) + 1) % (DAILY_AYAHS.length / 2);
  }
  // Ensure we don't show same verse again on forceNew
  if (forceNew && cache && idx === (cache.idx ?? getDefaultIdx())) {
    idx = (idx + 1) % (DAILY_AYAHS.length / 2);
  }
  _verseIdx = idx;

  const verse = await fetchAyah(idx);
  const toStore = { ...verse, date: todayStr(), week: weekStr() };
  await Storage.set({ [QURAN_CACHE_KEY]: toStore });
  renderVerse(verse);
}

async function renderVerse(v) {
  _verse = v;
  stopAudio();

  const arabicEl = document.getElementById('quran-arabic');
  const engEl    = document.getElementById('quran-translation');
  const bnEl     = document.getElementById('quran-bangla');
  const refEl    = document.getElementById('quran-ref');
  if (!arabicEl) return;

  arabicEl.textContent = v.arabic  || '';
  engEl.textContent    = v.english ? `"${v.english}"` : '';
  bnEl.textContent     = v.bangla  ? `"${v.bangla}"`  : '';
  refEl.textContent    = v.ref     || '';

  const prefs = await Storage.get(['visibilityQuran','quranShowArabic','quranShowEnglish','quranShowBangla','quranShowRef']);
  const widget = document.getElementById('quran-widget');
  const half   = document.getElementById('quran-half');
  const hide   = prefs.visibilityQuran === false;
  if (widget) widget.style.display = hide ? 'none' : '';
  if (half)   half.style.display   = hide ? 'none' : '';
  if (arabicEl) arabicEl.style.display = prefs.quranShowArabic  === false ? 'none' : '';
  if (engEl)    engEl.style.display    = prefs.quranShowEnglish === false ? 'none' : '';
  if (bnEl)     bnEl.style.display     = prefs.quranShowBangla  === false ? 'none' : '';
  if (refEl)    refEl.style.display    = prefs.quranShowRef     === false ? 'none' : '';

  widget.classList.add('loaded');
}

// ── Copy ──────────────────────────────────────────────
document.getElementById('quran-copy-btn').addEventListener('click', () => {
  if (!_verse) return;
  const text = [_verse.arabic, _verse.english ? `"${_verse.english}"` : '', _verse.bangla ? `"${_verse.bangla}"` : '', _verse.ref || ''].filter(Boolean).join('\n');
  navigator.clipboard.writeText(text).then(() => showToast('quran-copy-toast'));
});

// ── Reload (next verse) ─────────────────────────────
document.getElementById('quran-reload-btn').addEventListener('click', async () => {
  const btn = document.getElementById('quran-reload-btn');
  btn.style.opacity = '0.4';
  btn.style.pointerEvents = 'none';
  await loadQuranVerse(true);
  btn.style.opacity = '';
  btn.style.pointerEvents = '';
});

// ── Favourite ──────────────────────────────────────────
document.getElementById('quran-fav-btn').addEventListener('click', async () => {
  if (!_verse) return;
  const raw  = await Storage.get(QURAN_FAV_KEY);
  const favs = raw[QURAN_FAV_KEY] || [];
  const dup  = favs.some(f => f.ref === _verse.ref);
  if (!dup) {
    favs.unshift({ arabic: _verse.arabic, english: _verse.english, bangla: _verse.bangla, ref: _verse.ref });
    await Storage.set({ [QURAN_FAV_KEY]: favs });
    showToast('quran-fav-toast');
    renderFavVerses();
    const btn = document.getElementById('quran-fav-btn');
    btn.classList.add('saved');
    setTimeout(() => btn.classList.remove('saved'), 1200);
  } else {
    showToast('quran-fav-toast', 'Already saved!');
  }
});

function showToast(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  if (msg) el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => { el.classList.remove('show'); if (msg) el.textContent = el.dataset.default || ''; }, 1800);
}

async function renderFavVerses() {
  const raw   = await Storage.get(QURAN_FAV_KEY);
  const favs  = raw[QURAN_FAV_KEY] || [];
  const cont  = document.getElementById('favverses-content');
  if (!cont) return;
  if (!favs.length) {
    cont.innerHTML = '<p class="favverses-empty">No favourites yet. Tap ❤️ on a verse to save it.</p>';
    return;
  }
  cont.innerHTML = '';
  favs.forEach((v, i) => {
    const card = document.createElement('div');
    card.className = 'fav-verse-card';
    card.innerHTML = `
      <div class="fav-verse-arabic">${v.arabic || ''}</div>
      ${v.english ? `<div class="fav-verse-en">"${v.english}"</div>` : ''}
      ${v.bangla  ? `<div class="fav-verse-bn">"${v.bangla}"</div>`  : ''}
      <div class="fav-verse-footer">
        <span class="fav-verse-ref">${v.ref || ''}</span>
        <button class="fav-verse-del" data-i="${i}" title="Remove">🗑️</button>
      </div>
    `;
    card.querySelector('.fav-verse-del').addEventListener('click', async (e) => {
      e.stopPropagation();
      const raw2 = await Storage.get(QURAN_FAV_KEY);
      const f2   = raw2[QURAN_FAV_KEY] || [];
      f2.splice(parseInt(e.currentTarget.dataset.i), 1);
      await Storage.set({ [QURAN_FAV_KEY]: f2 });
      renderFavVerses();
    });
    cont.appendChild(card);
  });
}

// ── Audio (fixed: single instance, no double play) ──────
// Precomputed surah start offsets for absolute ayah number
const SURAH_STARTS = [
  0,1,8,294,494,670,790,955,1161,1235,1365,1474,1597,1708,1751,1802,1902,2030,
  2141,2250,2349,2484,2596,2674,2792,2856,2933,3160,3253,3341,3411,3469,3504,
  3533,3607,3615,3627,3631,3641,3670,3703,3734,3765,3797,3827,3856,3887,3917,
  3945,3971,4000,4030,4059,4087,4114,4139,4163,4186,4211,4235,4258,4280,4301,
  4320,4337,4354,4370,4385,4399,4411,4422,4432,4441,4449,4458,4466,4474,4482,
  4490,4497,4505,4514,4524,4534,4545,4558,4571,4584,4596,4607,4615,4625,4636,
  4648,4656,4665,4672,4681,4690,4699,4707,4716,4725,4735,4744,4752,4762,4773,
  4781,4789,4797,4806,4815,5000
];

function absoluteAyah(surah, ayah) {
  return (SURAH_STARTS[surah] || 0) + ayah;
}

function buildAudioUrls(surah, ayah) {
  const s3  = String(surah).padStart(3, '0');
  const a3  = String(ayah).padStart(3, '0');
  const abs = absoluteAyah(surah, ayah);
  return [
    `https://everyayah.com/data/Alafasy_128kbps/${s3}${a3}.mp3`,
    `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${abs}.mp3`,
    `https://verses.quran.com/Alafasy/mp3/${s3}${a3}.mp3`,
  ];
}

function stopAudio() {
  if (_audio) {
    _audio.onended = null;
    _audio.onerror = null;
    _audio.pause();
    _audio.src = '';
    _audio = null;
  }
  _audioPlay = false;
  setAudioIcon(false);
}

function setAudioIcon(playing) {
  _audioPlay = playing;
  const btn = document.getElementById('quran-audio-btn');
  if (!btn) return;
  if (playing) {
    btn.classList.add('playing');
    btn.title = 'Stop recitation';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
  } else {
    btn.classList.remove('playing');
    btn.title = 'Play recitation';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
  }
}

let _audioPlaying = false; // guard against double play
async function tryPlayAudio(urls, idx = 0) {
  if (idx >= urls.length) {
    console.warn('[Quran] All audio sources failed');
    setAudioIcon(false);
    _audioPlaying = false;
    return;
  }
  const audio = new Audio();
  _audio = audio;
  audio.preload = 'none';
  audio.src = urls[idx];
  audio.onended  = () => { if (_audio === audio) { setAudioIcon(false); _audioPlaying = false; } };
  audio.onerror  = () => {
    if (_audio !== audio) return;
    console.warn('[Quran] Audio failed, trying next:', urls[idx]);
    tryPlayAudio(urls, idx + 1);
  };
  try {
    await audio.play();
    if (_audio === audio) setAudioIcon(true);
  } catch (e) {
    if (_audio !== audio) return;
    console.warn('[Quran] play() rejected:', e.message);
    tryPlayAudio(urls, idx + 1);
  }
}

document.getElementById('quran-audio-btn').addEventListener('click', () => {
  if (!_verse) return;
  if (_audioPlay) { stopAudio(); _audioPlaying = false; return; }
  if (_audioPlaying) return; // prevent double
  _audioPlaying = true;
  stopAudio();
  const urls = buildAudioUrls(_verse.surah, _verse.ayah);
  tryPlayAudio(urls);
});

// ── Init ────────────────────────────────────────────
renderFavVerses();
loadQuranVerse();
