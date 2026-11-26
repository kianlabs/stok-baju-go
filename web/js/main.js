// Composition root: satu-satunya tempat semua lapisan dirangkai.
// Aturan dependensi: domain tidak meng-import apa pun selain config;
// app tidak menyentuh DOM; view hanya memanggil actions.

import { createStore } from "./state/store.js";
import { preferences } from "./state/preferences.js";
import { productRepository } from "./data/productRepository.js";
import { orderRepository } from "./data/orderRepository.js";
import { createActions } from "./app/actions.js";
import { createOrderActions } from "./app/orderActions.js";
import { FILTERS } from "./domain/product.js";
import { ORDER_FILTERS } from "./domain/order.js";
import { $, on } from "./ui/dom.js";
import { createToast } from "./ui/toast.js";
import { createSheets } from "./ui/sheets.js";
import { createAppBar } from "./ui/views/appBar.js";
import { createSummary } from "./ui/views/summary.js";
import { createProductList } from "./ui/views/productList.js";
import { createDetailSheet } from "./ui/views/detailSheet.js";
import { createAdjustSheet } from "./ui/views/adjustSheet.js";
import { createProductFormSheet } from "./ui/views/productFormSheet.js";
import { createDeleteSheet } from "./ui/views/deleteSheet.js";
import { createOrderList } from "./ui/views/orderList.js";
import { createOrderFormSheet } from "./ui/views/orderFormSheet.js";
import { createOrderPaymentSheet } from "./ui/views/orderPaymentSheet.js";
import { createOrderCancelSheet } from "./ui/views/orderCancelSheet.js";
import * as pwa from "./platform/pwa.js";

const savedTab = preferences.tab();
const savedOrderFilter = preferences.orderFilter();

const store = createStore({
  tab: savedTab === "pesanan" ? "pesanan" : "stok",
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
  orders: [],
  ordersLoaded: false,
  ordersError: null,
  orderQuery: "",
  orderFilter: ORDER_FILTERS.includes(savedOrderFilter) ? savedOrderFilter : "semua",
});

const toast = createToast();
const actions = createActions({ store, repo: productRepository, prefs: preferences, notifier: toast });
const orderActions = createOrderActions({
  store,
  repo: orderRepository,
  uploadPhoto: productRepository.uploadPhoto,
  prefs: preferences,
  notifier: toast,
});

const sheets = createSheets({ onChange: toast.syncPosition });
const deps = { store, actions, orderActions, sheets };

const form = createProductFormSheet(deps);
const adjust = createAdjustSheet(deps);
const remove = createDeleteSheet(deps);
const detail = createDetailSheet({
  ...deps,
  onEdit: (p) => form.open(p, { swap: true }),
  onAdjust: (p) => adjust.open(p),
  onDelete: (p) => remove.open(p),
});

const orderForm = createOrderFormSheet(deps);
const orderPay = createOrderPaymentSheet(deps);
const orderCancel = createOrderCancelSheet(deps);

createAppBar(deps);
createSummary(deps);
createProductList({
  ...deps,
  onOpen: (id) => detail.open(id),
  onAdd: () => form.open(null),
});
createOrderList({
  ...deps,
  onAdd: () => orderForm.open(null),
  onEdit: (o) => orderForm.open(o),
  onPay: (o) => orderPay.open(o),
  onCancel: (o) => orderCancel.open(o),
});

function setTab(tab) {
  preferences.saveTab(tab);
  store.set({ tab });
}

on($("mainTabs"), "click", "[data-tab]", (btn) => setTab(btn.dataset.tab));

$("addBtn").addEventListener("click", () => {
  if (store.get().tab === "pesanan") orderForm.open(null);
  else form.open(null);
});

function renderTab(s) {
  const isOrders = s.tab === "pesanan";
  $("stockView").hidden = isOrders;
  $("ordersView").hidden = !isOrders;
  $("addBtnLabel").textContent = isOrders ? "Pesanan" : "Produk";
  $("ordersTabBadge").textContent = s.orders.length ? String(s.orders.length) : "";
  document.querySelectorAll("#mainTabs [data-tab]").forEach((b) => {
    const active = b.dataset.tab === s.tab;
    b.classList.toggle("on", active);
    b.setAttribute("aria-selected", String(active));
  });
}

store.subscribe(renderTab);
renderTab(store.get());

pwa.registerServiceWorker();
pwa.setupInstallButton($("installBtn"), {
  onNoPrompt: () =>
    toast.show("Buka menu browser → Tambah ke layar utama. Di iPhone: Share → Add to Home Screen.", {
      duration: 6000,
    }),
});
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

const launch = pwa.consumeLaunchParams();
if (launch.tab === "pesanan" || launch.tab === "stok") setTab(launch.tab);
if (FILTERS.includes(launch.filter)) {
  setTab("stok");
  actions.setFilter(launch.filter);
}
orderActions.load();
actions.load().then(() => {
  if (launch.action === "add") {
    setTab("stok");
    form.open(null);
  }
});
