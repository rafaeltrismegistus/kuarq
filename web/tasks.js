"use strict";

const tasks = (() => {
  const content = $("#tasks-content");
  const drawer = $("#drawer");
  const columns = [
    ["idea", "Brain", "pausa"], ["todo", "A fazer", "novo"], ["doing", "Em andamento", "aproximacao"],
    ["waiting", "Aguardando retorno", "aguardando"], ["review", "Revisão", "revisao"], ["done", "Concluída", "ativo"],
  ];
  const statusNames = Object.fromEntries(columns.map(([key, label]) => [key, label]));
  const statusTone = Object.fromEntries(columns.map(([key, , tone]) => [key, tone]));
  const priorities = { "": "Sem prioridade", low: "Baixa", medium: "Normal", high: "Alta", urgent: "Urgente" };
  const priorityRank = { urgent: 0, high: 1, medium: 2, low: 3, "": 4 };
  const periods = [["any", "Qualquer data"], ["late", "Atrasadas"], ["today", "Hoje"], ["week", "Próximos 7 dias"], ["month", "Este mês"], ["none", "Sem data"]];
  const groupings = [["status", "Etapa"], ["project", "Projeto"], ["priority", "Prioridade"], ["due", "Entrega"]];
  const meetingTemplate = "Participantes:\n\nPauta:\n\nDecisões:\n\nPróximos passos:";
  const { escape, fold } = kit;
  const weekdays = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" });
  const stamp = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  let mode = "list";
  let groupBy = "status";
  let period = "any";
  let projectFilter = "";
  let priorityFilter = "";
  let quick = "";
  let query = "";
  let showDone = false;
  let showSubtasks = true;
  let calendarMonth = kit.today().slice(0, 7);
  let calendarDay = kit.today();
  const collapsed = new Set();
  const expanded = new Set();
  const selected = new Set();
  let boundDrag = false;
  let panelId;
  let panelTab = "subtasks";
  let pageId;
  let keepPage = false;
  const normalized = new WeakSet();

  /* ---------- Data ---------- */
  function all() {
    workspace.tasks ??= [];
    if (!normalized.has(workspace.tasks)) {
      normalized.add(workspace.tasks);
      let next = workspace.taskSeq ?? 0;
      for (const task of [...workspace.tasks].sort((a, b) => a.createdAt - b.createdAt)) {
        if (Array.isArray(task.subtasks) && !task.checklist) task.checklist = task.subtasks;
        delete task.subtasks;
        if (typeof task.checklist === "string") {
          try { task.checklist = JSON.parse(task.checklist); } catch { task.checklist = []; }
        }
        if (!Array.isArray(task.checklist)) task.checklist = [];
        task.comments ??= [];
        task.history ??= [];
        task.linkIds ??= [];
        task.noteIds ??= [];
        task.mapIds ??= [];
        task.tags ??= [];
        task.type ??= "";
        if (!task.code) task.code = ++next;
        next = Math.max(next, task.code);
      }
      workspace.taskSeq = next;
    }
    return workspace.tasks;
  }
  const find = (id) => all().find((task) => task.id === id);
  const childrenOf = (id) => all().filter((task) => task.parentId === id);
  const isTime = (value) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const code = (task) => `TK-${String(task.code ?? 0).padStart(4, "0")}`;
  const allTags = () => [...new Set(all().flatMap((task) => task.tags ?? []))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const isLate = (task) => task.status !== "done" && task.status !== "idea" && task.due && task.due < kit.today();
  const daysWaiting = (task) => task.status === "waiting" && task.waitingSince ? -kit.daysUntil(task.waitingSince) : 0;

  function validate(data) {
    const list = (value, check) => value === undefined || (Array.isArray(value) && value.every(check));
    return kit.list(data.tasks, (task) => typeof task.title === "string" && task.title.trim().length > 0 &&
      Object.hasOwn(statusNames, task.status) && Object.hasOwn(priorities, task.priority ?? "") &&
      (!task.due || kit.isDate(task.due)) && (!task.start || kit.isDate(task.start)) && (!task.doneAt || kit.isDate(task.doneAt)) &&
      (!task.waitingSince || kit.isDate(task.waitingSince)) &&
      (task.details === undefined || typeof task.details === "string") && ["", "note", undefined].includes(task.type) &&
      (task.projectId === undefined || typeof task.projectId === "string") && (task.parentId === undefined || typeof task.parentId === "string") &&
      typeof task.createdAt === "number" && (task.code === undefined || Number.isInteger(task.code)) &&
      list(task.tags, (tag) => typeof tag === "string") &&
      list(task.subtasks, (item) => item && typeof item.title === "string" && typeof item.done === "boolean") &&
      (typeof task.checklist === "string" || list(task.checklist, (item) => item && typeof item.title === "string" && typeof item.done === "boolean")) &&
      (!task.time || isTime(task.time)) && (!task.endTime || isTime(task.endTime)) &&
      list(task.comments, (item) => item && typeof item.text === "string" && typeof item.at === "number") &&
      list(task.history, (item) => item && typeof item.text === "string" && typeof item.at === "number") &&
      list(task.linkIds, (id) => typeof id === "string") && list(task.noteIds, (id) => typeof id === "string") &&
      list(task.mapIds, (id) => typeof id === "string") && (task.order === undefined || Number.isFinite(task.order)));
  }

  function log(task, text) {
    task.history ??= [];
    task.history.unshift({ at: Date.now(), text });
    task.history.length = Math.min(task.history.length, 60);
  }

  function setStatus(task, status, { silent = false } = {}) {
    if (!task || task.status === status || !Object.hasOwn(statusNames, status)) return;
    const from = task.status;
    task.status = status;
    task.doneAt = status === "done" ? kit.today() : "";
    task.waitingSince = status === "waiting" ? kit.today() : "";
    if (status === "idea") task.start = "";
    task.updatedAt = Date.now();
    if (!silent) log(task, `Etapa: ${statusNames[from]} → ${statusNames[status]}`);
  }

  function create(values = {}) {
    all();
    const task = {
      id: kit.uid(), code: (workspace.taskSeq = (workspace.taskSeq ?? 0) + 1), title: values.title.trim(), type: values.type ?? "",
      details: values.details ?? "", status: values.status ?? "todo", priority: values.priority ?? "", start: values.start ?? "",
      due: values.due ?? "", time: values.time ?? "", endTime: values.endTime ?? "", projectId: values.projectId ?? "", tags: values.tags ?? [], checklist: values.checklist ?? [],
      linkIds: values.linkIds ?? [], noteIds: values.noteIds ?? [], mapIds: values.mapIds ?? [], comments: [], history: [], createdAt: Date.now(), updatedAt: Date.now(), order: Date.now(),
      doneAt: values.status === "done" ? kit.today() : "", waitingSince: values.status === "waiting" ? kit.today() : "",
    };
    if (values.descriptionHtml) task.descriptionHtml = values.descriptionHtml;
    if (values.parentId) task.parentId = values.parentId;
    if (values.origin) task.origin = values.origin;
    log(task, values.origin ? "Criada pelo processo" : "Tarefa criada");
    all().push(task);
    kit.touch();
    return task;
  }

  function remove(task) {
    const removed = [task, ...childrenOf(task.id)];
    const snapshot = removed.map((item) => ({ item, index: all().indexOf(item) }));
    workspace.tasks = all().filter((item) => !removed.includes(item));
    normalized.add(workspace.tasks);
    for (const item of removed) selected.delete(item.id);
    kit.touch();
    refresh();
    kit.toast(`${removed.length > 1 ? `${removed.length} tarefas excluídas` : "Tarefa excluída"}.`, ["Desfazer", () => {
      for (const { item, index } of snapshot.sort((a, b) => a.index - b.index)) workspace.tasks.splice(index, 0, item);
      kit.touch();
      refresh();
    }]);
  }

  function duplicate(task) {
    const copy = create({ ...task, title: `${task.title} (cópia)`, status: task.status === "done" ? "todo" : task.status,
      checklist: (task.checklist ?? []).map((item) => ({ ...item, id: kit.uid(), done: false })), tags: [...(task.tags ?? [])], linkIds: [...(task.linkIds ?? [])],
      noteIds: [...(task.noteIds ?? [])], mapIds: [...(task.mapIds ?? [])] });
    refresh();
    return copy;
  }

  function toggle(id) {
    const task = find(id);
    if (!task) return;
    setStatus(task, task.status === "done" ? "todo" : "done");
    kit.touch();
    refresh();
  }

  /* ---------- Small pieces ---------- */
  const timeRange = (task) => task.time ? `${task.time}${task.endTime ? `–${task.endTime}` : ""}` : "";
  function dueText(task) {
    if (!task.due) return "";
    const days = kit.daysUntil(task.due);
    const day = days === 0 ? "Hoje" : days === 1 ? "Amanhã" : days === -1 ? "Ontem"
      : days > 1 && days < 7 ? weekdays.format(new Date(`${task.due}T00:00:00Z`)).replace(/^./, (letter) => letter.toUpperCase()).replace("-feira", "")
      : kit.dateText(task.due);
    return task.time ? `${day} · ${timeRange(task)}` : day;
  }
  /* Time choices every 15 minutes, shown in the app's own dropdown. */
  const timeOptions = (empty = "Sem horário") => [["", empty], ...Array.from({ length: 96 }, (_, index) => {
    const value = `${String(Math.floor(index / 4)).padStart(2, "0")}:${String(index % 4 * 15).padStart(2, "0")}`;
    return [value, value];
  })];
  const addMinutes = (time, minutes) => {
    const total = Math.min(23 * 60 + 45, Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) + minutes);
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };
  function nextSlot() {
    const now = new Date();
    return addMinutes(`${String(now.getHours()).padStart(2, "0")}:00`, 60);
  }
  function dueBadge(task) {
    if (!task.due) return "";
    const days = kit.daysUntil(task.due);
    const tone = task.status === "done" ? "" : days < 0 ? "late" : days === 0 ? "today" : days <= 2 ? "soon" : "";
    return `<span class="task-due" data-tone="${tone}">${icon("calendar")}${dueText(task)}</span>`;
  }
  const priorityBadge = (task) => task.priority
    ? `<span class="task-priority" data-priority="${task.priority}">${icon("flag")}${priorities[task.priority]}</span>` : "";
  const statusBadge = (status) => `<span class="task-stage-pill" data-tone="${statusTone[status]}">${statusNames[status]}</span>`;
  const ring = (task) => `<button type="button" class="task-ring" data-tone="${statusTone[task.status]}" data-status="${task.status}" data-task="stage" data-id="${escape(task.id)}" aria-label="Etapa: ${statusNames[task.status]}. Mudar etapa" title="${statusNames[task.status]}">${task.status === "done" ? icon("check") : ""}</button>`;
  function counters(task) {
    const kids = childrenOf(task.id);
    const checklist = task.checklist ?? [];
    return [
      task.type === "note" ? `<span class="task-mark">${icon("note")}Anotação</span>` : "",
      kids.length ? `<span class="task-count" title="Subtarefas">${icon("layers")}${kids.filter((item) => item.status === "done").length}/${kids.length}</span>` : "",
      checklist.length ? `<span class="task-count" title="Checklist">${icon("checklist")}${checklist.filter((item) => item.done).length}/${checklist.length}</span>` : "",
      task.comments?.length ? `<span class="task-count" title="Comentários">${icon("comment")}${task.comments.length}</span>` : "",
      task.linkIds?.length ? `<span class="task-count" title="Links">${icon("globe")}${task.linkIds.length}</span>` : "",
      attachedDocs(task).length ? `<span class="task-count" title="Notas e mapas vinculados">${icon("note")}${attachedDocs(task).length}</span>` : "",
    ].join("");
  }

  /* ---------- Filtering and grouping ---------- */
  function matchesPeriod(task) {
    const today = kit.today();
    if (period === "any") return true;
    if (period === "none") return !task.due;
    if (!task.due) return false;
    if (period === "late") return isLate(task);
    if (period === "today") return task.due === today;
    if (period === "week") return task.due >= today && task.due <= kit.addDays(today, 7);
    return task.due.slice(0, 7) === today.slice(0, 7);
  }
  function filtered({ ignoreDone = false } = {}) {
    const terms = fold(query).split(/\s+/).filter(Boolean);
    return all().filter((task) => (!projectFilter || task.projectId === projectFilter) && (!priorityFilter || (task.priority ?? "") === priorityFilter) &&
      matchesPeriod(task) && (quick !== "late" || isLate(task)) && (quick !== "waiting" || task.status === "waiting") &&
      (ignoreDone || showDone || task.status !== "done" || mode === "board") &&
      terms.every((term) => fold(`${code(task)} ${task.title} ${task.details ?? ""} ${(task.tags ?? []).join(" ")} ${kit.project(task.projectId)?.name ?? ""}`).includes(term)));
  }
  const byOrder = (a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt);
  const byDue = (a, b) => (a.due || "9999").localeCompare(b.due || "9999") || (a.time || "99").localeCompare(b.time || "99") || priorityRank[a.priority ?? ""] - priorityRank[b.priority ?? ""] || byOrder(a, b);

  function groups(items) {
    const today = kit.today();
    if (groupBy === "project") {
      const keys = [...new Set(items.map((task) => task.projectId || ""))];
      return keys.map((key) => [key || "none", kit.project(key)?.name ?? "Sem projeto", kit.project(key)?.color ?? "", items.filter((task) => (task.projectId || "") === key)])
        .sort((a, b) => (a[0] === "none") - (b[0] === "none") || a[1].localeCompare(b[1], "pt-BR"));
    }
    if (groupBy === "priority") {
      return ["urgent", "high", "medium", "low", ""].map((key) => [key || "none", priorities[key], "", items.filter((task) => (task.priority ?? "") === key)]);
    }
    if (groupBy === "due") {
      return [
        ["late", "Atrasadas", "", items.filter((task) => isLate(task))],
        ["today", "Hoje", "", items.filter((task) => task.due === today && task.status !== "done")],
        ["week", "Próximos 7 dias", "", items.filter((task) => task.due > today && kit.daysUntil(task.due) <= 7 && task.status !== "done")],
        ["later", "Mais adiante", "", items.filter((task) => task.due && kit.daysUntil(task.due) > 7 && task.status !== "done")],
        ["none", "Sem data", "", items.filter((task) => !task.due && task.status !== "done")],
        ["done", "Concluídas", "", items.filter((task) => task.status === "done")],
      ];
    }
    return columns.map(([key, label]) => [key, label, statusTone[key], items.filter((task) => task.status === key)]);
  }

  /* ---------- Toolbar ---------- */
  function toolbar() {
    const base = all().filter((task) => !task.parentId || showSubtasks);
    const late = base.filter(isLate).length;
    const waiting = base.filter((task) => task.status === "waiting").length;
    const projectOptions = kit.projectOptions(projectFilter, "Todos");
    return `<div class="tk-bar">
      <div class="tk-bar-row">
        <label class="tk-field">${icon("calendar")}<select data-filter="period" aria-label="Entrega">${periods.map(([key, label]) => `<option value="${key}"${key === period ? " selected" : ""}>${label}</option>`).join("")}</select></label>
        <label class="crm-search tk-search"><span>${icon("search")}</span><input type="search" data-filter="query" value="${escape(query)}" placeholder="Buscar tarefa ou código" aria-label="Buscar tarefa"></label>
        <span class="tk-spacer"></span>
        ${mode === "list" ? `<label class="tk-field tk-labeled"><small>Agrupar por</small><select data-filter="group" aria-label="Agrupar por">${groupings.map(([key, label]) => `<option value="${key}"${key === groupBy ? " selected" : ""}>${label}</option>`).join("")}</select></label>` : ""}
        ${mode === "calendar" ? "" : `<button type="button" class="tk-toggle" data-task="show-done" aria-pressed="${showDone}">${icon("check")}Concluídas</button>`}
        <div class="tk-views" role="group" aria-label="Visualização">
          ${[["list", "list", "Lista"], ["board", "board", "Kanban"], ["calendar", "calendar", "Calendário"]].map(([key, glyph, label]) =>
            `<button type="button" data-task="mode" data-mode="${key}" aria-pressed="${mode === key}" title="${label}" aria-label="${label}">${icon(glyph)}</button>`).join("")}
        </div>
      </div>
      <div class="tk-bar-row">
        <label class="tk-field tk-labeled">${icon("folder")}<small>Projeto:</small><select data-filter="project" aria-label="Projeto">${projectOptions.map(([value, label]) => `<option value="${escape(value)}"${value === projectFilter ? " selected" : ""}>${escape(label)}</option>`).join("")}</select></label>
        <label class="tk-field tk-labeled">${icon("flag")}<small>Prioridade:</small><select data-filter="priority" aria-label="Prioridade"><option value="">Todas</option>${["urgent", "high", "medium", "low"].map((key) => `<option value="${key}"${key === priorityFilter ? " selected" : ""}>${priorities[key]}</option>`).join("")}</select></label>
        <button type="button" class="tk-chip" data-task="quick" data-quick="late" aria-pressed="${quick === "late"}">${icon("alert")}Atrasadas<span data-tone="${late ? "danger" : ""}">${late}</span></button>
        <button type="button" class="tk-chip" data-task="quick" data-quick="waiting" aria-pressed="${quick === "waiting"}">${icon("clock")}Aguardando retorno<span>${waiting}</span></button>
        ${mode !== "calendar" ? `<button type="button" class="tk-toggle" data-task="subtasks" aria-pressed="${showSubtasks}">${icon("layers")}Subtarefas</button>` : ""}
        ${projectFilter || priorityFilter || quick || period !== "any" || query ? `<button type="button" class="crm-link" data-task="clear">Limpar filtros</button>` : ""}
      </div>
    </div>`;
  }

  /* ---------- List ---------- */
  function row(task, depth = 0) {
    const kids = showSubtasks ? childrenOf(task.id).filter((item) => showDone || item.status !== "done") : [];
    const open = expanded.has(task.id);
    return `<tr class="tk-row" data-id="${escape(task.id)}" data-status="${task.status}" data-depth="${depth}"${selected.has(task.id) ? " data-selected" : ""}>
      <td class="tk-cell-select"><input type="checkbox" data-task="select" data-id="${escape(task.id)}" aria-label="Selecionar ${escape(task.title)}"${selected.has(task.id) ? " checked" : ""}></td>
      <td><div class="tk-title-cell">
        ${kids.length ? `<button type="button" class="tk-expand" data-task="expand" data-id="${escape(task.id)}" aria-expanded="${open}" aria-label="Subtarefas">${icon("chevron")}</button>` : '<span class="tk-expand-space"></span>'}
        ${ring(task)}
        <button type="button" class="tk-title" data-task="open" data-id="${escape(task.id)}">${escape(task.title)}</button>
        ${counters(task)}
        <span class="tk-quick"><button type="button" data-task="page" data-id="${escape(task.id)}" title="Abrir página da tarefa">${icon("open")}Abrir</button>${task.status !== "done" ? `<button type="button" data-task="complete" data-id="${escape(task.id)}" title="Concluir">${icon("check")}Concluir</button>` : ""}</span>
      </div></td>
      <td>${kit.projectChip(task.projectId) || '<span class="crm-faint">—</span>'}</td>
      <td>${dueBadge(task) || (task.status === "idea" ? "" : '<span class="crm-faint">—</span>')}</td>
      <td>${priorityBadge(task) || '<span class="crm-faint">—</span>'}</td>
      <td>${statusBadge(task.status)}</td>
    </tr>${open ? kids.sort(byDue).map((child) => row(child, depth + 1)).join("") : ""}`;
  }

  function listView(items) {
    const visible = items.filter((task) => !task.parentId || !showSubtasks || !find(task.parentId) || !items.includes(find(task.parentId)));
    const head = `<thead><tr><th class="tk-cell-select"></th><th>Tarefa</th><th>Projeto</th><th>Entrega</th><th>Prioridade</th><th>Etapa</th></tr></thead>`;
    const blocks = groups(visible).map(([key, label, tone, list]) => {
      if (!list.length && groupBy !== "status") return "";
      if (key === "done" && !showDone) {
        return list.length ? `<tbody class="tk-group"><tr class="tk-group-row"><th colspan="6"><span class="tk-hidden-done">${icon("check")}${list.length} concluídas ocultas · <button type="button" class="crm-link" data-task="show-done">mostrar</button></span></th></tr></tbody>` : "";
      }
      const closed = collapsed.has(key);
      return `<tbody class="tk-group" data-group="${key}">
        <tr class="tk-group-row"><th colspan="6"><div class="tk-group-head">
          <button type="button" class="crm-collapse" data-task="collapse" data-group="${key}" aria-expanded="${!closed}" aria-label="${closed ? "Expandir" : "Recolher"} ${label}">${icon("chevron")}</button>
          ${groupBy === "status" ? `<span class="tk-group-dot" data-tone="${tone}"></span>` : groupBy === "project" && tone ? `<span class="kit-project" data-color="${tone}"><i></i>${escape(label)}</span>` : ""}
          ${groupBy === "project" && tone ? "" : `<strong>${escape(label)}</strong>`}<small>${list.length}</small>
          ${groupBy === "status" && key !== "done" ? `<button type="button" class="icon-button tk-group-add" data-task="add" data-group="${key}" aria-label="Adicionar em ${label}" title="Adicionar">${icon("plus")}</button>` : ""}
        </div></th></tr>
        ${closed ? "" : `${list.sort(groupBy === "status" ? byOrder : byDue).map((task) => row(task)).join("")}
          ${groupBy === "status" && key !== "done" ? `<tr class="tk-add-row"><td></td><td colspan="5"><form class="task-quick tk-add" data-status="${key}"><span>${icon("plus")}</span><input name="title" maxlength="200" placeholder="Adicionar" aria-label="Adicionar tarefa em ${label}"></form></td></tr>` : ""}`}
      </tbody>`;
    }).join("");
    return `<div class="task-table-wrap tk-table-wrap"><table class="task-table tk-table">${head}${blocks}</table></div>`;
  }

  /* ---------- Kanban ---------- */
  function card(task) {
    const meta = `${kit.projectChip(task.projectId)}${dueBadge(task)}${priorityBadge(task)}${counters(task)}`;
    return `<article class="task-card" data-drag="${escape(task.id)}" data-id="${escape(task.id)}" data-status="${task.status}" tabindex="0" aria-label="${escape(task.title)}">
      <div class="task-card-top">${ring(task)}<span class="task-title">${escape(task.title)}</span></div>
      ${task.parentId && find(task.parentId) ? `<small class="task-parent">${icon("layers")}${escape(find(task.parentId).title)}</small>` : ""}
      ${meta.trim() ? `<div class="task-meta">${meta}</div>` : ""}
      <small class="task-code">${code(task)}</small>
    </article>`;
  }

  function board(items) {
    const visible = items.filter((task) => showSubtasks || !task.parentId);
    return `<div class="task-board tk-board">${columns.map(([status, label, tone]) => {
      const list = visible.filter((task) => task.status === status).sort(status === "done" ? (a, b) => (b.doneAt || "").localeCompare(a.doneAt || "") : byOrder);
      const hideDone = status === "done" && !showDone;
      return `<section class="crm-lane task-lane" data-drop="${status}" data-tone="${tone}" aria-label="${label}">
        <header class="crm-lane-head"><span class="crm-stage" data-tone="${tone}"><i></i>${label}</span><small>${list.length}</small></header>
        <div class="crm-lane-body">${hideDone ? (list.length ? `<button type="button" class="tk-hidden-done tk-lane-done" data-task="show-done">${icon("check")}${list.length} concluídas ocultas · mostrar</button>` : '<p class="crm-lane-empty">Nada concluído ainda</p>')
          : list.length ? list.map(card).join("") : `<p class="crm-lane-empty">${status === "idea" ? "Ideias e anotações ainda sem data. Viram trabalho ao ir para A fazer." : "Arraste tarefas para cá"}</p>`}</div>
        ${status === "done" ? "" : `<form class="task-quick tk-add" data-status="${status}"><span>${icon("plus")}</span><input name="title" maxlength="200" placeholder="Adicionar" aria-label="Adicionar em ${label}"></form>`}
      </section>`;
    }).join("")}</div>`;
  }

  /* ---------- Calendar ---------- */
  function milestones() {
    return kit.projects().flatMap((project) => (project.milestones ?? []).map((item) => ({ ...item, project })));
  }
  function calendar(items) {
    const first = new Date(`${calendarMonth}-01T00:00:00Z`);
    const start = kit.addDays(`${calendarMonth}-01`, -first.getUTCDay());
    const today = kit.today();
    const marks = milestones();
    const cells = Array.from({ length: 42 }, (_, index) => kit.addDays(start, index));
    const dayItems = (date) => items.filter((task) => task.due === date && (showSubtasks || !task.parentId)).sort(byDue);
    const selectedTasks = dayItems(calendarDay);
    const selectedMarks = marks.filter((item) => item.date === calendarDay);
    return `<div class="tk-calendar">
      <div class="crm-panel tk-month">
        <header class="tk-month-head">
          <button type="button" class="crm-picker-nav" data-task="cal-month" data-step="-1" aria-label="Mês anterior">${icon("chevron-left")}</button>
          <strong>${kit.monthText(calendarMonth).replace(/^./, (letter) => letter.toUpperCase())}</strong>
          <button type="button" class="crm-picker-nav" data-task="cal-month" data-step="1" aria-label="Próximo mês">${icon("chevron-right")}</button>
          ${calendarMonth !== today.slice(0, 7) ? `<button type="button" class="crm-link" data-task="cal-today">Hoje</button>` : ""}
        </header>
        <div class="tk-weekdays">${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => `<span>${day}</span>`).join("")}</div>
        <div class="tk-days">${cells.map((date) => {
          const list = dayItems(date);
          const dayMarks = marks.filter((item) => item.date === date);
          return `<div class="tk-day" data-day="${date}"${date.slice(0, 7) !== calendarMonth ? " data-outside" : ""}${date === today ? " data-today" : ""}${date === calendarDay ? " data-selected" : ""}>
            <button type="button" class="tk-day-number" data-task="cal-day" data-date="${date}">${Number(date.slice(8))}</button>
            ${dayMarks.map((item) => `<span class="tk-cal-mark" title="Marco · ${escape(item.project.name)}">${icon("diamond")}${escape(item.title)}</span>`).join("")}
            ${list.slice(0, 3).map((task) => `<span class="tk-cal-task" data-drag="${escape(task.id)}" data-id="${escape(task.id)}" data-tone="${statusTone[task.status]}" data-status="${task.status}"><i></i>${task.time ? `<b>${task.time}</b>` : ""}${escape(task.title)}</span>`).join("")}
            ${list.length > 3 ? `<button type="button" class="tk-cal-more" data-task="cal-day" data-date="${date}">+${list.length - 3}</button>` : ""}
          </div>`;
        }).join("")}</div>
      </div>
      <aside class="crm-panel tk-dayside">
        <header><h2>${kit.relativeDay(calendarDay) === kit.dateText(calendarDay) ? kit.dateText(calendarDay) : `${kit.relativeDay(calendarDay)} · ${kit.dateText(calendarDay)}`}</h2><small>${selectedTasks.length} tarefas</small></header>
        ${selectedMarks.map((item) => `<p class="tk-day-mark">${icon("diamond")}<span><strong>${escape(item.title)}</strong><small>${escape(item.project.name)}${item.done ? " · feito" : ""}</small></span></p>`).join("")}
        <ul class="task-rows">${selectedTasks.map((task) => `<li class="task-row">${task.time ? `<span class="tk-time">${timeRange(task)}</span>` : ""}${ring(task)}<button type="button" class="task-title" data-task="open" data-id="${escape(task.id)}">${escape(task.title)}</button>${priorityBadge(task)}</li>`).join("")}</ul>
        <form class="task-quick tk-add tk-day-add" data-status="todo" data-due="${calendarDay}"><span>${icon("plus")}</span><input name="title" maxlength="200" placeholder="Adicionar neste dia" aria-label="Adicionar tarefa neste dia"></form>
      </aside>
    </div>`;
  }

  /* ---------- Bulk actions ---------- */
  function bulkBar() {
    if (!selected.size) return "";
    return `<div class="tk-bulk" role="toolbar" aria-label="Ações em lote">
      <strong>${selected.size} selecionada${selected.size === 1 ? "" : "s"}</strong>
      <button type="button" class="button" data-task="bulk" data-bulk="status">${icon("checklist")}Etapa</button>
      <button type="button" class="button" data-task="bulk" data-bulk="priority">${icon("flag")}Prioridade</button>
      <button type="button" class="button" data-task="bulk" data-bulk="due">${icon("calendar")}Entrega</button>
      <button type="button" class="button" data-task="bulk" data-bulk="project">${icon("folder")}Projeto</button>
      <button type="button" class="button tk-bulk-danger" data-task="bulk" data-bulk="delete">${icon("trash")}Excluir</button>
      <button type="button" class="icon-button" data-task="bulk-clear" aria-label="Limpar seleção">${icon("close")}</button>
    </div>`;
  }

  function bulk(kind, anchor) {
    const items = [...selected].map(find).filter(Boolean);
    const apply = (change, text) => {
      for (const task of items) change(task);
      kit.touch();
      refresh();
      kit.toast(`${items.length} tarefa${items.length === 1 ? "" : "s"} ${text}.`);
    };
    if (kind === "status") kit.menu(anchor, columns.map(([key, label]) => ({ label, dot: statusTone[key], action: () => apply((task) => setStatus(task, key), "movida(s)") })));
    if (kind === "priority") kit.menu(anchor, Object.entries(priorities).map(([key, label]) => ({ label, action: () => apply((task) => { task.priority = key; log(task, `Prioridade: ${label}`); }, "atualizada(s)") })));
    if (kind === "project") kit.menu(anchor, kit.projectOptions("", "Sem projeto").map(([key, label]) => ({ label, action: () => apply((task) => { task.projectId = key; }, "movida(s)") })));
    if (kind === "due") {
      const today = kit.today();
      kit.menu(anchor, [["Hoje", today], ["Amanhã", kit.addDays(today, 1)], ["Em 7 dias", kit.addDays(today, 7)], ["Sem data", ""]].map(([label, date]) => ({
        label, hint: date ? kit.dateText(date) : "", action: () => apply((task) => { task.due = date; log(task, `Entrega: ${date ? kit.dateText(date) : "sem data"}`); }, "atualizada(s)"),
      })));
    }
    if (kind === "delete") {
      const snapshot = items.map((item) => ({ item, index: all().indexOf(item) }));
      workspace.tasks = all().filter((task) => !selected.has(task.id));
      normalized.add(workspace.tasks);
      selected.clear();
      kit.touch();
      refresh();
      kit.toast(`${snapshot.length} tarefa${snapshot.length === 1 ? "" : "s"} excluída${snapshot.length === 1 ? "" : "s"}.`, ["Desfazer", () => {
        for (const { item, index } of snapshot.sort((a, b) => a.index - b.index)) workspace.tasks.splice(index, 0, item);
        kit.touch();
        refresh();
      }]);
    }
  }

  /* ---------- Render ---------- */
  function render() {
    if (pageId) {
      const task = find(pageId);
      if (task) return renderPage(task);
      pageId = undefined;
      $("#current-crumb").hidden = true;
    }
    const items = filtered();
    const views = { list: listView, board, calendar };
    const scroll = content.querySelector(".tk-board")?.scrollLeft;
    content.innerHTML = toolbar() + views[mode](items) + bulkBar();
    if (scroll) content.querySelector(".tk-board").scrollLeft = scroll;
    if (!boundDrag) {
      boundDrag = true;
      kit.draggable(content, { item: ".task-card", zone: "[data-drop]", onDrop: (id, zone, event) => moveCard(id, zone, event) });
      kit.draggable(content, { item: ".tk-cal-task", zone: "[data-day]", onDrop: (id, zone) => {
        const task = find(id);
        if (!task || task.due === zone.dataset.day) return;
        task.due = zone.dataset.day;
        log(task, `Entrega: ${kit.dateText(task.due)}`);
        kit.touch();
        refresh();
      } });
    }
  }

  function moveCard(id, zone, event) {
    const task = find(id);
    const status = zone.dataset.drop;
    if (!task) return;
    const siblings = [...zone.querySelectorAll(".task-card")].filter((element) => element.dataset.id !== id);
    const after = siblings.find((element) => {
      const box = element.getBoundingClientRect();
      return event.clientY < box.top + box.height / 2;
    });
    const orders = siblings.map((element) => find(element.dataset.id)).map((item) => item.order ?? item.createdAt);
    const index = after ? siblings.indexOf(after) : siblings.length;
    const before = index > 0 ? orders[index - 1] : undefined;
    const next = index < orders.length ? orders[index] : undefined;
    task.order = before === undefined && next === undefined ? Date.now()
      : before === undefined ? next - 1000 : next === undefined ? before + 1000 : (before + next) / 2;
    setStatus(task, status);
    kit.touch();
    refresh();
  }

  function refresh() {
    if (kit.isOpen("tasks")) render();
    if (panelId && drawer.open && drawer.dataset.panel === "task") panel(panelId, { keepTab: true });
  }

  function stageMenu(anchor, task) {
    kit.menu(anchor, columns.map(([key, label]) => ({
      label, dot: statusTone[key], checked: task.status === key,
      action: () => {
        setStatus(task, key);
        kit.touch();
        refresh();
      },
    })));
  }

  /* ---------- Task panel (saves as you go) ---------- */
  function primaryAction(task) {
    const actions = {
      idea: ["todo", "Mover para A fazer"], todo: ["doing", "Começar"], doing: ["review", "Enviar para revisão"],
      waiting: ["doing", "Retorno recebido"], review: ["done", "Concluir"], done: ["todo", "Reabrir"],
    };
    return actions[task.status];
  }

  /* ---------- Shared pieces for the side panel and the full page ---------- */
  const optionList = (options, selected) => options.map(([key, label]) => `<option value="${escape(key)}"${key === (selected ?? "") ? " selected" : ""}>${escape(label)}</option>`).join("");

  function propsHtml(task) {
    const parent = task.parentId ? find(task.parentId) : undefined;
    return `<dl class="tp-props">
      <div><dt>${icon("calendar")}${task.type === "note" ? "Data" : "Entrega"}</dt><dd>${kit.dateInput("tp-due", task.due ?? "", { optional: true })}</dd></div>
      <div><dt>${icon("clock")}Horário</dt><dd class="tp-times"><select data-tp-prop="time" aria-label="Horário de início">${optionList(timeOptions(), task.time)}</select>
        ${task.time ? `<span>até</span><select data-tp-prop="endTime" aria-label="Horário de término">${optionList(timeOptions("Sem término"), task.endTime)}</select>` : ""}</dd></div>
      <div><dt>${icon("calendar")}Início</dt><dd>${kit.dateInput("tp-start", task.start ?? "", { optional: true })}</dd></div>
      <div><dt>${icon("flag")}Prioridade</dt><dd><select data-tp-prop="priority" aria-label="Prioridade">${optionList(Object.entries(priorities), task.priority)}</select></dd></div>
      <div><dt>${icon("folder")}Projeto</dt><dd>${parent ? `<span class="tp-locked">${escape(kit.project(parent.projectId)?.name ?? "Sem projeto")} · da tarefa-mãe</span>` : `<select data-tp-prop="projectId" aria-label="Projeto">${optionList(kit.projectOptions(task.projectId, "Sem projeto"), task.projectId)}</select>`}</dd></div>
      <div><dt>${icon("flag")}Etiquetas</dt><dd><input data-tp-prop="tags" name="tags" value="${escape((task.tags ?? []).join(", "))}" list="tp-tags" placeholder="Adicionar etiquetas" aria-label="Etiquetas"><datalist id="tp-tags">${allTags().map((tag) => `<option value="${escape(tag)}">`).join("")}</datalist></dd></div>
    </dl>`;
  }

  const attachedLinks = (task) => (task.linkIds ?? []).map((linkId) => links.all().find((link) => link.id === linkId)).filter(Boolean);
  function linksHtml(task) {
    return `<ul class="task-link-list">${attachedLinks(task).map((link) => `<li class="task-link-row" data-link-id="${escape(link.id)}">
        <button type="button" class="task-link-open" data-tp="link-open">${icon(links.kinds[link.kind]?.[1] ?? "globe")}<span><strong>${escape(link.title)}</strong><small>${escape(link.target)}</small></span></button>
        <button type="button" class="icon-button sub-remove" data-tp="link-remove" aria-label="Desanexar ${escape(link.title)}">${icon("close")}</button></li>`).join("")}</ul>
      <form class="task-quick tp-add" data-tp-form="link"><span>${icon("plus")}</span><input name="title" maxlength="2048" placeholder="Colar endereço ou caminho e apertar Enter" aria-label="Novo link"></form>
      ${links.all().some((link) => !(task.linkIds ?? []).includes(link.id)) ? `<button type="button" class="crm-link tp-attach" data-tp="link-attach">${icon("plus")}Anexar link existente</button>` : ""}`;
  }
  /* Notes and mind maps linked to the task (e.g. meeting transcript and summary). */
  const docEdited = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
  function attachedDocs(task) {
    const noteItems = (task.noteIds ?? []).map((id) => (workspace.notes ?? []).find((note) => note.id === id)).filter(Boolean)
      .map((item) => ({ kind: "note", id: item.id, title: item.title.trim() || "Sem título", hint: `Nota · editada em ${docEdited.format(new Date(item.updatedAt))}` }));
    const mapItems = (task.mapIds ?? []).map((id) => (workspace.maps ?? []).find((map) => map.id === id)).filter(Boolean)
      .map((item) => ({ kind: "map", id: item.id, title: item.title || "Mapa sem título", hint: `Mapa mental · ${item.nodes?.length ?? 0} cards` }));
    return [...noteItems, ...mapItems];
  }
  function docsHtml(task) {
    return `<ul class="task-link-list">${attachedDocs(task).map((doc) => `<li class="task-link-row" data-doc-kind="${doc.kind}" data-doc-id="${escape(doc.id)}">
        <button type="button" class="task-link-open" data-tp="doc-open">${icon(doc.kind)}<span><strong>${escape(doc.title)}</strong><small>${escape(doc.hint)}</small></span></button>
        <button type="button" class="icon-button sub-remove" data-tp="doc-remove" aria-label="Desvincular ${escape(doc.title)}" title="Desvincular (a nota ou o mapa continua existindo)">${icon("close")}</button></li>`).join("")}</ul>
      <div class="tp-doc-actions">
        <button type="button" class="button tp-doc-new" data-tp="doc-new" aria-haspopup="menu">${icon("plus")}Nova nota${icon("chevron")}</button>
        <button type="button" class="button" data-tp="doc-attach" aria-haspopup="menu">${icon("chain")}Vincular existente</button>
      </div>`;
  }
  const meetingSummary = "<h2>Resumo</h2><p><br></p><h2>Decisões</h2><ul><li><br></li></ul><h2>Próximos passos</h2><ul class=\"checklist\"><li><br></li></ul>";
  function newLinkedNote(task, preset) {
    const when = task.due ? `Reunião de ${kit.dateText(task.due)}${task.time ? ` · ${timeRange(task)}` : ""}` : "";
    const presets = {
      blank: [task.title, "", ""],
      transcript: [`Transcrição · ${task.title}`, when, ""],
      summary: [`Resumo · ${task.title}`, when, meetingSummary],
    };
    const [title, subtitle, body] = presets[preset];
    const note = notes.createNoteRecord(title.slice(0, 200));
    Object.assign(note, { subtitle, body, projectId: (task.parentId ? find(task.parentId)?.projectId : task.projectId) || undefined });
    if (!note.projectId) delete note.projectId;
    task.noteIds = [...(task.noteIds ?? []), note.id];
    log(task, `Nota criada: ${note.title}`);
    task.updatedAt = Date.now();
    kit.touch();
    openDoc("note", note.id);
  }
  function openDoc(kind, id) {
    if (drawer.open && drawer.dataset.panel === "task") drawer.close();
    if (kind === "note") openNoteById(id);
    else openMapAt(id);
  }
  function subtasksHtml(task) {
    const kids = childrenOf(task.id).sort(byOrder);
    return `<ul class="tp-list">${kids.map((child) => `<li class="tp-sub">${ring(child)}<button type="button" class="tp-sub-title" data-tp="open" data-id="${escape(child.id)}">${escape(child.title)}</button>${dueBadge(child)}${priorityBadge(child)}</li>`).join("")}</ul>
      ${task.parentId ? "" : `<form class="task-quick tp-add" data-tp-form="subtask"><span>${icon("plus")}</span><input name="title" maxlength="200" placeholder="Adicionar subtarefa" aria-label="Nova subtarefa"></form>`}`;
  }
  function checklistHtml(task) {
    return `<ul class="tp-list">${(task.checklist ?? []).map((item) => `<li class="sub-row" data-check="${escape(item.id)}">
        <button type="button" class="task-check" data-tp="check" data-check-id="${escape(item.id)}" aria-pressed="${item.done}" aria-label="Marcar item">${icon("check")}</button>
        <input class="sub-title" data-tp-check-title="${escape(item.id)}" value="${escape(item.title)}" maxlength="200" aria-label="Item do checklist">
        <button type="button" class="icon-button sub-remove" data-tp="check-remove" data-check-id="${escape(item.id)}" aria-label="Remover item">${icon("close")}</button></li>`).join("")}</ul>
      <form class="task-quick tp-add" data-tp-form="check"><span>${icon("plus")}</span><input name="title" maxlength="200" placeholder="Adicionar item" aria-label="Novo item do checklist"></form>`;
  }
  const commentsHtml = (task) => `<form class="tp-comment" data-tp-form="comment"><textarea name="text" rows="2" maxlength="2000" placeholder="Escreva um comentário… (Ctrl+Enter publica)" aria-label="Comentário"></textarea><button type="submit" class="button">Comentar</button></form>
    <ul class="tp-comments">${(task.comments ?? []).map((item) => `<li><small>${stamp.format(new Date(item.at))}</small><p>${escape(item.text)}</p>
      <button type="button" class="icon-button sub-remove" data-tp="comment-remove" data-comment-id="${escape(item.id)}" aria-label="Apagar comentário">${icon("close")}</button></li>`).join("") || '<li class="tp-empty">Nenhum comentário ainda.</li>'}</ul>`;
  const historyHtml = (task) => `<ol class="tp-history">${(task.history ?? []).map((item) => `<li><span>${escape(item.text)}</span><small>${stamp.format(new Date(item.at))}</small></li>`).join("") || '<li class="tp-empty">Sem histórico.</li>'}</ol>`;
  const bannersHtml = (task) => `${task.status === "waiting" ? `<p class="tp-banner" data-tone="warning">${icon("clock")}Aguardando retorno ${daysWaiting(task) ? `há ${daysWaiting(task)} dia${daysWaiting(task) === 1 ? "" : "s"}` : "desde hoje"}.</p>` : ""}
    ${isLate(task) ? `<p class="tp-banner" data-tone="danger">${icon("alert")}Atrasada desde ${kit.dateText(task.due)}.</p>` : ""}`;
  const progressText = (done, total) => total ? `${done}/${total}` : "";

  function grow(field) {
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }

  /* ---------- Side panel ---------- */
  function panel(id, { keepTab = false } = {}) {
    const task = find(id);
    if (!task) return;
    panelId = id;
    if (!keepTab) panelTab = childrenOf(id).length ? "subtasks" : task.checklist?.length ? "checklist" : "subtasks";
    const project = kit.project(task.projectId);
    const parent = task.parentId ? find(task.parentId) : undefined;
    const kids = childrenOf(id);
    const checklist = task.checklist ?? [];
    const [nextStatus, nextLabel] = primaryAction(task);
    const tabs = [
      ["subtasks", "Subtarefas", progressText(kids.filter((item) => item.status === "done").length, kids.length)],
      ["checklist", "Checklist", progressText(checklist.filter((item) => item.done).length, checklist.length)],
      ["comments", "Comentários", task.comments?.length || ""],
      ["history", "Histórico", task.history?.length || ""],
    ];
    const tabBody = { subtasks: subtasksHtml, checklist: checklistHtml, comments: commentsHtml, history: historyHtml };
    const rich = Boolean(task.descriptionHtml || task.details?.trim());
    drawer.dataset.panel = "task";
    drawer.innerHTML = `<div class="tp">
      <header class="tp-top">
        ${project ? `<span class="kit-project" data-color="${project.color}"><i></i>${escape(project.name)}</span>` : '<span class="tp-noproject">Sem projeto</span>'}
        <span class="tp-code">${code(task)}</span>
        <span class="tk-spacer"></span>
        <button type="button" class="button tp-expand" data-tp="expand" title="Abrir a tarefa em página inteira">${icon("open")}Abrir página</button>
        <button type="button" class="icon-button" data-tp="menu" aria-label="Mais ações" title="Mais ações">${icon("more")}</button>
        <button type="button" class="icon-button" data-tp="close" aria-label="Fechar">${icon("close")}</button>
      </header>
      <div class="tp-body">
        ${parent ? `<button type="button" class="tp-parent" data-tp="open" data-id="${escape(parent.id)}">${icon("layers")}Subtarefa de <strong>${escape(parent.title)}</strong></button>` : ""}
        <div class="tp-pills">
          <button type="button" class="task-stage-pill tp-stage" data-tone="${statusTone[task.status]}" data-tp="stage">${statusNames[task.status]}${icon("chevron")}</button>
          ${task.type === "note" ? `<span class="task-mark">${icon("note")}Anotação de reunião</span>` : ""}
        </div>
        <textarea class="tp-title" rows="1" maxlength="200" aria-label="Título da tarefa">${escape(task.title)}</textarea>
        ${bannersHtml(task)}
        ${propsHtml(task)}
        <section class="tp-section"><h3>Descrição</h3>
          ${rich ? `<div class="tp-desc-preview"><div class="tp-desc-doc rich-doc" data-tp="expand" title="Abrir a descrição na página"></div><button type="button" class="tp-desc-edit" data-tp="expand">${icon("open")}Editar na página</button></div>`
            : `<textarea class="tp-details" rows="4" maxlength="5000" placeholder="Contexto, critérios de pronto, observações…" aria-label="Descrição">${escape(task.details ?? "")}</textarea>
          <small class="tp-hint">Para títulos, listas e formatação, use <button type="button" class="crm-link" data-tp="expand">Abrir página</button>.</small>`}
        </section>
        <section class="tp-section"><h3>${icon("note")}Notas e mapas<small>${attachedDocs(task).length || ""}</small></h3>${docsHtml(task)}</section>
        <section class="tp-section"><h3>${icon("globe")}Links<small>${attachedLinks(task).length || ""}</small></h3>${linksHtml(task)}</section>
        <nav class="sub-tabs tp-tabs">${tabs.map(([key, label, count]) => `<button type="button" data-tp-tab="${key}" aria-pressed="${key === panelTab}">${label}${count ? `<small>${count}</small>` : ""}</button>`).join("")}</nav>
        <div class="tp-tab-body">${tabBody[panelTab](task)}</div>
      </div>
      <footer class="tp-foot">
        <button type="button" class="button primary" data-tp="primary" data-next="${nextStatus}">${nextLabel}</button>
        ${task.status !== "waiting" && task.status !== "done" && task.status !== "idea" ? `<button type="button" class="button" data-tp="waiting">${icon("clock")}Aguardando retorno</button>` : ""}
        <span class="tk-spacer"></span>
        <small class="tp-created">Criada em ${stamp.format(new Date(task.createdAt))}</small>
      </footer>
    </div>`;
    if (!drawer.open) drawer.showModal();
    const descDoc = drawer.querySelector(".tp-desc-doc");
    if (descDoc) {
      if (task.descriptionHtml) descDoc.replaceChildren(richText.clean(task.descriptionHtml).content);
      else descDoc.replaceChildren(...task.details.split(/\n+/).filter((line) => line.trim()).map((line) => Object.assign(document.createElement("p"), { textContent: line })));
      for (const block of descDoc.querySelectorAll("p, div, h1, h2, h3, blockquote")) if (!block.textContent.trim()) block.remove();
      for (const br of descDoc.querySelectorAll("br")) if (!br.previousSibling || br.previousSibling.nodeName === "BR") br.remove();
      if (!descDoc.textContent.trim()) descDoc.replaceChildren(Object.assign(document.createElement("p"), { className: "tp-desc-empty", textContent: "Sem descrição" }));
      descDoc.classList.toggle("is-clamped", descDoc.scrollHeight > descDoc.clientHeight + 2);
    }
    const title = drawer.querySelector(".tp-title");
    grow(title);
    title.addEventListener("input", () => grow(title));
  }

  /* ---------- Full page (room to write, like the project briefing) ---------- */
  let descBody;
  let descEditor;
  let descTaskId;
  function mountDescription(task) {
    if (!descBody) {
      descBody = Object.assign(document.createElement("div"), { id: "task-desc-body", contentEditable: "true" });
      descBody.setAttribute("role", "textbox");
      descBody.setAttribute("aria-multiline", "true");
      descBody.setAttribute("aria-label", "Descrição da tarefa");
      descBody.dataset.placeholder = "Escreva a descrição: contexto, critérios de pronto, decisões… Selecione o texto para formatar ou digite “/” para inserir blocos.";
      descEditor = richText.editor(descBody, { onEdit: () => {
        const current = find(descTaskId);
        if (!current) return;
        const html = descEditor.html();
        if ((current.descriptionHtml ?? "") === html) return;
        current.descriptionHtml = html;
        current.details = richText.plainText(html).slice(0, 5000);
        current.updatedAt = Date.now();
        changed(400);
      } });
    }
    content.querySelector("#task-desc-slot").replaceWith(descBody);
    if (descTaskId !== task.id || !descBody.isConnected || descBody.dataset.loaded !== task.id) {
      descTaskId = task.id;
      descBody.dataset.loaded = task.id;
      descEditor.load(task.descriptionHtml ?? null, task.details ?? "");
    }
  }

  function projectCard(task) {
    const projectId = task.parentId ? find(task.parentId)?.projectId : task.projectId;
    const project = kit.project(projectId);
    if (!project) return `<p class="project-empty-line">Esta tarefa não está em nenhum projeto. Escolha um em Detalhes.</p>`;
    const info = projects.summary(project);
    const fill = info.tasks.length ? Math.round(info.done / info.tasks.length * 100) : 0;
    return `<div class="tkp-project">
      <span class="kit-project" data-color="${project.color}"><i></i>${escape(project.name)}</span>
      <dl class="project-facts"><div><dt>Etapa</dt><dd>${escape(projects.statuses[project.status] ?? "")}${project.paused ? " · pausado" : ""}</dd></div>
        <div><dt>Progresso</dt><dd>${info.done} de ${info.tasks.length} tarefas · ${fill}%</dd></div>
        ${info.nextMilestone ? `<div><dt>Próximo marco</dt><dd>${escape(info.nextMilestone.title)} · ${kit.dateText(info.nextMilestone.date)}</dd></div>` : ""}
        ${project.end ? `<div><dt>Entrega do projeto</dt><dd>${kit.dateText(project.end)}</dd></div>` : ""}</dl>
      <span class="crm-bar"><span data-fill="${fill}"></span></span>
      <button type="button" class="button" data-tp="project-open" data-id="${escape(project.id)}">${icon("folder")}Abrir projeto</button>
    </div>`;
  }

  function renderPage(task) {
    const parent = task.parentId ? find(task.parentId) : undefined;
    const kids = childrenOf(task.id);
    const checklist = task.checklist ?? [];
    const [nextStatus, nextLabel] = primaryAction(task);
    const crumb = $("#current-crumb");
    crumb.hidden = false;
    crumb.textContent = code(task);
    const section = (title, glyph, count, body, extra = "") => `<section class="crm-panel tkp-section"><header><span class="crm-panel-icon">${icon(glyph)}</span><h2>${title}</h2>${count ? `<small class="tkp-count">${count}</small>` : ""}${extra}</header><div class="tkp-section-body">${body}</div></section>`;
    content.innerHTML = `<div class="tkp" data-tp-root>
      <div class="tkp-top">
        <button type="button" class="note-ghost" data-tp="back">${icon("back")}<span>Tarefas</span></button>
        ${parent ? `<span class="tkp-crumb">${icon("chevron-right")}<button type="button" class="crm-link" data-tp="page" data-id="${escape(parent.id)}">${escape(parent.title)}</button></span>` : ""}
        <span class="tk-spacer"></span>
        <span class="tp-code">${code(task)}</span>
        <button type="button" class="icon-button" data-tp="menu" aria-label="Mais ações" title="Mais ações">${icon("more")}</button>
      </div>
      <div class="tkp-grid">
        <div class="tkp-main">
          <div class="tkp-head">
            <div class="tp-pills">
              <button type="button" class="task-stage-pill tp-stage" data-tone="${statusTone[task.status]}" data-tp="stage">${statusNames[task.status]}${icon("chevron")}</button>
              ${task.type === "note" ? `<span class="task-mark">${icon("note")}Anotação de reunião</span>` : ""}
              ${task.due ? dueBadge(task) : ""}
            </div>
            <textarea class="tp-title tkp-title" rows="1" maxlength="200" aria-label="Título da tarefa">${escape(task.title)}</textarea>
            ${bannersHtml(task)}
          </div>
          <section class="crm-panel tkp-desc"><div id="task-desc-slot"></div></section>
          ${section("Subtarefas", "layers", progressText(kids.filter((item) => item.status === "done").length, kids.length),
            task.parentId ? `<p class="project-empty-line">Subtarefas ficam um nível só: esta já é subtarefa de “${escape(parent?.title ?? "")}”.</p>${subtasksHtml(task)}` : subtasksHtml(task),
            kids.length ? `<span class="tkp-bar crm-bar"><span data-fill="${Math.round(kids.filter((item) => item.status === "done").length / kids.length * 100)}"></span></span>` : "")}
          ${section("Checklist", "checklist", progressText(checklist.filter((item) => item.done).length, checklist.length), checklistHtml(task),
            checklist.length ? `<span class="tkp-bar crm-bar"><span data-fill="${Math.round(checklist.filter((item) => item.done).length / checklist.length * 100)}"></span></span>` : "")}
          ${section("Comentários", "comment", task.comments?.length || "", commentsHtml(task))}
        </div>
        <aside class="tkp-side">
          ${section("Detalhes", "flag", "", propsHtml(task))}
          ${section("Projeto", "folder", "", projectCard(task))}
          ${section("Notas e mapas", "note", attachedDocs(task).length || "", docsHtml(task))}
          ${section("Links", "globe", attachedLinks(task).length || "", linksHtml(task))}
          ${section("Histórico", "history", "", historyHtml(task))}
        </aside>
      </div>
      <footer class="tkp-foot">
        <button type="button" class="button primary" data-tp="primary" data-next="${nextStatus}">${nextLabel}</button>
        ${task.status !== "waiting" && task.status !== "done" && task.status !== "idea" ? `<button type="button" class="button" data-tp="waiting">${icon("clock")}Aguardando retorno</button>` : ""}
        <span class="tk-spacer"></span>
        <small class="tp-created">Criada em ${stamp.format(new Date(task.createdAt))}</small>
      </footer>
    </div>`;
    for (const bar of content.querySelectorAll("[data-fill]")) bar.style.width = `${bar.dataset.fill}%`;
    mountDescription(task);
    const title = content.querySelector(".tkp-title");
    grow(title);
    title.addEventListener("input", () => grow(title));
  }

  function openPage(id) {
    if (!find(id)) return;
    pageId = id;
    descTaskId = undefined;
    if (drawer.open) drawer.close();
    if (kit.isOpen("tasks")) render();
    else {
      keepPage = true;
      kit.open("tasks");
    }
    window.scrollTo(0, 0);
    $("#main").scrollTo?.(0, 0);
  }

  /* Redraw whichever task view is showing (panel or page). */
  function redraw() {
    if (drawer.open && drawer.dataset.panel === "task" && panelId) panel(panelId, { keepTab: true });
    else if (pageId && kit.isOpen("tasks")) render();
  }

  function savePanelField(task, key, value, label) {
    if ((task[key] ?? "") === value) return;
    task[key] = value;
    task.updatedAt = Date.now();
    if (label) log(task, label);
    kit.touch();
    if (kit.isOpen("tasks") && !pageId) render();
  }

  /* One set of handlers for both views. */
  function bindTaskView(root, current, active) {
    root.addEventListener("click", (event) => {
      if (!active()) return;
      const task = find(current());
      if (!task) return;
      const tab = event.target.closest("[data-tp-tab]");
      if (tab) {
        panelTab = tab.dataset.tpTab;
        return redraw();
      }
      const previewLink = event.target.closest(".tp-desc-doc a[href]");
      if (previewLink) {
        event.preventDefault();
        return richText.openLink(previewLink.getAttribute("href"));
      }
      const ringButton = event.target.closest(".task-ring");
      if (ringButton && root === drawer) return stageMenu(ringButton, find(ringButton.dataset.id));
      const button = event.target.closest("[data-tp]");
      if (!button) return;
      const action = button.dataset.tp;
      const handlers = {
        close: () => drawer.close(),
        back: () => {
          pageId = undefined;
          $("#current-crumb").hidden = true;
          render();
        },
        expand: () => openPage(task.id),
        page: () => openPage(button.dataset.id),
        "project-open": () => projects.open(button.dataset.id),
        stage: () => stageMenu(button, task),
        primary: () => {
          setStatus(task, button.dataset.next);
          kit.touch();
          refresh();
        },
        waiting: () => {
          setStatus(task, "waiting");
          kit.touch();
          refresh();
        },
        open: () => (root === drawer ? panel(button.dataset.id) : openPage(button.dataset.id)),
        menu: () => kit.menu(button, [
          { label: "Nova subtarefa", icon: "layers", disabled: Boolean(task.parentId), action: () => {
            panelTab = "subtasks";
            redraw();
            root.querySelector('[data-tp-form="subtask"] input')?.focus();
          } },
          ...(root === drawer ? [{ label: "Abrir em página inteira", icon: "open", action: () => openPage(task.id) }] : []),
          { label: "Duplicar", icon: "copy", action: () => (root === drawer ? panel(duplicate(task).id) : openPage(duplicate(task).id)) },
          { label: "Copiar código", icon: "copy", hint: code(task), action: () => navigator.clipboard?.writeText(code(task)).then(() => kit.toast("Código copiado.")) },
          "-",
          { label: "Excluir tarefa", icon: "trash", danger: true, action: () => {
            if (root === drawer) drawer.close();
            pageId = undefined;
            remove(task);
          } },
        ], { align: "end" }),
        check: () => {
          const item = task.checklist.find((entry) => entry.id === button.dataset.checkId);
          item.done = !item.done;
          task.updatedAt = Date.now();
          kit.touch();
          if (kit.isOpen("tasks") && !pageId) render();
          redraw();
        },
        "check-remove": () => {
          task.checklist = task.checklist.filter((entry) => entry.id !== button.dataset.checkId);
          kit.touch();
          redraw();
        },
        "comment-remove": () => {
          task.comments = task.comments.filter((entry) => entry.id !== button.dataset.commentId);
          kit.touch();
          redraw();
        },
        "doc-open": () => {
          const row = button.closest(".task-link-row");
          openDoc(row.dataset.docKind, row.dataset.docId);
        },
        "doc-remove": () => {
          const row = button.closest(".task-link-row");
          const key = row.dataset.docKind === "map" ? "mapIds" : "noteIds";
          task[key] = (task[key] ?? []).filter((id) => id !== row.dataset.docId);
          kit.touch();
          redraw();
        },
        "doc-new": () => {
          const meeting = [
            { label: "Transcrição da reunião", icon: "comment", hint: "colar o texto", action: () => newLinkedNote(task, "transcript") },
            { label: "Resumo da reunião", icon: "list", hint: "resumo, decisões, próximos", action: () => newLinkedNote(task, "summary") },
          ];
          const blank = { label: "Nota em branco", icon: "note", action: () => newLinkedNote(task, "blank") };
          kit.menu(button, task.type === "note" ? [...meeting, "-", blank] : [blank, "-", ...meeting]);
        },
        "doc-attach": () => {
          const noteChoices = (workspace.notes ?? []).filter((note) => !(task.noteIds ?? []).includes(note.id))
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((note) => ({ label: note.title.trim() || "Sem título", icon: "note", action: () => attachDoc("noteIds", note.id, `Nota vinculada: ${note.title.trim() || "Sem título"}`) }));
          const mapChoices = (workspace.maps ?? []).filter((map) => !(task.mapIds ?? []).includes(map.id))
            .map((map) => ({ label: map.title || "Mapa sem título", icon: "map", action: () => attachDoc("mapIds", map.id, `Mapa vinculado: ${map.title || "Mapa sem título"}`) }));
          const items = [
            ...(noteChoices.length ? [{ heading: "Notas" }, ...noteChoices] : []),
            ...(mapChoices.length ? [{ heading: "Mapas mentais" }, ...mapChoices] : []),
          ];
          if (!items.length) return kit.toast("Não há notas ou mapas para vincular. Use “Nova nota”.");
          kit.menu(button, items, { search: "Buscar nota ou mapa…" });
          function attachDoc(key, id, text) {
            task[key] = [...(task[key] ?? []), id];
            log(task, text);
            task.updatedAt = Date.now();
            kit.touch();
            redraw();
          }
        },
        "link-open": () => void links.launch(button.closest(".task-link-row").dataset.linkId),
        "link-remove": () => {
          task.linkIds = task.linkIds.filter((linkId) => linkId !== button.closest(".task-link-row").dataset.linkId);
          kit.touch();
          redraw();
        },
        "link-attach": () => kit.menu(button, links.all().filter((link) => !task.linkIds.includes(link.id)).map((link) => ({
          label: link.title, icon: links.kinds[link.kind]?.[1] ?? "globe", action: () => {
            task.linkIds.push(link.id);
            kit.touch();
            redraw();
          },
        }))),
      };
      handlers[action]?.();
    });
    root.addEventListener("change", (event) => {
      if (!active()) return;
      const task = find(current());
      if (!task) return;
      const target = event.target;
      if (target.name === "tp-due") savePanelField(task, "due", target.value, `Entrega: ${target.value ? kit.dateText(target.value) : "sem data"}`);
      if (target.name === "tp-start") savePanelField(task, "start", target.value, `Início: ${target.value ? kit.dateText(target.value) : "sem data"}`);
      if (target.dataset.tpProp === "priority") savePanelField(task, "priority", target.value, `Prioridade: ${priorities[target.value]}`);
      if (target.dataset.tpProp === "projectId") {
        savePanelField(task, "projectId", target.value, `Projeto: ${kit.project(target.value)?.name ?? "sem projeto"}`);
        for (const child of childrenOf(task.id)) child.projectId = target.value;
      }
      if (target.dataset.tpProp === "tags") {
        const tags = [...new Set(target.value.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean))].slice(0, 12);
        if (tags.join(",") !== (task.tags ?? []).join(",")) {
          task.tags = tags;
          kit.touch();
          if (kit.isOpen("tasks") && !pageId) render();
        }
        return;
      }
      if (target.dataset.tpProp === "time") {
        if (target.value && !task.due) task.due = kit.today();
        if (!target.value || (task.endTime && task.endTime <= target.value)) task.endTime = "";
        savePanelField(task, "time", target.value, target.value ? `Horário: ${target.value}` : "Horário removido");
      }
      if (target.dataset.tpProp === "endTime") {
        if (target.value && target.value <= task.time) kit.toast("O término precisa ser depois do início.");
        else savePanelField(task, "endTime", target.value, target.value ? `Término: ${target.value}` : "Término removido");
      }
      if (target.name?.startsWith("tp-") || target.dataset.tpProp) redraw();
    });
    root.addEventListener("focusout", (event) => {
      if (!active()) return;
      const task = find(current());
      if (!task) return;
      const target = event.target;
      if (target.matches(".tp-title")) {
        const value = target.value.replace(/\s+/g, " ").trim();
        if (!value) target.value = task.title;
        else savePanelField(task, "title", value, "Título alterado");
      }
      if (target.matches(".tp-details")) savePanelField(task, "details", target.value.trim(), "Descrição alterada");
      if (target.dataset.tpCheckTitle) {
        const item = task.checklist.find((entry) => entry.id === target.dataset.tpCheckTitle);
        if (item && target.value.trim() && item.title !== target.value.trim()) {
          item.title = target.value.trim();
          kit.touch();
        }
      }
    });
    root.addEventListener("keydown", (event) => {
      if (!active()) return;
      if (event.target.matches(".tp-title") && event.key === "Enter") {
        event.preventDefault();
        event.target.blur();
      }
      if (event.target.closest('[data-tp-form="comment"]') && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        event.target.form.requestSubmit();
      }
    });
    root.addEventListener("submit", (event) => {
      if (!active()) return;
      const form = event.target.closest("[data-tp-form]");
      if (!form) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const task = find(current());
      const value = (form.elements.title ?? form.elements.text).value.trim();
      if (!task || !value) return;
      const kind = form.dataset.tpForm;
      if (kind === "subtask") create({ title: value, parentId: task.id, projectId: task.projectId, status: "todo" });
      if (kind === "check") task.checklist.push({ id: kit.uid(), title: value, done: false });
      if (kind === "comment") task.comments.unshift({ id: kit.uid(), text: value, at: Date.now() });
      if (kind === "link") task.linkIds.push(links.add({ target: value, projectId: task.projectId }).id);
      kit.touch();
      if (kit.isOpen("tasks") && !pageId) render();
      redraw();
      root.querySelector(`[data-tp-form="${kind}"] input, [data-tp-form="${kind}"] textarea`)?.focus();
    }, true);
  }
  bindTaskView(drawer, () => panelId, () => drawer.dataset.panel === "task");
  bindTaskView(content, () => pageId, () => Boolean(pageId) && Boolean(content.querySelector("[data-tp-root]")));
  drawer.addEventListener("close", () => {
    if (drawer.dataset.panel === "task") {
      delete drawer.dataset.panel;
      panelId = undefined;
    }
  });

  /* ---------- New task form ---------- */
  function newTask(preset = {}) {
    const templates = workspace.taskTemplates ?? [];
    const value = { title: "", details: "", status: "todo", priority: "", start: "", due: "", time: "", endTime: "", projectId: projectFilter, type: "", checklist: [], ...preset };
    if (typeof value.checklist === "string") {
      try { value.checklist = JSON.parse(value.checklist); } catch { value.checklist = []; }
    }
    if (!Array.isArray(value.checklist)) value.checklist = [];
    if (value.type === "note") {
      value.details ||= meetingTemplate;
      value.title ||= `Reunião · ${kit.today().slice(8)}/${kit.today().slice(5, 7)}`;
      value.due ||= kit.today();
      value.time ||= nextSlot();
      value.endTime ||= addMinutes(value.time, 60);
    }
    const timeSelect = (name, selected, empty, label) => `<select name="${name}" aria-label="${label}">${timeOptions(empty).map(([key, text]) => `<option value="${key}"${key === selected ? " selected" : ""}>${text}</option>`).join("")}</select>`;
    kit.form({
      title: value.type === "note" ? "Nova anotação de reunião" : value.status === "idea" ? "Nova ideia no Brain" : "Nova tarefa",
      info: value.status === "idea" ? "O Brain guarda ideias e anotações ainda sem data. Elas viram trabalho quando vão para A fazer." : "Cada tarefa ganha um código fixo (TK-0000). Subtarefas, checklist, comentários e links ficam no painel da tarefa.",
      submit: value.status === "idea" ? "Guardar no Brain" : value.type === "note" ? "Criar anotação" : "Criar tarefa",
      fields: `<div class="nu-kind tk-type" role="group" aria-label="Tipo">
          <label><input type="radio" name="type" value=""${value.type !== "note" ? " checked" : ""}><span>Tarefa</span></label>
          <label><input type="radio" name="type" value="note"${value.type === "note" ? " checked" : ""}><span>Anotação de reunião</span></label></div>
        ${templates.length && value.type !== "note" ? `<div class="tk-template-row">${kit.field("Usar modelo de tarefa", `<select data-template aria-label="Modelo de tarefa"><option value="">Nenhum</option>${templates.map((item) => `<option value="${escape(item.id)}">${escape(item.name)}</option>`).join("")}</select>`)}</div>` : ""}
        <input class="task-title-input" name="title" value="${escape(value.title)}" maxlength="200" required autofocus placeholder="Nome da tarefa" aria-label="Nome da tarefa">
        <div class="task-props">
          ${kit.field("Etapa", kit.select("status", columns.filter(([key]) => key !== "done").map(([key, label]) => [key, label]), value.status))}
          ${kit.field("Prioridade", kit.select("priority", Object.entries(priorities), value.priority))}
          ${kit.dateField(value.type === "note" ? "Data" : "Entrega", "due", value.due, { optional: true })}
          <div class="kit-field tk-time-field"><span>Horário</span><div class="tk-time-pair">${timeSelect("time", value.time, "Sem horário", "Horário de início")}<small>até</small>${timeSelect("endTime", value.endTime, "Sem término", "Horário de término")}</div></div>
          ${value.type === "note" ? "" : kit.dateField("Início", "start", value.start, { optional: true })}
          ${kit.field("Projeto", kit.select("projectId", kit.projectOptions(value.projectId), value.projectId))}
          ${kit.field("Etiquetas", kit.input("tags", (value.tags ?? []).join(", "), 'maxlength="200" placeholder="Opcional" list="task-tags"') + `<datalist id="task-tags">${allTags().map((tag) => `<option value="${escape(tag)}">`).join("")}</datalist>`)}
        </div>
        ${kit.field("Descrição", kit.textarea("details", value.details, 'rows="5" maxlength="5000" placeholder="Contexto, critérios de pronto, observações…"'))}
        <input type="hidden" name="checklist" value="${escape(JSON.stringify(value.checklist ?? []))}">`,
      onOpen: (dialog) => {
        dialog.querySelector(".tk-type").addEventListener("change", (event) => {
          const type = event.target.value;
          const values = Object.fromEntries(new FormData(dialog.querySelector("form")));
          setTimeout(() => newTask({ ...values, type, time: type === "note" ? values.time : "", endTime: type === "note" ? values.endTime : "", details: type === "note" ? "" : values.details === meetingTemplate ? "" : values.details, title: type === "note" ? "" : values.title, tags: values.tags ? values.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [] }));
        });
        dialog.querySelector("[data-template]")?.addEventListener("change", (event) => {
          const template = templates.find((item) => item.id === event.target.value);
          if (!template) return;
          dialog.querySelector('[name="title"]').value = template.name;
          dialog.querySelector('[name="details"]').value = template.desc ?? "";
          const priority = dialog.querySelector('[name="priority"]');
          priority.value = template.priority ?? "";
          ui.refresh(priority);
          dialog.querySelector('[name="checklist"]').value = JSON.stringify((template.checklist ?? []).map((title) => ({ id: kit.uid(), title, done: false })));
          kit.toast(`Modelo “${template.name}” aplicado${template.checklist?.length ? ` com ${template.checklist.length} itens de checklist` : ""}.`);
        });
        dialog.querySelector('[name="status"]').addEventListener("change", (event) => {
          if (event.target.value === "idea") {
            for (const name of ["due", "start"]) {
              const input = dialog.querySelector(`[name="${name}"]`);
              input.value = "";
              input.closest(".kit-date").querySelector(".kit-date-button span").textContent = "Sem data";
            }
          }
        });
      },
      onSubmit: (values, form) => {
        if (!values.title.trim()) return kit.invalid(form, "title", "Dê um nome à tarefa.");
        values.start ??= "";
        if (values.start && values.due && values.start > values.due) {
          kit.toast("O início não pode ser depois da entrega.");
          return false;
        }
        if (values.time && values.endTime && values.endTime <= values.time) {
          kit.toast("O término precisa ser depois do início.");
          return false;
        }
        const idea = values.status === "idea";
        const task = create({
          title: values.title, type: values.type, details: values.details.trim(), status: values.status, priority: values.priority,
          due: idea ? "" : values.due || (values.time ? kit.today() : ""), start: idea ? "" : values.start, projectId: values.projectId,
          time: idea ? "" : values.time, endTime: idea || !values.time ? "" : values.endTime,
          tags: [...new Set(values.tags.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean))],
          checklist: JSON.parse(values.checklist || "[]"),
        });
        refresh();
        kit.toast(`${code(task)} criada.`, ["Abrir", () => panel(task.id)]);
      },
    });
  }

  function newMenu(anchor) {
    const templates = workspace.taskTemplates ?? [];
    kit.menu(anchor, [
      { heading: "Criar" },
      { label: "Tarefa", icon: "checklist", action: () => newTask() },
      { label: "Anotação de reunião", icon: "note", action: () => newTask({ type: "note" }) },
      { label: "Ideia no Brain", icon: "sparkle", action: () => newTask({ status: "idea" }) },
      ...(templates.length ? ["-", { heading: "Modelos" }, ...templates.slice(0, 6).map((item) => ({ label: item.name, icon: "template", action: () => newTask({ title: item.name, details: item.desc ?? "", priority: item.priority ?? "", checklist: (item.checklist ?? []).map((title) => ({ id: kit.uid(), title, done: false })) }) }))] : []),
      "-",
      { label: "Gerenciar modelos e processos", icon: "layers", action: () => actions.processes?.() },
    ], { align: "end" });
  }

  /* ---------- Events on the page ---------- */
  content.addEventListener("click", (event) => {
    const button = event.target.closest("[data-task]");
    if (!button) {
      const cardElement = event.target.closest(".task-card, .tk-cal-task");
      if (cardElement) panel(cardElement.dataset.id);
      return;
    }
    const { task: action, id } = button.dataset;
    const handlers = {
      open: () => panel(id),
      page: () => openPage(id),
      stage: () => stageMenu(button, find(id)),
      complete: () => {
        const task = find(id);
        setStatus(task, "done");
        kit.touch();
        refresh();
        kit.toast(`${code(task)} concluída.`, ["Desfazer", () => {
          setStatus(task, "todo", { silent: true });
          kit.touch();
          refresh();
        }]);
      },
      mode: () => { mode = button.dataset.mode; selected.clear(); render(); },
      "show-done": () => { showDone = !showDone; render(); },
      subtasks: () => { showSubtasks = !showSubtasks; render(); },
      quick: () => { quick = quick === button.dataset.quick ? "" : button.dataset.quick; render(); },
      clear: () => { projectFilter = ""; priorityFilter = ""; quick = ""; period = "any"; query = ""; render(); },
      collapse: () => {
        if (!collapsed.delete(button.dataset.group)) collapsed.add(button.dataset.group);
        render();
      },
      expand: () => {
        if (!expanded.delete(id)) expanded.add(id);
        render();
      },
      add: () => content.querySelector(`.tk-add[data-status="${button.dataset.group}"] input`)?.focus(),
      select: () => {
        if (button.checked) selected.add(id);
        else selected.delete(id);
        render();
      },
      bulk: () => bulk(button.dataset.bulk, button),
      "bulk-clear": () => { selected.clear(); render(); },
      "cal-month": () => { calendarMonth = kit.addMonths(calendarMonth, Number(button.dataset.step)); render(); },
      "cal-today": () => { calendarMonth = kit.today().slice(0, 7); calendarDay = kit.today(); render(); },
      "cal-day": () => { calendarDay = button.dataset.date; render(); },
    };
    handlers[action]?.();
  });
  content.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches(".task-card")) panel(event.target.dataset.id);
  });
  content.addEventListener("submit", (event) => {
    const form = event.target.closest(".tk-add");
    if (!form) return;
    event.preventDefault();
    const title = form.elements.title.value.trim();
    if (!title) return;
    create({ title, status: form.dataset.status, projectId: projectFilter, due: form.dataset.due ?? "" });
    render();
    content.querySelector(`.tk-add[data-status="${form.dataset.status}"]${form.dataset.due ? `[data-due="${form.dataset.due}"]` : ""} input`)?.focus();
  });
  content.addEventListener("input", (event) => {
    if (event.target.dataset.filter !== "query") return;
    query = event.target.value;
    const caret = event.target.selectionStart;
    render();
    const field = content.querySelector('[data-filter="query"]');
    field.focus();
    field.setSelectionRange(caret, caret);
  });
  content.addEventListener("change", (event) => {
    const filter = event.target.dataset.filter;
    if (!filter || filter === "query") return;
    if (filter === "period") period = event.target.value;
    if (filter === "group") groupBy = event.target.value;
    if (filter === "project") projectFilter = event.target.value;
    if (filter === "priority") priorityFilter = event.target.value;
    render();
  });

  const module = {
    validate,
    show: () => {
      if (!keepPage) pageId = undefined;
      keepPage = false;
      render();
    },
    command: (verb, button) => {
      if (verb === "new") newTask();
      if (verb === "new-menu") newMenu(button);
    },
    all, find, create, toggle, remove, statusNames, columns, card, statusBadge, dueBadge, code, isLate, priorities,
    open: (id) => panel(id),
    openPage,
    current: () => pageId ?? (drawer.open && drawer.dataset.panel === "task" ? panelId : undefined),
    edit: (id) => (id ? panel(id) : newTask()),
    newTask,
    showView: (name) => {
      if (name === "calendar") mode = "calendar";
      else {
        mode = "list";
        quick = name;
      }
      kit.open("tasks");
    },
    showPeriod: (name) => {
      mode = "list";
      quick = "";
      period = periods.some(([key]) => key === name) ? name : "any";
      kit.open("tasks");
    },
    showProject: (id) => {
      projectFilter = id;
      kit.open("tasks");
    },
  };
  kit.register("tasks", "Tarefas", module);
  return module;
})();
