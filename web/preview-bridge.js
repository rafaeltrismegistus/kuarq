"use strict";

(() => {
  if (window.chrome?.webview) return;

  const storageKey = "toolkit.workspace.v1";
  const storageLimit = 4 * 1024 * 1024;
  const target = new EventTarget();

  function validateWorkspaceShape(data) {
    if (!data || typeof data !== "object" || Array.isArray(data) ||
        data.version !== 1 || !Array.isArray(data.maps)) {
      throw new Error("O arquivo de dados do Kuarq contém informações inválidas.");
    }
  }

  function readWorkspace() {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return { version: 1, theme: "dark", maps: [] };
    }
    if (raw.length > storageLimit) {
      throw new Error("O arquivo de dados excedeu o limite de armazenamento.");
    }
    const parsed = JSON.parse(raw);
    validateWorkspaceShape(parsed);
    return parsed;
  }

  function saveWorkspace(data) {
    validateWorkspaceShape(data);
    const serialized = JSON.stringify(data);
    if (new Blob([serialized]).size > storageLimit) {
      throw new Error("Os dados excederam o limite de 4 MB.");
    }
    localStorage.setItem(storageKey, serialized);
  }

  function reply(id, data = null, error = null) {
    queueMicrotask(() => {
      const event = new MessageEvent("message", { data: { id, data, error } });
      target.dispatchEvent(event);
    });
  }

  window.chrome = {
    ...(window.chrome ?? {}),
    webview: {
      addEventListener(type, listener, options) {
        target.addEventListener(type, listener, options);
      },
      removeEventListener(type, listener, options) {
        target.removeEventListener(type, listener, options);
      },
      postMessage(message) {
        const { id, action, data } = message ?? {};
        if (typeof id !== "number" || typeof action !== "string") return;
        try {
          if (action === "load") {
            reply(id, readWorkspace());
          } else if (action === "save") {
            saveWorkspace(data);
            reply(id, null);
          } else if (action === "theme") {
            reply(id, null);
          }
        } catch (err) {
          reply(id, null, err instanceof Error ? err.message : "Não foi possível acessar o armazenamento local.");
        }
      },
    },
  };
})();
