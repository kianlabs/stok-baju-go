// UI: potongan HTML kecil yang dipakai lebih dari satu view.

import { esc } from "./dom.js";
import { initials, hue } from "./format.js";
import { STATUS_LABEL } from "../domain/product.js";

export function thumb(p, size = "") {
  const img = p.image_url ? `<img src="${esc(p.image_url)}" alt="" loading="lazy" decoding="async">` : "";
  return `<span class="thumb ${size}" style="--h:${hue(p.name)}">${esc(initials(p.name))}${img}</span>`;
}

export const statusBadge = (status) => `<span class="badge ${status}">${STATUS_LABEL[status]}</span>`;
