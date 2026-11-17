"use strict";

const backups = (() => {
  const dialog = $("#backups-dialog");
  const list = $("#backups-list");
  const status = $("#backups-status");
  const folder = $("#backups-folder");
  const createButton = $("#backups-create");
  const dayLabel = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" });
  const timeLabel = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const kinds = { diario: ["Diário", "calendar"], manual: ["Manual", "drive"], seguranca: ["Antes de restaurar", "undo"] };
  const node = (tag, className, text = "") => Object.assign(document.createElement(tag), { className, textContent: text });
  const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
  let busy = false;

  function when(value) {
    const date = new Date(value);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const time = timeLabel.format(date);
    if (date >= start) return `Hoje, ${time}`;
    if (date >= start - 86_400_000) return `Ontem, ${time}`;
    return `${dayLabel.format(date).replace(".", "")}, ${time}`;
  }

  function say(text, error = false) {
    status.textContent = text;
    status.toggleAttribute("data-error", error);
  }

  function row(item) {
    const entry = node("li", "backup-row");
    const [label, glyph] = kinds[item.kind] ?? kinds.diario;
    const mark = node("span", "backup-icon");
    mark.innerHTML = icon(glyph);
    const text = node("div", "backup-text");
    const title = node("strong", "", when(item.date));
    title.append(node("span", "backup-kind", label));
    const details = item.valid
      ? [plural(item.contacts, "contato", "contatos"), plural(item.notes, "nota", "notas"), plural(item.maps, "mapa", "mapas")]
      : ["Arquivo ilegível"];
    details.push(`${Math.max(1, Math.round(item.size / 1024))} KB`);
    text.append(title, node("small", "", details.join(" · ")));
    const restore = node("button", "button", "Restaurar");
    restore.type = "button";
    restore.disabled = !item.valid;
    restore.addEventListener("click", () => confirmRestore(entry, item));
    entry.append(mark, text, restore);
    return entry;
  }

  function confirmRestore(entry, item) {
    for (const open of list.querySelectorAll(".backup-confirm")) open.remove();
    const box = node("div", "backup-confirm");
    box.append(node("p", "", `Voltar todos os dados para ${when(item.date).toLowerCase()}? Antes disso, o Kuarq guarda uma cópia do estado atual.`));
    const actionsRow = node("div", "backup-confirm-actions");
    const cancel = node("button", "button", "Cancelar");
    cancel.type = "button";
    cancel.addEventListener("click", () => box.remove());
    const confirm = node("button", "button primary", "Restaurar esta versão");
    confirm.type = "button";
    confirm.addEventListener("click", () => restore(item.name));
    actionsRow.append(cancel, confirm);
    box.append(actionsRow);
    entry.after(box);
    confirm.focus();
  }

  async function restore(name) {
    if (busy) return;
    busy = true;
    say("Restaurando…");
    try {
      if (!await window.finishPendingSave()) throw new Error("Salve as alterações atuais antes de restaurar.");
      const data = await host("backup-read", name);
      if (!validWorkspace(data) || !crm.valid(data.contacts) || !notes.valid(data.notes) || !notes.valid(data.noteTemplates) || !kit.validate(data)) {
        throw new Error("Este backup não é compatível com esta versão do Kuarq.");
      }
      await host("backup-restore", name);
      clearTimeout(saveTimer);
      savedRevision = revision;
      window.location.reload();
    } catch (error) {
      busy = false;
      say(error.message, true);
    }
  }

  async function refresh() {
    say("Carregando…");
    try {
      const result = await host("backup-list");
      folder.textContent = result.folder;
      folder.title = result.folder;
      list.replaceChildren(...result.items.map(row));
      if (!result.items.length) list.append(node("li", "backup-empty", "Nenhum backup ainda. O primeiro é criado automaticamente hoje."));
      say(result.items.length ? `${plural(result.items.length, "backup", "backups")} guardados` : "");
    } catch (error) {
      say(error.message, true);
    }
  }

  function open() {
    if (dialog.open || document.querySelector("dialog[open]")) return;
    busy = false;
    list.replaceChildren();
    dialog.showModal();
    void refresh();
  }

  createButton.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    createButton.disabled = true;
    say("Criando backup…");
    try {
      if (!await window.finishPendingSave()) throw new Error("Não foi possível salvar as alterações atuais.");
      await host("backup-create");
      await refresh();
      say("Backup criado agora.");
    } catch (error) {
      say(error.message, true);
    } finally {
      busy = false;
      createButton.disabled = false;
    }
  });
  $("#backups-open-folder").addEventListener("click", () => {
    host("backup-folder").catch((error) => say(error.message, true));
  });
  $("#backups-open").addEventListener("click", open);
  $("#backups-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  return { open };
})();
