// prayer_times.js  v3 — fixed: correct method, countdown from previous prayer start, no wakto big text, no highlight

const PT_CACHE_KEY = 'prayerTimesCache';
const PT_LOC_KEY   = 'prayerLocation';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

let _timings    = null;
let _cdInterval = null;

function parseMin(t) {
  const [h, m] = t.replace(/\s*(AM|PM).*/i, '').split(':').map(Number);
  return h * 60 + m;
}
function fmt12(t) {
  const [h, m] = t.replace(/\s*(AM|PM).*/i, '').split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function renderPrayer(timings) {
  _timings = timings;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const rows   = PRAYER_NAMES.map(n => ({ name: n, min: parseMin(timings[n]), raw: timings[n] }));

  // Find the most recently started prayer (active)
  let activeIdx = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (nowMin >= rows[i].min) { activeIdx = i; break; }
  }

  // Next prayer index
  let nextIdx = (activeIdx + 1) % rows.length;

  // Countdown: time remaining until next prayer starts
  // starts counting from when the PREVIOUS (active) prayer began
  const nextStartSec = rows[nextIdx].min * 60;
  let diffSec = nextStartSec - nowSec;
  if (diffSec < 0) diffSec += 24 * 3600;

  // Show only next prayer name + countdown (no big time text)
  document.getElementById('prayer-next-big-name').textContent = `Next: ${rows[nextIdx].name}`;
  const bigTimeEl = document.getElementById('prayer-next-big-time');
  if (bigTimeEl) bigTimeEl.style.display = 'none';

  startCountdown(diffSec);

  // List — no active highlight
  const list = document.getElementById('prayer-list');
  if (!list) return;
  list.innerHTML = '';
  rows.forEach((r, i) => {
    const div = document.createElement('div');
    // Only highlight next prayer, not current/active
    div.className = 'prayer-row' + (i === nextIdx ? ' next' : '');
    div.innerHTML = `<span class="prayer-row-name">${r.name}</span><span class="prayer-row-time">${fmt12(r.raw)}</span>`;
    list.appendChild(div);
  });
}

function startCountdown(totalSec) {
  if (_cdInterval) clearInterval(_cdInterval);
  let rem = Math.max(0, totalSec);
  function tick() {
    if (rem <= 0) { loadPrayerFromCache(); return; }
    const h = Math.floor(rem / 3600), m = Math.floor((rem % 3600) / 60), s = rem % 60;
    const el = document.getElementById('prayer-next-countdown');
    if (el) el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    rem--;
  }
  tick();
  _cdInterval = setInterval(tick, 1000);
}

// Use method=1 (University of Islamic Sciences, Karachi) — matches Google for Dhaka
async function fetchByCoords(lat, lon) {
  const d = new Date();
  const url = `https://api.aladhan.com/v1/timings/${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}?latitude=${lat}&longitude=${lon}&method=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Aladhan ' + res.status);
  return (await res.json()).data.timings;
}

async function geocodeCity(city) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`);
  const arr = await res.json();
  if (!arr.length) throw new Error('City not found');
  return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon), city: arr[0].display_name.split(',')[0] };
}

async function loadPrayerFromCache() {
  const today = new Date().toDateString();
  const raw   = await Storage.get([PT_CACHE_KEY, PT_LOC_KEY]);
  const cache = raw[PT_CACHE_KEY];
  const loc   = raw[PT_LOC_KEY];

  if (cache && cache.date === today) {
    const cityEl = document.getElementById('prayer-city');
    if (cityEl) cityEl.textContent = cache.city || '--';
    renderPrayer(cache.timings);
    return;
  }
  if (loc) {
    try {
      const timings = await fetchByCoords(loc.lat, loc.lon);
      await Storage.set({ [PT_CACHE_KEY]: { date: today, city: loc.city, timings } });
      const cityEl = document.getElementById('prayer-city');
      if (cityEl) cityEl.textContent = loc.city || '--';
      renderPrayer(timings);
    } catch (e) { console.warn('[Prayer] Refresh failed:', e); }
  }
}

async function loadByCity(cityName) {
  try {
    const geo     = await geocodeCity(cityName);
    const timings = await fetchByCoords(geo.lat, geo.lon);
    const today   = new Date().toDateString();
    await Storage.set({
      [PT_LOC_KEY]:   { lat: geo.lat, lon: geo.lon, city: geo.city },
      [PT_CACHE_KEY]: { date: today, city: geo.city, timings }
    });
    const cityEl = document.getElementById('prayer-city');
    if (cityEl) cityEl.textContent = geo.city;
    renderPrayer(timings);
  } catch (e) {
    alert('Could not find prayer times for "' + cityName + '". Try a nearby city.');
  }
}

async function loadByGeo() {
  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
    );
    const { latitude: lat, longitude: lon } = pos.coords;
    const rr = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
    const rd = await rr.json();
    const city = rd.address?.city || rd.address?.town || rd.address?.village || 'Your City';
    const timings = await fetchByCoords(lat, lon);
    const today = new Date().toDateString();
    await Storage.set({
      [PT_LOC_KEY]:   { lat, lon, city },
      [PT_CACHE_KEY]: { date: today, city, timings }
    });
    const cityEl = document.getElementById('prayer-city');
    if (cityEl) cityEl.textContent = city;
    renderPrayer(timings);
    closePrayerModal();
  } catch (e) { alert('Location access denied or failed.'); }
}

function openPrayerModal() {
  document.getElementById('prayer-modal-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('prayer-city-input').focus(), 50);
}
function closePrayerModal() {
  document.getElementById('prayer-modal-overlay').classList.add('hidden');
  document.getElementById('prayer-city-input').value = '';
}

document.getElementById('prayer-location-btn').addEventListener('click', openPrayerModal);
document.getElementById('prayer-modal-cancel').addEventListener('click', closePrayerModal);
document.getElementById('prayer-modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closePrayerModal(); });
document.getElementById('prayer-modal-save').addEventListener('click', () => {
  const city = document.getElementById('prayer-city-input').value.trim();
  if (city) { closePrayerModal(); loadByCity(city); }
});
document.getElementById('prayer-city-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { const city = e.target.value.trim(); if (city) { closePrayerModal(); loadByCity(city); } }
});
document.getElementById('prayer-geo-btn').addEventListener('click', loadByGeo);

// Re-render every minute to keep timings correct
setInterval(() => { if (_timings) renderPrayer(_timings); }, 60 * 1000);

loadPrayerFromCache();
