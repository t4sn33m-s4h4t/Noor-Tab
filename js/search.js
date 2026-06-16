// search.js — Floating search bar with engine switching and suggestions
const SEARCH_ENGINES = {
  google:     q => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  youtube:    q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  duckduckgo: q => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  bing:       q => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
};

let _suggestionTimer = null;
let _activeSuggestion = -1;

async function initSearch() {
  const data = await Storage.get(['searchVisible','searchEngine','searchAlwaysVisible']);
  const visible = data.searchVisible !== false;
  const bar = document.getElementById('search-bar-wrap');
  if (bar) bar.style.display = visible ? '' : 'none';
  window._searchEngine = data.searchEngine || 'google';
}

function doSearch(q) {
  if (!q) return;
  const engine = window._searchEngine || 'google';
  const fn = SEARCH_ENGINES[engine] || SEARCH_ENGINES.google;
  window.location.href = fn(q);
}

async function fetchSuggestions(query) {
  if (!query.trim()) return [];
  try {
    // DuckDuckGo autocomplete — CORS-friendly
    const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`;
    const res  = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data[1] || []).slice(0, 6);
  } catch { return []; }
}

function renderSuggestions(suggestions, inputEl) {
  let list = document.getElementById('search-suggestions');
  if (!list) {
    list = document.createElement('ul');
    list.id = 'search-suggestions';
    list.className = 'search-suggestions glass';
    document.body.appendChild(list); // attach to body, not search wrap
  }

  list.innerHTML = '';
  _activeSuggestion = -1;

  if (!suggestions.length) { list.style.display = 'none'; return; }

  // Position fixed below the input
  const rect = inputEl.getBoundingClientRect();
  list.style.top   = (rect.bottom + 8) + 'px';
  list.style.left  = rect.left + 'px';
  list.style.width = rect.width + 'px';

  suggestions.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'search-suggestion-item';
    li.textContent = s;
    li.addEventListener('mousedown', e => {
      e.preventDefault();
      inputEl.value = s;
      hideSuggestions();
      doSearch(s);
    });
    list.appendChild(li);
  });
  list.style.display = 'block';
}

function hideSuggestions() {
  const list = document.getElementById('search-suggestions');
  if (list) list.style.display = 'none';
  _activeSuggestion = -1;
}

// ── Wire input ────────────────────────────────────────────────
const searchInput = document.getElementById('search-input');
const searchBtn   = document.getElementById('search-submit-btn');

if (searchInput) {
  searchInput.addEventListener('input', () => {
    const q = searchInput.value;
    clearTimeout(_suggestionTimer);
    if (!q.trim()) { hideSuggestions(); return; }
    _suggestionTimer = setTimeout(async () => {
      const suggestions = await fetchSuggestions(q);
      renderSuggestions(suggestions, searchInput);
    }, 200);
  });

  searchInput.addEventListener('keydown', e => {
    const list = document.getElementById('search-suggestions');
    const items = list ? list.querySelectorAll('.search-suggestion-item') : [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _activeSuggestion = Math.min(_activeSuggestion+1, items.length-1);
      items.forEach((el,i)=>el.classList.toggle('active',i===_activeSuggestion));
      if (items[_activeSuggestion]) searchInput.value=items[_activeSuggestion].textContent;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _activeSuggestion = Math.max(_activeSuggestion-1, -1);
      items.forEach((el,i)=>el.classList.toggle('active',i===_activeSuggestion));
      if (_activeSuggestion>=0 && items[_activeSuggestion]) searchInput.value=items[_activeSuggestion].textContent;
    } else if (e.key === 'Enter') {
      hideSuggestions();
      doSearch(searchInput.value);
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  });

  searchInput.addEventListener('blur', () => { setTimeout(hideSuggestions, 150); });
}

if (searchBtn) {
  searchBtn.addEventListener('click', () => { hideSuggestions(); doSearch(searchInput?.value); });
}

initSearch();

// ── "/" shortcut to focus search bar ─────────────────────────
document.addEventListener('keydown', e => {
  if (e.key !== '/') return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  e.preventDefault();
  const bar = document.getElementById('search-bar-wrap');
  const inp = document.getElementById('search-input');
  if (!bar || !inp) return;
  // If hidden, make it temporarily visible, focus, then respect always-visible setting
  if (bar.style.display === 'none') bar.style.display = '';
  inp.focus();
  inp.select();
});
