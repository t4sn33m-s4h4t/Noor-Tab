// background.js — Service worker: time tracking + midnight reset + dhikr alarms

const STATS_KEY      = 'siteStats';
const STATS_DATE_KEY = 'siteStatsDate';

let activeTabId   = null;
let activeUrl     = null;
let lastActiveTime = null;
let _dhikrIdx     = 0;

function getDomain(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (['chrome:', 'chrome-extension:', 'about:', 'moz-extension:'].includes(u.protocol)) return null;
    return u.hostname.replace(/^www\./, '');
  } catch { return null; }
}

function isExtensionId(str) {
  return /^[a-z0-9]{32}$/i.test(str);
}

async function checkReset() {
  const data  = await chrome.storage.local.get([STATS_DATE_KEY]);
  const today = new Date().toDateString();
  if (data[STATS_DATE_KEY] !== today) {
    await chrome.storage.local.set({ [STATS_KEY]: {}, [STATS_DATE_KEY]: today });
  }
}

async function recordTime(domain, seconds) {
  if (!domain || seconds <= 0 || isExtensionId(domain)) return;
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

chrome.tabs.onActivated.addListener(async (info) => {
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

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    flushCurrentTab();
  } else {
    lastActiveTime = Date.now();
  }
});

// Flush every 30s as safety net
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

// ── Dhikr alarm (fires on all pages) ─────────────────
async function scheduleDhikrAlarm() {
  const data = await chrome.storage.local.get(['dhikrEnabled', 'dhikrInterval']);
  chrome.alarms.clear('dhikr-reminder');
  if (data.dhikrEnabled) {
    const mins = parseInt(data.dhikrInterval) || 15;
    chrome.alarms.create('dhikr-reminder', { delayInMinutes: mins, periodInMinutes: mins });
  }
}

// Re-schedule when settings change
chrome.storage.onChanged.addListener((changes) => {
  if ('dhikrEnabled' in changes || 'dhikrInterval' in changes) {
    scheduleDhikrAlarm();
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'midnight-reset') {
    chrome.storage.local.set({ [STATS_KEY]: {}, [STATS_DATE_KEY]: new Date().toDateString() });
  }
  if (alarm.name === 'dhikr-reminder') {
    // Send message to all tabs
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_DHIKR', idx: _dhikrIdx });
      } catch (_) { /* tab may not have content script */ }
    }
    _dhikrIdx = (_dhikrIdx + 1) % 10;
  }
});

// Midnight reset alarm
chrome.alarms.create('midnight-reset', {
  when: (() => { const m = new Date(); m.setHours(24,0,0,0); return m.getTime(); })(),
  periodInMinutes: 24 * 60
});

// Init dhikr alarm on startup
scheduleDhikrAlarm();

// Re-schedule on install and browser startup
chrome.runtime.onInstalled.addListener(scheduleDhikrAlarm);
chrome.runtime.onStartup.addListener(scheduleDhikrAlarm);
