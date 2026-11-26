// Naikkan VERSION setiap kali isi daftar SHELL berubah.

const VERSION = "sb-shell-v3";
const API_CACHE = "sb-api";
const IMG_CACHE = "sb-img";
const SHELL = [
  "/",
  "/app.css",
  "/manifest.json",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/js/main.js",
  "/js/config.js",
  "/js/domain/product.js",
  "/js/domain/order.js",
  "/js/data/http.js",
  "/js/data/imageCompressor.js",
  "/js/data/productRepository.js",
  "/js/data/orderRepository.js",
  "/js/state/store.js",
  "/js/state/preferences.js",
  "/js/app/actions.js",
  "/js/app/orderActions.js",
  "/js/platform/pwa.js",
  "/js/ui/dom.js",
  "/js/ui/format.js",
  "/js/ui/components.js",
  "/js/ui/toast.js",
  "/js/ui/sheets.js",
  "/js/ui/views/appBar.js",
  "/js/ui/views/summary.js",
  "/js/ui/views/productList.js",
  "/js/ui/views/detailSheet.js",
  "/js/ui/views/adjustSheet.js",
  "/js/ui/views/productFormSheet.js",
  "/js/ui/views/deleteSheet.js",
  "/js/ui/views/orderList.js",
  "/js/ui/views/orderFormSheet.js",
  "/js/ui/views/orderPaymentSheet.js",
  "/js/ui/views/orderCancelSheet.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = [VERSION, API_CACHE, IMG_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/uploads/")) {
    event.respondWith(cacheFirst(req));
  } else if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(staleWhileRevalidate(event));
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(IMG_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(API_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (!hit) throw err;
    // Tandai supaya aplikasi tahu ini data lama
    const headers = new Headers(hit.headers);
    headers.set("X-SW-Cache", "1");
    return new Response(await hit.blob(), { status: hit.status, statusText: hit.statusText, headers });
  }
}

async function staleWhileRevalidate(event) {
  const req = event.request;
  const cache = await caches.open(VERSION);
  const key = req.mode === "navigate" ? "/" : req;
  const hit = await cache.match(key, { ignoreSearch: req.mode === "navigate" });
  const network = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(key, res.clone());
      return res;
    })
    .catch(() => hit);
  if (hit) {
    event.waitUntil(network);
    return hit;
  }
  return network;
}
