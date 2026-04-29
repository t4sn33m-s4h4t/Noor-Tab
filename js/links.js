// links.js — Link cards with custom icon URL support

let links = [];
let editingIndex = null;
let dragSrcIndex = null;

async function loadLinks() {
  const data = await Storage.get('links');
  links = data.links || [];
  renderLinks();
}

function getFaviconUrl(url) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch { return null; }
}

function getInitial(name) {
  return (name || '?').charAt(0).toUpperCase();
}

function buildIconEl(src, name) {
  const placeholder = document.createElement('div');
  placeholder.className = 'link-favicon-placeholder';
  placeholder.style.display = 'none';
  placeholder.textContent = getInitial(name);

  const img = document.createElement('img');
  img.className = 'link-favicon';
  img.alt = '';
  img.src = src;
  img.addEventListener('error', () => {
    img.style.display = 'none';
    placeholder.style.display = 'flex';
  });
  return [img, placeholder];
}

function renderLinks() {
  const grid = document.getElementById('links-grid');
  if (!grid) return;
  grid.innerHTML = '';

  links.forEach((link, i) => {
    const card = document.createElement('a');
    card.className = 'link-card';
    card.href = link.url;
    card.draggable = true;
    card.dataset.index = i;

    // Build icon using DOM (no inline onerror)
    const iconSrc = link.customIcon || getFaviconUrl(link.url);
    if (iconSrc) {
      const [img, placeholder] = buildIconEl(iconSrc, link.name);
      card.appendChild(img);
      card.appendChild(placeholder);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'link-favicon-placeholder';
      placeholder.textContent = getInitial(link.name);
      card.appendChild(placeholder);
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'link-name';
    nameSpan.textContent = link.name || link.url;
    card.appendChild(nameSpan);

    const actions = document.createElement('div');
    actions.className = 'link-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'link-action-btn edit';
    editBtn.title = 'Edit';
    editBtn.dataset.i = i;
    editBtn.textContent = '✏️';

    const delBtn = document.createElement('button');
    delBtn.className = 'link-action-btn delete';
    delBtn.title = 'Delete';
    delBtn.dataset.i = i;
    delBtn.textContent = '🗑️';

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    card.appendChild(actions);

    card.addEventListener('click', (e) => {
      if (e.target.closest('.link-actions')) e.preventDefault();
    });
    editBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      openLinkModal(parseInt(e.currentTarget.dataset.i));
    });
    delBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      deleteLink(parseInt(e.currentTarget.dataset.i));
    });

    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragover',  onDragOver);
    card.addEventListener('drop',      onDrop);
    card.addEventListener('dragend',   onDragEnd);

    grid.appendChild(card);
  });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Drag & Drop ──────────────────────────────────────────
function onDragStart(e) {
  dragSrcIndex = parseInt(this.dataset.index);
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.index);
}
function onDragOver(e) {
  e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.link-card').forEach(c => c.classList.remove('drag-over'));
  this.classList.add('drag-over');
}
function onDrop(e) {
  e.preventDefault();
  const targetIndex = parseInt(this.dataset.index);
  if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;
  const moved = links.splice(dragSrcIndex, 1)[0];
  links.splice(targetIndex, 0, moved);
  saveLinks();
}
function onDragEnd() {
  document.querySelectorAll('.link-card').forEach(c => c.classList.remove('dragging', 'drag-over'));
  dragSrcIndex = null;
}

// ── Modal ────────────────────────────────────────────────
function openLinkModal(index = null) {
  editingIndex = index;
  document.getElementById('modal-title').textContent = index !== null ? 'Edit Link' : 'Add Link';

  const urlInput  = document.getElementById('modal-url');
  const nameInput = document.getElementById('modal-name');
  const iconInput = document.getElementById('modal-icon');

  if (index !== null) {
    urlInput.value  = links[index].url        || '';
    nameInput.value = links[index].name       || '';
    iconInput.value = links[index].customIcon || '';
  } else {
    urlInput.value = nameInput.value = iconInput.value = '';
  }

  document.getElementById('link-modal-overlay').classList.remove('hidden');
  urlInput.focus();
}

function closeLinkModal() {
  document.getElementById('link-modal-overlay').classList.add('hidden');
  editingIndex = null;
}

async function saveLinkModal() {
  let url  = document.getElementById('modal-url').value.trim();
  let name = document.getElementById('modal-name').value.trim();
  let customIcon = document.getElementById('modal-icon').value.trim();

  if (!url) return;
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;

  // Auto-derive name from URL if blank
  if (!name) {
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      name = hostname.split('.')[0].replace(/-/g, ' ');
      name = name.charAt(0).toUpperCase() + name.slice(1);
    } catch { name = url; }
  }

  // Validate icon URL if provided (must start with http/https or be empty)
  if (customIcon && !customIcon.startsWith('http://') && !customIcon.startsWith('https://')) {
    customIcon = 'https://' + customIcon;
  }

  const entry = { url, name };
  if (customIcon) entry.customIcon = customIcon;

  if (editingIndex !== null) {
    links[editingIndex] = entry;
  } else {
    links.push(entry);
  }

  await saveLinks();
  closeLinkModal();
}

function deleteLink(i) {
  links.splice(i, 1);
  saveLinks();
}

async function saveLinks() {
  await Storage.set({ links });
  renderLinks();
}

// ── Init ─────────────────────────────────────────────────
document.getElementById('add-link-btn').addEventListener('click', () => openLinkModal());
document.getElementById('modal-cancel').addEventListener('click', closeLinkModal);
document.getElementById('link-modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeLinkModal();
});
document.getElementById('modal-save').addEventListener('click', saveLinkModal);
document.getElementById('modal-url').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveLinkModal();
});

loadLinks();
