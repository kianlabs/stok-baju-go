// Domain: aturan bisnis produk & stok.
// Fungsi murni — tidak menyentuh DOM, fetch, atau localStorage.

import { LOW_STOCK, DEFAULT_SIZES } from "../config.js";

// ---------- Status & turunan ----------
export const STATUS_LABEL = { tersedia: "Tersedia", menipis: "Menipis", habis: "Habis" };
export const FILTERS = ["semua", "tersedia", "menipis", "habis"];

export const totalOf = (p) => p.variants.reduce((sum, v) => sum + v.stock, 0);
export const valueOf = (p) => totalOf(p) * p.price;
export const emptySizeCount = (p) => (p.has_sizes ? p.variants.filter((v) => v.stock === 0).length : 0);
export const sizeName = (v) => v.size_label || "All size";
export const variantLabel = (p, v) => p.name + (v.size_label ? " · " + v.size_label : "");

export function statusOf(p) {
  const total = totalOf(p);
  if (total === 0) return "habis";
  if (total <= LOW_STOCK) return "menipis";
  return "tersedia";
}

export const toQty = (x) => Math.max(0, Math.floor(Number(x) || 0));

// ---------- Daftar: urut, filter, ringkasan ----------
export const SORTS = {
  terbaru: { label: "Terbaru", compare: (a, b) => b.id - a.id },
  nama: { label: "Nama A–Z", compare: (a, b) => a.name.localeCompare(b.name, "id") },
  "stok-asc": { label: "Stok paling sedikit", compare: (a, b) => totalOf(a) - totalOf(b) },
  "stok-desc": { label: "Stok paling banyak", compare: (a, b) => totalOf(b) - totalOf(a) },
  "harga-desc": { label: "Harga tertinggi", compare: (a, b) => b.price - a.price },
};

export function visibleProducts(products, { query = "", filter = "semua", sort = "terbaru" }) {
  const q = query.trim().toLowerCase();
  const compare = (SORTS[sort] || SORTS.terbaru).compare;
  return products
    .filter((p) => !q || p.name.toLowerCase().includes(q))
    .filter((p) => filter === "semua" || statusOf(p) === filter)
    .sort(compare);
}

export function summarize(products) {
  const counts = { semua: products.length, tersedia: 0, menipis: 0, habis: 0 };
  let pcs = 0;
  let value = 0;
  for (const p of products) {
    counts[statusOf(p)]++;
    pcs += totalOf(p);
    value += valueOf(p);
  }
  return { pcs, value, models: products.length, counts };
}

// ---------- Varian & stok ----------
export function findVariant(products, variantId) {
  for (const product of products) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}

// Mengembalikan array produk baru dengan stok satu varian diganti.
export function withVariantStock(products, variantId, stock) {
  return products.map((p) =>
    p.variants.some((v) => v.id === variantId)
      ? { ...p, variants: p.variants.map((v) => (v.id === variantId ? { ...v, stock } : v)) }
      : p,
  );
}

// mode: "masuk" (tambah), "keluar" (kurangi), "set" (stok opname)
export function nextStock(current, mode, qty) {
  const n = toQty(qty);
  if (mode === "masuk") return current + n;
  if (mode === "keluar") return Math.max(0, current - n);
  return n;
}

// ---------- Draft form produk ----------
export function draftFromProduct(p) {
  if (!p) {
    return {
      name: "",
      price: 0,
      imageURL: "",
      hasSizes: true,
      sizes: DEFAULT_SIZES.map((label) => ({ label, qty: 0 })),
      singleQty: 0,
    };
  }
  return {
    name: p.name,
    price: p.price,
    imageURL: p.image_url || "",
    hasSizes: p.has_sizes,
    sizes: p.has_sizes ? p.variants.map((v) => ({ label: v.size_label, qty: v.stock })) : [],
    singleQty: p.has_sizes ? 0 : (p.variants[0]?.stock ?? 0),
  };
}

export const draftTotal = (d) => (d.hasSizes ? d.sizes.reduce((sum, s) => sum + s.qty, 0) : d.singleQty);

export function toggleSize(sizes, label) {
  return sizes.some((s) => s.label === label) ? sizes.filter((s) => s.label !== label) : [...sizes, { label, qty: 0 }];
}

export function addSize(sizes, label) {
  const clean = label.trim();
  if (!clean || sizes.some((s) => s.label.toLowerCase() === clean.toLowerCase())) return sizes;
  return [...sizes, { label: clean, qty: 0 }];
}

export function validateDraft(d) {
  if (!d.name.trim()) return "Nama baju wajib diisi.";
  if (d.price < 0) return "Harga tidak boleh negatif.";
  if (d.hasSizes && d.sizes.length === 0) return "Pilih minimal 1 ukuran, atau pilih All size.";
  return null;
}

// Bentuk body yang diterima POST/PUT /api/products
export function draftToPayload(d, imageURL) {
  return {
    name: d.name.trim(),
    price: d.price,
    image_url: imageURL,
    has_sizes: d.hasSizes,
    variants: d.hasSizes
      ? d.sizes.map((s, i) => ({ size_label: s.label, stock: toQty(s.qty), sort_order: i }))
      : [{ size_label: null, stock: toQty(d.singleQty), sort_order: 0 }],
  };
}

// Untuk "urungkan hapus". Server ikut menghapus file foto, jadi foto tidak ikut.
export function restorePayload(p) {
  return {
    name: p.name,
    price: p.price,
    image_url: "",
    has_sizes: p.has_sizes,
    variants: p.variants.map((v) => ({ size_label: v.size_label, stock: v.stock, sort_order: v.sort_order })),
  };
}
