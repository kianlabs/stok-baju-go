// Platform: fitur PWA & browser — service worker, tombol pasang, koneksi.
// Tidak tahu apa-apa soal produk; hanya memberi tahu lewat callback.

export function registerServiceWorker(url = "/sw.js") {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(url).catch(() => {});
  });
}

// Tampilkan tombol "Pasang" hanya jika browser mengizinkan instalasi.
export function setupInstallButton(button) {
  let prompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    prompt = e;
    button.hidden = false;
  });
  button.addEventListener("click", async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    prompt = null;
    button.hidden = true;
  });
  window.addEventListener("appinstalled", () => {
    button.hidden = true;
  });
}

export function watchConnectivity({ onOnline, onOffline }) {
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
}

// Dipanggil saat aplikasi kembali dibuka dari latar belakang.
export function onResume(fn) {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") fn();
  });
}

// Shortcut dari ikon aplikasi (manifest): /?action=add, /?filter=habis
export function consumeLaunchParams() {
  const params = new URLSearchParams(location.search);
  if (location.search) history.replaceState(history.state, "", "/");
  return { filter: params.get("filter"), action: params.get("action") };
}
