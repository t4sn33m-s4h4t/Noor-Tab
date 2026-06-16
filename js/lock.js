// lock.js — Browser lock integration: setup and settings UI
// The actual lock/unlock is handled by background.js

async function openLockSettingsPage() {
  chrome.tabs.create({ url: chrome.runtime.getURL('pages/lock-settings.html') });
}

// Expose for settings.js
window.openLockSettingsPage = openLockSettingsPage;
