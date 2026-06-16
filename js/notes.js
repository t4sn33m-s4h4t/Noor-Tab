// notes.js — Quick Notes with flicker-free toggle and custom confirm
const NOTES_KEY = 'quickNotes';
let saveTimer = null;
let _notesOpen = false; // single source of truth — prevents flicker

async function initNotes() {
  const data = await Storage.get(NOTES_KEY);
  const text = data[NOTES_KEY] || '';
  const ta   = document.getElementById('notes-textarea');
  if (ta) { ta.value=text; updateCharCount(text); }
}

function updateCharCount(text) {
  const el = document.getElementById('notes-charcount');
  if (!el) return;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  el.textContent = `${text.length} chars · ${words} words`;
}

function showSavedIndicator() {
  const el = document.getElementById('notes-saved');
  if (!el) return;
  el.textContent='✓ Saved'; el.classList.add('visible');
  setTimeout(()=>el.classList.remove('visible'), 1500);
}

function setNotesOpen(open) {
  _notesOpen = open;
  const panel = document.getElementById('notes-panel');
  const fab   = document.getElementById('notes-fab');
  if (open) {
    panel.classList.remove('hidden');
    fab.classList.add('active');
    document.getElementById('notes-textarea').focus();
  } else {
    panel.classList.add('hidden');
    fab.classList.remove('active');
  }
}

// Fix: use a flag to prevent close-reopen flicker on rapid click
document.getElementById('notes-fab').addEventListener('click', e => {
  e.stopPropagation();
  setNotesOpen(!_notesOpen);
});

document.getElementById('notes-textarea').addEventListener('input', function() {
  updateCharCount(this.value);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await Storage.set({ [NOTES_KEY]: this.value });
    showSavedIndicator();
  }, 600);
});

document.getElementById('notes-clear').addEventListener('click', () => {
  showConfirm('Clear all notes? This cannot be undone.', async () => {
    const ta = document.getElementById('notes-textarea');
    ta.value = '';
    updateCharCount('');
    await Storage.set({ [NOTES_KEY]: '' });
    showSavedIndicator();
    ta.focus();
  }, { title: 'Clear Notes', confirmLabel: 'Clear', confirmClass: 'save-btn danger-btn' });
});

document.getElementById('notes-close').addEventListener('click', () => setNotesOpen(false));

document.addEventListener('keydown', e => {
  if (e.key==='Escape' && _notesOpen) setNotesOpen(false);
});

document.addEventListener('mousedown', e => {
  if (!_notesOpen) return;
  const panel=document.getElementById('notes-panel');
  const fab=document.getElementById('notes-fab');
  if (!panel.contains(e.target) && !fab.contains(e.target)) setNotesOpen(false);
});

initNotes();
