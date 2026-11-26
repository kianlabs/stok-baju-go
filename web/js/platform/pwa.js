export function registerServiceWorker(url = "/sw.js") {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(url).catch(() => {});
  });
}

export function setupInstallButton(button, { onNoPrompt } = {}) {
  let prompt = window.__installPrompt || null;
  const isInstalled = () =>
    matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  button.hidden = !prompt || isInstalled();

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    if (isInstalled()) return;
    prompt = e;
    window.__installPrompt = e;
    button.hidden = false;
  });

  button.addEventListener("click", async () => {
    if (!prompt) {
      if (onNoPrompt) onNoPrompt();
      return;
    }
    prompt.prompt();
    await prompt.userChoice;
    prompt = null;
    window.__installPrompt = null;
    button.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    prompt = null;
    window.__installPrompt = null;
    button.hidden = true;
  });
}

export function watchConnectivity({ onOnline, onOffline }) {
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
}

export function onResume(fn) {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") fn();
  });
}

// Shortcut dari ikon aplikasi (manifest): /?action=add, /?filter=habis, /?tab=pesanan
export function consumeLaunchParams() {
  const params = new URLSearchParams(location.search);
  if (location.search) history.replaceState(history.state, "", "/");
  return { filter: params.get("filter"), action: params.get("action"), tab: params.get("tab") };
}
