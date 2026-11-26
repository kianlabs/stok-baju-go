import { $ } from "../dom.js";
import { number, rupiahShort } from "../format.js";
import { summarize } from "../../domain/product.js";

export function createSummary({ store, actions }) {
  const chips = document.querySelectorAll("#filters [data-filter]");

  // Kartu "menipis/habis" juga tombol filter; tap lagi = kembali ke semua.
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      const current = store.get().filter;
      actions.setFilter(btn.classList.contains("stat") && current === f ? "semua" : f);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  function setStat(id, text, loaded, zero = false) {
    const el = $(id);
    el.textContent = loaded ? text : "–";
    el.classList.toggle("zero", zero);
  }

  function render(s) {
    const sum = summarize(s.products);
    setStat("statPcs", number(sum.pcs) + " pcs", s.loaded);
    setStat("statValue", rupiahShort(sum.value), s.loaded);
    setStat("statLow", sum.counts.menipis, s.loaded, sum.counts.menipis === 0);
    setStat("statOut", sum.counts.habis, s.loaded, sum.counts.habis === 0);
    $("statModels").textContent = sum.models;

    chips.forEach((b) => {
      const f = b.dataset.filter;
      b.classList.toggle("on", f === s.filter);
      b.setAttribute("aria-selected", String(f === s.filter));
      b.querySelector("span").textContent = s.loaded ? sum.counts[f] : "";
    });
  }

  store.subscribe(render);
  render(store.get());
}
