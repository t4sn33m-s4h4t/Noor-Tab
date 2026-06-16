// background_img.js — Unsplash background loader. MV3 compliant (data fetch only).
async function loadBackground(forceReload = false) {
  const data = await Storage.get(['unsplashKey','bgCategory','bgInterval','cachedBg','cachedBgTime']);
  const { unsplashKey, bgCategory, cachedBg, cachedBgTime } = data;
  const bgEl = document.getElementById('bg-image');
  if (!bgEl) return;

  if (!unsplashKey) {
    bgEl.style.background = 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)';
    return;
  }

  const intervalMinutes = parseInt(data.bgInterval ?? 30);
  // 0 = every new tab open → never use cache, always fetch fresh
  const everyOpen = intervalMinutes === 0;
  const cacheMs   = intervalMinutes * 60 * 1000;
  const now       = Date.now();
  const cacheValid = !everyOpen && !forceReload && cachedBg && cachedBgTime && (now - cachedBgTime) < cacheMs;

  if (cacheValid) {
    bgEl.style.backgroundImage = `url('${cachedBg}')`;
    return;
  }

  const category = (bgCategory || 'nature landscape').trim() || 'nature landscape';
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(category)}&orientation=landscape&client_id=${unsplashKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Unsplash ${res.status}`);
    const photo  = await res.json();
    const imgUrl = photo.urls?.regular || photo.urls?.full;
    if (imgUrl) {
      bgEl.style.backgroundImage = `url('${imgUrl}')`;
      // Only cache if NOT every-open mode
      if (!everyOpen) await Storage.set({ cachedBg: imgUrl, cachedBgTime: now });
    }
  } catch (e) {
    console.warn('[Noor Tab] Background failed:', e.message);
    if (cachedBg) bgEl.style.backgroundImage = `url('${cachedBg}')`;
    else bgEl.style.background = 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)';
  }
}

loadBackground();
