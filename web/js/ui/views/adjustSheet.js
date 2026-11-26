import { $, esc, on } from "../dom.js";
import { nextStock } from "../../domain/product.js";

const QTY_LABEL = { masuk: "Jumlah masuk", keluar: "Jumlah keluar", set: "Stok sebenarnya (hasil hitung)" };

export function createAdjustSheet({ store, actions, sheets }) {
  const dialog = $("adjustSheet");
  const qty = $("adjQty");
  const sizes = $("adjSizes");
  const apply = $("adjApply");
  const local = { productId: null, variantId: null, mode: "masuk" };

  function target() {
    const p = store.get().products.find((x) => x.id === local.productId);
    const v = p && p.variants.find((x) => x.id === local.variantId);
    return { p, v };
  }

  function render() {
    const { p, v } = target();
    if (!p || !v) return;
    document.querySelectorAll("#adjMode [data-mode]").forEach((b) => {
      b.classList.toggle("on", b.dataset.mode === local.mode);
      b.classList.toggle("out", b.dataset.mode === "keluar");
    });
    sizes.hidden = !p.has_sizes;
    sizes.innerHTML = p.variants
      .map((x) => `<button type="button" class="${x.id === v.id ? "on" : ""}" data-variant="${x.id}">${esc(x.size_label)} <span>${x.stock}</span></button>`)
      .join("");
    $("adjQtyLabel").textContent = QTY_LABEL[local.mode];
    $("adjCur").textContent = v.stock;
    $("adjNext").textContent = nextStock(v.stock, local.mode, qty.value);
  }

  // Mode opname dimulai dari stok saat ini supaya tinggal dikoreksi.
  function prefillForSet() {
    if (local.mode === "set") qty.value = target().v?.stock ?? 0;
  }

  on($("adjMode"), "click", "[data-mode]", (b) => {
    local.mode = b.dataset.mode;
    prefillForSet();
    render();
  });
  on(sizes, "click", "[data-variant]", (b) => {
    local.variantId = Number(b.dataset.variant);
    prefillForSet();
    render();
  });
  on($("adjPresets"), "click", "[data-qty]", (b) => {
    qty.value = b.dataset.qty;
    render();
  });
  qty.addEventListener("input", render);

  apply.addEventListener("click", async () => {
    apply.disabled = true;
    const ok = await actions.adjustStock(local.variantId, local.mode, qty.value);
    apply.disabled = false;
    if (ok) sheets.close();
  });

  // Stok bisa berubah dari tempat lain (reload) selama sheet terbuka.
  store.subscribe(() => {
    if (dialog.open) render();
  });

  return {
    open(product) {
      local.productId = product.id;
      local.variantId = product.variants[0].id;
      local.mode = "masuk";
      qty.value = 5;
      $("adjName").textContent = product.name;
      render();
      sheets.open(dialog);
    },
  };
}
