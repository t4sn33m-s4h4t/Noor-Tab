// clock.js — 12-hour clock + date display
function updateClock() {
  const now   = new Date();
  const h     = now.getHours();
  const mins  = now.getMinutes().toString().padStart(2, '0');
  const ampm  = h >= 12 ? 'PM' : 'AM';
  const h12   = h % 12 || 12;
  const days  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const timeEl = document.getElementById('clock-time');
  const dateEl = document.getElementById('clock-date');
  if (timeEl) timeEl.textContent = `${h12}:${mins} ${ampm}`;
  if (dateEl) dateEl.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

updateClock();
setInterval(updateClock, 1000);
