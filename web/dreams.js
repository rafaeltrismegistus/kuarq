"use strict";

/* Quadro dos sonhos: sonhos com imagem, etapas (como tarefas) e passos.
   Galeria, lista e Kanban; painel compacto e página inteira. */
const dreams = (() => {
  const content = $("#dreams-content");
  const drawer = $("#drawer");
  const { escape, fold } = kit;
  const stages = [
    ["dreaming", "Sonhando", "pausa"], ["planning", "Planejando", "novo"], ["doing", "Em realização", "aproximacao"],
    ["almost", "Quase lá", "revisao"], ["achieved", "Realizado", "ativo"],
  ];
  const stageNames = Object.fromEntries(stages.map(([key, label]) => [key, label]));
  const stageTone = Object.fromEntries(stages.map(([key, , tone]) => [key, tone]));
  const nextStep = {
    dreaming: ["planning", "Começar a planejar"], planning: ["doing", "Colocar em prática"], doing: ["almost", "Está quase lá"],
    almost: ["achieved", "Realizei!"], achieved: ["doing", "Reabrir"],
  };
  const categories = ["Viagem", "Casa", "Carreira", "Família", "Saúde", "Experiência", "Conquista material", "Aprendizado", "Finanças", "Outro"];
  const imageMax = 1200000;
  const stamp = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  let view = "gallery";
  let stageFilter = "all";
  let query = "";
  let panelId;
  let pageId;
  let keepPage = false;
  let boundDrag = false;

  /* ---------- Data ---------- */
  const all = () => workspace.dreams ??= [];
  const find = (id) => all().find((item) => item.id === id);
  const byOrder = (a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt);

  function validate(data) {
    return kit.list(data.dreams, (item) => typeof item.title === "string" && Object.hasOwn(stageNames, item.stage) &&
      ["description", "why", "category"].every((key) => item[key] === undefined || typeof item[key] === "string") &&
      (item.target === undefined || item.target === "" || kit.isDate(item.target)) &&
      (item.cost === undefined || Number.isInteger(item.cost)) &&
      (item.image === undefined || kit.isImage(item.image, imageMax)) &&
      (item.steps === undefined || (Array.isArray(item.steps) && item.steps.every((step) => step && typeof step.id === "string" && typeof step.title === "string" && typeof step.done === "boolean"))));
  }

  function create(values = {}) {
    const dream = {
      id: kit.uid(), title: (values.title ?? "").trim() || "Novo sonho", stage: values.stage ?? "dreaming", category: values.category ?? "",
      description: "", why: "", target: "", steps: [], createdAt: Date.now(), updatedAt: Date.now(), order: Date.now(),
    };
    all().push(dream);
    kit.touch();
    return dream;
  }

  function save(dream) {
    dream.updatedAt = Date.now();
    kit.touch();
  }

  function setStage(dream, stage) {
    if (!Object.hasOwn(stageNames, stage) || dream.stage === stage) return;
    dream.stage = stage;
    if (stage === "achieved") {
      dream.achievedAt = kit.today();
      kit.toast(`Parabéns! “${dream.title}” realizado.`);
    } else delete dream.achievedAt;
    save(dream);
  }

  function remove(dream) {
    const index = all().indexOf(dream);
    workspace.dreams = all().filter((item) => item !== dream);
    if (drawer.open && drawer.dataset.panel === "dream") drawer.close();
    if (pageId === dream.id) pageId = undefined;
    kit.touch();
    refresh();
    kit.toast("Sonho excluído.", ["Desfazer", () => {
      all().splice(index, 0, dream);
      kit.touch();
      refresh();
    }]);
  }

  /* ---------- Small pieces ---------- */
  const progress = (dream) => {
    const steps = dream.steps ?? [];
    return { done: steps.filter((step) => step.done).length, total: steps.length };
  };
  const percent = (dream) => {
    if (dream.stage === "achieved") return 100;
    const { done, total } = progress(dream);
    return total ? Math.round(done / total * 100) : 0;
  };
  const stagePill = (dream, attributes = "") => `<span class="crm-stage" data-tone="${stageTone[dream.stage]}" ${attributes}><i></i>${stageNames[dream.stage]}</span>`;
  function whenText(dream) {
    if (dream.stage === "achieved" && dream.achievedAt) return `Realizado em ${kit.dateText(dream.achievedAt)}`;
    if (!dream.target) return "";
    const days = kit.daysUntil(dream.target);
    if (days < 0) return `Meta era ${kit.dateText(dream.target)}`;
    if (days > 60) return `Até ${kit.monthText(dream.target.slice(0, 7))}`;
    return `Até ${kit.dateText(dream.target)}`;
  }
  function cover(dream, className = "dream-cover") {
    return dream.image
      ? `<span class="${className}"><img src="${dream.image}" alt="" draggable="false"></span>`
      : `<span class="${className} is-empty" data-tone="${stageTone[dream.stage]}">${icon("image")}</span>`;
  }
  function meta(dream) {
    const parts = [
      dream.category ? `<span class="crm-tag">${escape(dream.category)}</span>` : "",
      whenText(dream) ? `<span class="dream-when">${icon(dream.stage === "achieved" ? "check" : "calendar")}${whenText(dream)}</span>` : "",
      dream.cost ? `<span class="dream-when">${icon("wallet")}${kit.formatMoney(dream.cost)}</span>` : "",
    ].join("");
    return parts;
  }
  function bar(dream) {
    const { done, total } = progress(dream);
    if (!total && dream.stage !== "achieved") return "";
    return `<span class="dream-progress"><span class="crm-bar"><span data-fill="${percent(dream)}"></span></span><small>${total ? `${done}/${total} passos` : "100%"}</small></span>`;
  }

  function filtered() {
    const terms = fold(query.trim());
    return all().filter((dream) => (stageFilter === "all" || dream.stage === stageFilter) &&
      (!terms || fold(`${dream.title} ${dream.category ?? ""} ${dream.description ?? ""} ${dream.why ?? ""}`).includes(terms)));
  }

  /* ---------- Views ---------- */
  function toolbar() {
    const counts = Object.fromEntries(stages.map(([key]) => [key, all().filter((dream) => dream.stage === key).length]));
    return `<div class="project-toolbar dream-toolbar">
      <div class="crm-filters" role="group" aria-label="Filtrar por etapa">
        <button type="button" class="crm-filter" data-dream="filter" data-filter="all" aria-pressed="${stageFilter === "all"}">Todos<span>${all().length}</span></button>
        ${stages.map(([key, label]) => `<button type="button" class="crm-filter" data-dream="filter" data-filter="${key}" aria-pressed="${stageFilter === key}">${label}<span>${counts[key]}</span></button>`).join("")}
      </div>
      <span class="tk-spacer"></span>
      <label class="crm-search tk-search dream-search"><span>${icon("search")}</span><input type="search" data-dream-search value="${escape(query)}" placeholder="Buscar sonho" aria-label="Buscar sonho"></label>
      <div class="tk-views" role="group" aria-label="Visualização">
        ${[["gallery", "grid", "Galeria"], ["list", "list", "Lista"], ["board", "board", "Kanban"]].map(([key, glyph, label]) =>
          `<button type="button" data-dream="view" data-view="${key}" aria-pressed="${view === key}" title="${label}" aria-label="${label}">${icon(glyph)}</button>`).join("")}
      </div>
    </div>`;
  }

  function gallery(items) {
    const sorted = [...items].sort((a, b) => stages.findIndex(([key]) => key === a.stage) - stages.findIndex(([key]) => key === b.stage) || byOrder(a, b));
    return `<div class="dream-grid">
      <button type="button" class="project-new dream-new" data-dream="new">${icon("plus")}<span>Novo sonho</span></button>
      ${sorted.map((dream) => `<article class="dream-card" data-stage="${dream.stage}">
        <button type="button" class="dream-open" data-dream="open" data-id="${escape(dream.id)}" aria-label="Abrir ${escape(dream.title)}">
          ${cover(dream)}
          <span class="dream-card-body">
            <span class="dream-card-top">${stagePill(dream)}${dream.category ? `<small>${escape(dream.category)}</small>` : ""}</span>
            <strong class="dream-card-title">${escape(dream.title)}</strong>
            ${dream.why ? `<span class="dream-card-why">${escape(dream.why)}</span>` : ""}
            ${bar(dream)}
            ${whenText(dream) ? `<span class="dream-when">${icon(dream.stage === "achieved" ? "check" : "calendar")}${whenText(dream)}</span>` : ""}
          </span>
        </button>
      </article>`).join("")}
    </div>${items.length ? "" : `<p class="project-empty-line">${all().length ? "Nenhum sonho neste filtro." : "Comece pelo primeiro sonho: dê um nome e coloque uma imagem que represente ele."}</p>`}`;
  }

  function listView(items) {
    const blocks = stages.map(([key, label, tone]) => {
      const list = items.filter((dream) => dream.stage === key).sort(byOrder);
      if (!list.length && stageFilter !== "all") return "";
      return `<tbody class="tk-group"><tr class="tk-group-row"><th colspan="5"><div class="tk-group-head"><span class="tk-group-dot" data-tone="${tone}"></span><strong>${label}</strong><small>${list.length}</small>
          <button type="button" class="icon-button tk-group-add" data-dream="new" data-stage="${key}" aria-label="Adicionar em ${label}" title="Adicionar">${icon("plus")}</button></div></th></tr>
        ${list.map((dream) => `<tr class="tk-row dream-row" data-dream="open" data-id="${escape(dream.id)}">
          <td><div class="tk-title-cell">${cover(dream, "dream-thumb")}<button type="button" class="tk-title" data-dream="open" data-id="${escape(dream.id)}">${escape(dream.title)}</button>
            <span class="tk-quick"><button type="button" data-dream="page" data-id="${escape(dream.id)}" title="Abrir página do sonho">${icon("open")}Abrir</button></span></div></td>
          <td>${dream.category ? `<span class="crm-tag">${escape(dream.category)}</span>` : '<span class="crm-faint">—</span>'}</td>
          <td>${progress(dream).total || dream.stage === "achieved" ? `<span class="project-mini-bar"><span class="crm-bar"><span data-fill="${percent(dream)}"></span></span><small>${percent(dream)}%</small></span>` : '<span class="crm-faint">—</span>'}</td>
          <td>${whenText(dream) || '<span class="crm-faint">—</span>'}</td>
          <td>${stagePill(dream)}</td></tr>`).join("") || `<tr class="crm-list-empty"><td colspan="5">Nenhum sonho nesta etapa</td></tr>`}
      </tbody>`;
    }).join("");
    return `<div class="task-table-wrap tk-table-wrap"><table class="task-table tk-table dream-table"><thead><tr><th>Sonho</th><th>Categoria</th><th>Progresso</th><th>Quando</th><th>Etapa</th></tr></thead>${blocks}</table></div>`;
  }

  function board(items) {
    return `<div class="task-board tk-board dream-board">${stages.map(([key, label, tone]) => {
      const list = items.filter((dream) => dream.stage === key).sort(byOrder);
      return `<section class="crm-lane task-lane" data-drop="${key}" data-tone="${tone}" aria-label="${label}">
        <header class="crm-lane-head"><span class="crm-stage" data-tone="${tone}"><i></i>${label}</span><small>${list.length}</small></header>
        <div class="crm-lane-body">${list.length ? list.map((dream) => `<article class="dream-kcard" data-drag="${escape(dream.id)}" data-id="${escape(dream.id)}" tabindex="0" aria-label="${escape(dream.title)}">
            ${dream.image ? cover(dream, "dream-kcover") : ""}
            <span class="dream-kbody"><strong>${escape(dream.title)}</strong>${meta(dream) ? `<span class="dream-meta">${meta(dream)}</span>` : ""}${bar(dream)}</span>
          </article>`).join("") : `<p class="crm-lane-empty">${key === "dreaming" ? "Tudo começa aqui" : "Arraste sonhos para cá"}</p>`}</div>
        <form class="task-quick tk-add" data-dream-quick="${key}"><span>${icon("plus")}</span><input name="title" maxlength="200" placeholder="Adicionar" aria-label="Adicionar sonho em ${label}"></form>
      </section>`;
    }).join("")}</div>`;
  }

  function fill(root) {
    for (const element of root.querySelectorAll("[data-fill]")) element.style.width = `${element.dataset.fill}%`;
  }

  function render() {
    if (pageId) {
      const dream = find(pageId);
      if (dream) return renderPage(dream);
      pageId = undefined;
    }
    $("#current-crumb").hidden = true;
    const items = filtered();
    const scroll = content.querySelector(".dream-board")?.scrollLeft;
    content.innerHTML = toolbar() + ({ gallery, list: listView, board })[view](items);
    if (scroll) content.querySelector(".dream-board").scrollLeft = scroll;
    fill(content);
    if (!boundDrag) {
      boundDrag = true;
      kit.draggable(content, { item: ".dream-kcard", zone: "[data-drop]", onDrop: moveCard });
    }
  }

  function moveCard(id, zone, event) {
    const dream = find(id);
    if (!dream) return;
    const siblings = [...zone.querySelectorAll(".dream-kcard")].filter((element) => element.dataset.id !== id);
    const after = siblings.find((element) => {
      const box = element.getBoundingClientRect();
      return event.clientY < box.top + box.height / 2;
    });
    const orders = siblings.map((element) => find(element.dataset.id)).map((item) => item.order ?? item.createdAt);
    const index = after ? siblings.indexOf(after) : siblings.length;
    const before = index > 0 ? orders[index - 1] : undefined;
    const next = index < orders.length ? orders[index] : undefined;
    dream.order = before === undefined && next === undefined ? Date.now()
      : before === undefined ? next - 1000 : next === undefined ? before + 1000 : (before + next) / 2;
    if (dream.stage !== zone.dataset.drop) setStage(dream, zone.dataset.drop);
    else save(dream);
    refresh();
  }

  /* ---------- Shared pieces of the panel and the page ---------- */
  function hero(dream, className) {
    return `<div class="dream-hero ${className}${dream.image ? "" : " is-empty"}">
      ${dream.image ? `<img src="${dream.image}" alt="Imagem do sonho ${escape(dream.title)}" draggable="false">` : `<span class="dream-hero-empty">${icon("image")}<strong>Coloque uma imagem que represente este sonho</strong><small>Clique para escolher, arraste um arquivo ou cole com Ctrl+V</small></span>`}
      <span class="dream-hero-actions">
        <button type="button" class="button" data-dream="image">${icon("image")}${dream.image ? "Trocar imagem" : "Escolher imagem"}</button>
        ${dream.image ? `<button type="button" class="icon-button" data-dream="image-remove" title="Remover imagem" aria-label="Remover imagem">${icon("trash")}</button>` : ""}
      </span>
    </div>`;
  }
  const optionList = (options, selected) => options.map(([key, label]) => `<option value="${escape(key)}"${key === (selected ?? "") ? " selected" : ""}>${escape(label)}</option>`).join("");
  function propsHtml(dream) {
    return `<dl class="tp-props">
      <div><dt>${icon("flag")}Categoria</dt><dd><select data-dream-prop="category" aria-label="Categoria">${optionList([["", "Sem categoria"], ...categories.map((item) => [item, item])], dream.category)}</select></dd></div>
      <div><dt>${icon("calendar")}Realizar até</dt><dd>${kit.dateInput("dream-target", dream.target ?? "", { optional: true })}</dd></div>
      <div><dt>${icon("wallet")}Custo estimado</dt><dd><input data-dream-prop="cost" inputmode="decimal" value="${kit.discreet() && dream.cost ? "" : escape(kit.moneyInput(dream.cost))}" placeholder="${kit.discreet() && dream.cost ? "Oculto no modo discreto" : "R$ 0,00"}" aria-label="Custo estimado"${kit.discreet() ? " disabled" : ""}></dd></div>
    </dl>`;
  }
  function stepsHtml(dream) {
    return `<ul class="tp-list">${(dream.steps ?? []).map((step) => `<li class="sub-row">
        <button type="button" class="task-check" data-dream="step-toggle" data-step="${escape(step.id)}" aria-pressed="${step.done}" aria-label="Marcar passo">${icon("check")}</button>
        <input class="sub-title" data-dream-step="${escape(step.id)}" value="${escape(step.title)}" maxlength="200" aria-label="Passo">
        <button type="button" class="icon-button sub-remove" data-dream="step-remove" data-step="${escape(step.id)}" aria-label="Remover passo">${icon("close")}</button></li>`).join("")}</ul>
      <form class="task-quick tp-add" data-dream-form="step"><span>${icon("plus")}</span><input name="title" maxlength="200" placeholder="Adicionar passo" aria-label="Novo passo"></form>`;
  }
  const textBox = (dream, key, placeholder, label) =>
    `<textarea class="tp-details" data-dream-text="${key}" rows="4" maxlength="5000" placeholder="${placeholder}" aria-label="${label}">${escape(dream[key] ?? "")}</textarea>`;
  const whyPlaceholder = "O que muda na sua vida quando isso acontecer? Como você vai se sentir?";
  const descPlaceholder = "Detalhes do sonho: onde, com quem, como imagina esse momento…";

  /* ---------- Compact panel ---------- */
  function panel(id) {
    const dream = find(id);
    if (!dream) return;
    panelId = id;
    const [next, nextLabel] = nextStep[dream.stage];
    const { done, total } = progress(dream);
    drawer.dataset.panel = "dream";
    drawer.innerHTML = `<div class="tp dream-panel" data-dream-root="${escape(dream.id)}">
      <header class="tp-top">
        <span class="tp-noproject">${icon("sparkle")}Quadro dos sonhos</span>
        <span class="tk-spacer"></span>
        <button type="button" class="button tp-expand" data-dream="page" data-id="${escape(dream.id)}" title="Abrir o sonho em página inteira">${icon("open")}Abrir página</button>
        <button type="button" class="icon-button" data-dream="menu" aria-label="Mais ações" title="Mais ações">${icon("more")}</button>
        <button type="button" class="icon-button" data-dream="close" aria-label="Fechar">${icon("close")}</button>
      </header>
      <div class="tp-body">
        ${hero(dream, "is-compact")}
        <div class="tp-pills"><button type="button" class="task-stage-pill tp-stage" data-tone="${stageTone[dream.stage]}" data-dream="stage">${stageNames[dream.stage]}${icon("chevron")}</button></div>
        <textarea class="tp-title" data-dream-text="title" rows="1" maxlength="200" aria-label="Nome do sonho">${escape(dream.title)}</textarea>
        ${propsHtml(dream)}
        <section class="tp-section"><h3>${icon("heart")}Por que este sonho</h3>${textBox(dream, "why", whyPlaceholder, "Por que este sonho")}</section>
        <section class="tp-section"><h3>${icon("checklist")}Passos até lá<small>${total ? `${done}/${total}` : ""}</small></h3>${stepsHtml(dream)}</section>
      </div>
      <footer class="tp-foot">
        <button type="button" class="button primary" data-dream="next" data-next="${next}">${nextLabel}</button>
        <span class="tk-spacer"></span>
        <small class="tp-created">Criado em ${stamp.format(new Date(dream.createdAt))}</small>
      </footer>
    </div>`;
    if (!drawer.open) drawer.showModal();
    grow(drawer.querySelector(".tp-title"));
  }

  /* ---------- Full page ---------- */
  function renderPage(dream) {
    const [next, nextLabel] = nextStep[dream.stage];
    const { done, total } = progress(dream);
    const crumb = $("#current-crumb");
    crumb.hidden = false;
    crumb.textContent = dream.title;
    const section = (title, glyph, count, body, extra = "") => `<section class="crm-panel tkp-section"><header><span class="crm-panel-icon">${icon(glyph)}</span><h2>${title}</h2>${count ? `<small class="tkp-count">${count}</small>` : ""}${extra}</header><div class="tkp-section-body">${body}</div></section>`;
    content.innerHTML = `<div class="tkp dream-page" data-dream-root="${escape(dream.id)}">
      <div class="tkp-top">
        <button type="button" class="note-ghost" data-dream="back">${icon("back")}<span>Quadro dos sonhos</span></button>
        <span class="tk-spacer"></span>
        <button type="button" class="icon-button" data-dream="menu" aria-label="Mais ações" title="Mais ações">${icon("more")}</button>
      </div>
      ${hero(dream, "is-page")}
      <div class="tkp-grid">
        <div class="tkp-main">
          <div class="tkp-head">
            <div class="tp-pills">
              <button type="button" class="task-stage-pill tp-stage" data-tone="${stageTone[dream.stage]}" data-dream="stage">${stageNames[dream.stage]}${icon("chevron")}</button>
              ${dream.category ? `<span class="crm-tag">${escape(dream.category)}</span>` : ""}
            </div>
            <textarea class="tp-title tkp-title dream-page-title" data-dream-text="title" rows="1" maxlength="200" aria-label="Nome do sonho">${escape(dream.title)}</textarea>
          </div>
          ${section("Por que este sonho", "heart", "", textBox(dream, "why", whyPlaceholder, "Por que este sonho"))}
          ${section("Como eu imagino", "sparkle", "", textBox(dream, "description", descPlaceholder, "Como eu imagino"))}
          ${section("Passos até lá", "checklist", total ? `${done}/${total}` : "", stepsHtml(dream),
            total ? `<span class="tkp-bar crm-bar"><span data-fill="${Math.round(done / total * 100)}"></span></span>` : "")}
        </div>
        <aside class="tkp-side">
          ${section("Detalhes", "flag", "", propsHtml(dream))}
          ${section("Progresso", "chart", "", `<div class="dream-side-progress"><strong>${percent(dream)}%</strong><span class="crm-bar"><span data-fill="${percent(dream)}"></span></span>
            <small>${dream.stage === "achieved" ? whenText(dream) : total ? `${done} de ${total} passos feitos` : "Adicione passos para acompanhar"}</small></div>`)}
        </aside>
      </div>
      <footer class="tkp-foot">
        <button type="button" class="button primary" data-dream="next" data-next="${next}">${nextLabel}</button>
        <span class="tk-spacer"></span>
        <small class="tp-created">Criado em ${stamp.format(new Date(dream.createdAt))}</small>
      </footer>
    </div>`;
    fill(content);
    for (const field of content.querySelectorAll("textarea")) grow(field);
  }

  function openPage(id) {
    if (!find(id)) return;
    pageId = id;
    if (drawer.open) drawer.close();
    if (kit.isOpen("dreams")) render();
    else {
      keepPage = true;
      kit.open("dreams");
    }
    $("#main").scrollTo?.(0, 0);
  }

  function grow(field) {
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }

  /* Redraw whatever shows this dream. */
  function refresh() {
    if (kit.isOpen("dreams")) {
      const active = document.activeElement;
      const keepFocus = pageId && active?.closest?.("#dreams-content") && active.matches("textarea, input");
      if (!keepFocus) render();
    }
    if (panelId && drawer.open && drawer.dataset.panel === "dream") {
      if (!drawer.contains(document.activeElement) || !document.activeElement.matches("textarea, input")) panel(panelId);
    }
  }
  function redrawAll() {
    if (kit.isOpen("dreams")) render();
    if (panelId && drawer.open && drawer.dataset.panel === "dream") panel(panelId);
  }

  /* ---------- Image ---------- */
  async function setImage(dream, file) {
    let data;
    try {
      data = file ? await kit.readImage(file, { size: 1400, max: imageMax }) : await kit.pickImage({ size: 1400, max: imageMax });
    } catch (error) {
      kit.toast(error.message);
      return;
    }
    if (!data) return;
    dream.image = data;
    save(dream);
    redrawAll();
  }

  /* ---------- Events (panel and page share the same markup) ---------- */
  const rootDream = (element) => find(element.closest("[data-dream-root]")?.dataset.dreamRoot);
  const scopes = [content, drawer];

  function onClick(event) {
    const button = event.target.closest("[data-dream]");
    if (!button) {
      const card = event.target.closest(".dream-kcard");
      if (card && content.contains(card)) panel(card.dataset.id);
      return;
    }
    const action = button.dataset.dream;
    const dream = find(button.dataset.id) ?? rootDream(button);
    if (action === "filter") { stageFilter = button.dataset.filter; return render(); }
    if (action === "view") { view = button.dataset.view; return render(); }
    if (action === "new") return newDream({ stage: button.dataset.stage });
    if (action === "open" && dream) return panel(dream.id);
    if (action === "page" && dream) return openPage(dream.id);
    if (action === "back") { pageId = undefined; return render(); }
    if (action === "close") return drawer.close();
    if (!dream) return;
    if (action === "image") return void setImage(dream);
    if (action === "image-remove") {
      delete dream.image;
      save(dream);
      return redrawAll();
    }
    if (action === "stage") {
      return kit.menu(button, stages.map(([key, label]) => ({
        label, dot: stageTone[key], checked: dream.stage === key, action: () => { setStage(dream, key); redrawAll(); },
      })));
    }
    if (action === "next") {
      setStage(dream, button.dataset.next);
      return redrawAll();
    }
    if (action === "step-toggle") {
      const step = dream.steps.find((item) => item.id === button.dataset.step);
      if (step) step.done = !step.done;
      save(dream);
      return redrawAll();
    }
    if (action === "step-remove") {
      dream.steps = dream.steps.filter((item) => item.id !== button.dataset.step);
      save(dream);
      return redrawAll();
    }
    if (action === "menu") {
      return kit.menu(button, [
        ...(drawer.contains(button) ? [{ label: "Abrir em página inteira", icon: "open", action: () => openPage(dream.id) }] : []),
        { label: dream.image ? "Trocar imagem" : "Escolher imagem", icon: "image", action: () => void setImage(dream) },
        { label: "Duplicar", icon: "layers", action: () => {
          const copy = { ...structuredClone(dream), id: kit.uid(), title: `${dream.title} (cópia)`, createdAt: Date.now(), updatedAt: Date.now(), order: Date.now() };
          all().push(copy);
          kit.touch();
          refresh();
          panel(copy.id);
        } },
        "-",
        { label: "Excluir sonho", icon: "trash", danger: true, action: () => remove(dream) },
      ], { align: "end" });
    }
  }

  function onChange(event) {
    const target = event.target;
    const dream = rootDream(target);
    if (!dream) return;
    if (target.matches("[data-dream-text]")) {
      const key = target.dataset.dreamText;
      const value = key === "title" ? target.value.replace(/\s+/g, " ").trim() || dream.title : target.value.trim();
      if ((dream[key] ?? "") === value) return;
      dream[key] = value;
      save(dream);
      return refresh();
    }
    if (target.matches("[data-dream-step]")) {
      const step = dream.steps.find((item) => item.id === target.dataset.dreamStep);
      const value = target.value.trim();
      if (!step || !value || step.title === value) return;
      step.title = value;
      return save(dream);
    }
    if (target.matches('[data-dream-prop="category"]')) {
      dream.category = target.value;
      save(dream);
      return redrawAll();
    }
    if (target.matches('[data-dream-prop="cost"]')) {
      const value = target.value.trim();
      const cents = value ? kit.parseMoney(value) : 0;
      if (Number.isNaN(cents) || cents < 0) return kit.toast("Valor inválido. Use, por exemplo, 12.500,00.");
      if (cents) dream.cost = cents;
      else delete dream.cost;
      save(dream);
      return refresh();
    }
    if (target.name === "dream-target") {
      dream.target = target.value;
      save(dream);
      return redrawAll();
    }
  }

  function onSubmit(event) {
    const form = event.target;
    if (form.matches("[data-dream-quick]")) {
      event.preventDefault();
      const title = form.elements.title.value.trim();
      if (!title) return;
      create({ title, stage: form.dataset.dreamQuick });
      render();
      content.querySelector(`[data-dream-quick="${form.dataset.dreamQuick}"] input`)?.focus();
      return;
    }
    if (!form.matches('[data-dream-form="step"]')) return;
    event.preventDefault();
    const dream = rootDream(form);
    const title = form.elements.title.value.trim();
    if (!dream || !title) return;
    (dream.steps ??= []).push({ id: kit.uid(), title, done: false });
    save(dream);
    redrawAll();
    const scope = drawer.open && drawer.dataset.panel === "dream" ? drawer : content;
    scope.querySelector('[data-dream-form="step"] input')?.focus();
  }

  for (const scope of scopes) {
    scope.addEventListener("click", (event) => {
      if (scope === drawer && drawer.dataset.panel !== "dream") return;
      onClick(event);
    });
    scope.addEventListener("change", (event) => {
      if (scope === drawer && drawer.dataset.panel !== "dream") return;
      onChange(event);
    });
    scope.addEventListener("submit", (event) => {
      if (scope === drawer && drawer.dataset.panel !== "dream") return;
      onSubmit(event);
    });
    scope.addEventListener("input", (event) => {
      if (event.target.matches("textarea[data-dream-text]")) grow(event.target);
      if (event.target.matches("[data-dream-search]")) {
        query = event.target.value;
        const position = event.target.selectionStart;
        render();
        const input = content.querySelector("[data-dream-search]");
        input.focus();
        input.setSelectionRange(position, position);
      }
    });
    scope.addEventListener("keydown", (event) => {
      if (event.target.matches('textarea[data-dream-text="title"]') && event.key === "Enter") {
        event.preventDefault();
        event.target.blur();
      }
    });
    scope.addEventListener("dragover", (event) => {
      if (!event.target.closest(".dream-hero") || ![...(event.dataTransfer?.types ?? [])].includes("Files")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });
    scope.addEventListener("drop", (event) => {
      const heroBox = event.target.closest(".dream-hero");
      const file = [...(event.dataTransfer?.files ?? [])].find((item) => /^image\//.test(item.type));
      const dream = heroBox && rootDream(heroBox);
      if (!dream || !file) return;
      event.preventDefault();
      void setImage(dream, file);
    });
  }
  document.addEventListener("paste", (event) => {
    if (event.target.closest?.("input, textarea, [contenteditable]")) return;
    const root = drawer.open && drawer.dataset.panel === "dream" ? drawer.querySelector("[data-dream-root]")
      : pageId && kit.isOpen("dreams") ? content.querySelector("[data-dream-root]") : undefined;
    const dream = root && rootDream(root);
    const file = [...(event.clipboardData?.items ?? [])].filter((item) => item.kind === "file").map((item) => item.getAsFile()).find((item) => item && /^image\//.test(item.type));
    if (!dream || !file) return;
    event.preventDefault();
    void setImage(dream, file);
  });
  drawer.addEventListener("close", () => {
    if (drawer.dataset.panel !== "dream") return;
    panelId = undefined;
    delete drawer.dataset.panel;
  });

  function newDream({ stage } = {}) {
    kit.form({
      title: "Novo sonho",
      submit: "Criar sonho",
      fields: `${kit.field("Qual é o sonho?", kit.input("title", "", 'maxlength="200" required autofocus placeholder="Ex.: Conhecer o Japão"'))}
        ${kit.field("Categoria", kit.select("category", [["", "Sem categoria"], ...categories.map((item) => [item, item])], ""))}
        ${kit.field("Etapa", kit.select("stage", stages.map(([key, label]) => [key, label]), stage || "dreaming"))}
        ${kit.imageField("image", "", { label: "Imagem do sonho", hint: "Uma foto que represente o sonho. Você pode trocar depois." })}`,
      onSubmit: (values, form) => {
        if (!values.title.trim()) return kit.invalid(form, "title", "Dê um nome ao sonho.");
        const dream = create({ title: values.title, stage: values.stage, category: values.category });
        if (kit.isImage(values.image, imageMax)) dream.image = values.image;
        if (!kit.isOpen("dreams")) kit.open("dreams");
        else render();
        setTimeout(() => panel(dream.id));
      },
    });
  }

  kit.subscribe?.(() => { if (kit.isOpen("dreams") && !pageId && !content.contains(document.activeElement)) render(); });

  const module = {
    validate,
    show: () => {
      if (!keepPage) pageId = undefined;
      keepPage = false;
      render();
    },
    command: (verb) => { if (verb === "new") newDream(); },
    all, open: (id) => panel(id), openPage, newDream, stageNames,
    current: () => pageId ?? (drawer.open && drawer.dataset.panel === "dream" ? panelId : undefined),
  };
  kit.register("dreams", "Quadro dos sonhos", module);
  return module;
})();
