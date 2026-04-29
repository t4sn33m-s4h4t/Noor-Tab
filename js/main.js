// main.js — App orchestration

// ── Tab Switching ─────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-links').classList.toggle('hidden', target !== 'links');
    document.getElementById('tab-bookmarks').classList.toggle('hidden', target !== 'bookmarks');
  });
});

// ── Sidebars ──────────────────────────────────────────────
const statsSidebar     = document.getElementById('stats-sidebar');
const settingsSidebar  = document.getElementById('settings-sidebar');
const salahSidebar     = document.getElementById('salah-sidebar');
const habitsSidebar    = document.getElementById('habits-sidebar');
const favversesSidebar = document.getElementById('favverses-sidebar');

const ALL_SIDEBARS = [statsSidebar, settingsSidebar, salahSidebar, habitsSidebar, favversesSidebar];

function closeAllSidebars() { ALL_SIDEBARS.forEach(s => s && s.classList.remove('open')); }
function toggleSidebar(sb) {
  const isOpen = sb.classList.contains('open');
  closeAllSidebars();
  if (!isOpen) sb.classList.add('open');
}

document.getElementById('stats-btn').addEventListener('click', () => {
  toggleSidebar(statsSidebar);
  if (statsSidebar.classList.contains('open') && typeof renderStats === 'function') renderStats();
});
document.getElementById('stats-close').addEventListener('click', () => statsSidebar.classList.remove('open'));

document.getElementById('settings-btn').addEventListener('click', () => toggleSidebar(settingsSidebar));
document.getElementById('settings-close').addEventListener('click', () => {
  settingsSidebar.classList.remove('open');
  if (typeof window.revertSettingsToSaved === 'function') window.revertSettingsToSaved();
});

document.getElementById('salah-btn').addEventListener('click', () => toggleSidebar(salahSidebar));
document.getElementById('salah-close').addEventListener('click', () => salahSidebar.classList.remove('open'));

document.getElementById('habits-btn').addEventListener('click', () => toggleSidebar(habitsSidebar));
document.getElementById('habits-close').addEventListener('click', () => habitsSidebar.classList.remove('open'));

document.getElementById('favverses-fab').addEventListener('click', () => {
  toggleSidebar(favversesSidebar);
  if (favversesSidebar.classList.contains('open') && typeof renderFavVerses === 'function') renderFavVerses();
});
document.getElementById('favverses-close').addEventListener('click', () => favversesSidebar.classList.remove('open'));

// ── Close on background click ─────────────────────────────
document.addEventListener('click', e => {
  const triggers = ['stats-btn','settings-btn','salah-btn','habits-btn','favverses-fab','notes-fab'];
  const inSidebar  = e.target.closest('.sidebar, .favverses-sidebar');
  const inTrigger  = triggers.some(id => e.target.closest(`#${id}`));
  const inNotesPanel = e.target.closest('#notes-panel');
  const inPrayerCard = e.target.closest('#prayer-card');
  const inModal    = e.target.closest('.modal-overlay');
  if (!inSidebar && !inTrigger && !inNotesPanel && !inPrayerCard && !inModal) closeAllSidebars();
});

// ── Escape ────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeAllSidebars();
    document.getElementById('link-modal-overlay').classList.add('hidden');
    document.getElementById('habit-modal-overlay').classList.add('hidden');
    const po = document.getElementById('prayer-modal-overlay');
    if (po) po.classList.add('hidden');
    // notes handled in notes.js
  }
});
