// lock-settings.js — Browser Lock settings page
const LOCK_HASH_KEY = 'lockHash';
const LOCK_ENABLED  = 'lockEnabled';
const LOCK_SQ_KEY   = 'lockSecurityQuestions';

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

async function hashString(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── UI helpers ────────────────────────────────────────────────
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('hidden', !msg);
}

function showMsg(msg, isError = false) {
  const el = document.getElementById('lock-global-msg');
  el.textContent = msg;
  el.className = 'lock-msg ' + (isError ? 'error' : 'success');
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 3500);
}

function clearErrors() {
  ['pass-error','change-pass-error','sq-error'].forEach(id => showError(id, ''));
}

// ── Load and render state ─────────────────────────────────────
async function loadLockState() {
  const data    = await Storage.get([LOCK_HASH_KEY, LOCK_ENABLED, LOCK_SQ_KEY]);
  const enabled = !!data[LOCK_ENABLED];
  const hasPass = !!data[LOCK_HASH_KEY];

  // Toggle checkbox
  const chk = document.getElementById('lock-enabled-chk');
  chk.checked = enabled;
  updateStatusText(enabled);

  // Show/hide the forms section
  const formSection = document.getElementById('lock-form-section');
  formSection.style.display = enabled ? '' : 'none';

  // Show setup block or change block depending on whether password exists
  document.getElementById('lock-setup-block').classList.toggle('hidden', hasPass);
  document.getElementById('lock-change-block').classList.toggle('hidden', !hasPass);
  document.getElementById('lock-security-block').classList.toggle('hidden', !hasPass);

  // Restore saved security questions
  const sq = data[LOCK_SQ_KEY];
  if (sq) {
    if (sq[0] !== undefined) {
      const el = document.getElementById('sq1-q');
      if (el) el.value = sq[0].qIndex ?? 0;
      const a = document.getElementById('sq1-a');
      if (a) a.value = '';  // never reveal hashed answers
    }
    if (sq[1] !== undefined) {
      const el = document.getElementById('sq2-q');
      if (el) el.value = sq[1].qIndex ?? 1;
    }
  }

  // Default sq2 to a different question
  const sq2 = document.getElementById('sq2-q');
  const sq1 = document.getElementById('sq1-q');
  if (sq2 && sq1 && sq2.value === sq1.value) {
    sq2.value = (parseInt(sq1.value) + 1) % SECURITY_QUESTIONS.length;
  }
}

function updateStatusText(enabled) {
  const el = document.getElementById('lock-status-text');
  if (el) el.innerHTML = `Lock is <strong>${enabled ? 'enabled ✓' : 'disabled'}</strong>`;
}

// ── Toggle enable/disable ─────────────────────────────────────
document.getElementById('lock-enabled-chk').addEventListener('change', async function () {
  const data   = await Storage.get(LOCK_HASH_KEY);
  const hasPass = !!data[LOCK_HASH_KEY];

  if (this.checked && !hasPass) {
    // Can't enable without a password — show the form and revert
    this.checked = false;
    document.getElementById('lock-form-section').style.display = '';
    document.getElementById('lock-setup-block').classList.remove('hidden');
    showMsg('Set a password first, then enable the lock.', true);
    return;
  }

  await Storage.set({ [LOCK_ENABLED]: this.checked });
  updateStatusText(this.checked);
  document.getElementById('lock-form-section').style.display = this.checked ? '' : 'none';
  showMsg(this.checked ? '✓ Browser lock enabled.' : 'Browser lock disabled.');
});

// ── Set password ──────────────────────────────────────────────
document.getElementById('set-password-btn').addEventListener('click', async () => {
  clearErrors();
  const p1 = document.getElementById('new-password').value;
  const p2 = document.getElementById('confirm-password').value;
  if (!p1)          { showError('pass-error', 'Password cannot be empty.'); return; }
  if (p1.length < 4) { showError('pass-error', 'Password must be at least 4 characters.'); return; }
  if (p1 !== p2)    { showError('pass-error', 'Passwords do not match.'); return; }

  const hash = await hashString(p1);
  await Storage.set({ [LOCK_HASH_KEY]: hash, [LOCK_ENABLED]: true });
  document.getElementById('new-password').value = '';
  document.getElementById('confirm-password').value = '';
  showMsg('✓ Password set! Browser lock is now enabled.');
  await loadLockState();
});

// ── Change password ───────────────────────────────────────────
document.getElementById('change-password-btn').addEventListener('click', async () => {
  clearErrors();
  const cur = document.getElementById('current-password').value;
  const p1  = document.getElementById('change-new-password').value;
  const p2  = document.getElementById('change-confirm-password').value;

  const data    = await Storage.get(LOCK_HASH_KEY);
  const curHash = await hashString(cur);
  if (!cur)                        { showError('change-pass-error', 'Enter your current password.'); return; }
  if (curHash !== data[LOCK_HASH_KEY]) { showError('change-pass-error', 'Current password is incorrect.'); return; }
  if (!p1)                         { showError('change-pass-error', 'New password cannot be empty.'); return; }
  if (p1.length < 4)               { showError('change-pass-error', 'Password must be at least 4 characters.'); return; }
  if (p1 !== p2)                   { showError('change-pass-error', 'New passwords do not match.'); return; }

  const hash = await hashString(p1);
  await Storage.set({ [LOCK_HASH_KEY]: hash });
  document.getElementById('current-password').value = '';
  document.getElementById('change-new-password').value = '';
  document.getElementById('change-confirm-password').value = '';
  showMsg('✓ Password changed successfully.');
});

// ── Remove password ───────────────────────────────────────────
document.getElementById('remove-password-btn').addEventListener('click', async () => {
  clearErrors();
  const cur = document.getElementById('current-password').value;
  if (!cur) { showError('change-pass-error', 'Enter your current password to remove it.'); return; }

  const data    = await Storage.get(LOCK_HASH_KEY);
  const curHash = await hashString(cur);
  if (curHash !== data[LOCK_HASH_KEY]) { showError('change-pass-error', 'Incorrect password.'); return; }

  await Storage.remove([LOCK_HASH_KEY]);
  await Storage.set({ [LOCK_ENABLED]: false });
  document.getElementById('current-password').value = '';
  showMsg('Password removed. Browser lock disabled.');
  await loadLockState();
});

// ── Save security questions ───────────────────────────────────
document.getElementById('save-sq-btn').addEventListener('click', async () => {
  clearErrors();
  const sq1Q = parseInt(document.getElementById('sq1-q').value);
  const sq1A = document.getElementById('sq1-a').value.trim().toLowerCase();
  const sq2Q = parseInt(document.getElementById('sq2-q').value);
  const sq2A = document.getElementById('sq2-a').value.trim().toLowerCase();

  if (!sq1A || !sq2A)  { showError('sq-error', 'Please answer both questions.'); return; }
  if (sq1Q === sq2Q)   { showError('sq-error', 'Please choose two different questions.'); return; }

  const h1 = await hashString(sq1A);
  const h2 = await hashString(sq2A);
  await Storage.set({ [LOCK_SQ_KEY]: [{ qIndex: sq1Q, answerHash: h1 }, { qIndex: sq2Q, answerHash: h2 }] });
  document.getElementById('sq1-a').value = '';
  document.getElementById('sq2-a').value = '';
  showMsg('✓ Security questions saved.');
});

// ── Back to new tab ───────────────────────────────────────────
document.getElementById('close-lock-settings').addEventListener('click', e => {
  e.preventDefault();
  // Try to navigate current tab back; fallback to closing
  try { chrome.tabs.update({ url: 'chrome://newtab' }); } catch { window.close(); }
});

// ── Apply saved theme to this page ───────────────────────────
async function applyTheme() {
  const data = await Storage.get('theme');
  const theme = data.theme || 'dark';
  document.body.classList.remove('theme-dark','theme-light','theme-amoled','theme-ocean','theme-forest','theme-sunset','theme-nord','theme-rose-gold','theme-solarized');
  document.body.classList.add('theme-' + theme);
}

applyTheme();
loadLockState();
