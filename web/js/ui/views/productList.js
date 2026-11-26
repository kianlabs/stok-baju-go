import { $, esc, icon, on } from "../dom.js";
import { rupiah } from "../format.js";
import { thumb } from "../components.js";
import * as Product from "../../domain/product.js";

const SKELETON = `<li class="item skeleton"><span class="thumb"></span><span class="item-body">
  <span class="line" style="width:60%"></span><span class="line" style="width:35%;margin-top:6px"></span></span></li>`;

function itemHTML(p) {
  const total = Product.totalOf(p);
  const status = Product.statusOf(p);
  const empty = Product.emptySizeCount(p);
  const meta = [rupiah(p.price)];
  if (!p.has_sizes) meta.push("All size");
  if (empty) meta.push(`<span class="bad">${empty} ukuran kosong</span>`);
  const sizes = p.has_sizes
    ? `<span class="sizes">${p.variants
        .map((v) => `<span class="sz${v.stock === 0 ? " zero" : ""}">${esc(v.size_label)}<b>${v.stock}</b></span>`)
        .join("")}</span>`
    : "";
  return `<li><button class="item" type="button" data-open="${p.id}">
      ${thumb(p)}
      <span class="item-body">
        <span class="item-name">${esc(p.name)}</span>
        <span class="item-meta">${meta.join(" · ")}</span>
        ${sizes}
      </span>
      <span class="item-qty ${status}"><b>${total}</b><small>pcs</small></span>
    </button></li>`;
}

function emptyHTML(s) {
  if (s.error && !s.products.length) {
    return `<h3>Tidak bisa memuat data</h3><p>${esc(s.error)}</p>
      <button class="btn ghost" type="button" data-action="retry">Coba lagi</button>`;
  }
  if (!s.products.length) {
    return `<h3>Gudang masih kosong</h3><p>Tambahkan produk pertama beserta stok per ukurannya.</p>
      <button class="btn primary" type="button" data-action="add">${icon("plus")} Tambah produk</button>`;
  }
  return `<h3>Tidak ada hasil</h3><p>Coba kata kunci atau filter lain.</p>
    <button class="btn ghost" type="button" data-action="reset">Reset filter</button>`;
}

export function createProductList({ store, actions, onOpen, onAdd }) {
  const list = $("list");
  const empty = $("empty");
  const search = $("search");
  const sort = $("sortSelect");

  search.addEventListener("input", () => actions.setQuery(search.value));
  sort.addEventListener("change", () => actions.setSort(sort.value));
  on(list, "click", "[data-open]", (el) => onOpen(Number(el.dataset.open)));
  on(empty, "click", "[data-action]", (el) => {
    const a = el.dataset.action;
    if (a === "add") onAdd();
    if (a === "retry") actions.load();
    if (a === "reset") {
      actions.setQuery("");
      actions.setFilter("semua");
    }
  });

  function render(s) {
    if (search.value !== s.query) search.value = s.query;
    if (sort.value !== s.sort) sort.value = s.sort;

    if (!s.loaded) {
      list.innerHTML = SKELETON.repeat(6);
      empty.hidden = true;
      return;
    }

    const items = Product.visibleProducts(s.products, s);
    const hasAny = s.products.length > 0;
    list.innerHTML = items.map(itemHTML).join("");
    $("resultCount").textContent = hasAny ? items.length + " produk" : "";
    $("sortLabel").textContent = hasAny ? (Product.SORTS[s.sort] || Product.SORTS.terbaru).label : "";

    empty.hidden = items.length > 0;
    if (!items.length) empty.innerHTML = emptyHTML(s);
  }

  store.subscribe(render);
  render(store.get());
}
