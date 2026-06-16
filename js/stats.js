// stats.js — Site usage bar chart
const STATS_KEY      = 'siteStats';
const STATS_DATE_KEY = 'siteStatsDate';
const FILTER_PATTERNS = [/^[a-z0-9]{32}$/i, /^chrome(-extension)?:\/\//, /newtab/i, /^about:/, /^moz-extension/, /^\s*$/];

function shouldFilter(d) { return FILTER_PATTERNS.some(p=>p.test(d)); }

function escHtml(str) { return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function formatTime(seconds) {
  if (seconds<60) return `${Math.round(seconds)}s`;
  const m=Math.floor(seconds/60), s=Math.round(seconds%60);
  if (m<60) return `${m}m ${s}s`;
  return `${Math.floor(m/60)}h ${m%60}m`;
}

async function renderStats() {
  const content = document.getElementById('stats-content');
  if (!content) return;
  const data    = await Storage.get([STATS_KEY, STATS_DATE_KEY]);
  const today   = new Date().toDateString();
  if (data[STATS_DATE_KEY] !== today) await Storage.set({ [STATS_KEY]:{}, [STATS_DATE_KEY]:today });
  const stats   = data[STATS_KEY] || {};
  const entries = Object.entries(stats).filter(([d])=>!shouldFilter(d)).sort((a,b)=>b[1]-a[1]).slice(0,6);

  if (!entries.length) {
    content.innerHTML=`<div class="stats-empty"><div class="stats-empty-icon">📊</div><p>No browsing data yet today.</p><p class="stats-empty-sub">Stats reset at midnight.</p></div>`;
    return;
  }
  const maxTime=entries[0][1];
  content.innerHTML = entries.map(([domain,secs]) => {
    const pct=maxTime>0?(secs/maxTime)*100:0;
    return `<div class="stats-site-row">
      <div class="stats-site-info"><span class="stats-site-name">${escHtml(domain)}</span><span class="stats-site-time">${formatTime(secs)}</span></div>
      <div class="stats-bar-bg"><div class="stats-bar-fill" data-pct="${pct.toFixed(1)}"></div></div>
    </div>`;
  }).join('');
  content.querySelectorAll('.stats-bar-fill[data-pct]').forEach(el=>{ el.style.width=el.dataset.pct+'%'; });
}

document.getElementById('stats-btn').addEventListener('click', renderStats);

document.getElementById('stats-clear-btn').addEventListener('click', () => {
  showConfirm('Clear all activity for today?', async () => {
    await Storage.set({ [STATS_KEY]:{}, [STATS_DATE_KEY]: new Date().toDateString() });
    renderStats();
  }, { confirmLabel:'Clear', confirmClass:'save-btn danger-btn' });
});
