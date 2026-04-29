// stats.js — Time tracking & bar chart for top 6 sites

const STATS_KEY = 'siteStats';
const STATS_DATE_KEY = 'siteStatsDate';

// Patterns to filter out
const FILTER_PATTERNS = [
  /^[a-z0-9]{32}$/i,          // Extension IDs (32 char hex strings)
  /^chrome(-extension)?:\/\//,  // Chrome internal
  /newtab/i,
  /^about:/,
  /^moz-extension/,
  /^\s*$/
];

function shouldFilter(domain) {
  return FILTER_PATTERNS.some(p => p.test(domain));
}

async function checkStatsReset() {
  const data = await Storage.get([STATS_DATE_KEY]);
  const today = new Date().toDateString();
  if (data[STATS_DATE_KEY] !== today) {
    await Storage.set({ [STATS_KEY]: {}, [STATS_DATE_KEY]: today });
  }
}

async function getStats() {
  await checkStatsReset();
  const data = await Storage.get([STATS_KEY]);
  return data[STATS_KEY] || {};
}

function formatTime(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

async function renderStats() {
  const content = document.getElementById('stats-content');
  if (!content) return;

  const stats = await getStats();
  const entries = Object.entries(stats)
    .filter(([domain]) => !shouldFilter(domain))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (entries.length === 0) {
    content.innerHTML = `<div class="stats-empty">
      <div class="stats-empty-icon">📊</div>
      <p>No browsing data yet today.</p>
      <p class="stats-empty-sub">Stats reset at midnight.</p>
    </div>`;
    return;
  }

  const maxTime = entries[0][1];
  content.innerHTML = entries.map(([domain, secs]) => {
    const pct = maxTime > 0 ? (secs / maxTime) * 100 : 0;
    return `
      <div class="stats-site-row">
        <div class="stats-site-info">
          <span class="stats-site-name">${escHtml(domain)}</span>
          <span class="stats-site-time">${formatTime(secs)}</span>
        </div>
        <div class="stats-bar-bg">
          <div class="stats-bar-fill" data-pct="${pct.toFixed(1)}"></div>
        </div>
      </div>
    `;
  }).join('');

  // Apply bar widths via JS (avoids inline style= CSP issue)
  content.querySelectorAll('.stats-bar-fill[data-pct]').forEach(el => {
    el.style.width = el.dataset.pct + '%';
  });
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Refresh stats when sidebar opens
document.getElementById('stats-btn').addEventListener('click', renderStats);

// ── Clear activity button ─────────────────────────────
document.getElementById('stats-clear-btn').addEventListener('click', async () => {
  if (!confirm('Clear all activity for today?')) return;
  const today = new Date().toDateString();
  await Storage.set({ [STATS_KEY]: {}, [STATS_DATE_KEY]: today });
  renderStats();
});
