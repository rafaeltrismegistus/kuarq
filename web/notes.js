"use strict";

const notes = (() => {
  const root = $("#notes");
  const library = $("#notes-library");
  const results = $("#notes-results");
  const editor = $("#note-editor");
  const title = $("#note-title");
  const subtitle = $("#note-subtitle");
  const body = $("#note-body");
  const meta = $("#note-meta");
  const kindBadge = $("#note-kind");
  const formatting = richText.editor(body, { onEdit: updateNote });
  const updatedLabel = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });
  const editedLabel = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const suggestions = [
    ["Ata de reunião", "Participantes, decisões e próximos passos",
      "<h2>Participantes</h2><ul><li><br></li></ul><h2>Pauta</h2><ol><li><br></li></ol><h2>Decisões</h2><ul><li><br></li></ul><h2>Próximos passos</h2><ul class=\"checklist\"><li><br></li></ul>"],
    ["Planejamento semanal", "Prioridades e tarefas da semana",
      "<h2>Foco da semana</h2><p><br></p><h2>Prioridades</h2><ul class=\"checklist\"><li><br></li><li><br></li><li><br></li></ul><h2>Agenda</h2><ul><li><b>Segunda:</b> </li><li><b>Terça:</b> </li><li><b>Quarta:</b> </li><li><b>Quinta:</b> </li><li><b>Sexta:</b> </li></ul><h2>Revisão</h2><blockquote>O que funcionou e o que ajustar?</blockquote>"],
    ["Roteiro de conteúdo", "Gancho, desenvolvimento e chamada para ação",
      "<h2>Objetivo</h2><p><br></p><h2>Gancho</h2><blockquote>Primeira frase que prende a atenção.</blockquote><h2>Desenvolvimento</h2><ol><li><br></li><li><br></li><li><br></li></ol><h2>Chamada para ação</h2><p><br></p><h2>Checklist de publicação</h2><ul class=\"checklist\"><li>Revisar texto</li><li>Preparar capa</li><li>Agendar publicação</li></ul>"],
  ];
  let active;
  let activeKind = "note";

  const noteList = () => workspace.notes ??= [];
  const templateList = () => workspace.noteTemplates ??= [];
  const listFor = (kind) => kind === "template" ? templateList() : noteList();
  const noteTitle = (note) => note.title.trim() || "Sem título";
  const fold = (text) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const node = (tag, className, text = "") => Object.assign(document.createElement(tag), { className, textContent: text });
  function valid(data) {
    if (data === undefined) return true;
    if (!Array.isArray(data)) return false;
    const ids = new Set();
    return data.every((note) => {
      if (!note || ["id", "title", "subtitle", "body"].some((key) => typeof note[key] !== "string")
          || !note.id || ids.has(note.id) || typeof note.updatedAt !== "number"
          || !Number.isFinite(new Date(note.updatedAt).getTime())) return false;
      ids.add(note.id);
      return true;
    });
  }

  /* ---------- Data helpers ---------- */

  function tasksOf(note) {
    return [...richText.clean(note.body).content.querySelectorAll("ul.checklist > li")]
      .map((item, index) => ({ note, index, text: item.textContent.trim(), done: item.dataset.checked === "true" }))
      .filter((task) => task.text);
  }

  function toggleTask(note, index) {
    const doc = richText.clean(note.body);
    const item = doc.content.querySelectorAll("ul.checklist > li")[index];
    if (!item) return;
    if (item.dataset.checked === "true") delete item.dataset.checked;
    else item.dataset.checked = "true";
    note.body = doc.innerHTML;
    note.updatedAt = Date.now();
    changed();
  }

  function copyOf(source, suffix = "") {
    return {
      id: crypto.randomUUID(),
      title: suffix ? `${Array.from(source.title.trim() || "Sem título").slice(0, 150).join("")}${suffix}` : source.title,
      subtitle: source.subtitle,
      body: source.body,
      updatedAt: Date.now(),
    };
  }

  function duplicate(source, kind) {
    const copy = copyOf(source, " (cópia)");
    const list = listFor(kind);
    list.splice(list.indexOf(source) + 1, 0, copy);
    changed();
    return copy;
  }

  function saveAsTemplate(note) {
    const template = copyOf(note);
    if (!template.title.trim()) template.title = "Modelo sem título";
    templateList().push(template);
    changed();
    kit.toast(`Modelo “${noteTitle(template)}” salvo.`, ["Ver modelos", () => { scope = "templates"; show(); }]);
  }

  function useTemplate(template) {
    const note = copyOf(template);
    noteList().push(note);
    changed();
    openNote(note, "note");
  }

  /* ---------- Library (same pattern as Tarefas: toolbar + grouped list or grid) ---------- */

  const escape = (value) => kit.escape(value);
  let scope = "notes";
  let view = "list";
  let sort = "recent";
  let projectFilter = "";
  let onlyPending = false;
  let query = "";
  const collapsed = new Set();

  function remove(item, kind) {
    const list = listFor(kind);
    const index = list.indexOf(item);
    list.splice(index, 1);
    changed();
    if (kit.isOpen("notes")) render();
    kit.toast(`${kind === "template" ? "Modelo excluído" : "Nota excluída"}.`, ["Desfazer", () => {
      listFor(kind).splice(index, 0, item);
      changed();
      if (kit.isOpen("notes") && editor.hidden) render();
    }]);
  }

  function entries() {
    const terms = fold(query.trim()).split(/\s+/).filter(Boolean);
    const kind = scope === "templates" ? "template" : "note";
    return listFor(kind).map((note) => ({ note, text: richText.plainText(note.body), tasks: kind === "note" ? tasksOf(note) : [] }))
      .filter(({ note, text, tasks }) => terms.every((term) => fold(`${note.title} ${note.subtitle} ${text}`).includes(term)) &&
        (!projectFilter || note.projectId === projectFilter) && (!onlyPending || tasks.some((task) => !task.done)))
      .sort(sort === "title" ? (a, b) => noteTitle(a.note).localeCompare(noteTitle(b.note), "pt-BR") : (a, b) => b.note.updatedAt - a.note.updatedAt);
  }

  function groupsOf(items) {
    if (scope === "templates" || sort === "title") return [["all", scope === "templates" ? "Modelos" : "Todas as notas", items]];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const today = start.getTime();
    return [
      ["today", "Hoje", items.filter(({ note }) => note.updatedAt >= today)],
      ["week", "Últimos 7 dias", items.filter(({ note }) => note.updatedAt < today && note.updatedAt >= today - 6 * 86_400_000)],
      ["month", "Últimos 30 dias", items.filter(({ note }) => note.updatedAt < today - 6 * 86_400_000 && note.updatedAt >= today - 29 * 86_400_000)],
      ["older", "Mais antigas", items.filter(({ note }) => note.updatedAt < today - 29 * 86_400_000)],
    ].filter(([, , list]) => list.length);
  }

  function toolbar() {
    const pending = noteList().filter((note) => tasksOf(note).some((task) => !task.done)).length;
    const hasProjects = kit.projects().length > 0;
    return `<div class="tk-bar">
      <div class="tk-bar-row">
        <label class="crm-search tk-search"><span>${icon("search")}</span><input type="search" data-nl-filter="query" value="${escape(query)}" placeholder="${scope === "templates" ? "Buscar modelo" : "Buscar nas notas"}" aria-label="Buscar"></label>
        ${hasProjects ? `<label class="tk-field tk-labeled">${icon("folder")}<small>Projeto:</small><select data-nl-filter="project" aria-label="Projeto">${kit.projectOptions(projectFilter, "Todos").map(([value, label]) => `<option value="${escape(value)}"${value === projectFilter ? " selected" : ""}>${escape(label)}</option>`).join("")}</select></label>` : ""}
        ${scope === "notes" ? `<button type="button" class="tk-chip" data-nl="pending" aria-pressed="${onlyPending}">${icon("checklist")}Com tarefas pendentes<span>${pending}</span></button>` : ""}
        <span class="tk-spacer"></span>
        <label class="tk-field tk-labeled"><small>Ordenar por</small><select data-nl-filter="sort" aria-label="Ordenar por"><option value="recent"${sort === "recent" ? " selected" : ""}>Edição recente</option><option value="title"${sort === "title" ? " selected" : ""}>Título (A–Z)</option></select></label>
        <button type="button" class="tk-toggle" data-nl="scope" aria-pressed="${scope === "templates"}">${icon("template")}Modelos<small class="nl-count">${templateList().length}</small></button>
        <div class="tk-views" role="group" aria-label="Visualização">
          <button type="button" data-nl="view" data-view="list" aria-pressed="${view === "list"}" title="Lista" aria-label="Lista">${icon("list")}</button>
          <button type="button" data-nl="view" data-view="grid" aria-pressed="${view === "grid"}" title="Grade" aria-label="Grade">${icon("grid")}</button>
        </div>
      </div>
    </div>`;
  }

  function rowHtml({ note, text, tasks }) {
    const kind = scope === "templates" ? "template" : "note";
    const done = tasks.filter((task) => task.done).length;
    return `<tr class="tk-row nl-row" data-id="${escape(note.id)}">
      <td><div class="tk-title-cell nl-title-cell">
        <span class="note-card-icon">${icon(kind === "template" ? "template" : "note")}</span>
        <button type="button" class="nl-open" data-nl="open" data-id="${escape(note.id)}">
          <strong${note.title.trim() ? "" : ' class="untitled"'}>${escape(noteTitle(note))}</strong>
          <small>${escape(note.subtitle.trim() || text || (kind === "template" ? "Modelo vazio" : "Nota vazia"))}</small>
        </button>
        <span class="tk-quick nl-actions">
          ${kind === "template" ? `<button type="button" data-nl="use" data-id="${escape(note.id)}">${icon("plus")}Usar</button>` : ""}
          <button type="button" data-nl="duplicate" data-id="${escape(note.id)}" title="Duplicar" aria-label="Duplicar">${icon("copy")}</button>
          <button type="button" data-nl="delete" data-id="${escape(note.id)}" title="Excluir" aria-label="Excluir">${icon("trash")}</button>
        </span>
      </div></td>
      <td>${kit.projectChip(note.projectId) || '<span class="crm-faint">—</span>'}</td>
      <td>${tasks.length ? `<span class="note-card-tasks"${done === tasks.length ? " data-done" : ""}>${icon("checklist")}${done}/${tasks.length}</span>` : '<span class="crm-faint">—</span>'}</td>
      <td class="nl-date">${editedLabel.format(new Date(note.updatedAt))}</td>
    </tr>`;
  }

  function cardHtml({ note, text, tasks }) {
    const kind = scope === "templates" ? "template" : "note";
    const done = tasks.filter((task) => task.done).length;
    return `<article class="note-card${kind === "template" ? " template" : ""}">
      <button type="button" class="note-card-open" data-nl="open" data-id="${escape(note.id)}">
        <span class="note-card-top"><span class="note-card-icon">${icon(kind === "template" ? "template" : "note")}</span><strong class="note-card-title${note.title.trim() ? "" : " untitled"}">${escape(noteTitle(note))}</strong></span>
        ${note.subtitle.trim() ? `<span class="note-card-subtitle">${escape(note.subtitle.trim())}</span>` : ""}
        <span class="note-card-preview">${escape(text || (kind === "template" ? "Modelo vazio" : "Nota vazia"))}</span>
      </button>
      <div class="note-card-foot"><time class="note-card-date">${editedLabel.format(new Date(note.updatedAt))}</time>
        ${kit.projectChip(note.projectId)}
        ${tasks.length ? `<span class="note-card-tasks"${done === tasks.length ? " data-done" : ""}>${icon("checklist")}${done}/${tasks.length}</span>` : ""}
        ${kind === "template" ? `<button type="button" class="button note-use" data-nl="use" data-id="${escape(note.id)}">Usar</button>` : ""}</div>
      <div class="note-card-actions">
        <button type="button" class="note-card-action" data-nl="duplicate" data-id="${escape(note.id)}" title="Duplicar" aria-label="Duplicar">${icon("copy")}</button>
        <button type="button" class="note-card-action" data-nl="delete" data-id="${escape(note.id)}" title="Excluir" aria-label="Excluir">${icon("trash")}</button>
      </div>
    </article>`;
  }

  function render() {
    const crumb = $("#current-crumb");
    crumb.hidden = scope !== "templates";
    crumb.textContent = "Modelos";
    const items = entries();
    const filtering = query.trim() || projectFilter || onlyPending;
    let body;
    if (!items.length) {
      body = `<div class="crm-panel">${filtering
        ? kit.emptyState("search", "Nada encontrado", "Tente outra palavra ou limpe os filtros.", '<div class="crm-empty-action"><button type="button" class="button" data-nl="clear">Limpar filtros</button></div>')
        : scope === "templates"
          ? kit.emptyState("template", "Nenhum modelo ainda", "Modelos são estruturas prontas para novas notas, como atas e roteiros.", `<div class="crm-empty-action"><button type="button" class="button" data-nl="suggest">Adicionar modelos sugeridos</button><button type="button" class="button primary" data-nl="new-template">Novo modelo</button></div>`)
          : kit.emptyState("note", "Você ainda não tem notas", "Crie uma nota em branco ou comece a partir de um modelo.", '<div class="crm-empty-action"><button type="button" class="button primary" data-nl="new">Nova nota</button></div>')}</div>`;
    } else if (view === "grid") {
      body = `<div class="notes-grid">${items.map(cardHtml).join("")}</div>`;
    } else {
      body = `<div class="task-table-wrap tk-table-wrap"><table class="task-table tk-table nl-table">
        <thead><tr><th>${scope === "templates" ? "Modelo" : "Nota"}</th><th>Projeto</th><th>Checklist</th><th>Editada</th></tr></thead>
        ${groupsOf(items).map(([key, label, list]) => `<tbody class="tk-group">
          <tr class="tk-group-row"><th colspan="4"><div class="tk-group-head">
            <button type="button" class="crm-collapse" data-nl="collapse" data-group="${key}" aria-expanded="${!collapsed.has(key)}" aria-label="${collapsed.has(key) ? "Expandir" : "Recolher"} ${label}">${icon("chevron")}</button>
            <strong>${label}</strong><small>${list.length}</small></div></th></tr>
          ${collapsed.has(key) ? "" : list.map(rowHtml).join("")}</tbody>`).join("")}
      </table></div>`;
    }
    results.innerHTML = toolbar() + body;
  }

  function show() {
    active = undefined;
    formatting.close();
    editor.hidden = true;
    library.hidden = false;
    render();
  }

  function newMenu(anchor) {
    const templates = [...templateList()].sort((a, b) => noteTitle(a).localeCompare(noteTitle(b), "pt-BR"));
    kit.menu(anchor, [
      { label: "Nota em branco", icon: "note", action: createNote },
      ...(templates.length ? ["-", { heading: "A partir de um modelo" }, ...templates.slice(0, 8).map((item) => ({ label: noteTitle(item), icon: "template", action: () => useTemplate(item) }))] : []),
      "-",
      { label: "Novo modelo", icon: "plus", action: createTemplate },
      { label: "Ver todos os modelos", icon: "template", action: () => { scope = "templates"; show(); } },
    ], { align: "end" });
  }

  results.addEventListener("click", (event) => {
    const button = event.target.closest("[data-nl]");
    if (!button) return;
    const { nl: action, id } = button.dataset;
    const kind = scope === "templates" ? "template" : "note";
    const item = id ? listFor(kind).find((entry) => entry.id === id) : undefined;
    const handlers = {
      open: () => openNote(item, kind),
      use: () => useTemplate(item),
      duplicate: () => {
        const copy = duplicate(item, kind);
        render();
        kit.toast(`Cópia criada: “${noteTitle(copy)}”.`, ["Abrir", () => openNote(copy, kind)]);
      },
      delete: () => remove(item, kind),
      pending: () => { onlyPending = !onlyPending; render(); },
      scope: () => { scope = scope === "templates" ? "notes" : "templates"; onlyPending = false; render(); },
      view: () => { view = button.dataset.view; render(); },
      collapse: () => { if (!collapsed.delete(button.dataset.group)) collapsed.add(button.dataset.group); render(); },
      clear: () => { query = ""; projectFilter = ""; onlyPending = false; render(); },
      suggest: addSuggestions,
      new: createNote,
      "new-template": createTemplate,
    };
    handlers[action]?.();
  });
  results.addEventListener("input", (event) => {
    if (event.target.dataset.nlFilter !== "query") return;
    query = event.target.value;
    const caret = event.target.selectionStart;
    render();
    const field = results.querySelector('[data-nl-filter="query"]');
    field.focus();
    field.setSelectionRange(caret, caret);
  });
  results.addEventListener("change", (event) => {
    const filter = event.target.dataset.nlFilter;
    if (filter === "project") projectFilter = event.target.value;
    if (filter === "sort") sort = event.target.value;
    if (filter === "project" || filter === "sort") render();
  });

  function addSuggestions() {
    for (const [name, description, markup] of suggestions) {
      templateList().push({ id: crypto.randomUUID(), title: name, subtitle: description, body: markup, updatedAt: Date.now() });
    }
    changed();
    render();
  }

  /* ---------- Editor ---------- */

  function updateCrumb() {
    const crumb = $("#current-crumb");
    crumb.hidden = false;
    crumb.textContent = activeKind === "template" ? `Modelo · ${noteTitle(active)}` : noteTitle(active);
  }

  function updateMeta() {
    if (!active) return;
    const words = (body.innerText.match(/\S+/g) ?? []).length;
    meta.textContent = `${words} ${words === 1 ? "palavra" : "palavras"} · Editado em ${editedLabel.format(new Date(active.updatedAt))}`;
  }

  function grow(field) {
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }

  /* Where this note is used: mind map cards and project. */
  function renderBacklinks(note, kind) {
    const box = $("#note-backlinks");
    const uses = kind === "note" ? (workspace.maps ?? []).flatMap((map) => map.nodes.filter((node) => node.noteId === note.id).map((node) => ({ map, node }))) : [];
    const project = kind === "note" ? kit.project(note.projectId) : undefined;
    const linkedTasks = kind === "note" ? (workspace.tasks ?? []).filter((task) => (task.noteIds ?? []).includes(note.id)) : [];
    box.hidden = !uses.length && !project && !linkedTasks.length;
    if (box.hidden) return box.replaceChildren();
    box.innerHTML = `<span class="note-backlinks-label">${icon("link")}Vínculos</span>
      ${uses.map(({ map, node }) => `<button type="button" class="note-backlink" data-backlink-map="${escape(map.id)}" data-backlink-node="${escape(node.id)}" title="Abrir o mapa neste card">
        ${icon("map")}<span>${escape(map.title || "Mapa sem título")}</span>${icon("chevron-right")}<strong>${escape(node.title || "Card sem título")}</strong></button>`).join("")}
      ${linkedTasks.map((task) => `<button type="button" class="note-backlink" data-backlink-task="${escape(task.id)}" title="Abrir a tarefa">
        ${icon("check")}<span>${escape(tasks.code(task))}</span>${icon("chevron-right")}<strong>${escape(task.title)}</strong></button>`).join("")}
      ${project ? `<button type="button" class="note-backlink" data-backlink-project="${escape(project.id)}" title="Abrir o projeto">${icon("folder")}<span>Projeto</span>${icon("chevron-right")}<strong>${escape(project.name)}</strong></button>` : ""}`;
  }
  $("#note-backlinks").addEventListener("click", (event) => {
    const button = event.target.closest(".note-backlink");
    if (!button) return;
    if (button.dataset.backlinkProject) return projects.open(button.dataset.backlinkProject);
    if (button.dataset.backlinkTask) {
      formatting.close();
      return tasks.openPage(button.dataset.backlinkTask);
    }
    formatting.close();
    openMapAt(button.dataset.backlinkMap, button.dataset.backlinkNode);
  });

  function openNote(note, kind = "note") {
    active = note;
    renderBacklinks(note, kind);
    activeKind = kind;
    editor.dataset.kind = kind;
    kindBadge.hidden = kind !== "template";
    title.placeholder = kind === "template" ? "Nome do modelo" : "Sem título";
    title.value = note.title;
    subtitle.value = note.subtitle;
    formatting.load(note.body);
    library.hidden = true;
    editor.hidden = false;
    grow(title);
    grow(subtitle);
    updateCrumb();
    updateMeta();
    window.scrollTo(0, 0);
    if (!note.title.trim()) title.focus();
  }

  function updateNote() {
    if (!active) return;
    const fields = { title: title.value, subtitle: subtitle.value, body: formatting.html() };
    if (Object.entries(fields).every(([key, value]) => active[key] === value)) return;
    Object.assign(active, fields, { updatedAt: Date.now() });
    updateCrumb();
    updateMeta();
    changed(300);
  }

  function createNote() {
    const note = { id: crypto.randomUUID(), title: "", subtitle: "", body: "", updatedAt: Date.now() };
    noteList().push(note);
    scope = "notes";
    openNote(note, "note");
    changed();
  }

  function createTemplate() {
    const template = { id: crypto.randomUUID(), title: "", subtitle: "", body: "", updatedAt: Date.now() };
    templateList().push(template);
    scope = "templates";
    openNote(template, "template");
    changed();
  }

  for (const field of [title, subtitle]) {
    field.addEventListener("input", () => {
      if (/[\r\n]/.test(field.value)) {
        const caret = field.selectionStart;
        field.value = field.value.replace(/[\r\n]+/g, " ");
        field.setSelectionRange(caret, caret);
      }
      grow(field);
      updateNote();
    });
  }
  title.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || (event.key === "ArrowDown" && title.selectionStart === title.value.length)) {
      event.preventDefault();
      subtitle.focus();
      subtitle.setSelectionRange(0, 0);
    }
  });
  subtitle.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || (event.key === "ArrowDown" && subtitle.selectionStart === subtitle.value.length)) {
      event.preventDefault();
      body.focus();
      const selection = window.getSelection();
      selection.selectAllChildren(body);
      selection.collapseToStart();
    } else if ((event.key === "Backspace" && !subtitle.value) || (event.key === "ArrowUp" && subtitle.selectionStart === 0)) {
      event.preventDefault();
      title.focus();
      title.setSelectionRange(title.value.length, title.value.length);
    }
  });
  window.addEventListener("resize", () => {
    if (!editor.hidden) {
      grow(title);
      grow(subtitle);
    }
  });

  $("#notes-library").addEventListener("click", (event) => {
    const button = event.target.closest("[data-notes-new]");
    if (button) newMenu(button);
  });
  $("#note-create").addEventListener("click", createNote);

  $("#note-back").addEventListener("click", () => {
    show();
  });
  $("#note-delete").addEventListener("click", () => {
    const item = active;
    const kind = activeKind;
    show();
    remove(item, kind);
  });
  $("#note-duplicate").addEventListener("click", () => {
    const copy = duplicate(active, activeKind);
    openNote(copy, activeKind);
    kit.toast(`Você está editando a cópia “${noteTitle(copy)}”.`);
  });
  $("#note-save-template").addEventListener("click", () => saveAsTemplate(active));
  $("#note-use-template").addEventListener("click", () => useTemplate(active));

  function createNoteRecord(titleText = "") {
    const note = { id: crypto.randomUUID(), title: titleText, subtitle: "", body: "", updatedAt: Date.now() };
    noteList().push(note);
    changed();
    return note;
  }

  function openById(id) {
    const note = noteList().find((item) => item.id === id);
    if (!note) return false;
    scope = "notes";
    openNote(note, "note");
    return true;
  }

  return {
    show, valid, openById, createNoteRecord, toggleTask,
    pendingTasks: () => noteList().flatMap(tasksOf).filter((task) => !task.done),
    newNote: createNote,
    newTemplate: createTemplate,
    openTemplate: (id) => {
      const template = templateList().find((item) => item.id === id);
      if (!template) return;
      scope = "templates";
      openNote(template, "template");
    },
    useTemplate: (id) => {
      const template = templateList().find((item) => item.id === id);
      if (template) useTemplate(template);
    },
  };
})();
