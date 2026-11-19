"use strict";

/* Replaces every native <select> with a dropdown that matches the app. The native
   element stays in the DOM (hidden) so forms, values and change events keep working. */
const ui = (() => {
  let open;

  const label = (select) => select.selectedOptions[0]?.textContent ?? "";

  function refresh(select) {
    const box = select.closest(".kit-select");
    if (!box) return;
    box.querySelector(".kit-select-value").textContent = label(select);
    box.querySelector(".kit-select-button").disabled = select.disabled;
  }

  function close(focus = false) {
    if (!open) return;
    const { menu, button } = open;
    menu.remove();
    button.setAttribute("aria-expanded", "false");
    if (focus) button.focus();
    open = undefined;
  }

  function place(menu, button) {
    const rect = button.getBoundingClientRect();
    menu.style.minWidth = `${Math.max(rect.width, 180)}px`;
    const height = menu.offsetHeight;
    const below = innerHeight - rect.bottom - 8;
    const top = height <= below || rect.top < height ? rect.bottom + 4 : rect.top - height - 4;
    menu.style.top = `${Math.max(8, top)}px`;
    menu.style.left = `${Math.min(rect.left, innerWidth - menu.offsetWidth - 8)}px`;
  }

  function choose(select, value) {
    if (select.value !== value) {
      select.value = value;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    refresh(select);
  }

  function show(select, button) {
    close();
    const menu = document.createElement("div");
    menu.className = "kit-select-menu";
    menu.setAttribute("role", "listbox");
    const id = `kit-menu-${Math.random().toString(36).slice(2)}`;
    menu.id = id;
    button.setAttribute("aria-controls", id);
    [...select.options].forEach((option, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "kit-select-option";
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(option.selected));
      item.disabled = option.disabled;
      item.dataset.index = index;
      item.innerHTML = `<span></span>${icon("check")}`;
      item.firstElementChild.textContent = option.textContent;
      menu.append(item);
    });
    (button.closest("dialog") ?? document.body).append(menu);
    place(menu, button);
    button.setAttribute("aria-expanded", "true");
    open = { select, button, menu };
    (menu.querySelector('[aria-selected="true"]:not(:disabled)') ?? menu.querySelector(".kit-select-option:not(:disabled)"))?.focus();
    menu.addEventListener("click", (event) => {
      const item = event.target.closest(".kit-select-option");
      if (!item || item.disabled) return;
      choose(select, select.options[Number(item.dataset.index)].value);
      close(true);
    });
    menu.addEventListener("keydown", (event) => {
      const items = [...menu.querySelectorAll(".kit-select-option:not(:disabled)")];
      const current = items.indexOf(document.activeElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        items[(current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        (event.key === "Home" ? items[0] : items.at(-1))?.focus();
      } else if (event.key === "Escape" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      } else if (event.key.length === 1) {
        const start = current + 1;
        const match = [...items.slice(start), ...items.slice(0, start)]
          .find((item) => item.textContent.trim().toLowerCase().startsWith(event.key.toLowerCase()));
        match?.focus();
      }
    });
  }

  function enhance(select) {
    if (select.dataset.native !== undefined || select.closest(".kit-select")) return;
    const box = document.createElement("span");
    box.className = "kit-select";
    select.before(box);
    box.append(select);
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "kit-select-button";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    const name = select.getAttribute("aria-label") ?? select.closest("label")?.firstChild?.textContent?.trim();
    if (name) button.setAttribute("aria-label", name);
    button.innerHTML = `<span class="kit-select-value"></span>${icon("chevron")}`;
    box.append(button);
    refresh(select);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      if (open?.button === button) close();
      else show(select, button);
    });
    button.addEventListener("keydown", (event) => {
      if (["ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        show(select, button);
      }
    });
    select.addEventListener("change", () => refresh(select));
  }

  /* Text inputs with suggestions (replaces native <datalist> popups). */
  const fold = (text) => kit.fold(text);
  let suggest;

  function closeSuggest() {
    suggest?.menu.remove();
    suggest?.input.setAttribute("aria-expanded", "false");
    suggest = undefined;
  }

  function showSuggest(input) {
    const source = document.getElementById(input.dataset.combo);
    const multi = input.dataset.comboMulti !== undefined;
    const parts = input.value.split(",");
    const typed = fold((multi ? parts.at(-1) : input.value).trim());
    const taken = multi ? parts.slice(0, -1).map((part) => fold(part.trim())) : [];
    const values = [...(source?.options ?? [])].map((option) => option.value)
      .filter((value) => !taken.includes(fold(value)) && (!typed || fold(value).includes(typed)) && fold(value) !== typed);
    closeSuggest();
    close();
    if (!values.length) return;
    const menu = document.createElement("div");
    menu.className = "kit-select-menu kit-suggest-menu";
    menu.setAttribute("role", "listbox");
    for (const value of values.slice(0, 40)) {
      const item = document.createElement("button");
      item.type = "button";
      item.tabIndex = -1;
      item.className = "kit-select-option";
      item.setAttribute("role", "option");
      item.innerHTML = "<span></span>";
      item.firstElementChild.textContent = value;
      item.dataset.value = value;
      menu.append(item);
    }
    (input.closest("dialog") ?? document.body).append(menu);
    place(menu, input);
    input.setAttribute("aria-expanded", "true");
    suggest = { input, menu, index: -1 };
    menu.addEventListener("pointerdown", (event) => event.preventDefault());
    menu.addEventListener("click", (event) => {
      const item = event.target.closest(".kit-select-option");
      if (item) pick(input, item.dataset.value);
    });
  }

  function pick(input, value) {
    if (input.dataset.comboMulti !== undefined) {
      const parts = input.value.split(",").slice(0, -1).map((part) => part.trim()).filter(Boolean);
      input.value = `${[...parts, value].join(", ")}, `;
    } else input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    closeSuggest();
    input.focus();
  }

  function enhanceInput(input) {
    if (input.dataset.combo) return;
    input.dataset.combo = input.getAttribute("list");
    input.removeAttribute("list");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    if (input.name === "tags") input.dataset.comboMulti = "";
    input.addEventListener("focus", () => showSuggest(input));
    input.addEventListener("click", () => { if (!suggest) showSuggest(input); });
    input.addEventListener("input", (event) => { if (event.isTrusted) showSuggest(input); });
    input.addEventListener("blur", () => setTimeout(() => { if (suggest?.input === input) closeSuggest(); }, 120));
    input.addEventListener("keydown", (event) => {
      if (!suggest || suggest.input !== input) {
        if (event.key === "ArrowDown") showSuggest(input);
        return;
      }
      const items = [...suggest.menu.querySelectorAll(".kit-select-option")];
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        suggest.index = (suggest.index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items.forEach((item, index) => item.setAttribute("aria-selected", String(index === suggest.index)));
        items[suggest.index].scrollIntoView({ block: "nearest" });
      } else if (event.key === "Enter" && suggest.index >= 0) {
        event.preventDefault();
        pick(input, items[suggest.index].dataset.value);
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeSuggest();
      }
    });
  }

  function scan(root = document) {
    if (root.matches?.("select")) enhance(root);
    if (root.matches?.("input[list]")) enhanceInput(root);
    for (const select of root.querySelectorAll?.("select") ?? []) enhance(select);
    for (const input of root.querySelectorAll?.("input[list]") ?? []) enhanceInput(input);
  }

  new MutationObserver((records) => {
    for (const record of records) for (const added of record.addedNodes) if (added.nodeType === 1) scan(added);
  }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", () => scan());
  document.addEventListener("pointerdown", (event) => {
    if (open && !open.menu.contains(event.target) && !open.button.contains(event.target)) close();
  }, true);
  window.addEventListener("resize", () => {
    close();
    closeSuggest();
  });
  document.addEventListener("scroll", (event) => {
    if (open && !open.menu.contains(event.target)) close();
    if (suggest && !suggest.menu.contains(event.target)) closeSuggest();
  }, true);

  return { refresh, scan, close };
})();
