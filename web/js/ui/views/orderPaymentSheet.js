import { $, on } from "../dom.js";
import { rupiah } from "../format.js";
import { orderTotal } from "../../domain/order.js";

export function createOrderPaymentSheet({ orderActions, sheets }) {
  const dialog = $("orderPaymentSheet");
  const bankWrap = $("opBankField");
  const bank = $("opBank");
  const error = $("opError");
  const apply = $("opApply");

  let orderId = null;
  let payment = "unpaid";

  function render() {
    document.querySelectorAll("#opSeg [data-op]").forEach((b) => {
      b.classList.toggle("on", b.dataset.op === payment);
    });
    bankWrap.hidden = payment !== "transfer";
    error.textContent = "";
  }

  on($("opSeg"), "click", "[data-op]", (b) => {
    payment = b.dataset.op;
    render();
    if (payment === "transfer") bank.focus();
  });

  apply.addEventListener("click", async () => {
    apply.disabled = true;
    try {
      const ok = await orderActions.updatePayment(orderId, { payment, bank: bank.value });
      if (ok) sheets.close();
    } catch (err) {
      error.textContent = err.message;
    } finally {
      apply.disabled = false;
    }
  });

  return {
    open(order) {
      orderId = order.id;
      payment = order.payment || "unpaid";
      bank.value = order.bank || "";
      $("opSummary").textContent = `${order.customer_name} · ${rupiah(orderTotal(order))}`;
      render();
      sheets.open(dialog);
    },
  };
}
