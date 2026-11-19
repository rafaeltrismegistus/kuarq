"use strict";

/* Shared helpers for the Kuarq modules (projects, tasks, links, journal, nucleus). */
const kit = (() => {
  const validators = [];
  const modules = {};
  const listeners = new Set();
  const pad = (value) => String(value).padStart(2, "0");
  const dayMs = 86_400_000;
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

  const escape = (value = "") => String(value).replace(/[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const fold = (text = "") => String(text).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
  const uid = () => crypto.randomUUID();
  const today = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const dayNumber = (date) => Date.parse(`${date}T00:00:00Z`) / dayMs;
  const addDays = (date, days) => new Date((dayNumber(date) + days) * dayMs).toISOString().slice(0, 10);
  const daysUntil = (date) => dayNumber(date) - dayNumber(today());
  const isDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value;
  const isMonth = (value) => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  const monthShortFormat = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
  const monthShort = (date) => monthShortFormat.format(new Date(`${date}T00:00:00Z`)).replace(".", "");
  const dateText = (date) => shortDate.format(new Date(`${date}T00:00:00Z`)).replace(".", "");
  const monthText = (month) => {
    const text = monthName.format(new Date(`${month}-01T00:00:00Z`));
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
  const addMonths = (month, count) => {
    const [year, value] = month.split("-").map(Number);
    const date = new Date(Date.UTC(year, value - 1 + count, 1));
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
  };
  const dayInMonth = (month, day) => {
    const [year, value] = month.split("-").map(Number);
    const last = new Date(Date.UTC(year, value, 0)).getUTCDate();
    return `${month}-${pad(Math.min(Math.max(1, day), last))}`;
  };

  function relativeDay(date) {
    const days = daysUntil(date);
    if (days === 0) return "Hoje";
    if (days === 1) return "Amanhã";
    if (days === -1) return "Ontem";
    if (days < 0) return `Há ${-days} dias`;
    if (days < 7) return `Em ${days} dias`;
    return dateText(date);
  }

  /* Money is stored in cents (integers). */
  const discreet = () => Boolean(workspace?.settings?.discreet);
  const formatMoney = (cents, { hide = true } = {}) => (hide && discreet() ? "R$ ••••" : money.format((cents ?? 0) / 100));
  function parseMoney(text) {
    const clean = String(text).replace(/[^\d,.-]/g, "");
    if (!clean) return NaN;
    const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
    const value = Math.round(Number(normalized) * 100);
    return Number.isFinite(value) ? value : NaN;
  }
  const moneyInput = (cents) => (cents ? (cents / 100).toFixed(2).replace(".", ",") : "");

  /* Validation shared by load and backup restore. */
  function validate(data) {
    return validators.every((check) => {
      try { return check(data); } catch { return false; }
    });
  }
  const isId = (value) => typeof value === "string" && value.length > 0 && value.length <= 80;
  function list(value, check) {
    if (value === undefined) return true;
    if (!Array.isArray(value)) return false;
    const ids = new Set();
    return value.every((item) => {
      if (!item || typeof item !== "object" || !isId(item.id) || ids.has(item.id)) return false;
      ids.add(item.id);
      return check(item);
    });
  }

  /* Module registry: each module gets a menu entry, an action and a section. */
  function register(name, title, module) {
    modules[name] = { title, module };
    actions[name] = () => open(name);
    if (module.validate) validators.push(module.validate);
  }
  function open(name, after) {
    if (!workspace || !modules[name]) return;
    commitInlineEdit();
    hideTextBubble();
    closeConnectMenu();
    if (noteLinkDialog?.open) noteLinkDialog.close();
    activeMap = undefined;
    selectTool(name, modules[name].title);
    $("#current-crumb").hidden = true;
    modules[name].module.show();
    after?.();
    $("#main").focus({ preventScroll: true });
  }
  const isOpen = (name) => !$(`#${name}`)?.hidden;

  /* Menu groups: one menu entry with internal tabs. */
  const groups = {
    work: { title: "Trabalho", subtitle: "Tarefas, projetos e o registro do seu dia de trabalho.", items: [["workhome", "Visão geral", "grid"], ["tasks", "Tarefas", "checklist"], ["projects", "Projetos", "folder"], ["processes", "Processos", "layers"], ["journal", "Diário", "book"]] },
    shelf: { title: "Toolkit", subtitle: "Notas, mapas mentais e o seu quadro dos sonhos.", items: [["notes", "Notas", "note"], ["library", "Mapas mentais", "map"], ["dreams", "Quadro dos sonhos", "sparkle"]] },
  };
  const lastInGroup = { work: "workhome", shelf: "notes" };
  const groupOf = (action) => Object.keys(groups).find((key) => groups[key].items.some(([name]) => name === action));
  const rememberGroup = (group, action) => { lastInGroup[group] = action; };
  function groupTabs(group) {
    return `<nav class="crm-tabs group-tabs" aria-label="Seções de ${groups[group].title}">${groups[group].items.map(([name, title, glyph]) =>
      `<button type="button" data-group-tab="${name}" data-action="${name}" aria-pressed="false">${icon(glyph)}<span>${title}</span></button>`).join("")}</nav>`;
  }
  function mountGroups() {
    for (const [group, info] of Object.entries(groups)) {
      actions[group] = () => actions[lastInGroup[group]]();
      for (const [name] of info.items) {
        const host = name === "notes" ? $("#notes-library") : $(`#${name}`);
        const heading = host?.querySelector(":scope > .page-heading");
        if (!heading || host.querySelector(":scope > .group-tabs")) continue;
        heading.querySelector("h1").textContent = info.title;
        heading.querySelector("p").textContent = info.subtitle;
        heading.insertAdjacentHTML("afterend", groupTabs(group));
      }
    }
  }
  document.addEventListener("DOMContentLoaded", mountGroups);
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-module-action]");
    if (!button || !workspace) return;
    const [name, verb] = button.dataset.moduleAction.split(":");
    modules[name]?.module.command?.(verb, button);
  });

  /* Data change notifications so open screens can refresh. */
  function touch() {
    changed();
    for (const listener of listeners) listener();
  }
  const subscribe = (listener) => listeners.add(listener);

  /* Side drawer form. */
  const drawer = $("#drawer");
  let drawerSubmit;
  let drawerExtra;
  function form({ title, fields, submit = "Salvar", onSubmit, danger, onDanger, onOpen, info }) {
    drawerSubmit = onSubmit;
    delete drawer.dataset.panel;
    drawerExtra = onDanger;
    drawer.innerHTML = `<form class="drawer-form" novalidate>
      <header class="dialog-header"><h2>${escape(title)}${info ? help(info) : ""}</h2><button type="button" class="icon-button" data-drawer="close" aria-label="Fechar">${icon("close")}</button></header>
      <div class="dialog-fields drawer-fields">${fields}</div>
      <footer class="dialog-footer">${danger ? `<button type="button" class="button drawer-danger" data-drawer="danger">${escape(danger)}</button>` : ""}
        <button type="button" class="button" data-drawer="close">Cancelar</button><button type="submit" class="button primary">${escape(submit)}</button></footer>
    </form>`;
    if (!drawer.open) drawer.showModal();
    onOpen?.(drawer);
    (drawer.querySelector("[autofocus], input:not([type=hidden]):not([type=radio]):not([type=checkbox]), select, textarea") ?? drawer.querySelector("[data-drawer=close]"))?.focus();
  }
  drawer.addEventListener("click", (event) => {
    if (event.target === drawer) return drawer.close();
    const button = event.target.closest("[data-drawer]");
    if (!button) return;
    if (button.dataset.drawer === "close") drawer.close();
    if (button.dataset.drawer === "danger") {
      if (button.dataset.confirming) {
        drawer.close();
        drawerExtra?.();
      } else {
        button.dataset.confirming = "";
        button.textContent = "Clique de novo para confirmar";
      }
    }
  });
  drawer.addEventListener("submit", (event) => {
    const formElement = event.target;
    if (!formElement.matches(".drawer-form")) return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(formElement));
    for (const box of formElement.querySelectorAll("input[type=checkbox][name]")) values[box.name] = box.checked;
    const result = drawerSubmit?.(values, formElement);
    if (result === false) return;
    drawer.close();
  });
  drawer.addEventListener("close", () => {
    if (drawer.open) return;
    drawer.replaceChildren();
    drawerSubmit = undefined;
    drawerExtra = undefined;
  });

  /* Date field with the app's own calendar (instead of the native picker). */
  const longDate = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const weekTitle = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  function dateInput(name, value = "", { optional = false, quick = "future" } = {}) {
    return `<div class="kit-date" data-optional="${optional}" data-quick="${quick}">
      <input type="hidden" name="${name}" value="${escape(value)}">
      <button type="button" class="kit-date-button" data-kit-date="toggle" aria-haspopup="dialog" aria-expanded="false">${icon("calendar")}<span>${value ? longDate.format(new Date(`${value}T00:00:00Z`)) : "Sem data"}</span>${icon("chevron")}</button>
      <div class="crm-datepicker kit-date-popover" hidden></div></div>`;
  }
  function paintDate(box, month) {
    const input = box.querySelector("input");
    const popover = box.querySelector(".kit-date-popover");
    box.dataset.month = month;
    const first = new Date(`${month}-01T00:00:00Z`);
    const total = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const todayKey = today();
    const cells = Array.from({ length: first.getUTCDay() }, () => '<span aria-hidden="true"></span>');
    for (let day = 1; day <= total; day++) {
      const date = `${month}-${pad(day)}`;
      cells.push(`<button type="button" class="crm-day" data-kit-date="pick" data-date="${date}" aria-pressed="${date === input.value}"${date === todayKey ? " data-today" : ""}>${day}</button>`);
    }
    const quick = box.dataset.quick === "past"
      ? [["Hoje", todayKey], ["Ontem", addDays(todayKey, -1)]]
      : [["Hoje", todayKey], ["Amanhã", addDays(todayKey, 1)], ["+1 semana", addDays(todayKey, 7)]];
    const title = weekTitle.format(first);
    popover.innerHTML = `<header><button type="button" class="crm-picker-nav" data-kit-date="month" data-step="-1" aria-label="Mês anterior">${icon("chevron-left")}</button>
        <strong>${title.charAt(0).toUpperCase() + title.slice(1)}</strong>
        <button type="button" class="crm-picker-nav" data-kit-date="month" data-step="1" aria-label="Próximo mês">${icon("chevron-right")}</button></header>
      <div class="crm-weekdays" aria-hidden="true">${["D", "S", "T", "Q", "Q", "S", "S"].map((day) => `<span>${day}</span>`).join("")}</div>
      <div class="crm-days">${cells.join("")}</div>
      <footer>${quick.map(([label, date]) => `<button type="button" class="crm-picker-quick" data-kit-date="pick" data-date="${date}">${label}</button>`).join("")}
        ${box.dataset.optional === "true" ? '<button type="button" class="crm-picker-quick" data-kit-date="pick" data-date="">Limpar</button>' : ""}</footer>`;
  }
  function placeDate(box) {
    const popover = box.querySelector(".kit-date-popover");
    const rect = box.querySelector(".kit-date-button").getBoundingClientRect();
    popover.style.position = "fixed";
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    popover.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - width - 8))}px`;
    const below = rect.bottom + 6;
    popover.style.top = `${below + height <= innerHeight - 8 ? below : Math.max(8, rect.top - height - 6)}px`;
  }
  document.addEventListener("scroll", (event) => {
    if (!event.target.closest?.(".kit-date-popover")) closeDates();
  }, true);
  window.addEventListener("resize", () => closeDates());

  function closeDates(except) {
    for (const box of document.querySelectorAll(".kit-date")) {
      if (box === except) continue;
      box.querySelector(".kit-date-popover").hidden = true;
      box.querySelector(".kit-date-button").setAttribute("aria-expanded", "false");
    }
  }
  document.addEventListener("click", (event) => {
    const control = event.target.closest("[data-kit-date]");
    if (!control) {
      if (!event.target.closest(".kit-date")) closeDates();
      return;
    }
    const box = control.closest(".kit-date");
    const input = box.querySelector("input");
    const popover = box.querySelector(".kit-date-popover");
    const action = control.dataset.kitDate;
    if (action === "toggle") {
      const open = popover.hidden;
      closeDates(box);
      popover.hidden = !open;
      control.setAttribute("aria-expanded", String(open));
      if (open) {
        paintDate(box, (input.value || today()).slice(0, 7));
        placeDate(box);
        (popover.querySelector('.crm-day[aria-pressed="true"]') ?? popover.querySelector(".crm-day[data-today]"))?.focus({ preventScroll: true });
      }
    }
    if (action === "month") {
      paintDate(box, addMonths(box.dataset.month, Number(control.dataset.step)));
      placeDate(box);
    }
    if (action === "pick") {
      input.value = control.dataset.date;
      box.querySelector(".kit-date-button span").textContent = input.value ? longDate.format(new Date(`${input.value}T00:00:00Z`)) : "Sem data";
      popover.hidden = true;
      box.querySelector(".kit-date-button").setAttribute("aria-expanded", "false");
      box.querySelector(".kit-date-button").focus();
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const open = [...document.querySelectorAll(".kit-date-popover")].find((popover) => !popover.hidden);
    if (!open) return;
    event.preventDefault();
    event.stopPropagation();
    closeDates();
    open.closest(".kit-date").querySelector(".kit-date-button").focus();
  }, true);

  const dateField = (label, name, value, options) =>
    `<div class="kit-field"><span>${label}</span>${dateInput(name, value, options)}</div>`;
  const field = (label, control, hint = "") =>
    `<label class="kit-field"><span>${label}</span>${control}${hint ? `<small>${hint}</small>` : ""}</label>`;
  const input = (name, value = "", attributes = "") => `<input name="${name}" value="${escape(value)}" ${attributes}>`;
  const textarea = (name, value = "", attributes = "") => `<textarea name="${name}" ${attributes}>${escape(value)}</textarea>`;
  const select = (name, options, selected) => `<select name="${name}">${options.map(([value, label]) =>
    `<option value="${escape(value)}"${String(value) === String(selected ?? "") ? " selected" : ""}>${escape(label)}</option>`).join("")}</select>`;
  function invalid(formElement, name, message) {
    const control = formElement.elements[name];
    control.setCustomValidity(message);
    control.reportValidity();
    control.addEventListener("input", () => control.setCustomValidity(""), { once: true });
    return false;
  }

  /* Pointer-based drag between drop zones (used by Kanban boards). */
  function draggable(container, { item = "[data-drag]", zone = "[data-drop]", onDrop }) {
    let drag;
    let swallow = false;
    container.addEventListener("pointerdown", (event) => {
      const element = event.target.closest(item);
      if (!element || event.button !== 0 || event.target.closest("button, a, input, select, textarea")) return;
      drag = { element, id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    document.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      if (!drag.started) {
        if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
        drag.started = true;
        drag.element.setPointerCapture(event.pointerId);
        drag.element.dataset.dragging = "";
      }
      const over = document.elementFromPoint(event.clientX, event.clientY)?.closest(zone);
      if (over !== drag.over) {
        if (drag.over) delete drag.over.dataset.over;
        drag.over = container.contains(over) ? over : undefined;
        if (drag.over) drag.over.dataset.over = "";
      }
    });
    const finish = (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const { element, over, started } = drag;
      drag = undefined;
      delete element.dataset.dragging;
      if (over) delete over.dataset.over;
      if (!started) return;
      swallow = true;
      setTimeout(() => { swallow = false; }, 0);
      if (event.type === "pointerup" && over) onDrop(element.dataset.drag ?? element.dataset.id, over, event);
    };
    document.addEventListener("pointerup", finish);
    document.addEventListener("pointercancel", finish);
    container.addEventListener("click", (event) => {
      if (!swallow) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  const emptyState = (glyph, title, text = "", action = "") =>
    `<div class="crm-empty-state"><span class="crm-empty-icon">${icon(glyph)}</span><strong>${title}</strong>${text ? `<p>${text}</p>` : ""}${action}</div>`;
  const panel = (title, glyph, body, action = "") =>
    `<section class="crm-panel"><header><span class="crm-panel-icon">${icon(glyph)}</span><h2>${title}</h2>${action}</header>${body}</section>`;
  const stat = (label, value, hint, glyph, tone = "muted", attributes = "") =>
    `<button type="button" class="crm-stat" data-tone="${tone}" ${attributes}><span class="crm-stat-top"><span class="crm-stat-icon">${icon(glyph)}</span><span>${label}</span></span><strong>${value}</strong><small>${hint}</small></button>`;
  const tabs = (items, selected, attribute) => `<nav class="crm-tabs">${items.map(([key, label, glyph]) =>
    `<button type="button" ${attribute}="${key}" aria-pressed="${key === selected}">${icon(glyph)}${label}</button>`).join("")}</nav>`;

  const projectColors = {
    violet: "Violeta", blue: "Azul", teal: "Verde-água", green: "Verde", amber: "Âmbar", orange: "Laranja", pink: "Rosa", slate: "Cinza",
  };
  const projects = () => workspace.projects ??= [];
  const project = (id) => id ? projects().find((item) => item.id === id) : undefined;
  const projectOptions = (selected, emptyLabel = "Sem projeto") =>
    [["", emptyLabel], ...projects().filter((item) => item.status !== "archived" || item.id === selected).map((item) => [item.id, item.name])];
  const projectChip = (id) => {
    const item = project(id);
    return item ? `<span class="kit-project" data-color="${item.color}">${item.logo ? `<img class="kit-project-logo" src="${escape(item.logo)}" alt="">` : "<i></i>"}${escape(item.name)}</span>` : "";
  };

  /* Floating menu anchored to a button (stage ring, ⋯, split buttons). */
  let menuState;
  function closeMenu() {
    menuState?.menu.remove();
    menuState?.anchor.setAttribute("aria-expanded", "false");
    menuState = undefined;
  }
  function menu(anchor, items, { align = "start", search = false } = {}) {
    if (menuState?.anchor === anchor) return closeMenu();
    closeMenu();
    const element = document.createElement("div");
    element.className = "kit-select-menu kit-menu";
    element.setAttribute("role", "menu");
    if (search) {
      element.classList.add("kit-menu-searchable");
      element.insertAdjacentHTML("beforeend", `<input class="kit-menu-search" placeholder="${escape(typeof search === "string" ? search : "Buscar…")}" aria-label="Buscar" autocomplete="off" spellcheck="false">`);
    }
    for (const item of items) {
      if (item === "-") {
        element.insertAdjacentHTML("beforeend", '<span class="kit-menu-sep" role="separator"></span>');
        continue;
      }
      if (item.heading) {
        element.insertAdjacentHTML("beforeend", `<span class="kit-menu-heading">${escape(item.heading)}</span>`);
        continue;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = `kit-select-option kit-menu-item${item.danger ? " danger" : ""}`;
      button.setAttribute("role", "menuitem");
      button.disabled = Boolean(item.disabled);
      if (item.checked) button.setAttribute("aria-selected", "true");
      button.innerHTML = `${item.dot ? `<i class="kit-menu-dot" data-tone="${item.dot}"></i>` : item.icon ? icon(item.icon) : ""}<span></span>${item.hint ? `<small></small>` : ""}${item.checked ? icon("check") : ""}`;
      button.querySelector("span").textContent = item.label;
      if (item.hint) button.querySelector("small").textContent = item.hint;
      button.addEventListener("click", () => {
        closeMenu();
        item.action?.();
      });
      element.append(button);
    }
    (anchor.closest("dialog") ?? document.body).append(element);
    const rect = anchor.getBoundingClientRect();
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const left = align === "end" ? rect.right - width : rect.left;
    element.style.left = `${Math.max(8, Math.min(left, innerWidth - width - 8))}px`;
    element.style.top = `${rect.bottom + 4 + height <= innerHeight - 8 ? rect.bottom + 4 : Math.max(8, rect.top - height - 4)}px`;
    anchor.setAttribute("aria-expanded", "true");
    menuState = { menu: element, anchor };
    const searchInput = element.querySelector(".kit-menu-search");
    (searchInput ?? element.querySelector(".kit-menu-item:not(:disabled)"))?.focus({ preventScroll: true });
    if (searchInput) {
      if (!element.querySelector(".kit-menu-empty")) element.insertAdjacentHTML("beforeend", '<span class="kit-menu-empty" hidden>Nada encontrado</span>');
      searchInput.addEventListener("input", () => {
        const query = fold(searchInput.value.trim());
        let heading;
        let headingHasItems = false;
        const close = () => { if (heading) heading.hidden = !headingHasItems; };
        let shown = 0;
        for (const child of element.children) {
          if (child.classList.contains("kit-menu-heading")) {
            close();
            heading = child;
            headingHasItems = false;
          } else if (child.classList.contains("kit-menu-item")) {
            child.hidden = Boolean(query) && !fold(child.textContent).includes(query);
            if (!child.hidden) { headingHasItems = true; shown += 1; }
          } else if (child.classList.contains("kit-menu-sep")) {
            child.hidden = Boolean(query);
          }
        }
        close();
        element.querySelector(".kit-menu-empty").hidden = shown > 0;
      });
      searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          element.querySelector(".kit-menu-item:not(:disabled):not([hidden])")?.click();
        }
      });
    }
    element.addEventListener("keydown", (event) => {
      const options = [...element.querySelectorAll(".kit-menu-item:not(:disabled):not([hidden])")];
      const index = options.indexOf(document.activeElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        options[(index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length]?.focus();
      }
      if (event.key === "Escape" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        anchor.focus();
      }
    });
  }
  document.addEventListener("pointerdown", (event) => {
    if (menuState && !menuState.menu.contains(event.target) && !menuState.anchor.contains(event.target)) closeMenu();
  }, true);
  window.addEventListener("resize", () => closeMenu());

  /* (i) help next to titles instead of explanatory text in the body. */
  const help = (text) => `<span class="kit-help" tabindex="0" role="note" aria-label="${escape(text)}">${icon("info")}<span class="kit-help-tip">${escape(text)}</span></span>`;

  let toastTimer;
  function toast(message, action) {
    let element = $("#kit-toast");
    if (!element) {
      element = Object.assign(document.createElement("div"), { id: "kit-toast", className: "notes-toast", hidden: true });
      element.setAttribute("role", "status");
      document.body.append(element);
    }
    clearTimeout(toastTimer);
    element.replaceChildren(Object.assign(document.createElement("span"), { textContent: message }));
    if (action) {
      const button = Object.assign(document.createElement("button"), { type: "button", textContent: action[0] });
      button.addEventListener("click", () => { element.hidden = true; action[1](); });
      element.append(button);
    }
    element.hidden = false;
    toastTimer = setTimeout(() => { element.hidden = true; }, 4500);
  }

  /* ---------- Images (project logo, contact photo) ---------- */
  const isImage = (value, max = 400000) => typeof value === "string" && value.length < max && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
  function readImage(file, { fit = "contain", size = 192, max = 400000 } = {}) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error("Escolha um arquivo de imagem (PNG, JPG, WEBP ou SVG)."));
      if (file.size > 15 * 1024 * 1024) return reject(new Error("Imagem muito grande. Use uma de até 15 MB."));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
        image.onload = () => {
          const width = image.naturalWidth || size;
          const height = image.naturalHeight || size;
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (fit === "cover") {
            const side = Math.min(width, height);
            canvas.width = canvas.height = Math.min(size, side) || size;
            context.drawImage(image, (width - side) / 2, (height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
          } else {
            const scale = Math.min(1, size / Math.max(width, height));
            canvas.width = Math.max(1, Math.round(width * scale));
            canvas.height = Math.max(1, Math.round(height * scale));
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
          }
          let result = canvas.toDataURL("image/webp", 0.9);
          for (const quality of [0.8, 0.7, 0.6, 0.5]) {
            if (!result.startsWith("data:image/webp") || result.length < max) break;
            result = canvas.toDataURL("image/webp", quality);
          }
          if (!result.startsWith("data:image/webp")) result = canvas.toDataURL("image/png");
          if (!isImage(result, max)) return reject(new Error("Não foi possível reduzir a imagem."));
          resolve(result);
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function pickImage(options) {
    return new Promise((resolve) => {
      const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/png,image/jpeg,image/webp,image/svg+xml,image/gif" });
      input.addEventListener("change", () => {
        readImage(input.files?.[0], options).then(resolve, (error) => {
          toast(error.message);
          resolve(null);
        });
      }, { once: true });
      input.click();
    });
  }
  const imageField = (name, value = "", { label = "Imagem", fit = "contain", shape = "square", hint = "PNG, JPG, WEBP ou SVG. A imagem é reduzida automaticamente.", size = 192, max = 400000 } = {}) =>
    `<div class="kit-image" data-fit="${fit}" data-shape="${shape}" data-size="${size}" data-max="${max}">
      <span class="kit-image-preview">${value ? `<img src="${escape(value)}" alt="">` : icon("image")}</span>
      <div class="kit-image-text"><strong>${escape(label)}</strong><small>${escape(hint)}</small>
        <span class="kit-image-actions"><button type="button" class="button" data-kit-image="pick">${icon("image")}${value ? "Trocar" : "Escolher imagem"}</button>
        <button type="button" class="crm-link" data-kit-image="clear"${value ? "" : " hidden"}>Remover</button></span></div>
      <input type="hidden" name="${name}" value="${escape(value)}"></div>`;
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-kit-image]");
    if (!button) return;
    const box = button.closest(".kit-image");
    const input = box.querySelector('input[type="hidden"]');
    const preview = box.querySelector(".kit-image-preview");
    const pick = box.querySelector('[data-kit-image="pick"]');
    const clear = box.querySelector('[data-kit-image="clear"]');
    const apply = (value) => {
      input.value = value;
      preview.innerHTML = value ? `<img src="${escape(value)}" alt="">` : icon("image");
      pick.innerHTML = `${icon("image")}${value ? "Trocar" : "Escolher imagem"}`;
      clear.hidden = !value;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };
    if (button.dataset.kitImage === "clear") return apply("");
    const value = await pickImage({ fit: box.dataset.fit, size: Number(box.dataset.size) || 192, max: Number(box.dataset.max) || 400000 });
    if (value) apply(value);
  });

  /* ---------- Quick links (contacts and projects) ---------- */
  const linkKinds = {
    whatsapp: ["WhatsApp", "wa.me/55… ou o número com DDD"],
    wagrupo: ["Grupo WhatsApp", "chat.whatsapp.com/…"],
    instagram: ["Instagram", "@perfil ou instagram.com/…", "https://instagram.com/"],
    linkedin: ["LinkedIn", "linkedin.com/in/…"],
    site: ["Site", "site.com.br"],
    youtube: ["YouTube", "@canal ou youtube.com/…", "https://youtube.com/@"],
    drive: ["Drive", "drive.google.com/…"],
    notion: ["Notion", "notion.so/…"],
    figma: ["Figma", "figma.com/…"],
    github: ["GitHub", "@usuário ou github.com/…", "https://github.com/"],
  };
  const linkGlyph = { site: "globe" };
  const linkConfigs = {};
  function registerLinks(kind, config) {
    linkConfigs[kind] = config;
  }
  /* Turns what the person typed (@handle, phone, domain) into an address that opens. */
  function resolveLink(key, value) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    if ((key === "whatsapp") && /^[\d\s()+-]{8,}$/.test(text)) {
      let digits = text.replace(/\D/g, "");
      if (digits.length <= 11) digits = `55${digits}`;
      return `https://wa.me/${digits}`;
    }
    const base = linkKinds[key]?.[2];
    if (base && (/^@[\w.-]+$/.test(text) || /^[\w-]+$/.test(text))) return base + text.replace(/^@/, "");
    return richText.safeHref(text);
  }
  function linkEntries(kind, owner) {
    const config = linkConfigs[kind];
    const saved = owner.quickLinks ?? {};
    return config.keys.map((key) => {
      const value = saved[key] || config.derived?.(owner, key) || "";
      return { key, label: linkKinds[key][0], value, href: resolveLink(key, value), derived: !saved[key] && Boolean(value) };
    });
  }
  function quickLinks(kind, owner) {
    const entries = linkEntries(kind, owner);
    const filled = entries.filter((item) => item.href);
    const missing = entries.filter((item) => !item.href);
    const extra = (owner.extraLinks ?? []).map((item) => ({ ...item, href: richText.safeHref(item.url) })).filter((item) => item.href);
    const tile = (glyph, label, href, title) => `<button type="button" class="kit-ql-tile" data-ql-open="${escape(href)}" title="${escape(title)}">${icon(glyph)}<span>${escape(label)}</span></button>`;
    return `<div class="kit-ql" data-ql-kind="${kind}" data-ql-id="${escape(owner.id)}">
      ${filled.map((item) => tile(linkGlyph[item.key] ?? item.key, item.label, item.href, item.derived ? `${item.label} pelo telefone cadastrado` : item.value)).join("")}
      ${extra.map((item) => tile("chain", item.name, item.href, item.url)).join("")}
      ${missing.map((item) => `<button type="button" class="kit-ql-tile add" data-ql-add="${item.key}" title="Adicionar ${escape(item.label)}">${icon(linkGlyph[item.key] ?? item.key)}<span>+ ${escape(item.label)}</span></button>`).join("")}
    </div>`;
  }
  const quickLinksEdit = (kind, owner) => `<button type="button" class="crm-link kit-ql-edit" data-ql-edit data-ql-kind="${kind}" data-ql-id="${escape(owner.id)}">${icon("edit")}Editar</button>`;
  function refreshLinks(kind, owner) {
    for (const element of document.querySelectorAll(`.kit-ql[data-ql-kind="${kind}"]`)) {
      if (element.dataset.qlId === owner.id) element.outerHTML = quickLinks(kind, owner);
    }
  }
  function editLinks(kind, owner, focusKey) {
    const config = linkConfigs[kind];
    const saved = owner.quickLinks ?? {};
    const extraRow = (item = { name: "", url: "" }) => `<div class="kit-ql-extra"><input name="xn" maxlength="40" placeholder="Nome" value="${escape(item.name)}" aria-label="Nome do link">
      <input name="xu" maxlength="2048" placeholder="Endereço" value="${escape(item.url)}" aria-label="Endereço do link">
      <button type="button" class="icon-button" data-ql-xrm aria-label="Remover link">${icon("close")}</button></div>`;
    form({
      title: "Links rápidos",
      info: config.info,
      fields: `<p class="kit-ql-owner">${escape(config.name(owner))}</p>
        <div class="kit-ql-fields">${config.keys.map((key) => `<label><span>${icon(linkGlyph[key] ?? key)}${linkKinds[key][0]}</span>
          <input name="ql-${key}" maxlength="2048" value="${escape(saved[key] ?? "")}" placeholder="${escape(config.placeholder?.(owner, key) || linkKinds[key][1])}" autocomplete="off" spellcheck="false"${key === focusKey ? " autofocus" : ""}></label>`).join("")}</div>
        <div class="kit-ql-extras"><span class="kit-ql-extras-title">Outros links</span><div class="kit-ql-extra-list">${(owner.extraLinks ?? []).map(extraRow).join("")}</div>
          <button type="button" class="crm-link" data-ql-xadd>${icon("plus")}Adicionar link</button></div>`,
      onOpen: (box) => {
        box.querySelector(".kit-ql-extras").addEventListener("click", (event) => {
          if (event.target.closest("[data-ql-xadd]")) {
            box.querySelector(".kit-ql-extra-list").insertAdjacentHTML("beforeend", extraRow());
            box.querySelector(".kit-ql-extra:last-child input").focus();
          }
          event.target.closest("[data-ql-xrm]")?.closest(".kit-ql-extra").remove();
        });
        box.addEventListener("input", (event) => event.target.setCustomValidity?.(""));
        if (focusKey) setTimeout(() => box.querySelector(`[name="ql-${focusKey}"]`)?.focus());
      },
      onSubmit: (values, element) => {
        const links = {};
        for (const key of config.keys) {
          const input = element.elements[`ql-${key}`];
          const value = input.value.trim();
          if (!value) continue;
          if (!resolveLink(key, value)) {
            input.setCustomValidity("Endereço inválido. Ex.: site.com.br ou https://…");
            input.reportValidity();
            return false;
          }
          links[key] = value;
        }
        const extras = [];
        for (const row of element.querySelectorAll(".kit-ql-extra")) {
          const [name, url] = [...row.querySelectorAll("input")];
          if (!name.value.trim() && !url.value.trim()) continue;
          const bad = !name.value.trim() ? name : !richText.safeHref(url.value) ? url : null;
          if (bad) {
            bad.setCustomValidity(bad === name ? "Dê um nome ao link." : "Endereço inválido.");
            bad.reportValidity();
            return false;
          }
          extras.push({ name: name.value.trim(), url: url.value.trim() });
        }
        owner.quickLinks = links;
        owner.extraLinks = extras;
        config.onSave?.(owner);
        touch();
        refreshLinks(kind, owner);
        toast("Links salvos.");
      },
    });
  }
  const validLinks = (item) => (item.quickLinks === undefined || (item.quickLinks && typeof item.quickLinks === "object" && !Array.isArray(item.quickLinks) &&
      Object.entries(item.quickLinks).every(([key, value]) => Object.hasOwn(linkKinds, key) && typeof value === "string"))) &&
    (item.extraLinks === undefined || (Array.isArray(item.extraLinks) && item.extraLinks.every((entry) => entry && typeof entry.name === "string" && typeof entry.url === "string")));
  document.addEventListener("click", (event) => {
    const open = event.target.closest("[data-ql-open]");
    if (open) return richText.openLink(open.dataset.qlOpen);
    const trigger = event.target.closest("[data-ql-add], [data-ql-edit]");
    if (!trigger) return;
    const box = trigger.closest("[data-ql-kind]");
    const config = linkConfigs[box?.dataset.qlKind];
    const owner = config?.find(box.dataset.qlId);
    if (owner) editLinks(box.dataset.qlKind, owner, trigger.dataset.qlAdd);
  });

  return {
    registerLinks, quickLinks, quickLinksEdit, editLinks, validLinks, resolveLink, isImage, readImage, pickImage, imageField,
    toast, menu, closeMenu, help,
    monthShort, escape, fold, plural, uid, today, addDays, daysUntil, isDate, isMonth, dateText, monthText, addMonths, dayInMonth, relativeDay,
    formatMoney, parseMoney, moneyInput, discreet, validate, list, isId, register, open, isOpen, touch, subscribe,
    groupOf, rememberGroup, groups,
    form, field, dateField, dateInput, input, textarea, select, invalid, draggable, emptyState, panel, stat, tabs,
    projectColors, projects, project, projectOptions, projectChip, validators,
  };
})();
