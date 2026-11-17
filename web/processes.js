"use strict";

/* Processos (sequências de tarefas aplicadas a um projeto, únicas ou mensais)
   e modelos de tarefa (uma tarefa pronta com checklist). */
const processes = (() => {
  const content = $("#processes-content");
  const { escape } = kit;
  let tab = "processes";
  const cadences = { once: "Uma vez", monthly: "Todo mês" };

  /* A new install starts empty: no sample processes or templates. */
  const all = () => workspace.processes ??= [];
  const templates = () => workspace.taskTemplates ??= [];

  function validate(data) {
    const strings = (value) => value === undefined || (Array.isArray(value) && value.every((item) => typeof item === "string"));
    return kit.list(data.processes, (item) => typeof item.name === "string" && Object.hasOwn(cadences, item.cadence) &&
      Array.isArray(item.steps) && item.steps.every((step) => typeof step.title === "string" && Number.isInteger(step.offset))) &&
      kit.list(data.taskTemplates, (item) => typeof item.name === "string" && strings(item.checklist));
  }

  /* Tasks created by a process on a project. */
  const runs = (projectId) => {
    const map = new Map();
    for (const task of tasks.all()) {
      if (!task.origin || (projectId && task.projectId !== projectId)) continue;
      const key = `${task.origin.processId}|${task.origin.cycle ?? ""}|${task.projectId}`;
      if (!map.has(key)) map.set(key, { ...task.origin, projectId: task.projectId, items: [] });
      map.get(key).items.push(task);
    }
    return [...map.values()];
  };

  function apply(process, projectId, start, month) {
    const cycle = process.cadence === "monthly" ? month : "";
    const exists = runs(projectId).some((run) => run.processId === process.id && (run.cycle ?? "") === cycle);
    if (exists && process.cadence === "monthly") {
      kit.toast(`Este projeto já tem o ciclo de ${kit.monthText(month)}.`);
      return false;
    }
    const base = process.cadence === "monthly" ? `${month}-01` : start;
    const lastDay = process.cadence === "monthly" ? kit.addDays(kit.addMonths(month, 1) + "-01", -1) : "";
    const suffix = process.cadence === "monthly" ? ` · ${kit.monthShort(`${month}-01`)}/${month.slice(2, 4)}` : "";
    const created = process.steps.map((step) => {
      let due = kit.addDays(base, process.cadence === "monthly" ? step.offset - 1 : step.offset);
      if (lastDay && due > lastDay) due = lastDay;
      return tasks.create({ title: `${step.title}${suffix}`, status: "todo", priority: step.priority ?? "", due, projectId,
        origin: { processId: process.id, name: process.name, cycle } });
    });
    kit.touch();
    if (kit.isOpen("processes")) render();
    kit.toast(`${created.length} tarefas criadas por “${process.name}”.`, ["Ver tarefas", () => tasks.showProject(projectId)]);
    return true;
  }

  function applyForm(process, projectId = "") {
    const month = kit.today().slice(0, 7);
    const months = [-1, 0, 1, 2].map((step) => kit.addMonths(month, step));
    kit.form({
      title: `Aplicar “${process.name}”`,
      info: process.cadence === "monthly"
        ? "Cria as tarefas do ciclo do mês escolhido no projeto. Cada mês só pode ser aplicado uma vez por projeto."
        : "Cria uma tarefa para cada etapa, com entrega contada a partir da data de início.",
      submit: "Criar tarefas",
      fields: `${kit.field("Projeto", kit.select("projectId", kit.projectOptions(projectId, "Escolha um projeto"), projectId))}
        ${process.cadence === "monthly"
          ? kit.field("Ciclo", kit.select("month", months.map((item) => [item, kit.monthText(item).replace(/^./, (letter) => letter.toUpperCase())]), month))
          : kit.dateField("Início", "start", kit.today())}
        <ol class="pr-preview">${process.steps.map((step) => `<li><span>${escape(step.title)}</span><small>${process.cadence === "monthly" ? `dia ${step.offset}` : step.offset ? `+${step.offset} dias` : "no início"}</small></li>`).join("")}</ol>`,
      onSubmit: (values, form) => {
        if (!values.projectId) return kit.invalid(form, "projectId", "Escolha o projeto.");
        if (process.cadence !== "monthly" && !values.start) {
          kit.toast("Escolha a data de início.");
          return false;
        }
        return apply(process, values.projectId, values.start, values.month);
      },
    });
  }

  function editProcess(id) {
    const process = all().find((item) => item.id === id);
    const value = process ?? { name: "", desc: "", cadence: "once", steps: [{ id: kit.uid(), title: "", offset: 0, priority: "" }] };
    const stepRow = (step) => `<li class="pr-step" data-step="${escape(step.id)}">
      <span class="pr-grip">${icon("grip")}</span>
      <input name="step-title" value="${escape(step.title)}" maxlength="160" placeholder="Nome da etapa" aria-label="Nome da etapa">
      <label class="pr-offset"><small data-unit>${value.cadence === "monthly" ? "dia" : "+dias"}</small><input name="step-offset" type="number" min="0" max="365" value="${step.offset}" aria-label="Prazo"></label>
      <button type="button" class="icon-button sub-remove" data-pr-step="remove" aria-label="Remover etapa">${icon("close")}</button></li>`;
    kit.form({
      title: process ? "Editar processo" : "Novo processo",
      info: "Um processo é uma sequência de tarefas que você aplica a um projeto. Em “Todo mês”, o número é o dia do mês da entrega.",
      submit: process ? "Salvar" : "Criar processo",
      danger: process ? "Excluir processo" : undefined,
      onDanger: () => {
        const index = all().indexOf(process);
        all().splice(index, 1);
        kit.touch();
        render();
        kit.toast("Processo excluído.", ["Desfazer", () => { all().splice(index, 0, process); kit.touch(); render(); }]);
      },
      fields: `${kit.field("Nome", kit.input("name", value.name, 'maxlength="120" required autofocus placeholder="Ex.: Onboarding de cliente"'))}
        ${kit.field("Descrição", kit.input("desc", value.desc ?? "", 'maxlength="300" placeholder="Opcional"'))}
        ${kit.field("Repetição", kit.select("cadence", Object.entries(cadences), value.cadence))}
        <div class="kit-field"><span>Etapas</span><ol class="pr-steps">${value.steps.map(stepRow).join("")}</ol>
          <button type="button" class="crm-link pr-add-step" data-pr-step="add">${icon("plus")}Adicionar etapa</button></div>`,
      onOpen: (dialog) => {
        const list = dialog.querySelector(".pr-steps");
        list.parentElement.addEventListener("click", (event) => {
          const button = event.target.closest("[data-pr-step]");
          if (!button) return;
          if (button.dataset.prStep === "add") {
            list.insertAdjacentHTML("beforeend", stepRow({ id: kit.uid(), title: "", offset: 0 }));
            list.lastElementChild.querySelector("input").focus();
          } else if (list.children.length > 1) button.closest(".pr-step").remove();
        });
        dialog.querySelector('[name="cadence"]').addEventListener("change", (event) => {
          for (const unit of list.querySelectorAll("[data-unit]")) unit.textContent = event.target.value === "monthly" ? "dia" : "+dias";
        });
      },
      onSubmit: (values, form) => {
        if (!values.name.trim()) return kit.invalid(form, "name", "Dê um nome ao processo.");
        const steps = [...form.querySelectorAll(".pr-step")].map((row) => ({
          id: row.dataset.step, title: row.querySelector('[name="step-title"]').value.trim(),
          offset: Math.max(0, Math.min(365, Math.round(Number(row.querySelector('[name="step-offset"]').value) || 0))),
          priority: value.steps.find((step) => step.id === row.dataset.step)?.priority ?? "",
        })).filter((step) => step.title);
        if (!steps.length) {
          kit.toast("Adicione pelo menos uma etapa com nome.");
          return false;
        }
        const target = process ?? { id: kit.uid(), createdAt: Date.now() };
        Object.assign(target, { name: values.name.trim(), desc: values.desc.trim(), cadence: values.cadence, steps });
        if (!process) all().push(target);
        kit.touch();
        render();
      },
    });
  }

  function editTemplate(id) {
    const template = templates().find((item) => item.id === id);
    const value = template ?? { name: "", desc: "", priority: "", checklist: [] };
    kit.form({
      title: template ? "Editar modelo de tarefa" : "Novo modelo de tarefa",
      info: "Modelos aparecem em “Nova tarefa ▾” e preenchem nome, descrição, prioridade e checklist.",
      submit: template ? "Salvar" : "Criar modelo",
      danger: template ? "Excluir modelo" : undefined,
      onDanger: () => {
        workspace.taskTemplates = templates().filter((item) => item !== template);
        kit.touch();
        render();
      },
      fields: `${kit.field("Nome", kit.input("name", value.name, 'maxlength="120" required autofocus placeholder="Ex.: Revisão de entrega"'))}
        ${kit.field("Prioridade", kit.select("priority", Object.entries(tasks.priorities), value.priority ?? ""))}
        ${kit.field("Descrição", kit.textarea("desc", value.desc ?? "", 'rows="4" maxlength="2000" placeholder="Contexto padrão da tarefa"'))}
        ${kit.field("Checklist", kit.textarea("checklist", (value.checklist ?? []).join("\n"), 'rows="5" maxlength="3000" placeholder="Um item por linha"'))}`,
      onSubmit: (values, form) => {
        if (!values.name.trim()) return kit.invalid(form, "name", "Dê um nome ao modelo.");
        const target = template ?? { id: kit.uid(), createdAt: Date.now() };
        Object.assign(target, { name: values.name.trim(), desc: values.desc.trim(), priority: values.priority,
          checklist: values.checklist.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 40) });
        if (!template) templates().push(target);
        kit.touch();
        render();
      },
    });
  }

  function render() {
    const list = all();
    const usage = runs();
    const tabsHtml = `<nav class="sub-tabs">${[["processes", "Processos", "layers", list.length], ["templates", "Modelos de tarefa", "template", templates().length]].map(([key, label, glyph, count]) =>
      `<button type="button" data-pr-tab="${key}" aria-pressed="${tab === key}">${icon(glyph)}${label}<small>${count}</small></button>`).join("")}</nav>`;
    const processCards = list.map((process) => {
      const applied = usage.filter((run) => run.processId === process.id);
      const projectsUsing = [...new Set(applied.map((run) => run.projectId))].map((id) => kit.project(id)).filter(Boolean);
      return `<article class="crm-panel pr-card">
        <header class="pr-card-head"><div><h2>${escape(process.name)}</h2>${process.desc ? `<p>${escape(process.desc)}</p>` : ""}</div>
          <span class="crm-pill">${process.cadence === "monthly" ? icon("history") : ""}${cadences[process.cadence]}</span></header>
        <ol class="pr-preview">${process.steps.slice(0, 6).map((step) => `<li><span>${escape(step.title)}</span><small>${process.cadence === "monthly" ? `dia ${step.offset}` : step.offset ? `+${step.offset}d` : "início"}</small></li>`).join("")}
          ${process.steps.length > 6 ? `<li class="pr-more">+ ${process.steps.length - 6} etapas</li>` : ""}</ol>
        <footer class="pr-card-foot">
          <span class="pr-using">${projectsUsing.length ? projectsUsing.slice(0, 3).map((item) => kit.projectChip(item.id)).join("") : '<small class="crm-faint">Ainda não aplicado</small>'}</span>
          <button type="button" class="button" data-pr="edit" data-id="${escape(process.id)}">Editar</button>
          <button type="button" class="button primary" data-pr="apply" data-id="${escape(process.id)}">Aplicar a projeto</button>
        </footer></article>`;
    }).join("");
    const templateCards = templates().map((item) => `<article class="crm-panel pr-card">
        <header class="pr-card-head"><div><h2>${escape(item.name)}</h2>${item.desc ? `<p>${escape(item.desc)}</p>` : ""}</div>${item.priority ? `<span class="task-priority" data-priority="${item.priority}">${icon("flag")}${tasks.priorities[item.priority]}</span>` : ""}</header>
        ${item.checklist?.length ? `<ul class="pr-check">${item.checklist.slice(0, 5).map((line) => `<li>${icon("check")}<span>${escape(line)}</span></li>`).join("")}${item.checklist.length > 5 ? `<li class="pr-more">+ ${item.checklist.length - 5} itens</li>` : ""}</ul>` : ""}
        <footer class="pr-card-foot"><span class="pr-using"></span>
          <button type="button" class="button" data-pr="edit-template" data-id="${escape(item.id)}">Editar</button>
          <button type="button" class="button primary" data-pr="use-template" data-id="${escape(item.id)}">Criar tarefa</button></footer></article>`).join("");
    const empty = tab === "processes"
      ? kit.emptyState("layers", "Nenhum processo ainda", "Crie uma sequência de tarefas para repetir em cada projeto.")
      : kit.emptyState("template", "Nenhum modelo ainda", "Modelos deixam tarefas recorrentes prontas em um clique.");
    content.innerHTML = `<div class="pr-top">${tabsHtml}
        <button type="button" class="button" data-pr="${tab === "processes" ? "new" : "new-template"}">${icon("plus")}${tab === "processes" ? "Novo processo" : "Novo modelo"}</button></div>
      ${(tab === "processes" ? list.length : templates().length) ? `<div class="pr-grid">${tab === "processes" ? processCards : templateCards}</div>` : empty}`;
  }

  content.addEventListener("click", (event) => {
    const tabButton = event.target.closest("[data-pr-tab]");
    if (tabButton) {
      tab = tabButton.dataset.prTab;
      return render();
    }
    const button = event.target.closest("[data-pr]");
    if (!button) return;
    const { pr: action, id } = button.dataset;
    if (action === "new") editProcess();
    if (action === "edit") editProcess(id);
    if (action === "apply") applyForm(all().find((item) => item.id === id));
    if (action === "new-template") editTemplate();
    if (action === "edit-template") editTemplate(id);
    if (action === "use-template") {
      const item = templates().find((entry) => entry.id === id);
      tasks.newTask({ title: item.name, details: item.desc ?? "", priority: item.priority ?? "", checklist: (item.checklist ?? []).map((title) => ({ id: kit.uid(), title, done: false })) });
    }
  });

  const module = {
    validate, show: render, all, templates, runs, apply, applyForm,
    command: (verb) => { if (verb === "new") editProcess(); },
    showTab: (name) => { tab = name; kit.open("processes"); },
  };
  kit.register("processes", "Processos", module);
  return module;
})();
