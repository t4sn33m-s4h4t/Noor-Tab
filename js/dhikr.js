// dhikr.js — Periodic dhikr reminder popup (works on all pages via background.js alarm)
// For newtab page: shows popup inline. For other pages: uses chrome.runtime message.

const DHIKRS = [
  { arabic: 'سُبْحَانَ اللّهِ',        latin: 'SubhanAllah',       meaning: 'Glory be to Allah' },
  { arabic: 'الْحَمْدُ لِلّهِ',         latin: 'Alhamdulillah',    meaning: 'All praise be to Allah' },
  { arabic: 'اللّهُ أَكْبَرُ',           latin: 'Allahu Akbar',     meaning: 'Allah is the Greatest' },
  { arabic: 'لَا إِلَٰهَ إِلَّا اللّهُ', latin: 'La ilaha illallah', meaning: 'There is no god but Allah' },
  { arabic: 'أَسْتَغْفِرُ اللّهَ',       latin: 'Astaghfirullah',  meaning: 'I seek forgiveness from Allah' },
  { arabic: 'سُبْحَانَ اللّهِ وَبِحَمْدِهِ', latin: 'SubhanAllahi wa bihamdihi', meaning: 'Glory and praise be to Allah' },
  { arabic: 'حَسْبُنَا اللّهُ وَنِعْمَ الْوَكِيلُ', latin: "HasbunAllahu wa ni'mal wakeel", meaning: 'Allah is sufficient for us and the best guardian' },
  { arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللّهِ', latin: 'La hawla wa la quwwata illa billah', meaning: 'There is no power except with Allah' },
  { arabic: 'يَا حَيُّ يَا قَيُّومُ',    latin: 'Ya Hayyu Ya Qayyum', meaning: 'O Ever-Living, O Sustainer' },
  { arabic: 'رَبَّنَا لَا تُؤَاخِذْنَا',   latin: "Rabbana la tu'akhidhna", meaning: 'Our Lord, do not hold us accountable' },
];

let _dhikrTimer = null;
let _dhikrIdx   = 0;

function showDhikr() {
  const d   = DHIKRS[_dhikrIdx % DHIKRS.length];
  _dhikrIdx = (_dhikrIdx + 1) % DHIKRS.length;

  const popup = document.getElementById('dhikr-popup');
  if (!popup) return;

  document.getElementById('dhikr-popup-text').textContent    = d.arabic;
  document.getElementById('dhikr-popup-latin').textContent   = d.latin;
  document.getElementById('dhikr-popup-meaning').textContent = d.meaning;

  const backdrop = document.getElementById('dhikr-backdrop');
  if (backdrop) backdrop.classList.add('show');
  popup.classList.remove('hidden');
  void popup.offsetWidth;
  popup.classList.add('show');

  // Auto-hide after 7 seconds
  setTimeout(hideDhikr, 7000);
}

function hideDhikr() {
  const popup = document.getElementById('dhikr-popup');
  const backdrop = document.getElementById('dhikr-backdrop');
  if (!popup) return;
  popup.classList.remove('show');
  if (backdrop) backdrop.classList.remove('show');
  setTimeout(() => popup.classList.add('hidden'), 400);
}

function startDhikrTimer(minutes) {
  if (_dhikrTimer) { clearInterval(_dhikrTimer); _dhikrTimer = null; }
  if (!minutes || minutes <= 0) return;
  const ms = parseInt(minutes) * 60 * 1000;
  _dhikrTimer = setInterval(showDhikr, ms);
}

async function initDhikr() {
  const data = await Storage.get(['dhikrEnabled', 'dhikrInterval']);
  if (data.dhikrEnabled) {
    startDhikrTimer(parseInt(data.dhikrInterval) || 15);
  }

  // Listen for messages from background script (cross-page dhikr)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'SHOW_DHIKR') {
        // Pick dhikr by index from message if provided
        if (typeof msg.idx === 'number') _dhikrIdx = msg.idx;
        showDhikr();
      }
    });
  }
}

const closeBtn = document.getElementById('dhikr-popup-close');
if (closeBtn) closeBtn.addEventListener('click', hideDhikr);
const backdrop = document.getElementById('dhikr-backdrop');
if (backdrop) backdrop.addEventListener('click', hideDhikr);

window.applyDhikrSettings = function(enabled, minutes) {
  if (enabled) {
    startDhikrTimer(parseInt(minutes) || 15);
  } else {
    if (_dhikrTimer) clearInterval(_dhikrTimer);
    _dhikrTimer = null;
  }
};

initDhikr();
