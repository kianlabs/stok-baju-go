import * as Product from "../domain/product.js";
import { UNDO_WINDOW_MS } from "../config.js";

export function createActions({ store, repo, prefs, notifier }) {
  // Selama masih ada perubahan stok yang dikirim, hasil reload ditunda
  // supaya angka di layar tidak "loncat" balik.
  let pending = 0;
  let reloadQueued = false;
  let undoBatch = null; // { variantId, net, at }

  const begin = () => pending++;
  const end = () => {
    pending--;
    if (pending === 0 && reloadQueued) {
      reloadQueued = false;
      load();
    }
  };

  const setLocalStock = (variantId, stock) =>
    store.set((s) => ({ products: Product.withVariantStock(s.products, variantId, stock) }));

  async function load() {
    if (store.get().loading) return;
    store.set({ loading: true });
    try {
      const { products, cached } = await repo.list();
      if (pending > 0) {
        reloadQueued = true;
        return;
      }
      if (!cached) prefs.saveSyncedAt(Date.now());
      store.set({ products, stale: cached, error: null, syncedAt: prefs.syncedAt() });
    } catch (e) {
      store.set({ error: e.message });
    } finally {
      store.set({ loaded: true, loading: false });
    }
  }

  const setQuery = (query) => store.set({ query });
  function setFilter(filter) {
    prefs.saveFilter(filter);
    store.set({ filter });
  }
  function setSort(sort) {
    prefs.saveSort(sort);
    store.set({ sort });
  }
  const openDetail = (id) => store.set({ detailId: id });
  const closeDetail = () => store.set({ detailId: null });
  const setOnline = (online) => store.set({ online });

  async function changeStock(variantId, delta, { undoable = true } = {}) {
    const found = Product.findVariant(store.get().products, variantId);
    if (!found) return;
    const { product, variant } = found;
    const next = variant.stock + delta;
    if (next < 0) return;

    setLocalStock(variantId, next);
    if (undoable) offerUndo(product, variant, delta, next);

    begin();
    try {
      await repo.addStock(variantId, delta);
    } catch (e) {
      const now = Product.findVariant(store.get().products, variantId);
      if (now) setLocalStock(variantId, Math.max(0, now.variant.stock - delta));
      undoBatch = null;
      notifier.show("Gagal ubah stok: " + e.message);
    } finally {
      end();
    }
  }

  function offerUndo(product, variant, delta, next) {
    const now = Date.now();
    if (!undoBatch || undoBatch.variantId !== variant.id || now - undoBatch.at > UNDO_WINDOW_MS) {
      undoBatch = { variantId: variant.id, net: 0, at: now };
    }
    undoBatch.net += delta;
    undoBatch.at = now;
    const net = undoBatch.net;
    if (net === 0) {
      undoBatch = null;
      notifier.dismiss();
      return;
    }
    notifier.show(`${Product.variantLabel(product, variant)}: ${net > 0 ? "+" : ""}${net} → ${next} pcs`, {
      undo: () => {
        undoBatch = null;
        changeStock(variant.id, -net, { undoable: false });
        notifier.show("Perubahan dibatalkan");
      },
    });
  }

  async function adjustStock(variantId, mode, qty) {
    const found = Product.findVariant(store.get().products, variantId);
    if (!found) return false;
    const { product, variant } = found;
    const before = variant.stock;
    const next = Product.nextStock(before, mode, qty);
    if (next === before) return true;
    try {
      if (mode === "set") await repo.setStock(variantId, next);
      else await repo.addStock(variantId, next - before);
    } catch (e) {
      notifier.show("Gagal simpan: " + e.message);
      return false;
    }
    setLocalStock(variantId, next);
    notifier.show(`${Product.variantLabel(product, variant)}: ${before} → ${next} pcs`, {
      undo: async () => {
        try {
          await repo.setStock(variantId, before);
          setLocalStock(variantId, before);
          notifier.show("Perubahan dibatalkan");
        } catch (e) {
          notifier.show("Gagal membatalkan: " + e.message);
        }
      },
    });
    return true;
  }

  async function saveProduct({ id, draft, photoFile }) {
    const invalid = Product.validateDraft(draft);
    if (invalid) throw new Error(invalid);
    const imageURL = photoFile ? await repo.uploadPhoto(photoFile) : draft.imageURL;
    const payload = Product.draftToPayload(draft, imageURL);
    if (id) await repo.update(id, payload);
    else await repo.create(payload);
    notifier.show(`"${payload.name}" ${id ? "diperbarui" : "ditambahkan"}`);
    load();
  }

  async function deleteProduct(id) {
    const product = store.get().products.find((p) => p.id === id);
    if (!product) return false;
    try {
      await repo.remove(id);
    } catch (e) {
      notifier.show("Gagal hapus: " + e.message);
      return false;
    }
    store.set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
    notifier.show(`"${product.name}" dihapus`, {
      undo: async () => {
        try {
          await repo.create(Product.restorePayload(product));
          notifier.show(product.image_url ? "Produk dikembalikan (tanpa foto)" : "Produk dikembalikan");
          load();
        } catch (e) {
          notifier.show("Gagal mengembalikan: " + e.message);
        }
      },
    });
    return true;
  }

  return {
    load,
    setQuery,
    setFilter,
    setSort,
    openDetail,
    closeDetail,
    setOnline,
    changeStock,
    adjustStock,
    saveProduct,
    deleteProduct,
  };
}
