// links.js — Quick Links with drag-reorder
let links = [];
let editingIndex = null;
let dragSrcIndex = null;

async function loadLinks() {
  const data = await Storage.get('links');
  links = data.links || [];
  renderLinks();
}

function getFaviconUrl(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; }
  catch { return null; }
}

function getInitial(name) { return (name||'?').charAt(0).toUpperCase(); }

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

    const iconSrc = link.customIcon || getFaviconUrl(link.url);
    if (iconSrc) {
      const img = document.createElement('img');
      img.className = 'link-favicon'; img.alt = ''; img.src = iconSrc;
      const placeholder = document.createElement('div');
      placeholder.className = 'link-favicon-placeholder'; placeholder.style.display='none'; placeholder.textContent = getInitial(link.name);
      img.addEventListener('error', () => { img.style.display='none'; placeholder.style.display='flex'; });
      card.appendChild(img); card.appendChild(placeholder);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className='link-favicon-placeholder'; placeholder.textContent=getInitial(link.name);
      card.appendChild(placeholder);
    }

    const nameSpan = document.createElement('span');
    nameSpan.className='link-name'; nameSpan.textContent=link.name||link.url;
    card.appendChild(nameSpan);

    const actions = document.createElement('div');
    actions.className = 'link-actions';

    const editBtn = document.createElement('button');
    editBtn.className='link-action-btn edit'; editBtn.title='Edit'; editBtn.dataset.i=i;
    editBtn.innerHTML = ICON_EDIT;

    const delBtn = document.createElement('button');
    delBtn.className='link-action-btn delete'; delBtn.title='Delete'; delBtn.dataset.i=i;
    delBtn.innerHTML = ICON_DELETE;

    actions.appendChild(editBtn); actions.appendChild(delBtn);
    card.appendChild(actions);

    card.addEventListener('click', e => { if (e.target.closest('.link-actions')) e.preventDefault(); });
    editBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openLinkModal(parseInt(e.currentTarget.dataset.i)); });
    delBtn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const idx = parseInt(e.currentTarget.dataset.i);
      showConfirm(`Remove link "${links[idx]?.name||''}"?`, () => deleteLink(idx), { confirmLabel:'Remove', confirmClass:'save-btn danger-btn' });
    });
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragover',  onDragOver);
    card.addEventListener('drop',      onDrop);
    card.addEventListener('dragend',   onDragEnd);
    grid.appendChild(card);
  });
}

function onDragStart(e) { dragSrcIndex=parseInt(this.dataset.index); this.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', this.dataset.index); }
function onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect='move'; document.querySelectorAll('.link-card').forEach(c=>c.classList.remove('drag-over')); this.classList.add('drag-over'); }
function onDrop(e) {
  e.preventDefault();
  const targetIndex=parseInt(this.dataset.index);
  if (dragSrcIndex===null||dragSrcIndex===targetIndex) return;
  const moved=links.splice(dragSrcIndex,1)[0]; links.splice(targetIndex,0,moved);
  saveLinks();
}
function onDragEnd() { document.querySelectorAll('.link-card').forEach(c=>c.classList.remove('dragging','drag-over')); dragSrcIndex=null; }

function openLinkModal(index=null) {
  editingIndex = index;
  const link = index!==null ? links[index] : null;
  const wrap = document.createElement('div');

  const lblUrl  = document.createElement('label'); lblUrl.className='settings-label'; lblUrl.textContent='URL';
  const inpUrl  = document.createElement('input'); inpUrl.type='url'; inpUrl.className='settings-input'; inpUrl.placeholder='https://example.com'; inpUrl.value=link?.url||'';
  const lblName = document.createElement('label'); lblName.className='settings-label settings-label-mt'; lblName.textContent='Name (optional)';
  const inpName = document.createElement('input'); inpName.type='text'; inpName.className='settings-input'; inpName.placeholder='Leave blank to auto-detect'; inpName.value=link?.name||'';
  const lblIcon = document.createElement('label'); lblIcon.className='settings-label settings-label-mt'; lblIcon.textContent='Custom Icon URL (optional)';
  const inpIcon = document.createElement('input'); inpIcon.type='url'; inpIcon.className='settings-input'; inpIcon.placeholder='https://example.com/icon.png'; inpIcon.value=link?.customIcon||'';
  const hint    = document.createElement('span'); hint.className='input-hint'; hint.textContent='Leave blank to use favicon automatically';

  lblUrl.appendChild(inpUrl); lblName.appendChild(inpName); lblIcon.appendChild(inpIcon); lblIcon.appendChild(hint);
  wrap.appendChild(lblUrl); wrap.appendChild(lblName); wrap.appendChild(lblIcon);

  showModal({
    title: index!==null ? 'Edit Link' : 'Add Link',
    body: wrap,
    buttons: [
      { label:'Cancel', class:'cancel-btn' },
      { label:'Save', class:'save-btn', action: async () => {
        let url=inpUrl.value.trim(), name=inpName.value.trim(), customIcon=inpIcon.value.trim();
        if (!url) return;
        if (!url.startsWith('http')) url='https://'+url;
        if (!name) { try { const h=new URL(url).hostname.replace('www.',''); name=h.split('.')[0]; name=name.charAt(0).toUpperCase()+name.slice(1); } catch { name=url; } }
        if (customIcon && !customIcon.startsWith('http')) customIcon='https://'+customIcon;
        const entry={url,name}; if(customIcon) entry.customIcon=customIcon;
        if (editingIndex!==null) links[editingIndex]=entry; else links.push(entry);
        await saveLinks();
      }}
    ]
  });
  inpUrl.addEventListener('keydown', e => { if(e.key==='Enter') inpName.focus(); });
}

function deleteLink(i) { links.splice(i,1); saveLinks(); }
async function saveLinks() { await Storage.set({links}); renderLinks(); }

document.getElementById('add-link-btn').addEventListener('click', () => openLinkModal());
loadLinks();
