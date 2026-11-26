// View: bar atas — status sinkron & tombol muat ulang.

import { $ } from "../dom.js";
import { timeHM } from "../format.js";

function syncStatus(s) {
  if (!s.online || s.stale) {
    return { cls: "offline", text: "Offline" + (s.syncedAt ? " · data " + timeHM(s.syncedAt) : "") };
  }
  if (s.error) return { cls: "error", text: "Gagal memuat" };
  if (!s.loaded) return { cls: "", text: "Memuat…" };
  return { cls: "", text: "Diperbarui " + timeHM(s.syncedAt || Date.now()) };
}

export function createAppBar({ store, actions }) {
  const sync = $("sync");
  const syncText = $("syncText");
  const refresh = $("refreshBtn");

  refresh.addEventListener("click", () => actions.load());

  function render(s) {
    const { cls, text } = syncStatus(s);
    sync.classList.remove("offline", "error");
    if (cls) sync.classList.add(cls);
    syncText.textContent = text;
    refresh.classList.toggle("spin", s.loading);
  }

  store.subscribe(render);
  render(store.get());
}
