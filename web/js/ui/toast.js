import { $ } from "./dom.js";

const EXIT_MS = 180;

export function createToast() {
  const root = $("toast");
  const msg = $("toastMsg");
  const action = $("toastAction");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let timer = null;
  let hideTimer = null;

  function syncPosition() {
    root.classList.toggle("above-sheet", !!document.querySelector("dialog.sheet[open]"));
  }

  function dismiss({ immediate = false } = {}) {
    clearTimeout(timer);
    clearTimeout(hideTimer);
    if (root.hidden) return;
    if (immediate || reduceMotion.matches) {
      root.classList.remove("leaving");
      root.hidden = true;
      return;
    }
    root.classList.add("leaving");
    hideTimer = setTimeout(() => {
      root.classList.remove("leaving");
      root.hidden = true;
    }, EXIT_MS);
  }

  function show(text, { undo, duration } = {}) {
    clearTimeout(timer);
    clearTimeout(hideTimer);
    root.classList.remove("leaving");
    msg.textContent = text;
    action.hidden = !undo;
    action.onclick = () => {
      dismiss({ immediate: true });
      if (undo) undo();
    };
    root.hidden = false;
    syncPosition();
    timer = setTimeout(() => dismiss(), duration ?? (undo ? 5000 : 2500));
  }

  return { show, dismiss, syncPosition };
}
