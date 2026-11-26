// State: preferensi yang disimpan di perangkat (localStorage).

const KEY = { filter: "sb.filter", sort: "sb.sort", syncedAt: "sb.syncedAt" };

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
  saveFilter: (v) => write(KEY.filter, v),
  saveSort: (v) => write(KEY.sort, v),
  saveSyncedAt: (ms) => write(KEY.syncedAt, ms),
};
