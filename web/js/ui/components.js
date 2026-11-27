import { esc } from "./dom.js";
import { initials, hue } from "./format.js";
import { STATUS_LABEL } from "../domain/product.js";

const THUMB_PX = { sm: 42, lg: 72 };

export function thumb(p, size = "", { zoom = false } = {}) {
  const px = THUMB_PX[size] || 56;
  const img = p.image_url
    ? `<img src="${esc(p.image_url)}" alt="" width="${px}" height="${px}" loading="lazy" decoding="async">`
    : "";
  const canZoom = zoom && p.image_url;
  const attrs = canZoom
    ? ` role="button" tabindex="0" aria-label="Perbesar foto ${esc(p.name)}" data-zoom-src="${esc(p.image_url)}" data-zoom-title="${esc(p.name)}"`
    : "";
  return `<span class="thumb ${size}${canZoom ? " zoomable" : ""}" style="--h:${hue(p.name)}"${attrs}>${esc(initials(p.name))}${img}</span>`;
}

export const statusBadge = (status) => `<span class="badge ${status}">${STATUS_LABEL[status]}</span>`;
