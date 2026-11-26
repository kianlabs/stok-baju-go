// UI: toast di bawah layar, opsional dengan tombol "Urungkan".
// Objek ini dipakai sebagai `notifier` oleh lapisan application.

import { $ } from "./dom.js";

export function createToast() {
  const root = $("toast");
  const msg = $("toastMsg");
  const action = $("toastAction");
  let timer = null;

  // Naik di atas footer sheet saat ada bottom sheet terbuka.
  function syncPosition() {
    root.classList.toggle("above-sheet", !!document.querySelector("dialog.sheet[open]"));
  }

  function dismiss() {
    root.hidden = true;
    clearTimeout(timer);
  }

  function show(text, { undo } = {}) {
    msg.textContent = text;
    action.hidden = !undo;
    action.onclick = () => {
      dismiss();
      if (undo) undo();
    };
    root.hidden = false;
    syncPosition();
    clearTimeout(timer);
    timer = setTimeout(dismiss, undo ? 5000 : 2500);
  }

  return { show, dismiss, syncPosition };
}
