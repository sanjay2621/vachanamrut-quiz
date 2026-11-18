// Discourages copying site content: blocks copy/cut, text selection, the
// context menu, dragging and the usual copy/save/view-source shortcuts.
// Form fields (search box etc.) keep working normally.
// Note: this only deters casual copying; it cannot stop determined users.

const isEditable = (el) =>
  el instanceof Element &&
  !!el.closest('input, textarea, select, [contenteditable="true"]');

const block = (e) => {
  if (!isEditable(e.target)) e.preventDefault();
};

const BLOCKED_KEYS = new Set(['c', 'x', 'a', 's', 'u', 'p']);

export function installNoCopy() {
  ['copy', 'cut', 'contextmenu', 'selectstart', 'dragstart'].forEach((type) =>
    document.addEventListener(type, block)
  );
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && BLOCKED_KEYS.has(key) && !isEditable(e.target)) {
      e.preventDefault();
    }
  });
}
