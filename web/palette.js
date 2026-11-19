"use strict";

const palette = (() => {
  const dialog = $("#palette");
  const input = $("#palette-input");
  const list = $("#palette-results");
  const { fold } = kit;
  const node = (tag, className, text = "") => Object.assign(document.createElement(tag), { className, textContent: text });
  const edited = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
  let results = [];
  let index = 0;

  function go(action, after) {
    return () => {
      actions[action]();
      after?.();
    };
  }

  const money = () => !kit.discreet();
  const nucleusTab = (tab) => () => nucleus.showTab(tab);

  function commands() {
    const contactNow = typeof crm.current === "function" ? crm.current() : undefined;
    return [
      ...(contactNow ? [
        { title: contactNow.favorite ? `Remover ${contactNow.name} dos favoritos` : `Favoritar ${contactNow.name}`, detail: "Contato aberto", glyph: "star", keywords: "favorito estrela contato atual", run: () => crm.toggleFavorite(contactNow.id), top: true },
        { title: `Registrar conversa com ${contactNow.name}`, detail: "Contato aberto", glyph: "message", keywords: "conversa contato atual follow", run: () => crm.logContact(contactNow.id), top: true },
      ] : []),
      { title: "Registrar conversa…", detail: "Escolher o contato", glyph: "message", keywords: "conversa follow-up networking contato ligacao reuniao", run: () => reopen("@") },
      { title: "Contatos a retomar", detail: "Follow-up atrasado ou de hoje", glyph: "alert", keywords: "follow-up retomar networking pendente", run: () => crm.showTab("contacts", "due") },
      { title: "Contatos favoritos", detail: "Lista só com os favoritos", glyph: "star", keywords: "favoritos estrela networking", run: () => crm.showTab("contacts", "favorites") },
      { title: "Aniversários", detail: "Próximos 30 dias", glyph: "cake", keywords: "aniversario networking", run: () => crm.showTab("birthdays", "all") },
      { title: "Tarefas de hoje", detail: "Prazo para hoje", glyph: "checklist", keywords: "hoje agenda prazo", run: () => tasks.showPeriod("today") },
      { title: "Tarefas atrasadas", detail: "Prazo vencido", glyph: "alert", keywords: "atraso vencidas", run: () => tasks.showPeriod("late") },
      { title: "Tarefas da semana", detail: "Próximos 7 dias", glyph: "calendar", keywords: "semana prazo", run: () => tasks.showPeriod("week") },
      { title: "Aguardando retorno", detail: "Tarefas esperando alguém", glyph: "clock", keywords: "espera retorno", run: () => tasks.showView("waiting") },
      { title: "Calendário de tarefas", detail: "Ver prazos no calendário", glyph: "calendar", keywords: "agenda mes", run: () => tasks.showView("calendar") },
      { title: "Nova anotação de reunião", detail: "Tarefa do tipo anotação", glyph: "note", keywords: "reuniao ata transcricao meeting", run: () => tasks.newTask({ type: "note" }) },
      { title: "Nova ideia no Brain", detail: "Guardar uma ideia para depois", glyph: "sparkle", keywords: "brain ideia", run: () => tasks.newTask({ status: "idea" }) },
      { title: "Processos", detail: "Modelos de tarefas e processos", glyph: "layers", keywords: "modelo template rotina", run: go("processes") },
      { title: "Visão geral do trabalho", detail: "Resumo de tarefas e projetos", glyph: "grid", keywords: "trabalho dashboard", run: go("workhome") },
      ...(money() ? [
        { title: "Transações", detail: "Núcleo · entradas e saídas", glyph: "list", keywords: "nucleo lancamentos extrato", run: nucleusTab("transactions") },
        { title: "Contas e cartões", detail: "Núcleo · saldos, investimentos e faturas", glyph: "bank", keywords: "nucleo banco saldo cartao fatura investimento", run: nucleusTab("accounts") },
        { title: "Contas a pagar", detail: "Núcleo · vencimentos", glyph: "calendar", keywords: "nucleo boleto vencimento", run: nucleusTab("bills") },
        { title: "Compras", detail: "Núcleo · Kanban de compras", glyph: "cart", keywords: "nucleo compra kanban", run: nucleusTab("purchases") },
        { title: "Nova compra", detail: "Planejar uma compra", glyph: "cart", keywords: "nucleo comprar", run: () => nucleus.create("purchase") },
        { title: "Nova conta a pagar", detail: "Aluguel, internet…", glyph: "calendar", keywords: "nucleo boleto", run: () => nucleus.create("bill") },
        { title: "Nova conta bancária", detail: "Banco, carteira ou caixa", glyph: "bank", keywords: "nucleo banco carteira caixa", run: () => nucleus.create("wallet") },
        { title: "Novo investimento", detail: "Registrar onde o dinheiro rende", glyph: "trend", keywords: "nucleo investir aplicacao", run: () => nucleus.create("investment") },
        { title: "Novo cartão de crédito", detail: "Fatura e limite", glyph: "card", keywords: "nucleo cartao", run: () => nucleus.create("card") },
      ] : []),
      { title: "Quadro dos sonhos", detail: "Galeria dos seus sonhos", glyph: "sparkle", keywords: "sonhos metas objetivos vision board", run: go("dreams") },
      { title: "Cérebro", detail: "Grafo das notas e dos links entre elas", glyph: "branch", keywords: "grafo obsidian conexoes ligacoes rede mapa", run: go("brain") },
      { title: "Novo sonho", detail: "Adicionar ao quadro dos sonhos", glyph: "plus", keywords: "sonho meta objetivo criar", run: () => dreams.newDream() },
      { title: "Recolher ou abrir a barra lateral", detail: "Mais espaço na tela", glyph: "sidebar", keywords: "menu lateral sidebar foco", run: () => document.querySelector('[data-action="sidebar"]')?.click() },
      { title: "Hoje", detail: "Ir para a página inicial", glyph: "home", keywords: "inicio painel home", run: go("today") },
      { title: "Networking", detail: "Ir para contatos e follow-up", glyph: "people", keywords: "contatos crm", run: go("crm") },
      { title: "Mapas mentais", detail: "Ir para a biblioteca de mapas", glyph: "map", keywords: "mapa quadro", run: go("library") },
      { title: "Notas", detail: "Ir para as notas", glyph: "note", keywords: "documentos", run: go("notes") },
      { title: "Nova nota", detail: "Criar uma nota em branco", glyph: "plus", keywords: "criar escrever documento", run: go("notes", () => notes.newNote()) },
      { title: "Nova tarefa", detail: "Criar uma tarefa", glyph: "checklist", keywords: "criar todo fazer", run: () => tasks.edit() },
      { title: "Novo projeto", detail: "Criar um projeto", glyph: "folder", keywords: "criar", run: go("projects", () => projects.command?.("new")) },
      { title: "Diário de hoje", detail: "Escrever o registro do dia", glyph: "book", keywords: "diario registro dia journal", run: () => journal.openToday() },
      ...(kit.discreet() ? [] : [{ title: "Novo lançamento", detail: "Registrar entrada ou saída", glyph: "wallet", keywords: "nucleo gasto despesa receita entrada saida", run: () => nucleus.newEntry() }]),
      { title: "Projetos", detail: "Ir para a galeria de projetos", glyph: "folder", keywords: "", run: go("projects") },
      { title: "Tarefas", detail: "Ir para o quadro de tarefas", glyph: "checklist", keywords: "kanban lista", run: go("tasks") },
      ...(kit.discreet() ? [] : [{ title: "Núcleo", detail: "Ir para o Núcleo", glyph: "atom", keywords: "nucleo contas cartoes", run: go("nucleus") }]),
      { title: "Modo discreto", detail: kit.discreet() ? "Desativar e mostrar o Núcleo" : "Esconder o Núcleo e os valores", glyph: kit.discreet() ? "eye" : "eye-off", keywords: "privacidade gravar video esconder", run: () => actions.discreet() },
      { title: "Novo contato", detail: "Cadastrar uma pessoa", glyph: "plus", keywords: "criar pessoa networking", run: () => crm.newContact() },
      { title: "Novo mapa", detail: "Criar um mapa mental", glyph: "plus", keywords: "criar quadro", run: go("library", () => actions["new-map"]()) },
      { title: "Novo modelo", detail: "Criar um modelo de nota", glyph: "plus", keywords: "criar template", run: go("notes", () => notes.newTemplate()) },
      { title: "Backups", detail: "Ver, criar ou restaurar backups", glyph: "drive", keywords: "copia seguranca restaurar recuperar", run: () => setTimeout(() => backups.open()) },
      { title: "Alternar tema", detail: "Claro ou escuro", glyph: "moon", keywords: "escuro claro dark light aparencia", run: () => actions.theme() },
    ].map((item) => ({ ...item, group: "Ações" }));
  }

  function records() {
    const items = [];
    for (const contact of crm.contacts()) {
      const context = contact.met?.split("\n")[0] ?? "";
      items.push({
        group: "Contatos", title: contact.name, detail: [contact.favorite ? "★ Favorito" : "", context, contact.email, contact.phone].filter(Boolean).join(" · ") || "Contato", boost: contact.favorite ? 2 : 0,
        glyph: "people", keywords: [context, contact.email, contact.phone].join(" "),
        run: () => crm.openContact(contact.id), alt: () => crm.logContact(contact.id), altLabel: "Registrar conversa",
      });
    }
    for (const note of workspace.notes ?? []) {
      const text = richText.plainText(note.body);
      items.push({
        group: "Notas", title: note.title.trim() || "Sem título", detail: note.subtitle || text || "Nota vazia", time: note.updatedAt,
        glyph: "note", keywords: `${note.subtitle} ${text}`, run: go("notes", () => notes.openById(note.id)),
      });
    }
    for (const template of workspace.noteTemplates ?? []) {
      items.push({
        group: "Modelos", title: template.title.trim() || "Modelo sem título", detail: template.subtitle || "Usar modelo para criar uma nota",
        glyph: "template", keywords: template.subtitle, time: template.updatedAt,
        run: go("notes", () => notes.useTemplate(template.id)), alt: go("notes", () => notes.openTemplate(template.id)), altLabel: "Editar modelo",
      });
    }
    for (const task of tasks.all()) {
      if (task.status === "done") continue;
      items.push({
        group: "Tarefas", title: task.title, detail: [kit.project(task.projectId)?.name, task.due ? `Prazo ${kit.relativeDay(task.due).toLowerCase()}` : "", tasks.code(task), tasks.statusNames[task.status]].filter(Boolean).join(" · "),
        glyph: "checklist", keywords: `${task.details} ${tasks.code(task)}`, run: () => tasks.edit(task.id), alt: () => tasks.toggle(task.id), altLabel: "Concluir",
      });
    }
    for (const dream of workspace.dreams ?? []) {
      items.push({
        group: "Sonhos", title: dream.title, detail: [dreams.stageNames[dream.stage], dream.category].filter(Boolean).join(" · "),
        glyph: "sparkle", keywords: `${dream.why ?? ""} ${dream.description ?? ""}`, time: dream.updatedAt,
        run: () => dreams.open(dream.id), alt: () => dreams.openPage(dream.id), altLabel: "Abrir página",
      });
    }
    for (const project of workspace.projects ?? []) {
      if (project.status === "archived") continue;
      items.push({ group: "Projetos", title: project.name, detail: project.description || "Projeto", glyph: "folder", keywords: "", run: () => projects.open(project.id) });
    }
    for (const map of workspace.maps) {
      items.push({
        group: "Mapas", title: map.title, detail: `${map.nodes.length} ${map.nodes.length === 1 ? "tópico" : "tópicos"}`,
        glyph: "map", keywords: map.nodes.map((topic) => topic.title).join(" "), time: Date.parse(map.updatedAt ?? "") || 0,
        run: () => openMap(map),
      });
    }
    return items;
  }

  function score(item, terms) {
    const title = fold(item.title);
    const rest = fold(`${item.detail} ${item.keywords ?? ""}`);
    let total = 0;
    for (const term of terms) {
      if (title.startsWith(term)) total += 6;
      else if (title.split(/\s+/).some((word) => word.startsWith(term))) total += 4;
      else if (title.includes(term)) total += 3;
      else if (rest.includes(term)) total += 1;
      else return 0;
    }
    return total + (item.boost ?? 0);
  }

  const prefixes = { ">": ["Ações"], "@": ["Contatos"], "#": ["Tarefas"], "/": ["Notas", "Modelos"] };

  function reopen(prefix) {
    setTimeout(() => {
      open();
      input.value = prefix;
      render();
    });
  }

  function byCode(text) {
    const match = /^(?:tk-?)?0*(\d{1,6})$/i.exec(text);
    if (!match) return [];
    const task = tasks.all().find((item) => item.code === Number(match[1]));
    return task ? [{ group: "Tarefas", title: task.title, detail: [tasks.code(task), tasks.statusNames[task.status], kit.project(task.projectId)?.name].filter(Boolean).join(" · "),
      glyph: "checklist", run: () => tasks.edit(task.id), alt: () => tasks.openPage(task.id), altLabel: "Abrir página" }] : [];
  }

  function search() {
    const raw = input.value.trim();
    const only = prefixes[raw[0]];
    const text = only ? raw.slice(1).trim() : raw;
    const terms = fold(text).split(/\s+/).filter(Boolean);
    const exact = !only || only.includes("Tarefas") ? byCode(text) : [];
    if (only) {
      const pool = (only.includes("Ações") ? commands() : records()).filter((item) => only.includes(item.group));
      if (!terms.length) return pool.slice(0, 40);
      const found = pool.map((item) => ({ item, value: score(item, terms) })).filter(({ value }) => value)
        .sort((a, b) => b.value - a.value).map(({ item }) => item).slice(0, 40);
      return [...exact, ...found.filter((item) => !exact.some((hit) => hit.title === item.title))];
    }
    const groups = ["Ações", "Links", "Tarefas", "Projetos", "Contatos", "Sonhos", "Notas", "Modelos", "Mapas"];
    if (!terms.length) {
      const recent = records().filter((item) => item.time && item.group !== "Modelos")
        .sort((a, b) => b.time - a.time).slice(0, 5).map((item) => ({ ...item, group: "Recentes" }));
      const all = commands();
      return [...all.filter((item) => item.top), ...recent, ...all.filter((item) => !item.top)];
    }
    const results = [...commands(), ...records()]
      .map((item) => ({ item, value: score(item, terms) }))
      .filter(({ value }) => value)
      .sort((a, b) => groups.indexOf(a.item.group) - groups.indexOf(b.item.group) || b.value - a.value)
      .reduce((kept, { item }) => {
        if (kept.filter((entry) => entry.group === item.group).length < 6) kept.push(item);
        return kept;
      }, [])
      .sort((a, b) => (a.group === "Ações") - (b.group === "Ações"));
    return exact.length ? [...exact, ...results.filter((item) => !(item.group === "Tarefas" && item.title === exact[0].title))] : results;
  }

  function render() {
    results = search();
    index = Math.min(index, Math.max(0, results.length - 1));
    list.replaceChildren();
    if (!results.length) {
      list.append(node("p", "palette-empty", "Nada encontrado. Tente outra palavra."));
      input.removeAttribute("aria-activedescendant");
      return;
    }
    let group;
    results.forEach((item, position) => {
      if (item.group !== group) {
        group = item.group;
        list.append(node("p", "palette-group", group));
      }
      const option = node("div", "palette-option");
      option.id = `palette-option-${position}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(position === index));
      option.dataset.index = position;
      const mark = node("span", "palette-icon");
      mark.innerHTML = icon(item.glyph);
      const text = node("span", "palette-text");
      text.append(node("strong", "", item.title), node("small", "", item.detail));
      option.append(mark, text);
      if (item.time && item.group !== "Ações") option.append(node("time", "palette-time", edited.format(new Date(item.time)).replace(".", "")));
      if (item.alt) {
        const alt = node("button", "palette-alt", item.altLabel);
        alt.type = "button";
        alt.tabIndex = -1;
        alt.dataset.alt = position;
        option.append(alt);
      }
      list.append(option);
    });
    const selected = list.querySelector('[aria-selected="true"]');
    input.setAttribute("aria-activedescendant", selected.id);
    selected.scrollIntoView({ block: "nearest" });
    $("#palette-hint-alt").hidden = !results[index]?.alt;
    $("#palette-hint-alt-label").textContent = results[index]?.altLabel ?? "";
  }

  function choose(position, alternate = false) {
    const item = results[position];
    if (!item) return;
    dialog.close();
    (alternate && item.alt ? item.alt : item.run)();
  }

  function open() {
    if (!workspace || dialog.open || document.querySelector("dialog[open]")) return;
    input.value = "";
    index = 0;
    render();
    dialog.showModal();
    input.focus();
  }

  input.addEventListener("input", () => {
    index = 0;
    render();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length) index = (index + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
      render();
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(index, event.shiftKey);
    }
  });
  list.addEventListener("mousemove", (event) => {
    const option = event.target.closest(".palette-option");
    if (!option || Number(option.dataset.index) === index) return;
    index = Number(option.dataset.index);
    for (const item of list.querySelectorAll(".palette-option")) {
      item.setAttribute("aria-selected", String(item === option));
    }
    input.setAttribute("aria-activedescendant", option.id);
    $("#palette-hint-alt").hidden = !results[index]?.alt;
    $("#palette-hint-alt-label").textContent = results[index]?.altLabel ?? "";
  });
  list.addEventListener("click", (event) => {
    const alt = event.target.closest("[data-alt]");
    if (alt) return choose(Number(alt.dataset.alt), true);
    const option = event.target.closest(".palette-option");
    if (option) choose(Number(option.dataset.index));
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k" &&
        !event.target.closest?.('.rich-doc[contenteditable="true"]')) {
      event.preventDefault();
      if (dialog.open) dialog.close();
      else open();
    }
  }, true);
  $("#palette-open").addEventListener("click", open);

  return { open };
})();
