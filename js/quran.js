// quran.js — Quran Verse of the Day + Fav Verses with audio play, multi-language save
const QURAN_CACHE_KEY = 'quranCache';
const QURAN_FAV_KEY   = 'quranFavs';
const TOTAL_AYAHS     = 6236;

// ── Translations (Arabic, English, Bangla only) ───────────────
const QURAN_LANGS = {
  arabic:  { key: 'ar.alafasy',  label: 'Arabic',  dir: 'rtl' },
  english: { key: 'en.sahih',    label: 'English',  dir: 'ltr' },
  bangla:  { key: 'bn.bengali',  label: 'Bangla',   dir: 'ltr' },
};
const DISPLAY_LANGS = ['arabic','english','bangla'];

function seededRandom(seed) {
  let t = (seed + 0x6D2B79F5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function todayStr()  { return new Date().toDateString(); }
function weekStr()   {
  const d = new Date(), jan1 = new Date(d.getFullYear(), 0, 1);
  return `${d.getFullYear()}-W${Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7)}`;
}
function dayOfYear() { const n=new Date(),j=new Date(n.getFullYear(),0,0); return Math.floor((n-j)/86400000); }
function getDefaultAbsAyah() {
  const seed = new Date().getFullYear() * 1000 + dayOfYear();
  return Math.floor(seededRandom(seed) * TOTAL_AYAHS) + 1;
}

const SURAH_LENGTHS = [0,7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,22,20,18,32,21,28,36,50,38,15,16,14,15,22,21,10,20,130,15,15,19,17,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
function absToSurahAyah(abs) {
  let running = 0;
  for (let s = 1; s < SURAH_LENGTHS.length; s++) {
    if (abs <= running + SURAH_LENGTHS[s]) return { surah: s, ayah: abs - running };
    running += SURAH_LENGTHS[s];
  }
  return { surah: 1, ayah: 1 };
}

let _verse = null, _audio = null, _audioPlay = false, _audioPlaying = false;

async function getActiveLangs() {
  const data = await Storage.get(['quranShowArabic','quranShowEnglish','quranShowBangla']);
  return {
    arabic:  data.quranShowArabic  !== false,
    english: data.quranShowEnglish !== false,
    bangla:  data.quranShowBangla  !== false,
  };
}

async function getFavSaveLangs() {
  const data = await Storage.get(['favSaveLangs']);
  return data.favSaveLangs || ['arabic','english','bangla'];
}

async function fetchAyah(absAyah) {
  const { surah, ayah } = absToSurahAyah(absAyah);
  const el = id => document.getElementById(id);
  if (el('quran-arabic'))      el('quran-arabic').textContent = '﷽';
  if (el('quran-translation')) el('quran-translation').textContent = 'Loading…';

  try {
    const base = `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}`;
    const [arRes, enRes, bnRes] = await Promise.all([
      fetch(`${base}/ar.alafasy`),
      fetch(`${base}/en.sahih`),
      fetch(`${base}/bn.bengali`),
    ]);
    const [arD, enD, bnD] = await Promise.all([arRes.json(), enRes.json(), bnRes.json()]);
    const enData = enD.data;
    return {
      arabic:  arD.data?.text || '',
      english: enD.data?.text || '',
      bangla:  bnD.data?.text || '',
      ref:     `${enData?.surah?.englishName || ''} (${enData?.surah?.name || ''}) — ${surah}:${enData?.numberInSurah || ayah}`,
      surah, ayah: enData?.numberInSurah || ayah, absAyah
    };
  } catch {
    return { arabic:'إِنَّ مَعَ الْعُسْرِ يُسْرًا', english:'Indeed, with hardship comes ease.',
      bangla:'নিশ্চয়ই কষ্টের সাথে স্বস্তি আছে।',
      ref:'Ash-Sharh (الشرح) — 94:6', surah:94, ayah:6, absAyah };
  }
}

async function loadQuranVerse(forceNew = false) {
  const prefs    = await Storage.get([QURAN_CACHE_KEY, 'quranInterval', 'quranReloadCount']);
  const cache    = prefs[QURAN_CACHE_KEY];
  const interval = prefs.quranInterval || 'daily';
  let cacheValid = false;
  if (!forceNew && cache) {
    if (interval === 'daily'  && cache.date === todayStr()) cacheValid = true;
    if (interval === 'weekly' && cache.week === weekStr())  cacheValid = true;
    if (interval === 'manual')                              cacheValid = true;
  }
  if (cacheValid) { renderVerse(cache); return; }

  let absAyah;
  if (forceNew) {
    const count = ((prefs.quranReloadCount || 0) + 1);
    await Storage.set({ quranReloadCount: count });
    const seed = new Date().getFullYear() * 100000 + dayOfYear() * 100 + count;
    absAyah = Math.floor(seededRandom(seed) * TOTAL_AYAHS) + 1;
    if (cache?.absAyah && absAyah === cache.absAyah) absAyah = (absAyah % TOTAL_AYAHS) + 1;
  } else {
    absAyah = getDefaultAbsAyah();
  }

  const verse = await fetchAyah(absAyah);
  await Storage.set({ [QURAN_CACHE_KEY]: { ...verse, date: todayStr(), week: weekStr() } });
  renderVerse(verse);
}

async function renderVerse(v) {
  _verse = v;
  stopAudio();
  const el = id => document.getElementById(id);
  if (!el('quran-arabic')) return;

  const activeLangs = await getActiveLangs();
  el('quran-arabic').textContent      = activeLangs.arabic  ? (v.arabic  || '') : '';
  el('quran-translation').textContent = activeLangs.english ? (v.english ? `"${v.english}"` : '') : '';
  el('quran-bangla').textContent      = activeLangs.bangla  ? (v.bangla  ? `"${v.bangla}"`  : '') : '';
  el('quran-ref').textContent         = v.ref || '';

  const prefs  = await Storage.get(['visibilityQuran']);
  const widget = document.getElementById('quran-widget');
  const half   = document.getElementById('quran-half');
  const hide   = prefs.visibilityQuran === false;
  if (widget) widget.style.display = hide ? 'none' : '';
  if (half)   half.style.display   = hide ? 'none' : '';
  if (widget) widget.classList.add('loaded');
}

// ── Fav Verses ────────────────────────────────────────────────
// ── Correct absolute ayah from surah:ayah ─────────────────────
const SURAH_STARTS_ABS = [0,1,8,294,494,670,790,955,1161,1235,1365,1474,1597,1708,1751,1802,1902,2030,2141,2250,2349,2484,2596,2674,2792,2856,2933,3160,3253,3341,3411,3469,3504,3533,3607,3615,3627,3631,3641,3670,3703,3734,3765,3797,3827,3856,3887,3917,3945,3971,4000,4030,4059,4087,4114,4139,4163,4186,4211,4235,4258,4280,4301,4320,4337,4354,4370,4385,4399,4411,4422,4432,4441,4449,4458,4466,4474,4482,4490,4497,4505,4514,4524,4534,4545,4558,4571,4584,4596,4607,4615,4625,4636,4648,4656,4665,4672,4681,4690,4699,4707,4716,4725,4735,4744,4752,4762,4773,4781,4789,4797,4806,4815];

function surahAyahToAbs(surah, ayah) {
  // SURAH_STARTS_ABS[surah] is the 1-based absolute number of the first ayah of that surah
  return (SURAH_STARTS_ABS[surah] || 1) + (ayah - 1);
}

function buildAudioUrlsFav(surah, ayah) {
  const s3  = String(surah).padStart(3,'0');
  const a3  = String(ayah).padStart(3,'0');
  const abs = surahAyahToAbs(surah, ayah);
  return [
    `https://everyayah.com/data/Alafasy_128kbps/${s3}${a3}.mp3`,
    `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${abs}.mp3`,
    `https://verses.quran.com/Alafasy/mp3/${s3}${a3}.mp3`,
  ];
}

// ── Fav verse audio state — single active audio only ─────────
let _favAudio    = null;  // the Audio object
let _favAudioIdx = -1;    // which card index is playing

function _stopFavAudio() {
  if (_favAudio) {
    _favAudio.onended = null;
    _favAudio.onerror = null;
    _favAudio.pause();
    _favAudio.src = '';
    _favAudio = null;
  }
  // Reset icon of previously playing button
  if (_favAudioIdx >= 0) {
    const prev = document.querySelector(`.fav-play-btn[data-i="${_favAudioIdx}"]`);
    if (prev) _setFavIcon(prev, false);
  }
  _favAudioIdx = -1;
}

function _setFavIcon(btn, playing) {
  const PLAY_SVG  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
  const PAUSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
  btn.innerHTML = playing ? PAUSE_SVG : PLAY_SVG;
  btn.title     = playing ? 'Stop' : 'Play recitation';
  btn.classList.toggle('playing', playing);
}

function playFavVerse(idx, surah, ayah) {
  // Clicking same card while playing → stop
  if (_favAudioIdx === idx && _favAudio && !_favAudio.paused) {
    _stopFavAudio();
    return;
  }

  // Stop whatever was playing before
  _stopFavAudio();

  const btn = document.querySelector(`.fav-play-btn[data-i="${idx}"]`);
  if (!btn) return;

  const urls = buildAudioUrlsFav(surah, ayah);
  let urlIdx = 0;

  function tryNext() {
    if (urlIdx >= urls.length) {
      _setFavIcon(btn, false);
      _favAudio    = null;
      _favAudioIdx = -1;
      return;
    }
    const audio    = new Audio(urls[urlIdx++]);
    _favAudio      = audio;
    _favAudioIdx   = idx;
    audio.onended  = () => { _setFavIcon(btn, false); _favAudio = null; _favAudioIdx = -1; };
    audio.onerror  = () => { if (_favAudio === audio) tryNext(); };
    audio.play()
      .then(() => { if (_favAudio === audio) _setFavIcon(btn, true); })
      .catch(() => { if (_favAudio === audio) tryNext(); });
  }
  tryNext();
}

// Expose stop for use in renderFavVerses re-render
function stopAllFavAudios() { _stopFavAudio(); }

async function renderFavVerses() {
  // Remember which idx was playing so we can restore the icon after DOM rebuild
  const wasPlayingIdx = _favAudioIdx;

  const raw  = await Storage.get(QURAN_FAV_KEY);
  const favs = raw[QURAN_FAV_KEY] || [];
  const cont = document.getElementById('favverses-content');
  if (!cont) return;

  if (!favs.length) {
    cont.innerHTML = '<p class="favverses-empty">No favourites yet. Tap ❤️ on a verse to save it.</p>';
    return;
  }

  cont.innerHTML = '';
  favs.forEach((v, i) => {
    const card = document.createElement('div');
    card.className = 'fav-verse-card';

    let langHtml = '';
    if (v.arabic)  langHtml += `<div class="fav-verse-arabic">${escHtml(v.arabic)}</div>`;
    if (v.english) langHtml += `<div class="fav-verse-en">"${escHtml(v.english)}"</div>`;
    if (v.bangla)  langHtml += `<div class="fav-verse-bn">"${escHtml(v.bangla)}"</div>`;

    card.innerHTML = `
      ${langHtml}
      <div class="fav-verse-footer">
        <span class="fav-verse-ref">${escHtml(v.ref || '')}</span>
        <div class="fav-verse-actions">
          <button class="fav-play-btn quran-action-btn" data-i="${i}" title="Play recitation">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
          <button class="fav-verse-del quran-action-btn" data-i="${i}" title="Remove">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>`;

    // Wire play button
    const playBtn = card.querySelector('.fav-play-btn');
    playBtn.addEventListener('click', e => {
      e.stopPropagation();
      let surah = v.surah ? parseInt(v.surah) : 0;
      let ayah  = v.ayah  ? parseInt(v.ayah)  : 0;
      if (!surah || !ayah) {
        const match = (v.ref || '').match(/(\d+):(\d+)\s*$/);
        if (match) { surah = parseInt(match[1]); ayah = parseInt(match[2]); }
      }
      if (surah && ayah) playFavVerse(i, surah, ayah);
      else showToast('Could not determine verse location', 'error');
    });

    // Wire delete button
    const delBtn = card.querySelector('.fav-verse-del');
    delBtn.addEventListener('click', async e => {
      e.stopPropagation();
      // If this card's audio is playing, stop it
      if (_favAudioIdx === i) _stopFavAudio();
      const raw2 = await Storage.get(QURAN_FAV_KEY);
      const f2   = [...(raw2[QURAN_FAV_KEY] || [])];
      f2.splice(i, 1);
      await Storage.set({ [QURAN_FAV_KEY]: f2 });
      renderFavVerses();
    });

    cont.appendChild(card);
  });

  // Restore playing icon if audio is still going after DOM rebuild
  if (wasPlayingIdx >= 0 && _favAudio && !_favAudio.paused) {
    const btn = document.querySelector(`.fav-play-btn[data-i="${wasPlayingIdx}"]`);
    if (btn) _setFavIcon(btn, true);
  }
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Quran action buttons ──────────────────────────────────────
document.getElementById('quran-copy-btn').addEventListener('click', e => { e.stopPropagation();
  if (!_verse) return;
  const lines = [_verse.arabic, _verse.english ? `"${_verse.english}"` : '', _verse.ref || ''].filter(Boolean);
  navigator.clipboard.writeText(lines.join('\n')).then(() => showToast('Verse copied!'));
});

document.getElementById('quran-reload-btn').addEventListener('click', async e => { e.stopPropagation();
  const btn = document.getElementById('quran-reload-btn');
  btn.style.opacity='0.4'; btn.style.pointerEvents='none';
  await loadQuranVerse(true);
  btn.style.opacity=''; btn.style.pointerEvents='';
});

document.getElementById('quran-fav-btn').addEventListener('click', async e => {
  e.stopPropagation();
  if (!_verse) return;
  const raw  = await Storage.get(QURAN_FAV_KEY);
  const favs = raw[QURAN_FAV_KEY] || [];
  if (favs.some(f => f.ref === _verse.ref)) { showToast('Already saved!', 'info'); return; }

  // Save only the languages selected by user
  const saveLangs = await getFavSaveLangs();
  const toSave = { ref: _verse.ref, surah: _verse.surah, ayah: _verse.ayah };
  saveLangs.forEach(lang => { if (_verse[lang]) toSave[lang] = _verse[lang]; });

  favs.unshift(toSave);
  await Storage.set({ [QURAN_FAV_KEY]: favs });
  showToast('❤️ Verse saved!', 'success');
  renderFavVerses();
  const btn = document.getElementById('quran-fav-btn');
  btn.classList.add('saved');
  setTimeout(() => btn.classList.remove('saved'), 1200);
});

// ── Audio playback (main verse) ───────────────────────────────
const SURAH_STARTS = [0,1,8,294,494,670,790,955,1161,1235,1365,1474,1597,1708,1751,1802,1902,2030,2141,2250,2349,2484,2596,2674,2792,2856,2933,3160,3253,3341,3411,3469,3504,3533,3607,3615,3627,3631,3641,3670,3703,3734,3765,3797,3827,3856,3887,3917,3945,3971,4000,4030,4059,4087,4114,4139,4163,4186,4211,4235,4258,4280,4301,4320,4337,4354,4370,4385,4399,4411,4422,4432,4441,4449,4458,4466,4474,4482,4490,4497,4505,4514,4524,4534,4545,4558,4571,4584,4596,4607,4615,4625,4636,4648,4656,4665,4672,4681,4690,4699,4707,4716,4725,4735,4744,4752,4762,4773,4781,4789,4797,4806,4815,5000];
function buildAudioUrls(surah, ayah) {
  const s3=String(surah).padStart(3,'0'), a3=String(ayah).padStart(3,'0');
  const abs=(SURAH_STARTS[surah]||0)+ayah;
  return [`https://everyayah.com/data/Alafasy_128kbps/${s3}${a3}.mp3`,`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${abs}.mp3`,`https://verses.quran.com/Alafasy/mp3/${s3}${a3}.mp3`];
}
function stopAudio() {
  if (_audio){_audio.onended=null;_audio.onerror=null;_audio.pause();_audio.src='';_audio=null;}
  _audioPlay=false; setAudioIcon(false);
}
function setAudioIcon(playing) {
  _audioPlay=playing;
  const btn=document.getElementById('quran-audio-btn'); if(!btn) return;
  if(playing){btn.classList.add('playing');btn.title='Stop';btn.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;}
  else{btn.classList.remove('playing');btn.title='Play recitation';btn.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;}
}
async function tryPlayAudio(urls,idx=0){
  if(idx>=urls.length){setAudioIcon(false);_audioPlaying=false;return;}
  const audio=new Audio(); _audio=audio; audio.preload='none'; audio.src=urls[idx];
  audio.onended=()=>{if(_audio===audio){setAudioIcon(false);_audioPlaying=false;}};
  audio.onerror=()=>{if(_audio!==audio)return;tryPlayAudio(urls,idx+1);};
  try{await audio.play();if(_audio===audio)setAudioIcon(true);}catch{if(_audio!==audio)return;tryPlayAudio(urls,idx+1);}
}
document.getElementById('quran-audio-btn').addEventListener('click', e => { e.stopPropagation();
  if(!_verse)return; if(_audioPlay){stopAudio();_audioPlaying=false;return;} if(_audioPlaying)return; _audioPlaying=true; stopAudio(); tryPlayAudio(buildAudioUrls(_verse.surah,_verse.ayah));
});

renderFavVerses();
loadQuranVerse();
