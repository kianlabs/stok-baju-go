// Data: repository pesanan — terhubung ke API backend Go:
//   GET    /api/orders
//   GET    /api/orders/{id}
//   POST   /api/orders
//   PUT    /api/orders/{id}
//   DELETE /api/orders/{id}
//   PATCH  /api/orders/{id}/payment

import { request } from "./http.js";

const orderURL = (id) => `/api/orders/${id}`;

function normalizePayment(payment, bank = "") {
  return {
    payment,
    bank: payment === "transfer" ? String(bank || "").trim() : "",
  };
}

function normalizePayload(payload) {
  return {
    ...payload,
    ...normalizePayment(payload.payment, payload.bank),
  };
}

export const orderRepository = {
  async list() {
    const res = await request("/api/orders");
    return {
      orders: Array.isArray(res.data) ? res.data : [],
      cached: res.cached,
    };
  },

  get: (id) => request(orderURL(id)),
  create: (payload) => request("/api/orders", { method: "POST", json: normalizePayload(payload) }),
  update: (id, payload) => request(orderURL(id), { method: "PUT", json: normalizePayload(payload) }),
  remove: (id) => request(orderURL(id), { method: "DELETE" }),
  updatePayment: (id, { payment, bank = "" }) =>
    request(`${orderURL(id)}/payment`, {
      method: "PATCH",
      json: normalizePayment(payment, bank),
    }),
};
