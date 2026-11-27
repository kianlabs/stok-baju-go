import { request } from "./http.js";
import { compressImage } from "./imageCompressor.js";

const stockURL = (variantId) => `/api/variants/${variantId}/stock`;

export const productRepository = {
  // GET /api/products tidak menyertakan varian, jadi detail diambil per produk.
  async list() {
    const list = await request("/api/products");
    const base = list.data || [];
    const details = await Promise.all(base.map((p) => request(`/api/products/${p.id}`)));
    return {
      products: base.map((p, i) => ({ ...p, variants: details[i].data.variants || [] })),
      cached: list.cached || details.some((d) => d.cached),
    };
  },

  create: (payload) => request("/api/products", { method: "POST", json: payload }),
  update: (id, payload) => request(`/api/products/${id}`, { method: "PUT", json: payload }),
  remove: (id) => request(`/api/products/${id}`, { method: "DELETE" }),

  addStock: (variantId, delta) => request(stockURL(variantId), { method: "PATCH", json: { mode: "delta", delta } }),
  setStock: (variantId, stock) => request(stockURL(variantId), { method: "PATCH", json: { mode: "set", stock } }),

  async uploadPhoto(file) {
    const form = new FormData();
    form.append("photo", await compressImage(file), "photo.jpg");
    const { data } = await request("/api/upload", { method: "POST", form });
    return data.url;
  },
};
