// UI: bottom sheet (<dialog>) yang terhubung ke history browser.
// Setiap sheet yang terbuka = 1 entri history, jadi tombol "back"
// di Android menutup sheet, bukan keluar dari aplikasi.
// Saat sheet ditutup, dialog menerima event "sheet:closed".

const CLOSE_MS = 170;

export function createSheets({ onChange = () => {} } = {}) {
  const stack = [];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function show(d) {
    d.classList.remove("closing");
    if (!d.open) d.showModal();
    onChange();
  }

  function hide(d, { animate = true } = {}) {
    d.dispatchEvent(new Event("sheet:closed"));
    if (!d.open) return;
    if (!animate || reduceMotion.matches) {
      d.close();
      onChange();
      return;
    }
    d.classList.add("closing");
    setTimeout(() => {
      d.classList.remove("closing");
      d.close();
      onChange();
    }, CLOSE_MS);
  }

  function open(d) {
    show(d);
    stack.push(d);
    history.pushState({ sheets: stack.length }, "");
  }

  // Tutup lewat history agar tombol back & tombol UI berperilaku sama.
  function close(count = 1) {
    const n = Math.min(count, stack.length);
    if (n > 0) history.go(-n);
  }
  const closeAll = () => close(stack.length);

  // Ganti sheet teratas tanpa mengubah history (mis. Detail → Edit).
  function swap(to) {
    const from = stack.pop();
    if (from) hide(from, { animate: false });
    stack.push(to);
    show(to);
  }

  window.addEventListener("popstate", (e) => {
    const depth = (e.state && e.state.sheets) || 0;
    while (stack.length > depth) hide(stack.pop());
  });

  document.querySelectorAll("dialog.sheet").forEach((d) => {
    d.addEventListener("cancel", (e) => {
      e.preventDefault(); // Esc
      close();
    });
    d.addEventListener("click", (e) => {
      if (e.target === d || e.target.closest("[data-close]")) close(); // latar gelap / tombol Batal
    });
  });

  // Reload saat sheet terbuka meninggalkan state lama di history.
  if (history.state && history.state.sheets) history.replaceState(null, "");

  return { open, close, closeAll, swap };
}
