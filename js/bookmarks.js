// bookmarks.js — Render browser bookmark folders

let bookmarksLoaded = false;

async function loadBookmarks() {
  if (bookmarksLoaded) return; // already rendered, no need to re-fetch
  const container = document.getElementById('bookmarks-container');
  if (!container) return;

  const lp = document.createElement("p"); lp.className = "bookmarks-status"; lp.textContent = "Loading bookmarks…"; container.appendChild(lp);

  try {
    const tree = await new Promise((resolve) => chrome.bookmarks.getTree(resolve));
    const folders = [];

    // Chrome's tree root has 1 child (the actual root) whose children are
    // "Bookmarks bar", "Other bookmarks", "Mobile bookmarks" — walk all of them
    collectFolders(tree, folders, /* isRoot */ true);

    // Filter out empty folders
    const nonEmpty = folders.filter(f => f.items.length > 0);

    if (nonEmpty.length === 0) {
      const ep = document.createElement("p"); ep.className = "bookmarks-status"; ep.textContent = "No bookmarks found."; container.appendChild(ep);
      return;
    }

    container.innerHTML = '';
    nonEmpty.forEach(folder => {
      const el = document.createElement('div');
      el.className = 'bookmark-folder';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'bookmark-folder-title';
      titleDiv.innerHTML = `<span>📁</span> ${escHtml(folder.name || 'Bookmarks')}`;

      const scrollWrap = document.createElement('div');
      scrollWrap.className = 'bookmark-items-scroll';

      folder.items.forEach(item => {
        const a = document.createElement('a');
        a.className = 'bookmark-item';
        a.href = item.url;
        a.title = item.title || item.url;

        const img = document.createElement('img');
        img.src = `https://www.google.com/s2/favicons?domain=${getFaviconDomain(item.url)}&sz=32`;
        img.alt = '';
        img.addEventListener('error', () => { img.style.display = 'none'; });

        const span = document.createElement('span');
        span.textContent = item.title || item.url;

        a.appendChild(img);
        a.appendChild(span);
        scrollWrap.appendChild(a);
      });

      el.appendChild(titleDiv);
      el.appendChild(scrollWrap);
      container.appendChild(el);
    });

    bookmarksLoaded = true;
  } catch (e) {
    console.warn('[NewTab] Bookmarks error:', e);
    container.innerHTML = '';
    const errP = document.createElement('p');
    errP.className = 'bookmarks-error';
    errP.innerHTML = 'Could not load bookmarks.<br><small>Make sure the "bookmarks" permission is granted.</small>';
    container.appendChild(errP);
  }
}

/**
 * Walk the bookmark tree and collect every folder that has direct URL children.
 * Root-level virtual nodes (id "0", "1") are traversed but not shown as folders.
 */
function collectFolders(nodes, result, skipSelf) {
  for (const node of nodes) {
    if (!node.children) continue; // it's a URL leaf, skip

    const directLinks = node.children.filter(n => n.url);

    // Add this folder to results if it has direct bookmark children,
    // UNLESS it's the invisible synthetic root (id "0" or "1" with no title)
    const isVirtualRoot = !node.title || node.id === '0' || node.id === '1';

    if (!isVirtualRoot && directLinks.length > 0) {
      result.push({ name: node.title, items: directLinks });
    }

    // Always recurse into subfolders
    collectFolders(node.children, result, false);
  }
}

function getFaviconDomain(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Load on tab click
document.querySelector('[data-tab="bookmarks"]').addEventListener('click', loadBookmarks);

// Also pre-load in background so it's instant when the tab is switched to
setTimeout(loadBookmarks, 800);
