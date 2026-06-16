// bookmarks.js — Browser bookmark folders renderer
let bookmarksLoaded = false;

async function loadBookmarks() {
  if (bookmarksLoaded) return;
  const container = document.getElementById('bookmarks-container');
  if (!container) return;
  const lp = document.createElement('p'); lp.className='bookmarks-status'; lp.textContent='Loading bookmarks…'; container.appendChild(lp);
  try {
    const tree    = await new Promise(res => chrome.bookmarks.getTree(res));
    const folders = [];
    collectFolders(tree, folders);
    const nonEmpty = folders.filter(f=>f.items.length>0);
    container.innerHTML = '';
    if (!nonEmpty.length) {
      const p=document.createElement('p'); p.className='bookmarks-status'; p.textContent='No bookmarks found.'; container.appendChild(p); return;
    }
    nonEmpty.forEach(folder => {
      const el = document.createElement('div'); el.className='bookmark-folder';
      const titleDiv=document.createElement('div'); titleDiv.className='bookmark-folder-title'; titleDiv.innerHTML=`<span>📁</span> ${escHtml(folder.name||'Bookmarks')}`;
      const scrollWrap=document.createElement('div'); scrollWrap.className='bookmark-items-scroll';
      folder.items.forEach(item => {
        const a=document.createElement('a'); a.className='bookmark-item'; a.href=item.url; a.title=item.title||item.url;
        const img=document.createElement('img'); img.src=`https://www.google.com/s2/favicons?domain=${getFaviconDomain(item.url)}&sz=32`; img.alt=''; img.addEventListener('error',()=>{img.style.display='none';});
        const span=document.createElement('span'); span.textContent=item.title||item.url;
        a.appendChild(img); a.appendChild(span); scrollWrap.appendChild(a);
      });
      el.appendChild(titleDiv); el.appendChild(scrollWrap); container.appendChild(el);
    });
    bookmarksLoaded = true;
  } catch {
    container.innerHTML = '';
    const p=document.createElement('p'); p.className='bookmarks-error'; p.innerHTML='Could not load bookmarks.<br><small>Ensure "bookmarks" permission is granted.</small>'; container.appendChild(p);
  }
}

function collectFolders(nodes, result) {
  for (const node of nodes) {
    if (!node.children) continue;
    const directLinks = node.children.filter(n=>n.url);
    const isVirtualRoot = !node.title || node.id==='0' || node.id==='1';
    if (!isVirtualRoot && directLinks.length>0) result.push({name:node.title,items:directLinks});
    collectFolders(node.children, result);
  }
}

function getFaviconDomain(url) { try{return new URL(url).hostname;}catch{return '';} }
function escHtml(str) { return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

document.querySelector('[data-tab="bookmarks"]').addEventListener('click', loadBookmarks);
setTimeout(loadBookmarks, 800);
