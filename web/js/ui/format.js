const nf = new Intl.NumberFormat("id-ID");

export const number = (n) => nf.format(n || 0);
export const rupiah = (n) => "Rp " + nf.format(n || 0);
export const parseDigits = (s) => Number(String(s).replace(/\D/g, "")) || 0;

// 12.400.000 → "Rp 12,4 jt"
export function rupiahShort(n) {
  const f = (x) => x.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  if (n >= 1e9) return "Rp " + f(n / 1e9) + " M";
  if (n >= 1e6) return "Rp " + f(n / 1e6) + " jt";
  if (n >= 1e3) return "Rp " + f(n / 1e3) + " rb";
  return "Rp " + n;
}

export const timeHM = (ms) => new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

export const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

// Warna tetap per nama, untuk thumbnail tanpa foto
export function hue(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
