// sync.js — Firebase Google Sign-In + Firestore cloud sync
//
// SETUP (one time):
// 1. Go to console.firebase.google.com
// 2. Create project → Enable Firestore + Google Auth
// 3. Go to Project Settings → copy firebaseConfig object as JSON
// 4. Paste into Settings → Cloud Sync → Firebase Config JSON → Save
//
// Data synced: links, settings, salahData, salahStreak, habits

const SYNC_KEYS = ['links', 'userName', 'theme', 'bgCategory', 'bgInterval',
  'unsplashKey', 'visibilityClock', 'visibilityLinks', 'visibilityStats',
  'salahData', 'salahStreak', 'habits'];

const FB_CONFIG_KEY = 'firebaseConfig';

let _auth = null;
let _db   = null;
let _user = null;
let _unsubscribe = null;

// ── Load Firebase dynamically from CDN ───────────────────
async function loadFirebaseSDK() {
  if (window._firebaseLoaded) return true;
  try {
    await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');
    window._firebaseLoaded = true;
    return true;
  } catch (e) {
    console.warn('[Sync] Failed to load Firebase SDK:', e);
    return false;
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ── Init Firebase ────────────────────────────────────────
async function initFirebase() {
  const data = await Storage.get(FB_CONFIG_KEY);
  let config = data[FB_CONFIG_KEY];
  if (!config) return false;

  // Config stored as JSON string
  if (typeof config === 'string') {
    try { config = JSON.parse(config); } catch { return false; }
  }
  if (!config.apiKey || !config.projectId) return false;

  const loaded = await loadFirebaseSDK();
  if (!loaded) return false;

  try {
    // Initialize only once
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    _auth = firebase.auth();
    _db   = firebase.firestore();
    return true;
  } catch (e) {
    console.warn('[Sync] Firebase init error:', e);
    return false;
  }
}

// ── Auth state observer ──────────────────────────────────
async function startAuthObserver() {
  const ok = await initFirebase();
  if (!ok) return;

  _auth.onAuthStateChanged(async user => {
    _user = user;
    if (user) {
      showSignedIn(user);
      await pullFromCloud(); // pull first on sign-in
      startRealtimeSync();
    } else {
      showSignedOut();
      if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
    }
  });
}

// ── Sign in ──────────────────────────────────────────────
async function signInWithGoogle() {
  const ok = await initFirebase();
  if (!ok) {
    setStatus('❌ Firebase not configured. Paste your config above and save first.', 'err');
    return;
  }
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await _auth.signInWithPopup(provider);
  } catch (e) {
    setStatus('❌ Sign-in failed: ' + e.message, 'err');
  }
}

async function signOut() {
  if (_auth) await _auth.signOut();
}

// ── Push to cloud ────────────────────────────────────────
async function pushToCloud() {
  if (!_user || !_db) return;
  try {
    setStatus('⏳ Syncing…');
    const data = await Storage.get(SYNC_KEYS);
    const payload = {};
    SYNC_KEYS.forEach(k => { if (data[k] !== undefined) payload[k] = data[k]; });
    payload._updatedAt = new Date().toISOString();
    await _db.collection('users').doc(_user.uid).set(payload, { merge: true });
    setStatus('✓ Synced ' + new Date().toLocaleTimeString(), 'ok');
  } catch (e) {
    setStatus('❌ Sync failed: ' + e.message, 'err');
  }
}

// ── Pull from cloud ──────────────────────────────────────
async function pullFromCloud() {
  if (!_user || !_db) return;
  try {
    const doc = await _db.collection('users').doc(_user.uid).get();
    if (doc.exists) {
      const data = doc.data();
      const toStore = {};
      SYNC_KEYS.forEach(k => { if (data[k] !== undefined) toStore[k] = data[k]; });
      await Storage.set(toStore);
      // Re-apply settings & re-render after pull
      if (typeof loadSettings === 'function') loadSettings();
      if (typeof loadLinks    === 'function') loadLinks();
      if (typeof loadHabits   === 'function') loadHabits();
      if (typeof renderSalah  === 'function') renderSalah();
      setStatus('✓ Pulled from cloud', 'ok');
    }
  } catch (e) {
    setStatus('❌ Pull failed: ' + e.message, 'err');
  }
}

// ── Real-time listener — push local changes to cloud ─────
function startRealtimeSync() {
  // Watch for storage changes and auto-push (debounced)
  let pushTimer = null;
  const debouncedPush = () => {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushToCloud, 3000);
  };
  // Patch Storage.set to trigger push
  const _origSet = Storage.set.bind(Storage);
  Storage.set = async (obj) => {
    await _origSet(obj);
    const keys = Object.keys(obj);
    if (keys.some(k => SYNC_KEYS.includes(k))) debouncedPush();
  };
}

// ── UI helpers ───────────────────────────────────────────
function showSignedOut() {
  document.getElementById('sync-signed-out').classList.remove('hidden');
  document.getElementById('sync-signed-in').classList.add('hidden');
}

function showSignedIn(user) {
  document.getElementById('sync-signed-out').classList.add('hidden');
  document.getElementById('sync-signed-in').classList.remove('hidden');
  const photo = document.getElementById('sync-user-photo');
  photo.src = user.photoURL || '';
  photo.style.display = user.photoURL ? '' : 'none';
  document.getElementById('sync-user-name').textContent  = user.displayName || '';
  document.getElementById('sync-user-email').textContent = user.email || '';
}

function setStatus(msg, type = '') {
  const el = document.getElementById('sync-status');
  if (!el) return;
  el.textContent  = msg;
  el.className    = 'sync-status' + (type ? ' ' + type : '');
}

// ── Wire buttons ─────────────────────────────────────────
document.getElementById('google-signin-btn').addEventListener('click', signInWithGoogle);
document.getElementById('google-signout-btn').addEventListener('click', signOut);
document.getElementById('sync-now-btn').addEventListener('click', pushToCloud);

// Save Firebase config alongside main settings save
const _origSave = document.getElementById('settings-save');
_origSave.addEventListener('click', async () => {
  const raw = document.getElementById('setting-firebase-config').value.trim();
  if (raw) {
    try {
      JSON.parse(raw); // validate JSON
      await Storage.set({ [FB_CONFIG_KEY]: raw });
    } catch { /* invalid JSON — ignore */ }
  }
});

// ── Init ─────────────────────────────────────────────────
// Load saved config into textarea
Storage.get(FB_CONFIG_KEY).then(data => {
  if (data[FB_CONFIG_KEY]) {
    const el = document.getElementById('setting-firebase-config');
    if (el) el.value = typeof data[FB_CONFIG_KEY] === 'string'
      ? data[FB_CONFIG_KEY]
      : JSON.stringify(data[FB_CONFIG_KEY], null, 2);
  }
});

startAuthObserver();
