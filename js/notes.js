// notes.js — Floating Quick Notes scratchpad
// Auto-saves to chrome.storage.local with debounce, char count shown

const NOTES_KEY = 'quickNotes';
let saveTimer   = null;

async function initNotes() {
  const data = await Storage.get(NOTES_KEY);
  const text = data[NOTES_KEY] || '';
  const ta   = document.getElementById('notes-textarea');
  if (ta) {
    ta.value = text;
    updateCharCount(text);
  }
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
  el.textContent = '✓ Saved';
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 1500);
}

// ── Auto-save with 600ms debounce ────────────────────────
document.getElementById('notes-textarea').addEventListener('input', function () {
  updateCharCount(this.value);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await Storage.set({ [NOTES_KEY]: this.value });
    showSavedIndicator();
  }, 600);
});

// ── Clear button ─────────────────────────────────────────
document.getElementById('notes-clear').addEventListener('click', async () => {
  if (!confirm('Clear all notes?')) return;
  const ta = document.getElementById('notes-textarea');
  ta.value = '';
  updateCharCount('');
  await Storage.set({ [NOTES_KEY]: '' });
  showSavedIndicator();
  ta.focus();
});

// ── FAB toggle ───────────────────────────────────────────
const notesFab   = document.getElementById('notes-fab');
const notesPanel = document.getElementById('notes-panel');

notesFab.addEventListener('click', () => {
  const isOpen = !notesPanel.classList.contains('hidden');
  if (isOpen) {
    notesPanel.classList.add('hidden');
    notesFab.classList.remove('active');
  } else {
    notesPanel.classList.remove('hidden');
    notesFab.classList.add('active');
    document.getElementById('notes-textarea').focus();
  }
});

document.getElementById('notes-close').addEventListener('click', () => {
  notesPanel.classList.add('hidden');
  notesFab.classList.remove('active');
});

// ── Close on Escape ───────────────────────────────────────
// (handled in main.js via closeAllSidebars logic, but also here for safety)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !notesPanel.classList.contains('hidden')) {
    notesPanel.classList.add('hidden');
    notesFab.classList.remove('active');
  }
});

initNotes();

// ── Close on click outside ─────────────────────────────
document.addEventListener('mousedown', (e) => {
  if (!notesPanel.classList.contains('hidden')) {
    if (!notesPanel.contains(e.target) && e.target !== notesFab) {
      notesPanel.classList.add('hidden');
      notesFab.classList.remove('active');
    }
  }
});
