// salah.js — Daily Salah tracker
// 5 prayers, streak counter, missed = red highlight, midnight auto-reset

const PRAYERS = [
  { id: 'fajr',    name: 'Fajr',    arabic: 'الفجر',  emoji: '🌙' },
  { id: 'dhuhr',   name: 'Dhuhr',   arabic: 'الظهر',  emoji: '☀️' },
  { id: 'asr',     name: 'Asr',     arabic: 'العصر',  emoji: '🌤' },
  { id: 'maghrib', name: 'Maghrib', arabic: 'المغرب', emoji: '🌅' },
  { id: 'isha',    name: 'Isha',    arabic: 'العشاء',  emoji: '🌃' },
];

const SALAH_KEY      = 'salahData';   // { date, prayers: {fajr: bool, ...} }
const SALAH_STREAK   = 'salahStreak'; // { count, lastFullDate }

// ── Load / ensure today's record ────────────────────────
async function getTodayData() {
  const today = todayStr();
  const raw   = await Storage.get([SALAH_KEY, SALAH_STREAK]);
  let data     = raw[SALAH_KEY]    || { date: today, prayers: {} };
  let streak   = raw[SALAH_STREAK] || { count: 0, lastFullDate: '' };

  // New day — reset prayers, check if yesterday was complete for streak
  if (data.date !== today) {
    const wasYesterday = data.date === yesterdayStr();
    const allDone      = PRAYERS.every(p => data.prayers[p.id]);

    if (wasYesterday && allDone) {
      streak.count++;
      streak.lastFullDate = data.date;
    } else if (!wasYesterday || !allDone) {
      // Streak broken — but only if there was a streak to break
      if (streak.lastFullDate && streak.lastFullDate !== yesterdayStr()) {
        streak.count = 0;
      }
    }

    data = { date: today, prayers: {} };
    await Storage.set({ [SALAH_KEY]: data, [SALAH_STREAK]: streak });
  }

  return { data, streak };
}

function todayStr() {
  return new Date().toDateString();
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toDateString();
}

// ── Render ───────────────────────────────────────────────
async function renderSalah() {
  const { data, streak } = await getTodayData();
  const prayers  = data.prayers;
  const now      = new Date();
  const prayed   = PRAYERS.filter(p => prayers[p.id]).length;
  const allDone  = prayed === PRAYERS.length;

  // Date label
  document.getElementById('salah-date').textContent =
    now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Streak
  const streakCount = document.getElementById('salah-streak-count');
  const streakSub   = document.getElementById('salah-streak-sub');
  streakCount.textContent = streak.count;
  if (allDone) {
    streakSub.textContent = '🎉 All prayers completed today! Masha\'Allah!';
  } else if (streak.count > 0) {
    streakSub.textContent = `Keep it up — ${PRAYERS.length - prayed} prayer${PRAYERS.length - prayed !== 1 ? 's' : ''} remaining today`;
  } else {
    streakSub.textContent = 'Complete all 5 prayers to build your streak';
  }

  // Prayer rows
  const container = document.getElementById('salah-prayers');
  container.innerHTML = '';

  // Determine which past-time prayers are "missed" (not prayed and time has passed)
  const missedIds = getMissedPrayers(prayers, now);

  PRAYERS.forEach(p => {
    const done   = !!prayers[p.id];
    const missed = !done && missedIds.has(p.id);

    const row = document.createElement('div');
    row.className = 'salah-prayer-row' + (done ? ' prayed' : missed ? ' missed' : '');
    row.dataset.id = p.id;
    row.innerHTML = `
      <div class="salah-prayer-left">
        <span class="salah-prayer-emoji">${p.emoji}</span>
        <div class="salah-prayer-info">
          <span class="salah-prayer-name">${p.name}</span>
          <span class="salah-prayer-arabic">${p.arabic}</span>
        </div>
      </div>
      <div class="salah-prayer-check">${done ? '✓' : missed ? '✗' : ''}</div>
    `;

    row.addEventListener('click', () => togglePrayer(p.id));
    container.appendChild(row);
  });

  // Progress bar
  const pct = (prayed / PRAYERS.length) * 100;
  document.getElementById('salah-progress-bar').style.width = pct + '%';
  document.getElementById('salah-progress-text').textContent = `${prayed} / ${PRAYERS.length} prayed`;

  // Badge on the open button
  const badge = document.getElementById('salah-badge');
  if (prayed > 0 && !allDone) {
    badge.textContent = prayed;
    badge.classList.add('visible');
  } else if (allDone) {
    badge.textContent = '✓';
    badge.classList.add('visible');
  } else {
    badge.classList.remove('visible');
  }
}

// ── Missed prayer detection ──────────────────────────────
// Rough prayer windows by hour (local time) — conservative estimates
// Fajr ends ~sunrise (~6am), Dhuhr starts ~12, Asr ~3:30, Maghrib ~6pm, Isha ~8pm
function getMissedPrayers(prayers, now) {
  const h    = now.getHours() + now.getMinutes() / 60;
  const missed = new Set();
  // A prayer is "missed" if not done and its window has clearly passed
  if (!prayers.fajr    && h > 7.0)   missed.add('fajr');
  if (!prayers.dhuhr   && h > 15.5)  missed.add('dhuhr');
  if (!prayers.asr     && h > 18.0)  missed.add('asr');
  if (!prayers.maghrib && h > 20.0)  missed.add('maghrib');
  // Isha only missed after midnight reset (handled by day reset)
  return missed;
}

// ── Toggle prayer ────────────────────────────────────────
async function togglePrayer(id) {
  const { data, streak } = await getTodayData();
  data.prayers[id] = !data.prayers[id];

  // Check if all 5 just got completed → update streak immediately
  const allDone = PRAYERS.every(p => data.prayers[p.id]);
  if (allDone) {
    const today = todayStr();
    if (streak.lastFullDate !== today) {
      // Only increment if yesterday was also full (or starting fresh)
      const lastWasYesterday = streak.lastFullDate === yesterdayStr();
      streak.count = lastWasYesterday ? streak.count + 1 : 1;
      streak.lastFullDate = today;
      await Storage.set({ [SALAH_STREAK]: streak });
    }
  } else {
    // Un-completing a prayer after all 5 were done — remove today from streak
    if (streak.lastFullDate === todayStr()) {
      streak.count = Math.max(0, streak.count - 1);
      streak.lastFullDate = yesterdayStr();
      await Storage.set({ [SALAH_STREAK]: streak });
    }
  }

  await Storage.set({ [SALAH_KEY]: data });
  renderSalah();
}

// ── Midnight auto-reset via setInterval check ───────────
function scheduleMidnightCheck() {
  setInterval(async () => {
    const raw  = await Storage.get(SALAH_KEY);
    const data = raw[SALAH_KEY];
    if (data && data.date !== todayStr()) {
      renderSalah(); // re-render will handle the day reset
    }
  }, 60 * 1000); // check every minute
}

// ── Init ─────────────────────────────────────────────────
renderSalah();
scheduleMidnightCheck();
