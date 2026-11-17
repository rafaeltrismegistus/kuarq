"use strict";

/* Trabalho · Visão geral: o que precisa de atenção em tarefas, projetos, marcos e metas. */
const workhome = (() => {
  const content = $("#workhome-content");
  const { escape } = kit;
  const tones = { idea: "pausa", todo: "novo", doing: "aproximacao", waiting: "aguardando", review: "revisao", done: "ativo" };

  function render() {
    const today = kit.today();
    const list = tasks.all();
    const open = list.filter((task) => !["done", "idea"].includes(task.status));
    const late = open.filter(tasks.isLate).sort((a, b) => a.due.localeCompare(b.due));
    const waiting = open.filter((task) => task.status === "waiting");
    const waitingLong = waiting.filter((task) => task.waitingSince && -kit.daysUntil(task.waitingSince) >= 3);
    const week = open.filter((task) => task.due && task.due >= today && kit.daysUntil(task.due) <= 7).sort((a, b) => a.due.localeCompare(b.due));
    const doneWeek = list.filter((task) => task.status === "done" && task.doneAt && -kit.daysUntil(task.doneAt) <= 7).length;
    const projectList = projects.all().filter((item) => item.status !== "archived");
    const running = projectList.filter((item) => item.status !== "done");
    const health = running.filter((item) => ["risk", "attention"].includes(item.health));
    const milestones = running.flatMap((project) => (project.milestones ?? []).filter((item) => !item.done).map((item) => ({ ...item, project })))
      .sort((a, b) => a.date.localeCompare(b.date));
    const lateMilestones = milestones.filter((item) => item.date < today);
    const nextMilestones = milestones.filter((item) => item.date >= today && kit.daysUntil(item.date) <= 30).slice(0, 6);
    const goals = running.flatMap((project) => (project.goals ?? []).map((goal) => ({ goal, project, pace: projects.pace(goal) })));
    const goalsBehind = goals.filter((item) => ["risco", "aproximacao"].includes(item.pace.tone));

    const attention = [
      ...late.slice(0, 5).map((task) => ({ glyph: "alert", tone: "danger", title: task.title, detail: `Atrasada desde ${kit.dateText(task.due)}${task.projectId ? ` · ${kit.project(task.projectId)?.name ?? ""}` : ""}`, attr: `data-wh="task" data-id="${escape(task.id)}"` })),
      ...waitingLong.slice(0, 4).map((task) => ({ glyph: "clock", tone: "warning", title: task.title, detail: `Aguardando retorno há ${-kit.daysUntil(task.waitingSince)} dias`, attr: `data-wh="task" data-id="${escape(task.id)}"` })),
      ...lateMilestones.slice(0, 3).map((item) => ({ glyph: "diamond", tone: "danger", title: item.title, detail: `Marco atrasado · ${item.project.name}`, attr: `data-wh="project" data-id="${escape(item.project.id)}"` })),
      ...health.map((project) => ({ glyph: "folder", tone: project.health === "risk" ? "danger" : "warning", title: project.name, detail: `Projeto ${project.health === "risk" ? "em risco" : "pede atenção"}`, attr: `data-wh="project" data-id="${escape(project.id)}"` })),
      ...goalsBehind.slice(0, 3).map((item) => ({ glyph: "target", tone: item.pace.tone === "risco" ? "danger" : "warning", title: item.goal.title, detail: `${item.pace.label} · ${item.project.name}`, attr: `data-wh="project" data-id="${escape(item.project.id)}"` })),
    ];

    const stageCounts = projects.stages.map(([key, label, tone]) => [key, label, tone, running.concat(projectList.filter((item) => item.status === "done")).filter((item) => item.status === key)]);
    const taskRow = (task) => `<li class="task-row">
      <span class="task-ring" data-tone="${tones[task.status]}" data-status="${task.status}"></span>
      <button type="button" class="task-title" data-wh="task" data-id="${escape(task.id)}">${escape(task.title)}</button>
      <span class="task-row-meta">${kit.projectChip(task.projectId)}${tasks.dueBadge(task)}</span></li>`;

    content.innerHTML = `<div class="crm-stats">
        ${kit.stat("Tarefas abertas", open.length, `${open.filter((task) => task.status === "doing").length} em andamento · ${doneWeek} concluídas em 7 dias`, "checklist", "muted", 'data-wh="tasks"')}
        ${kit.stat("Atrasadas", late.length, late.length ? "Passaram da entrega" : "Nada atrasado", "alert", late.length ? "danger" : "muted", 'data-wh="late"')}
        ${kit.stat("Aguardando retorno", waiting.length, waitingLong.length ? `${waitingLong.length} há 3 dias ou mais` : "Nenhuma parada há muito tempo", "clock", waitingLong.length ? "warning" : "muted", 'data-wh="waiting"')}
        ${kit.stat("Projetos em andamento", running.length, health.length ? `${health.length} pedem atenção` : "Todos sem alerta", "folder", health.length ? "warning" : "muted", 'data-wh="projects"')}
      </div>
      <div class="crm-overview">
        <div class="crm-overview-main">
          ${kit.panel("Precisa de atenção", "alert", attention.length ? `<ul class="wh-attention">${attention.map((item) => `<li><button type="button" ${item.attr}>
              <span class="wh-icon" data-tone="${item.tone}">${icon(item.glyph)}</span><span><strong>${escape(item.title)}</strong><small>${escape(item.detail)}</small></span>${icon("chevron-right")}</button></li>`).join("")}</ul>`
            : kit.emptyState("check", "Tudo em dia", "Nenhuma tarefa atrasada, retorno parado ou projeto em risco."))}
          ${kit.panel("Entregas dos próximos 7 dias", "calendar", week.length ? `<ul class="task-rows">${week.slice(0, 10).map(taskRow).join("")}</ul>${week.length > 10 ? `<p class="notes-more">+ ${week.length - 10} tarefas</p>` : ""}`
            : `<p class="project-empty-line">Nenhuma entrega marcada para esta semana.</p>`,
            `<button type="button" class="crm-link" data-wh="calendar">Calendário${icon("arrow")}</button>`)}
        </div>
        <div class="crm-overview-side">
          ${kit.panel("Projetos por etapa", "layers", `<ul class="wh-stages">${stageCounts.map(([key, label, tone, items]) => `<li data-tone="${tone}"><button type="button" data-wh="projects">
              <span class="crm-stage" data-tone="${tone}"><i></i>${label}</span><strong>${items.length}</strong></button></li>`).join("")}</ul>`)}
          ${kit.panel("Próximos marcos", "diamond", nextMilestones.length ? `<ul class="wh-milestones">${nextMilestones.map((item) => `<li><button type="button" data-wh="project" data-id="${escape(item.project.id)}">
              <span class="wh-date"><strong>${item.date.slice(8)}</strong><small>${kit.monthShort(item.date)}</small></span>
              <span><strong>${escape(item.title)}</strong><small>${escape(item.project.name)} · ${kit.relativeDay(item.date).toLowerCase()}</small></span></button></li>`).join("")}</ul>`
            : `<p class="project-empty-line">Nenhum marco nos próximos 30 dias.</p>`)}
          ${kit.panel("Metas", "target", goals.length ? `<ul class="wh-goals">${goals.slice(0, 6).map(({ goal, project, pace }) => `<li><button type="button" data-wh="project" data-id="${escape(project.id)}">
              <span class="wh-goal-top"><strong>${escape(goal.title)}</strong><span class="project-health" data-tone="${pace.tone}"><i></i>${pace.label}</span></span>
              <span class="crm-bar"><span data-fill="${Math.round(pace.progress * 100)}"></span></span><small>${escape(project.name)}</small></button></li>`).join("")}</ul>`
            : `<p class="project-empty-line">Crie metas dentro dos projetos para acompanhar o ritmo aqui.</p>`)}
        </div>
      </div>`;
    for (const bar of content.querySelectorAll("[data-fill]")) bar.style.width = `${bar.dataset.fill}%`;
  }

  content.addEventListener("click", (event) => {
    const button = event.target.closest("[data-wh]");
    if (!button) return;
    const { wh: action, id } = button.dataset;
    if (action === "task") tasks.open(id);
    if (action === "project") projects.open(id);
    if (action === "projects") actions.projects();
    if (action === "tasks") actions.tasks();
    if (action === "late" || action === "waiting" || action === "calendar") tasks.showView(action);
  });
  $("#drawer").addEventListener("close", () => { if (kit.isOpen("workhome")) render(); });

  const module = { show: render };
  kit.register("workhome", "Visão geral", module);
  return module;
})();
