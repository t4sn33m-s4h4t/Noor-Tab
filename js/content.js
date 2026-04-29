// content.js — Content script: dhikr popup on all pages

(function() {
  // Don't inject in chrome:// or extension pages
  if (location.protocol === 'chrome-extension:' || location.protocol === 'chrome:') return;

  const DHIKRS = [
    { arabic: 'سُبْحَانَ اللّهِ',        latin: 'SubhanAllah',       meaning: 'Glory be to Allah' },
    { arabic: 'الْحَمْدُ لِلّهِ',         latin: 'Alhamdulillah',    meaning: 'All praise be to Allah' },
    { arabic: 'اللّهُ أَكْبَرُ',           latin: 'Allahu Akbar',     meaning: 'Allah is the Greatest' },
    { arabic: 'لَا إِلَٰهَ إِلَّا اللّهُ', latin: 'La ilaha illallah', meaning: 'There is no god but Allah' },
    { arabic: 'أَسْتَغْفِرُ اللّهَ',       latin: 'Astaghfirullah',  meaning: 'I seek forgiveness from Allah' },
    { arabic: 'سُبْحَانَ اللّهِ وَبِحَمْدِهِ', latin: 'SubhanAllahi wa bihamdihi', meaning: 'Glory and praise be to Allah' },
    { arabic: 'حَسْبُنَا اللّهُ وَنِعْمَ الْوَكِيلُ', latin: "HasbunAllahu wa ni'mal wakeel", meaning: 'Allah is sufficient for us' },
    { arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللّهِ', latin: 'La hawla wa la quwwata illa billah', meaning: 'No power except with Allah' },
    { arabic: 'يَا حَيُّ يَا قَيُّومُ',    latin: 'Ya Hayyu Ya Qayyum', meaning: 'O Ever-Living, O Sustainer' },
    { arabic: 'رَبَّنَا لَا تُؤَاخِذْنَا',   latin: "Rabbana la tu'akhidhna", meaning: 'Our Lord, do not hold us accountable' },
  ];

  function injectDhikrPopup() {
    if (document.getElementById('__noor_dhikr_popup__')) return;

    const style = document.createElement('style');
    style.textContent = `
      #__noor_dhikr_popup__ {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        background: rgba(20,20,30,0.95);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 16px;
        padding: 18px 22px 14px;
        min-width: 240px;
        max-width: 320px;
        color: #fff;
        font-family: 'Segoe UI', system-ui, sans-serif;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        backdrop-filter: blur(12px);
        transform: translateY(20px);
        opacity: 0;
        transition: opacity 0.4s ease, transform 0.4s ease;
        pointer-events: none;
      }
      #__noor_dhikr_popup__.show {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      #__noor_dhikr_popup__ .dp-arabic {
        font-family: 'Amiri', 'Traditional Arabic', serif;
        font-size: 1.5rem;
        text-align: center;
        direction: rtl;
        margin-bottom: 8px;
        color: #c9a84c;
      }
      #__noor_dhikr_popup__ .dp-latin {
        font-size: 0.85rem;
        text-align: center;
        color: #aaa;
        margin-bottom: 2px;
      }
      #__noor_dhikr_popup__ .dp-meaning {
        font-size: 0.78rem;
        text-align: center;
        color: #888;
      }
      #__noor_dhikr_popup__ .dp-close {
        position: absolute;
        top: 8px; right: 10px;
        background: none; border: none;
        color: #888; cursor: pointer;
        font-size: 14px; padding: 2px 4px;
      }
      #__noor_dhikr_popup__ .dp-close:hover { color: #fff; }
    `;
    document.head.appendChild(style);

    const popup = document.createElement('div');
    popup.id = '__noor_dhikr_popup__';
    popup.innerHTML = `
      <button class="dp-close" id="__noor_dhikr_close__">✕</button>
      <div class="dp-arabic" id="__noor_dhikr_arabic__"></div>
      <div class="dp-latin" id="__noor_dhikr_latin__"></div>
      <div class="dp-meaning" id="__noor_dhikr_meaning__"></div>
    `;
    document.body.appendChild(popup);

    document.getElementById('__noor_dhikr_close__').addEventListener('click', () => {
      popup.classList.remove('show');
    });
  }

  function showDhikrPopup(idx) {
    injectDhikrPopup();
    const d = DHIKRS[idx % DHIKRS.length];
    document.getElementById('__noor_dhikr_arabic__').textContent  = d.arabic;
    document.getElementById('__noor_dhikr_latin__').textContent   = d.latin;
    document.getElementById('__noor_dhikr_meaning__').textContent = d.meaning;
    const popup = document.getElementById('__noor_dhikr_popup__');
    popup.classList.add('show');
    setTimeout(() => { if (popup) popup.classList.remove('show'); }, 8000);
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'SHOW_DHIKR') {
      showDhikrPopup(msg.idx || 0);
    }
  });
})();
