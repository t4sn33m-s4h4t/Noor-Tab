// background_img.js — Unsplash background loader with configurable interval + reload

async function loadBackground(forceReload = false) {
  const data = await Storage.get(['unsplashKey', 'bgCategory', 'bgInterval', 'cachedBg', 'cachedBgTime']);
  const { unsplashKey, bgCategory, cachedBg, cachedBgTime } = data;
  const intervalMinutes = parseInt(data.bgInterval ?? 30);

  const bgEl = document.getElementById('bg-image');

  if (!unsplashKey) {
    bgEl.style.background = 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)';
    return;
  }

  const now = Date.now();
  const cacheMs = intervalMinutes === 0 ? 0 : intervalMinutes * 60 * 1000;
  const cacheValid = cachedBg && cachedBgTime && (now - cachedBgTime) < cacheMs;

  if (!forceReload && cacheValid) {
    bgEl.style.backgroundImage = `url('${cachedBg}')`;
    return;
  }

  const category = bgCategory || 'nature landscape';
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(category)}&orientation=landscape&client_id=${unsplashKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Unsplash ${res.status}`);
    const photo = await res.json();
    const imgUrl = photo.urls?.regular || photo.urls?.full;
    if (imgUrl) {
      bgEl.style.backgroundImage = `url('${imgUrl}')`;
      await Storage.set({ cachedBg: imgUrl, cachedBgTime: now });
    }
  } catch (e) {
    console.warn('[NewTab] Background failed:', e.message);
    if (cachedBg) {
      bgEl.style.backgroundImage = `url('${cachedBg}')`;
    } else {
      bgEl.style.background = 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)';
    }
  }
}

loadBackground();
