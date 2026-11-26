import * as Order from "../domain/order.js";

export function createOrderActions({ store, repo, uploadPhoto, prefs, notifier }) {
  async function load() {
    try {
      const { orders } = await repo.list();
      store.set({ orders, ordersLoaded: true, ordersError: null });
    } catch (e) {
      store.set({ ordersLoaded: true, ordersError: e.message });
    }
  }

  const setQuery = (orderQuery) => store.set({ orderQuery });

  function setFilter(orderFilter) {
    prefs.saveOrderFilter(orderFilter);
    store.set({ orderFilter });
  }

  async function saveOrder({ id, draft, photoFile }) {
    const invalid = Order.validateOrderDraft(draft);
    if (invalid) throw new Error(invalid);
    const matchedImage = Order.resolveOrderImage(draft, store.get().products);
    const imageURL = photoFile && uploadPhoto ? await uploadPhoto(photoFile) : matchedImage;
    const payload = Order.draftToPayload(draft, imageURL);
    if (id) {
      await repo.update(id, payload);
      notifier.show(`Pesanan ${payload.customer_name} diperbarui`);
    } else {
      await repo.create(payload);
      notifier.show(`Pesanan ${payload.customer_name} ditambahkan`);
    }
    await load();
  }

  async function updatePayment(id, { payment, bank }) {
    if (payment === "transfer" && !String(bank || "").trim()) {
      throw new Error("Nama bank / e-wallet wajib diisi untuk transfer.");
    }
    const current = store.get().orders.find((o) => o.id === id);
    if (!current) return false;
    const prev = { payment: current.payment, bank: current.bank || "" };
    const { data: updated } = await repo.updatePayment(id, { payment, bank });
    store.set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? updated : o)),
    }));
    notifier.show(`${updated.customer_name}: ${Order.paymentBadgeText(updated)}`, {
      undo: async () => {
        try {
          const { data: reverted } = await repo.updatePayment(id, prev);
          store.set((s) => ({
            orders: s.orders.map((o) => (o.id === id ? reverted : o)),
          }));
          notifier.show("Status bayar dikembalikan");
        } catch (e) {
          notifier.show("Gagal membatalkan: " + e.message);
        }
      },
    });
    return true;
  }

  async function cancelOrder(id) {
    const order = store.get().orders.find((o) => o.id === id);
    if (!order) return false;
    try {
      await repo.remove(id);
    } catch (e) {
      notifier.show("Gagal batalkan pesanan: " + e.message);
      return false;
    }
    store.set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }));
    const snapshot = Order.draftToPayload(Order.draftFromOrder(order));
    notifier.show(`Pesanan ${order.customer_name} dibatalkan`, {
      undo: async () => {
        try {
          await repo.create(snapshot);
          await load();
          notifier.show("Pesanan dikembalikan");
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
    saveOrder,
    updatePayment,
    cancelOrder,
  };
}
