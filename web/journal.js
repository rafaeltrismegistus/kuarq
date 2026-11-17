"use strict";

const journal = (() => {
  const content = $("#journal-content");
  const longDay = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const weekdayShort = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const { escape } = kit;
  let selected = kit.today();
  let formatting;
  let editorBody;

  const all = () => workspace.journal ??= [];
  const entry = (date) => all().find((item) => item.date === date);
  const localDate = (stamp) => kit.today(new Date(stamp));
  const utc = (date) => new Date(`${date}T00:00:00Z`);
  const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);

  function validate(data) {
    const dates = new Set();
    return kit.list(data.journal, (item) => {
      if (!kit.isDate(item.date) || dates.has(item.date) || typeof item.body !== "string" || typeof item.updatedAt !== "number") return false;
      dates.add(item.date);
      return true;
    });
  }

  /* Everything the app knows happened on a given day, as one timeline. */
  function activity(date) {
    const items = [];
    for (const task of workspace.tasks ?? []) {
      if (task.doneAt === date) items.push({ glyph: "check", kind: "Concluída", title: task.title, action: "task", id: task.id, project: task.projectId, order: 3 });
      else if (localDate(task.createdAt) === date) items.push({ glyph: "plus", kind: "Tarefa criada", title: task.title, action: "task", id: task.id, project: task.projectId, at: task.createdAt, order: 4 });
    }
    for (const contact of workspace.contacts ?? []) {
      for (const talk of contact.interactions.filter((item) => item.date === date)) {
        items.push({ glyph: "message", kind: talk.channel, title: `Conversa com ${contact.name}`, note: talk.note, action: "contact", id: contact.id, order: 1 });
      }
    }
    for (const note of workspace.notes ?? []) {
      if (localDate(note.updatedAt) === date) items.push({ glyph: "note", kind: "Nota editada", title: note.title.trim() || "Sem título", action: "note", id: note.id, at: note.updatedAt, order: 5 });
    }
    for (const map of workspace.maps) {
      const stamp = Date.parse(map.updatedAt ?? "");
      if (stamp && localDate(stamp) === date) items.push({ glyph: "map", kind: "Mapa editado", title: map.title, action: "map", id: map.id, at: stamp, order: 6 });
    }
    return items.sort((a, b) => a.order - b.order || (b.at ?? 0) - (a.at ?? 0));
  }

  function hasWriting(date) {
    const item = entry(date);
    return Boolean(item && richText.plainText(item.body));
  }

  function weekStrip() {
    const start = kit.addDays(selected, -utc(selected).getUTCDay());
    const today = kit.today();
    const days = Array.from({ length: 7 }, (_, index) => kit.addDays(start, index));
    return `<div class="journal-week">
      <button type="button" class="crm-picker-nav" data-journal="week" data-step="-7" aria-label="Semana anterior">${icon("chevron-left")}</button>
      <div class="journal-days">${days.map((date) => {
        const busy = activity(date).length;
        return `<button type="button" class="journal-chip" data-journal="day" data-date="${date}" aria-pressed="${date === selected}"${date === today ? " data-today" : ""}${date > today ? " disabled" : ""}>
          <small>${weekdayShort.format(utc(date)).replace(".", "")}</small><strong>${utc(date).getUTCDate()}</strong>
          <span class="journal-dots">${hasWriting(date) ? '<i data-kind="written"></i>' : ""}${busy ? "<i></i>" : ""}</span></button>`;
      }).join("")}</div>
      <button type="button" class="crm-picker-nav" data-journal="week" data-step="7" aria-label="Próxima semana"${kit.addDays(start, 7) > today ? " disabled" : ""}>${icon("chevron-right")}</button>
      <div class="journal-jump">${kit.dateField("", "journal-date", selected, { quick: "past" }).replace('<div class="kit-field"><span></span>', '<div class="kit-field">')}</div>
    </div>`;
  }

  function timeline(date) {
    const items = activity(date);
    if (!items.length) return `<p class="journal-quiet">${date === kit.today() ? "Nada registrado no Kuarq ainda hoje." : "Nenhuma atividade neste dia."}</p>`;
    return `<ol class="journal-timeline">${items.map((item) => `<li>
      <span class="journal-tl-icon" data-glyph="${item.glyph}">${icon(item.glyph)}</span>
      <div class="journal-tl-body">
        <button type="button" data-journal="${item.action}" data-id="${escape(item.id)}">${escape(item.title)}</button>
        <small>${escape(item.kind)}${item.at ? ` · ${time.format(new Date(item.at))}` : ""}</small>
        ${item.note ? `<p>${escape(item.note)}</p>` : ""}
        ${item.project ? kit.projectChip(item.project) : ""}
      </div></li>`).join("")}</ol>`;
  }

  function recent() {
    const items = [...all()].filter((item) => richText.plainText(item.body) && item.date !== selected).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    if (!items.length) return "";
    return kit.panel("Registros anteriores", "book", `<ul class="crm-rows">${items.map((item) => `<li class="notes-recent">
      <button type="button" class="notes-recent-open" data-journal="day" data-date="${item.date}">
        <span class="journal-recent-date"><strong>${utc(item.date).getUTCDate()}</strong><span>${kit.monthShort(item.date)}</span></span>
        <span class="notes-recent-text"><strong>${escape(capital(longDay.format(utc(item.date))))}</strong><small>${escape(richText.plainText(item.body))}</small></span>
      </button></li>`).join("")}</ul>`);
  }

  function render() {
    const today = kit.today();
    const count = activity(selected).length;
    content.innerHTML = `${weekStrip()}
      <div class="journal-layout">
        <article class="crm-panel journal-page">
          <header class="journal-page-head">
            <div><span class="journal-relative">${selected === today ? "Hoje" : kit.relativeDay(selected)}</span><h2>${capital(longDay.format(utc(selected)))}</h2></div>
            ${entry(selected)?.updatedAt ? `<small class="journal-saved">Editado às ${time.format(new Date(entry(selected).updatedAt))}</small>` : ""}
          </header>
          <div id="journal-body-slot"></div>
        </article>
        <aside class="journal-side">
          ${kit.panel(`Atividade do dia${count ? ` <small class="project-tab-count">${count}</small>` : ""}`, "activity", timeline(selected))}
          ${recent()}
        </aside>
      </div>`;
    if (!editorBody) {
      editorBody = Object.assign(document.createElement("div"), { id: "journal-body", contentEditable: "true" });
      editorBody.setAttribute("role", "textbox");
      editorBody.setAttribute("aria-multiline", "true");
      editorBody.setAttribute("aria-label", "Registro do dia");
      editorBody.dataset.placeholder = "Como foi o dia? O que avançou, o que travou, o que fica para amanhã… Selecione um trecho para formatar ou digite “/”.";
      formatting = richText.editor(editorBody, { onEdit: save });
    }
    $("#journal-body-slot").replaceWith(editorBody);
    formatting.load(entry(selected)?.body ?? "");
  }

  function save() {
    if (!editorBody?.isConnected) return;
    const body = formatting.html();
    const existing = entry(selected);
    const empty = !richText.plainText(body) && !/<li|<hr/.test(body);
    if (existing) {
      if (existing.body === body) return;
      if (empty) workspace.journal = all().filter((item) => item !== existing);
      else Object.assign(existing, { body, updatedAt: Date.now() });
    } else if (!empty) {
      all().push({ id: kit.uid(), date: selected, body, updatedAt: Date.now() });
    } else return;
    changed(400);
  }

  function go(date) {
    if (!kit.isDate(date) || date > kit.today()) return;
    selected = date;
    render();
  }

  content.addEventListener("click", (event) => {
    const button = event.target.closest("[data-journal]");
    if (!button) return;
    const { journal: action, id, date } = button.dataset;
    if (action === "day") go(date);
    if (action === "week") go([kit.addDays(selected, Number(button.dataset.step)), kit.today()].sort()[0]);
    if (action === "task") tasks.edit(id);
    if (action === "contact") crm.openContact(id);
    if (action === "note") {
      actions.notes();
      notes.openById(id);
    }
    if (action === "map") {
      const map = workspace.maps.find((item) => item.id === id);
      if (map) openMap(map);
    }
  });
  content.addEventListener("change", (event) => {
    if (event.target.name === "journal-date") go(event.target.value);
  });

  const module = {
    validate,
    show: () => {
      if (selected > kit.today()) selected = kit.today();
      render();
    },
    command: (verb) => { if (verb === "today") go(kit.today()); },
    openToday: () => {
      selected = kit.today();
      kit.open("journal", () => editorBody?.focus());
    },
    entry,
  };
  kit.register("journal", "Diário", module);
  return module;
})();
