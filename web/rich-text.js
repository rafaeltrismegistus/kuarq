"use strict";

const richText = (() => {
  const blocks = "p, div, h1, h2, h3, li, br, blockquote, hr";
  const allowed = new Set(["p", "div", "br", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "s", "strike", "ul", "ol", "li", "blockquote", "hr", "a"]);
  const discarded = new Set(["script", "style", "template"]);
  const blockNames = { p: "Texto", h1: "Título 1", h2: "Título 2", h3: "Título 3", ul: "Lista", ol: "Lista numerada", check: "Checklist", blockquote: "Citação" };
  const listTypes = ["ul", "ol", "check"];
  const slashItems = [
    ["p", "Texto", "Parágrafo simples", "text", "texto paragrafo text"],
    ["h1", "Título 1", "Título grande de seção", "H1", "titulo heading h1 cabecalho"],
    ["h2", "Título 2", "Título médio de seção", "H2", "titulo heading h2 subtitulo"],
    ["h3", "Título 3", "Título pequeno de seção", "H3", "titulo heading h3"],
    ["check", "Checklist", "Tarefas com caixas de seleção", "checklist", "checklist tarefa todo check caixa lista"],
    ["ul", "Lista com marcadores", "Lista simples com marcadores", "list", "lista marcadores bullet"],
    ["ol", "Lista numerada", "Lista com sequência numérica", "ordered", "lista numerada numero ordenada"],
    ["blockquote", "Citação", "Destaque uma frase ou trecho", "quote", "citacao quote destaque"],
    ["hr", "Divisor", "Linha para separar seções", "divider", "divisor linha separador hr"],
  ];
  const shortcuts = { "-": "ul", "*": "ul", "1.": "ol", "[]": "check", "[ ]": "check", "#": "h1", "##": "h2", "###": "h3", ">": "blockquote" };
  const fold = (text) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const node = (tag, className, text) => Object.assign(document.createElement(tag), { className, textContent: text });
  const exec = (command, value) => document.execCommand(command, false, value);
  let instances = 0;
  const urlPattern = /\b(?:https?:\/\/|www\.)[^\s<>"]*[^\s<>".,;:!?)\]'}]/gi;

  /* Only web and e-mail addresses become links; anything else stays plain text. */
  function safeHref(value) {
    let text = String(value ?? "").trim();
    if (!text || text.length > 2048) return "";
    if (/^www\./i.test(text)) text = `https://${text}`;
    else if (/^[^\s@/]+@[^\s@/]+\.[a-z]{2,}$/i.test(text)) text = `mailto:${text}`;
    else if (!/^[a-z][a-z\d+.-]*:/i.test(text) && /^[^\s/]+\.[a-z]{2,}(?:[/?#]\S*)?$/i.test(text)) text = `https://${text}`;
    try {
      const url = new URL(text);
      return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function openLink(href) {
    const target = safeHref(href);
    if (!target) return;
    Promise.resolve(typeof host === "function" ? host("open-link", target) : undefined)
      .catch(() => typeof kit !== "undefined" && kit.toast("Não foi possível abrir este link."));
  }

  /* Wrap bare addresses found in text nodes (outside existing links) in <a>. */
  function linkify(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (text) => text.parentElement?.closest("a") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    const found = [];
    for (let text = walker.nextNode(); text; text = walker.nextNode()) if (urlPattern.test(text.data)) found.push(text);
    let changedAny = false;
    for (let text of found) {
      urlPattern.lastIndex = 0;
      let match;
      while ((match = urlPattern.exec(text.data))) {
        const href = safeHref(match[0]);
        if (!href) continue;
        const piece = match.index ? text.splitText(match.index) : text;
        const rest = piece.splitText(match[0].length);
        const anchor = document.createElement("a");
        anchor.href = href;
        piece.replaceWith(anchor);
        anchor.append(piece);
        changedAny = true;
        text = rest;
        urlPattern.lastIndex = 0;
      }
    }
    urlPattern.lastIndex = 0;
    return changedAny;
  }

  function clean(html) {
    const source = document.createElement("template");
    source.innerHTML = html;
    const result = document.createElement("template");
    const pending = [];
    function queueChildren(node, parent) {
      for (let child = node.lastChild; child; child = child.previousSibling) pending.push({ child, parent });
    }
    queueChildren(source.content, result.content);
    while (pending.length) {
      const { child, parent } = pending.pop();
      if (child.nodeType === Node.TEXT_NODE) {
        parent.append(document.createTextNode(child.data));
      } else if (child.nodeType === Node.ELEMENT_NODE && child.namespaceURI === document.documentElement.namespaceURI &&
          !discarded.has(child.localName)) {
        let target = allowed.has(child.localName) ? document.createElement(child.localName) : parent;
        if (child.localName === "a") {
          const href = safeHref(child.getAttribute("href"));
          if (href) target.setAttribute("href", href);
          else target = parent;
        }
        if (target !== parent) {
          if (child.localName === "ul" && child.classList.contains("checklist")) target.className = "checklist";
          if (child.localName === "li" && child.dataset.checked === "true") target.dataset.checked = "true";
          parent.append(target);
        }
        queueChildren(child, target);
      }
    }
    return result;
  }

  function plainText(html) {
    const content = clean(html).content;
    for (const block of content.querySelectorAll(blocks)) block.before(" ");
    return content.textContent.replace(/\s+/g, " ").trim();
  }

  function bubbleMarkup() {
    const blockOption = (type, glyph, name) =>
      `<button type="button" role="menuitem" data-block="${type}">${/^H\d$/.test(glyph) ? `<b class="block-glyph">${glyph}</b>` : icon(glyph)}${name}</button>`;
    const tool = (attribute, value, label, title, content) =>
      `<button type="button" ${attribute}="${value}" aria-label="${label}" title="${title}">${content}</button>`;
    return `<div class="bubble-block">
        <button type="button" class="bubble-block-toggle" aria-haspopup="menu" aria-expanded="false"><span>Texto</span>${icon("chevron")}</button>
        <div class="bubble-menu" role="menu" hidden>
          ${blockOption("p", "text", "Texto")}${blockOption("h1", "H1", "Título 1")}${blockOption("h2", "H2", "Título 2")}${blockOption("h3", "H3", "Título 3")}
          ${blockOption("ul", "list", "Lista com marcadores")}${blockOption("ol", "ordered", "Lista numerada")}${blockOption("check", "checklist", "Checklist")}${blockOption("blockquote", "quote", "Citação")}
        </div>
      </div>
      <span class="bubble-sep" aria-hidden="true"></span>
      ${tool("data-inline", "bold", "Negrito", "Negrito (Ctrl+B)", "<b>B</b>")}
      ${tool("data-inline", "italic", "Itálico", "Itálico (Ctrl+I)", "<i>I</i>")}
      ${tool("data-inline", "underline", "Sublinhado", "Sublinhado (Ctrl+U)", "<u>U</u>")}
      ${tool("data-inline", "strikeThrough", "Tachado", "Tachado (Ctrl+Shift+X)", "<s>S</s>")}
      ${tool("data-link", "edit", "Link", "Inserir link (Ctrl+K)", icon("chain"))}
      <span class="bubble-sep" aria-hidden="true"></span>
      ${tool("data-block", "ul", "Lista com marcadores", "Lista com marcadores (Ctrl+Shift+8)", icon("list"))}
      ${tool("data-block", "ol", "Lista numerada", "Lista numerada (Ctrl+Shift+7)", icon("ordered"))}
      ${tool("data-block", "check", "Checklist", "Checklist (Ctrl+Shift+9)", icon("checklist"))}
      ${tool("data-block", "blockquote", "Citação", "Citação", icon("quote"))}`;
  }

  function editor(body, { onEdit = () => {} } = {}) {
    const uid = `rich-${++instances}`;
    const host = body.closest("dialog") ?? document.body;
    const bubble = node("div", "note-bubble", "");
    bubble.setAttribute("role", "toolbar");
    bubble.setAttribute("aria-label", "Formatação do texto selecionado");
    bubble.hidden = true;
    bubble.innerHTML = bubbleMarkup();
    const slash = node("div", "note-slash", "");
    slash.setAttribute("role", "listbox");
    slash.setAttribute("aria-label", "Inserir bloco");
    slash.hidden = true;
    const linkPop = node("div", "rich-link-pop", "");
    linkPop.hidden = true;
    linkPop.innerHTML = `<form class="rich-link-form">
        <span class="rich-link-icon">${icon("chain")}</span>
        <input name="href" maxlength="2048" placeholder="Cole ou digite o endereço (https://…)" aria-label="Endereço do link" autocomplete="off" spellcheck="false">
        <button type="submit" class="rich-link-apply">Aplicar</button>
      </form>
      <div class="rich-link-view">
        <button type="button" class="rich-link-url" data-link-action="open" title="Abrir link (Ctrl+clique no texto)"><span></span>${icon("open")}</button>
        <span class="bubble-sep" aria-hidden="true"></span>
        <button type="button" data-link-action="edit" title="Editar link">${icon("edit")}</button>
        <button type="button" data-link-action="remove" title="Remover link">${icon("unlink")}</button>
      </div>`;
    host.append(bubble, slash, linkPop);
    const linkForm = linkPop.querySelector(".rich-link-form");
    const linkInput = linkForm.elements.href;
    let linkState;
    const blockToggle = bubble.querySelector(".bubble-block-toggle");
    const blockMenu = bubble.querySelector(".bubble-menu");
    let slashState;
    let selecting = false;
    let frame;
    body.classList.add("rich-doc");

    const visible = () => body.isConnected && !body.closest("[hidden]") && body.getClientRects().length > 0;

    function markEmpty() {
      const empty = !body.textContent.trim() && !body.querySelector("hr, li");
      body.toggleAttribute("data-empty", empty);
    }

    function updateNote() {
      markEmpty();
      onEdit();
    }

    function selectionRange() {
      const selection = window.getSelection();
      if (!selection.rangeCount) return null;
      const range = selection.getRangeAt(0);
      return body.contains(range.commonAncestorContainer) ? range : null;
    }

    const elementOf = (target) => target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;

    function within(target, selector) {
      const element = elementOf(target)?.closest(selector);
      return element && element !== body && body.contains(element) ? element : null;
    }

    function currentBlock() {
      const range = selectionRange();
      if (!range) return "p";
      const list = within(range.startContainer, "ul, ol");
      if (list) return list.localName === "ol" ? "ol" : list.classList.contains("checklist") ? "check" : "ul";
      return within(range.startContainer, "h1, h2, h3, blockquote")?.localName ?? "p";
    }

    function listAtCaret() {
      const range = selectionRange();
      return range && within(range.startContainer, "ul, ol");
    }

    function prepare() {
      exec("styleWithCSS", false);
      exec("defaultParagraphSeparator", "p");
    }

    const listTag = (type) => type === "ol" ? "ol" : "ul";
    const blockPattern = /^(P|DIV|H1|H2|H3|BLOCKQUOTE|LI)$/;

    function topLevel(target, offset) {
      if (target === body) return body.childNodes[Math.min(offset, body.childNodes.length - 1)] ?? null;
      let element = target;
      while (element && element.parentNode !== body) element = element.parentNode;
      return element;
    }

    function caretBlock() {
      const range = selectionRange();
      if (!range) return null;
      const startItem = within(range.startContainer, "li");
      const endItem = within(range.endContainer, "li");
      if (startItem || endItem) return startItem === endItem ? startItem : null;
      const start = topLevel(range.startContainer, range.startOffset);
      return start && start === topLevel(range.endContainer, range.endOffset) ? start : null;
    }

    function sameList(a, b) {
      return a?.nodeType === Node.ELEMENT_NODE && b && a.tagName === b.tagName &&
        a.classList.contains("checklist") === b.classList.contains("checklist");
    }

    function merge(list) {
      const previous = list.previousElementSibling;
      if (sameList(previous, list) && list.previousSibling === previous) {
        previous.append(...list.childNodes);
        list.remove();
        list = previous;
      }
      const next = list.nextElementSibling;
      if (sameList(next, list) && list.nextSibling === next) {
        list.append(...next.childNodes);
        next.remove();
      }
      return list;
    }

    function makeList(type) {
      const list = document.createElement(listTag(type));
      if (type === "check") list.className = "checklist";
      return list;
    }

    function fillEmpty(element) {
      if (!element.textContent && !element.querySelector("br, hr")) element.append(document.createElement("br"));
      return element;
    }

    function isolate(item) {
      const list = item.parentElement;
      const siblings = [...list.children];
      const after = siblings.slice(siblings.indexOf(item) + 1);
      if (after.length) {
        const tail = list.cloneNode(false);
        tail.append(...after);
        list.after(tail);
      }
      const solo = list.cloneNode(false);
      list.after(solo);
      solo.append(item);
      if (!list.children.length) list.remove();
      return solo;
    }

    function itemToBlock(item, tag) {
      const solo = isolate(item);
      const block = document.createElement(tag);
      block.append(...item.childNodes);
      solo.replaceWith(fillEmpty(block));
      return block;
    }

    function retypeItem(item, type) {
      const solo = isolate(item);
      const list = makeList(type);
      if (type !== "check") delete item.dataset.checked;
      list.append(item);
      solo.replaceWith(list);
      merge(list);
      return item;
    }

    function blockToList(block, type) {
      const list = makeList(type);
      const item = document.createElement("li");
      item.append(...block.childNodes);
      list.append(fillEmpty(item));
      block.replaceWith(list);
      merge(list);
      return item;
    }

    function legacyBlock(type, current) {
      const command = (kind) => kind === "ol" ? "insertOrderedList" : "insertUnorderedList";
      if (listTypes.includes(type)) {
        if (current === type) {
          exec(command(type));
          return;
        }
        if (["h1", "h2", "h3", "blockquote"].includes(current)) exec("formatBlock", "p");
        exec(command(type));
        const list = listAtCaret();
        if (!list) return;
        list.classList.toggle("checklist", type === "check");
        if (!list.classList.length) list.removeAttribute("class");
      } else {
        if (listTypes.includes(current)) exec(command(current));
        exec("formatBlock", current === type && type !== "p" ? "p" : type);
      }
    }

    function applyBlock(type) {
      body.focus();
      prepare();
      const current = currentBlock();
      if (type === "hr") {
        exec("insertHorizontalRule");
        updateNote();
        return;
      }
      let block = caretBlock();
      if (block && !(block.nodeType === Node.ELEMENT_NODE && blockPattern.test(block.tagName))) {
        exec("formatBlock", "p");
        block = caretBlock();
      }
      const nested = block?.tagName === "LI" && block.querySelector("ul, ol");
      if (!block || nested) {
        legacyBlock(type, current);
      } else {
        const selection = window.getSelection();
        const caret = [selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset];
        let target;
        if (block.tagName === "LI") {
          if (!listTypes.includes(type)) target = itemToBlock(block, type === current ? "p" : type);
          else if (type === current) target = itemToBlock(block, "p");
          else target = retypeItem(block, type);
        } else if (listTypes.includes(type)) {
          target = blockToList(block, type);
        } else {
          exec("formatBlock", current === type && type !== "p" ? "p" : type);
        }
        if (target) {
          const [anchor, anchorOffset, focus, focusOffset] = caret;
          if (anchor?.isConnected && focus?.isConnected && body.contains(anchor) && body.contains(focus) &&
              target.contains(anchor) && target.contains(focus)) {
            selection.setBaseAndExtent(anchor, anchorOffset, focus, focusOffset);
          } else {
            selection.collapse(target, 0);
          }
        }
      }
      updateNote();
      queueBubble();
    }

    function applyInline(command) {
      body.focus();
      prepare();
      exec(command);
      updateNote();
      queueBubble();
    }

    /* ---------- Floating toolbar ---------- */

    function hideBubble() {
      bubble.hidden = true;
      blockMenu.hidden = true;
      blockToggle.setAttribute("aria-expanded", "false");
    }

    function place(element, rect, gap = 8) {
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      const left = Math.max(10, Math.min(rect.left + rect.width / 2 - width / 2, innerWidth - width - 10));
      let top = rect.top - height - gap;
      if (top < 64) top = rect.bottom + gap;
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
    }

    function updateBubble() {
      frame = undefined;
      const range = selectionRange();
      if (!visible() || selecting || slashState || linkState?.mode === "edit" || !range || range.collapsed || !range.toString().trim()) {
        if (!bubble.contains(document.activeElement)) hideBubble();
        return;
      }
      const block = currentBlock();
      blockToggle.firstElementChild.textContent = blockNames[block];
      bubble.querySelector("[data-link]").setAttribute("aria-pressed", String(Boolean(anchorAt(range))));
      for (const button of bubble.querySelectorAll("[data-inline]")) {
        button.setAttribute("aria-pressed", String(document.queryCommandState(button.dataset.inline)));
      }
      for (const button of bubble.querySelectorAll("[data-block]")) {
        button.setAttribute("aria-pressed", String(button.dataset.block === block));
      }
      bubble.hidden = false;
      const rects = range.getClientRects();
      const first = rects[0] ?? range.getBoundingClientRect();
      const box = range.getBoundingClientRect();
      place(bubble, { left: box.left, width: box.width, top: first.top, bottom: box.bottom });
    }

    function queueBubble() {
      if (!frame) frame = requestAnimationFrame(updateBubble);
    }

    bubble.addEventListener("mousedown", (event) => {
      if (event.target.closest("button")) event.preventDefault();
    });
    bubble.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button === blockToggle) {
        const open = blockMenu.hidden;
        blockMenu.hidden = !open;
        blockToggle.setAttribute("aria-expanded", String(open));
        return;
      }
      blockMenu.hidden = true;
      blockToggle.setAttribute("aria-expanded", "false");
      if (button.dataset.link) return editLink();
      if (button.dataset.inline) applyInline(button.dataset.inline);
      if (button.dataset.block) applyBlock(button.dataset.block);
    });

    /* ---------- Links ---------- */

    function anchorAt(range) {
      if (!range) return null;
      return within(range.startContainer, "a") ?? (range.collapsed ? null : within(range.endContainer, "a"));
    }

    function placeLinkPop(rect) {
      linkPop.hidden = false;
      const width = linkPop.offsetWidth;
      const left = Math.max(10, Math.min(rect.left, innerWidth - width - 10));
      let top = rect.bottom + 8;
      if (top + linkPop.offsetHeight > innerHeight - 10) top = Math.max(10, rect.top - linkPop.offsetHeight - 8);
      linkPop.style.left = `${left}px`;
      linkPop.style.top = `${top}px`;
    }

    function hideLinkPop() {
      linkPop.hidden = true;
      linkState = undefined;
    }

    function editLink() {
      const range = selectionRange();
      if (!range) return;
      const anchor = anchorAt(range);
      linkState = { mode: "edit", range: range.cloneRange(), anchor };
      hideBubble();
      linkPop.dataset.mode = "edit";
      linkInput.value = anchor?.getAttribute("href") ?? (range.collapsed ? "" : safeHref(range.toString()) ? range.toString().trim() : "");
      linkInput.removeAttribute("aria-invalid");
      placeLinkPop((anchor ?? range).getBoundingClientRect());
      linkInput.focus();
      linkInput.select();
    }

    function viewLink(anchor) {
      linkState = { mode: "view", anchor };
      linkPop.dataset.mode = "view";
      const label = linkPop.querySelector(".rich-link-url span");
      label.textContent = anchor.getAttribute("href").replace(/^mailto:/, "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
      linkPop.querySelector(".rich-link-url").title = `Abrir ${anchor.getAttribute("href")} (Ctrl+clique no texto)`;
      placeLinkPop(anchor.getBoundingClientRect());
    }

    function unwrap(anchor) {
      anchor.replaceWith(...anchor.childNodes);
    }

    linkForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const state = linkState;
      if (state?.mode !== "edit") return;
      const raw = linkInput.value.trim();
      const href = safeHref(raw);
      if (raw && !href) {
        linkInput.setAttribute("aria-invalid", "true");
        linkInput.focus();
        return;
      }
      body.focus({ preventScroll: true });
      const selection = window.getSelection();
      if (state.anchor?.isConnected) {
        if (href) state.anchor.setAttribute("href", href);
        else unwrap(state.anchor);
      } else if (href) {
        selection.removeAllRanges();
        selection.addRange(state.range);
        prepare();
        if (state.range.collapsed) {
          const anchor = document.createElement("a");
          anchor.href = href;
          anchor.textContent = raw.replace(/^mailto:/, "");
          state.range.insertNode(anchor);
          selection.collapse(anchor.parentNode, [...anchor.parentNode.childNodes].indexOf(anchor) + 1);
        } else {
          exec("createLink", href);
          selection.collapseToEnd();
        }
      }
      hideLinkPop();
      updateNote();
    });
    linkInput.addEventListener("input", () => linkInput.removeAttribute("aria-invalid"));
    linkPop.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      const range = linkState?.range;
      hideLinkPop();
      body.focus({ preventScroll: true });
      if (range) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
    linkPop.addEventListener("mousedown", (event) => {
      if (event.target.closest("button")) event.preventDefault();
    });
    linkPop.addEventListener("click", (event) => {
      const button = event.target.closest("[data-link-action]");
      const anchor = linkState?.anchor;
      if (!button || !anchor?.isConnected) return;
      const action = button.dataset.linkAction;
      if (action === "open") openLink(anchor.getAttribute("href"));
      if (action === "edit") {
        const range = document.createRange();
        range.selectNodeContents(anchor);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        editLink();
      }
      if (action === "remove") {
        unwrap(anchor);
        hideLinkPop();
        updateNote();
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (!linkPop.hidden && !linkPop.contains(event.target) && !body.contains(event.target)) hideLinkPop();
    }, true);

    function trackLink() {
      if (linkState?.mode === "edit") return;
      const range = selectionRange();
      const anchor = range?.collapsed && visible() ? anchorAt(range) : null;
      if (anchor) viewLink(anchor);
      else if (linkState?.mode === "view") hideLinkPop();
    }

    body.addEventListener("click", (event) => {
      const anchor = event.target.closest?.("a[href]");
      if (!anchor || !body.contains(anchor)) return;
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) openLink(anchor.getAttribute("href"));
    });

    function linkifyNearCaret() {
      const range = selectionRange();
      const block = range && (within(range.startContainer, "li, p, div, h1, h2, h3, blockquote") ?? topLevel(range.startContainer, range.startOffset));
      if (!range) return false;
      return linkify(block?.nodeType === Node.ELEMENT_NODE ? block : body);
    }

    /* ---------- Slash menu ---------- */

    function closeSlash() {
      slashState = undefined;
      slash.hidden = true;
      body.removeAttribute("aria-activedescendant");
    }

    function renderSlash() {
      const query = fold(slashState.query);
      const matches = slashItems.filter(([, name, , , keywords]) => fold(`${name} ${keywords}`).includes(query));
      slashState.matches = matches;
      slashState.index = Math.min(slashState.index, Math.max(0, matches.length - 1));
      slash.replaceChildren();
      const heading = node("p", "slash-heading", matches.length ? "Blocos básicos" : "Nenhum bloco encontrado");
      slash.append(heading);
      matches.forEach(([type, name, description, glyph], index) => {
        const option = node("button", "slash-option", "");
        option.type = "button";
        option.id = `${uid}-${type}`;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", String(index === slashState.index));
        option.dataset.type = type;
        const mark = node("span", "slash-icon", "");
        if (/^H\d$/.test(glyph)) mark.textContent = glyph;
        else mark.innerHTML = icon(glyph);
        const text = node("span", "slash-text", "");
        text.append(node("strong", "", name), node("small", "", description));
        option.append(mark, text);
        slash.append(option);
      });
      slash.hidden = false;
      const selected = slash.querySelector('[aria-selected="true"]');
      if (selected) {
        body.setAttribute("aria-activedescendant", selected.id);
        selected.scrollIntoView({ block: "nearest" });
      }
      const range = selectionRange();
      if (!range) return;
      const caret = range.getClientRects()[0] ?? elementOf(range.startContainer).getBoundingClientRect();
      const left = Math.max(10, Math.min(caret.left - 10, innerWidth - slash.offsetWidth - 10));
      let top = caret.bottom + 6;
      if (top + slash.offsetHeight > innerHeight - 10) top = Math.max(10, caret.top - slash.offsetHeight - 6);
      slash.style.left = `${left}px`;
      slash.style.top = `${top}px`;
    }

    function trackSlash(event) {
      const range = selectionRange();
      if (!range || !range.collapsed) return closeSlash();
      const { startContainer: container, startOffset: offset } = range;
      const typed = event?.inputType === "insertText" ? event.data ?? "" : "";
      if (!slashState && typed.includes("/") && container.nodeType === Node.TEXT_NODE) {
        const position = offset - typed.length + typed.lastIndexOf("/");
        const before = container.data[position - 1];
        if (position >= 0 && (before === undefined || /\s/.test(before))) {
          slashState = { node: container, offset: position, query: "", index: 0 };
        }
      }
      if (!slashState) return;
      if (container !== slashState.node || offset <= slashState.offset || container.data[slashState.offset] !== "/") return closeSlash();
      const query = container.data.slice(slashState.offset + 1, offset);
      if (/\s/.test(query) || query.length > 24) return closeSlash();
      slashState.query = query;
      renderSlash();
    }

    function chooseSlash(type) {
      const range = selectionRange();
      if (!slashState || !range) return closeSlash();
      const removal = document.createRange();
      removal.setStart(slashState.node, slashState.offset);
      removal.setEnd(range.startContainer, range.startOffset);
      closeSlash();
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(removal);
      exec("delete");
      applyBlock(type);
    }

    slash.addEventListener("mousedown", (event) => event.preventDefault());
    slash.addEventListener("click", (event) => {
      const option = event.target.closest(".slash-option");
      if (option) chooseSlash(option.dataset.type);
    });

    /* ---------- Markdown shortcuts and checklist ---------- */

    function markdownShortcut() {
      const range = selectionRange();
      if (!range || !range.collapsed || within(range.startContainer, "li")) return false;
      const block = within(range.startContainer, "p, div, h1, h2, h3, blockquote") ?? body;
      const before = document.createRange();
      before.selectNodeContents(block);
      before.setEnd(range.startContainer, range.startOffset);
      const typed = before.toString().replace(/ /g, " ");
      if (!typed.endsWith(" ")) return false;
      const type = shortcuts[typed.slice(0, -1)];
      if (!type) return false;
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(before);
      exec("delete");
      applyBlock(type);
      return true;
    }

    body.addEventListener("mousedown", (event) => {
      const item = event.target.closest?.("ul.checklist > li");
      if (item && body.contains(item)) {
        const box = item.getBoundingClientRect();
        const style = getComputedStyle(item);
        if (event.clientX < box.left + parseFloat(style.paddingLeft)) {
          event.preventDefault();
          if (item.dataset.checked === "true") delete item.dataset.checked;
          else item.dataset.checked = "true";
          updateNote();
          return;
        }
      }
      selecting = true;
      hideBubble();
      closeSlash();
    });
    document.addEventListener("mouseup", () => {
      if (!selecting) return;
      selecting = false;
      queueBubble();
    });

    body.addEventListener("beforeinput", (event) => {
      const allowed = ["formatBold", "formatItalic", "formatUnderline", "formatStrikeThrough"];
      if (event.inputType.startsWith("format") && !allowed.includes(event.inputType)) event.preventDefault();
      if (event.inputType === "insertFromDrop") event.preventDefault();
    });
    body.addEventListener("input", (event) => {
      if (event.inputType === "insertText" && event.data?.endsWith(" ") && !slashState && markdownShortcut()) return;
      if (event.inputType === "insertParagraph") {
        const item = within(selectionRange()?.startContainer ?? body, "li");
        if (item?.parentElement.classList.contains("checklist") && !item.textContent) delete item.dataset.checked;
      }
      if ((event.inputType === "insertText" && /\s$/.test(event.data ?? "")) || event.inputType === "insertParagraph") {
        if (event.inputType === "insertParagraph") {
          const range = selectionRange();
          const previous = range && (within(range.startContainer, "li, p, div, h1, h2, h3, blockquote") ?? topLevel(range.startContainer, range.startOffset))?.previousElementSibling;
          if (previous) linkify(previous);
        } else {
          linkifyNearCaret();
        }
      }
      trackSlash(event);
      updateNote();
    });
    body.addEventListener("keydown", (event) => {
      if (slashState && !slash.hidden) {
        const count = slashState.matches.length;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (count) slashState.index = (slashState.index + (event.key === "ArrowDown" ? 1 : -1) + count) % count;
          renderSlash();
          return;
        }
        if ((event.key === "Enter" || event.key === "Tab") && count) {
          event.preventDefault();
          chooseSlash(slashState.matches[slashState.index][0]);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          closeSlash();
          return;
        }
      }
      if (event.key === "Escape" && !bubble.hidden) {
        event.preventDefault();
        window.getSelection().collapseToEnd();
        hideBubble();
        return;
      }
      const mod = event.ctrlKey || event.metaKey;
      if (mod && !event.shiftKey && event.code === "KeyK") {
        event.preventDefault();
        editLink();
        return;
      }
      if (mod && event.shiftKey) {
        const block = { Digit7: "ol", Digit8: "ul", Digit9: "check" }[event.code];
        if (block) {
          event.preventDefault();
          applyBlock(block);
          return;
        }
        if (event.code === "KeyX") {
          event.preventDefault();
          applyInline("strikeThrough");
          return;
        }
      }
      if (event.key === "Tab" && within(selectionRange()?.startContainer ?? body, "li")) {
        event.preventDefault();
        const parent = listAtCaret();
        exec(event.shiftKey ? "outdent" : "indent");
        const list = listAtCaret();
        if (parent?.classList.contains("checklist") && list && list.localName === "ul") list.classList.add("checklist");
        updateNote();
      }
    });
    body.addEventListener("paste", (event) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      if (!text) return;
      const range = selectionRange();
      const href = safeHref(text);
      if (href && range && !range.collapsed && !/\s/.test(text.trim())) {
        prepare();
        exec("createLink", href);
        window.getSelection().collapseToEnd();
        updateNote();
        return;
      }
      exec("insertText", text);
      if (urlPattern.test(text)) {
        urlPattern.lastIndex = 0;
        if (linkify(body)) updateNote();
      }
      urlPattern.lastIndex = 0;
    });
    body.addEventListener("drop", (event) => event.preventDefault());
    body.addEventListener("focus", prepare);
    body.addEventListener("blur", () => {
      closeSlash();
      setTimeout(() => {
        if (!bubble.contains(document.activeElement) && document.activeElement !== body) hideBubble();
      });
    });
    document.addEventListener("selectionchange", () => {
      if (!!visible()) queueBubble();
      if (document.activeElement === body) trackLink();
    });
    window.addEventListener("resize", () => {
      closeSlash();
      queueBubble();
    });
    document.addEventListener("scroll", () => {
      closeSlash();
      if (linkState?.mode === "view") hideLinkPop();
      if (!bubble.hidden) queueBubble();
    }, true);


    function load(html, text = "") {
      closeSlash();
      hideBubble();
      hideLinkPop();
      if (html === undefined || html === null) {
        body.replaceChildren();
        for (const line of text.split("\n")) {
          const paragraph = document.createElement("p");
          paragraph.textContent = line;
          body.append(fillEmpty(paragraph));
        }
        if (!text) body.replaceChildren();
      } else {
        body.replaceChildren(clean(html).content);
      }
      markEmpty();
    }

    return {
      load,
      html: () => clean(body.innerHTML).innerHTML,
      close: () => {
        closeSlash();
        hideBubble();
        hideLinkPop();
      },
    };
  }

  return { editor, plainText, clean, openLink, safeHref };
})();
