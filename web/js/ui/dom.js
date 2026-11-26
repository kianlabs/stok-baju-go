export const $ = (id) => document.getElementById(id);

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

// Ikon dari <symbol> di index.html
export const icon = (name) => `<svg class="ic" aria-hidden="true"><use href="#i-${name}"/></svg>`;

export function vibrate(ms = 8) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

export function on(root, type, selector, handler) {
  root.addEventListener(type, (e) => {
    const el = e.target.closest(selector);
    if (el && root.contains(el)) handler(el, e);
  });
}
