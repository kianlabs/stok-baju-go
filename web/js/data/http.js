export class ApiError extends Error {}

export async function request(url, { method = "GET", json, form } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: json ? { "Content-Type": "application/json" } : undefined,
      body: json ? JSON.stringify(json) : form,
    });
  } catch {
    throw new ApiError("Tidak ada koneksi");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new ApiError(body.error || `Permintaan gagal (${res.status})`);
  }
  // Header ini dipasang service worker saat menyajikan data dari cache (offline)
  return { data: body.data, cached: res.headers.get("X-SW-Cache") === "1" };
}
