import { $ } from "../dom.js";
import { totalOf } from "../../domain/product.js";

export function createDeleteSheet({ actions, sheets }) {
  const dialog = $("deleteSheet");
  const confirm = $("deleteConfirm");
  let productId = null;

  confirm.addEventListener("click", async () => {
    confirm.disabled = true;
    const ok = await actions.deleteProduct(productId);
    confirm.disabled = false;
    if (ok) sheets.closeAll(); // tutup konfirmasi + detail di bawahnya
  });

  return {
    open(product) {
      productId = product.id;
      $("deleteText").textContent = `"${product.name}" (${totalOf(product)} pcs) akan dihapus dari daftar.`;
      sheets.open(dialog);
    },
  };
}
