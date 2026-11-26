import { $, esc, icon, on, vibrate } from "../dom.js";
import { number, parseDigits } from "../format.js";
import { SIZE_PRESETS } from "../../config.js";
import * as Product from "../../domain/product.js";

export function createProductFormSheet({ actions, sheets }) {
  const dialog = $("formSheet");
  const formEl = $("productForm");
  const name = $("fName");
  const price = $("fPrice");
  const single = $("fSingleStock");
  const photoInput = $("photoInput");
  const custom = $("customSize");
  const error = $("formError");
  const submit = $("formSubmit");

  let editingId = null;
  let draft = Product.draftFromProduct(null);
  let photoFile = null;
  let photoURL = null; // object URL untuk pratinjau foto baru

  function renderPhoto() {
    if (photoURL) URL.revokeObjectURL(photoURL);
    photoURL = photoFile ? URL.createObjectURL(photoFile) : null;
    const src = photoURL || draft.imageURL;
    $("photoPreview").innerHTML = src ? `<img src="${esc(src)}" alt="">` : icon("camera");
    $("photoChooseText").textContent = src ? "Ganti foto" : "Tambah foto";
    $("photoRemove").hidden = !src;
  }

  function renderTotal() {
    $("formTotal").innerHTML = `Total <b>${Product.draftTotal(draft)} pcs</b>`;
  }

  function renderSizes() {
    document.querySelectorAll("#sizeModeSeg [data-sizemode]").forEach((b) => {
      b.classList.toggle("on", (b.dataset.sizemode === "on") === draft.hasSizes);
    });
    $("sizeBox").hidden = !draft.hasSizes;
    $("singleBox").hidden = draft.hasSizes;

    $("presetRow").innerHTML = SIZE_PRESETS.map((label) => {
      const active = draft.sizes.some((s) => s.label === label);
      return `<button type="button" class="${active ? "on" : ""}" data-preset="${label}">${label}</button>`;
    }).join("");

    $("sizeList").innerHTML = draft.sizes
      .map(
        (s, i) => `<li class="size-line">
        <span class="size-name">${esc(s.label)}</span>
        <div class="stepper">
          <button type="button" data-size-idx="${i}" data-size-delta="-1" aria-label="Kurangi">${icon("minus")}</button>
          <input type="number" inputmode="numeric" min="0" value="${s.qty}" data-size-input="${i}" aria-label="Stok ${esc(s.label)}">
          <button type="button" data-size-idx="${i}" data-size-delta="1" aria-label="Tambah">${icon("plus")}</button>
        </div>
        <button type="button" class="remove-btn" data-size-remove="${i}" aria-label="Hapus ukuran ${esc(s.label)}">${icon("x")}</button>
      </li>`,
      )
      .join("");
    renderTotal();
  }

  const setSizes = (sizes) => {
    draft = { ...draft, sizes };
    renderSizes();
  };
  const setSizeQty = (i, qty) => {
    draft = { ...draft, sizes: draft.sizes.map((s, j) => (j === i ? { ...s, qty: Product.toQty(qty) } : s)) };
  };

  const pickPhoto = () => photoInput.click();
  $("photoPick").addEventListener("click", pickPhoto);
  $("photoChoose").addEventListener("click", pickPhoto);
  photoInput.addEventListener("change", () => {
    photoFile = photoInput.files[0] || null;
    renderPhoto();
  });
  $("photoRemove").addEventListener("click", () => {
    draft = { ...draft, imageURL: "" };
    photoFile = null;
    photoInput.value = "";
    renderPhoto();
  });

  name.addEventListener("input", () => (draft = { ...draft, name: name.value }));
  price.addEventListener("input", () => {
    const value = parseDigits(price.value);
    draft = { ...draft, price: value };
    price.value = value ? number(value) : "";
  });

  on($("sizeModeSeg"), "click", "[data-sizemode]", (b) => {
    draft = { ...draft, hasSizes: b.dataset.sizemode === "on" };
    renderSizes();
  });
  on($("presetRow"), "click", "[data-preset]", (b) => setSizes(Product.toggleSize(draft.sizes, b.dataset.preset)));

  function addCustom() {
    setSizes(Product.addSize(draft.sizes, custom.value));
    custom.value = "";
  }
  $("customAdd").addEventListener("click", addCustom);
  custom.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustom();
    }
  });

  const sizeList = $("sizeList");
  on(sizeList, "click", "[data-size-idx]", (b) => {
    const i = Number(b.dataset.sizeIdx);
    setSizeQty(i, draft.sizes[i].qty + Number(b.dataset.sizeDelta));
    vibrate();
    renderSizes();
  });
  on(sizeList, "click", "[data-size-remove]", (b) => {
    const i = Number(b.dataset.sizeRemove);
    setSizes(draft.sizes.filter((_, j) => j !== i));
  });
  on(sizeList, "input", "[data-size-input]", (el) => {
    setSizeQty(Number(el.dataset.sizeInput), el.value);
    renderTotal();
  });

  const setSingle = (qty) => {
    draft = { ...draft, singleQty: Product.toQty(qty) };
    renderTotal();
  };
  document.querySelectorAll("[data-single]").forEach((b) => {
    b.addEventListener("click", () => {
      setSingle(draft.singleQty + Number(b.dataset.single));
      single.value = draft.singleQty;
      vibrate();
    });
  });
  single.addEventListener("input", () => setSingle(single.value));

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    const invalid = Product.validateDraft(draft);
    if (invalid) {
      error.textContent = invalid;
      if (!draft.name.trim()) name.focus();
      return;
    }
    error.textContent = "";
    submit.disabled = true;
    submit.textContent = "Menyimpan…";
    try {
      await actions.saveProduct({ id: editingId, draft, photoFile });
      sheets.close();
    } catch (err) {
      error.textContent = "Gagal menyimpan: " + err.message;
      submit.disabled = false;
      submit.textContent = "Simpan";
    }
  });

  return {
    // swap: ganti sheet detail langsung (Detail → Edit) tanpa menumpuk history.
    open(product, { swap = false } = {}) {
      editingId = product ? product.id : null;
      draft = Product.draftFromProduct(product);
      photoFile = null;

      $("formTitle").textContent = product ? "Edit produk" : "Produk baru";
      name.value = draft.name;
      price.value = draft.price ? number(draft.price) : "";
      single.value = draft.singleQty;
      photoInput.value = "";
      custom.value = "";
      error.textContent = "";
      submit.disabled = false;
      submit.textContent = "Simpan";

      renderPhoto();
      renderSizes();
      formEl.querySelector(".sheet-scroll").scrollTop = 0;
      swap ? sheets.swap(dialog) : sheets.open(dialog);
    },
  };
}
