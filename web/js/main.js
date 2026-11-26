// Composition root: satu-satunya tempat semua lapisan dirangkai.
//
//   config ─┐
//   domain ─┼─> app (use case) ─> ui (view) ─┐
//   data ───┤                                ├─> main.js
//   state ──┘           platform (PWA) ──────┘
//
// Aturan dependensi: domain tidak meng-import apa pun selain config;
// app tidak menyentuh DOM; view hanya memanggil actions.

import { createStore } from "./state/store.js";
import { preferences } from "./state/preferences.js";
import { productRepository } from "./data/productRepository.js";
import { createActions } from "./app/actions.js";
import { FILTERS } from "./domain/product.js";
import { $ } from "./ui/dom.js";
import { createToast } from "./ui/toast.js";
import { createSheets } from "./ui/sheets.js";
import { createAppBar } from "./ui/views/appBar.js";
import { createSummary } from "./ui/views/summary.js";
import { createProductList } from "./ui/views/productList.js";
import { createDetailSheet } from "./ui/views/detailSheet.js";
import { createAdjustSheet } from "./ui/views/adjustSheet.js";
import { createProductFormSheet } from "./ui/views/productFormSheet.js";
import { createDeleteSheet } from "./ui/views/deleteSheet.js";
import * as pwa from "./platform/pwa.js";

// ---------- State & use case ----------
const store = createStore({
  products: [],
  loaded: false,
  loading: false,
  error: null,
  stale: false, // data dari cache service worker (offline)
  online: navigator.onLine,
  syncedAt: preferences.syncedAt(),
  query: "",
  filter: FILTERS.includes(preferences.filter()) ? preferences.filter() : "semua",
  sort: preferences.sort(),
  detailId: null,
});

const toast = createToast();
const actions = createActions({ store, repo: productRepository, prefs: preferences, notifier: toast });

// ---------- UI ----------
const sheets = createSheets({ onChange: toast.syncPosition });
const deps = { store, actions, sheets };

const form = createProductFormSheet(deps);
const adjust = createAdjustSheet(deps);
const remove = createDeleteSheet(deps);
const detail = createDetailSheet({
  ...deps,
  onEdit: (p) => form.open(p, { swap: true }),
  onAdjust: (p) => adjust.open(p),
  onDelete: (p) => remove.open(p),
});

createAppBar(deps);
createSummary(deps);
createProductList({
  ...deps,
  onOpen: (id) => detail.open(id),
  onAdd: () => form.open(null),
});

// ---------- PWA ----------
pwa.registerServiceWorker();
pwa.setupInstallButton($("installBtn"));
pwa.watchConnectivity({
  onOnline: () => {
    actions.setOnline(true);
    actions.load();
  },
  onOffline: () => actions.setOnline(false),
});
pwa.onResume(() => {
  if (store.get().loaded) actions.load();
});

// ---------- Mulai ----------
const launch = pwa.consumeLaunchParams();
if (FILTERS.includes(launch.filter)) actions.setFilter(launch.filter);
actions.load().then(() => {
  if (launch.action === "add") form.open(null);
});
