import { $ } from "../dom.js";
import { rupiah } from "../format.js";
import { orderSizeLabel, orderTotal } from "../../domain/order.js";

export function createOrderCancelSheet({ orderActions, sheets }) {
  const dialog = $("orderCancelSheet");
  const confirm = $("orderCancelConfirm");
  let orderId = null;

  confirm.addEventListener("click", async () => {
    confirm.disabled = true;
    const ok = await orderActions.cancelOrder(orderId);
    confirm.disabled = false;
    if (ok) sheets.close();
  });

  return {
    open(order) {
      orderId = order.id;
      const item = `${order.product_name} (${orderSizeLabel(order)}) × ${order.quantity}`;
      $("orderCancelText").textContent = `Pesanan ${order.customer_name} — ${item} (${rupiah(orderTotal(order))}) akan dibatalkan.`;
      sheets.open(dialog);
    },
  };
}
