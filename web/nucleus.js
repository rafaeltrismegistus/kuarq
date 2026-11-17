"use strict";

const nucleus = (() => {
  const content = $("#nucleus-content");
  const { escape, formatMoney: money, plural } = kit;
  const outCategories = ["Moradia", "Alimentação", "Mercado", "Transporte", "Saúde", "Lazer", "Assinaturas", "Educação", "Trabalho", "Compras", "Impostos", "Outros"];
  const inCategories = ["Salário", "Freelance", "Vendas", "Reembolso", "Rendimentos", "Outros"];
  const cardColors = { violet: "Violeta", blue: "Azul", green: "Verde", orange: "Laranja", pink: "Rosa", slate: "Grafite" };
  let tab = "summary";
  let month = kit.today().slice(0, 7);
  let period = { kind: "month", anchor: kit.today(), from: "", to: "" };
  let entryFilter = "all";
  let cardId;
  let cardMonth;
  let txQuery = "";
  let txKind = "all";
  let txAccount = "";
  let txCategory = "";
  let purchaseMode = "board";
  let purchaseQuery = "";
  let purchaseDrag = false;
  let invoiceView = false;

  const data = () => {
    workspace.nucleus ??= {};
    const store = workspace.nucleus;
    store.entries ??= [];
    store.bills ??= [];
    store.cards ??= [];
    store.wallets ??= [];
    if (Array.isArray(store.debts) && !store.debts.length) delete store.debts;
    store.purchases ??= [];
    if (!store.wallets.some((item) => item.id === "account")) {
      store.wallets.unshift({ id: "account", name: "Conta principal", type: "bank", color: "slate", initial: 0 });
    }
    return store;
  };
  const card = (id) => data().cards.find((item) => item.id === id);
  const walletTypes = {
    bank: ["Conta bancária", "wallet"], debit: ["Cartão de débito", "card"], pix: ["Pix", "arrow"], cash: ["Dinheiro", "wallet"],
    benefit: ["Vale / benefício", "card"], boleto: ["Boleto", "file"], investment: ["Investimento", "trend"], other: ["Outro", "wallet"],
  };
  const isInvestment = (item) => item?.type === "investment";
  const wallet = (id) => data().wallets.find((item) => item.id === id);
  const isCard = (source) => Boolean(card(source));
  const sourceName = (source) => card(source)?.name ?? wallet(source)?.name ?? "Conta";
  function walletBalance(item, until = kit.today()) {
    let total = item.initial ?? 0;
    for (const entry of data().entries) {
      if (entry.date > until) continue;
      if (entry.kind === "transfer") {
        if (entry.source === item.id) total -= entry.amount;
        if (entry.target === item.id) total += entry.amount;
        continue;
      }
      if (entry.source !== item.id) continue;
      total += entry.kind === "in" ? entry.amount : -entry.amount;
    }
    return total;
  }
  function sourceOptions(kind = "out") {
    return [
      ...data().wallets.filter((item) => !item.archived).map((item) => [item.id, `${item.name} · ${walletTypes[item.type]?.[0] ?? "Outro"}`]),
      ...(kind === "in" ? [] : data().cards.map((item) => [item.id, `${item.name} · Cartão de crédito`])),
    ];
  }

  /* ---------- Validation ---------- */
  function validate(raw) {
    const value = raw.nucleus;
    if (value === undefined) return true;
    if (!value || typeof value !== "object") return false;
    const cents = (amount) => Number.isInteger(amount) && amount > 0 && amount < 1e12;
    const day = (number) => Number.isInteger(number) && number >= 1 && number <= 31;
    const paidMap = (map) => map === undefined || (typeof map === "object" && Object.entries(map).every(([key, id]) => kit.isMonth(key) && kit.isId(id)));
    const walletsValid = kit.list(value.wallets, (item) => typeof item.name === "string" && item.name.trim() &&
      Object.hasOwn(walletTypes, item.type) && Object.hasOwn(cardColors, item.color) && Number.isInteger(item.initial ?? 0));
    return walletsValid && kit.list(value.cards, (item) => typeof item.name === "string" && item.name.trim() && Number.isInteger(item.limit) && item.limit >= 0 &&
        day(item.closingDay) && day(item.dueDay) && Object.hasOwn(cardColors, item.color) && paidMap(item.paid))
      && kit.list(value.bills, (item) => typeof item.name === "string" && item.name.trim() && cents(item.amount) &&
        ["monthly", "once"].includes(item.recurrence) && (item.recurrence === "monthly" ? day(item.dueDay) : kit.isDate(item.dueDate)) &&
        typeof item.category === "string" && typeof item.active === "boolean" && paidMap(item.paid) && (item.startMonth === undefined || kit.isMonth(item.startMonth)))
      && kit.list(value.entries, (item) => ["in", "out", "transfer"].includes(item.kind) && cents(item.amount) && kit.isDate(item.date) &&
        typeof item.description === "string" && typeof item.category === "string" && typeof item.source === "string" &&
        (item.kind !== "transfer" || typeof item.target === "string") &&
        Number.isInteger(item.installments ?? 1) && (item.installments ?? 1) >= 1 && (item.installments ?? 1) <= 48)
      && kit.list(value.purchases, (item) => typeof item.title === "string" && item.title.trim() && Object.hasOwn(purchaseStages, item.stage) &&
        Number.isInteger(item.amount) && item.amount >= 0 && Number.isInteger(item.installments ?? 1) && (item.installments ?? 1) >= 1 && (item.installments ?? 1) <= 48 &&
        typeof item.category === "string" && (item.link === undefined || typeof item.link === "string") && (!item.wanted || kit.isDate(item.wanted)));
  }

  /* ---------- Card math ---------- */
  const closingDate = (item, key) => kit.dayInMonth(key, item.closingDay);
  const dueDate = (item, key) => kit.dayInMonth(item.dueDay > item.closingDay ? key : kit.addMonths(key, 1), item.dueDay);
  function invoiceOf(item, date) {
    const key = date.slice(0, 7);
    return date <= closingDate(item, key) ? key : kit.addMonths(key, 1);
  }
  function installments(entry) {
    const count = entry.installments ?? 1;
    const base = Math.floor(entry.amount / count);
    return Array.from({ length: count }, (_, index) => ({ index, count, amount: base + (index === 0 ? entry.amount - base * count : 0) }));
  }
  function invoice(item, key) {
    const lines = [];
    for (const entry of data().entries) {
      if (entry.source !== item.id || entry.kind !== "out") continue;
      const start = invoiceOf(item, entry.date);
      for (const part of installments(entry)) {
        if (kit.addMonths(start, part.index) === key) lines.push({ entry, ...part });
      }
    }
    const total = lines.reduce((sum, line) => sum + line.amount, 0);
    const closing = closingDate(item, key);
    const due = dueDate(item, key);
    const paid = Boolean(item.paid?.[key]);
    const state = paid ? "paid" : kit.today() <= closing ? "open" : kit.today() > due ? "late" : "closed";
    return { key, lines: lines.sort((a, b) => b.entry.date.localeCompare(a.entry.date)), total, closing, due, paid, state };
  }
  const currentInvoiceKey = (item) => invoiceOf(item, kit.today());
  function usedLimit(item) {
    let used = 0;
    for (const entry of data().entries) {
      if (entry.source !== item.id || entry.kind !== "out") continue;
      const start = invoiceOf(item, entry.date);
      for (const part of installments(entry)) {
        if (!item.paid?.[kit.addMonths(start, part.index)]) used += part.amount;
      }
    }
    return used;
  }

  /* ---------- Bills ---------- */
  function billDue(bill, key) {
    if (bill.startMonth && key < bill.startMonth) return undefined;
    if (bill.recurrence === "once") return bill.dueDate.slice(0, 7) === key ? bill.dueDate : undefined;
    return kit.dayInMonth(key, bill.dueDay);
  }
  function billState(bill, key) {
    const due = billDue(bill, key);
    if (!due) return undefined;
    const paid = Boolean(bill.paid?.[key]);
    const days = kit.daysUntil(due);
    return { bill, key, due, paid, days, state: paid ? "paid" : days < 0 ? "late" : days <= 3 ? "soon" : "open" };
  }

  /* ---------- Month figures ---------- */
  const inMonth = (date, key) => date.slice(0, 7) === key;
  function figures(key) {
    const account = data().entries.filter((entry) => !isCard(entry.source) && !entry.adjust && inMonth(entry.date, key));
    const income = account.filter((entry) => entry.kind === "in").reduce((sum, entry) => sum + entry.amount, 0);
    const spent = account.filter((entry) => entry.kind === "out").reduce((sum, entry) => sum + entry.amount, 0);
    const bills = data().bills.filter((bill) => bill.active).map((bill) => billState(bill, key)).filter(Boolean);
    const invoices = data().cards.map((item) => ({ card: item, ...invoice(item, dueMonthToInvoice(item, key)) })).filter((item) => item.total > 0);
    const toPay = bills.filter((item) => !item.paid).reduce((sum, item) => sum + item.bill.amount, 0)
      + invoices.filter((item) => !item.paid).reduce((sum, item) => sum + item.total, 0);
    const categories = new Map();
    for (const entry of account.filter((item) => item.kind === "out" && !item.cardPayment)) {
      categories.set(entry.category, (categories.get(entry.category) ?? 0) + entry.amount);
    }
    for (const entry of data().entries) {
      if (!isCard(entry.source) || entry.kind !== "out") continue;
      for (const part of installments(entry)) {
        if (kit.addMonths(entry.date.slice(0, 7), part.index) === key) categories.set(entry.category, (categories.get(entry.category) ?? 0) + part.amount);
      }
    }
    return { income, spent, balance: income - spent, toPay, bills, invoices, categories: [...categories].sort((a, b) => b[1] - a[1]) };
  }
  /* Invoices are listed in the month they are due. */
  function dueMonthToInvoice(item, key) {
    return item.dueDay > item.closingDay ? key : kit.addMonths(key, -1);
  }

  /* ---------- Rendering ---------- */
  const amount = (value, kind) => `<span class="nu-amount" data-kind="${kind}">${kind === "in" ? "+ " : kind === "out" ? "− " : ""}${money(value)}</span>`;
  const monthNav = () => `<div class="nu-month">
      <button type="button" class="crm-picker-nav" data-nu="month" data-step="-1" aria-label="Mês anterior">${icon("chevron-left")}</button>
      <strong>${kit.monthText(month)}</strong>
      <button type="button" class="crm-picker-nav" data-nu="month" data-step="1" aria-label="Próximo mês">${icon("chevron-right")}</button>
      ${month !== kit.today().slice(0, 7) ? `<button type="button" class="crm-link" data-nu="this-month">Mês atual</button>` : ""}
    </div>`;

  /* ---------- Period (Hoje, Semana, Mês, Ano, Personalizado) ---------- */
  const periodKinds = [["today", "Hoje"], ["week", "Semana"], ["month", "Mês"], ["year", "Ano"], ["custom", "Personalizado"]];
  const fullDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const utc = (date) => new Date(`${date}T00:00:00Z`);
  function range(state = period) {
    const anchor = state.anchor;
    if (state.kind === "today") return [anchor, anchor];
    if (state.kind === "week") {
      const start = kit.addDays(anchor, -utc(anchor).getUTCDay());
      return [start, kit.addDays(start, 6)];
    }
    if (state.kind === "month") return [`${anchor.slice(0, 7)}-01`, kit.dayInMonth(anchor.slice(0, 7), 31)];
    if (state.kind === "year") return [`${anchor.slice(0, 4)}-01-01`, `${anchor.slice(0, 4)}-12-31`];
    return [state.from || anchor, state.to || anchor];
  }
  const span = ([from, to]) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
  function shifted(step) {
    const next = { ...period };
    if (period.kind === "today") next.anchor = kit.addDays(period.anchor, step);
    if (period.kind === "week") next.anchor = kit.addDays(period.anchor, 7 * step);
    if (period.kind === "month") next.anchor = `${kit.addMonths(period.anchor.slice(0, 7), step)}-01`;
    if (period.kind === "year") next.anchor = `${Number(period.anchor.slice(0, 4)) + step}-01-01`;
    if (period.kind === "custom") {
      const [from, to] = range();
      const length = span([from, to]);
      next.from = kit.addDays(from, step * length);
      next.to = kit.addDays(to, step * length);
    }
    return next;
  }
  function periodLabel() {
    const [from, to] = range();
    if (period.kind === "month") return kit.monthText(from.slice(0, 7));
    if (period.kind === "year") return from.slice(0, 4);
    if (from === to) return `${kit.relativeDay(from) === kit.dateText(from) ? "" : `${kit.relativeDay(from)} · `}${fullDate.format(utc(from)).replace(/\./g, "")}`;
    if (from.slice(0, 7) === to.slice(0, 7)) return `${Number(from.slice(8))} – ${fullDate.format(utc(to)).replace(/\./g, "")}`;
    return `${fullDate.format(utc(from)).replace(/\./g, "")} – ${fullDate.format(utc(to)).replace(/\./g, "")}`;
  }
  const previousNoun = () => ({ today: "dia anterior", week: "semana anterior", month: "mês anterior", year: "ano anterior", custom: "período anterior" })[period.kind];
  const isCurrent = () => range().includes(kit.today()) || (range()[0] <= kit.today() && range()[1] >= kit.today());
  function periodBar() {
    const [from, to] = range();
    return `<div class="period-bar">
      <div class="period-kinds" role="group" aria-label="Período">${periodKinds.map(([key, label]) =>
        `<button type="button" data-nu="period" data-kind="${key}" aria-pressed="${key === period.kind}">${label}</button>`).join("")}</div>
      <div class="period-nav">
        <button type="button" class="crm-picker-nav" data-nu="shift" data-step="-1" aria-label="Período anterior">${icon("chevron-left")}</button>
        <strong>${periodLabel()}</strong>
        <button type="button" class="crm-picker-nav" data-nu="shift" data-step="1" aria-label="Próximo período">${icon("chevron-right")}</button>
        ${isCurrent() ? "" : '<button type="button" class="crm-link" data-nu="period-now">Voltar para o atual</button>'}
      </div>
      ${period.kind === "custom" ? `<div class="period-custom">${kit.dateField("De", "period-from", from, { quick: "past" })}${kit.dateField("Até", "period-to", to)}</div>` : ""}
    </div>`;
  }
  function monthsBetween(from, to) {
    const keys = [];
    for (let key = from.slice(0, 7); key <= to.slice(0, 7); key = kit.addMonths(key, 1)) keys.push(key);
    return keys;
  }
  function rangeFigures([from, to]) {
    const within = (date) => date >= from && date <= to;
    const account = data().entries.filter((entry) => !isCard(entry.source) && !entry.adjust && within(entry.date));
    const income = account.filter((entry) => entry.kind === "in").reduce((sum, entry) => sum + entry.amount, 0);
    const spent = account.filter((entry) => entry.kind === "out").reduce((sum, entry) => sum + entry.amount, 0);
    const categories = new Map();
    const add = (name, value) => categories.set(name, (categories.get(name) ?? 0) + value);
    for (const entry of account) if (entry.kind === "out" && !entry.cardPayment) add(entry.category, entry.amount);
    for (const entry of data().entries) {
      if (!isCard(entry.source) || entry.kind !== "out") continue;
      for (const part of installments(entry)) {
        const date = kit.dayInMonth(kit.addMonths(entry.date.slice(0, 7), part.index), Number(entry.date.slice(8)));
        if (within(date)) add(entry.category, part.amount);
      }
    }
    const dues = [];
    for (const key of monthsBetween(from, to)) {
      for (const bill of data().bills.filter((item) => item.active)) {
        const state = billState(bill, key);
        if (state && within(state.due)) dues.push({ type: "bill", id: bill.id, key, name: bill.name, due: state.due, value: bill.amount, state: state.state, paid: state.paid });
      }
      for (const item of data().cards) {
        const current = invoice(item, dueMonthToInvoice(item, key));
        if (current.total && within(current.due)) dues.push({ type: "invoice", id: item.id, key: current.key, name: `Fatura ${item.name}`, due: current.due, value: current.total, state: current.state, paid: current.paid });
      }
    }
    dues.sort((a, b) => a.due.localeCompare(b.due));
    const open = dues.filter((item) => !item.paid);
    return { income, spent, balance: income - spent, count: account.filter((entry) => entry.kind === "in").length, dues, open, toPay: open.reduce((sum, item) => sum + item.value, 0),
      categories: [...categories].sort((a, b) => b[1] - a[1]) };
  }

  function summary() {
    const current = range();
    const length = span(current);
    const info = rangeFigures(current);
    const previous = rangeFigures([kit.addDays(current[0], -length), kit.addDays(current[0], -1)]);
    const delta = info.spent - previous.spent;
    const upcoming = info.open;
    const maxCategory = info.categories[0]?.[1] ?? 1;
    const upcomingBody = upcoming.length ? `<ul class="crm-rows">${upcoming.map((item) => `<li class="nu-due-row">
        <span class="nu-due-date" data-state="${item.state}"><strong>${item.due.slice(8)}</strong><span>${kit.monthShort(item.due)}</span></span>
        <span class="notes-recent-text"><strong>${escape(item.name)}</strong><small>${item.state === "late" ? "Atrasada" : kit.relativeDay(item.due)}</small></span>
        ${amount(item.value)}
        <button type="button" class="button" data-nu="${({ bill: "pay-bill", invoice: "pay-invoice" })[item.type]}" data-id="${escape(item.id)}" data-key="${item.key}">Pagar</button></li>`).join("")}</ul>`
      : kit.emptyState("check", "Nada a pagar no período", "Contas pagas e faturas quitadas somem desta lista.");
    const categoryBody = info.categories.length ? `<ul class="nu-categories">${info.categories.map(([name, value]) => `<li><div><span>${escape(name)}</span><strong>${money(value)}</strong></div>
        <span class="crm-bar"><span data-fill="${Math.round(value / maxCategory * 100)}"></span></span></li>`).join("")}</ul>`
      : kit.emptyState("chart", "Sem gastos no período", "Lance saídas ou compras no cartão para ver as categorias.");
    const cardsBody = data().cards.length ? `<ul class="crm-rows">${data().cards.map((item) => {
        const current = invoice(item, currentInvoiceKey(item));
        const used = usedLimit(item);
        return `<li class="nu-card-row" data-color="${item.color}"><button type="button" class="notes-recent-open" data-nu="open-card" data-id="${escape(item.id)}">
          <span class="nu-card-chip" data-color="${item.color}">${icon("card")}</span>
          <span class="notes-recent-text"><strong>${escape(item.name)}</strong><small>Fatura atual · vence ${kit.dateText(current.due)}</small>
          <span class="crm-bar"><span data-fill="${item.limit ? Math.min(100, Math.round(used / item.limit * 100)) : 0}"></span></span>
          <small>${item.limit ? `${Math.min(100, Math.round(used / item.limit * 100))}% do limite usado` : "Sem limite informado"}</small></span></button>
          ${amount(current.total)}</li>`;
      }).join("")}</ul>`
      : kit.emptyState("card", "Nenhum cartão", "Cadastre seus cartões para acompanhar fatura e limite.", '<div class="crm-empty-action"><button type="button" class="button" data-nu="new-card">Adicionar cartão</button></div>');
    return `${periodBar()}<div class="crm-stats">
        ${kit.stat("Entradas", money(info.income), previous.income ? `${info.income >= previous.income ? "+" : "−"} ${money(Math.abs(info.income - previous.income))} vs. ${previousNoun()}` : plural(info.count, "lançamento", "lançamentos"), "arrow", "muted", 'data-nu="tab" data-tab="transactions"')}
        ${kit.stat("Saídas", money(info.spent), previous.spent ? `${delta > 0 ? "+" : "−"} ${money(Math.abs(delta))} vs. ${previousNoun()}` : "Pagamentos pela conta", "wallet", "muted", 'data-nu="tab" data-tab="transactions"')}
        ${kit.stat("Saldo do período", money(info.balance), info.balance >= 0 ? "Entradas menos saídas" : "Saiu mais do que entrou", "chart", info.balance < 0 ? "danger" : "muted", 'data-nu="tab" data-tab="transactions"')}
        ${kit.stat("A pagar", money(info.toPay), upcoming.length ? plural(upcoming.length, "pendência", "pendências") : "Tudo pago", "calendar", upcoming.some((item) => item.state === "late") ? "danger" : upcoming.length ? "warning" : "muted", 'data-nu="tab" data-tab="bills"')}
      </div>
      <div class="crm-overview">
        <div class="crm-overview-main">${kit.panel("A pagar no período", "calendar", upcomingBody)}${kit.panel("Gastos por categoria", "chart", categoryBody)}</div>
        <div class="crm-overview-side">${kit.panel("Saldos", "wallet", `<ul class="crm-rows">${data().wallets.filter((item) => !item.archived).map((item) => `<li class="nu-balance-row">
            <span class="nu-card-chip" data-color="${item.color}">${icon(walletTypes[item.type]?.[1] ?? "wallet")}</span>
            <span class="notes-recent-text"><strong>${escape(item.name)}</strong><small>${walletTypes[item.type]?.[0] ?? "Outro"}</small></span>
            <strong class="nu-amount">${money(walletBalance(item))}</strong></li>`).join("")}</ul>`, `<button type="button" class="crm-link" data-nu="tab" data-tab="accounts">Gerenciar${icon("arrow")}</button>`)}${kit.panel("Cartões", "card", cardsBody, `<button type="button" class="crm-link" data-nu="tab" data-tab="accounts">Ver em Contas${icon("arrow")}</button>`)}</div>
      </div>`;
  }

  function bills() {
    const active = data().bills.filter((bill) => bill.active);
    const states = active.map((bill) => billState(bill, month)).filter(Boolean).sort((a, b) => a.due.localeCompare(b.due));
    const inactive = data().bills.filter((bill) => !bill.active);
    const labels = { paid: "Paga", late: "Atrasada", soon: "Vence logo", open: "A vencer" };
    const row = (item) => `<li class="nu-bill" data-state="${item.state}">
      <span class="nu-due-date" data-state="${item.state}"><strong>${item.due.slice(8)}</strong><span>${kit.monthShort(item.due)}</span></span>
      <button type="button" class="notes-recent-text nu-bill-name" data-nu="edit-bill" data-id="${escape(item.bill.id)}"><strong>${escape(item.bill.name)}</strong>
        <small>${escape(item.bill.category)} · ${item.bill.recurrence === "monthly" ? `todo dia ${item.bill.dueDay}` : "conta única"}</small></button>
      <span class="nu-bill-state" data-state="${item.state}">${labels[item.state]}</span>
      ${amount(item.bill.amount)}
      <button type="button" class="button" data-nu="${item.paid ? "unpay-bill" : "pay-bill"}" data-id="${escape(item.bill.id)}" data-key="${month}">${item.paid ? "Desfazer" : "Pagar"}</button></li>`;
    const total = states.reduce((sum, item) => sum + item.bill.amount, 0);
    const paid = states.filter((item) => item.paid).reduce((sum, item) => sum + item.bill.amount, 0);
    return `${monthNav()}<div class="crm-stats nu-mini-stats">
        ${kit.stat("Total do mês", money(total), plural(states.length, "conta", "contas"), "calendar")}
        ${kit.stat("Pago", money(paid), `${states.filter((item) => item.paid).length} de ${states.length}`, "check")}
        ${kit.stat("Falta pagar", money(total - paid), states.some((item) => item.state === "late") ? "Há contas atrasadas" : "Em dia", "alert", states.some((item) => item.state === "late") ? "danger" : "muted")}
      </div>
      ${states.length ? kit.panel("Contas do mês", "calendar", `<ul class="crm-rows nu-bills">${states.map(row).join("")}</ul>`)
        : `<div class="crm-panel">${kit.emptyState("calendar", "Nenhuma conta neste mês", "Cadastre contas fixas (aluguel, internet, assinaturas) ou contas únicas.", '<div class="crm-empty-action"><button type="button" class="button primary" data-nu="new-bill">Nova conta</button></div>')}</div>`}
      ${inactive.length ? kit.panel("Contas pausadas", "pause", `<ul class="crm-rows">${inactive.map((bill) => `<li><button type="button" class="notes-recent-open" data-nu="edit-bill" data-id="${escape(bill.id)}"><span class="notes-recent-text"><strong>${escape(bill.name)}</strong><small>${money(bill.amount)}</small></span></button></li>`).join("")}</ul>`) : ""}`;
  }

  function editWallet(id, preset = {}) {
    const item = id ? wallet(id) : undefined;
    const value = item ?? { name: "", type: "bank", color: "blue", initial: 0, ...preset };
    const used = item && data().entries.some((entry) => entry.source === item.id);
    kit.form({
      title: item ? `Editar ${isInvestment(item) ? "investimento" : "conta"}` : value.type === "investment" ? "Novo investimento" : "Nova conta",
      submit: item ? "Salvar" : "Adicionar",
      danger: item && item.id !== "account" ? (used ? "Arquivar" : "Excluir") : "",
      fields: kit.field("Nome", kit.input("name", value.name, `maxlength="40" required autofocus placeholder="${value.type === "investment" ? "Ex.: Reserva de emergência, Tesouro Selic, CDB" : "Ex.: Nubank, Itaú, Vale-refeição, Dinheiro"}"`))
        + `<div class="crm-fields-pair">${kit.field("Tipo", kit.select("type", Object.entries(walletTypes).map(([key, [label]]) => [key, label]), value.type))}
          ${kit.field("Saldo inicial (R$)", kit.input("initial", kit.moneyInput(Math.abs(value.initial ?? 0)), 'inputmode="decimal" placeholder="0,00"'), "Quanto havia antes do primeiro lançamento.")}</div>`
        + `<fieldset class="kit-swatches"><legend>Cor</legend>${Object.entries(cardColors).map(([key, label]) =>
          `<label data-color="${key}" title="${label}"><input type="radio" name="color" value="${key}"${key === value.color ? " checked" : ""}><i></i><span class="sr-only">${label}</span></label>`).join("")}</fieldset>`
        + (item?.archived ? `<label class="kit-check"><input type="checkbox" name="restore"><span>Voltar a usar esta forma de pagamento</span></label>` : ""),
      onSubmit: (values, form) => {
        if (!values.name.trim()) return kit.invalid(form, "name", "Dê um nome.");
        const initial = values.initial ? kit.parseMoney(values.initial) : 0;
        if (!Number.isFinite(initial)) return kit.invalid(form, "initial", "Valor inválido.");
        const fields = { name: values.name.trim(), type: values.type, color: values.color || "slate", initial };
        if (item) {
          Object.assign(item, fields);
          if (values.restore === true) delete item.archived;
        } else data().wallets.push({ id: kit.uid(), ...fields });
        kit.touch();
        refresh();
      },
      onDanger: () => {
        if (used) item.archived = true;
        else data().wallets = data().wallets.filter((entry) => entry !== item);
        kit.touch();
        refresh();
      },
    });
  }

  function cards() {
    const list = data().cards;
    if (!list.length) return `<div class="crm-panel">${kit.emptyState("card", "Nenhum cartão cadastrado", "Informe limite, dia de fechamento e de vencimento. As compras parceladas entram nas faturas certas sozinhas.",
      '<div class="crm-empty-action"><button type="button" class="button primary" data-nu="new-card">Adicionar cartão</button></div>')}</div>`;
    if (!card(cardId)) cardId = list[0].id;
    const item = card(cardId);
    cardMonth ??= currentInvoiceKey(item);
    const current = invoice(item, cardMonth);
    const used = usedLimit(item);
    const labels = { open: "Aberta", closed: "Fechada", late: "Vencida", paid: "Paga" };
    return `<div class="nu-card-tabs">${list.map((entry) => `<button type="button" class="nu-card-pick" data-nu="pick-card" data-id="${escape(entry.id)}" aria-pressed="${entry.id === cardId}" data-color="${entry.color}">${icon("card")}${escape(entry.name)}</button>`).join("")}
        <button type="button" class="nu-card-pick nu-card-add" data-nu="new-card">${icon("plus")}Cartão</button></div>
      <div class="nu-card-hero" data-color="${item.color}">
        <div class="nu-card-face"><span>${escape(item.name)}</span><strong>${money(current.total)}</strong><small>Fatura de ${kit.monthText(cardMonth).toLowerCase()}</small></div>
        <div class="nu-card-facts">
          <div><small>Situação</small><strong class="nu-invoice-state" data-state="${current.state}">${labels[current.state]}</strong></div>
          <div><small>Fecha em</small><strong>${kit.dateText(current.closing)}</strong></div>
          <div><small>Vence em</small><strong>${kit.dateText(current.due)}</strong></div>
          <div><small>Limite usado</small><strong>${money(used)}</strong><span class="crm-bar"><span data-fill="${item.limit ? Math.min(100, Math.round(used / item.limit * 100)) : 0}"></span></span><small>Disponível ${money(Math.max(0, item.limit - used))}</small></div>
        </div>
        <div class="nu-card-actions">
          <button type="button" class="button" data-nu="edit-card" data-id="${escape(item.id)}">${icon("edit")}Editar cartão</button>
          ${current.total ? `<button type="button" class="button primary" data-nu="${current.paid ? "unpay-invoice" : "pay-invoice"}" data-id="${escape(item.id)}" data-key="${cardMonth}">${current.paid ? "Desfazer pagamento" : "Pagar fatura"}</button>` : ""}
        </div>
      </div>
      <div class="nu-month">
        <button type="button" class="crm-picker-nav" data-nu="card-month" data-step="-1" aria-label="Fatura anterior">${icon("chevron-left")}</button>
        <strong>Fatura de ${kit.monthText(cardMonth).toLowerCase()}</strong>
        <button type="button" class="crm-picker-nav" data-nu="card-month" data-step="1" aria-label="Próxima fatura">${icon("chevron-right")}</button>
        ${cardMonth !== currentInvoiceKey(item) ? `<button type="button" class="crm-link" data-nu="card-current">Fatura atual</button>` : ""}
      </div>
      ${current.lines.length ? kit.panel("Compras nesta fatura", "card", `<ul class="nu-entries">${current.lines.map((line) => `<li><button type="button" class="nu-entry" data-nu="edit-entry" data-id="${escape(line.entry.id)}">
          <span class="nu-entry-icon" data-kind="card">${icon("card")}</span>
          <span class="notes-recent-text"><strong>${escape(line.entry.description || line.entry.category)}</strong><small>${kit.dateText(line.entry.date)} · ${escape(line.entry.category)}${line.count > 1 ? ` · parcela ${line.index + 1}/${line.count}` : ""}</small></span>
          ${amount(line.amount)}</button></li>`).join("")}</ul>`)
        : `<div class="crm-panel">${kit.emptyState("card", "Nenhuma compra nesta fatura", "Lance uma saída escolhendo este cartão como forma de pagamento.")}</div>`}`;
  }

  /* ---------- Contas (bancos, caixa, investimentos, cartões) ---------- */
  const monthEnd = () => kit.dayInMonth(kit.today().slice(0, 7), 31);
  const defaultWallet = () => data().wallets.find((item) => !item.archived && !isInvestment(item)) ?? data().wallets[0];
  function forecast(item) {
    const today = kit.today();
    const end = monthEnd();
    const key = today.slice(0, 7);
    let total = walletBalance(item, end);
    for (const bill of data().bills.filter((entry) => entry.active)) {
      const state = billState(bill, key);
      if (state && !state.paid && (bill.wallet ?? defaultWallet().id) === item.id) total -= bill.amount;
    }
    for (const cardItem of data().cards) {
      const current = invoice(cardItem, dueMonthToInvoice(cardItem, key));
      if (current.total && !current.paid && (cardItem.payFrom ?? defaultWallet().id) === item.id) total -= current.total;
    }
    return total;
  }
  function monthFlow(item) {
    const key = kit.today().slice(0, 7);
    let flowIn = 0;
    let flowOut = 0;
    for (const entry of data().entries) {
      if (!entry.date.startsWith(key)) continue;
      if (entry.kind === "transfer") {
        if (entry.target === item.id) flowIn += entry.amount;
        if (entry.source === item.id) flowOut += entry.amount;
      } else if (entry.source === item.id) {
        if (entry.kind === "in") flowIn += entry.amount;
        else flowOut += entry.amount;
      }
    }
    return { flowIn, flowOut };
  }
  function netWorth() {
    const active = data().wallets.filter((item) => !item.archived);
    const cash = active.filter((item) => !isInvestment(item)).reduce((sum, item) => sum + walletBalance(item), 0);
    const invested = active.filter(isInvestment).reduce((sum, item) => sum + walletBalance(item), 0);
    const cardsDue = data().cards.reduce((sum, item) => sum + usedLimit(item), 0);
    return { cash, invested, cardsDue, net: cash + invested - cardsDue };
  }
  const endLabel = () => kit.dateText(monthEnd()).replace(/ de \d{4}$/, "");
  function accountCard(item) {
    const flow = monthFlow(item);
    const investment = isInvestment(item);
    const yieldMonth = investment ? data().entries.filter((entry) => entry.source === item.id && entry.adjust && entry.date.startsWith(kit.today().slice(0, 7)))
      .reduce((sum, entry) => sum + (entry.kind === "in" ? entry.amount : -entry.amount), 0) : 0;
    return `<article class="nu-acc" data-color="${item.color}"${item.archived ? " data-archived" : ""}>
      <header class="nu-acc-head"><span class="nu-card-chip" data-color="${item.color}">${icon(walletTypes[item.type]?.[1] ?? "wallet")}</span>
        <strong>${escape(item.name)}</strong><span class="nu-acc-type">${walletTypes[item.type]?.[0] ?? "Outro"}${item.archived ? " · arquivada" : ""}</span>
        <button type="button" class="icon-button" data-nu="edit-wallet" data-id="${escape(item.id)}" aria-label="Editar ${escape(item.name)}" title="Editar">${icon("edit")}</button></header>
      <div class="nu-acc-balance"><strong${walletBalance(item) < 0 ? ' class="nu-negative"' : ""}>${money(walletBalance(item))}</strong><small>Saldo atual</small></div>
      <dl class="nu-acc-facts">
        ${investment ? `<div><dt>Rendeu no mês</dt><dd>${yieldMonth ? amount(Math.abs(yieldMonth), yieldMonth > 0 ? "in" : "out") : "—"}</dd></div>`
          : `<div><dt>Previsto em ${endLabel()}</dt><dd>${money(forecast(item))}</dd></div>`}
        <div><dt>Neste mês</dt><dd class="nu-acc-flow">${amount(flow.flowIn, "in")}<span>·</span>${amount(flow.flowOut, "out")}</dd></div>
      </dl>
      <footer class="nu-acc-actions">
        <button type="button" class="button" data-nu="account-tx" data-id="${escape(item.id)}">Ver transações</button>
        ${investment ? `<button type="button" class="button" data-nu="invest" data-id="${escape(item.id)}">${icon("plus")}Aportar</button>` : ""}
        <button type="button" class="button" data-nu="adjust" data-id="${escape(item.id)}">${investment ? "Atualizar valor" : "Ajustar saldo"}</button>
      </footer>
    </article>`;
  }
  function creditCard(item) {
    const current = invoice(item, currentInvoiceKey(item));
    const used = usedLimit(item);
    const labels = { open: "Fatura aberta", closed: "Fatura fechada", late: "Fatura vencida", paid: "Fatura paga" };
    const percent = item.limit ? Math.min(100, Math.round(used / item.limit * 100)) : 0;
    return `<article class="nu-acc nu-acc-card" data-color="${item.color}">
      <header class="nu-acc-head"><span class="nu-card-chip" data-color="${item.color}">${icon("card")}</span><strong>${escape(item.name)}</strong>
        <span class="nu-invoice-state" data-state="${current.state}">${labels[current.state]}</span>
        <button type="button" class="icon-button" data-nu="edit-card" data-id="${escape(item.id)}" aria-label="Editar ${escape(item.name)}" title="Editar">${icon("edit")}</button></header>
      <div class="nu-acc-balance"><strong>${money(current.total)}</strong><small>Fecha em ${kit.dateText(current.closing)} · vence em ${kit.dateText(current.due)}</small></div>
      <dl class="nu-acc-facts">
        <div><dt>Limite usado</dt><dd>${money(used)}${item.limit ? ` · ${percent}%` : ""}</dd></div>
        <div><dt>Disponível</dt><dd>${item.limit ? money(Math.max(0, item.limit - used)) : "—"}</dd></div>
      </dl>
      ${item.limit ? `<span class="crm-bar nu-acc-bar"><span data-fill="${percent}"></span></span>` : ""}
      <footer class="nu-acc-actions">
        <button type="button" class="button" data-nu="open-card" data-id="${escape(item.id)}">Ver fatura</button>
        ${current.total && !current.paid && current.state !== "open" ? `<button type="button" class="button primary" data-nu="pay-invoice" data-id="${escape(item.id)}" data-key="${current.key}">Pagar fatura</button>` : ""}
      </footer>
    </article>`;
  }
  function accounts() {
    if (invoiceView && card(cardId)) {
      return `<div class="nu-invoice-top"><button type="button" class="note-ghost" data-nu="invoice-back">${icon("back")}<span>Contas</span></button></div>${cards()}`;
    }
    invoiceView = false;
    const list = data().wallets.filter((item) => !item.archived);
    const cash = list.filter((item) => !isInvestment(item));
    const invest = list.filter(isInvestment);
    const archived = data().wallets.filter((item) => item.archived);
    const worth = netWorth();
    const section = (title, count, action, body) => `<section class="nu-acc-section"><header class="nu-acc-section-head"><h2>${title}</h2>${count ? `<small>${count}</small>` : ""}<span class="tk-spacer"></span>${action}</header>${body}</section>`;
    const addTile = (action, label, extra = "") => `<button type="button" class="nu-acc nu-acc-add" data-nu="${action}"${extra}>${icon("plus")}<span>${label}</span></button>`;
    return `<div class="crm-stats">
        ${kit.stat("Em contas", money(worth.cash), "Bancos, carteira e vales", "bank", worth.cash < 0 ? "danger" : "muted")}
        ${kit.stat("Investido", money(worth.invested), "Reserva e aplicações", "trend")}
        ${kit.stat("Cartões a pagar", money(worth.cardsDue), "Faturas abertas e futuras", "card")}
        ${kit.stat("Patrimônio líquido", money(worth.net), "Contas e investimentos menos cartões", "chart", worth.net < 0 ? "danger" : "muted")}
      </div>
      ${section("Bancos e caixa", plural(cash.length, "conta", "contas"), `<button type="button" class="button" data-nu="new-wallet">${icon("plus")}Nova conta</button>`,
        `<div class="nu-acc-grid">${cash.map(accountCard).join("")}${addTile("new-wallet", "Nova conta")}</div>`)}
      ${section("Investimentos", invest.length ? plural(invest.length, "aplicação", "aplicações") : "", `<button type="button" class="button" data-nu="new-investment">${icon("plus")}Novo investimento</button>`,
        `<div class="nu-acc-grid">${invest.map(accountCard).join("")}${addTile("new-investment", invest.length ? "Novo investimento" : "Adicionar reserva ou aplicação")}</div>`)}
      ${section("Cartões de crédito", "", `<span class="nu-acc-hint">A compra conta na data; o pagamento sai na fatura.</span>`,
        `<div class="nu-acc-grid">${data().cards.map(creditCard).join("")}${addTile("new-card", "Novo cartão")}</div>`)}
      ${archived.length ? section("Arquivadas", archived.length, "", `<div class="nu-acc-grid">${archived.map(accountCard).join("")}</div>`) : ""}`;
  }

  function adjustBalance(id) {
    const item = wallet(id);
    if (!item) return;
    const investment = isInvestment(item);
    const current = walletBalance(item);
    kit.form({
      title: investment ? "Atualizar valor do investimento" : "Ajustar saldo",
      info: investment ? "Informe quanto o investimento vale hoje. A diferença entra como rendimento (ou perda) e não conta como entrada do mês." : "Informe o saldo real que aparece no banco. A diferença vira um lançamento de ajuste, fora das entradas e saídas do mês.",
      submit: "Salvar",
      fields: `<p class="kit-ql-owner">${escape(item.name)} · saldo no Kuarq: <strong>${money(current)}</strong></p>`
        + kit.field(investment ? "Valor atual (R$)" : "Saldo real hoje (R$)", kit.input("balance", kit.moneyInput(Math.abs(current)), 'inputmode="decimal" required autofocus placeholder="0,00"'), "Use o sinal de menos para saldo negativo."),
      onSubmit: (values, form) => {
        const target = kit.parseMoney(values.balance);
        if (!Number.isFinite(target)) return kit.invalid(form, "balance", "Valor inválido.");
        const diff = target - current;
        if (!diff) return;
        data().entries.push({ id: kit.uid(), kind: diff > 0 ? "in" : "out", amount: Math.abs(diff), date: kit.today(), adjust: true,
          description: investment ? (diff > 0 ? "Rendimento" : "Desvalorização") : "Ajuste de saldo", category: investment ? "Rendimentos" : "Ajuste de saldo", source: item.id, installments: 1 });
        kit.touch();
        refresh();
        kit.toast(investment ? `${diff > 0 ? "Rendimento" : "Perda"} de ${money(Math.abs(diff))} registrado.` : "Saldo ajustado.");
      },
    });
  }

  /* ---------- Transações ---------- */
  const txKinds = [["all", "Todas"], ["in", "Entradas"], ["out", "Saídas"], ["transfer", "Transferências"], ["card", "Cartão"]];
  function txFiltered() {
    const [from, to] = range();
    const query = kit.fold(txQuery.trim());
    return data().entries.filter((entry) => entry.date >= from && entry.date <= to)
      .filter((entry) => txKind === "all" || (txKind === "card" ? isCard(entry.source) : txKind === "transfer" ? entry.kind === "transfer" : entry.kind === txKind && !isCard(entry.source)))
      .filter((entry) => !txAccount || entry.source === txAccount || entry.target === txAccount)
      .filter((entry) => !txCategory || entry.category === txCategory)
      .filter((entry) => !query || kit.fold([entry.description, entry.category, sourceName(entry.source), entry.target ? sourceName(entry.target) : "", money(entry.amount)].join(" ")).includes(query))
      .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }
  const signed = (entry) => entry.kind === "in" ? entry.amount : entry.kind === "out" ? -entry.amount
    : txAccount ? (entry.target === txAccount ? entry.amount : -entry.amount) : 0;
  const dayTitle = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  function txRow(entry) {
    const cardEntry = isCard(entry.source);
    const kind = entry.kind === "transfer" ? "transfer" : cardEntry ? "card" : entry.kind;
    const glyph = { in: "arrow-in", out: "arrow-out", transfer: "swap", card: "card" }[kind];
    const tags = [
      (entry.installments ?? 1) > 1 ? `<span class="nu-tx-tag">${entry.installments}x de ${money(Math.round(entry.amount / entry.installments))}</span>` : "",
      entry.billId ? `<span class="nu-tx-tag">${icon("swap")}Fixa</span>` : "",
      entry.cardPayment ? `<span class="nu-tx-tag">Fatura</span>` : "",
      entry.purchaseId ? `<span class="nu-tx-tag">${icon("cart")}Compra</span>` : "",
      entry.adjust ? `<span class="nu-tx-tag">Ajuste</span>` : "",
    ].join("");
    const account = entry.kind === "transfer" ? `${escape(sourceName(entry.source))} → ${escape(sourceName(entry.target))}` : escape(sourceName(entry.source));
    const sub = cardEntry && entry.kind === "out" ? `<small>fatura ${kit.monthShort(`${invoiceOf(card(entry.source), entry.date)}-01`)}</small>` : "";
    return `<li><button type="button" class="nu-tx" data-nu="edit-entry" data-id="${escape(entry.id)}">
      <span class="nu-tx-icon" data-kind="${kind}">${icon(glyph)}</span>
      <span class="nu-tx-main"><strong>${escape(entry.description || entry.category)}</strong><small><i class="nu-tx-dot" data-kind="${kind}"></i>${escape(entry.category)}</small></span>
      <span class="nu-tx-tags">${tags}</span>
      <span class="nu-tx-account">${icon(cardEntry ? "card" : entry.kind === "transfer" ? "swap" : walletTypes[wallet(entry.source)?.type]?.[1] ?? "wallet")}<span>${account}</span></span>
      <span class="nu-tx-value">${entry.kind === "transfer" && !txAccount ? `<span class="nu-amount">${money(entry.amount)}</span>` : amount(entry.amount, signed(entry) >= 0 ? "in" : "out")}${sub}</span>
    </button></li>`;
  }
  function txList() {
    const list = txFiltered();
    if (!list.length) return `<div class="crm-panel">${kit.emptyState("swap", txQuery || txAccount || txCategory || txKind !== "all" ? "Nada encontrado com esses filtros" : "Nenhuma transação no período", "Use “Lançar” para registrar entradas, saídas, transferências e compras no cartão.")}</div>`;
    const byDay = new Map();
    for (const entry of list) {
      if (!byDay.has(entry.date)) byDay.set(entry.date, []);
      byDay.get(entry.date).push(entry);
    }
    return `<div class="nu-tx-days">${[...byDay].map(([date, items]) => {
      const net = items.reduce((sum, entry) => sum + (isCard(entry.source) ? 0 : signed(entry)), 0);
      const title = dayTitle.format(new Date(`${date}T00:00:00Z`));
      return `<section class="nu-tx-day"><header><span>${title.charAt(0).toUpperCase() + title.slice(1)}</span><span class="nu-tx-net" data-kind="${net < 0 ? "out" : "in"}">${net ? `${net < 0 ? "−" : ""}${money(Math.abs(net))}` : ""}</span></header>
        <ul class="nu-tx-list">${items.map(txRow).join("")}</ul></section>`;
    }).join("")}</div>`;
  }
  function txSummary() {
    const list = txFiltered();
    const flowIn = list.filter((entry) => entry.kind === "in" && !entry.adjust && !isCard(entry.source)).reduce((sum, entry) => sum + entry.amount, 0);
    const flowOut = list.filter((entry) => entry.kind === "out" && !entry.adjust && !isCard(entry.source)).reduce((sum, entry) => sum + entry.amount, 0);
    const onCard = list.filter((entry) => entry.kind === "out" && isCard(entry.source)).reduce((sum, entry) => sum + entry.amount, 0);
    return `<span>${plural(list.length, "lançamento", "lançamentos")}</span>
      <span>Entradas <strong class="nu-amount" data-kind="in">${money(flowIn)}</strong></span>
      <span>Saídas <strong class="nu-amount" data-kind="out">${money(flowOut)}</strong></span>
      <span>Saldo <strong class="nu-amount" data-kind="${flowIn - flowOut < 0 ? "out" : ""}">${money(flowIn - flowOut)}</strong></span>
      ${onCard ? `<span>No cartão <strong>${money(onCard)}</strong></span>` : ""}`;
  }
  function transactions() {
    const accountsList = [["", "Todas"], ...data().wallets.map((item) => [item.id, item.name]), ...data().cards.map((item) => [item.id, item.name])];
    const categories = [...new Set(data().entries.map((entry) => entry.category))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const filtered = txQuery || txAccount || txCategory || txKind !== "all";
    return `${periodBar()}
      <div class="tk-bar nu-tx-bar">
        <div class="tk-bar-row">
          <label class="crm-search tk-search"><span>${icon("search")}</span><input type="search" data-nu-filter="query" value="${escape(txQuery)}" placeholder="Buscar descrição, categoria, valor…" aria-label="Buscar transação"></label>
          <div class="crm-filters nu-tx-kinds" role="group" aria-label="Tipo">${txKinds.map(([key, label]) => `<button type="button" class="crm-filter" data-nu="tx-kind" data-kind="${key}" aria-pressed="${key === txKind}">${label}</button>`).join("")}</div>
          <label class="tk-field tk-labeled">${icon("bank")}<small>Conta:</small><select data-nu-filter="account" aria-label="Conta">${accountsList.map(([value, label]) => `<option value="${escape(value)}"${value === txAccount ? " selected" : ""}>${escape(label)}</option>`).join("")}</select></label>
          <label class="tk-field tk-labeled">${icon("tag")}<small>Categoria:</small><select data-nu-filter="category" aria-label="Categoria"><option value="">Todas</option>${categories.map((name) => `<option value="${escape(name)}"${name === txCategory ? " selected" : ""}>${escape(name)}</option>`).join("")}</select></label>
          ${filtered ? '<button type="button" class="crm-link" data-nu="tx-clear">Limpar filtros</button>' : ""}
        </div>
      </div>
      <div class="nu-tx-summary">${txSummary()}</div>
      <div class="nu-tx-results">${txList()}</div>`;
  }

  /* ---------- Compras (Kanban e lista) ---------- */
  const purchaseStages = {
    analysis: ["Análise de compra", "pausa"], approved: ["Aprovada", "revisao"], payment: ["Pagamento", "aguardando"],
    paid: ["Pago", "ativo"], done: ["Concluído", "novo"], cancelled: ["Cancelado", "risco"],
  };
  const purchaseCategories = ["Tecnologia", "Casa", "Trabalho", "Roupas", "Saúde", "Presente", "Lazer", "Educação", "Veículo", "Outros"];
  const purchase = (id) => data().purchases.find((item) => item.id === id);
  const paymentLabel = (item) => (item.installments ?? 1) > 1 ? `${item.installments}x${item.amount ? ` de ${money(Math.round(item.amount / item.installments))}` : ""}` : "Pagamento único";
  function purchaseFiltered() {
    const query = kit.fold(purchaseQuery.trim());
    return data().purchases.filter((item) => !query || kit.fold([item.title, item.category, item.notes ?? ""].join(" ")).includes(query))
      .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
  }
  function purchaseCard(item) {
    const link = item.link && richText.safeHref(item.link);
    const late = item.wanted && !["paid", "done", "cancelled"].includes(item.stage) && item.wanted < kit.today();
    return `<article class="task-card nu-pc-card" data-drag="${escape(item.id)}" data-id="${escape(item.id)}" tabindex="0" aria-label="${escape(item.title)}">
      <span class="task-title">${escape(item.title)}</span>
      <div class="nu-pc-meta">
        <span class="nu-pc-value">${item.amount ? money(item.amount) : '<span class="crm-faint">Sem valor</span>'}</span>
        <span class="crm-tag">${paymentLabel(item)}</span>
        ${item.category ? `<span class="crm-tag">${icon("tag")}${escape(item.category)}</span>` : ""}
        ${item.wanted ? `<span class="crm-tag${late ? " nu-late-tag" : ""}">${icon("calendar")}${kit.relativeDay(item.wanted)}</span>` : ""}
        ${item.entryId ? `<span class="crm-tag" title="Gasto lançado em Transações">${icon("check")}Lançado</span>` : ""}
        ${link ? `<button type="button" class="icon-button nu-pc-link" data-ql-open="${escape(link)}" title="Abrir link da loja" aria-label="Abrir link da loja">${icon("chain")}</button>` : ""}
      </div>
    </article>`;
  }
  function purchaseBoard(items) {
    return `<div class="task-board tk-board nu-pc-board">${Object.entries(purchaseStages).map(([stage, [label, tone]]) => {
      const list = items.filter((item) => item.stage === stage);
      const total = list.reduce((sum, item) => sum + item.amount, 0);
      return `<section class="crm-lane task-lane" data-pc-drop="${stage}" data-tone="${tone}" aria-label="${label}">
        <header class="crm-lane-head"><span class="crm-stage" data-tone="${tone}"><i></i>${label}</span><small>${list.length}</small>${total ? `<span class="nu-pc-total">${money(total)}</span>` : ""}</header>
        <div class="crm-lane-body">${list.length ? list.map(purchaseCard).join("") : `<p class="crm-lane-empty">${stage === "analysis" ? "O que você está pensando em comprar" : "Arraste compras para cá"}</p>`}</div>
        ${["analysis", "approved"].includes(stage) ? `<form class="task-quick tk-add" data-pc-add="${stage}"><span>${icon("plus")}</span><input name="title" maxlength="120" placeholder="Adicionar compra" aria-label="Adicionar compra em ${label}"></form>` : ""}
      </section>`;
    }).join("")}</div>`;
  }
  function purchaseList(items) {
    const head = `<thead><tr><th>Compra</th><th>Categoria</th><th>Pagamento</th><th>Valor</th><th>Quero até</th><th></th></tr></thead>`;
    const blocks = Object.entries(purchaseStages).map(([stage, [label, tone]]) => {
      const list = items.filter((item) => item.stage === stage);
      if (!list.length && ["cancelled", "done"].includes(stage)) return "";
      const total = list.reduce((sum, item) => sum + item.amount, 0);
      return `<tbody class="tk-group"><tr class="tk-group-row"><th colspan="6"><div class="tk-group-head"><span class="tk-group-dot" data-tone="${tone}"></span><strong>${label}</strong><small>${list.length}</small>${total ? `<span class="nu-pc-total">${money(total)}</span>` : ""}</div></th></tr>
        ${list.map((item) => {
          const link = item.link && richText.safeHref(item.link);
          return `<tr class="tk-row nu-pc-row" data-id="${escape(item.id)}">
            <td><button type="button" class="tk-title" data-nu="edit-purchase" data-id="${escape(item.id)}">${escape(item.title)}</button></td>
            <td>${item.category ? `<span class="crm-tag">${escape(item.category)}</span>` : '<span class="crm-faint">—</span>'}</td>
            <td>${paymentLabel(item)}</td>
            <td><strong>${item.amount ? money(item.amount) : "—"}</strong></td>
            <td>${item.wanted ? kit.dateText(item.wanted) : '<span class="crm-faint">—</span>'}</td>
            <td>${link ? `<button type="button" class="icon-button" data-ql-open="${escape(link)}" title="Abrir link da loja" aria-label="Abrir link da loja">${icon("chain")}</button>` : ""}</td></tr>`;
        }).join("") || `<tr class="tk-add-row"><td colspan="6"><span class="crm-faint">Nenhuma compra nesta etapa</span></td></tr>`}
      </tbody>`;
    }).join("");
    return `<div class="task-table-wrap tk-table-wrap"><table class="task-table tk-table nu-pc-table">${head}${blocks}</table></div>`;
  }
  function purchases() {
    const items = purchaseFiltered();
    const sum = (stages) => data().purchases.filter((item) => stages.includes(item.stage)).reduce((total, item) => total + item.amount, 0);
    const month = kit.today().slice(0, 7);
    const paidMonth = data().purchases.filter((item) => ["paid", "done"].includes(item.stage) && (item.stageAt ?? "").startsWith(month)).reduce((total, item) => total + item.amount, 0);
    return `<div class="crm-stats">
        ${kit.stat("Em análise", money(sum(["analysis"])), plural(data().purchases.filter((item) => item.stage === "analysis").length, "compra", "compras"), "search")}
        ${kit.stat("Aprovadas", money(sum(["approved", "payment"])), "Decididas, falta pagar", "check")}
        ${kit.stat("Pago no mês", money(paidMonth), "Compras pagas ou concluídas", "wallet")}
        ${kit.stat("Aguardando chegar", data().purchases.filter((item) => item.stage === "paid").length, "Pagas, ainda não concluídas", "clock")}
      </div>
      <div class="tk-bar"><div class="tk-bar-row">
        <label class="crm-search tk-search"><span>${icon("search")}</span><input type="search" data-nu-filter="purchase-query" value="${escape(purchaseQuery)}" placeholder="Buscar compra" aria-label="Buscar compra"></label>
        <span class="tk-spacer"></span>
        <div class="tk-views" role="group" aria-label="Visualização">${[["list", "list", "Lista"], ["board", "board", "Kanban"]].map(([key, glyph, label]) =>
          `<button type="button" data-nu="purchase-mode" data-mode="${key}" aria-pressed="${purchaseMode === key}" title="${label}" aria-label="${label}">${icon(glyph)}</button>`).join("")}</div>
        <button type="button" class="button primary" data-nu="new-purchase">${icon("plus")}Nova compra</button>
      </div></div>
      ${purchaseMode === "board" ? purchaseBoard(items) : purchaseList(items)}`;
  }
  function movePurchase(id, stage) {
    const item = purchase(id);
    if (!item || !Object.hasOwn(purchaseStages, stage) || item.stage === stage) return;
    item.stage = stage;
    item.stageAt = kit.today();
    item.order = Date.now();
    kit.touch();
    refresh();
    if (stage === "paid" && !item.entryId && item.amount) {
      kit.toast(`${item.title} pago. Lançar o gasto em Transações?`, ["Lançar", () => recordPurchase(item.id)]);
    }
  }
  function recordPurchase(id) {
    const item = purchase(id);
    if (!item) return;
    editEntry(undefined, { kind: "out", amount: item.amount, description: item.title, category: "Compras", installments: item.installments ?? 1, purchaseId: item.id,
      source: data().cards[0] && (item.installments ?? 1) > 1 ? data().cards[0].id : defaultWallet().id });
  }
  function editPurchase(id, preset = {}) {
    const item = id ? purchase(id) : undefined;
    const value = item ?? { title: "", amount: 0, installments: 1, category: "", stage: "analysis", link: "", wanted: "", notes: "", ...preset };
    kit.form({
      title: item ? "Editar compra" : "Nova compra",
      submit: item ? "Salvar" : "Adicionar",
      danger: item ? "Excluir compra" : "",
      fields: kit.field("O que comprar", kit.input("title", value.title, 'maxlength="120" required autofocus placeholder="Ex.: Lente 50mm, cadeira de escritório"'))
        + `<div class="crm-fields-pair">${kit.field("Valor (R$)", kit.input("amount", kit.moneyInput(value.amount), 'inputmode="decimal" placeholder="0,00"'))}
          ${kit.field("Pagamento", kit.select("installments", Array.from({ length: 24 }, (_, index) => [index + 1, index ? `Parcelado em ${index + 1}x` : "Pagamento único"]), value.installments ?? 1))}</div>`
        + `<div class="crm-fields-pair">${kit.field("Etapa", kit.select("stage", Object.entries(purchaseStages).map(([key, [label]]) => [key, label]), value.stage))}
          ${kit.field("Categoria", kit.input("category", value.category, 'list="nu-purchase-categories" maxlength="40" placeholder="Escolha ou digite"') + `<datalist id="nu-purchase-categories">${purchaseCategories.map((name) => `<option value="${name}">`).join("")}</datalist>`)}</div>`
        + `<div class="crm-fields-pair">${kit.field("Link da loja", kit.input("link", value.link ?? "", 'maxlength="2048" placeholder="Cole o link do produto"'))}
          ${kit.dateField("Quero até", "wanted", value.wanted ?? "", { optional: true })}</div>`
        + kit.field("Observações", kit.textarea("notes", value.notes ?? "", 'rows="3" maxlength="1000" placeholder="Modelos comparados, onde está mais barato, frete…"'))
        + (item?.entryId ? `<p class="nu-pc-recorded">${icon("check")}Gasto lançado em Transações.</p>` : item && item.amount && ["paid", "done"].includes(item.stage) ? `<button type="button" class="crm-link" data-pc-record>${icon("plus")}Lançar o gasto em Transações</button>` : ""),
      onOpen: (box) => box.querySelector("[data-pc-record]")?.addEventListener("click", () => recordPurchase(item.id)),
      onSubmit: (values, form) => {
        const cents = values.amount ? kit.parseMoney(values.amount) : 0;
        if (!values.title.trim()) return kit.invalid(form, "title", "Diga o que vai comprar.");
        if (!(cents >= 0)) return kit.invalid(form, "amount", "Valor inválido.");
        if (values.link.trim() && !richText.safeHref(values.link)) return kit.invalid(form, "link", "Link inválido.");
        const fields = { title: values.title.trim(), amount: cents, installments: Number(values.installments) || 1, category: values.category.trim(), link: values.link.trim(), wanted: values.wanted || "", notes: values.notes.trim() };
        if (item) {
          const moved = item.stage !== values.stage;
          Object.assign(item, fields);
          kit.touch();
          if (moved) movePurchase(item.id, values.stage);
          else refresh();
          return;
        }
        data().purchases.push({ id: kit.uid(), createdAt: Date.now(), order: Date.now(), stage: values.stage, stageAt: kit.today(), ...fields });
        kit.touch();
        refresh();
      },
      onDanger: () => {
        const entry = data().entries.find((candidate) => candidate.id === item.entryId);
        if (entry) delete entry.purchaseId;
        data().purchases = data().purchases.filter((candidate) => candidate !== item);
        kit.touch();
        refresh();
      },
    });
  }

  function render() {
    if (kit.discreet()) {
      content.innerHTML = `<div class="crm-panel">${kit.emptyState("eye-off", "Modo discreto ativo", "Desative o modo discreto no topo da janela para ver esta área.")}</div>`;
      return;
    }
    const views = { summary, transactions, bills, accounts, purchases };
    if (tab === "cards") tab = "accounts";
    if (!views[tab]) tab = "summary";
    if (tab !== "accounts") invoiceView = false;
    const scroll = content.querySelector(".nu-pc-board")?.scrollLeft;
    content.innerHTML = kit.tabs([["summary", "Visão geral", "grid"], ["transactions", "Transações", "swap"], ["bills", "Contas a pagar", "calendar"],
      ["accounts", "Contas", "bank"], ["purchases", "Compras", "cart"]], tab, "data-nu-tab") + views[tab]();
    for (const bar of content.querySelectorAll("[data-fill]")) bar.style.width = `${bar.dataset.fill}%`;
    if (scroll) content.querySelector(".nu-pc-board").scrollLeft = scroll;
    if (!purchaseDrag) {
      purchaseDrag = true;
      kit.draggable(content, { item: ".nu-pc-card", zone: "[data-pc-drop]", onDrop: (id, zone) => movePurchase(id, zone.dataset.pcDrop) });
    }
  }

  /* ---------- Forms ---------- */
  const categoryList = (kind) => `<datalist id="nu-categories">${(kind === "in" ? inCategories : outCategories).map((name) => `<option value="${name}">`).join("")}</datalist>`;

  function editEntry(id, preset = {}) {
    const entry = id ? data().entries.find((item) => item.id === id) : undefined;
    const value = entry ?? { kind: "out", amount: 0, date: kit.today(), description: "", category: "", source: "account", installments: 1, ...preset };
    const sources = sourceOptions("out");
    kit.form({
      title: entry ? "Editar lançamento" : "Novo lançamento",
      submit: entry ? "Salvar" : "Lançar",
      danger: entry ? "Excluir lançamento" : "",
      fields: `<fieldset class="nu-kind"><legend class="sr-only">Tipo</legend>
          <label><input type="radio" name="kind" value="out"${value.kind === "out" ? " checked" : ""}><span>Saída</span></label>
          <label><input type="radio" name="kind" value="in"${value.kind === "in" ? " checked" : ""}><span>Entrada</span></label>
          <label><input type="radio" name="kind" value="transfer"${value.kind === "transfer" ? " checked" : ""}><span>Transferência</span></label></fieldset>`
        + `<div class="crm-fields-pair">${kit.field("Valor (R$)", kit.input("amount", kit.moneyInput(value.amount), 'inputmode="decimal" required autofocus placeholder="0,00"'))}
          ${kit.dateField("Data", "date", value.date, { quick: "past" })}</div>`
        + kit.field("Descrição", kit.input("description", value.description, 'maxlength="120" placeholder="Ex.: Mercado, salário, Uber…"'))
        + `<div class="crm-fields-pair"><div class="nu-category-field">${kit.field("Categoria", kit.input("category", value.category, 'list="nu-categories" maxlength="40" placeholder="Escolha ou digite"') + categoryList(value.kind))}</div>
          <div class="kit-field nu-source-field"><span class="nu-source-label">Forma de pagamento</span>${kit.select("source", sources, value.source)}
            <button type="button" class="nu-add-source" data-new-source>${icon("plus")}Nova forma de pagamento</button></div></div>
        <div class="nu-new-source" hidden>
          <strong>Nova forma de pagamento</strong>
          <div class="crm-fields-pair">${kit.field("Nome", '<input data-source-name maxlength="40" placeholder="Ex.: Nubank, Vale-refeição, Dinheiro">')}
            ${kit.field("Tipo", `<select data-source-type>${Object.entries(walletTypes).map(([key, [label]]) => `<option value="${key}">${label}</option>`).join("")}</select>`)}</div>
          <div class="nu-new-source-actions"><button type="button" class="button" data-source-cancel>Cancelar</button><button type="button" class="button primary" data-source-save>Adicionar</button></div>
        </div>`
        + `<div class="nu-target"${value.kind === "transfer" ? "" : " hidden"}>${kit.field("Para", kit.select("target", data().wallets.filter((item) => !item.archived).map((item) => [item.id, `${item.name} · ${walletTypes[item.type]?.[0] ?? "Outro"}`]), value.target ?? (data().wallets.find((item) => isInvestment(item) && !item.archived) ?? data().wallets[0]).id))}</div>`
        + `<div class="nu-installments"${isCard(value.source) ? "" : " hidden"}>${kit.field("Parcelas", kit.select("installments", Array.from({ length: 24 }, (_, index) => [index + 1, index ? `${index + 1}x` : "À vista"]), value.installments ?? 1))}</div>`,
      onOpen: (dialog) => {
        const sync = () => {
          const kind = dialog.querySelector('[name="kind"]:checked').value;
          const source = dialog.querySelector('[name="source"]');
          dialog.querySelector("#nu-categories").innerHTML = (kind === "in" ? inCategories : outCategories).map((name) => `<option value="${name}">`).join("");
          const transfer = kind === "transfer";
          for (const option of source.options) option.disabled = kind !== "out" && isCard(option.value);
          if (kind !== "out" && isCard(source.value)) source.value = defaultWallet().id;
          ui.refresh(source);
          dialog.querySelector(".nu-installments").hidden = transfer || !isCard(source.value);
          dialog.querySelector(".nu-target").hidden = !transfer;
          dialog.querySelector(".nu-category-field").hidden = transfer;
          dialog.querySelector(".nu-source-label").textContent = transfer ? "De" : kind === "in" ? "Entrou em" : "Forma de pagamento";
        };
        const panel = dialog.querySelector(".nu-new-source");
        dialog.querySelector("[data-new-source]").addEventListener("click", () => {
          panel.hidden = false;
          panel.querySelector("[data-source-name]").focus();
        });
        panel.querySelector("[data-source-cancel]").addEventListener("click", () => { panel.hidden = true; });
        const saveSource = () => {
          const name = panel.querySelector("[data-source-name]").value.trim();
          if (!name) return panel.querySelector("[data-source-name]").focus();
          const created = { id: kit.uid(), name, type: panel.querySelector("[data-source-type]").value, color: "slate", initial: 0 };
          data().wallets.push(created);
          kit.touch();
          const source = dialog.querySelector('[name="source"]');
          const option = new Option(`${created.name} · ${walletTypes[created.type][0]}`, created.id);
          source.insertBefore(option, [...source.options].find((item) => isCard(item.value)) ?? null);
          source.value = created.id;
          source.dispatchEvent(new Event("change", { bubbles: true }));
          panel.querySelector("[data-source-name]").value = "";
          panel.hidden = true;
        };
        panel.querySelector("[data-source-save]").addEventListener("click", saveSource);
        panel.querySelector("[data-source-name]").addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            saveSource();
          }
        });
        dialog.addEventListener("change", sync);
        sync();
      },
      onSubmit: (values, form) => {
        const cents = kit.parseMoney(values.amount);
        if (!(cents > 0)) return kit.invalid(form, "amount", "Informe um valor maior que zero.");
        if (!kit.isDate(values.date)) return kit.invalid(form, "date", "Data inválida.");
        const transfer = values.kind === "transfer";
        if (transfer && (!values.target || values.target === values.source)) return kit.invalid(form, "description", "Escolha contas diferentes em De e Para.");
        const fields = {
          kind: values.kind, amount: cents, date: values.date, description: values.description.trim() || (transfer ? `Para ${sourceName(values.target)}` : ""),
          category: transfer ? "Transferência" : values.category.trim() || "Outros", source: values.kind !== "out" && isCard(values.source) ? defaultWallet().id : values.source,
          installments: values.kind !== "out" || !isCard(values.source) ? 1 : Number(values.installments) || 1,
        };
        if (transfer) fields.target = values.target;
        if (entry) {
          Object.assign(entry, fields);
          if (!transfer) delete entry.target;
        } else {
          const created = { id: kit.uid(), createdAt: Date.now(), ...fields };
          const purchase = preset.purchaseId && data().purchases.find((item) => item.id === preset.purchaseId);
          if (purchase) {
            created.purchaseId = purchase.id;
            purchase.entryId = created.id;
          }
          data().entries.push(created);
        }
        kit.touch();
        refresh();
      },
      onDanger: () => {
        removeEntry(entry);
        kit.touch();
        refresh();
      },
    });
  }

  function removeEntry(entry) {
    const store = data();
    store.entries = store.entries.filter((item) => item !== entry);
    if (entry.billId) {
      const bill = store.bills.find((item) => item.id === entry.billId);
      for (const [key, id] of Object.entries(bill?.paid ?? {})) if (id === entry.id) delete bill.paid[key];
    }
    if (entry.purchaseId) {
      const purchase = store.purchases.find((item) => item.id === entry.purchaseId);
      if (purchase?.entryId === entry.id) delete purchase.entryId;
    }
    if (entry.cardPayment) {
      const item = card(entry.cardPayment.cardId);
      if (item?.paid?.[entry.cardPayment.month] === entry.id) delete item.paid[entry.cardPayment.month];
    }
  }

  function editBill(id) {
    const bill = id ? data().bills.find((item) => item.id === id) : undefined;
    const value = bill ?? { name: "", amount: 0, category: "", recurrence: "monthly", dueDay: 10, dueDate: kit.today(), active: true };
    kit.form({
      title: bill ? "Editar conta" : "Nova conta a pagar",
      submit: bill ? "Salvar" : "Adicionar conta",
      danger: bill ? "Excluir conta" : "",
      fields: kit.field("Nome", kit.input("name", value.name, 'maxlength="80" required autofocus placeholder="Ex.: Aluguel, internet, academia"'))
        + `<div class="crm-fields-pair">${kit.field("Valor (R$)", kit.input("amount", kit.moneyInput(value.amount), 'inputmode="decimal" required placeholder="0,00"'))}
          ${kit.field("Categoria", kit.input("category", value.category, 'list="nu-categories" maxlength="40"') + categoryList("out"))}</div>`
        + `<div class="crm-fields-pair">${kit.field("Repetição", kit.select("recurrence", [["monthly", "Todo mês"], ["once", "Uma vez"]], value.recurrence))}
          <div class="nu-due-fields">${kit.field("Dia do vencimento", kit.select("dueDay", Array.from({ length: 31 }, (_, index) => [index + 1, `Dia ${index + 1}`]), value.dueDay ?? 10))}
          ${kit.dateField("Data do vencimento", "dueDate", value.dueDate ?? kit.today())}</div></div>`
        + kit.field("Pagar com", kit.select("wallet", sourceOptions("in"), value.wallet ?? data().wallets[0].id))
        + `<label class="kit-check"><input type="checkbox" name="active"${value.active ? " checked" : ""}><span>Conta ativa</span></label>`,
      onOpen: (dialog) => {
        const sync = () => {
          const monthly = dialog.querySelector('[name="recurrence"]').value === "monthly";
          dialog.querySelector('[name="dueDay"]').closest(".kit-field").hidden = !monthly;
          dialog.querySelector('[name="dueDate"]').closest(".kit-field").hidden = monthly;
        };
        dialog.addEventListener("change", sync);
        sync();
      },
      onSubmit: (values, form) => {
        const cents = kit.parseMoney(values.amount);
        if (!values.name.trim()) return kit.invalid(form, "name", "Dê um nome à conta.");
        if (!(cents > 0)) return kit.invalid(form, "amount", "Informe um valor maior que zero.");
        const monthly = values.recurrence === "monthly";
        const dueDay = Number(values.dueDay);
        if (monthly && !(dueDay >= 1 && dueDay <= 31)) return kit.invalid(form, "dueDay", "Use um dia entre 1 e 31.");
        if (!monthly && !kit.isDate(values.dueDate)) return kit.invalid(form, "dueDate", "Data inválida.");
        const fields = { name: values.name.trim(), amount: cents, category: values.category.trim() || "Outros", recurrence: values.recurrence, active: values.active === true, wallet: values.wallet };
        if (monthly) Object.assign(fields, { dueDay, dueDate: undefined });
        else Object.assign(fields, { dueDate: values.dueDate, dueDay: undefined });
        if (bill) Object.assign(bill, fields);
        else data().bills.push({ id: kit.uid(), paid: {}, startMonth: monthly ? kit.today().slice(0, 7) : values.dueDate.slice(0, 7), ...fields });
        for (const target of [bill ?? data().bills.at(-1)]) for (const key of ["dueDay", "dueDate"]) if (target[key] === undefined) delete target[key];
        kit.touch();
        refresh();
      },
      onDanger: () => {
        data().bills = data().bills.filter((item) => item !== bill);
        for (const entry of data().entries) if (entry.billId === bill.id) delete entry.billId;
        kit.touch();
        refresh();
      },
    });
  }

  function editCard(id) {
    const item = id ? card(id) : undefined;
    const value = item ?? { name: "", limit: 0, closingDay: 1, dueDay: 10, color: "violet" };
    kit.form({
      title: item ? "Editar cartão" : "Novo cartão",
      info: "Compras feitas depois do dia de fechamento entram na fatura seguinte.",
      submit: item ? "Salvar" : "Adicionar cartão",
      danger: item ? "Excluir cartão" : "",
      fields: kit.field("Nome", kit.input("name", value.name, 'maxlength="40" required autofocus placeholder="Ex.: Nubank, Inter"'))
        + kit.field("Limite (R$)", kit.input("limit", kit.moneyInput(value.limit), 'inputmode="decimal" placeholder="0,00"'))
        + `<div class="crm-fields-pair">${kit.field("Dia de fechamento", kit.select("closingDay", Array.from({ length: 31 }, (_, index) => [index + 1, `Dia ${index + 1}`]), value.closingDay))}
          ${kit.field("Dia de vencimento", kit.select("dueDay", Array.from({ length: 31 }, (_, index) => [index + 1, `Dia ${index + 1}`]), value.dueDay))}</div>`
        + kit.field("Pagar a fatura com", kit.select("payFrom", sourceOptions("in"), value.payFrom ?? data().wallets[0].id))
        + `<fieldset class="kit-swatches"><legend>Cor</legend>${Object.entries(cardColors).map(([key, label]) =>
          `<label data-color="${key}" title="${label}"><input type="radio" name="color" value="${key}"${key === value.color ? " checked" : ""}><i></i><span class="sr-only">${label}</span></label>`).join("")}</fieldset>`,
      onSubmit: (values, form) => {
        if (!values.name.trim()) return kit.invalid(form, "name", "Dê um nome ao cartão.");
        const limit = values.limit ? kit.parseMoney(values.limit) : 0;
        if (!(limit >= 0)) return kit.invalid(form, "limit", "Limite inválido.");
        const closingDay = Number(values.closingDay);
        const dueDay = Number(values.dueDay);
        if (!(closingDay >= 1 && closingDay <= 31)) return kit.invalid(form, "closingDay", "Use um dia entre 1 e 31.");
        if (!(dueDay >= 1 && dueDay <= 31)) return kit.invalid(form, "dueDay", "Use um dia entre 1 e 31.");
        const fields = { name: values.name.trim(), limit, closingDay, dueDay, color: values.color || "violet", payFrom: values.payFrom };
        if (item) Object.assign(item, fields);
        else {
          const created = { id: kit.uid(), paid: {}, ...fields };
          data().cards.push(created);
          cardId = created.id;
          cardMonth = undefined;
        }
        kit.touch();
        refresh();
      },
      onDanger: () => {
        const store = data();
        if (store.entries.some((entry) => entry.source === item.id)) {
          kit.toast("Este cartão tem compras lançadas. Exclua ou mova as compras antes.");
          return;
        }
        store.cards = store.cards.filter((entry) => entry !== item);
        cardId = undefined;
        kit.touch();
        refresh();
      },
    });
  }

  function payBill(id, key) {
    const bill = data().bills.find((item) => item.id === id);
    if (!bill || bill.paid?.[key]) return;
    const entry = { id: kit.uid(), kind: "out", amount: bill.amount, date: kit.today(), description: bill.name, category: bill.category, source: wallet(bill.wallet) ? bill.wallet : data().wallets[0].id, installments: 1, billId: bill.id };
    data().entries.push(entry);
    bill.paid ??= {};
    bill.paid[key] = entry.id;
    kit.touch();
    refresh();
    kit.toast(`${bill.name} marcada como paga.`, ["Desfazer", () => unpayBill(id, key)]);
  }

  function unpayBill(id, key) {
    const bill = data().bills.find((item) => item.id === id);
    const entry = data().entries.find((item) => item.id === bill?.paid?.[key]);
    if (entry) removeEntry(entry);
    else if (bill?.paid) delete bill.paid[key];
    kit.touch();
    refresh();
  }

  function payInvoice(id, key) {
    const item = card(id);
    if (!item || item.paid?.[key]) return;
    const current = invoice(item, key);
    if (!current.total) return;
    const entry = { id: kit.uid(), kind: "out", amount: current.total, date: kit.today(), description: `Fatura ${item.name}`, category: "Cartão", source: wallet(item.payFrom) ? item.payFrom : data().wallets[0].id, installments: 1, cardPayment: { cardId: item.id, month: key } };
    data().entries.push(entry);
    item.paid ??= {};
    item.paid[key] = entry.id;
    kit.touch();
    refresh();
    kit.toast(`Fatura ${item.name} paga.`, ["Desfazer", () => unpayInvoice(id, key)]);
  }

  function unpayInvoice(id, key) {
    const item = card(id);
    const entry = data().entries.find((entry) => entry.id === item?.paid?.[key]);
    if (entry) removeEntry(entry);
    else if (item?.paid) delete item.paid[key];
    kit.touch();
    refresh();
  }

  function refresh() {
    if (kit.isOpen("nucleus")) render();
  }

  content.addEventListener("input", (event) => {
    const filter = event.target.dataset?.nuFilter;
    if (filter === "query") {
      txQuery = event.target.value;
      content.querySelector(".nu-tx-results").innerHTML = txList();
      content.querySelector(".nu-tx-summary").innerHTML = txSummary();
    }
    if (filter === "purchase-query") {
      purchaseQuery = event.target.value;
      const items = purchaseFiltered();
      content.querySelector(".nu-pc-board, .nu-pc-table")?.closest(".nu-pc-board, .tk-table-wrap").replaceWith(Object.assign(document.createElement("template"), { innerHTML: purchaseMode === "board" ? purchaseBoard(items) : purchaseList(items) }).content);
    }
  });
  content.addEventListener("keydown", (event) => {
    const card = event.target.closest?.(".nu-pc-card");
    if (card && event.key === "Enter") editPurchase(card.dataset.id);
  });
  content.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-pc-add]");
    if (!form) return;
    event.preventDefault();
    const title = form.elements.title.value.trim();
    if (!title) return;
    data().purchases.push({ id: kit.uid(), title, amount: 0, installments: 1, category: "", link: "", wanted: "", notes: "", stage: form.dataset.pcAdd, stageAt: kit.today(), createdAt: Date.now(), order: Date.now() });
    kit.touch();
    render();
    content.querySelector(`[data-pc-add="${form.dataset.pcAdd}"] input`)?.focus();
  });
  content.addEventListener("change", (event) => {
    const filter = event.target.dataset?.nuFilter;
    if (filter === "account" || filter === "category") {
      if (filter === "account") txAccount = event.target.value;
      else txCategory = event.target.value;
      return render();
    }
    const name = event.target.name;
    if (name !== "period-from" && name !== "period-to") return;
    if (name === "period-from") period.from = event.target.value;
    else period.to = event.target.value;
    if (period.from && period.to && period.from > period.to) [period.from, period.to] = [period.to, period.from];
    render();
  });
  content.addEventListener("click", (event) => {
    const tabButton = event.target.closest("[data-nu-tab]");
    if (tabButton) {
      tab = tabButton.dataset.nuTab;
      invoiceView = false;
      return render();
    }
    const button = event.target.closest("[data-nu]");
    if (!button) {
      const cardElement = event.target.closest(".nu-pc-card");
      if (cardElement && !event.target.closest("[data-ql-open]")) editPurchase(cardElement.dataset.id);
      return;
    }
    const { nu: action, id, key } = button.dataset;
    const handlers = {
      tab: () => { tab = button.dataset.tab; render(); },
      month: () => { month = kit.addMonths(month, Number(button.dataset.step)); render(); },
      "this-month": () => { month = kit.today().slice(0, 7); render(); },
      period: () => {
        const kind = button.dataset.kind;
        if (kind === "custom") {
          const [from, to] = range();
          period = { kind, anchor: period.anchor, from, to };
        } else period = { kind, anchor: kit.today(), from: "", to: "" };
        render();
      },
      shift: () => { period = shifted(Number(button.dataset.step)); render(); },
      "period-now": () => { period = { kind: period.kind === "custom" ? "month" : period.kind, anchor: kit.today(), from: "", to: "" }; render(); },
      filter: () => { entryFilter = button.dataset.filter; render(); },
      "tx-kind": () => { txKind = button.dataset.kind; render(); },
      "tx-clear": () => { txQuery = ""; txKind = "all"; txAccount = ""; txCategory = ""; render(); },
      "account-tx": () => { tab = "transactions"; txAccount = id; txKind = "all"; render(); },
      adjust: () => adjustBalance(id),
      invest: () => editEntry(undefined, { kind: "transfer", target: id, source: defaultWallet().id, description: `Aporte · ${wallet(id)?.name ?? ""}` }),
      "new-investment": () => editWallet(undefined, { type: "investment", color: "green" }),
      "invoice-back": () => { invoiceView = false; render(); },
      "new-purchase": () => editPurchase(),
      "edit-purchase": () => editPurchase(id),
      "purchase-mode": () => { purchaseMode = button.dataset.mode; render(); },
      "edit-entry": () => editEntry(id),
      "new-bill": () => editBill(),
      "edit-bill": () => editBill(id),
      "pay-bill": () => payBill(id, key),
      "unpay-bill": () => unpayBill(id, key),
      "pay-invoice": () => payInvoice(id, key),
      "unpay-invoice": () => unpayInvoice(id, key),
      "new-card": () => editCard(),
      "new-wallet": () => editWallet(),
      "edit-wallet": () => editWallet(id),
      "edit-card": () => editCard(id),
      "open-card": () => { tab = "accounts"; invoiceView = true; cardId = id; cardMonth = undefined; render(); window.scrollTo(0, 0); },
      "pick-card": () => { cardId = id; cardMonth = undefined; render(); },
      "card-month": () => { cardMonth = kit.addMonths(cardMonth, Number(button.dataset.step)); render(); },
      "card-current": () => { cardMonth = undefined; render(); },
    };
    handlers[action]?.();
  });

  /* Upcoming items for the Today screen. */
  function upcoming(days = 7) {
    if (kit.discreet()) return [];
    const limit = kit.addDays(kit.today(), days);
    const items = [];
    for (const key of [kit.addMonths(kit.today().slice(0, 7), -1), kit.today().slice(0, 7), kit.addMonths(kit.today().slice(0, 7), 1)]) {
      for (const bill of data().bills.filter((entry) => entry.active)) {
        const state = billState(bill, key);
        if (state && !state.paid && state.due <= limit && (state.due >= kit.today() || key !== kit.addMonths(kit.today().slice(0, 7), 1))) {
          items.push({ name: bill.name, due: state.due, amount: bill.amount, late: state.due < kit.today(), pay: () => payBill(bill.id, key) });
        }
      }
      for (const item of data().cards) {
        const current = invoice(item, dueMonthToInvoice(item, key));
        if (current.total && !current.paid && current.due <= limit && current.due >= kit.addDays(kit.today(), -60)) {
          items.push({ name: `Fatura ${item.name}`, due: current.due, amount: current.total, late: current.due < kit.today(), pay: () => payInvoice(item.id, current.key) });
        }
      }
    }
    const seen = new Set();
    return items.filter((item) => !seen.has(`${item.name}${item.due}`) && seen.add(`${item.name}${item.due}`)).sort((a, b) => a.due.localeCompare(b.due));
  }

  const module = {
    validate,
    show: render,
    command: (verb, anchor) => {
      if (kit.discreet()) return;
      if (verb === "entry") editEntry();
      if (verb === "bill") editBill();
      if (verb === "add" && anchor) kit.menu(anchor, [
        { label: "Conta a pagar", icon: "calendar", hint: "aluguel, internet…", action: () => editBill() },
        { label: "Compra", icon: "cart", hint: "planejar uma compra", action: () => { tab = "purchases"; render(); editPurchase(); } },
        "-",
        { label: "Conta bancária ou carteira", icon: "bank", action: () => editWallet() },
        { label: "Investimento", icon: "trend", action: () => editWallet(undefined, { type: "investment", color: "green" }) },
        { label: "Cartão de crédito", icon: "card", action: () => editCard() },
      ], { align: "end" });
    },
    newEntry: () => editEntry(),
    showTab: (name) => {
      if (kit.discreet()) return;
      tab = name;
      invoiceView = false;
      kit.open("nucleus");
    },
    create: (kind) => {
      if (kit.discreet()) return;
      if (kind === "purchase") { tab = "purchases"; kit.open("nucleus"); editPurchase(); }
      if (kind === "bill") editBill();
      if (kind === "wallet") editWallet();
      if (kind === "investment") editWallet(undefined, { type: "investment", color: "green" });
      if (kind === "card") editCard();
    },
    upcoming,
  };
  kit.register("nucleus", "Núcleo", module);
  return module;
})();
