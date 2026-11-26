const KEY = {
  filter: "sb.filter",
  sort: "sb.sort",
  syncedAt: "sb.syncedAt",
  tab: "sb.tab",
  orderFilter: "sb.orderFilter",
};

function read(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* mode privat / storage penuh: abaikan */
  }
}

export const preferences = {
  filter: () => read(KEY.filter, "semua"),
  sort: () => read(KEY.sort, "terbaru"),
  syncedAt: () => Number(read(KEY.syncedAt, 0)) || 0,
  tab: () => read(KEY.tab, "stok"),
  orderFilter: () => read(KEY.orderFilter, "semua"),
  saveFilter: (v) => write(KEY.filter, v),
  saveSort: (v) => write(KEY.sort, v),
  saveSyncedAt: (ms) => write(KEY.syncedAt, ms),
  saveTab: (v) => write(KEY.tab, v),
  saveOrderFilter: (v) => write(KEY.orderFilter, v),
};
