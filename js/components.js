// components.js — Shared UI components (modals, toasts, confirms)
// No external dependencies, no remote code. MV3 compliant.

// ── Delete Icon SVG (used everywhere) ─────────────────────────
const ICON_DELETE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><circle cx="12" cy="11" r="1" fill="currentColor" stroke="none"/><line x1="12" y1="13" x2="12" y2="17"/></svg>`;
const ICON_CLOSE  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_EDIT   = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;

// ── Global modal container ────────────────────────────────────
let _modalOverlay = null;
function getModalRoot() {
  if (!_modalOverlay) {
    _modalOverlay = document.createElement('div');
    _modalOverlay.id = 'global-modal-root';
    document.body.appendChild(_modalOverlay);
  }
  return _modalOverlay;
}

// ── showModal(options) ────────────────────────────────────────
// options: { title, body (HTML string or Element), buttons: [{label, class, action}], onClose }
function showModal({ title = '', body = '', buttons = [], onClose, width = '380px' } = {}) {
  const root = getModalRoot();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal glass';
  modal.style.maxWidth = width;

  const h3 = document.createElement('h3');
  h3.textContent = title;
  modal.appendChild(h3);

  const bodyEl = document.createElement('div');
  bodyEl.className = 'modal-body';
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else bodyEl.appendChild(body);
  modal.appendChild(bodyEl);

  if (buttons.length) {
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    buttons.forEach(btn => {
      const el = document.createElement('button');
      el.className = btn.class || 'cancel-btn';
      el.textContent = btn.label;
      el.addEventListener('click', () => {
        close();
        if (btn.action) btn.action();
      });
      actions.appendChild(el);
    });
    modal.appendChild(actions);
  }

  overlay.appendChild(modal);

  function close() {
    overlay.remove();
    if (onClose) onClose();
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  root.appendChild(overlay);

  // Focus first input if any
  requestAnimationFrame(() => {
    const inp = modal.querySelector('input, textarea, select');
    if (inp) inp.focus();
  });

  return { close, overlay, modal };
}

// ── showConfirm(message, onConfirm, opts) ────────────────────
function showConfirm(message, onConfirm, { title = 'Confirm', confirmLabel = 'Confirm', confirmClass = 'save-btn danger-btn', cancelLabel = 'Cancel' } = {}) {
  const body = document.createElement('p');
  body.className = 'modal-confirm-msg';
  body.textContent = message;

  showModal({
    title,
    body,
    buttons: [
      { label: cancelLabel, class: 'cancel-btn' },
      { label: confirmLabel, class: confirmClass, action: onConfirm }
    ]
  });
}

// ── showToast(message, type) ──────────────────────────────────
// type: 'success' | 'error' | 'info'
let _toastContainer = null;
function showToast(message, type = 'success') {
  if (!_toastContainer) {
    _toastContainer = document.createElement('div');
    _toastContainer.id = 'toast-container';
    document.body.appendChild(_toastContainer);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  _toastContainer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, 2200);
}

// ── showPromptModal(opts) ─────────────────────────────────────
// Returns a promise that resolves with the entered value or null on cancel
function showPromptModal({ title, label, placeholder = '', type = 'text', value = '' } = {}) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    const lbl = document.createElement('label');
    lbl.className = 'settings-label';
    lbl.textContent = label;
    const inp = document.createElement('input');
    inp.type = type;
    inp.className = 'settings-input';
    inp.placeholder = placeholder;
    inp.value = value;
    lbl.appendChild(inp);
    wrap.appendChild(lbl);

    const { close } = showModal({
      title,
      body: wrap,
      buttons: [
        { label: 'Cancel', class: 'cancel-btn', action: () => resolve(null) },
        { label: 'OK', class: 'save-btn', action: () => resolve(inp.value.trim()) }
      ],
      onClose: () => resolve(null)
    });

    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { close(); resolve(inp.value.trim()); }
    });
  });
}
