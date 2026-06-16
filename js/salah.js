// salah.js — Daily Salah tracker
const PRAYERS = [
  { id:'fajr',    name:'Fajr',    arabic:'الفجر',  emoji:'🌙' },
  { id:'dhuhr',   name:'Dhuhr',   arabic:'الظهر',  emoji:'☀️' },
  { id:'asr',     name:'Asr',     arabic:'العصر',  emoji:'🌤' },
  { id:'maghrib', name:'Maghrib', arabic:'المغرب', emoji:'🌅' },
  { id:'isha',    name:'Isha',    arabic:'العشاء',  emoji:'🌃' },
];
const SALAH_KEY    = 'salahData';
const SALAH_STREAK = 'salahStreak';

function todayStr()     { return new Date().toDateString(); }
function yesterdayStr() { const d = new Date(); d.setDate(d.getDate()-1); return d.toDateString(); }

async function getTodayData() {
  const today = todayStr();
  const raw   = await Storage.get([SALAH_KEY, SALAH_STREAK]);
  let data   = raw[SALAH_KEY]    || { date: today, prayers: {} };
  let streak = raw[SALAH_STREAK] || { count: 0, lastFullDate: '' };

  if (data.date !== today) {
    const wasYesterday = data.date === yesterdayStr();
    const allDone      = PRAYERS.every(p => data.prayers[p.id]);
    if (wasYesterday && allDone) { streak.count++; streak.lastFullDate = data.date; }
    else if (streak.lastFullDate && streak.lastFullDate !== yesterdayStr()) streak.count = 0;
    data = { date: today, prayers: {} };
    await Storage.set({ [SALAH_KEY]: data, [SALAH_STREAK]: streak });
  }
  return { data, streak };
}

function getMissedPrayers(prayers, now) {
  const h = now.getHours() + now.getMinutes() / 60;
  const missed = new Set();
  if (!prayers.fajr    && h > 7.0)  missed.add('fajr');
  if (!prayers.dhuhr   && h > 15.5) missed.add('dhuhr');
  if (!prayers.asr     && h > 18.0) missed.add('asr');
  if (!prayers.maghrib && h > 20.0) missed.add('maghrib');
  return missed;
}

async function renderSalah() {
  const { data, streak } = await getTodayData();
  const prayers = data.prayers;
  const now     = new Date();
  const prayed  = PRAYERS.filter(p => prayers[p.id]).length;
  const allDone = prayed === PRAYERS.length;

  const el = id => document.getElementById(id);
  el('salah-date').textContent = now.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  el('salah-streak-count').textContent = streak.count;
  el('salah-streak-sub').textContent = allDone
    ? '🎉 All prayers completed today! Masha\'Allah!'
    : streak.count > 0
      ? `Keep it up — ${PRAYERS.length - prayed} prayer${PRAYERS.length - prayed !== 1 ? 's' : ''} remaining today`
      : 'Complete all 5 prayers to build your streak';

  const container = el('salah-prayers');
  container.innerHTML = '';
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
      <div class="salah-prayer-check">${done ? '✓' : missed ? '✗' : ''}</div>`;
    row.addEventListener('click', () => togglePrayer(p.id));
    container.appendChild(row);
  });

  const pct = (prayed / PRAYERS.length) * 100;
  el('salah-progress-bar').style.width = pct + '%';
  el('salah-progress-text').textContent = `${prayed} / ${PRAYERS.length} prayed`;

  const badge = el('salah-badge');
  if (allDone) { badge.textContent = '✓'; badge.classList.add('visible'); }
  else if (prayed > 0) { badge.textContent = prayed; badge.classList.add('visible'); }
  else badge.classList.remove('visible');
}

async function togglePrayer(id) {
  const { data, streak } = await getTodayData();
  data.prayers[id] = !data.prayers[id];
  const allDone = PRAYERS.every(p => data.prayers[p.id]);
  const today   = todayStr();
  if (allDone) {
    if (streak.lastFullDate !== today) {
      streak.count = streak.lastFullDate === yesterdayStr() ? streak.count + 1 : 1;
      streak.lastFullDate = today;
      await Storage.set({ [SALAH_STREAK]: streak });
    }
  } else if (streak.lastFullDate === today) {
    streak.count = Math.max(0, streak.count - 1);
    streak.lastFullDate = yesterdayStr();
    await Storage.set({ [SALAH_STREAK]: streak });
  }
  await Storage.set({ [SALAH_KEY]: data });
  renderSalah();
}

function scheduleMidnightCheck() {
  setInterval(async () => {
    const raw = await Storage.get(SALAH_KEY);
    if (raw[SALAH_KEY]?.date !== todayStr()) renderSalah();
  }, 60000);
}

renderSalah();
scheduleMidnightCheck();
