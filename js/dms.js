// dms.js — Dead Man's Switch
//
// HOW IT WORKS:
// The background service worker holds `dmsArmed = true` in memory.
// When Chrome starts fresh that flag is true. The very first new tab
// asks the background "should DMS fire?" — background replies yes and
// immediately flips the flag to false. Every other new tab in the same
// session gets false and DMS never shows. When Chrome fully closes and
// reopens, the service worker restarts and dmsArmed is true again.
//
// On timeout: closes ALL Chrome windows (entire browser).
// No key hints shown — only you know the combo.

const ALL_KEYS = [
  'None','Ctrl','Alt','Shift','Meta',
  'A','B','C','D','E','F','G','H','I','J','K','L','M',
  'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
  '1','2','3','4','5','6','7','8','9','0',
  'Space','Enter','Escape','Tab','Backspace',
  'ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
  '`','-','=','[',']','\\',';',"'",',','.','/'
];

const DMS_DEFAULTS = {
  dmsEnabled: false,
  dmsKey1: 'Ctrl',
  dmsKey2: 'Alt',
  dmsKey3: 'K',
  dmsTimeout: 5,
};

let dmsInterval = null;

// ── Populate key dropdowns ───────────────────────────────
function populateKeyDropdowns() {
  ['dms-key1', 'dms-key2', 'dms-key3'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = ALL_KEYS.map(k => `<option value="${k}">${k}</option>`).join('');
  });
}

async function loadDmsSettings() {
  const data = await Storage.get(Object.keys(DMS_DEFAULTS));
  const s = { ...DMS_DEFAULTS, ...data };
  document.getElementById('dms-enabled').checked        = !!s.dmsEnabled;
  document.getElementById('dms-key1').value             = s.dmsKey1 || 'Ctrl';
  document.getElementById('dms-key2').value             = s.dmsKey2 || 'Alt';
  document.getElementById('dms-key3').value             = s.dmsKey3 || 'K';
  document.getElementById('dms-timeout').value          = s.dmsTimeout || 5;
  document.getElementById('dms-timeout-val').textContent = s.dmsTimeout || 5;
}

// ── Ask the background service worker if DMS should fire ──
// The background flips its in-memory flag after the first call,
// so only the very first new tab of a browser session gets true.
function askBackgroundShouldFire() {
  return new Promise(resolve => {
    try {
      chrome.runtime.sendMessage({ type: 'DMS_CHECK' }, (response) => {
        if (chrome.runtime.lastError) { resolve(false); return; }
        resolve(response && response.shouldFire === true);
      });
    } catch { resolve(false); }
  });
}

// ── Main entry ───────────────────────────────────────────
async function checkAndActivateDms() {
  const data = await Storage.get(Object.keys(DMS_DEFAULTS));
  const s = { ...DMS_DEFAULTS, ...data };

  if (!s.dmsEnabled) return;

  const shouldFire = await askBackgroundShouldFire();
  if (!shouldFire) return;

  showDmsOverlay(s);
}

// ── Overlay ──────────────────────────────────────────────
function showDmsOverlay(s) {
  const overlay   = document.getElementById('dms-overlay');
  const countdown = document.getElementById('dms-countdown');
  const ring      = document.getElementById('dms-ring');
  const hintEl    = document.getElementById('dms-keys-hint');
  const CIRCUM    = 276.46;

  // Show overlay — no hints, no instructions
  overlay.classList.remove('hidden');
  if (hintEl) hintEl.textContent = ''; // silent — only you know the combo

  const timeout = parseInt(s.dmsTimeout) || 5;
  let timeLeft  = timeout;

  countdown.textContent = timeLeft;
  ring.style.stroke = 'var(--accent)';
  ring.style.strokeDashoffset = 0;

  // Steal focus immediately so keystrokes register without any click
  overlay.setAttribute('tabindex', '-1');
  overlay.focus({ preventScroll: true });

  const keys = [s.dmsKey1, s.dmsKey2, s.dmsKey3].filter(k => k && k !== 'None');
  const pressedKeys = new Set();

  function normaliseKey(e) {
    if (e.key === ' ')         return 'Space';
    if (e.key === 'Control')   return 'Ctrl';
    if (e.key === 'Alt')       return 'Alt';
    if (e.key === 'Shift')     return 'Shift';
    if (e.key === 'Meta')      return 'Meta';
    if (e.key.length === 1)    return e.key.toUpperCase();
    return e.key;
  }

  function onKeyDown(e) {
    e.preventDefault(); // block all browser shortcuts while DMS is active
    pressedKeys.add(normaliseKey(e));
    if (e.ctrlKey)  pressedKeys.add('Ctrl');
    if (e.altKey)   pressedKeys.add('Alt');
    if (e.shiftKey) pressedKeys.add('Shift');
    if (e.metaKey)  pressedKeys.add('Meta');

    if (keys.length > 0 && keys.every(k => pressedKeys.has(k))) {
      dismiss();
    }
  }

  function onKeyUp(e) {
    pressedKeys.delete(normaliseKey(e));
    if (!e.ctrlKey)  pressedKeys.delete('Ctrl');
    if (!e.altKey)   pressedKeys.delete('Alt');
    if (!e.shiftKey) pressedKeys.delete('Shift');
    if (!e.metaKey)  pressedKeys.delete('Meta');
  }

  // Attach to both overlay and document — belt and suspenders for focus
  overlay.addEventListener('keydown', onKeyDown);
  document.addEventListener('keydown', onKeyDown);
  overlay.addEventListener('keyup',   onKeyUp);
  document.addEventListener('keyup',  onKeyUp);

  function cleanup() {
    clearInterval(dmsInterval);
    overlay.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keydown', onKeyDown);
    overlay.removeEventListener('keyup',   onKeyUp);
    document.removeEventListener('keyup',  onKeyUp);
  }

  function dismiss() {
    cleanup();
    overlay.classList.add('hidden');
    // Flag is already cleared in background — nothing else needed
  }

  function closeEntireBrowser() {
    cleanup();
    // Tell the background to close all windows (it has the windows permission)
    chrome.runtime.sendMessage({ type: 'CLOSE_ALL_WINDOWS' });
  }

  dmsInterval = setInterval(() => {
    timeLeft--;
    countdown.textContent = timeLeft;
    ring.style.strokeDashoffset = CIRCUM * (1 - timeLeft / timeout);
    if (timeLeft <= 3) ring.style.stroke = '#ff6b6b';
    if (timeLeft <= 0) closeEntireBrowser();
  }, 1000);
}

// ── Settings wiring ──────────────────────────────────────
document.getElementById('dms-timeout').addEventListener('input', (e) => {
  document.getElementById('dms-timeout-val').textContent = e.target.value;
});

window._saveDmsSettings = async function () {
  await Storage.set({
    dmsEnabled: document.getElementById('dms-enabled').checked,
    dmsKey1:    document.getElementById('dms-key1').value,
    dmsKey2:    document.getElementById('dms-key2').value,
    dmsKey3:    document.getElementById('dms-key3').value,
    dmsTimeout: parseInt(document.getElementById('dms-timeout').value),
  });
};

// ── Init ─────────────────────────────────────────────────
populateKeyDropdowns();
loadDmsSettings();
checkAndActivateDms();
