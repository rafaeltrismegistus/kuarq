"use strict";

const links = (() => {
  const content = $("#links-content");
  const kinds = { url: ["Site", "globe"], folder: ["Pasta", "folder"], file: ["Arquivo", "file"] };
  const { escape, fold } = kit;
  let query = "";

  const all = () => workspace.links ??= [];
  const find = (id) => all().find((item) => item.id === id);

  function validate(data) {
    return kit.list(data.links, (item) => typeof item.title === "string" && item.title.trim().length > 0 &&
      typeof item.target === "string" && item.target.length > 0 && item.target.length <= 2048 &&
      Object.hasOwn(kinds, item.kind) && typeof item.group === "string" && typeof item.pinned === "boolean" &&
      (item.uses === undefined || Number.isInteger(item.uses)));
  }

  function guessKind(target) {
    if (/^(https?:\/\/|mailto:)/i.test(target)) return "url";
    if (/^www\./i.test(target)) return "url";
    return /\.[a-z0-9]{1,6}$/i.test(target.split(/[\\/]/).pop() ?? "") ? "file" : "folder";
  }

  function normalize(target) {
    const value = target.trim().replace(/^"(.*)"$/, "$1");
    return /^www\./i.test(value) ? `https://${value}` : value;
  }

  function where(item) {
    if (item.kind !== "url") return item.target;
    try {
      const url = new URL(item.target);
      return url.hostname.replace(/^www\./, "") + (url.pathname.length > 1 ? url.pathname : "");
    } catch {
      return item.target;
    }
  }

  async function launch(id) {
    const item = find(id);
    if (!item) return;
    try {
      await host("open-link", item.target);
      item.uses = (item.uses ?? 0) + 1;
      item.lastUsed = Date.now();
      changed(800);
    } catch (error) {
      kit.toast(item.kind === "url" ? "Não foi possível abrir este endereço." : "Não encontrei esse arquivo ou pasta. Confira o caminho.");
    }
  }

  function tile(item) {
    const [label, glyph] = kinds[item.kind];
    return `<article class="link-tile" data-kind="${item.kind}">
      <button type="button" class="link-open" data-link="open" data-id="${escape(item.id)}" title="Abrir ${escape(item.title)}">
        <span class="link-icon">${icon(glyph)}</span>
        <span class="link-text"><strong>${escape(item.title)}</strong><small>${escape(where(item))}</small></span>
        <span class="link-go">${icon("open")}</span>
      </button>
      <div class="link-actions">
        <button type="button" data-link="pin" data-id="${escape(item.id)}" aria-pressed="${item.pinned}" title="${item.pinned ? "Tirar dos favoritos" : "Favoritar"}" aria-label="${item.pinned ? "Tirar dos favoritos" : "Favoritar"}">${icon("star")}</button>
        <button type="button" data-link="edit" data-id="${escape(item.id)}" title="Editar" aria-label="Editar ${escape(item.title)}">${icon("edit")}</button>
      </div>
      ${kit.projectChip(item.projectId) ? `<span class="link-project">${kit.projectChip(item.projectId)}</span>` : ""}
      <span class="sr-only">${label}</span>
    </article>`;
  }

  function render() {
    const terms = fold(query).split(/\s+/).filter(Boolean);
    const items = all().filter((item) => terms.every((term) => fold(`${item.title} ${item.target} ${item.group}`).includes(term)))
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    const pinned = items.filter((item) => item.pinned);
    const groups = new Map();
    for (const item of items.filter((entry) => !entry.pinned)) {
      const key = item.group.trim() || "Geral";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    const most = [...all()].filter((item) => item.uses).sort((a, b) => b.uses - a.uses).slice(0, 5);
    const sections = [];
    if (pinned.length) sections.push(`<section class="link-group"><h2>${icon("star")}Favoritos<small>${pinned.length}</small></h2><div class="link-grid">${pinned.map(tile).join("")}</div></section>`);
    for (const [name, list] of [...groups].sort(([a], [b]) => a.localeCompare(b, "pt-BR"))) {
      sections.push(`<section class="link-group"><h2>${icon("folder")}${escape(name)}<small>${list.length}</small></h2><div class="link-grid">${list.map(tile).join("")}</div></section>`);
    }
    content.innerHTML = `<div class="module-tools">
        <div class="module-tools-left">
          <label class="crm-search"><span>${icon("search")}</span><input type="search" data-link-search value="${escape(query)}" placeholder="Buscar link…" aria-label="Buscar link"></label>
          ${most.length && !query ? `<span class="link-most">Mais usados: ${most.map((item) => `<button type="button" data-link="open" data-id="${escape(item.id)}">${escape(item.title)}</button>`).join("")}</span>` : ""}
        </div>
      </div>
      ${sections.length ? sections.join("") : `<div class="crm-panel">${all().length
        ? kit.emptyState("search", "Nenhum link encontrado", "Tente outra palavra.")
        : kit.emptyState("globe", "Nenhum link ainda", "Guarde sites, pastas e arquivos que você abre todo dia. Eles também aparecem no Ctrl+K.",
          '<div class="crm-empty-action"><button type="button" class="button primary" data-link="new">Novo link</button></div>')}</div>`}`;
  }

  function edit(id, preset = {}) {
    const item = id ? find(id) : undefined;
    const value = item ?? { title: "", target: "", group: "", pinned: false, projectId: "", ...preset };
    const groups = [...new Set(all().map((entry) => entry.group.trim()).filter(Boolean))];
    kit.form({
      title: item ? "Editar link" : "Novo link",
      submit: item ? "Salvar" : "Adicionar",
      danger: item ? "Excluir link" : "",
      fields: kit.field("Endereço ou caminho", `<div class="link-target-row">${kit.input("target", value.target, 'maxlength="2048" required autofocus placeholder="https://… ou C:\\Pasta\\arquivo"')}</div>`,
          `<span class="link-pickers"><button type="button" class="button" data-pick="file">${icon("file")}Escolher arquivo</button><button type="button" class="button" data-pick="folder">${icon("folder")}Escolher pasta</button></span>`)
        + kit.field("Nome", kit.input("title", value.title, 'maxlength="80" placeholder="Como aparece no Kuarq"'))
        + `<div class="crm-fields-pair">${kit.field("Categoria", kit.input("group", value.group, 'maxlength="40" list="link-groups" placeholder="Ex.: Trabalho"') + `<datalist id="link-groups">${groups.map((group) => `<option value="${escape(group)}">`).join("")}</datalist>`)}
          ${kit.field("Projeto", kit.select("projectId", kit.projectOptions(value.projectId), value.projectId))}</div>
        <label class="kit-check"><input type="checkbox" name="pinned"${value.pinned ? " checked" : ""}><span>Mostrar nos favoritos</span></label>`,
      onOpen: (dialog) => {
        for (const button of dialog.querySelectorAll("[data-pick]")) {
          button.addEventListener("click", async () => {
            try {
              const path = await host(button.dataset.pick === "file" ? "pick-file" : "pick-folder");
              if (!path) return;
              dialog.querySelector('[name="target"]').value = path;
              const title = dialog.querySelector('[name="title"]');
              if (!title.value) title.value = path.split(/[\\/]/).filter(Boolean).pop() ?? path;
              dialog.dataset.kind = button.dataset.pick;
            } catch {
              kit.toast("Não foi possível abrir o seletor.");
            }
          });
        }
      },
      onSubmit: (values, form) => {
        const target = normalize(values.target);
        if (!target) return kit.invalid(form, "target", "Informe um endereço ou caminho.");
        const kind = form.closest("dialog").dataset.kind ?? guessKind(target);
        let title = values.title.trim();
        if (!title) {
          title = kind === "url" ? where({ kind, target }).split("/")[0] : target.split(/[\\/]/).filter(Boolean).pop() ?? target;
        }
        const fields = { title, target, kind, group: values.group.trim(), pinned: values.pinned === true, projectId: values.projectId || undefined };
        if (!fields.projectId) delete fields.projectId;
        if (item) {
          if (!fields.projectId) delete item.projectId;
          Object.assign(item, fields);
        } else all().push({ id: kit.uid(), uses: 0, ...fields });
        kit.touch();
        refresh();
      },
      onDanger: () => {
        workspace.links = all().filter((entry) => entry !== item);
        kit.touch();
        refresh();
      },
    });
    delete $("#drawer").dataset.kind;
  }

  function refresh() {
    if (kit.isOpen("links")) render();
  }

  content.addEventListener("click", (event) => {
    const button = event.target.closest("[data-link]");
    if (!button) return;
    const { link: action, id } = button.dataset;
    if (action === "open") void launch(id);
    if (action === "edit") edit(id);
    if (action === "new") edit();
    if (action === "pin") {
      const item = find(id);
      item.pinned = !item.pinned;
      kit.touch();
      render();
    }
  });
  content.addEventListener("input", (event) => {
    if (!event.target.matches("[data-link-search]")) return;
    query = event.target.value;
    const caret = event.target.selectionStart;
    render();
    const field = content.querySelector("[data-link-search]");
    field.focus();
    field.setSelectionRange(caret, caret);
  });

  function add({ target, title = "", projectId = "", group = "" }) {
    const clean = normalize(target);
    const kind = guessKind(clean);
    const item = { id: kit.uid(), title: title.trim() || (kind === "url" ? where({ kind, target: clean }).split("/")[0] : clean.split(/[\/]/).filter(Boolean).pop() ?? clean), target: clean, kind, group, pinned: false, uses: 0 };
    if (projectId) item.projectId = projectId;
    all().push(item);
    kit.touch();
    return item;
  }

  const module = {
    validate, add, edit,
    show: render,
    command: (verb) => { if (verb === "new") edit(); },
    all, launch, kinds,
  };
  kit.register("links", "Links", module);
  return module;
})();
