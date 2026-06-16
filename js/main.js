// main.js — App orchestration
// ── Tab switching ─────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-links').classList.toggle('hidden', target!=='links');
    document.getElementById('tab-bookmarks').classList.toggle('hidden', target!=='bookmarks');
  });
});

// ── Sidebars ──────────────────────────────────────────────────
const SIDEBARS = {
  stats:     document.getElementById('stats-sidebar'),
  settings:  document.getElementById('settings-sidebar'),
  salah:     document.getElementById('salah-sidebar'),
  habits:    document.getElementById('habits-sidebar'),
  favverses: document.getElementById('favverses-sidebar'),
};
const ALL_SIDEBARS = Object.values(SIDEBARS);

function closeAllSidebars() { ALL_SIDEBARS.forEach(s=>s&&s.classList.remove('open')); }

function toggleSidebar(sb) {
  const isOpen = sb.classList.contains('open');
  closeAllSidebars();
  if (!isOpen) sb.classList.add('open');
}

// Settings panel z-index boost
function updateSettingsZIndex() {
  const statsBtn    = document.getElementById('stats-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const open        = SIDEBARS.settings.classList.contains('open');
  if (statsBtn)    statsBtn.style.zIndex    = open ? '25' : '';
  if (settingsBtn) settingsBtn.style.zIndex = open ? '25' : '';
}

document.getElementById('stats-btn').addEventListener('click', () => {
  toggleSidebar(SIDEBARS.stats);
  if (SIDEBARS.stats.classList.contains('open') && typeof renderStats==='function') renderStats();
});
document.getElementById('stats-close').addEventListener('click', ()=>SIDEBARS.stats.classList.remove('open'));

document.getElementById('settings-btn').addEventListener('click', () => {
  toggleSidebar(SIDEBARS.settings);
  updateSettingsZIndex();
});
document.getElementById('settings-close').addEventListener('click', () => {
  SIDEBARS.settings.classList.remove('open');
  updateSettingsZIndex();
  if (typeof window.revertSettingsToSaved==='function') window.revertSettingsToSaved();
});

// Only close ONE sidebar at a time — clicking salah when habits is open just opens salah
document.getElementById('salah-btn').addEventListener('click', () => {
  const isOpen = SIDEBARS.salah.classList.contains('open');
  // Close only left sidebars (salah, habits); leave right sidebars alone
  SIDEBARS.salah.classList.remove('open');
  SIDEBARS.habits.classList.remove('open');
  if (!isOpen) SIDEBARS.salah.classList.add('open');
});
document.getElementById('salah-close').addEventListener('click',  ()=>SIDEBARS.salah.classList.remove('open'));

document.getElementById('habits-btn').addEventListener('click', () => {
  const isOpen = SIDEBARS.habits.classList.contains('open');
  SIDEBARS.salah.classList.remove('open');
  SIDEBARS.habits.classList.remove('open');
  if (!isOpen) SIDEBARS.habits.classList.add('open');
});
document.getElementById('habits-close').addEventListener('click', ()=>SIDEBARS.habits.classList.remove('open'));

document.getElementById('favverses-fab').addEventListener('click', e => {
  e.stopPropagation();
  toggleSidebar(SIDEBARS.favverses);
  if (SIDEBARS.favverses.classList.contains('open') && typeof renderFavVerses==='function') renderFavVerses();
});
document.getElementById('favverses-close').addEventListener('click', e => {
  e.stopPropagation();
  SIDEBARS.favverses.classList.remove('open');
});
// Stop ALL clicks inside the favverses sidebar from bubbling to document
SIDEBARS.favverses.addEventListener('click', e => e.stopPropagation());

// ── Close on background click ─────────────────────────────────
document.addEventListener('click', e => {
  const triggers    = ['stats-btn','settings-btn','salah-btn','habits-btn','favverses-fab','notes-fab'];
  const inSidebar   = e.target.closest('.sidebar,.favverses-sidebar,.left-sidebar');
  const inTrigger   = triggers.some(id=>e.target.closest(`#${id}`));
  const inNotesPanel= e.target.closest('#notes-panel');
  const inPrayerCard= e.target.closest('#prayer-card');
  const inModal     = e.target.closest('.modal-overlay');
  const inSearch    = e.target.closest('#search-bar-wrap');
  if (!inSidebar && !inTrigger && !inNotesPanel && !inPrayerCard && !inModal && !inSearch) closeAllSidebars();
});

// ── Escape ────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key==='Escape') {
    closeAllSidebars();
    document.getElementById('global-modal-root')?.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
  }
});
