// habits.js — Habit Tracker
// Each habit: id, name, emoji, logs (array of dateStrings completed)

const HABITS_KEY = 'habits';

let habits = [];
let editingHabitId = null;

function dateStr(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function todayStr() { return dateStr(); }

function last30Days() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(dateStr(d));
  }
  return days;
}

// ── Storage ──────────────────────────────────────────────
async function loadHabits() {
  const data = await Storage.get(HABITS_KEY);
  habits = data[HABITS_KEY] || [];
  renderHabits();
}

async function saveHabits() {
  await Storage.set({ [HABITS_KEY]: habits });
  renderHabits();
  updateHabitsBadge();
}

// ── Analytics ────────────────────────────────────────────
function calcStreak(logs) {
  const logSet = new Set(logs);
  let streak = 0;
  const d = new Date();
  // if today not done yet, start checking from yesterday
  if (!logSet.has(dateStr(d))) d.setDate(d.getDate() - 1);
  while (logSet.has(dateStr(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function calcLongest(logs) {
  if (!logs.length) return 0;
  const sorted = [...logs].sort();
  let best = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr - prev) / 86400000;
    if (diff === 1) { cur++; best = Math.max(best, cur); }
    else if (diff > 1) cur = 1;
  }
  return best;
}

function calcLast30(logs) {
  const days = last30Days();
  const set = new Set(logs);
  return days.filter(d => set.has(d)).length;
}

// ── Render ───────────────────────────────────────────────
function renderHabits() {
  const container = document.getElementById('habits-content');
  if (!container) return;

  if (habits.length === 0) {
    container.innerHTML = `<div class="habits-empty">🎯<br><br>No habits yet.<br><span class="habits-empty-sub">Add a habit below to start tracking your streak.</span></div>`;
    return;
  }

  container.innerHTML = '';
  const today = todayStr();
  const days30 = last30Days();

  habits.forEach(habit => {
    const logSet = new Set(habit.logs || []);
    const done   = logSet.has(today);
    const streak  = calcStreak(habit.logs || []);
    const longest = calcLongest(habit.logs || []);
    const last30  = calcLast30(habit.logs || []);

    const card = document.createElement('div');
    card.className = 'habit-card';

    // Heatmap cells
    const cells = days30.map(d => {
      const isToday  = d === today;
      const isDone   = logSet.has(d);
      // only mark missed if the day is in the past
      const isPast   = d < today;
      const isMissed = isPast && !isDone;
      return `<div class="habit-heatmap-cell ${isDone ? 'done' : isMissed ? 'missed' : ''} ${isToday ? 'today' : ''}" title="${d}"></div>`;
    }).join('');

    card.innerHTML = `
      <div class="habit-card-header">
        <div class="habit-card-left">
          <span class="habit-emoji">${habit.emoji || '🎯'}</span>
          <span class="habit-name">${escHtml(habit.name)}</span>
        </div>
        <div class="habit-card-actions">
          <button class="habit-action-btn edit" data-id="${habit.id}" title="Edit">✏️</button>
          <button class="habit-action-btn delete" data-id="${habit.id}" title="Delete">🗑️</button>
        </div>
      </div>

      <div class="habit-checkin-row">
        <button class="habit-checkin-btn ${done ? 'done' : ''}" data-id="${habit.id}">
          ${done
            ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Done today!`
            : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Mark done`
          }
        </button>
      </div>

      <div class="habit-stats">
        <div class="habit-stat">
          <span class="habit-stat-val">🔥 ${streak}</span>
          <span class="habit-stat-lbl">Current Streak</span>
        </div>
        <div class="habit-stat">
          <span class="habit-stat-val">🏆 ${longest}</span>
          <span class="habit-stat-lbl">Best Streak</span>
        </div>
        <div class="habit-stat">
          <span class="habit-stat-val">${last30}/30</span>
          <span class="habit-stat-lbl">Last 30 Days</span>
        </div>
      </div>

      <div class="habit-heatmap">
        <div class="habit-heatmap-label">Last 30 days</div>
        <div class="habit-heatmap-grid">${cells}</div>
      </div>
    `;

    // Checkin
    card.querySelector('.habit-checkin-btn').addEventListener('click', () => toggleHabitDay(habit.id, today));

    // Edit
    card.querySelector('.edit').addEventListener('click', () => openHabitModal(habit.id));

    // Delete
    card.querySelector('.delete').addEventListener('click', () => deleteHabit(habit.id));

    container.appendChild(card);
  });
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Toggle day ───────────────────────────────────────────
async function toggleHabitDay(id, day) {
  const h = habits.find(h => h.id === id);
  if (!h) return;
  h.logs = h.logs || [];
  const idx = h.logs.indexOf(day);
  if (idx === -1) h.logs.push(day);
  else h.logs.splice(idx, 1);
  await saveHabits();
}

// ── Delete ───────────────────────────────────────────────
async function deleteHabit(id) {
  habits = habits.filter(h => h.id !== id);
  await saveHabits();
}

// ── Modal ────────────────────────────────────────────────
function openHabitModal(id = null) {
  editingHabitId = id;
  const overlay = document.getElementById('habit-modal-overlay');
  document.getElementById('habit-modal-title').textContent = id ? 'Edit Habit' : 'Add Habit';
  if (id) {
    const h = habits.find(h => h.id === id);
    document.getElementById('habit-modal-name').value  = h?.name  || '';
    document.getElementById('habit-modal-emoji').value = h?.emoji || '';
  } else {
    document.getElementById('habit-modal-name').value  = '';
    document.getElementById('habit-modal-emoji').value = '';
  }
  overlay.classList.remove('hidden');
  document.getElementById('habit-modal-name').focus();
}

function closeHabitModal() {
  document.getElementById('habit-modal-overlay').classList.add('hidden');
  editingHabitId = null;
}

async function saveHabitModal() {
  const name  = document.getElementById('habit-modal-name').value.trim();
  const emoji = document.getElementById('habit-modal-emoji').value.trim() || '🎯';
  if (!name) return;

  if (editingHabitId) {
    const h = habits.find(h => h.id === editingHabitId);
    if (h) { h.name = name; h.emoji = emoji; }
  } else {
    habits.push({ id: Date.now().toString(), name, emoji, logs: [] });
  }
  await saveHabits();
  closeHabitModal();
}

// ── Badge update ─────────────────────────────────────────
function updateHabitsBadge() {
  const badge = document.getElementById('habits-badge');
  if (!badge) return;
  const today = todayStr();
  const total  = habits.length;
  const done   = habits.filter(h => (h.logs || []).includes(today)).length;
  if (total === 0) { badge.classList.add('hidden'); return; }
  badge.textContent = `${done}/${total}`;
  badge.classList.remove('hidden');
}

// ── Init ─────────────────────────────────────────────────
document.getElementById('add-habit-btn').addEventListener('click', () => openHabitModal());
document.getElementById('habit-modal-cancel').addEventListener('click', closeHabitModal);
document.getElementById('habit-modal-save').addEventListener('click', saveHabitModal);
document.getElementById('habit-modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeHabitModal();
});
document.getElementById('habit-modal-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveHabitModal();
});

loadHabits();
