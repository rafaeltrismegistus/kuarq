"use strict";

const crm = (() => {
  const stages = {
    new: ["Novo contato", "novo"],
    growing: ["Em aproximação", "aproximacao"],
    active: ["Relacionamento ativo", "ativo"],
    paused: ["Em pausa", "pausa"],
  };
  const types = { personal: "Pessoal", business: "Negócios", both: "Ambos" };
  const health = { unrated: "Sem avaliação", healthy: "Saudável", attention: "Atenção", risk: "Em risco" };
  const tabs = { overview: "Visão geral", contacts: "Contatos", birthdays: "Aniversários" };
  const followStates = { due: "Hora de retomar", fresh: "Em dia", never: "Sem histórico", paused: "Em pausa" };
  const windows = { today: "Hoje", week: "Próximos 7 dias", month: "De 8 a 30 dias" };
  const monthNames = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" });
  const interval = 15;
  const dayMs = 86_400_000;
  const root = $("#crm");
  const content = $("#crm-content");
  const modal = $("#crm-dialog");
  const search = $("#crm-search");
  const order = new Intl.Collator("pt-BR", { sensitivity: "base" });
  let view = "overview";
  let mode = "list";
  let birthdayFilter = "all";
  let followFilter = "due";
  let modalContact;
  let contactDraft;
  let drag;
  let swallowClick = false;
  let calendarMonth = 1;
  let pageId;
  let typeFilter = "all";
  let favoritesOnly = false;
  let followOnly = "";
  let bdayMonth = "";
  let bdayDay = "";
  const frequencies = [[7, "Toda semana"], [15, "A cada 15 dias"], [30, "Todo mês"], [60, "A cada 2 meses"], [90, "A cada 3 meses"], [0, "Sem follow-up"]];
  const frequencyKeys = new Set(frequencies.map(([days]) => days));
  const collapsed = new Set();

  const escape = (value = "") => String(value).replace(/[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const fold = (value) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const pad = (value) => String(value).padStart(2, "0");
  const localDay = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const dayNumber = (date) => Date.parse(`${date}T00:00:00Z`) / dayMs;
  const addDays = (date, days) => new Date((dayNumber(date) + days) * dayMs).toISOString().slice(0, 10);
  const dateLabel = (date) => date ? date.split("-").reverse().join("/") : "—";
  const contacts = () => workspace.contacts ??= [];
  const getContact = (id) => contacts().find((contact) => contact.id === id);
  const favoriteFirst = (a, b) => Boolean(b.favorite) - Boolean(a.favorite);
  const lastContact = (contact) => contact.interactions.reduce((last, item) => item.date > last ? item.date : last, "");

  const everyOf = (contact) => contact.followEvery ?? interval;
  /* Next follow-up: a date the person chose, or the last conversation plus the contact's frequency. */
  function nextFollow(contact) {
    if (contact.followNext) return contact.followNext;
    const last = lastContact(contact);
    return last && everyOf(contact) ? addDays(last, everyOf(contact)) : "";
  }

  function followState(contact, today) {
    if (contact.stage === "paused" || contact.followEvery === 0) return "paused";
    const next = nextFollow(contact);
    if (!next) return "never";
    return dayNumber(today) >= dayNumber(next) ? "due" : "fresh";
  }

  function nextBirthday(birthday, today) {
    if (!birthday) return null;
    const [month, day] = birthday.split("-").map(Number);
    const year = Number(today.slice(0, 4));
    const inYear = (candidate) => {
      const lastDay = new Date(Date.UTC(candidate, month, 0)).getUTCDate();
      return `${candidate}-${pad(month)}-${pad(Math.min(day, lastDay))}`;
    };
    const candidate = inYear(year);
    const date = candidate >= today ? candidate : inYear(year + 1);
    const days = dayNumber(date) - dayNumber(today);
    return { date, days, bucket: days === 0 ? "today" : days <= 7 ? "week" : days <= 30 ? "month" : null };
  }

  function upcomingBirthdays(today) {
    return contacts().flatMap((contact) => {
      const birthday = nextBirthday(contact.birthday, today);
      return birthday?.bucket ? [{ contact, ...birthday }] : [];
    }).sort((a, b) => a.days - b.days || order.compare(a.contact.name, b.contact.name));
  }

  function valid(saved) {
    if (saved === undefined) return true;
    if (!Array.isArray(saved)) return false;
    const ids = new Set();
    for (const person of saved) {
      if (!person || ["id", "name", "phone", "email", "met", "description", "birthday"].some((key) => typeof person[key] !== "string") ||
          !person.name.trim() || ids.has(person.id) || !Object.hasOwn(types, person.type) ||
          !Object.hasOwn(stages, person.stage) || (person.health !== undefined && !Object.hasOwn(health, person.health)) ||
          !Array.isArray(person.interactions)) return false;
      if (person.birthday) {
        if (!/^\d{2}-\d{2}$/.test(person.birthday)) return false;
        const date = new Date(`2000-${person.birthday}T00:00:00Z`);
        if (Number.isNaN(date.valueOf()) || date.toISOString().slice(5, 10) !== person.birthday) return false;
      }
      if (person.interactions.some((item) => !item || typeof item.date !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isFinite(dayNumber(item.date)) ||
          addDays(item.date, 0) !== item.date ||
          typeof item.note !== "string" || typeof item.channel !== "string")) return false;
      if (!kit.validLinks(person) || (person.photo !== undefined && !kit.isImage(person.photo))) return false;
      if (person.favorite !== undefined && typeof person.favorite !== "boolean") return false;
      if (person.followEvery !== undefined && !frequencyKeys.has(person.followEvery)) return false;
      if (person.followNext !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(person.followNext) || addDays(person.followNext, 0) !== person.followNext)) return false;
      ids.add(person.id);
    }
    return true;
  }

  function options(values, selected) {
    return Object.entries(values).map(([value, text]) =>
      `<option value="${value}"${value === selected ? " selected" : ""}>${Array.isArray(text) ? text[0] : text}</option>`).join("");
  }

  const hue = (text) => {
    let value = 0;
    for (const char of text) value = (value * 31 + char.codePointAt(0)) >>> 0;
    return value % 8;
  };
  const initials = (name) => {
    const words = name.trim().split(/\s+/);
    const first = (word) => Array.from(word)[0] ?? "";
    return (first(words[0]) + (words.length > 1 ? first(words.at(-1)) : "")).toUpperCase();
  };
  const avatar = (contact) => contact.photo && kit.isImage(contact.photo)
    ? `<span class="crm-avatar has-photo" aria-hidden="true"><img src="${escape(contact.photo)}" alt=""></span>`
    : `<span class="crm-avatar" data-hue="${hue(contact.name)}" aria-hidden="true">${escape(initials(contact.name))}</span>`;
  const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
  const since = (days) => days <= 0 ? "hoje" : days === 1 ? "ontem" : `há ${days} dias`;
  const until = (days) => days <= 0 ? "hoje" : days === 1 ? "amanhã" : `em ${days} dias`;
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" });
  const shortMonth = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
  const latest = (contact) => contact.interactions.reduce((last, item) => !last || item.date >= last.date ? item : last, undefined);

  function follow(contact, today) {
    const state = followState(contact, today);
    const last = latest(contact);
    const next = nextFollow(contact);
    const off = contact.followEvery === 0;
    if (!last && !next) return { state, off, every: everyOf(contact) };
    const elapsed = last ? dayNumber(today) - dayNumber(last.date) : undefined;
    return { state, off, last, elapsed, next, remaining: next ? dayNumber(next) - dayNumber(today) : undefined, every: everyOf(contact), custom: Boolean(contact.followNext) };
  }

  function followText(info) {
    if (info.state === "paused") return info.off ? "Sem follow-up" : "Em pausa";
    if (info.state === "never") return "Sem histórico";
    if (info.remaining === 0) return "Retomar hoje";
    if (info.remaining < 0) return `Atrasado ${plural(-info.remaining, "dia", "dias")}`;
    return `Retomar ${until(info.remaining)}`;
  }

  function contactName(contact) {
    const context = contact.met?.split("\n")[0];
    return `<button type="button" class="crm-person" data-crm="edit" data-id="${escape(contact.id)}">${avatar(contact)}<span class="crm-person-text"><strong>${escape(contact.name)}</strong>${context ? `<small>${escape(context)}</small>` : ""}</span></button>`;
  }

  function starButton(contact, className = "") {
    const on = Boolean(contact.favorite);
    const label = on ? "Remover dos favoritos" : "Favoritar";
    return `<button type="button" class="crm-star ${className}" data-crm="favorite" data-id="${escape(contact.id)}" aria-pressed="${on}" aria-label="${label}: ${escape(contact.name)}" title="${label}">${icon("star")}</button>`;
  }

  function healthPill(contact) {
    const value = contact.health ?? "unrated";
    return `<span class="crm-tag" data-health="${value}"><i aria-hidden="true"></i>${health[value]}</span>`;
  }

  function followPill(contact, today, info = follow(contact, today)) {
    const glyph = { due: "alert", fresh: "clock", never: "message", paused: "pause" }[info.state];
    return `<span class="crm-pill" data-follow="${info.state}"${info.remaining !== undefined && info.remaining <= 0 ? ' data-late=""' : ""}>${icon(glyph)}${followText(info)}</span>`;
  }

  const stageBadge = (stage) => `<span class="crm-stage" data-tone="${stages[stage][1]}"><i aria-hidden="true"></i>${stages[stage][0]}</span>`;
  const empty = (message) => `<p class="crm-empty">${message}</p>`;
  const emptyState = (glyph, title, text) => `<div class="crm-empty-state"><span class="crm-empty-icon">${icon(glyph)}</span><strong>${title}</strong>${text ? `<p>${text}</p>` : ""}</div>`;
  const logButton = (contact, primary = false) => `<button type="button" class="button${primary ? " primary" : ""}" data-crm="log" data-id="${escape(contact.id)}">${icon("message")}Registrar contato</button>`;
  const fill = (value) => `<span class="crm-bar"><span data-fill="${Math.max(0, Math.min(100, Math.round(value)))}"></span></span>`;

  function cardIcons(person, today) {
    const birthday = nextBirthday(person.birthday, today);
    return [
      birthday?.bucket ? `<span class="crm-card-bday" title="Aniversário ${until(birthday.days)}">${icon("cake")}</span>` : "",
      person.phone ? `<span title="${escape(person.phone)}">${icon("phone")}</span>` : "",
      person.email ? `<span title="${escape(person.email)}">${icon("mail")}</span>` : "",
    ].join("");
  }

  function renderContacts(items, today) {
    const query = fold(search.value.trim());
    const filtered = items.filter((person) => (typeFilter === "all" || person.type === typeFilter) && (!favoritesOnly || person.favorite) && (!followOnly || followState(person, today) === followOnly) &&
        fold([person.name, person.phone, person.email, person.met, types[person.type]].join(" ")).includes(query))
      .sort((a, b) => favoriteFirst(a, b) || order.compare(a.name, b.name));
    const narrowed = query || typeFilter !== "all" || favoritesOnly || followOnly;
    $("#crm-count").textContent = filtered.length === items.length
      ? plural(items.length, "contato", "contatos")
      : `${filtered.length} de ${items.length}`;
    const board = mode === "board";
    const grip = `<span class="crm-grip" aria-hidden="true" title="Arrastar para outro estágio">${icon("grip")}</span>`;
    const renderGroup = ([stage, [title, tone]]) => {
      const people = filtered.filter((item) => item.stage === stage);
      const add = `<button type="button" class="crm-add" data-crm="new" data-stage="${stage}">${icon("plus")}<span>Adicionar contato</span></button>`;
      if (board) {
        return `<section class="crm-lane" data-stage="${stage}" data-tone="${tone}" aria-label="${title}">
          <header class="crm-lane-head">${stageBadge(stage)}<small>${people.length}</small>
            <button type="button" class="crm-lane-add" data-crm="new" data-stage="${stage}" title="Adicionar em ${title}" aria-label="Adicionar contato em ${title}">${icon("plus")}</button></header>
          <div class="crm-lane-body">
          ${people.length ? people.map((person) => `<article class="crm-card${person.favorite ? " is-favorite" : ""}" data-drag="${escape(person.id)}">
            <div class="crm-card-head">${contactName(person)}${starButton(person)}<button type="button" class="icon-button crm-card-open" data-crm="page" data-id="${escape(person.id)}" aria-label="Abrir página de ${escape(person.name)}" title="Abrir página">${icon("open")}</button>${grip}</div>
            <div class="crm-card-tags"><span class="crm-tag">${types[person.type]}</span>${healthPill(person)}</div>
            <footer class="crm-card-foot">${followPill(person, today)}<span class="crm-card-icons">${cardIcons(person, today)}</span></footer>
          </article>`).join("") : `<p class="crm-lane-empty">${narrowed ? "Nenhum contato encontrado" : "Arraste contatos para cá"}</p>`}
          </div>
          ${add}
        </section>`;
      }
      const closed = collapsed.has(stage);
      return `<tbody data-stage="${stage}">
        <tr class="crm-group-heading"><th scope="rowgroup" colspan="6"><div class="crm-group-bar">
          <button type="button" class="crm-collapse" data-crm="collapse" data-stage="${stage}" aria-expanded="${!closed}" aria-label="${closed ? "Expandir" : "Recolher"} ${title}">${icon("chevron")}</button>
          ${stageBadge(stage)}<small>${people.length}</small>${add}</div></th></tr>
        ${closed ? "" : people.length ? people.map((person) => {
          const info = follow(person, today);
          const birthday = nextBirthday(person.birthday, today);
          return `<tr class="crm-list-person${person.favorite ? " is-favorite" : ""}" data-drag="${escape(person.id)}">
          <td><div class="crm-list-name">${grip}${starButton(person)}${contactName(person)}<button type="button" class="button crm-row-open" data-crm="page" data-id="${escape(person.id)}" title="Abrir página do contato">${icon("open")}Abrir</button></div></td>
          <td><span class="crm-tag">${types[person.type]}</span></td><td>${healthPill(person)}</td>
          <td>${info.last ? `<span class="crm-cell-date">${dateLabel(info.last.date)}<small>${since(info.elapsed)}</small></span>` : '<span class="crm-faint">—</span>'}</td>
          <td>${followPill(person, today, info)}</td>
          <td>${person.birthday ? `<span class="crm-cell-date">${dateLabel(person.birthday)}${birthday?.bucket ? `<small>${until(birthday.days)}</small>` : ""}</span>` : '<span class="crm-faint">—</span>'}</td>
        </tr>`;
        }).join("") : `<tr class="crm-list-empty"><td colspan="6">${narrowed ? "Nenhum contato encontrado neste estágio" : "Nenhum contato neste estágio"}</td></tr>`}
      </tbody>`;
    };
    const groups = Object.entries(stages).map(renderGroup).join("");
    if (!items.length) {
      return `<div class="crm-panel">${emptyState("people", "Nenhum contato ainda", "Cadastre pessoas para acompanhar conversas, aniversários e follow-ups.")}
        <div class="crm-empty-action"><button type="button" class="button primary" data-crm="new">${icon("plus")}Novo contato</button></div></div>`;
    }
    if (board) {
      return `<div class="crm-board" tabindex="0" aria-label="Kanban de contatos">${groups}</div>`;
    }
    return `<div class="crm-table-wrap" tabindex="0" aria-label="Lista de contatos"><table class="crm-table">
      <thead><tr><th scope="col">Contato</th><th scope="col">Tipo</th><th scope="col">Saúde</th><th scope="col">Último contato</th><th scope="col">Follow-up</th><th scope="col">Aniversário</th></tr></thead>
      ${groups}</table></div>`;
  }

  function panel(title, body, { glyph, action = "", className = "" } = {}) {
    return `<section class="crm-panel ${className}"><header>${glyph ? `<span class="crm-panel-icon">${icon(glyph)}</span>` : ""}<h2>${title}</h2>${action}</header>${body}</section>`;
  }

  const seeAll = (target, filter, text = "Ver tudo") =>
    `<button type="button" class="crm-link" data-crm="tab" data-view="${target}" data-filter="${filter}">${text}${icon("arrow")}</button>`;

  function queueRow(contact, today) {
    const info = follow(contact, today);
    return `<li class="crm-queue-row">${contactName(contact)}
      <span class="crm-queue-when">${info.last ? `Último contato ${since(info.elapsed)}` : "Sem conversa registrada"}</span>
      ${followPill(contact, today, info)}
      <button type="button" class="icon-button" data-crm="log" data-id="${escape(contact.id)}" title="Registrar contato" aria-label="Registrar contato com ${escape(contact.name)}">${icon("message")}</button></li>`;
  }

  function dateBlock(date) {
    const value = new Date(`${date}T00:00:00Z`);
    return `<span class="crm-date-block"><strong>${value.getUTCDate()}</strong><span>${shortMonth.format(value).replace(".", "")}</span></span>`;
  }

  function birthdayPill(days) {
    return `<span class="crm-pill" data-birthday="${days === 0 ? "today" : days <= 7 ? "soon" : "upcoming"}">${icon("cake")}${days === 0 ? "Hoje" : days === 1 ? "Amanhã" : `Em ${days} dias`}</span>`;
  }

  function birthdayRow({ contact, date, days }) {
    return `<li class="crm-birthday-row">${dateBlock(date)}${contactName(contact)}<span class="crm-queue-when">${weekday.format(new Date(`${date}T00:00:00Z`))}</span>${birthdayPill(days)}</li>`;
  }

  function birthdayCard({ contact, date, days }) {
    return `<article class="crm-bday-card"${days === 0 ? ' data-today=""' : ""}>${dateBlock(date)}
      <div class="crm-bday-body">${contactName(contact)}<span class="crm-queue-when">${weekday.format(new Date(`${date}T00:00:00Z`))} · ${dateLabel(date).slice(0, 5)}</span></div>
      ${birthdayPill(days)}</article>`;
  }

  function followCard(contact, today) {
    const info = follow(contact, today);
    const progress = info.last && info.every ? Math.min(100, info.elapsed / info.every * 100) : 0;
    return `<article class="crm-follow-card" data-state="${info.state}"${info.remaining !== undefined && info.remaining <= 0 ? ' data-late=""' : ""}>
      <div class="crm-follow-person">${contactName(contact)}</div>
      <div class="crm-follow-track">
        <div class="crm-follow-dates">
          <span>${info.last ? `${icon("message")}Último contato <strong>${dateLabel(info.last.date)}</strong> · ${escape(info.last.channel)}` : `${icon("message")}Nenhuma conversa registrada`}</span>
          ${info.next ? `<span>${icon("calendar")}Retomar em <strong>${dateLabel(info.next)}</strong></span>` : ""}
        </div>
        ${info.last ? fill(progress) : ""}
        ${info.last?.note ? `<p class="crm-follow-note">${escape(info.last.note)}</p>` : ""}
      </div>
      <div class="crm-follow-actions">${followPill(contact, today, info)}${logButton(contact, info.state !== "fresh")}</div>
    </article>`;
  }

  function agenda(filters, selected, label) {
    return `<div class="crm-filters" role="group" aria-label="${label}">${filters.map(([key, title, entries, glyph]) =>
      `<button type="button" class="crm-filter" data-crm="filter" data-filter="${key}" aria-pressed="${key === selected}">${glyph ? icon(glyph) : ""}${title}<span>${entries.length}</span></button>`).join("")}</div>`;
  }

  /* Birthdays on a month calendar, like the task calendar. */
  function birthdaysOn(date) {
    const md = date.slice(5);
    const year = Number(date.slice(0, 4));
    const leap = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
    return contacts().filter((person) => person.birthday === md || (!leap && md === "02-28" && person.birthday === "02-29"))
      .sort((a, b) => favoriteFirst(a, b) || order.compare(a.name, b.name));
  }

  function birthdayCalendar(today) {
    bdayMonth ||= today.slice(0, 7);
    bdayDay ||= today;
    const first = new Date(`${bdayMonth}-01T00:00:00Z`);
    const start = addDays(`${bdayMonth}-01`, -first.getUTCDay());
    const cells = Array.from({ length: 42 }, (_, index) => addDays(start, index));
    const monthName = monthTitle.format(first).replace(/^./, (letter) => letter.toUpperCase());
    const inMonth = contacts().filter((person) => person.birthday?.slice(0, 2) === bdayMonth.slice(5)).length;
    const selected = birthdaysOn(bdayDay);
    const upcoming = upcomingBirthdays(today);
    const missing = contacts().filter((person) => !person.birthday);
    const dayTitle = bdayDay === today ? `Hoje · ${dateLabel(bdayDay).slice(0, 5)}` : `${weekday.format(new Date(`${bdayDay}T00:00:00Z`)).replace(/^./, (letter) => letter.toUpperCase())} · ${dateLabel(bdayDay).slice(0, 5)}`;
    return `<div class="tk-calendar crm-bday-calendar">
      <div class="crm-panel tk-month">
        <header class="tk-month-head">
          <button type="button" class="crm-picker-nav" data-crm="bday-month" data-step="-1" aria-label="Mês anterior">${icon("chevron-left")}</button>
          <strong>${monthName}</strong>
          <button type="button" class="crm-picker-nav" data-crm="bday-month" data-step="1" aria-label="Próximo mês">${icon("chevron-right")}</button>
          ${bdayMonth !== today.slice(0, 7) ? `<button type="button" class="crm-link" data-crm="bday-today">Hoje</button>` : ""}
          <span class="tk-spacer"></span>
          <small class="crm-faint">${plural(inMonth, "aniversário", "aniversários")} no mês</small>
        </header>
        <div class="tk-weekdays">${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => `<span>${day}</span>`).join("")}</div>
        <div class="tk-days">${cells.map((date) => {
          const people = birthdaysOn(date);
          return `<div class="tk-day" data-day="${date}"${date.slice(0, 7) !== bdayMonth ? " data-outside" : ""}${date === today ? " data-today" : ""}${date === bdayDay ? " data-selected" : ""}>
            <button type="button" class="tk-day-number" data-crm="bday-day" data-date="${date}">${Number(date.slice(8))}</button>
            ${people.slice(0, 3).map((person) => `<button type="button" class="tk-cal-task crm-cal-bday" data-crm="bday-day" data-date="${date}" title="Aniversário de ${escape(person.name)}">${avatar(person)}<span>${escape(person.name.split(/\s+/)[0])}</span></button>`).join("")}
            ${people.length > 3 ? `<button type="button" class="tk-cal-more" data-crm="bday-day" data-date="${date}">+${people.length - 3}</button>` : ""}
          </div>`;
        }).join("")}</div>
      </div>
      <aside class="crm-bday-side">
        <section class="crm-panel tk-dayside">
          <header><h2>${dayTitle}</h2><small>${plural(selected.length, "aniversário", "aniversários")}</small></header>
          ${selected.length ? `<ul class="crm-rows">${selected.map((person) => `<li>${contactName(person)}
            <button type="button" class="icon-button" data-crm="log-channel" data-channel="WhatsApp" data-id="${escape(person.id)}" title="Registrar os parabéns" aria-label="Registrar os parabéns para ${escape(person.name)}">${icon("message")}</button></li>`).join("")}</ul>`
            : `<p class="crm-faint crm-bday-none">Nenhum aniversário neste dia.</p>`}
        </section>
        ${panel("Próximos 30 dias", upcoming.length ? `<ul class="crm-rows">${upcoming.slice(0, 8).map(birthdayRow).join("")}</ul>`
          : emptyState("cake", "Nenhum aniversário próximo", "Nos próximos 30 dias."), { glyph: "cake" })}
        ${missing.length ? `<p class="crm-hint">${icon("info")}${plural(missing.length, "contato está", "contatos estão")} sem aniversário: ${missing.slice(0, 4).map((person) => `<button type="button" class="crm-link" data-crm="edit" data-id="${escape(person.id)}">${escape(person.name.split(/\s+/)[0])}</button>`).join(", ")}${missing.length > 4 ? "…" : ""}</p>` : ""}
      </aside>
    </div>`;
  }

  function overview(items, today) {
    const infos = new Map(items.map((person) => [person, follow(person, today)]));
    const inState = (state) => items.filter((person) => infos.get(person).state === state);
    const due = inState("due").sort((a, b) => lastContact(a).localeCompare(lastContact(b)));
    const fresh = inState("fresh").sort((a, b) => lastContact(a).localeCompare(lastContact(b)));
    const never = inState("never");
    const birthdays = upcomingBirthdays(today);
    const todayBirthdays = birthdays.filter((item) => item.bucket === "today");
    const recent = items.flatMap((contact) => contact.interactions.map((item, index) => ({ contact, item, index })))
      .sort((a, b) => b.item.date.localeCompare(a.item.date) || b.index - a.index).slice(0, 5);
    const active = items.filter((person) => person.stage === "active").length;
    const oldest = due[0] && infos.get(due[0]);
    const stats = [
      ["Contatos", items.length, "contacts", "", "people", "accent",
        items.length ? `${plural(active, "em relacionamento ativo", "em relacionamento ativo")}` : "Cadastre seu primeiro contato"],
      ["Hora de retomar", due.length, "follow-up", "due", "alert", due.length ? "danger" : "success",
        oldest?.elapsed !== undefined ? `Mais antigo: ${since(oldest.elapsed)}` : never.length ? `${plural(never.length, "contato", "contatos")} sem histórico` : "Tudo em dia"],
      ["Aniversários hoje", todayBirthdays.length, "birthdays", "today", "cake", todayBirthdays.length ? "warning" : "muted",
        todayBirthdays.length ? todayBirthdays.map((item) => escape(item.contact.name.split(/\s+/)[0])).join(", ") : "Ninguém hoje"],
      ["Próximos 30 dias", birthdays.length, "birthdays", "all", "calendar", "info",
        birthdays[0] ? `${escape(birthdays[0].contact.name.split(/\s+/)[0])} ${until(birthdays[0].days)}` : "Nenhum previsto"],
    ];
    const statCards = `<div class="crm-stats">${stats.map(([title, count, target, filter, glyph, tone, hint]) =>
      `<button type="button" class="crm-stat" data-crm="tab" data-view="${target}" data-filter="${filter}" data-tone="${tone}">
        <span class="crm-stat-top"><span class="crm-stat-icon">${icon(glyph)}</span><span>${title}</span></span>
        <strong>${count}</strong><small>${hint}</small></button>`).join("")}</div>`;

    const queue = [...due, ...fresh].sort(favoriteFirst).slice(0, 6);
    const favorites = items.filter((person) => person.favorite).sort((a, b) => order.compare(a.name, b.name));
    const favoritePanel = favorites.length
      ? panel(`Favoritos <small class="tkp-count">${favorites.length}</small>`, `<ul class="crm-rows">${favorites.slice(0, 6).map((person) => queueRow(person, today)).join("")}</ul>`,
        { glyph: "star", action: `<button type="button" class="crm-link" data-crm="favorites-view">Ver na lista${icon("arrow")}</button>` })
      : "";
    const queueBody = queue.length
      ? `<ul class="crm-rows">${queue.map((person) => queueRow(person, today)).join("")}</ul>`
      : emptyState("check", "Nenhum follow-up pendente", items.length ? "Registre conversas para montar sua fila de retomadas." : "Cadastre contatos para começar.");
    const neverNotice = never.length
      ? `<button type="button" class="crm-notice" data-crm="tab" data-view="follow-up" data-filter="never">${icon("sparkle")}<span><strong>${plural(never.length, "contato", "contatos")}</strong> ainda sem conversa registrada</span>${icon("chevron-right")}</button>`
      : "";

    const activity = recent.length
      ? `<ol class="crm-activity">${recent.map(({ contact, item }) => `<li>${avatar(contact)}<div>
          <p><button type="button" class="crm-inline-name" data-crm="edit" data-id="${escape(contact.id)}">${escape(contact.name)}</button> <span>· ${escape(item.channel)}</span></p>
          ${item.note ? `<small>${escape(item.note)}</small>` : ""}</div>
          <time datetime="${item.date}">${since(dayNumber(today) - dayNumber(item.date))}</time></li>`).join("")}</ol>`
      : emptyState("activity", "Sem atividade recente", "As conversas registradas aparecem aqui.");

    const total = items.length || 1;
    const pipeline = `<ul class="crm-pipeline">${Object.entries(stages).map(([stage, [title, tone]]) => {
      const count = items.filter((person) => person.stage === stage).length;
      return `<li data-tone="${tone}"><div><span><i aria-hidden="true"></i>${title}</span><strong>${count}</strong></div>${fill(count / total * 100)}</li>`;
    }).join("")}</ul>`;

    const healthCounts = Object.keys(health).map((key) => [key, items.filter((person) => (person.health ?? "unrated") === key).length]);
    const healthBody = `<div class="crm-health-bar" aria-hidden="true">${healthCounts.filter(([, count]) => count)
      .map(([key, count]) => `<span data-health="${key}" data-fill="${count / total * 100}"></span>`).join("")}</div>
      <ul class="crm-health-legend">${healthCounts.map(([key, count]) => `<li data-health="${key}"><i aria-hidden="true"></i>${health[key]}<strong>${count}</strong></li>`).join("")}</ul>`;

    const birthdayBody = birthdays.length
      ? `<ul class="crm-rows">${birthdays.slice(0, 4).map(birthdayRow).join("")}</ul>`
      : emptyState("cake", "Nenhum aniversário próximo", "Nos próximos 30 dias.");

    return statCards + `<div class="crm-overview">
      <div class="crm-overview-main">
        ${favoritePanel}
        ${panel("Fila de follow-up", queueBody + neverNotice, { glyph: "message", action: seeAll("follow-up", due.length ? "due" : "fresh") })}
        ${panel("Atividade recente", activity, { glyph: "activity" })}
      </div>
      <div class="crm-overview-side">
        ${panel("Pipeline", pipeline, { glyph: "chart", action: seeAll("contacts", "", "Abrir") })}
        ${panel("Saúde da rede", healthBody, { glyph: "heart" })}
        ${panel("Aniversários", birthdayBody, { glyph: "cake", action: seeAll("birthdays", "all") })}
      </div>
    </div>`;
  }

  function render() {
    finishDrag();
    const today = localDay();
    const items = contacts();
    const pagePerson = pageId ? getContact(pageId) : undefined;
    if (!pagePerson) pageId = undefined;
    $("#current-crumb").hidden = false;
    $("#current-crumb").textContent = pagePerson ? pagePerson.name : tabs[view];
    $("#crm-tools").hidden = view !== "contacts" || Boolean(pagePerson);
    const followChip = $('#crm-tools [data-crm="follow-filter"] span:last-child');
    if (followChip) followChip.textContent = followOnly === "never" ? "Sem histórico" : followOnly === "fresh" ? "Em dia" : "A retomar";
    root.dataset.page = pagePerson ? "contact" : "";
    root.dataset.view = view;
    for (const button of root.querySelectorAll('[data-view], [data-type], [data-crm="favorites"], [data-crm="follow-filter"]')) {
      const selected = button.dataset.crm === "type" ? button.dataset.type === typeFilter
        : button.dataset.crm === "favorites" ? favoritesOnly
        : button.dataset.crm === "follow-filter" ? Boolean(followOnly)
        : button.dataset.view === (button.dataset.crm === "mode" ? mode : view);
      button.setAttribute("aria-pressed", String(selected));
    }
    if (pagePerson) {
      content.innerHTML = contactPage(pagePerson, today);
      for (const bar of content.querySelectorAll(".crm-fu [data-fill]")) bar.style.width = `${bar.dataset.fill}%`;
      for (const field of content.querySelectorAll(".crm-page-text")) grow(field);
    } else if (view === "contacts") {
      content.innerHTML = renderContacts(items, today);
    } else if (view === "birthdays") {
      content.innerHTML = birthdayCalendar(today);
    } else if (view === "follow-up") {
      const states = new Map(items.map((item) => [item, followState(item, today)]));
      const byLast = (a, b) => favoriteFirst(a, b) || lastContact(a).localeCompare(lastContact(b));
      const lists = {
        due: items.filter((item) => states.get(item) === "due").sort(byLast),
        never: items.filter((item) => states.get(item) === "never").sort((a, b) => favoriteFirst(a, b) || order.compare(a.name, b.name)),
        fresh: items.filter((item) => states.get(item) === "fresh").sort(byLast),
      };
      const messages = {
        due: ["check", "Nenhum contato para retomar agora", "Quando uma conversa passar de 15 dias, o contato aparece aqui."],
        never: ["sparkle", "Todos os contatos têm histórico", "Contatos sem conversa registrada aparecem aqui."],
        fresh: ["clock", "Nenhum follow-up previsto", "Registre uma conversa para agendar a próxima retomada."],
      };
      const current = lists[followFilter];
      content.innerHTML = agenda([
        ["due", "A retomar", lists.due, "alert"], ["never", "Sem histórico", lists.never, "sparkle"], ["fresh", "Em dia", lists.fresh, "check"],
      ], followFilter, "Filtrar follow-up")
        + `<p class="crm-hint">${icon("clock")}A próxima retomada é calculada ${interval} dias após a conversa mais recente. Contatos em pausa ficam fora da fila.</p>`
        + (current.length ? `<div class="crm-follow-list">${current.map((person) => followCard(person, today)).join("")}</div>`
          : `<div class="crm-panel">${emptyState(...messages[followFilter])}</div>`);
    } else {
      content.innerHTML = overview(items, today);
    }
    for (const bar of content.querySelectorAll("[data-fill]")) {
      const value = `${bar.dataset.fill}%`;
      if (bar.closest(".crm-health-bar")) bar.style.flexBasis = value;
      else bar.style.width = value;
    }
  }

  function show() {
    pageId = undefined;
    render();
  }

  function grow(field) {
    field.style.height = "auto";
    field.style.height = `${Math.max(field.scrollHeight, 64)}px`;
  }

  document.addEventListener("DOMContentLoaded", () => kit.registerLinks("contact", {
    keys: ["whatsapp", "instagram", "linkedin", "site", "youtube", "github"],
    find: (id) => getContact(id),
    name: (person) => person.name,
    info: "Perfis e canais deste contato. O WhatsApp usa o telefone cadastrado quando você não informa outro.",
    derived: (person, key) => key === "whatsapp" && person.phone.replace(/\D/g, "").length >= 10 ? person.phone : "",
    placeholder: (person, key) => key === "whatsapp" && person.phone ? `Usando o telefone ${person.phone}` : "",
  }));

  /* ---------- Full page (like the task page) ---------- */
  const channelGlyph = (name) => (channels.find(([channel]) => channel === name) ?? ["", "sparkle"])[1];
  function contactPage(person, today) {
    const info = follow(person, today);
    const birthday = nextBirthday(person.birthday, today);
    const logs = [...person.interactions].reverse().sort((a, b) => b.date.localeCompare(a.date));
    const clientOf = (workspace.projects ?? []).filter((project) => project.clientId === person.id);
    const facts = [
      ["phone", "Telefone", person.phone ? escape(person.phone) : ""],
      ["mail", "E-mail", person.email ? `<button type="button" class="crm-fact-link" data-ql-open="mailto:${escape(person.email)}">${escape(person.email)}</button>` : ""],
      ["people", "Tipo", types[person.type]],
      ["chart", "Saúde", healthPill(person)],
      ["cake", "Aniversário", person.birthday ? `${dateLabel(person.birthday)}${birthday?.bucket ? ` · ${until(birthday.days)}` : ""}` : ""],
      ["message", "Último contato", info.last ? `${dateLabel(info.last.date)} · ${since(info.elapsed)}` : ""],
      ["clock", "Retomar", info.next && info.state !== "paused" ? `${dateLabel(info.next)}` : ""],
    ];
    return `<div class="tkp crm-page" data-crm-page="${escape(person.id)}">
      <div class="tkp-top">
        <button type="button" class="note-ghost" data-crm="page-back">${icon("back")}<span>Contatos</span></button>
        <span class="tk-spacer"></span>
        <button type="button" class="icon-button" data-crm="page-menu" data-id="${escape(person.id)}" aria-label="Mais ações" title="Mais ações">${icon("more")}</button>
      </div>
      <header class="crm-page-head">
        <button type="button" class="crm-page-avatar" data-crm="page-photo" data-id="${escape(person.id)}" title="${person.photo ? "Trocar a foto" : "Colocar uma foto"}" aria-label="${person.photo ? "Trocar a foto" : "Colocar uma foto"}">${avatar(person)}<span class="crm-page-avatar-edit">${icon("image")}</span></button>
        <div class="crm-page-title">
          <h2>${escape(person.name)}${starButton(person, "crm-page-star")}</h2>
          <div class="crm-page-pills">
            <button type="button" class="crm-page-stage" data-crm="page-stage" data-id="${escape(person.id)}" title="Mudar estágio">${stageBadge(person.stage)}${icon("chevron")}</button>
            ${followPill(person, today, info)}<span class="crm-tag">${types[person.type]}</span>
          </div>
        </div>
        <div class="crm-page-actions">
          <button type="button" class="button" data-crm="edit" data-id="${escape(person.id)}">${icon("edit")}Editar</button>
          ${logButton(person, true)}
        </div>
      </header>
      <div class="tkp-grid">
        <div class="tkp-main">
          ${kit.panel("Follow-up", "message", followPanel(person, today))}
          ${kit.panel("Como se conheceram", "sparkle", `<textarea class="crm-page-text" data-crm-field="met" maxlength="1500" placeholder="Onde se conheceram e o que vale lembrar desse primeiro contato?" aria-label="Como se conheceram">${escape(person.met)}</textarea>`)}
          ${kit.panel("Observações", "note", `<textarea class="crm-page-text" data-crm-field="description" maxlength="1500" placeholder="Interesses, família, preferências, combinados…" aria-label="Observações">${escape(person.description)}</textarea>`)}
          ${kit.panel(`Conversas <small class="tkp-count">${logs.length || ""}</small>`, "message", logs.length
            ? `<ol class="crm-page-log">${logs.map((item) => `<li><span class="crm-page-log-icon">${icon(channelGlyph(item.channel))}</span>
                <div><strong>${escape(item.channel)}</strong><time>${dateText(item.date)}</time>${item.note ? `<p>${escape(item.note)}</p>` : ""}</div></li>`).join("")}</ol>`
            : `<p class="project-empty-line">Nenhuma conversa registrada. Registre a primeira para começar o follow-up.</p>`,
            `<button type="button" class="crm-link" data-crm="log" data-id="${escape(person.id)}">${icon("plus")}Registrar</button>`)}
        </div>
        <aside class="tkp-side">
          ${kit.panel("Links rápidos", "chain", kit.quickLinks("contact", person), kit.quickLinksEdit("contact", person))}
          ${kit.panel("Detalhes", "flag", `<dl class="crm-page-facts">${facts.map(([glyph, label, value]) => `<div><dt>${icon(glyph)}${label}</dt><dd>${value || '<span class="crm-faint">—</span>'}</dd></div>`).join("")}</dl>`,
            `<button type="button" class="crm-link" data-crm="edit" data-id="${escape(person.id)}">Editar</button>`)}
          ${clientOf.length ? kit.panel("Projetos", "folder", `<div class="crm-page-projects">${clientOf.map((project) => `<button type="button" class="crm-page-project" data-crm="page-project" data-id="${escape(project.id)}">${kit.projectChip(project.id)}${icon("chevron-right")}</button>`).join("")}</div>`) : ""}
        </aside>
      </div>
    </div>`;
  }

  function followPanel(person, today) {
    const info = follow(person, today);
    const headline = { due: "Hora de retomar", fresh: "Em dia", never: "Sem conversa registrada", paused: info.off ? "Sem follow-up" : "Em pausa" }[info.state];
    const span = info.last && info.next ? Math.max(1, dayNumber(info.next) - dayNumber(info.last.date)) : 0;
    const progress = span ? Math.max(0, Math.min(100, Math.round(info.elapsed / span * 100))) : 0;
    const frequencyOptions = frequencies.map(([days, label]) => `<option value="${days}"${days === everyOf(person) ? " selected" : ""}>${label}</option>`).join("");
    return `<div class="crm-fu" data-state="${info.state}"${info.remaining !== undefined && info.remaining <= 0 ? " data-late" : ""}>
      <div class="crm-fu-head">
        <div class="crm-fu-title"><strong>${headline}</strong><small>${info.state === "paused" ? (info.off ? "Este contato não entra na fila de retomadas." : "Contato em pausa: fora da fila de retomadas.")
          : info.next ? `${followText(info)} · ${dateLabel(info.next)}${info.custom ? " (data escolhida)" : ""}` : "Registre a primeira conversa para começar."}</small></div>
        ${followPill(person, today, info)}
      </div>
      ${info.last ? `<div class="crm-fu-track">
        <span><small>Último contato</small><strong>${dateLabel(info.last.date)}</strong><em>${escape(info.last.channel)} · ${since(info.elapsed)}</em></span>
        ${info.next ? `<span class="crm-bar"><span data-fill="${progress}"></span></span>
        <span class="crm-fu-next"><small>Próximo</small><strong>${dateLabel(info.next)}</strong><em>${info.remaining < 0 ? `há ${-info.remaining} dias` : until(info.remaining)}</em></span>` : ""}
      </div>` : ""}
      <div class="crm-fu-settings">
        <label class="tk-field tk-labeled">${icon("clock")}<small>Frequência:</small><select data-crm-follow="every" aria-label="Frequência do follow-up">${frequencyOptions}</select></label>
        <div class="crm-fu-date"><small>Próximo em</small>${kit.dateInput("crm-follow-next", person.followNext ?? "", { optional: true })}</div>
        ${info.next && info.state !== "paused" ? `<button type="button" class="button" data-crm="follow-snooze" data-id="${escape(person.id)}" title="Empurrar o próximo follow-up em 7 dias">${icon("clock")}Adiar 1 semana</button>` : ""}
        ${person.followNext ? `<button type="button" class="crm-link" data-crm="follow-reset" data-id="${escape(person.id)}">Voltar ao automático</button>` : ""}
      </div>
      <div class="crm-fu-log"><small>Registrar conversa de hoje:</small>${channels.map(([name, glyph]) =>
        `<button type="button" class="button" data-crm="log-channel" data-id="${escape(person.id)}" data-channel="${name}">${icon(glyph)}${name}</button>`).join("")}</div>
    </div>`;
  }

  content.addEventListener("change", (event) => {
    const person = pageId && getContact(pageId);
    if (!person) return;
    if (event.target.matches('[data-crm-follow="every"]')) {
      const days = Number(event.target.value);
      if (!frequencyKeys.has(days)) return;
      if (days === interval) delete person.followEvery;
      else person.followEvery = days;
      changed();
      render();
    }
    if (event.target.name === "crm-follow-next") {
      if (event.target.value) person.followNext = event.target.value;
      else delete person.followNext;
      changed();
      render();
    }
  });

  function openPage(id) {
    if (!getContact(id)) return;
    if (modal.open) modal.close();
    if (root.hidden) actions.crm();
    view = "contacts";
    pageId = id;
    render();
    window.scrollTo(0, 0);
  }

  content.addEventListener("input", (event) => {
    const field = event.target.closest("[data-crm-field]");
    const person = pageId && getContact(pageId);
    if (!field || !person) return;
    person[field.dataset.crmField] = field.value;
    grow(field);
    changed(600);
  });

  function formField(label, name, value, attrs = "") {
    return `<label>${label}<input name="${name}" value="${escape(value)}" ${attrs}></label>`;
  }

  function dialog(title, fields, submitText, action, headerExtra = "") {
    modal.innerHTML = `<form data-form="${action}"><header class="dialog-header"><h2 id="crm-dialog-title">${escape(title)}</h2>
      ${headerExtra}<button type="button" class="icon-button" data-crm="close" aria-label="Fechar">${icon("close")}</button></header>
      <div class="dialog-fields">${fields}</div>
      <footer class="dialog-footer"><button type="button" class="button" data-crm="close">Cancelar</button><button type="submit" class="button primary">${submitText}</button></footer>
    </form>`;
    if (!modal.open) modal.showModal();
    (modal.querySelector('input:not([type="hidden"]), select, textarea') ?? modal.querySelector('[data-crm="close"]')).focus();
  }

  function birthdayLabel(value) {
    return value ? dateLabel(value) : "Selecionar dia e mês";
  }

  function setCalendar(open) {
    const calendar = $("#crm-calendar");
    calendar.hidden = !open;
    $("#crm-birthday-button").setAttribute("aria-expanded", String(open));
    if (!open) return;
    const birthday = modal.querySelector('[name="birthday"]').value;
    const months = Object.fromEntries(Array.from({ length: 12 }, (_, index) =>
      [index + 1, monthNames.format(new Date(Date.UTC(2000, index, 1))).replace(/^./, (letter) => letter.toUpperCase())]));
    const daysInMonth = new Date(Date.UTC(2000, calendarMonth, 0)).getUTCDate();
    calendar.innerHTML = `<label>Mês<select id="crm-birthday-month">${options(months, String(calendarMonth))}</select></label>
      <div class="crm-calendar-days" role="group" aria-label="Dia do mês">${Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const value = `${pad(calendarMonth)}-${pad(day)}`;
        return `<button type="button" class="button" data-crm="day" data-day="${value}" aria-pressed="${birthday === value}">${day}</button>`;
      }).join("")}</div>
      <button type="button" class="crm-add" data-crm="day" data-day="">Limpar data</button>`;
  }

  function applyBirthday(value) {
    modal.querySelector('[name="birthday"]').value = value;
    $("#crm-birthday-button span").textContent = birthdayLabel(value);
    setCalendar(false);
    $("#crm-birthday-button").focus();
  }

  function contactHistory(person) {
    const logs = [...person.interactions].reverse().sort((a, b) => b.date.localeCompare(a.date));
    return `<section class="crm-contact-history"><header><h3>Histórico de contatos</h3>${logButton(person)}</header>
      ${logs.length ? `<ol class="crm-history">${logs.map((item) => `<li><strong>${dateLabel(item.date)} · ${escape(item.channel)}</strong>${item.note ? `<p>${escape(item.note)}</p>` : ""}</li>`).join("")}</ol>` : '<p class="crm-muted">Nenhuma conversa registrada.</p>'}
      <button type="button" class="button crm-delete" data-crm="delete" data-id="${escape(person.id)}">Excluir contato</button></section>`;
  }

  function profile(person) {
    return `<div class="crm-profile">${avatar(person)}<div><strong>${escape(person.name)}</strong>
      <span>${stageBadge(person.stage)}${followPill(person, localDay())}</span></div></div>`;
  }

  function editContact(person, stage = "new", draft) {
    modalContact = person;
    const fields = draft ?? person;
    const birthday = fields?.birthday ?? "";
    calendarMonth = Number(birthday.slice(0, 2)) || new Date().getMonth() + 1;
    dialog(person?.name ?? "Novo contato",
      (person ? profile(person) : "") + kit.imageField("photo", fields?.photo ?? "", { label: "Foto", fit: "cover", shape: "round", hint: "Ajuda a reconhecer quem é quem. A imagem é cortada em círculo." })
      + formField("Nome", "name", fields?.name, 'maxlength="100" required')
      + `<div class="crm-fields-pair">${formField("Telefone", "phone", fields?.phone, 'type="tel" maxlength="50"')}${formField("E-mail", "email", fields?.email, 'type="email" maxlength="160"')}</div>
      <div class="crm-fields-pair"><label>Tipo de relação<select name="type">${options(types, fields?.type ?? "personal")}</select></label>
      <label>Estágio<select name="stage">${options(stages, fields?.stage ?? stage)}</select></label></div>
      <div class="crm-fields-pair"><label>Saúde do relacionamento<select name="health">${options(health, fields?.health ?? "unrated")}</select></label>
        <div class="crm-birthday-field"><span id="crm-birthday-label">Aniversário</span>
          <input type="hidden" name="birthday" value="${escape(birthday)}">
          <button type="button" id="crm-birthday-button" class="button" data-crm="calendar" aria-expanded="false" aria-controls="crm-calendar" aria-labelledby="crm-birthday-label crm-birthday-button">${icon("calendar")}<span>${birthdayLabel(birthday)}</span></button>
        </div></div>
      <div id="crm-calendar" hidden></div>
      <div class="crm-fields-pair"><label>Follow-up<select name="followEvery">${frequencies.map(([days, label]) => `<option value="${days}"${days === (fields?.followEvery !== undefined ? Number(fields.followEvery) : interval) ? " selected" : ""}>${label}</option>`).join("")}</select></label>
        ${person ? (() => {
          const info = follow(person, localDay());
          return `<div class="crm-fu-mini"><span>Último contato</span><strong>${info.last ? `${dateLabel(info.last.date)} · ${since(info.elapsed)}` : "—"}</strong>
            <span>Próximo</span><strong>${info.next && info.state !== "paused" ? `${dateLabel(info.next)} · ${followText(info).toLowerCase()}` : "—"}</strong></div>`;
        })() : ""}</div>
      <label>Como se conheceram<textarea name="met" rows="3" maxlength="1500" placeholder="Onde se conheceram e o que vale lembrar desse primeiro contato?">${escape(fields?.met)}</textarea></label>
      <label>Observação<textarea name="description" rows="3" maxlength="1500">${escape(fields?.description)}</textarea></label>
      ${person ? `<section class="crm-dialog-links"><header><h3>Links rápidos</h3>${kit.quickLinksEdit("contact", person)}</header>${kit.quickLinks("contact", person)}</section>` : ""}
      ${person ? contactHistory(person) : ""}`,
      "Salvar contato", "contact",
      person ? `<button type="button" class="button tp-expand" data-crm="page" data-id="${escape(person.id)}" title="Abrir o contato em página inteira">${icon("open")}Abrir página</button>` : "");
  }

  const fullDate = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const monthTitle = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const channels = [["WhatsApp", "message"], ["Ligação", "phone"], ["E-mail", "mail"], ["Presencial", "people"], ["Outro", "sparkle"]];
  let pickerMonth;

  const dateText = (value) => fullDate.format(new Date(`${value}T00:00:00Z`));

  function dateField(label, name, value, max) {
    return `<div class="crm-date-field"><span id="crm-date-label">${label}</span>
      <input type="hidden" name="${name}" value="${value}" data-max="${max}">
      <button type="button" id="crm-date-button" class="button crm-date-button" data-crm="datepicker" aria-haspopup="dialog" aria-expanded="false" aria-controls="crm-datepicker" aria-labelledby="crm-date-label crm-date-button">${icon("calendar")}<span>${dateText(value)}</span>${icon("chevron")}</button>
      <div id="crm-datepicker" class="crm-datepicker" role="dialog" aria-label="Escolher data" hidden></div></div>`;
  }

  function renderPicker() {
    const picker = $("#crm-datepicker");
    const input = modal.querySelector('.crm-date-field input[type="hidden"]');
    const { year, month } = pickerMonth;
    const first = new Date(Date.UTC(year, month, 1));
    const total = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const today = localDay();
    const max = input.dataset.max;
    const cells = Array.from({ length: first.getUTCDay() }, () => '<span aria-hidden="true"></span>');
    for (let day = 1; day <= total; day++) {
      const value = `${year}-${pad(month + 1)}-${pad(day)}`;
      cells.push(`<button type="button" class="crm-day" data-crm="pick" data-date="${value}" aria-label="${dateText(value)}" aria-pressed="${value === input.value}"${value === today ? ' data-today=""' : ""}${max && value > max ? " disabled" : ""}>${day}</button>`);
    }
    const nextDisabled = max && `${month === 11 ? year + 1 : year}-${pad(month === 11 ? 1 : month + 2)}-01` > max;
    picker.innerHTML = `<header>
        <button type="button" class="crm-picker-nav" data-crm="month" data-step="-1" aria-label="Mês anterior">${icon("chevron-left")}</button>
        <strong>${monthTitle.format(first).replace(/^./, (letter) => letter.toUpperCase())}</strong>
        <button type="button" class="crm-picker-nav" data-crm="month" data-step="1" aria-label="Próximo mês"${nextDisabled ? " disabled" : ""}>${icon("chevron-right")}</button>
      </header>
      <div class="crm-weekdays" aria-hidden="true">${["D", "S", "T", "Q", "Q", "S", "S"].map((day) => `<span>${day}</span>`).join("")}</div>
      <div class="crm-days" role="group" aria-label="${monthTitle.format(first)}">${cells.join("")}</div>
      <footer>
        <button type="button" class="crm-picker-quick" data-crm="pick" data-date="${today}">Hoje</button>
        <button type="button" class="crm-picker-quick" data-crm="pick" data-date="${addDays(today, -1)}">Ontem</button>
        <button type="button" class="crm-picker-quick" data-crm="pick" data-date="${addDays(today, -7)}">Há 1 semana</button>
      </footer>`;
  }

  function setPicker(open) {
    const picker = $("#crm-datepicker");
    if (!picker) return;
    picker.hidden = !open;
    $("#crm-date-button").setAttribute("aria-expanded", String(open));
    if (!open) return;
    const value = modal.querySelector('.crm-date-field input[type="hidden"]').value;
    pickerMonth = { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) - 1 };
    renderPicker();
    (picker.querySelector('.crm-day[aria-pressed="true"]') ?? picker.querySelector(".crm-day:not(:disabled)"))?.focus();
  }

  function pickDate(value) {
    const input = modal.querySelector('.crm-date-field input[type="hidden"]');
    if (!value || (input.dataset.max && value > input.dataset.max)) return;
    input.value = value;
    $("#crm-date-button span").textContent = dateText(value);
    setPicker(false);
    $("#crm-date-button").focus();
  }

  function editLog(person, channel = "") {
    modalContact = person;
    dialog("Registrar contato", `<div class="crm-log-person">${avatar(person)}<div><strong>${escape(person.name)}</strong>${followPill(person, localDay())}</div></div>`
      + dateField("Data da conversa", "date", localDay(), localDay())
      + `<fieldset class="crm-channels"><legend>Canal</legend>${channels.map(([name, glyph], index) =>
        `<label><input type="radio" name="channel" value="${name}"${(channel ? name === channel : !index) ? " checked" : ""}><span>${icon(glyph)}${name}</span></label>`).join("")}</fieldset>`
      + '<label>Nota da conversa<textarea name="note" rows="5" maxlength="1500" placeholder="O que vocês conversaram? Próximos passos?"></textarea></label>', "Registrar", "interaction");
  }

  function closeDialog() {
    if (contactDraft) {
      const draft = contactDraft;
      contactDraft = undefined;
      editContact(modalContact, undefined, draft);
    } else {
      modal.close();
    }
  }

  function saveContact(form, values) {
    const name = values.get("name").trim();
    if (!name) {
      form.elements.name.setCustomValidity("Informe um nome.");
      form.elements.name.reportValidity();
      return false;
    }
    const fields = Object.fromEntries(["phone", "email", "type", "stage", "health", "met", "description", "birthday"]
      .map((key) => [key, values.get(key).trim()]));
    fields.name = name;
    const every = Number(values.get("followEvery"));
    if (frequencyKeys.has(every) && every !== interval) fields.followEvery = every;
    else if (modalContact) delete modalContact.followEvery;
    const photo = values.get("photo");
    if (kit.isImage(photo)) fields.photo = photo;
    else if (modalContact) delete modalContact.photo;
    if (modalContact) Object.assign(modalContact, fields);
    else contacts().push({ id: crypto.randomUUID(), interactions: [], ...fields });
    return true;
  }

  function toggleFavorite(person) {
    if (person.favorite) delete person.favorite;
    else person.favorite = true;
    changed();
    const scroll = content.querySelector(".crm-board, .crm-table-wrap")?.scrollLeft;
    render();
    if (scroll !== undefined) content.querySelector(".crm-board, .crm-table-wrap").scrollLeft = scroll;
    $("#crm-status").textContent = `${person.name} ${person.favorite ? "adicionado aos" : "removido dos"} favoritos.`;
  }

  function move(id, stage) {
    const person = getContact(id);
    if (!person || !Object.hasOwn(stages, stage) || person.stage === stage) return;
    const scroll = content.querySelector(".crm-board, .crm-table-wrap")?.scrollLeft;
    person.stage = stage;
    changed();
    render();
    if (scroll !== undefined) content.querySelector(".crm-board, .crm-table-wrap").scrollLeft = scroll;
    $("#crm-status").textContent = `${person.name} · ${stages[stage][0]}.`;
  }

  document.addEventListener("click", (event) => {
    if (!swallowClick || event.detail === 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-crm]");
    if (!button) {
      const id = event.target.closest("[data-drag]")?.dataset.drag;
      const person = id && getContact(id);
      if (person) editContact(person);
      return;
    }
    const { crm: action, id, view: target, stage, filter, day } = button.dataset;
    const person = id ? getContact(id) : undefined;
    if (action === "tab" && target === "follow-up") {
      view = "contacts";
      pageId = undefined;
      followOnly = filter || "due";
      actions.crm();
      render();
      return;
    }
    if (action === "tab" || action === "filter") {
      const fromDashboard = action === "tab" && filter;
      if (action === "tab") view = target;
      if (filter && view === "birthdays") birthdayFilter = filter;
      if (filter && view === "follow-up") followFilter = filter;
      render();
      if (action === "filter" || fromDashboard) content.querySelector('.crm-filters [aria-pressed="true"]')?.focus();
      if (action === "tab" && !button.isConnected && !fromDashboard) {
        root.querySelector('.crm-tabs [aria-pressed="true"]')?.focus();
      }
    }
    if (action === "tab") pageId = undefined;
    if (action === "page" && person) {
      if (modal.open && modalContact === person && modal.querySelector('[data-form="contact"]')) {
        const form = modal.querySelector("form");
        if (form.elements.name.value.trim() && saveContact(form, new FormData(form))) changed();
      }
      openPage(person.id);
    }
    if (action === "page-back") { pageId = undefined; render(); }
    if (action === "favorite" && person) toggleFavorite(person);
    if (action === "follow-snooze" && person) {
      const base = nextFollow(person);
      const today = localDay();
      person.followNext = addDays(base && base > today ? base : today, 7);
      changed();
      render();
      kit.toast(`Próximo follow-up em ${dateLabel(person.followNext)}.`);
    }
    if (action === "follow-reset" && person) {
      delete person.followNext;
      changed();
      render();
    }
    if (action === "log-channel" && person) editLog(person, button.dataset.channel);
    if (action === "favorites") { favoritesOnly = !favoritesOnly; render(); }
    if (action === "favorites-view") { view = "contacts"; pageId = undefined; favoritesOnly = true; render(); }
    if (action === "page-photo" && person) {
      kit.pickImage({ fit: "cover" }).then((photo) => {
        if (!photo) return;
        person.photo = photo;
        changed();
        render();
      });
    }
    if (action === "page-project") projects.open(id);
    if (action === "page-stage" && person) {
      kit.menu(button, Object.entries(stages).map(([key, [name, tone]]) => ({
        label: name, dot: tone, checked: key === person.stage, action: () => {
          person.stage = key;
          changed();
          render();
        },
      })));
    }
    if (action === "page-menu" && person) {
      kit.menu(button, [
        { label: "Editar dados", icon: "edit", action: () => editContact(person) },
        { label: "Registrar contato", icon: "message", action: () => editLog(person) },
        { label: person.favorite ? "Remover dos favoritos" : "Favoritar", icon: "star", action: () => toggleFavorite(person) },
        "-",
        { label: "Excluir contato", icon: "trash", danger: true, action: () => {
          modalContact = person;
          dialog("Excluir contato", `<p>Excluir ${escape(person.name)} e seu histórico de conversas?</p>`, "Excluir contato", "delete");
        } },
      ], { align: "end" });
    }
    if (action === "mode") { mode = target; render(); }
    if (action === "follow-filter") { followOnly = followOnly ? "" : "due"; render(); }
    if (action === "bday-day") { bdayDay = button.dataset.date; bdayMonth = bdayDay.slice(0, 7); render(); }
    if (action === "bday-today") { bdayDay = localDay(); bdayMonth = bdayDay.slice(0, 7); render(); }
    if (action === "bday-month") {
      const [year, month] = (bdayMonth || localDay().slice(0, 7)).split("-").map(Number);
      const next = new Date(Date.UTC(year, month - 1 + Number(button.dataset.step), 1));
      bdayMonth = next.toISOString().slice(0, 7);
      bdayDay = bdayMonth === localDay().slice(0, 7) ? localDay() : `${bdayMonth}-01`;
      render();
    }
    if (action === "type") { typeFilter = button.dataset.type; render(); }
    if (action === "collapse") {
      if (!collapsed.delete(stage)) collapsed.add(stage);
      render();
      content.querySelector(`[data-crm="collapse"][data-stage="${stage}"]`)?.focus();
    }
    if (action === "new") editContact(undefined, stage ?? "new");
    if (action === "close") closeDialog();
    if (action === "calendar") setCalendar($("#crm-calendar").hidden);
    if (action === "day") applyBirthday(day);
    if (action === "datepicker") setPicker($("#crm-datepicker").hidden);
    if (action === "pick") pickDate(button.dataset.date);
    if (action === "month") {
      const next = new Date(Date.UTC(pickerMonth.year, pickerMonth.month + Number(button.dataset.step), 1));
      pickerMonth = { year: next.getUTCFullYear(), month: next.getUTCMonth() };
      renderPicker();
      $(`#crm-datepicker [data-crm="month"][data-step="${button.dataset.step}"]`)?.focus();
    }
    if (action === "edit" && person) editContact(person);
    if (person && (action === "log" || action === "delete") && modal.querySelector('[data-form="contact"]')?.contains(button)) {
      contactDraft = Object.fromEntries(new FormData(button.closest("form")));
    }
    if (action === "log" && person) editLog(person);
    if (action === "delete" && person) {
      modalContact = person;
      dialog("Excluir contato", `<p>Excluir ${escape(person.name)} e seu histórico de conversas?</p>`, "Excluir contato", "delete");
    }
  });

  search.addEventListener("input", render);
  modal.addEventListener("change", (event) => {
    if (event.target.id === "crm-birthday-month") {
      calendarMonth = Number(event.target.value);
      setCalendar(true);
      $("#crm-birthday-month").focus();
    }
  });
  modal.addEventListener("input", (event) => {
    if (event.target.name === "name") event.target.setCustomValidity("");
  });
  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && $("#crm-datepicker") && !$("#crm-datepicker").hidden) {
      event.preventDefault();
      event.stopPropagation();
      setPicker(false);
      $("#crm-date-button").focus();
    }
  });
  modal.addEventListener("pointerdown", (event) => {
    const picker = $("#crm-datepicker");
    if (picker && !picker.hidden && !event.target.closest(".crm-date-field")) setPicker(false);
  });
  modal.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog();
  });
  modal.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(event.target);
    switch (event.target.dataset.form) {
      case "contact":
        if (!saveContact(event.target, values)) return;
        break;
      case "interaction":
        modalContact.interactions.push({ date: values.get("date"), channel: values.get("channel"), note: values.get("note").trim() });
        delete modalContact.followNext;
        break;
      case "delete":
        workspace.contacts = contacts().filter((item) => item !== modalContact);
        break;
      default: return;
    }
    changed();
    render();
    if (event.target.dataset.form === "interaction" && contactDraft) {
      closeDialog();
      return;
    }
    contactDraft = undefined;
    modal.close();
  });
  modal.addEventListener("close", () => {
    if (modal.open) return;
    modalContact = undefined;
    contactDraft = undefined;
    modal.replaceChildren();
  });

  function finishDrag() {
    if (!drag) return;
    const { frame, item, pointer, destination } = drag;
    drag = undefined;
    cancelAnimationFrame(frame);
    if (destination) delete destination.dataset.over;
    delete item.dataset.dragging;
    if (item.hasPointerCapture(pointer)) item.releasePointerCapture(pointer);
  }

  function dropTarget(x, y) {
    const target = document.elementFromPoint(x, y)?.closest(".crm-lane, tbody[data-stage]");
    return drag.scroller.contains(target) ? target : undefined;
  }

  function frameDrag() {
    const box = drag.scroller.getBoundingClientRect();
    if (drag.y >= box.top && drag.y <= box.bottom) {
      if (drag.x >= box.left - 12 && drag.x < box.left + 35) drag.scroller.scrollLeft -= 8;
      if (drag.x > box.right - 35 && drag.x <= box.right + 12) drag.scroller.scrollLeft += 8;
    }
    if (drag.x >= box.left && drag.x <= box.right) {
      if (drag.y >= 0 && drag.y < 48) window.scrollBy(0, -8);
      if (drag.y > window.innerHeight - 48 && drag.y <= window.innerHeight) window.scrollBy(0, 8);
    }
    const destination = dropTarget(drag.x, drag.y);
    if (drag.destination !== destination) {
      if (drag.destination) delete drag.destination.dataset.over;
      drag.destination = destination;
      if (destination) destination.dataset.over = "";
    }
    drag.frame = requestAnimationFrame(frameDrag);
  }

  content.addEventListener("pointerdown", (event) => {
    const item = event.target.closest("[data-drag]");
    if (!item || !event.isPrimary || event.button !== 0 || drag) return;
    const { clientX: x, clientY: y, pointerId: pointer } = event;
    drag = { item, pointer, scroller: item.closest(".crm-board, .crm-table-wrap"), startX: x, startY: y, x, y };
  });
  document.addEventListener("pointermove", (event) => {
    if (event.pointerId !== drag?.pointer) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (drag.started || Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 5) return;
    drag.started = true;
    drag.item.setPointerCapture(event.pointerId);
    drag.item.dataset.dragging = "";
    frameDrag();
  });
  document.addEventListener("pointerup", (event) => {
    if (event.pointerId !== drag?.pointer) return;
    const { item, started } = drag;
    const destination = started && dropTarget(event.clientX, event.clientY);
    finishDrag();
    if (!started) return;
    swallowClick = true;
    setTimeout(() => { swallowClick = false; }, 0);
    if (destination) move(item.dataset.drag, destination.dataset.stage);
  });
  document.addEventListener("pointercancel", (event) => { if (event.pointerId === drag?.pointer) finishDrag(); });
  content.addEventListener("lostpointercapture", (event) => {
    if (event.target === drag?.item && event.pointerId === drag.pointer) finishDrag();
  });
  window.addEventListener("blur", finishDrag);

  function summary() {
    const today = localDay();
    const items = contacts();
    const byOldest = (a, b) => lastContact(a).localeCompare(lastContact(b));
    return {
      today,
      total: items.length,
      due: items.filter((item) => followState(item, today) === "due").sort((x, y) => favoriteFirst(x, y) || byOldest(x, y)).map((contact) => ({ contact, info: follow(contact, today) })),
      never: items.filter((item) => followState(item, today) === "never").length,
      birthdays: upcomingBirthdays(today),
    };
  }

  function openContact(id) {
    const person = getContact(id);
    if (person) editContact(person);
  }

  function logContact(id) {
    const person = getContact(id);
    if (person) editLog(person);
  }

  function showTab(name, filter) {
    if (name === "follow-up") { name = "contacts"; filter = filter || "due"; }
    view = Object.hasOwn(tabs, name) ? name : "overview";
    pageId = undefined;
    if (filter === "favorites") favoritesOnly = true;
    else if (view === "contacts" && ["due", "never", "fresh"].includes(filter)) followOnly = filter;
    else if (filter && view === "follow-up") followFilter = filter;
    else if (filter && view === "birthdays") birthdayFilter = filter;
    actions.crm();
    render();
  }

  return { showTab, toggleFavorite: (id) => { const person = getContact(id); if (person) toggleFavorite(person); }, current: () => pageId && getContact(pageId), openPage, show, hide: finishDrag, valid, summary, openContact, logContact, newContact: () => editContact(undefined, "new"), contacts, contactName, followPill, birthdayPill, dateBlock, weekday };
})();
