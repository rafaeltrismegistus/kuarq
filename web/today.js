"use strict";

const today = (() => {
  const root = $("#today");
  const heading = $("#today-title");
  const subtitle = $("#today-subtitle");
  const content = $("#today-content");
  const dayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const timeLabel = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
  const escape = (value = "") => String(value).replace(/[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  let currentBills = [];
  const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

  function greeting(hour) {
    if (hour < 5) return "Boa noite";
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }

  function when(time) {
    const date = new Date(time);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (date >= start) return `hoje, ${timeLabel.format(date)}`;
    if (date >= start - 86_400_000) return `ontem, ${timeLabel.format(date)}`;
    return dateLabel.format(date).replace(".", "");
  }

  const emptyState = (glyph, title, text) =>
    `<div class="crm-empty-state"><span class="crm-empty-icon">${icon(glyph)}</span><strong>${title}</strong>${text ? `<p>${text}</p>` : ""}</div>`;

  function panel(title, glyph, body, action = "") {
    return `<section class="crm-panel"><header><span class="crm-panel-icon">${icon(glyph)}</span><h2>${title}</h2>${action}</header>${body}</section>`;
  }

  const link = (attributes, text) =>
    `<button type="button" class="crm-link" ${attributes}>${text}${icon("arrow")}</button>`;

  function stat(label, value, hint, glyph, tone, attributes) {
    return `<button type="button" class="crm-stat" data-tone="${tone}" ${attributes}>
      <span class="crm-stat-top"><span class="crm-stat-icon">${icon(glyph)}</span><span>${label}</span></span>
      <strong>${value}</strong><small>${hint}</small></button>`;
  }

  function recentItems() {
    const notes = (workspace.notes ?? []).map((note) => ({
      kind: "note", id: note.id, title: note.title.trim() || "Sem título", time: note.updatedAt,
      detail: richText.plainText(note.body) || note.subtitle || "Nota vazia",
    }));
    const maps = workspace.maps.map((map) => ({
      kind: "map", id: map.id, title: map.title, time: Date.parse(map.updatedAt ?? "") || 0,
      detail: `${plural(map.nodes.length, "tópico", "tópicos")}`,
    }));
    return [...notes, ...maps].filter((item) => item.time).sort((a, b) => b.time - a.time);
  }

  function render() {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const network = crm.summary();
    const checklist = notes.pendingTasks();
    const todayKey = kit.today();
    const dueTasks = tasks.all().filter((task) => task.status !== "done" && ((task.due && task.due <= todayKey) || task.status === "doing" || task.status === "review"))
      .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
    const overdueTasks = dueTasks.filter((task) => task.due && task.due < todayKey).length;
    currentBills = nucleus.upcoming(7);
    const diary = journal.entry(todayKey);
    const recent = recentItems();
    const editedToday = recent.filter((item) => item.time >= start.getTime()).length;
    const birthdaysToday = network.birthdays.filter((item) => item.days === 0);
    const birthdaysWeek = network.birthdays.filter((item) => item.days <= 7);
    const attention = network.due.length + birthdaysToday.length + dueTasks.length + currentBills.filter((item) => item.due <= todayKey).length;

    heading.textContent = greeting(now.getHours());
    const day = dayLabel.format(now);
    subtitle.textContent = `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${attention
      ? `${plural(attention, "item pede", "itens pedem")} sua atenção`
      : "nada pendente por aqui"}`;
    $("#current-crumb").hidden = true;

    const oldest = network.due[0]?.info;
    const stats = `<div class="crm-stats">
      ${stat("Para retomar", network.due.length, oldest ? `Mais antigo: há ${oldest.elapsed} dias` : network.never ? `${plural(network.never, "contato", "contatos")} sem histórico` : "Conversas em dia",
        "message", network.due.length ? "danger" : "muted", 'data-today="crm" data-crm="tab" data-view="follow-up" data-filter="due"')}
      ${stat("Aniversários", birthdaysToday.length, birthdaysToday.length
        ? escape(birthdaysToday.map((item) => item.contact.name.split(/\s+/)[0]).join(", "))
        : birthdaysWeek.length ? `${plural(birthdaysWeek.length, "nos próximos 7 dias", "nos próximos 7 dias")}` : "Nenhum nesta semana",
        "cake", birthdaysToday.length ? "warning" : "muted", 'data-today="crm" data-crm="tab" data-view="birthdays" data-filter="week"')}
      ${stat("Tarefas para hoje", dueTasks.length, overdueTasks ? `${plural(overdueTasks, "atrasada", "atrasadas")}` : dueTasks.length ? "Prazo hoje ou em andamento" : "Nada com prazo hoje",
        "checklist", overdueTasks ? "danger" : "muted", 'data-today="tasks"')}
      ${kit.discreet() || !currentBills.length
        ? stat("Editado hoje", editedToday, recent[0] ? `Último: ${escape(recent[0].title)}` : "Nenhuma edição ainda", "clock", "muted", 'data-today="notes"')
        : stat("Contas a vencer", currentBills.length, currentBills.some((item) => item.late) ? "Há contas atrasadas" : "Nos próximos 7 dias", "calendar",
          currentBills.some((item) => item.late) ? "danger" : "warning", 'data-today="nucleus"')}
    </div>`;

    const followBody = network.due.length
      ? `<ul class="crm-rows">${network.due.slice(0, 6).map(({ contact, info }) => `<li class="crm-queue-row">${crm.contactName(contact)}
          <span class="crm-queue-when">Último contato há ${info.elapsed} dias</span>
          ${crm.followPill(contact, network.today, info)}
          <button type="button" class="button today-log" data-crm="log" data-id="${escape(contact.id)}">${icon("message")}Registrar</button></li>`).join("")}</ul>
        ${network.due.length > 6 ? `<p class="notes-more">+ ${network.due.length - 6} contatos para retomar</p>` : ""}`
      : emptyState("check", "Nenhum contato para retomar", network.total ? "Suas conversas estão em dia." : "Cadastre contatos em Networking para acompanhar conversas.");

    const moduleTaskBody = dueTasks.length
      ? `<ul class="task-rows">${dueTasks.slice(0, 8).map((task) => `<li class="task-row">
          <button type="button" class="task-check" data-today="task-module" data-id="${escape(task.id)}" aria-pressed="false" aria-label="Concluir tarefa">${icon("check")}</button>
          <button type="button" class="task-title" data-today="task-open" data-id="${escape(task.id)}">${escape(task.title)}</button>
          ${["doing", "review", "waiting"].includes(task.status) ? tasks.statusBadge(task.status) : ""}
          <span class="task-row-meta">${kit.projectChip(task.projectId)}${task.due ? `<span class="task-due" data-tone="${task.due < todayKey ? "late" : "today"}">${icon("calendar")}${kit.relativeDay(task.due)}</span>` : ""}</span></li>`).join("")}</ul>
        ${dueTasks.length > 8 ? `<p class="notes-more">+ ${dueTasks.length - 8} tarefas</p>` : ""}`
      : emptyState("check", "Nada com prazo para hoje", "Tarefas atrasadas, com prazo hoje ou em andamento aparecem aqui.");


    const billsBody = `<ul class="crm-rows">${currentBills.map((item, index) => `<li class="nu-due-row">
        <span class="nu-due-date" data-state="${item.late ? "late" : kit.daysUntil(item.due) <= 3 ? "soon" : "open"}"><strong>${item.due.slice(8)}</strong><span>${kit.monthShort(item.due)}</span></span>
        <span class="notes-recent-text"><strong>${escape(item.name)}</strong><small>${item.late ? "Atrasada" : kit.relativeDay(item.due)} · ${kit.formatMoney(item.amount)}</small></span>
        <button type="button" class="button today-log" data-today="pay" data-index="${index}">Pagar</button></li>`).join("")}</ul>`;

    const diaryBody = `<div class="today-diary">${diary && richText.plainText(diary.body)
        ? `<p>${escape(richText.plainText(diary.body).slice(0, 160))}${richText.plainText(diary.body).length > 160 ? "…" : ""}</p>`
        : "<p>Ainda sem registro hoje. Anote o que avançou e o que fica para amanhã.</p>"}
      <button type="button" class="button" data-today="journal">${icon("edit")}${diary ? "Continuar registro" : "Escrever no diário"}</button></div>`;

    const taskBody = checklist.length
      ? `<ul class="notes-tasks">${checklist.slice(0, 8).map((task) => `<li>
          <button type="button" class="notes-task-check" data-today="task" data-note="${escape(task.note.id)}" data-index="${task.index}" aria-label="Concluir “${escape(task.text)}”"></button>
          <span class="notes-task-text"><span>${escape(task.text)}</span>
          <button type="button" class="notes-task-source" data-today="note" data-id="${escape(task.note.id)}">${escape(task.note.title.trim() || "Sem título")}</button></span></li>`).join("")}</ul>
        ${checklist.length > 8 ? `<p class="notes-more">+ ${checklist.length - 8} itens em outras notas</p>` : ""}`
      : emptyState("checklist", "Nenhuma tarefa pendente", "Digite “[] ” em uma nota para criar um checklist.");

    const birthdayBody = birthdaysWeek.length
      ? `<ul class="crm-rows">${birthdaysWeek.map(({ contact, date, days }) => `<li class="crm-birthday-row">${crm.dateBlock(date)}${crm.contactName(contact)}
          <span class="crm-queue-when">${crm.weekday.format(new Date(`${date}T00:00:00Z`))}</span>${crm.birthdayPill(days)}</li>`).join("")}</ul>`
      : emptyState("cake", "Nenhum aniversário nesta semana", "");

    const recentBody = recent.length
      ? `<ul class="crm-rows">${recent.slice(0, 6).map((item) => `<li class="notes-recent">
          <button type="button" class="notes-recent-open" data-today="${item.kind}" data-id="${escape(item.id)}">
            <span class="note-card-icon">${icon(item.kind === "map" ? "map" : "note")}</span>
            <span class="notes-recent-text"><strong>${escape(item.title)}</strong><small>${escape(item.detail)}</small></span>
          </button><time class="crm-queue-when">${when(item.time)}</time></li>`).join("")}</ul>`
      : emptyState("note", "Nada editado ainda", "Notas e mapas recentes aparecem aqui.");

    content.innerHTML = stats + `<div class="crm-overview">
      <div class="crm-overview-main">
        ${panel("Tarefas para hoje", "checklist", moduleTaskBody, link('data-today="tasks"', "Tarefas"))}
        ${panel("Retomar contato", "message", followBody, network.due.length ? link('data-today="crm" data-crm="tab" data-view="follow-up" data-filter="due"', "Follow-up") : "")}
        ${checklist.length ? panel("Checklists das notas", "note", taskBody, link('data-today="notes"', "Notas")) : ""}
      </div>
      <div class="crm-overview-side">
        ${!kit.discreet() && currentBills.length ? panel("Contas a vencer", "calendar", billsBody, link('data-today="nucleus"', "Núcleo")) : ""}
        ${panel("Diário de hoje", "book", diaryBody)}
        ${panel("Continuar de onde parou", "clock", recentBody)}
        ${panel("Aniversários da semana", "cake", birthdayBody, link('data-today="crm" data-crm="tab" data-view="birthdays" data-filter="all"', "Ver todos"))}
      </div>
    </div>`;
  }

  function show() {
    render();
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-today]");
    if (!target || root.hidden) return;
    const { today: action, id } = target.dataset;
    if (action === "crm") actions.crm();
    if (action === "tasks") actions.tasks();
    if (action === "nucleus") actions.nucleus();
    if (action === "journal") journal.openToday();
    if (action === "task-open") tasks.edit(id);
    if (action === "task-module") {
      target.setAttribute("aria-pressed", "true");
      setTimeout(() => {
        tasks.toggle(id);
        if (!root.hidden) render();
      }, 180);
    }
    if (action === "pay") {
      currentBills[Number(target.dataset.index)]?.pay();
      if (!root.hidden) render();
    }
    if (action === "notes") actions.notes();
    if (action === "note") {
      actions.notes();
      notes.openById(id);
    }
    if (action === "map") {
      const map = workspace.maps.find((item) => item.id === id);
      if (map) openMap(map);
    }
    if (action === "task") {
      const note = workspace.notes?.find((item) => item.id === target.dataset.note);
      if (!note) return;
      target.dataset.done = "";
      setTimeout(() => {
        notes.toggleTask(note, Number(target.dataset.index));
        if (!root.hidden) render();
      }, 180);
    }
    if (action === "new-note") {
      actions.notes();
      notes.newNote();
    }
  });

  for (const dialog of [$("#crm-dialog"), $("#edit-dialog"), $("#drawer")]) {
    dialog.addEventListener("close", () => {
      if (!root.hidden) render();
    });
  }

  return { show };
})();
