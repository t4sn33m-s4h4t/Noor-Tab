// habits.js — Habit Tracker
const HABITS_KEY = 'habits';
let habits = [];
let editingHabitId = null;

function dateStr(d = new Date()) { return d.toISOString().slice(0,10); }
function todayStr() { return dateStr(); }
function last30Days() {
  const days = [];
  for (let i=29; i>=0; i--) { const d=new Date(); d.setDate(d.getDate()-i); days.push(dateStr(d)); }
  return days;
}

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

function calcStreak(logs) {
  const set = new Set(logs); let streak=0;
  const d = new Date();
  if (!set.has(dateStr(d))) d.setDate(d.getDate()-1);
  while (set.has(dateStr(d))) { streak++; d.setDate(d.getDate()-1); }
  return streak;
}
function calcLongest(logs) {
  if (!logs.length) return 0;
  const sorted = [...logs].sort(); let best=1, cur=1;
  for (let i=1; i<sorted.length; i++) {
    const diff = (new Date(sorted[i]) - new Date(sorted[i-1])) / 86400000;
    if (diff===1) { cur++; best=Math.max(best,cur); } else if (diff>1) cur=1;
  }
  return best;
}
function calcLast30(logs) {
  const days=last30Days(), set=new Set(logs);
  return days.filter(d=>set.has(d)).length;
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderHabits() {
  const container = document.getElementById('habits-content');
  if (!container) return;
  if (!habits.length) {
    container.innerHTML = `<div class="habits-empty">🎯<br><br>No habits yet.<br><span class="habits-empty-sub">Add a habit below to start tracking.</span></div>`;
    return;
  }
  container.innerHTML = '';
  const today  = todayStr();
  const days30 = last30Days();

  habits.forEach(habit => {
    const logSet  = new Set(habit.logs || []);
    const done    = logSet.has(today);
    const streak  = calcStreak(habit.logs||[]);
    const longest = calcLongest(habit.logs||[]);
    const last30  = calcLast30(habit.logs||[]);

    const cells = days30.map(d => {
      const isToday=d===today, isDone=logSet.has(d), isMissed=d<today && !isDone;
      return `<div class="habit-heatmap-cell ${isDone?'done':isMissed?'missed':''} ${isToday?'today':''}" title="${d}"></div>`;
    }).join('');

    const card = document.createElement('div');
    card.className = 'habit-card';
    card.innerHTML = `
      <div class="habit-card-header">
        <div class="habit-card-left">
          <span class="habit-emoji">${habit.emoji||'🎯'}</span>
          <span class="habit-name">${escHtml(habit.name)}</span>
        </div>
        <div class="habit-card-actions">
          <button class="habit-action-btn edit" title="Edit">${ICON_EDIT}</button>
          <button class="habit-action-btn delete" title="Delete">${ICON_DELETE}</button>
        </div>
      </div>
      <div class="habit-checkin-row">
        <button class="habit-checkin-btn ${done?'done':''}">
          ${done
            ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg> Done today!`
            : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Mark done`
          }
        </button>
      </div>
      <div class="habit-stats">
        <div class="habit-stat"><span class="habit-stat-val">🔥 ${streak}</span><span class="habit-stat-lbl">Current</span></div>
        <div class="habit-stat"><span class="habit-stat-val">🏆 ${longest}</span><span class="habit-stat-lbl">Best</span></div>
        <div class="habit-stat"><span class="habit-stat-val">${last30}/30</span><span class="habit-stat-lbl">30 Days</span></div>
      </div>
      <div class="habit-heatmap">
        <div class="habit-heatmap-label">Last 30 days</div>
        <div class="habit-heatmap-grid">${cells}</div>
      </div>`;

    card.querySelector('.habit-checkin-btn').addEventListener('click', () => toggleHabitDay(habit.id, today));
    card.querySelector('.edit').addEventListener('click', () => openHabitModal(habit.id));
    card.querySelector('.delete').addEventListener('click', () => {
      showConfirm(`Delete habit "${habit.name}"?`, () => deleteHabit(habit.id), { confirmLabel: 'Delete', confirmClass: 'save-btn danger-btn' });
    });
    container.appendChild(card);
  });
}

async function toggleHabitDay(id, day) {
  const h = habits.find(h=>h.id===id);
  if (!h) return;
  h.logs = h.logs||[];
  const idx = h.logs.indexOf(day);
  if (idx===-1) h.logs.push(day); else h.logs.splice(idx,1);
  await saveHabits();
}

async function deleteHabit(id) {
  habits = habits.filter(h=>h.id!==id);
  await saveHabits();
}

function openHabitModal(id=null) {
  editingHabitId = id;
  const h = id ? habits.find(h=>h.id===id) : null;

  const wrap = document.createElement('div');
  const lblName  = document.createElement('label'); lblName.className='settings-label'; lblName.textContent='Habit Name';
  const inpName  = document.createElement('input'); inpName.type='text'; inpName.className='settings-input'; inpName.placeholder='e.g. Exercise, Read'; inpName.value=h?.name||'';
  const lblEmoji = document.createElement('label'); lblEmoji.className='settings-label settings-label-mt'; lblEmoji.textContent='Emoji Icon (optional)';
  const inpEmoji = document.createElement('input'); inpEmoji.type='text'; inpEmoji.className='settings-input'; inpEmoji.placeholder='e.g. 💪 📚'; inpEmoji.maxLength=4; inpEmoji.value=h?.emoji||'';
  lblName.appendChild(inpName); lblEmoji.appendChild(inpEmoji);
  wrap.appendChild(lblName); wrap.appendChild(lblEmoji);

  const { close } = showModal({
    title: id ? 'Edit Habit' : 'Add Habit',
    body: wrap,
    buttons: [
      { label: 'Cancel', class: 'cancel-btn' },
      { label: 'Save', class: 'save-btn', action: async () => {
        const name  = inpName.value.trim();
        const emoji = inpEmoji.value.trim() || '🎯';
        if (!name) return;
        if (editingHabitId) { const hb=habits.find(h=>h.id===editingHabitId); if(hb){hb.name=name;hb.emoji=emoji;} }
        else habits.push({ id: Date.now().toString(), name, emoji, logs: [] });
        await saveHabits();
      }}
    ]
  });
  inpName.addEventListener('keydown', e => { if(e.key==='Enter') { close(); /* trigger save */ } });
}

function updateHabitsBadge() {
  const badge = document.getElementById('habits-badge');
  if (!badge) return;
  const today = todayStr(), total = habits.length;
  const done  = habits.filter(h=>(h.logs||[]).includes(today)).length;
  if (!total) { badge.classList.add('hidden'); return; }
  badge.textContent = `${done}/${total}`;
  badge.classList.remove('hidden');
}

document.getElementById('add-habit-btn').addEventListener('click', () => openHabitModal());
loadHabits();
