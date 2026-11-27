import { $, esc, icon, on, vibrate } from "../dom.js";
import { rupiah, rupiahShort } from "../format.js";
import { thumb, statusBadge } from "../components.js";
import * as Product from "../../domain/product.js";

function sizeRowHTML(p, v, max) {
  const zero = v.stock === 0;
  const name = esc(Product.sizeName(v));
  const bar = p.has_sizes ? `<span class="size-bar"><i style="width:${(v.stock / max) * 100}%"></i></span>` : "";
  return `<li class="size-line${zero ? " zero" : ""}">
    <span class="size-name">${name}${zero ? "<small>Habis</small>" : ""}${bar}</span>
    <div class="stepper">
      <button type="button" data-step="${v.id}" data-delta="-1" aria-label="Kurangi ${name}" ${zero ? "disabled" : ""}>${icon("minus")}</button>
      <output>${v.stock}</output>
      <button type="button" data-step="${v.id}" data-delta="1" aria-label="Tambah ${name}">${icon("plus")}</button>
    </div>
  </li>`;
}

function detailHTML(p) {
  const total = Product.totalOf(p);
  const max = Math.max(1, ...p.variants.map((v) => v.stock));
  const sizesAvailable = p.has_sizes ? `${p.variants.length - Product.emptySizeCount(p)}/${p.variants.length}` : "—";
  return `
    <div class="d-head">
      ${thumb(p, "lg", { zoom: true })}
      <div>
        <h2>${esc(p.name)}</h2>
        <p class="muted">${rupiah(p.price)}</p>
        ${statusBadge(Product.statusOf(p))}
      </div>
    </div>
    <div class="d-stats">
      <div><b>${total}</b><span>total pcs</span></div>
      <div><b>${rupiahShort(Product.valueOf(p))}</b><span>nilai stok</span></div>
      <div><b>${sizesAvailable}</b><span>ukuran ada</span></div>
    </div>
    <p class="section-label">Stok per ukuran</p>
    <ul class="size-list">${p.variants.map((v) => sizeRowHTML(p, v, max)).join("")}</ul>`;
}

const NOT_FOUND = `<p class="muted" style="padding:24px 0;text-align:center">Produk tidak ditemukan.</p>`;

export function createDetailSheet({ store, actions, sheets, onEdit, onAdjust, onDelete }) {
  const dialog = $("detailSheet");
  const body = $("detailBody");
  const current = () => store.get().products.find((p) => p.id === store.get().detailId);

  on(body, "click", "[data-step]", (btn) => {
    if (btn.disabled) return;
    vibrate();
    actions.changeStock(Number(btn.dataset.step), Number(btn.dataset.delta));
  });
  $("detailAdjust").addEventListener("click", () => {
    const p = current();
    if (p && p.variants.length) onAdjust(p);
  });
  $("detailEdit").addEventListener("click", () => {
    const p = current();
    if (p) onEdit(p);
  });
  $("detailDelete").addEventListener("click", () => {
    const p = current();
    if (p) onDelete(p);
  });
  dialog.addEventListener("sheet:closed", () => actions.closeDetail());

  function render(s) {
    if (s.detailId == null) return;
    const p = s.products.find((x) => x.id === s.detailId);
    body.innerHTML = p ? detailHTML(p) : NOT_FOUND;
  }
  store.subscribe(render);

  return {
    open(id) {
      actions.openDetail(id);
      body.scrollTop = 0;
      sheets.open(dialog);
    },
  };
}
