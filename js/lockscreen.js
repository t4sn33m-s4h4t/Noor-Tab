// lockscreen.js — Blank lock screen. Uses chrome.storage.local directly. No wrapper.
const LOCK_HASH_KEY = 'lockHash';
const LOCK_SQ_KEY   = 'lockSecurityQuestions';
const ATTEMPTS_KEY  = 'lockAttempts';
const LOCKOUT_KEY   = 'lockoutUntil';
const MAX_ATTEMPTS  = 5;
const LOCKOUT_MS    = 5 * 60 * 1000;

const input      = document.getElementById('lock-input');
const lockoutMsg = document.getElementById('lockout-msg');

// Prevent double-submit
let _unlocking = false;

async function hashString(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function storageGet(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}
function storageSet(obj) {
  return new Promise(resolve => chrome.storage.local.set(obj, resolve));
}

async function applyTheme() {
  const data = await storageGet('theme');
  const t    = data.theme || 'dark';
  const bgs  = { dark:'#0a0c18', light:'#f0f4ff', amoled:'#000000', ocean:'#060d1a', forest:'#060d0a', sunset:'#1a0c12', nord:'#0f111a', 'rose-gold':'#1a0f14', solarized:'#002b36' };
  document.body.style.background = bgs[t] || '#0a0c18';
}

async function checkLockout() {
  const data  = await storageGet(LOCKOUT_KEY);
  const until = data[LOCKOUT_KEY] || 0;
  if (Date.now() < until) {
    const rem  = Math.ceil((until - Date.now()) / 1000);
    lockoutMsg.textContent = `Try again in ${Math.floor(rem/60)}:${String(rem%60).padStart(2,'0')}`;
    lockoutMsg.classList.remove('hidden');
    input.disabled = true;
    setTimeout(checkLockout, 1000);
    return true;
  }
  lockoutMsg.classList.add('hidden');
  input.disabled = false;
  return false;
}

async function doUnlock() {
  // Tell background to restore session, THEN close this window
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, 2000); // fallback after 2s
      chrome.runtime.sendMessage({ type: 'UNLOCK_BROWSER' }, () => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) resolve(); // ignore errors, still proceed
        else resolve();
      });
    });
  } catch {}
  // Small delay so background can start opening windows before we close
  setTimeout(() => window.close(), 400);
}

async function tryUnlock(password) {
  if (!password || _unlocking) return;
  _unlocking = true;

  try {
    const isLocked = await checkLockout();
    if (isLocked) { _unlocking = false; return; }

    const data       = await storageGet([LOCK_HASH_KEY, ATTEMPTS_KEY]);
    const storedHash = data[LOCK_HASH_KEY];

    // No password set — just unlock
    if (!storedHash) { await doUnlock(); return; }

    const inputHash = await hashString(password);

    if (inputHash === storedHash) {
      await storageSet({ [ATTEMPTS_KEY]: 0 });
      await doUnlock();
    } else {
      _unlocking = false;
      const attempts = (data[ATTEMPTS_KEY] || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await storageSet({ [LOCKOUT_KEY]: Date.now() + LOCKOUT_MS, [ATTEMPTS_KEY]: 0 });
      } else {
        await storageSet({ [ATTEMPTS_KEY]: attempts });
      }
      input.value = '';
      document.body.classList.add('shake');
      setTimeout(() => document.body.classList.remove('shake'), 400);
      await checkLockout();
    }
  } catch (e) {
    _unlocking = false;
    console.error('[LockScreen] Error:', e);
  }
}

// ── Forgot password (F1) ──────────────────────────────────────
const SECURITY_QUESTIONS = [
  'What was the name of your first pet?',
  'What city were you born in?',
  'What is the name of the street you grew up on?',
  'What was the name of your primary school?',
  'What is your oldest sibling\'s middle name?',
  'What was the make of your first car?',
  'In what city did your parents meet?',
  'What was your childhood nickname?',
];

async function startForgotFlow() {
  const data = await storageGet(LOCK_SQ_KEY);
  const sq   = data[LOCK_SQ_KEY];
  if (!sq || !sq.length) return;

  let step = 0;
  const overlay  = document.createElement('div'); overlay.className = 'forgot-overlay';
  const box      = document.createElement('div'); box.className = 'forgot-box';
  const title    = document.createElement('p');   title.className = 'forgot-title'; title.textContent = 'Answer your security questions to reset password.';
  const qEl      = document.createElement('p');   qEl.className = 'forgot-question';
  const aEl      = document.createElement('input'); aEl.type='text'; aEl.className='forgot-input'; aEl.autocomplete='off';
  const errEl    = document.createElement('p');   errEl.className = 'forgot-error hidden';
  const btnRow   = document.createElement('div'); btnRow.className = 'forgot-btn-row';
  const nextBtn  = document.createElement('button'); nextBtn.textContent='Next';   nextBtn.className='forgot-btn';
  const cancelBtn= document.createElement('button'); cancelBtn.textContent='Cancel'; cancelBtn.className='forgot-btn-cancel';

  btnRow.appendChild(cancelBtn); btnRow.appendChild(nextBtn);
  box.appendChild(title); box.appendChild(qEl); box.appendChild(aEl); box.appendChild(errEl); box.appendChild(btnRow);
  overlay.appendChild(box); document.body.appendChild(overlay);

  const showStep = i => { qEl.textContent = SECURITY_QUESTIONS[sq[i].qIndex] || '?'; aEl.value=''; aEl.focus(); errEl.classList.add('hidden'); };
  showStep(0);

  nextBtn.addEventListener('click', async () => {
    const h = await hashString(aEl.value.trim().toLowerCase());
    if (h !== sq[step].answerHash) { errEl.textContent='Incorrect answer.'; errEl.classList.remove('hidden'); return; }
    step++;
    if (step < sq.length) showStep(step);
    else { overlay.remove(); showResetPassword(); }
  });
  cancelBtn.addEventListener('click', () => { overlay.remove(); input.focus(); });
  aEl.addEventListener('keydown', e => { if (e.key==='Enter') nextBtn.click(); });
}

function showResetPassword() {
  const overlay = document.createElement('div'); overlay.className='forgot-overlay';
  const box = document.createElement('div');     box.className='forgot-box';
  const title=document.createElement('p');       title.className='forgot-title'; title.textContent='Set a new password';
  const p1 = document.createElement('input');   p1.type='password'; p1.className='forgot-input'; p1.placeholder='New password'; p1.autocomplete='new-password';
  const p2 = document.createElement('input');   p2.type='password'; p2.className='forgot-input'; p2.placeholder='Confirm password'; p2.style.marginTop='8px'; p2.autocomplete='new-password';
  const errEl = document.createElement('p');    errEl.className='forgot-error hidden';
  const btn = document.createElement('button'); btn.textContent='Set Password'; btn.className='forgot-btn'; btn.style.marginTop='10px';

  box.appendChild(title); box.appendChild(p1); box.appendChild(p2); box.appendChild(errEl); box.appendChild(btn);
  overlay.appendChild(box); document.body.appendChild(overlay);
  p1.focus();

  btn.addEventListener('click', async () => {
    if (!p1.value)             { errEl.textContent='Password cannot be empty.'; errEl.classList.remove('hidden'); return; }
    if (p1.value !== p2.value) { errEl.textContent='Passwords do not match.';   errEl.classList.remove('hidden'); return; }
    const hash = await hashString(p1.value);
    await storageSet({ [LOCK_HASH_KEY]: hash, [ATTEMPTS_KEY]: 0 });
    overlay.remove();
    await doUnlock();
  });
  p1.addEventListener('keydown', e => { if (e.key==='Enter') p2.focus(); });
  p2.addEventListener('keydown', e => { if (e.key==='Enter') btn.click(); });
}

// ── Input: Enter to submit ────────────────────────────────────
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const pwd = input.value;
    input.value = ''; // clear immediately so it feels snappy
    tryUnlock(pwd);
  }
  if (e.key === 'F1') { e.preventDefault(); startForgotFlow(); }
});

window.addEventListener('load', async () => {
  await applyTheme();
  input.focus();
  checkLockout();
});

document.addEventListener('click', () => { if (!input.disabled) input.focus(); });
