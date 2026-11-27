// View: tab Pesanan — ringkasan, cari, filter (Semua/Belum diambil/Belum bayar), daftar pesanan rapi.

import { $, esc, icon, on } from "../dom.js";
import { number, rupiah, rupiahShort } from "../format.js";
import { thumb } from "../components.js";
import * as Order from "../../domain/order.js";

function orderRowHTML(o, products) {
  const total = Order.orderTotal(o);
  const waHref = Order.whatsappUrl(o);
  const size = Order.orderSizeLabel(o);
  const payText = Order.paymentBadgeText(o);
  const isUnpaid = o.payment === "unpaid";
  const fulfillText = o.fulfillment === "delivery" ? "Dikirim" : "Ambil toko";
  const photo = Order.resolveOrderImage(o, products);
  const qtyText = o.quantity > 1 ? `${size} × ${o.quantity}` : size;

  return `<li class="order-row">
    <div class="order-main">
      ${thumb({ name: o.product_name, image_url: photo }, "sm", { zoom: true })}
      <div class="order-info">
        <div class="order-head">
          <span class="order-name">${esc(o.customer_name)}</span>
          <b class="order-price">${rupiah(total)}</b>
        </div>
        <div class="order-sub">
          <span class="order-item-name">${esc(o.product_name)} · ${esc(qtyText)}</span>
          <span class="order-date">${esc(Order.formatKeepDate(o.keep_date))}</span>
        </div>
        <div class="order-status-line">
          <span class="pay-state ${isUnpaid ? "unpaid" : "paid"}"><i class="dot"></i>${esc(payText)}</span>
          <span class="order-fulfill">· ${esc(fulfillText)}</span>
        </div>
      </div>
    </div>
    <div class="order-bar">
      <a class="act-btn wa" href="${esc(waHref)}" target="_blank" rel="noopener noreferrer" aria-label="Chat WhatsApp ${esc(o.customer_name)}">
        ${icon("message")} WA
      </a>
      <button class="act-btn" type="button" data-order-pay="${o.id}">
        ${icon("wallet")} ${isUnpaid ? "Tandai lunas" : "Ubah bayar"}
      </button>
      <span class="order-bar-spacer"></span>
      <button class="act-btn icon-only" type="button" data-order-edit="${o.id}" aria-label="Edit pesanan ${esc(o.customer_name)}">
        ${icon("edit")}
      </button>
      <button class="act-btn danger-text" type="button" data-order-cancel="${o.id}">
        Batal
      </button>
    </div>
  </li>`;
}

const ORDER_SKELETON = `<li class="order-row skeleton">
  <div class="order-main">
    <span class="thumb sm"></span>
    <div class="order-info">
      <span class="line" style="width:52%"></span>
      <span class="line" style="width:74%;margin-top:6px"></span>
      <span class="line" style="width:36%;margin-top:6px"></span>
    </div>
  </div>
</li>`;

function emptyHTML(s) {
  if (s.ordersError && !s.orders.length) {
    return `<h3>Tidak bisa memuat pesanan</h3><p>${esc(s.ordersError)}</p>
      <button class="btn ghost" type="button" data-order-action="retry">Coba lagi</button>`;
  }
  if (!s.orders.length) {
    return `<h3>Belum ada pesanan</h3><p>Catat pesanan keep customer supaya stok dan pembayaran tetap rapi.</p>
      <button class="btn primary" type="button" data-order-action="add">${icon("plus")} Tambah pesanan</button>`;
  }
  return `<h3>Tidak ada pesanan cocok</h3><p>Coba kata kunci atau filter lain.</p>
    <button class="btn ghost" type="button" data-order-action="reset">Reset filter</button>`;
}

export function createOrderList({ store, orderActions, onAdd, onEdit, onPay, onCancel }) {
  const list = $("orderList");
  const empty = $("orderEmpty");
  const search = $("orderSearch");
  const chips = document.querySelectorAll("#orderFilters [data-order-filter]");

  const findOrder = (id) => store.get().orders.find((o) => o.id === id);

  search.addEventListener("input", () => orderActions.setQuery(search.value));

  document.querySelectorAll("[data-order-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = btn.dataset.orderFilter;
      const current = store.get().orderFilter;
      orderActions.setFilter(btn.classList.contains("stat") && current === f ? "semua" : f);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  on(list, "click", "[data-order-pay]", (el) => {
    const o = findOrder(Number(el.dataset.orderPay));
    if (o) onPay(o);
  });
  on(list, "click", "[data-order-edit]", (el) => {
    const o = findOrder(Number(el.dataset.orderEdit));
    if (o) onEdit(o);
  });
  on(list, "click", "[data-order-cancel]", (el) => {
    const o = findOrder(Number(el.dataset.orderCancel));
    if (o) onCancel(o);
  });
  on(empty, "click", "[data-order-action]", (el) => {
    const a = el.dataset.orderAction;
    if (a === "add") onAdd();
    if (a === "retry") orderActions.load();
    if (a === "reset") {
      orderActions.setQuery("");
      orderActions.setFilter("semua");
    }
  });

  function setStat(id, text, zero = false) {
    const el = $(id);
    el.textContent = text;
    el.classList.toggle("zero", zero);
  }

  function render(s) {
    if (search.value !== s.orderQuery) search.value = s.orderQuery;

    const sum = Order.summarizeOrders(s.orders);
    setStat("oStatCount", number(sum.count), sum.count === 0);
    $("oStatQty").textContent = number(sum.totalQty);
    setStat("oStatValue", rupiahShort(sum.totalValue), sum.totalValue === 0);
    setStat("oStatUnpaid", sum.counts.unpaid, sum.counts.unpaid === 0);
    setStat("oStatPickup", sum.counts.pickup, sum.counts.pickup === 0);

    chips.forEach((b) => {
      const f = b.dataset.orderFilter;
      b.classList.toggle("on", f === s.orderFilter);
      b.setAttribute("aria-selected", String(f === s.orderFilter));
      b.querySelector("span").textContent = sum.counts[f];
    });
    document.querySelectorAll("button.stat[data-order-filter]").forEach((b) => {
      b.classList.toggle("on", b.dataset.orderFilter === s.orderFilter);
    });

    if (!s.ordersLoaded) {
      list.innerHTML = ORDER_SKELETON.repeat(4);
      $("orderResultCount").textContent = "";
      empty.hidden = true;
      return;
    }

    const items = Order.visibleOrders(s.orders, { query: s.orderQuery, filter: s.orderFilter });
    list.innerHTML = items.map((o) => orderRowHTML(o, s.products)).join("");
    $("orderResultCount").textContent = s.orders.length ? `${items.length} pesanan` : "";

    empty.hidden = items.length > 0;
    if (!items.length) empty.innerHTML = emptyHTML(s);
  }

  store.subscribe(render);
  render(store.get());
}
