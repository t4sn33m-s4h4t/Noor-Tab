// background.js — Service worker: stats + browser lock only. MV3 compliant.
const STATS_KEY      = 'siteStats';
const STATS_DATE_KEY = 'siteStatsDate';
const LOCK_HASH_KEY  = 'lockHash';
const LOCK_ENABLED   = 'lockEnabled';
const LOCK_SESSION   = 'lockSession';

let activeTabId    = null;
let activeUrl      = null;
let lastActiveTime = null;
let dmsArmed       = true;

function getDomain(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (['chrome:', 'chrome-extension:', 'about:', 'moz-extension:'].includes(u.protocol)) return null;
    return u.hostname.replace(/^www\./, '');
  } catch { return null; }
}

async function checkReset() {
  const data  = await chrome.storage.local.get([STATS_DATE_KEY]);
  const today = new Date().toDateString();
  if (data[STATS_DATE_KEY] !== today) {
    await chrome.storage.local.set({ [STATS_KEY]: {}, [STATS_DATE_KEY]: today });
  }
}

async function recordTime(domain, seconds) {
  if (!domain || seconds <= 0) return;
  await checkReset();
  const data  = await chrome.storage.local.get([STATS_KEY]);
  const stats = data[STATS_KEY] || {};
  stats[domain] = (stats[domain] || 0) + seconds;
  await chrome.storage.local.set({ [STATS_KEY]: stats });
}

function flushCurrentTab() {
  if (activeUrl && lastActiveTime) {
    const domain  = getDomain(activeUrl);
    const elapsed = (Date.now() - lastActiveTime) / 1000;
    if (domain && elapsed > 0 && elapsed < 3600) recordTime(domain, elapsed);
  }
  lastActiveTime = null;
}

chrome.tabs.onActivated.addListener(async info => {
  flushCurrentTab();
  activeTabId = info.tabId;
  try {
    const tab  = await chrome.tabs.get(info.tabId);
    activeUrl  = tab.url;
    lastActiveTime = Date.now();
  } catch { activeUrl = null; }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (tabId !== activeTabId || !changeInfo.url) return;
  flushCurrentTab();
  activeUrl      = changeInfo.url;
  lastActiveTime = Date.now();
});

setInterval(() => {
  if (activeUrl && lastActiveTime) {
    const domain  = getDomain(activeUrl);
    const elapsed = (Date.now() - lastActiveTime) / 1000;
    if (domain && elapsed > 0 && elapsed < 3600) {
      recordTime(domain, elapsed);
      lastActiveTime = Date.now();
    }
  }
}, 30000);

// ── Browser Lock ──────────────────────────────────────────────
let _savedSession = null;

async function lockBrowser() {
  const data = await chrome.storage.local.get([LOCK_ENABLED, LOCK_HASH_KEY]);
  if (!data[LOCK_ENABLED] || !data[LOCK_HASH_KEY]) return;

  const windows = await chrome.windows.getAll({ populate: true });
  const session = windows.map(w => ({
    focused: w.focused,
    tabs: (w.tabs || []).filter(t => t.url && !t.url.startsWith('chrome-extension://')).map(t => t.url)
  })).filter(w => w.tabs.length > 0);

  _savedSession = session;
  await chrome.storage.local.set({ [LOCK_SESSION]: session });

  const lockWin = await chrome.windows.create({
    url: chrome.runtime.getURL('pages/lockscreen.html'),
    type: 'popup',
    state: 'fullscreen'
  });

  for (const w of windows) {
    try { await chrome.windows.remove(w.id); } catch {}
  }
}

async function unlockBrowser() {
  const data    = await chrome.storage.local.get([LOCK_SESSION]);
  const session = data[LOCK_SESSION] || _savedSession || [];
  await chrome.storage.local.remove([LOCK_SESSION]);

  if (session.length) {
    for (const winData of session) {
      if (!winData.tabs || !winData.tabs.length) continue;
      try {
        await chrome.windows.create({ url: winData.tabs, focused: true });
      } catch {}
    }
  } else {
    // No saved session — open a new tab in a new window
    try { await chrome.windows.create({ url: 'chrome://newtab', focused: true }); } catch {}
  }
  // NOTE: do NOT close the lock window here — lockscreen.js calls window.close() itself
}

// ── Message handler ───────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'DMS_CHECK') {
    const fire = dmsArmed; dmsArmed = false;
    sendResponse({ shouldFire: fire }); return true;
  }
  if (msg.type === 'LOCK_BROWSER') {
    lockBrowser(); return true;
  }
  if (msg.type === 'UNLOCK_BROWSER') {
    unlockBrowser().then(() => sendResponse({ ok: true })); return true;
  }
});

// ── Alarms ────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'midnight-reset') {
    chrome.storage.local.set({ [STATS_KEY]: {}, [STATS_DATE_KEY]: new Date().toDateString() });
  }
});

chrome.alarms.create('midnight-reset', {
  when: (() => { const m = new Date(); m.setHours(24,0,0,0); return m.getTime(); })(),
  periodInMinutes: 24 * 60
});

chrome.runtime.onStartup.addListener(() => {
  dmsArmed = true;
  lockBrowser();
});

chrome.runtime.onInstalled.addListener(() => {});
