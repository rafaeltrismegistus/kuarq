"use strict";

/* Guias: várias telas abertas ao mesmo tempo, como num navegador.
   Cada guia guarda onde você estava (módulo, item aberto e rolagem).
   Ctrl+T nova · Ctrl+W fecha · Ctrl+Tab troca · Ctrl+1…9 vai direto · Ctrl+Shift+T reabre
   Ctrl+clique ou botão do meio abre em nova guia (com Shift, já vai para ela). */
const tabs = (() => {
  const { escape } = kit;
  const storageKey = "kuarq.tabs";
  const maxTabs = 20;
  const glyphs = {
    today: "home", workhome: "grid", tasks: "checklist", projects: "folder", processes: "layers", journal: "book",
    crm: "people", notes: "note", brain: "branch", library: "map", dreams: "sparkle", nucleus: "atom", links: "link",
  };
  let list = [];
  let activeId;
  let closed = [];
  let ready = false;
  let restoring = false;

  /* ---------- Barra ---------- */
  /* Barra de título própria, como num navegador: guias, atalhos compactos e botões da janela.
     Logo abaixo continua a barra com o caminho e a busca. */
  const titlebar = document.createElement("header");
  titlebar.className = "kq-titlebar";
  const strip = document.createElement("nav");
  strip.className = "kq-tabs";
  strip.setAttribute("aria-label", "Guias");
  const tools = document.createElement("div");
  tools.className = "kq-titlebar-tools";
  for (const id of ["save-status", "discreet-toggle", "reload-toolkit", "theme-toggle"]) {
    const element = document.getElementById(id);
    if (element) tools.append(element);
  }
  titlebar.append(strip, tools);
  document.body.prepend(titlebar);
  document.documentElement.classList.add("has-titlebar");
  if (!document.querySelector('link[href="tabs.css"]')) {
    document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href: "tabs.css" }));
  }

  const uid = () => kit.uid();
  const active = () => list.find((item) => item.id === activeId);
  const scroller = () => document.scrollingElement ?? document.documentElement;

  /* Onde a tela está agora. */
  function capture() {
    const action = $("#tool-crumb").dataset.action || "today";
    const location = { action };
    const pick = {
      tasks: () => tasks.current?.(),
      projects: () => projects.current?.(),
      crm: () => crm.current?.()?.id,
      notes: () => notes.current?.(),
      dreams: () => dreams.current?.(),
      library: () => (typeof activeMap !== "undefined" ? activeMap?.id : undefined),
    }[action];
    const item = pick?.();
    if (item !== undefined && item !== null) location.item = item;
    return location;
  }
  /* Nome da guia: o item aberto (mesmo num painel lateral) ou a tela. */
  function labelFor(location) {
    const text = describe();
    if (location?.item) return { title: titleFor(location), group: $("#tool-crumb").textContent.trim() };
    return text;
  }
  function describe() {
    const crumb = $("#current-crumb");
    const tool = $("#tool-crumb").textContent.trim();
    const detail = crumb && !crumb.hidden ? crumb.textContent.trim() : "";
    return { title: detail || tool || "Hoje", group: detail ? tool : "" };
  }

  /* Leva a tela para um lugar guardado. */
  function restore(location, scroll = 0) {
    restoring = true;
    try {
      if ($("#drawer").open) $("#drawer").close();
      kit.closeMenu?.();
      const { action, item } = location ?? { action: "today" };
      const opened =
        action === "tasks" && item ? (tasks.openPage(item), true)
        : action === "projects" && item ? (projects.open(item), true)
        : action === "crm" && item ? (actions.crm(), crm.openPage(item), true)
        : action === "notes" && item?.id ? (actions.notes(), item.kind === "template" ? notes.openTemplate(item.id) : notes.openById(item.id), true)
        : action === "dreams" && item ? (dreams.openPage(item), true)
        : action === "library" && item ? openMapAt(item)
        : false;
      if (!opened) {
        if (typeof actions[action] === "function" && ["today", "crm", "notes", "library"].includes(action)) actions[action]();
        else if (kit.groupOf(action) || document.getElementById(action)?.matches("[data-module]")) kit.open(action);
        else actions.today();
      }
    } catch {
      actions.today();
    } finally {
      restoring = false;
    }
    requestAnimationFrame(() => { scroller().scrollTop = scroll; });
  }

  /* ---------- Estado ---------- */
  function remember() {
    const tab = active();
    if (!tab || restoring) return;
    tab.location = capture();
    Object.assign(tab, labelFor(tab.location));
    tab.scroll = scroller().scrollTop;
  }
  /* No app, as guias vão para ui.json ao lado dos dados (o navegador interno roda em modo privado
     e apaga o próprio armazenamento ao fechar). Fora do app, usa o armazenamento do navegador. */
  const bridged = Boolean(window.chrome?.webview);
  function persist() {
    const text = JSON.stringify({ list: list.map(({ id, location, title, group }) => ({ id, location, title, group })), activeId });
    if (bridged) return void host("ui-set", text).catch(() => {});
    try { localStorage.setItem(storageKey, text); } catch { /* sem armazenamento: as guias só não voltam ao reabrir */ }
  }
  async function loadSaved(attempt = 0) {
    try {
      const text = bridged ? await host("ui-get") : localStorage.getItem(storageKey);
      return text ? JSON.parse(text) : null;
    } catch {
      /* Logo ao abrir, a ponte com o app pode ainda não responder: tenta de novo uma vez. */
      if (attempt < 1) return new Promise((resolve) => setTimeout(() => resolve(loadSaved(attempt + 1)), 400));
      return null;
    }
  }
  let persistTimer;
  const later = () => {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => { remember(); paint(); persist(); }, 120);
  };

  function paint() {
    strip.innerHTML = `${list.map((tab, index) => `<div class="kq-tab" role="tab" tabindex="0" draggable="true" data-tab="${tab.id}" aria-selected="${tab.id === activeId}"
        title="${escape([tab.group, tab.title].filter(Boolean).join(" · "))}${index < 9 ? ` (Ctrl+${index + 1})` : ""}">
        <span class="kq-tab-icon">${icon(glyphs[tab.location?.action] ?? "file")}</span>
        <span class="kq-tab-title">${escape(tab.title || "Nova guia")}</span>
        <button type="button" class="kq-tab-close" data-tab-close="${tab.id}" aria-label="Fechar guia" title="Fechar guia (Ctrl+W)">${icon("close")}</button>
      </div>`).join("")}
      <button type="button" class="kq-tab-new" data-tab-new aria-label="Nova guia" title="Nova guia (Ctrl+T)">${icon("plus")}</button>`;
    strip.classList.toggle("is-single", list.length === 1);
  }

  /* ---------- Ações ---------- */
  function activate(id) {
    if (id === activeId) return;
    const target = list.find((item) => item.id === id);
    if (!target) return;
    remember();
    activeId = id;
    restore(target.location, target.scroll);
    paint();
    later();
  }
  function open(location, { focus = true, after = activeId, keep = false } = {}) {
    if (!keep) remember();
    if (list.length >= maxTabs) {
      kit.toast(`Limite de ${maxTabs} guias. Feche alguma para abrir outra.`);
      return undefined;
    }
    const tab = { id: uid(), location, title: "", group: "", scroll: 0 };
    const index = list.findIndex((item) => item.id === after);
    list.splice(index < 0 ? list.length : index + 1, 0, tab);
    if (focus) {
      activeId = tab.id;
      restore(location);
      later();
    } else {
      tab.title = titleFor(location);
      persist();
    }
    paint();
    return tab;
  }
  /* Título provisório de uma guia aberta em segundo plano. */
  function titleFor(location) {
    const names = { today: "Hoje", tasks: "Tarefas", projects: "Projetos", crm: "Networking", notes: "Notas", library: "Mapas mentais", dreams: "Quadro dos sonhos", nucleus: "Núcleo" };
    const item = location?.item;
    try {
      if (location.action === "tasks" && item) return tasks.find?.(item)?.title ?? "Tarefa";
      if (location.action === "crm" && item) return workspace.contacts?.find((entry) => entry.id === item)?.name ?? "Contato";
      if (location.action === "notes" && item?.id) return workspace.notes?.find((entry) => entry.id === item.id)?.title || "Nota";
      if (location.action === "dreams" && item) return dreams.all?.().find((entry) => entry.id === item)?.title ?? "Sonho";
      if (location.action === "projects" && item) return projects.all?.().find((entry) => entry.id === item)?.name ?? "Projeto";
      if (location.action === "library" && item) return workspace.maps?.find((entry) => entry.id === item)?.title ?? "Mapa";
    } catch { /* título genérico */ }
    return names[location?.action] ?? "Nova guia";
  }
  function close(id) {
    const index = list.findIndex((item) => item.id === id);
    if (index < 0) return;
    if (id === activeId) remember();
    const [tab] = list.splice(index, 1);
    closed.push({ tab, index });
    if (closed.length > 15) closed.shift();
    if (!list.length) {
      const fresh = { id: uid(), location: { action: "today" }, title: "Hoje", group: "", scroll: 0 };
      list.push(fresh);
      activeId = undefined;
      return activate(fresh.id);
    }
    if (id === activeId) {
      activeId = undefined;
      activate(list[Math.min(index, list.length - 1)].id);
    } else {
      paint();
      persist();
    }
  }
  function reopen() {
    const last = closed.pop();
    if (!last) return;
    remember();
    list.splice(Math.min(last.index, list.length), 0, last.tab);
    activeId = undefined;
    activate(last.tab.id);
  }
  function cycle(step) {
    const index = list.findIndex((item) => item.id === activeId);
    activate(list[(index + step + list.length) % list.length].id);
  }
  function newTab() {
    open({ action: "today" });
    setTimeout(() => $("#palette-open")?.click(), 30);
  }

  /* Abre o que o clique abriria, mas numa guia nova: o clique acontece, a guia nova
     recebe o lugar novo e a guia atual volta para onde estava. */
  function intoNewTab(run, focus) {
    remember();
    const origin = active();
    const before = JSON.stringify(origin.location);
    const scroll = origin.scroll;
    run();
    setTimeout(() => {
      const location = capture();
      if (JSON.stringify(location) === before) return;
      const target = { ...location };
      const tab = open(target, { focus: false, after: origin.id, keep: true });
      if (!tab) return;
      Object.assign(tab, labelFor(location));
      if (focus) {
        activeId = tab.id;
        restore(location);
        paint();
        later();
      } else {
        restore(origin.location, scroll);
        paint();
        persist();
      }
    }, 90);
  }

  /* ---------- Eventos ---------- */
  strip.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-tab-close]");
    if (closeButton) { event.stopPropagation(); return close(closeButton.dataset.tabClose); }
    if (event.target.closest("[data-tab-new]")) return newTab();
    const tab = event.target.closest("[data-tab]");
    if (tab) activate(tab.dataset.tab);
  });
  strip.addEventListener("auxclick", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (event.button === 1 && tab) { event.preventDefault(); close(tab.dataset.tab); }
  });
  /* ---------- Janela: a barra do topo faz o papel da barra de título ---------- */
  const desktop = Boolean(window.chrome?.webview);
  if (desktop) {
    titlebar.classList.add("is-window");
    const controls = document.createElement("div");
    controls.className = "kq-window";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Janela");
    /* Símbolos desenhados (não texto), para ficarem exatamente no centro da bolinha. */
    const marks = { app: '<rect x="3.5" y="1.75" width="5" height="8.5" rx="1.2"/>', minimize: '<path d="M2.5 6h7"/>', maximize: '<path d="M6 2.5v7M2.5 6h7"/>', close: '<path d="M3 3l6 6M9 3l-6 6"/>' };
    controls.innerHTML = [["app", "Visão app (janela estreita e sempre à frente)"], ["minimize", "Minimizar"], ["maximize", "Maximizar"], ["close", "Fechar"]].map(([command, label]) =>
      `<button type="button" class="kq-window-button" data-window="${command}" aria-label="${label}" title="${label}"><span><svg viewBox="0 0 12 12" aria-hidden="true">${marks[command]}</svg></span></button>`).join("");
    titlebar.append(controls);
    controls.addEventListener("click", (event) => {
      const button = event.target.closest("[data-window]");
      if (!button) return;
      host("window", button.dataset.window).then((state) => {
        /* A bolinha da visão app fica marcada enquanto a janela está estreita. */
        const app = controls.querySelector('[data-window="app"]');
        if (state && typeof state.app === "boolean") {
          app.setAttribute("aria-pressed", String(state.app));
          app.title = state.app ? "Voltar ao tamanho anterior e soltar da frente" : "Visão app (janela estreita e sempre à frente)";
          app.setAttribute("aria-label", app.title);
        }
      }).catch(() => {});
    });
    const empty = (target) => !target.closest("button, input, a, [role='tab'], [data-tab], .kq-window");
    titlebar.addEventListener("mousedown", (event) => {
      if (event.button !== 0 || event.detail > 1 || !empty(event.target)) return;
      event.preventDefault();
      host("window", "drag").catch(() => {});
    });
    titlebar.addEventListener("dblclick", (event) => {
      if (empty(event.target)) host("window", "maximize").catch(() => {});
    });
    window.chrome.webview.addEventListener("message", ({ data }) => {
      if (data?.event !== "window") return;
      const button = controls.querySelector('[data-window="maximize"]');
      const label = data.maximized ? "Restaurar" : "Maximizar";
      button.title = label;
      button.setAttribute("aria-label", label);
      titlebar.classList.toggle("is-maximized", Boolean(data.maximized));
    });
  }
  strip.addEventListener("keydown", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (tab && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); activate(tab.dataset.tab); }
  });
  let dragged;
  strip.addEventListener("dragstart", (event) => {
    dragged = event.target.closest("[data-tab]")?.dataset.tab;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "");
  });
  strip.addEventListener("dragover", (event) => {
    if (!dragged) return;
    event.preventDefault();
    const over = event.target.closest("[data-tab]");
    if (!over || over.dataset.tab === dragged) return;
    const from = list.findIndex((item) => item.id === dragged);
    const to = list.findIndex((item) => item.id === over.dataset.tab);
    const box = over.getBoundingClientRect();
    const side = event.clientX > box.left + box.width / 2 ? 1 : 0;
    const [moved] = list.splice(from, 1);
    list.splice(to + (from < to ? side - 1 : side), 0, moved);
    paint();
  });
  strip.addEventListener("dragend", () => { dragged = undefined; persist(); });

  document.addEventListener("keydown", (event) => {
    if (!ready || !(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (document.querySelector("dialog[open]:not(#drawer)")) return;
    const key = event.key.toLowerCase();
    let handled = true;
    if (key === "t" && event.shiftKey) reopen();
    else if (key === "t") newTab();
    else if (key === "w") close(activeId);
    else if (key === "tab") cycle(event.shiftKey ? -1 : 1);
    else if (key === "pagedown") cycle(1);
    else if (key === "pageup") cycle(-1);
    else if (/^[1-9]$/.test(key) && !event.target.closest?.("input, textarea, [contenteditable]")) {
      const index = key === "9" ? list.length - 1 : Number(key) - 1;
      if (list[index]) activate(list[index].id);
    } else handled = false;
    if (handled) { event.preventDefault(); event.stopPropagation(); }
  }, true);

  /* Ctrl+clique e botão do meio dentro do conteúdo. */
  const clickable = "button, a, [role='button'], [data-id], [data-drag], tr, .crm-row, .note-card";
  const outside = (target) => !target.closest("#main") || target.closest("#map-viewport, input, textarea, select, [contenteditable], .kit-select, .rpt-cal");
  document.addEventListener("click", (event) => {
    if (!ready || !(event.ctrlKey || event.metaKey) || event.button !== 0 || outside(event.target)) return;
    const target = event.target.closest(clickable);
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const focus = event.shiftKey;
    intoNewTab(() => target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })), focus);
  }, true);
  document.addEventListener("mousedown", (event) => {
    if (ready && event.button === 1 && !outside(event.target) && event.target.closest(clickable)) event.preventDefault();
  });
  document.addEventListener("auxclick", (event) => {
    if (!ready || event.button !== 1 || outside(event.target)) return;
    const target = event.target.closest(clickable);
    if (!target) return;
    event.preventDefault();
    intoNewTab(() => target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window })), event.shiftKey);
  });

  /* Toda mudança de tela atualiza a guia atual. */
  const watch = new MutationObserver(() => { if (ready && !restoring) later(); });
  watch.observe($("#tool-crumb"), { childList: true, characterData: true, subtree: true, attributes: true });
  watch.observe($("#current-crumb"), { childList: true, characterData: true, subtree: true, attributes: true });
  window.addEventListener("scroll", () => { if (ready) { const tab = active(); if (tab) tab.scroll = scroller().scrollTop; } }, { passive: true });
  window.addEventListener("beforeunload", () => { if (ready) { remember(); persist(); } });

  /* ---------- Início: volta as guias da última vez ---------- */
  async function start() {
    const saved = await loadSaved();
    const valid = (tab) => tab && typeof tab.id === "string" && tab.location && typeof tab.location.action === "string";
    list = Array.isArray(saved?.list) ? saved.list.filter(valid).slice(0, maxTabs).map((tab) => ({ ...tab, scroll: 0 })) : [];
    if (!list.length) {
      list = [{ id: uid(), location: capture(), scroll: 0, ...describe() }];
      activeId = list[0].id;
    } else {
      activeId = list.some((tab) => tab.id === saved.activeId) ? saved.activeId : list[0].id;
      restore(active().location);
    }
    ready = true;
    paint();
    later();
  }
  const wait = setInterval(() => {
    if (typeof workspace === "undefined" || !workspace || !$("#tool-crumb").dataset.action) return;
    clearInterval(wait);
    setTimeout(start, 50);
  }, 100);

  return { open, close, list: () => list, active };
})();
