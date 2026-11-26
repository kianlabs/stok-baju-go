export const ORDER_FILTERS = ["semua", "pickup", "unpaid"];

export const FULFILLMENT_LABEL = {
  pickup: "Diambil di toko",
  delivery: "Dikirim",
};

export const PAYMENT_LABEL = {
  unpaid: "Belum lunas",
  transfer: "Lunas transfer",
  cash: "Lunas cash",
};

export const orderTotal = (o) => (Number(o.price) || 0) * Math.max(1, Number(o.quantity) || 1);

export const orderSizeLabel = (o) => (o.size && o.size.trim() ? o.size.trim() : "All size");

export function resolveOrderImage(order, products = []) {
  if (order.image_url) return order.image_url;
  const key = String(order.product_name || "").trim().toLowerCase();
  if (!key) return "";
  const match = products.find((p) => p.name.trim().toLowerCase() === key && p.image_url);
  return match ? match.image_url : "";
}

export function paymentBadgeText(o) {
  if (o.payment === "transfer" && o.bank && o.bank.trim()) {
    return `Lunas · ${o.bank.trim()}`;
  }
  return PAYMENT_LABEL[o.payment] || PAYMENT_LABEL.unpaid;
}

// Normalisasi nomor HP Indonesia ke format wa.me (contoh: 0812-3456 → 628123456)
export function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

export function whatsappUrl(order) {
  const phone = normalizePhone(order.whatsapp);
  if (!phone) return "";
  const item = `${order.product_name}${order.size ? ` (${order.size})` : ""} × ${order.quantity}`;
  const text = `Halo Kak ${order.customer_name}, konfirmasi pesanan ${item}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatKeepDate(iso) {
  if (!iso) return "—";
  const parts = String(iso).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return iso;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function visibleOrders(orders, { query = "", filter = "semua" }) {
  const q = query.trim().toLowerCase();
  return orders
    .filter((o) => {
      if (!q) return true;
      return (
        o.customer_name.toLowerCase().includes(q) ||
        o.product_name.toLowerCase().includes(q) ||
        (o.size || "").toLowerCase().includes(q)
      );
    })
    .filter((o) => {
      if (filter === "pickup") return o.fulfillment === "pickup";
      if (filter === "unpaid") return o.payment === "unpaid";
      return true;
    })
    .sort((a, b) => b.id - a.id);
}

export function summarizeOrders(orders) {
  const counts = { semua: orders.length, pickup: 0, unpaid: 0 };
  let totalValue = 0;
  let totalQty = 0;
  for (const o of orders) {
    if (o.fulfillment === "pickup") counts.pickup++;
    if (o.payment === "unpaid") counts.unpaid++;
    totalValue += orderTotal(o);
    totalQty += Math.max(1, Number(o.quantity) || 1);
  }
  return { count: orders.length, totalQty, totalValue, counts };
}

export function draftFromOrder(o) {
  if (!o) {
    return {
      customer_name: "",
      whatsapp: "",
      product_name: "",
      image_url: "",
      size: "",
      quantity: 1,
      price: 0,
      keep_date: todayISO(),
      fulfillment: "pickup",
      payment: "unpaid",
      bank: "",
    };
  }
  return {
    customer_name: o.customer_name || "",
    whatsapp: o.whatsapp || "",
    product_name: o.product_name || "",
    image_url: o.image_url || "",
    size: o.size || "",
    quantity: Math.max(1, Number(o.quantity) || 1),
    price: Number(o.price) || 0,
    keep_date: o.keep_date || todayISO(),
    fulfillment: o.fulfillment === "delivery" ? "delivery" : "pickup",
    payment: ["unpaid", "transfer", "cash"].includes(o.payment) ? o.payment : "unpaid",
    bank: o.bank || "",
  };
}

export function validateOrderDraft(d) {
  if (!d.customer_name.trim()) return "Nama customer wajib diisi.";
  if (!normalizePhone(d.whatsapp)) return "Nomor WhatsApp wajib diisi.";
  if (!d.product_name.trim()) return "Nama barang wajib diisi.";
  if (!d.price || d.price <= 0) return "Harga wajib diisi lebih dari 0.";
  if (!d.quantity || d.quantity < 1) return "Jumlah minimal 1 pcs.";
  if (!d.keep_date) return "Tanggal keep wajib diisi.";
  if (d.payment === "transfer" && !d.bank.trim()) return "Nama bank / e-wallet wajib diisi untuk transfer.";
  return null;
}

export function draftToPayload(d, imageURL = d.image_url || "") {
  return {
    customer_name: d.customer_name.trim(),
    whatsapp: d.whatsapp.trim(),
    product_name: d.product_name.trim(),
    image_url: imageURL || "",
    size: d.size.trim(),
    quantity: Math.max(1, Math.floor(Number(d.quantity) || 1)),
    price: Math.max(0, Math.floor(Number(d.price) || 0)),
    keep_date: d.keep_date || todayISO(),
    fulfillment: d.fulfillment === "delivery" ? "delivery" : "pickup",
    payment: ["unpaid", "transfer", "cash"].includes(d.payment) ? d.payment : "unpaid",
    bank: d.payment === "transfer" ? d.bank.trim() : "",
  };
}
