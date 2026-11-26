import { $, esc, on, vibrate } from "../dom.js";
import { number, parseDigits, rupiah } from "../format.js";
import { thumb } from "../components.js";
import * as Order from "../../domain/order.js";

export function createOrderFormSheet({ store, orderActions, sheets }) {
  const dialog = $("orderFormSheet");
  const formEl = $("orderForm");
  const stockPickWrap = $("oStockPickWrap");
  const stockPick = $("oProductPick");
  const photoPreview = $("oPhotoPreview");
  const sizeChips = $("oSizeChips");
  const customer = $("oCustomer");
  const whatsapp = $("oWhatsapp");
  const product = $("oProduct");
  const size = $("oSize");
  const qty = $("oQty");
  const price = $("oPrice");
  const keepDate = $("oKeepDate");
  const bankWrap = $("oBankField");
  const bank = $("oBank");
  const error = $("orderFormError");
  const submit = $("orderFormSubmit");

  let editingId = null;
  let draft = Order.draftFromOrder(null);

  function renderTotal() {
    $("orderFormTotal").innerHTML = `Total <b>${rupiah(Order.orderTotal(draft))}</b>`;
  }

  function renderPhoto() {
    const products = store.get().products;
    const img = Order.resolveOrderImage(draft, products);
    const label = draft.product_name || "Barang";
    photoPreview.innerHTML = thumb({ name: label, image_url: img }, "sm");
  }

  function renderStockPicker() {
    const products = store.get().products;
    stockPickWrap.hidden = !products.length;
    const options = products
      .map((p) => `<option value="${p.id}">${esc(p.name)} — ${rupiah(p.price)}</option>`)
      .join("");
    stockPick.innerHTML = `<option value="">Pilih dari daftar stok (isi foto &amp; harga)…</option>${options}`;
    const matched = products.find((p) => p.name.trim().toLowerCase() === draft.product_name.trim().toLowerCase());
    stockPick.value = matched ? String(matched.id) : "";
    renderSizeChips(matched);
  }

  function renderSizeChips(matchedProduct) {
    if (!matchedProduct || !matchedProduct.has_sizes || !matchedProduct.variants.length) {
      sizeChips.hidden = true;
      sizeChips.innerHTML = "";
      return;
    }
    sizeChips.hidden = false;
    sizeChips.innerHTML = matchedProduct.variants
      .map((v) => {
        const active = draft.size.trim().toLowerCase() === String(v.size_label || "").toLowerCase();
        return `<button type="button" class="${active ? "on" : ""}" data-osize="${esc(v.size_label)}">${esc(v.size_label)} <span>${v.stock}</span></button>`;
      })
      .join("");
  }

  function renderToggles() {
    document.querySelectorAll("#oFulfillmentSeg [data-fulfillment]").forEach((b) => {
      b.classList.toggle("on", b.dataset.fulfillment === draft.fulfillment);
    });
    document.querySelectorAll("#oPaymentSeg [data-payment]").forEach((b) => {
      b.classList.toggle("on", b.dataset.payment === draft.payment);
    });
    bankWrap.hidden = draft.payment !== "transfer";
  }

  function setQty(next) {
    draft = { ...draft, quantity: Math.max(1, Math.floor(Number(next) || 1)) };
    qty.value = draft.quantity;
    renderTotal();
  }

  stockPick.addEventListener("change", () => {
    const id = Number(stockPick.value);
    const chosen = store.get().products.find((p) => p.id === id);
    if (!chosen) return;
    draft = {
      ...draft,
      product_name: chosen.name,
      image_url: chosen.image_url || "",
      price: chosen.price || draft.price,
      size: chosen.has_sizes ? draft.size : "",
    };
    product.value = draft.product_name;
    price.value = draft.price ? number(draft.price) : "";
    size.value = draft.size;
    renderPhoto();
    renderSizeChips(chosen);
    renderTotal();
  });

  on(sizeChips, "click", "[data-osize]", (b) => {
    draft = { ...draft, size: b.dataset.osize };
    size.value = draft.size;
    const chosen = store.get().products.find((p) => p.id === Number(stockPick.value));
    renderSizeChips(chosen);
  });

  customer.addEventListener("input", () => (draft = { ...draft, customer_name: customer.value }));
  whatsapp.addEventListener("input", () => (draft = { ...draft, whatsapp: whatsapp.value }));
  product.addEventListener("input", () => {
    const val = product.value;
    const matched = store.get().products.find((p) => p.name.trim().toLowerCase() === val.trim().toLowerCase());
    draft = { ...draft, product_name: val, image_url: matched ? matched.image_url || "" : "" };
    renderPhoto();
    renderSizeChips(matched);
  });
  size.addEventListener("input", () => (draft = { ...draft, size: size.value }));
  keepDate.addEventListener("change", () => (draft = { ...draft, keep_date: keepDate.value }));
  bank.addEventListener("input", () => (draft = { ...draft, bank: bank.value }));

  price.addEventListener("input", () => {
    const val = parseDigits(price.value);
    draft = { ...draft, price: val };
    price.value = val ? number(val) : "";
    renderTotal();
  });

  document.querySelectorAll("[data-oqty]").forEach((b) => {
    b.addEventListener("click", () => {
      setQty(draft.quantity + Number(b.dataset.oqty));
      vibrate();
    });
  });
  qty.addEventListener("input", () => {
    draft = { ...draft, quantity: Math.max(1, Math.floor(Number(qty.value) || 1)) };
    renderTotal();
  });

  on($("oFulfillmentSeg"), "click", "[data-fulfillment]", (b) => {
    draft = { ...draft, fulfillment: b.dataset.fulfillment };
    renderToggles();
  });
  on($("oPaymentSeg"), "click", "[data-payment]", (b) => {
    draft = { ...draft, payment: b.dataset.payment };
    renderToggles();
    if (draft.payment === "transfer") bank.focus();
  });

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    const invalid = Order.validateOrderDraft(draft);
    if (invalid) {
      error.textContent = invalid;
      return;
    }
    error.textContent = "";
    submit.disabled = true;
    submit.textContent = "Menyimpan…";
    try {
      await orderActions.saveOrder({ id: editingId, draft });
      sheets.close();
    } catch (err) {
      error.textContent = "Gagal menyimpan: " + err.message;
      submit.disabled = false;
      submit.textContent = "Simpan";
    }
  });

  return {
    open(order = null) {
      editingId = order ? order.id : null;
      draft = Order.draftFromOrder(order);

      $("orderFormTitle").textContent = order ? "Edit pesanan" : "Pesanan baru";
      customer.value = draft.customer_name;
      whatsapp.value = draft.whatsapp;
      product.value = draft.product_name;
      size.value = draft.size;
      qty.value = draft.quantity;
      price.value = draft.price ? number(draft.price) : "";
      keepDate.value = draft.keep_date;
      bank.value = draft.bank;
      error.textContent = "";
      submit.disabled = false;
      submit.textContent = "Simpan";

      renderStockPicker();
      renderPhoto();
      renderToggles();
      renderTotal();
      formEl.querySelector(".sheet-scroll").scrollTop = 0;
      sheets.open(dialog);
    },
  };
}
