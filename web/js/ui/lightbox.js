// UI: lightbox sederhana (<dialog>) untuk memperbesar foto produk/pesanan saat di-tap.

import { $, on } from "./dom.js";

const CLOSE_MS = 160;

export function setupLightbox() {
  const dialog = $("photoLightbox");
  const img = $("lightboxImg");
  const caption = $("lightboxCaption");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let closeTimer = null;

  function open(src, title = "") {
    if (!src) return;
    clearTimeout(closeTimer);
    dialog.classList.remove("closing");
    img.src = src;
    img.alt = title;
    caption.textContent = title;
    caption.hidden = !title;
    if (!dialog.open) dialog.showModal();
  }

  function close() {
    if (!dialog.open || dialog.classList.contains("closing")) return;
    if (reduceMotion.matches) {
      dialog.close();
      return;
    }
    dialog.classList.add("closing");
    closeTimer = setTimeout(() => {
      dialog.classList.remove("closing");
      if (dialog.open) dialog.close();
    }, CLOSE_MS);
  }

  on(document.body, "click", "[data-zoom-src]", (el, e) => {
    e.stopPropagation();
    open(el.dataset.zoomSrc, el.dataset.zoomTitle || "");
  });

  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog || e.target.closest("[data-lightbox-close]")) close();
  });

  return { open, close };
}
