"use strict";

const projects = (() => {
  const content = $("#projects-content");
  const drawer = $("#drawer");
  /* Etapas do ciclo de vida. "paused" só existe para dados antigos: vira etapa + pausa. */
  const stages = [["planning", "Planejamento", "novo"], ["structuring", "Estruturação", "aproximacao"], ["active", "Em operação", "ativo"], ["done", "Concluído", "pausa"]];
  const statuses = { planning: "Planejamento", structuring: "Estruturação", active: "Em operação", done: "Concluído", archived: "Arquivado", paused: "Pausado" };
  const stageIndex = Object.fromEntries(stages.map(([key], index) => [key, index]));
  const healths = { "": ["Sem avaliação", ""], ok: ["No prazo", "ativo"], attention: ["Atenção", "aproximacao"], risk: ["Em risco", "risco"] };
  const priorities = { "": "Sem prioridade", low: "Baixa", medium: "Média", high: "Alta" };
  const briefingTemplate = "<h2>Objetivo</h2><p>Qual resultado este projeto precisa entregar?</p><h2>Público</h2><p>Para quem é e o que essas pessoas esperam.</p><h2>Entregáveis</h2><ul class=\"checklist\"><li><br></li></ul><h2>Prazos e marcos</h2><ul><li><br></li></ul><h2>Referências</h2><ul><li><br></li></ul><h2>Observações</h2><p><br></p>";
  const { escape, fold, plural } = kit;
  const stamp = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  let filter = "open";
  let view = "gallery";
  let openId;
  let keepOpen = false;
  let detailTab = "overview";
  let briefingBody;
  let briefing;
  const normalized = new WeakSet();

  const kinds = {
    notes: { label: "Notas", many: "notas", glyph: "note", items: () => workspace.notes ?? [], title: (item) => item.title.trim() || "Sem título", detail: (item) => item.subtitle || richText.plainText(item.body) || "Nota vazia" },
    contacts: { label: "Contatos", many: "contatos", glyph: "people", items: () => workspace.contacts ?? [], title: (item) => item.name, detail: (item) => item.met?.split("\n")[0] || item.email || "Contato" },
    maps: { label: "Mapas", many: "mapas", glyph: "map", items: () => workspace.maps, title: (item) => item.title, detail: (item) => plural(item.nodes.length, "tópico", "tópicos") },
    links: { label: "Links", many: "links", glyph: "globe", items: () => workspace.links ?? [], title: (item) => item.title, detail: (item) => item.target },
  };

  function all() {
    const list = kit.projects();
    if (!normalized.has(list)) {
      normalized.add(list);
      for (const project of list) {
        if (project.status === "paused") {
          project.status = "active";
          project.paused = true;
        }
        project.milestones ??= [];
        project.goals ??= [];
        project.activity ??= [];
        project.health ??= "";
      }
    }
    return list;
  }
  const find = (id) => all().find((item) => item.id === id);

  function validate(data) {
    const list = (value, check) => value === undefined || (Array.isArray(value) && value.every((item) => item && check(item)));
    return kit.list(data.projects, (item) => typeof item.name === "string" && item.name.trim().length > 0 &&
      Object.hasOwn(statuses, item.status) && Object.hasOwn(kit.projectColors, item.color) &&
      typeof item.description === "string" && typeof item.createdAt === "number" &&
      (item.briefing === undefined || typeof item.briefing === "string") && (item.logo === undefined || kit.isImage(item.logo)) &&
      (!item.start || kit.isDate(item.start)) && (!item.end || kit.isDate(item.end)) &&
      Object.hasOwn(priorities, item.priority ?? "") && Object.hasOwn(healths, item.health ?? "") &&
      (item.clientId === undefined || typeof item.clientId === "string") &&
      list(item.milestones, (entry) => typeof entry.title === "string" && kit.isDate(entry.date) && typeof entry.done === "boolean") &&
      list(item.goals, (entry) => typeof entry.title === "string" && Number.isFinite(entry.target) && Number.isFinite(entry.current) && (!entry.due || kit.isDate(entry.due))) &&
      list(item.activity, (entry) => typeof entry.text === "string" && typeof entry.at === "number") && kit.validLinks(item));
  }

  kit.registerLinks("project", {
    keys: ["wagrupo", "instagram", "linkedin", "site", "youtube", "drive", "notion", "figma", "github"],
    find: (id) => (workspace.projects ?? []).find((item) => item.id === id),
    name: (project) => project.name,
    info: "Redes, site e ferramentas do projeto. O que não estiver na lista entra em Outros links.",
    onSave: (project) => { project.updatedAt = Date.now(); },
  });

  function log(project, text, note = "") {
    project.activity ??= [];
    project.activity.unshift({ at: Date.now(), text, ...(note ? { note } : {}) });
    project.activity.length = Math.min(project.activity.length, 200);
    project.updatedAt = Date.now();
  }

  const client = (project) => project.clientId ? (workspace.contacts ?? []).find((contact) => contact.id === project.clientId) : undefined;
  const period = (project) => project.start || project.end
    ? `${project.start ? kit.dateText(project.start) : "…"} → ${project.end ? kit.dateText(project.end) : "…"}` : "";

  function summary(project) {
    const projectTasks = tasks.all().filter((task) => task.projectId === project.id);
    const done = projectTasks.filter((task) => task.status === "done").length;
    const open = projectTasks.filter((task) => task.status !== "done" && task.status !== "idea");
    const next = open.filter((task) => task.due).sort((a, b) => a.due.localeCompare(b.due))[0];
    const counts = Object.fromEntries(Object.entries(kinds).map(([key, kind]) => [key, kind.items().filter((item) => item.projectId === project.id).length]));
    const nextMilestone = (project.milestones ?? []).filter((item) => !item.done).sort((a, b) => a.date.localeCompare(b.date))[0];
    return { tasks: projectTasks, done, open, next, counts, nextMilestone, overdue: open.filter(tasks.isLate).length, waiting: open.filter((task) => task.status === "waiting").length };
  }

  const stageTone = (status) => stages.find(([key]) => key === status)?.[2] ?? "pausa";
  const statusPill = (project) => `<span class="crm-stage project-stage" data-tone="${stageTone(project.status)}"><i></i>${statuses[project.status]}</span>${project.paused ? `<span class="project-paused">${icon("clock")}Pausado</span>` : ""}`;
  const healthPill = (project) => project.health ? `<span class="project-health" data-tone="${healths[project.health][1]}"><i></i>${healths[project.health][0]}</span>` : "";
  const percent = (info) => info.tasks.length ? Math.round(info.done / info.tasks.length * 100) : 0;
  const initial = (project) => escape(Array.from(project.name.trim())[0]?.toUpperCase() ?? "P");
  const mark = (project) => project.logo ? `<img src="${escape(project.logo)}" alt="">` : initial(project);
  const iconClass = (project) => `project-icon${project.logo ? " has-logo" : ""}`;

  /* Goal pace: compares progress with the time already gone between creation and due date. */
  function pace(goal) {
    const progress = goal.target ? Math.min(1, goal.current / goal.target) : 0;
    if (progress >= 1) return { progress, label: "Batida", tone: "ativo" };
    if (!goal.due) return { progress, label: `${Math.round(progress * 100)}%`, tone: "" };
    const start = goal.start ?? new Date(goal.createdAt ?? Date.now()).toISOString().slice(0, 10);
    const total = Math.max(1, -kit.daysUntil(start) + kit.daysUntil(goal.due));
    const elapsed = Math.min(1, Math.max(0, -kit.daysUntil(start) / total));
    if (kit.daysUntil(goal.due) < 0) return { progress, label: "Prazo vencido", tone: "risco" };
    if (progress + 0.05 >= elapsed) return { progress, label: "No ritmo", tone: "ativo" };
    if (progress + 0.2 >= elapsed) return { progress, label: "Um pouco atrás", tone: "aproximacao" };
    return { progress, label: "Atrasada", tone: "risco" };
  }
  const number = (value) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);

  /* ---------- Gallery and list ---------- */
  const visible = (item) => filter === "open" ? !["done", "archived"].includes(item.status) && !item.paused
    : filter === "paused" ? item.paused && item.status !== "archived"
    : filter === "all" ? item.status !== "archived" : item.status === filter;

  function gallery() {
    const list = all().filter(visible).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const count = (key) => all().filter((item) => {
      const saved = filter;
      filter = key;
      const result = visible(item);
      filter = saved;
      return result;
    }).length;
    const filters = [["open", "Em aberto"], ["paused", "Pausados"], ["done", "Concluídos"], ["archived", "Arquivados"], ["all", "Todos"]];
    const cards = list.map((project) => {
      const info = summary(project);
      const person = client(project);
      return `<article class="project-card" data-color="${project.color}">
        <button type="button" class="project-open" data-project="open" data-id="${escape(project.id)}" aria-label="Abrir projeto ${escape(project.name)}">
          <span class="project-card-head">
            <span class="${iconClass(project)}">${mark(project)}</span>
            <span class="project-card-title"><strong>${escape(project.name)}</strong><small>${person ? escape(person.name) : period(project) || "Sem cliente definido"}</small></span>
          </span>
          <span class="project-card-pills">${statusPill(project)}${healthPill(project)}</span>
          <span class="project-description">${escape(project.description) || "Sem descrição"}</span>
          <span class="project-progress"><span class="project-progress-top"><small>${info.tasks.length ? `${info.done} de ${info.tasks.length} tarefas` : "Sem tarefas"}</small><strong>${percent(info)}%</strong></span>
            <span class="crm-bar"><span data-fill="${percent(info)}"></span></span></span>
          <span class="project-counts">
            ${info.overdue ? `<span class="project-late">${icon("alert")}${info.overdue} atrasada${info.overdue === 1 ? "" : "s"}</span>` : ""}
            ${info.nextMilestone ? `<span title="Próximo marco">${icon("diamond")}${escape(info.nextMilestone.title)} · ${kit.dateText(info.nextMilestone.date)}</span>`
              : info.next ? `<span class="project-next">${icon("calendar")}${kit.relativeDay(info.next.due)}</span>` : project.end ? `<span class="project-next">${icon("flag")}${kit.dateText(project.end)}</span>` : ""}
          </span>
        </button>
      </article>`;
    }).join("");
    const rows = () => {
      const groups = [...stages, ["archived", "Arquivado", "pausa"]].map(([key, label, tone]) => [key, label, tone, list.filter((item) => item.status === key)]).filter(([, , , items]) => items.length);
      return `<div class="task-table-wrap"><table class="task-table project-table"><thead><tr><th>Projeto</th><th>Saúde</th><th>Progresso</th><th>Próximo marco</th><th>Entrega</th></tr></thead>
        ${groups.map(([key, label, tone, items]) => `<tbody><tr class="tk-group-row"><th colspan="5"><div class="tk-group-head"><span class="tk-group-dot" data-tone="${tone}"></span><strong>${label}</strong><small>${items.length}</small></div></th></tr>
          ${items.map((project) => {
            const info = summary(project);
            return `<tr class="tk-row project-row" data-project="open" data-id="${escape(project.id)}">
              <td><div class="tk-title-cell">${kit.projectChip(project.id)}${project.paused ? '<span class="project-paused">Pausado</span>' : ""}${client(project) ? `<small class="crm-faint">${escape(client(project).name)}</small>` : ""}</div></td>
              <td>${healthPill(project) || '<span class="crm-faint">—</span>'}</td>
              <td><span class="project-mini-bar"><span class="crm-bar"><span data-fill="${percent(info)}"></span></span><small>${percent(info)}%</small></span></td>
              <td>${info.nextMilestone ? `<span class="project-ms">${icon("diamond")}${escape(info.nextMilestone.title)} · ${kit.dateText(info.nextMilestone.date)}</span>` : '<span class="crm-faint">—</span>'}</td>
              <td>${project.end ? kit.dateText(project.end) : '<span class="crm-faint">—</span>'}</td></tr>`;
          }).join("")}</tbody>`).join("")}</table></div>`;
    };
    content.innerHTML = `<div class="project-toolbar"><div class="crm-filters" role="group" aria-label="Filtrar projetos">${filters.map(([key, label]) =>
        `<button type="button" class="crm-filter" data-project="filter" data-filter="${key}" aria-pressed="${key === filter}">${label}<span>${count(key)}</span></button>`).join("")}</div>
        <div class="tk-views" role="group" aria-label="Visualização">
          <button type="button" data-project="view" data-view="gallery" aria-pressed="${view === "gallery"}" title="Galeria" aria-label="Galeria">${icon("grid")}</button>
          <button type="button" data-project="view" data-view="list" aria-pressed="${view === "list"}" title="Lista por etapa" aria-label="Lista por etapa">${icon("list")}</button>
        </div></div>
      ${view === "list" && list.length ? rows() : `<div class="project-grid"><button type="button" class="project-new" data-project="new">${icon("plus")}<span>Novo projeto</span></button>${cards}</div>
        ${list.length ? "" : `<p class="project-empty-line">Nenhum projeto neste filtro.</p>`}`}`;
  }

  /* ---------- Detail ---------- */
  function stepper(project) {
    const current = stageIndex[project.status] ?? -1;
    return `<ol class="project-stepper" aria-label="Etapa do projeto">${stages.map(([key, label, tone], index) =>
      `<li data-state="${index < current ? "past" : index === current ? "current" : "future"}" data-tone="${tone}">
        <button type="button" data-project="stage" data-stage="${key}"${index === current ? ' aria-current="step"' : ""}><span class="project-step-dot">${index < current ? icon("check") : index + 1}</span><span>${label}</span></button></li>`).join("")}</ol>`;
  }

  function linkedPanel(project, key) {
    const kind = kinds[key];
    const items = kind.items().filter((item) => item.projectId === project.id);
    const body = items.length ? `<ul class="crm-rows">${items.map((item) => `<li class="notes-recent">
        <button type="button" class="notes-recent-open" data-project="item" data-kind="${key}" data-id="${escape(item.id)}">
          <span class="note-card-icon">${icon(key === "links" ? links.kinds[item.kind]?.[1] ?? "globe" : kind.glyph)}</span>
          <span class="notes-recent-text"><strong>${escape(kind.title(item))}</strong><small>${escape(kind.detail(item))}</small></span>
        </button>
        <button type="button" class="icon-button project-unlink" data-project="unlink" data-kind="${key}" data-id="${escape(item.id)}" title="Desvincular" aria-label="Desvincular ${escape(kind.title(item))}">${icon("close")}</button></li>`).join("")}</ul>`
      : `<p class="project-empty-line">Nenhum item vinculado.</p>`;
    const actionsHtml = `<span class="project-panel-actions">
      ${key === "links" ? `<button type="button" class="crm-link" data-project="new-link">${icon("plus")}Novo</button>` : ""}
      ${key === "notes" ? `<button type="button" class="crm-link" data-project="new-note">${icon("plus")}Nova</button>` : ""}
      <button type="button" class="crm-link" data-project="link" data-kind="${key}">Vincular</button></span>`;
    return kit.panel(kind.label, kind.glyph, body, actionsHtml);
  }

  function goalRow(goal) {
    const info = pace(goal);
    return `<li class="project-goal" data-goal="${escape(goal.id)}">
      <div class="project-goal-top"><strong>${escape(goal.title)}</strong><span class="project-health" data-tone="${info.tone}"><i></i>${info.label}</span></div>
      <span class="crm-bar"><span data-fill="${Math.round(info.progress * 100)}"></span></span>
      <div class="project-goal-foot"><small>${number(goal.current)} de ${number(goal.target)}${goal.unit ? ` ${escape(goal.unit)}` : ""}${goal.due ? ` · até ${kit.dateText(goal.due)}` : ""}</small>
        <span><button type="button" class="crm-link" data-project="goal-update" data-id="${escape(goal.id)}">Atualizar</button>
        <button type="button" class="icon-button sub-remove" data-project="goal-edit" data-id="${escape(goal.id)}" aria-label="Editar meta">${icon("edit")}</button></span></div>
    </li>`;
  }

  function milestoneRow(item) {
    const late = !item.done && item.date < kit.today();
    return `<li class="project-ms-row" data-done="${item.done}" data-kind="${item.kind ?? ""}">
      <button type="button" class="project-ms-dot" data-project="ms-toggle" data-id="${escape(item.id)}" aria-pressed="${item.done}" aria-label="${item.done ? "Reabrir" : "Concluir"} marco">${icon("diamond")}</button>
      <span class="project-ms-text"><strong>${escape(item.title)}</strong>${item.note ? `<small>${escape(item.note)}</small>` : ""}</span>
      <span class="project-ms-date"${late ? ' data-late="true"' : ""}>${kit.dateText(item.date)}</span>
      ${item.kind === "stage" ? "" : `<button type="button" class="icon-button sub-remove" data-project="ms-remove" data-id="${escape(item.id)}" aria-label="Excluir marco">${icon("close")}</button>`}
    </li>`;
  }

  function processPanel(project) {
    const runs = processes.runs(project.id);
    const body = runs.length ? `<ul class="project-runs">${runs.map((run) => {
      const done = run.items.filter((task) => task.status === "done").length;
      const fill = Math.round(done / run.items.length * 100);
      return `<li><span><strong>${escape(run.name)}</strong><small>${run.cycle ? kit.monthText(run.cycle) : "Aplicado uma vez"} · ${done} de ${run.items.length}</small></span>
        <span class="project-mini-bar"><span class="crm-bar"><span data-fill="${fill}"></span></span><small>${fill}%</small></span></li>`;
    }).join("")}</ul>` : `<p class="project-empty-line">Nenhum processo aplicado.</p>`;
    return kit.panel("Processos aplicados", "layers", body, `<button type="button" class="crm-link" data-project="apply-process">${icon("plus")}Aplicar</button>`);
  }

  function overview(project, info) {
    const person = client(project);
    const facts = [
      ["Etapa", `${statuses[project.status]}${project.paused ? " · pausado" : ""}`],
      ["Saúde", healths[project.health ?? ""][0]],
      ["Prioridade", priorities[project.priority ?? ""]],
      ["Cliente", person ? `<button type="button" class="project-fact-link" data-project="client" data-id="${escape(person.id)}">${escape(person.name)}</button>` : "—"],
      ["Início", project.start ? kit.dateText(project.start) : "—"],
      ["Entrega", project.end ? `${kit.dateText(project.end)}${project.status !== "done" && Math.abs(kit.daysUntil(project.end)) < 7 ? ` · ${kit.relativeDay(project.end).toLowerCase()}` : ""}` : "—"],
    ];
    const upcoming = info.open.filter((task) => task.due).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 6);
    const milestones = (project.milestones ?? []).filter((item) => !item.done).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
    const briefText = richText.plainText(project.briefing ?? "");
    return `<div class="crm-stats">
        ${kit.stat("Progresso", `${percent(info)}%`, info.tasks.length ? `${info.done} de ${info.tasks.length} tarefas` : "Sem tarefas", "chart", "muted", 'data-project="tab" data-tab="tasks"')}
        ${kit.stat("Abertas", info.open.length, `${info.open.filter((task) => task.status === "doing").length} em andamento · ${info.waiting} aguardando`, "checklist", "muted", 'data-project="tab" data-tab="tasks"')}
        ${kit.stat("Atrasadas", info.overdue, info.overdue ? "Passaram do prazo" : "Nenhum atraso", "alert", info.overdue ? "danger" : "muted", 'data-project="tab" data-tab="tasks"')}
        ${kit.stat("Próximo marco", info.nextMilestone ? kit.relativeDay(info.nextMilestone.date) : "—", info.nextMilestone ? escape(info.nextMilestone.title) : "Nenhum marco aberto", "diamond", info.nextMilestone && info.nextMilestone.date < kit.today() ? "danger" : "muted", 'data-project="tab" data-tab="plan"')}
      </div>
      <div class="crm-overview">
        <div class="crm-overview-main">
          ${kit.panel("Próximas entregas", "calendar", upcoming.length
            ? `<ul class="task-rows">${upcoming.map((task) => `<li class="task-row">
                <button type="button" class="task-ring" data-tone="${({ idea: "pausa", todo: "novo", doing: "aproximacao", waiting: "aguardando", review: "revisao", done: "ativo" })[task.status]}" data-status="${task.status}" data-project="task-edit" data-id="${escape(task.id)}" aria-label="Abrir tarefa"></button>
                <button type="button" class="task-title" data-project="task-edit" data-id="${escape(task.id)}">${escape(task.title)}</button>
                <span class="task-row-meta">${tasks.statusBadge(task.status)}${tasks.dueBadge(task)}</span></li>`).join("")}</ul>`
            : `<p class="project-empty-line">Nenhuma tarefa com prazo.</p>`,
            `<button type="button" class="crm-link" data-project="tab" data-tab="tasks">Tarefas${icon("arrow")}</button>`)}
          ${kit.panel("Metas", "target", (project.goals ?? []).length ? `<ul class="project-goals">${project.goals.map(goalRow).join("")}</ul>` : `<p class="project-empty-line">Defina metas mensuráveis para acompanhar o ritmo.</p>`,
            `<button type="button" class="crm-link" data-project="goal-new">${icon("plus")}Meta</button>`)}
          ${kit.panel("Briefing", "book", briefText
            ? `<div class="project-brief-preview"><p>${escape(briefText.slice(0, 420))}${briefText.length > 420 ? "…" : ""}</p></div>`
            : `<p class="project-empty-line">Ainda sem briefing. Registre objetivo, público, entregáveis e prazos.</p>`,
            `<button type="button" class="crm-link" data-project="tab" data-tab="brief">${briefText ? "Abrir" : "Escrever"}${icon("arrow")}</button>`)}
        </div>
        <div class="crm-overview-side">
          ${kit.panel("Links rápidos", "chain", kit.quickLinks("project", project), kit.quickLinksEdit("project", project))}
          ${kit.panel("Marcos", "diamond", milestones.length ? `<ul class="project-ms-list">${milestones.map(milestoneRow).join("")}</ul>` : `<p class="project-empty-line">Nenhum marco em aberto.</p>`,
            `<button type="button" class="crm-link" data-project="ms-new">${icon("plus")}Marco</button>`)}
          ${processPanel(project)}
          ${kit.panel("Detalhes", "folder", `<dl class="project-facts">${facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>`,
            `<button type="button" class="crm-link" data-project="edit" data-id="${escape(project.id)}">Editar</button>`)}
        </div>
      </div>`;
  }

  function plan(project) {
    const milestones = (project.milestones ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const today = kit.today();
    const past = milestones.filter((item) => item.date <= today || item.done);
    const future = milestones.filter((item) => !past.includes(item));
    return `<div class="crm-overview">
      <div class="crm-overview-main">
        ${kit.panel("Linha do tempo", "diamond", milestones.length ? `<ol class="project-timeline">
            ${past.map(milestoneRow).join("")}
            <li class="project-today"><span>Hoje · ${kit.dateText(today)}</span></li>
            ${future.map(milestoneRow).join("")}</ol>` : `<p class="project-empty-line">Marcos são datas importantes: entregas, aprovações, lançamentos. Mudanças de etapa também aparecem aqui.</p>`,
          `<button type="button" class="crm-link" data-project="ms-new">${icon("plus")}Novo marco</button>`)}
      </div>
      <div class="crm-overview-side">
        ${kit.panel("Metas", "target", (project.goals ?? []).length ? `<ul class="project-goals">${project.goals.map(goalRow).join("")}</ul>` : `<p class="project-empty-line">Nenhuma meta ainda.</p>`,
          `<button type="button" class="crm-link" data-project="goal-new">${icon("plus")}Nova meta</button>`)}
      </div></div>`;
  }

  function activity(project, info) {
    const events = [
      ...(project.activity ?? []).map((item) => ({ at: item.at, text: item.text, note: item.note, glyph: "history" })),
      ...info.tasks.filter((task) => task.status === "done" && task.doneAt).map((task) => ({ at: new Date(`${task.doneAt}T12:00:00`).getTime(), text: `Tarefa concluída: ${task.title}`, glyph: "check" })),
      { at: project.createdAt, text: "Projeto criado", glyph: "plus" },
    ].sort((a, b) => b.at - a.at).slice(0, 80);
    return kit.panel("Atividade", "history", `<ol class="project-activity">${events.map((item) => `<li><span class="project-activity-icon">${icon(item.glyph)}</span>
      <span><strong>${escape(item.text)}</strong>${item.note ? `<small class="project-activity-note">${escape(item.note)}</small>` : ""}</span><time>${stamp.format(new Date(item.at))}</time></li>`).join("")}</ol>`);
  }

  function taskBoard(project, info) {
    return `<div class="task-board tk-board project-board">${tasks.columns.map(([status, label, tone]) => {
      const list = info.tasks.filter((task) => task.status === status);
      return `<section class="crm-lane task-lane project-lane" data-tone="${tone}">
        <header class="crm-lane-head"><span class="crm-stage" data-tone="${tone}"><i></i>${label}</span><small>${list.length}</small></header>
        <div class="crm-lane-body">${list.map(tasks.card).join("") || '<p class="crm-lane-empty">—</p>'}</div>
        ${status === "done" ? "" : `<form class="task-quick project-quick" data-status="${status}"><span>${icon("plus")}</span><input name="title" maxlength="200" placeholder="Adicionar" aria-label="Nova tarefa em ${label}"></form>`}
      </section>`;
    }).join("")}</div>
    <p class="project-hint">Para arrastar entre etapas, filtrar ou ver no calendário, <button type="button" class="crm-link" data-project="board">abra em Tarefas${icon("arrow")}</button></p>`;
  }

  function detail(project) {
    const info = summary(project);
    $("#current-crumb").hidden = false;
    $("#current-crumb").textContent = project.name;
    const person = client(project);
    const tabsHtml = kit.tabs([["overview", "Visão geral", "grid"], ["brief", "Briefing", "book"], ["tasks", `Tarefas <small class="project-tab-count">${info.open.length}</small>`, "checklist"],
      ["plan", "Marcos e metas", "diamond"], ["links", "Vínculos", "globe"], ["activity", "Atividade", "history"]], detailTab, "data-project-tab");
    const bodies = {
      overview: () => overview(project, info),
      brief: () => `<div class="crm-panel project-brief"><div class="project-brief-tools">
          <span>${icon("book")}Briefing do projeto</span>
          ${richText.plainText(project.briefing ?? "") ? "" : `<button type="button" class="button" data-project="brief-template">${icon("sparkle")}Usar estrutura sugerida</button>`}
        </div><div id="project-brief-slot"></div></div>`,
      tasks: () => taskBoard(project, info),
      plan: () => plan(project),
      links: () => `<div class="crm-overview"><div class="crm-overview-main">${linkedPanel(project, "notes")}${linkedPanel(project, "links")}</div>
        <div class="crm-overview-side">${linkedPanel(project, "contacts")}${linkedPanel(project, "maps")}</div></div>`,
      activity: () => activity(project, info),
    };
    content.innerHTML = `<div class="project-header" data-color="${project.color}">
        <button type="button" class="note-ghost" data-project="back">${icon("back")}<span>Todos os projetos</span></button>
        <div class="project-title-row"><button type="button" class="${iconClass(project)} project-logo-button" data-project="logo" title="${project.logo ? "Trocar a logo" : "Colocar uma logo"}" aria-label="${project.logo ? "Trocar a logo" : "Colocar uma logo"}">${mark(project)}</button>
          <div><h2>${escape(project.name)}</h2><p>${[person?.name, period(project), project.description].filter(Boolean).map(escape).join(" · ") || "Sem descrição"}</p></div>
          <span class="project-card-pills">${healthPill(project)}${project.paused ? `<span class="project-paused">${icon("clock")}Pausado</span>` : ""}</span>
          <button type="button" class="icon-button" data-project="menu" aria-label="Mais ações" title="Mais ações">${icon("more")}</button>
          <button type="button" class="button" data-project="edit" data-id="${escape(project.id)}">${icon("edit")}Editar</button>
        </div>
        ${project.status === "archived" ? `<p class="tp-banner" data-tone="warning">${icon("folder")}Projeto arquivado. <button type="button" class="crm-link" data-project="unarchive">Restaurar</button></p>` : stepper(project)}
      </div>${tabsHtml}${bodies[detailTab]()}`;
    if (detailTab === "brief") mountBriefing(project);
  }

  function mountBriefing(project) {
    if (!briefingBody) {
      briefingBody = Object.assign(document.createElement("div"), { id: "project-brief-body", contentEditable: "true" });
      briefingBody.setAttribute("role", "textbox");
      briefingBody.setAttribute("aria-multiline", "true");
      briefingBody.setAttribute("aria-label", "Briefing do projeto");
      briefingBody.dataset.placeholder = "Escreva o briefing: objetivo, público, entregáveis, prazos, referências… Selecione o texto para formatar ou digite “/”.";
      briefing = richText.editor(briefingBody, { onEdit: () => {
        const current = find(openId);
        if (!current) return;
        const html = briefing.html();
        if (current.briefing === html) return;
        current.briefing = html;
        current.updatedAt = Date.now();
        changed(400);
      } });
    }
    $("#project-brief-slot").replaceWith(briefingBody);
    briefing.load(project.briefing ?? "");
  }

  function fill() {
    for (const bar of content.querySelectorAll("[data-fill]")) bar.style.width = `${bar.dataset.fill}%`;
  }

  function render() {
    const project = openId && find(openId);
    $("#projects").toggleAttribute("data-detail", Boolean(project));
    if (project) detail(project);
    else {
      openId = undefined;
      gallery();
    }
    fill();
  }

  /* ---------- Stage change (observation required) ---------- */
  function changeStage(project, stage) {
    if (project.status === stage) return;
    const back = (stageIndex[stage] ?? 0) < (stageIndex[project.status] ?? 0);
    kit.form({
      title: `Mover para ${statuses[stage]}`,
      info: "Toda mudança de etapa vira um marco na linha do tempo do projeto, com a sua observação.",
      submit: back ? "Voltar etapa" : "Avançar etapa",
      fields: `<p class="project-stage-change">${statusPill(project)}${icon("arrow")}<span class="crm-stage project-stage" data-tone="${stageTone(stage)}"><i></i>${statuses[stage]}</span></p>
        ${kit.field(back ? "Motivo do retorno" : "Observação", kit.textarea("note", "", `rows="4" maxlength="1000" required autofocus placeholder="${back ? "Por que o projeto está voltando de etapa?" : "O que foi concluído para avançar? Próximos passos…"}"`))}`,
      onSubmit: (values, form) => {
        const note = values.note.trim();
        if (!note) return kit.invalid(form, "note", back ? "Explique o motivo do retorno." : "Escreva uma observação.");
        const from = statuses[project.status];
        project.status = stage;
        if (stage === "done") project.paused = false;
        project.milestones.push({ id: kit.uid(), title: `${back ? "Voltou para" : "Etapa"}: ${statuses[stage]}`, date: kit.today(), done: true, kind: "stage", note });
        log(project, `Etapa: ${from} → ${statuses[stage]}`, note);
        kit.touch();
        refresh();
      },
    });
  }

  function milestoneForm(project) {
    kit.form({
      title: "Novo marco",
      info: "Marcos aparecem na linha do tempo do projeto, na visão geral de Trabalho e no calendário de Tarefas.",
      submit: "Adicionar marco",
      fields: `${kit.field("Nome", kit.input("title", "", 'maxlength="120" required autofocus placeholder="Ex.: Aprovação do layout"'))}
        ${kit.dateField("Data", "date", kit.addDays(kit.today(), 7))}`,
      onSubmit: (values, form) => {
        if (!values.title.trim()) return kit.invalid(form, "title", "Dê um nome ao marco.");
        if (!values.date) return kit.toast("Escolha a data."), false;
        project.milestones.push({ id: kit.uid(), title: values.title.trim(), date: values.date, done: false });
        log(project, `Marco criado: ${values.title.trim()} (${kit.dateText(values.date)})`);
        kit.touch();
        refresh();
      },
    });
  }

  function goalForm(project, goal) {
    const value = goal ?? { title: "", target: "", current: 0, unit: "", due: "" };
    kit.form({
      title: goal ? "Editar meta" : "Nova meta",
      info: "O ritmo compara quanto da meta já foi atingido com quanto do prazo já passou.",
      submit: goal ? "Salvar" : "Criar meta",
      danger: goal ? "Excluir meta" : undefined,
      onDanger: () => {
        project.goals = project.goals.filter((item) => item !== goal);
        kit.touch();
        refresh();
      },
      fields: `${kit.field("Meta", kit.input("title", value.title, 'maxlength="120" required autofocus placeholder="Ex.: Novos leads no mês"'))}
        <div class="crm-fields-pair">${kit.field("Alvo", kit.input("target", value.target, 'type="number" step="any" min="0" required'))}
        ${kit.field("Unidade", kit.input("unit", value.unit ?? "", 'maxlength="20" placeholder="leads, R$, %"'))}</div>
        <div class="crm-fields-pair">${kit.field("Valor atual", kit.input("current", value.current, 'type="number" step="any" min="0"'))}
        ${kit.dateField("Prazo", "due", value.due ?? "", { optional: true })}</div>`,
      onSubmit: (values, form) => {
        const target = Number(values.target);
        if (!values.title.trim()) return kit.invalid(form, "title", "Dê um nome à meta.");
        if (!(target > 0)) return kit.invalid(form, "target", "Informe um alvo maior que zero.");
        const fields = { title: values.title.trim(), target, unit: values.unit.trim(), current: Number(values.current) || 0, due: values.due };
        if (goal) Object.assign(goal, fields);
        else {
          project.goals.push({ id: kit.uid(), createdAt: Date.now(), start: kit.today(), updates: [], ...fields });
          log(project, `Meta criada: ${fields.title}`);
        }
        kit.touch();
        refresh();
      },
    });
  }

  function goalUpdate(project, goal) {
    kit.form({
      title: `Atualizar “${goal.title}”`,
      submit: "Registrar",
      fields: `${kit.field(`Novo valor${goal.unit ? ` (${escape(goal.unit)})` : ""}`, kit.input("current", goal.current, 'type="number" step="any" min="0" required autofocus'), `Alvo: ${number(goal.target)}`)}
        ${kit.field("Observação", kit.input("note", "", 'maxlength="200" placeholder="Opcional"'))}
        ${goal.updates?.length ? `<ol class="tp-history">${goal.updates.slice(0, 6).map((item) => `<li><span>${number(item.value)}${item.note ? ` · ${escape(item.note)}` : ""}</span><small>${stamp.format(new Date(item.at))}</small></li>`).join("")}</ol>` : ""}`,
      onSubmit: (values) => {
        const current = Number(values.current);
        if (!Number.isFinite(current)) return false;
        const reached = goal.current < goal.target && current >= goal.target;
        goal.current = current;
        goal.updates ??= [];
        goal.updates.unshift({ at: Date.now(), value: current, note: values.note.trim() });
        log(project, `Meta “${goal.title}”: ${number(current)} de ${number(goal.target)}`, values.note.trim());
        if (reached) {
          project.milestones.push({ id: kit.uid(), title: `Meta batida: ${goal.title}`, date: kit.today(), done: true, kind: "goal" });
          kit.toast(`Meta “${goal.title}” batida! Registrada como marco.`);
        }
        kit.touch();
        refresh();
      },
    });
  }

  /* ---------- Project form ---------- */
  function edit(id) {
    const project = id ? find(id) : undefined;
    const value = project ?? { name: "", description: "", color: "violet", status: "planning", priority: "", health: "", start: "", end: "", clientId: "" };
    const contacts = (workspace.contacts ?? []).slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    kit.form({
      title: project ? "Editar projeto" : "Novo projeto",
      info: project ? "Para mudar a etapa use a barra de etapas no topo do projeto: ela pede uma observação e registra o marco." : "O projeto começa em Planejamento. Depois você avança pelas etapas com a barra no topo.",
      submit: project ? "Salvar" : "Criar projeto",
      danger: project ? "Excluir projeto" : "",
      fields: `<input class="task-title-input" name="name" value="${escape(value.name)}" maxlength="80" required autofocus placeholder="Nome do projeto" aria-label="Nome do projeto">`
        + kit.field("Descrição curta", kit.textarea("description", value.description, 'rows="2" maxlength="400" placeholder="Uma frase sobre o projeto"'))
        + `<div class="task-props">
          ${project ? "" : kit.field("Etapa inicial", kit.select("status", stages.filter(([key]) => key !== "done").map(([key, label]) => [key, label]), value.status))}
          ${kit.field("Saúde", kit.select("health", Object.entries(healths).map(([key, [label]]) => [key, label]), value.health ?? ""))}
          ${kit.field("Prioridade", kit.select("priority", Object.entries(priorities), value.priority ?? ""))}
          ${kit.field("Cliente ou responsável", kit.select("clientId", [["", "Nenhum"], ...contacts.map((contact) => [contact.id, contact.name])], value.clientId ?? ""))}
          ${kit.dateField("Início", "start", value.start ?? "", { optional: true })}
          ${kit.dateField("Entrega", "end", value.end ?? "", { optional: true })}
        </div>`
        + (project ? `<label class="kit-check"><input type="checkbox" name="paused"${project.paused ? " checked" : ""}><span>Projeto pausado</span></label>` : "")
        + kit.imageField("logo", value.logo ?? "", { label: "Logo", hint: "Aparece no projeto e nas etiquetas. PNG, JPG, WEBP ou SVG." })
        + `<fieldset class="kit-swatches"><legend>Cor</legend>${Object.entries(kit.projectColors).map(([key, label]) =>
          `<label data-color="${key}" title="${label}"><input type="radio" name="color" value="${key}"${key === value.color ? " checked" : ""}><i></i><span class="sr-only">${label}</span></label>`).join("")}</fieldset>`,
      onSubmit: (values, form) => {
        if (!values.name.trim()) return kit.invalid(form, "name", "Dê um nome ao projeto.");
        const logo = kit.isImage(values.logo) ? values.logo : undefined;
        if (values.start && values.end && values.start > values.end) {
          kit.toast("O início não pode ser depois da entrega.");
          return false;
        }
        const fields = {
          name: values.name.trim(), description: values.description.trim(), color: values.color || "violet",
          priority: values.priority, health: values.health, start: values.start, end: values.end, clientId: values.clientId, updatedAt: Date.now(),
        };
        if (logo) fields.logo = logo;
        else if (project) delete project.logo;
        if (project) {
          if (project.health !== fields.health) log(project, `Saúde: ${healths[fields.health][0]}`);
          if (Boolean(project.paused) !== values.paused) log(project, values.paused ? "Projeto pausado" : "Projeto retomado");
          Object.assign(project, fields, { paused: values.paused });
        } else {
          const created = { id: kit.uid(), createdAt: Date.now(), briefing: "", status: values.status, paused: false, milestones: [], goals: [], activity: [], ...fields };
          all().push(created);
          openId = created.id;
          detailTab = "brief";
        }
        if (fields.clientId) {
          const contact = (workspace.contacts ?? []).find((item) => item.id === fields.clientId);
          if (contact && !contact.projectId) contact.projectId = project?.id ?? openId;
        }
        kit.touch();
        refresh();
      },
      onDanger: () => {
        for (const kind of Object.values(kinds)) for (const item of kind.items()) if (item.projectId === project.id) delete item.projectId;
        for (const task of tasks.all()) if (task.projectId === project.id) task.projectId = "";
        workspace.projects = all().filter((item) => item !== project);
        normalized.add(workspace.projects);
        openId = undefined;
        kit.touch();
        refresh();
      },
    });
  }

  function pick(key) {
    const kind = kinds[key];
    const project = find(openId);
    const items = kind.items();
    if (!items.length) {
      kit.toast(`Você ainda não tem ${kind.many}.`);
      return;
    }
    const rows = items.map((item) => {
      const other = item.projectId && item.projectId !== project.id ? kit.project(item.projectId) : undefined;
      return `<label class="kit-pick" data-text="${escape(fold(`${kind.title(item)} ${kind.detail(item)}`))}">
        <input type="checkbox" name="pick-${escape(item.id)}"${item.projectId === project.id ? " checked" : ""}>
        <span><strong>${escape(kind.title(item))}</strong><small>${escape(kind.detail(item))}${other ? ` · em ${escape(other.name)}` : ""}</small></span></label>`;
    }).join("");
    kit.form({
      title: `Vincular ${kind.label.toLowerCase()}`,
      info: `Marque o que pertence a ${project.name}.`,
      submit: "Salvar vínculos",
      fields: `<label class="crm-search kit-pick-search"><span>${icon("search")}</span><input type="search" data-pick-search placeholder="Filtrar…" aria-label="Filtrar"></label><div class="kit-pick-list">${rows}</div>`,
      onOpen: (dialog) => dialog.querySelector("[data-pick-search]").addEventListener("input", (event) => {
        const term = fold(event.target.value.trim());
        for (const row of dialog.querySelectorAll(".kit-pick")) row.hidden = Boolean(term) && !row.dataset.text.includes(term);
      }),
      onSubmit: (values) => {
        for (const item of items) {
          const checked = values[`pick-${item.id}`] === true;
          if (checked) item.projectId = project.id;
          else if (item.projectId === project.id) delete item.projectId;
        }
        project.updatedAt = Date.now();
        kit.touch();
        refresh();
      },
    });
  }

  function openItem(key, id) {
    if (key === "notes") {
      actions.notes();
      notes.openById(id);
    }
    if (key === "contacts") crm.openContact(id);
    if (key === "maps") {
      const map = workspace.maps.find((item) => item.id === id);
      if (map) openMap(map);
    }
    if (key === "links") void links.launch(id);
  }

  function refresh() {
    if (kit.isOpen("projects")) render();
  }

  content.addEventListener("click", (event) => {
    const tabButton = event.target.closest("[data-project-tab]");
    if (tabButton) {
      detailTab = tabButton.dataset.projectTab;
      return render();
    }
    const button = event.target.closest("[data-project]");
    if (!button) {
      const cardElement = event.target.closest(".task-card");
      if (cardElement) tasks.open(cardElement.dataset.id);
      return;
    }
    const { project: action, id, kind } = button.dataset;
    const project = find(openId);
    if (action === "logo" && project) {
      kit.pickImage({ fit: "contain" }).then((logo) => {
        if (!logo) return;
        project.logo = logo;
        project.updatedAt = Date.now();
        kit.touch();
        refresh();
      });
      return;
    }
    const goal = project?.goals?.find((item) => item.id === id);
    const handlers = {
      filter: () => { filter = button.dataset.filter; render(); },
      view: () => { view = button.dataset.view; render(); },
      open: () => { openId = id; detailTab = "overview"; render(); window.scrollTo(0, 0); },
      back: () => { openId = undefined; render(); },
      new: () => edit(),
      edit: () => edit(id),
      stage: () => changeStage(project, button.dataset.stage),
      menu: () => kit.menu(button, [
        { label: project.paused ? "Retomar projeto" : "Pausar projeto", icon: "clock", action: () => { project.paused = !project.paused; log(project, project.paused ? "Projeto pausado" : "Projeto retomado"); kit.touch(); render(); } },
        { label: "Aplicar processo", icon: "layers", action: () => applyMenu(button) },
        { label: "Novo marco", icon: "diamond", action: () => milestoneForm(project) },
        { label: "Nova meta", icon: "target", action: () => goalForm(project) },
        "-",
        { label: project.status === "archived" ? "Restaurar" : "Arquivar projeto", icon: "folder", action: () => {
          if (project.status === "archived") project.status = project.archivedFrom ?? "active";
          else {
            project.archivedFrom = project.status;
            project.status = "archived";
          }
          log(project, project.status === "archived" ? "Projeto arquivado" : "Projeto restaurado");
          kit.touch();
          render();
        } },
      ], { align: "end" }),
      unarchive: () => {
        project.status = project.archivedFrom ?? "active";
        log(project, "Projeto restaurado");
        kit.touch();
        render();
      },
      tab: () => { detailTab = button.dataset.tab; render(); },
      board: () => tasks.showProject(openId),
      "task-edit": () => tasks.open(id),
      link: () => pick(kind),
      item: () => openItem(kind, id),
      client: () => crm.openContact(id),
      "new-link": () => links.edit(undefined, { projectId: openId }),
      "new-note": () => {
        const note = notes.createNoteRecord("");
        note.projectId = openId;
        actions.notes();
        notes.openById(note.id);
      },
      "brief-template": () => {
        project.briefing = briefingTemplate;
        changed();
        render();
      },
      unlink: () => {
        const item = kinds[kind].items().find((entry) => entry.id === id);
        if (item) delete item.projectId;
        kit.touch();
        render();
      },
      "ms-new": () => milestoneForm(project),
      "ms-toggle": () => {
        const item = project.milestones.find((entry) => entry.id === id);
        item.done = !item.done;
        if (item.done) log(project, `Marco concluído: ${item.title}`);
        kit.touch();
        render();
      },
      "ms-remove": () => {
        const index = project.milestones.findIndex((entry) => entry.id === id);
        const [removed] = project.milestones.splice(index, 1);
        kit.touch();
        render();
        kit.toast("Marco excluído.", ["Desfazer", () => { project.milestones.splice(index, 0, removed); kit.touch(); render(); }]);
      },
      "goal-new": () => goalForm(project),
      "goal-edit": () => goalForm(project, goal),
      "goal-update": () => goalUpdate(project, goal),
      "apply-process": () => applyMenu(button),
    };
    handlers[action]?.();
  });

  function applyMenu(anchor) {
    const list = processes.all();
    if (!list.length) return actions.processes();
    kit.menu(anchor, [{ heading: "Aplicar processo" }, ...list.map((item) => ({
      label: item.name, hint: item.cadence === "monthly" ? "mensal" : `${item.steps.length} etapas`, icon: "layers",
      action: () => processes.applyForm(item, openId),
    })), "-", { label: "Gerenciar processos", icon: "edit", action: () => actions.processes() }], { align: "end" });
  }

  content.addEventListener("submit", (event) => {
    const form = event.target.closest(".project-quick");
    if (!form) return;
    event.preventDefault();
    const input = form.elements.title;
    if (!input.value.trim()) return;
    tasks.create({ title: input.value, projectId: openId, status: form.dataset.status || "todo" });
    render();
    content.querySelector(`.project-quick[data-status="${form.dataset.status}"] input`)?.focus();
  });
  for (const dialog of [drawer, $("#crm-dialog")]) dialog.addEventListener("close", () => {
    if (kit.isOpen("projects") && detailTab !== "brief") render();
  });

  const module = {
    validate,
    show: () => {
      all();
      if (!keepOpen) openId = undefined;
      keepOpen = false;
      render();
    },
    command: (verb) => { if (verb === "new") edit(); },
    open: (id) => {
      openId = id;
      keepOpen = true;
      detailTab = "overview";
      kit.open("projects");
    },
    all, statuses, stages, healths, summary, pace,
    current: () => openId,
  };
  kit.register("projects", "Projetos", module);
  return module;
})();
