import { $, esc, icon, on } from "../dom.js";
import { number, rupiah, rupiahShort } from "../format.js";
import { thumb } from "../components.js";
import * as Order from "../../domain/order.js";

function paymentBadgeClass(payment) {
  return payment === "unpaid" ? "menipis" : "tersedia";
}

function orderCardHTML(o, products) {
  const total = Order.orderTotal(o);
  const waHref = Order.whatsappUrl(o);
  const size = Order.orderSizeLabel(o);
  const payText = Order.paymentBadgeText(o);
  const payCls = paymentBadgeClass(o.payment);
  const fulfillText = Order.FULFILLMENT_LABEL[o.fulfillment] || Order.FULFILLMENT_LABEL.pickup;
  const fulfillIcon = o.fulfillment === "delivery" ? "truck" : "store";
  const photo = Order.resolveOrderImage(o, products);

  return `<li class="order-card">
    <div class="order-top">
      <div class="order-customer">
        <span class="order-name">${esc(o.customer_name)}</span>
        <span class="order-date">${icon("calendar")} ${esc(Order.formatKeepDate(o.keep_date))}</span>
      </div>
      <div class="order-total">
        <b>${rupiah(total)}</b>
        <small>${o.quantity} × ${rupiah(o.price)}</small>
      </div>
    </div>
    <div class="order-product">
      ${thumb({ name: o.product_name, image_url: photo }, "sm")}
      <div class="order-product-info">
        <span class="order-item-name">${esc(o.product_name)}</span>
        <span class="sz">${esc(size)}<b>×${o.quantity}</b></span>
      </div>
    </div>
    <div class="order-badges">
      <span class="badge neutral">${icon(fulfillIcon)} ${esc(fulfillText)}</span>
      <span class="badge ${payCls}">${esc(payText)}</span>
    </div>
    <div class="order-actions">
      <a class="btn ghost sm order-wa" href="${esc(waHref)}" target="_blank" rel="noopener noreferrer" aria-label="Chat WhatsApp ${esc(o.customer_name)}">
        ${icon("message")} WA
      </a>
      <button class="btn ghost sm grow" type="button" data-order-pay="${o.id}">
        ${icon("wallet")} Bayar
      </button>
      <button class="btn ghost sm icon-only" type="button" data-order-edit="${o.id}" aria-label="Edit pesanan ${esc(o.customer_name)}">
        ${icon("edit")}
      </button>
      <button class="btn ghost sm bad-btn" type="button" data-order-cancel="${o.id}">
        Batal
      </button>
    </div>
  </li>`;
}

function emptyHTML(s) {
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

    const items = Order.visibleOrders(s.orders, { query: s.orderQuery, filter: s.orderFilter });
    list.innerHTML = items.map((o) => orderCardHTML(o, s.products)).join("");
    $("orderResultCount").textContent = s.orders.length ? `${items.length} pesanan` : "";

    empty.hidden = items.length > 0;
    if (!items.length) empty.innerHTML = emptyHTML(s);
  }

  store.subscribe(render);
  render(store.get());
}
