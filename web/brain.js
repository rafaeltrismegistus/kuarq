"use strict";

/* Cérebro: grafo das notas e dos links entre elas (inseridos no editor com "/" → Link para nota).
   Usa só o que já está no texto das notas; nada é guardado à parte. */
const brain = (() => {
  const { escape, fold } = kit;

  /* ---------- Seção e aba no Toolkit ---------- */
  const section = document.createElement("section");
  section.id = "brain";
  section.dataset.module = "";
  section.hidden = true;
  section.setAttribute("aria-labelledby", "brain-title");
  section.innerHTML = `<header class="page-heading">
      <div><h1 id="brain-title">Cérebro</h1><p>Como suas notas se conectam.</p></div>
    </header>
    <div id="brain-content"></div>`;
  ($("#dreams") ?? $("#main").lastElementChild).after(section);
  const content = $("#brain-content");
  if (!document.querySelector('link[href="brain.css"]')) {
    document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href: "brain.css" }));
  }
  kit.groups.shelf.items.push(["brain", "Cérebro", "branch"]);
  kit.groups.shelf.subtitle = "Notas, mapas mentais, quadro dos sonhos e cérebro.";

  /* ---------- Grafo: notas e links entre notas ---------- */
  let showOrphans = true;
  let query = "";
  const linkPattern = /data-note="([\w-]{1,80})"/g;

  function build() {
    const nodes = new Map();
    for (const note of workspace.notes ?? []) {
      nodes.set(note.id, { key: note.id, id: note.id, label: note.title?.trim() || "Sem título", project: note.projectId, degree: 0, out: new Set(), in: new Set() });
    }
    const edges = new Map();
    for (const note of workspace.notes ?? []) {
      for (const [, target] of String(note.body ?? "").matchAll(linkPattern)) {
        if (target === note.id || !nodes.has(target)) continue;
        nodes.get(note.id).out.add(target);
        nodes.get(target).in.add(note.id);
        const id = [note.id, target].sort().join("|");
        if (!edges.has(id)) edges.set(id, { a: note.id, b: target });
      }
    }
    for (const edge of edges.values()) {
      nodes.get(edge.a).degree += 1;
      nodes.get(edge.b).degree += 1;
    }
    if (!showOrphans) for (const [key, node] of nodes) if (!node.degree) nodes.delete(key);
    return { nodes: [...nodes.values()], edges: [...edges.values()].filter((edge) => nodes.has(edge.a) && nodes.has(edge.b)) };
  }

  /* ---------- Estado da cena ---------- */
  let graph = { nodes: [], edges: [] };
  let byKey = new Map();
  let neighbors = new Map();
  const view = { x: 0, y: 0, k: 1 };
  let alpha = 0;
  let frame;
  let hover;
  let selected;
  let dragging;
  let panning;
  let canvas;
  let context;
  let palette = {};
  let size = { width: 0, height: 0 };

  /* Posição inicial estável: o mesmo item nasce sempre no mesmo lugar. */
  const hash = (text) => {
    let value = 2166136261;
    for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
    return (value >>> 0) / 4294967295;
  };
  const radius = (node) => 2.6 + Math.sqrt(node.degree) * 1.9;
  const scaled = (node) => radius(node) * Math.max(0.55, Math.min(1.15, view.k));

  function load(keepPositions = true) {
    const previous = new Map(graph.nodes.map((node) => [node.key, node]));
    graph = build();
    const spread = Math.sqrt(graph.nodes.length + 1) * 34;
    for (const node of graph.nodes) {
      const old = keepPositions && previous.get(node.key);
      if (old) Object.assign(node, { x: old.x, y: old.y, vx: 0, vy: 0, pinned: old.pinned });
      else {
        const angle = hash(node.key) * Math.PI * 2;
        const distance = Math.sqrt(hash(`${node.key}r`)) * spread;
        Object.assign(node, { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, vx: 0, vy: 0 });
      }
    }
    byKey = new Map(graph.nodes.map((node) => [node.key, node]));
    neighbors = new Map(graph.nodes.map((node) => [node.key, new Set()]));
    for (const edge of graph.edges) {
      neighbors.get(edge.a).add(edge.b);
      neighbors.get(edge.b).add(edge.a);
    }
    if (selected && !byKey.has(selected.key)) selected = undefined;
    alpha = 1;
  }

  /* ---------- Física (repulsão, molas e gravidade) ---------- */
  function tick() {
    const nodes = graph.nodes;
    const count = nodes.length;
    for (let i = 0; i < count; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < count; j += 1) {
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let distance2 = dx * dx + dy * dy;
        if (distance2 > 160000) continue;
        if (distance2 < 1) { dx = hash(a.key + b.key) - 0.5; dy = 0.5 - hash(b.key + a.key); distance2 = 1; }
        const force = (2600 * alpha) / distance2;
        const distance = Math.sqrt(distance2);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
    }
    for (const edge of graph.edges) {
      const a = byKey.get(edge.a);
      const b = byKey.get(edge.b);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (distance - 86) * 0.03 * alpha;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }
    for (const node of nodes) {
      node.vx -= node.x * 0.006 * alpha;
      node.vy -= node.y * 0.006 * alpha;
      if (node === dragging || node.pinned) { node.vx = 0; node.vy = 0; continue; }
      node.vx *= 0.58;
      node.vy *= 0.58;
      node.x += Math.max(-30, Math.min(30, node.vx));
      node.y += Math.max(-30, Math.min(30, node.vy));
    }
    alpha *= 0.985;
  }

  /* ---------- Desenho ---------- */
  function readColors() {
    const probe = document.createElement("span");
    section.append(probe);
    palette = { colors: {} };
    for (const key of Object.keys(kit.projectColors)) {
      probe.dataset.color = key;
      palette.colors[key] = getComputedStyle(probe).getPropertyValue("--pc").trim() || "#888";
    }
    probe.remove();
    const root = getComputedStyle(document.documentElement);
    palette.line = root.getPropertyValue("--line").trim();
    palette.edge = root.getPropertyValue("--edge").trim();
    palette.text = root.getPropertyValue("--text").trim();
    palette.muted = root.getPropertyValue("--muted").trim();
    palette.panel = root.getPropertyValue("--panel").trim();
    palette.accent = root.getPropertyValue("--accent").trim();
  }

  /* Nota sem projeto: cor de destaque do tema; com projeto: a cor do projeto. */
  const colorOf = (node) => palette.colors[kit.project(node.project)?.color] ?? palette.accent;
  const toScreen = (node) => [(node.x * view.k) + view.x, (node.y * view.k) + view.y];
  const toWorld = (sx, sy) => [(sx - view.x) / view.k, (sy - view.y) / view.k];

  function draw() {
    if (!context) return;
    const ratio = devicePixelRatio || 1;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    const focus = hover ?? selected;
    const near = focus ? neighbors.get(focus.key) : undefined;
    const terms = fold(query.trim());
    const match = (node) => terms && fold(node.label).includes(terms);
    const active = (node) => !focus || node === focus || near.has(node.key);

    context.lineWidth = 1;
    for (const edge of graph.edges) {
      const a = byKey.get(edge.a);
      const b = byKey.get(edge.b);
      const lit = focus && (a === focus || b === focus);
      context.strokeStyle = lit ? palette.accent : palette.edge;
      context.globalAlpha = focus ? (lit ? 0.95 : 0.1) : 0.55;
      context.lineWidth = lit ? 1.6 : 1.1;
      const [ax, ay] = toScreen(a);
      const [bx, by] = toScreen(b);
      context.beginPath();
      context.moveTo(ax, ay);
      context.lineTo(bx, by);
      context.stroke();
    }
    for (const node of graph.nodes) {
      const [sx, sy] = toScreen(node);
      const r = scaled(node);
      context.globalAlpha = active(node) ? 1 : 0.18;
      if (terms && !match(node)) context.globalAlpha = Math.min(context.globalAlpha, 0.2);
      context.fillStyle = colorOf(node);
      context.beginPath();
      context.arc(sx, sy, r, 0, Math.PI * 2);
      context.fill();
      if (node === selected || match(node)) {
        context.strokeStyle = palette.text;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(sx, sy, r + 3, 0, Math.PI * 2);
        context.stroke();
      }
    }
    context.font = "500 12px Inter, 'Segoe UI', system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "top";
    const hubs = [...graph.nodes].sort((a, b) => b.degree - a.degree).slice(0, Math.max(4, Math.round(graph.nodes.length * 0.08))).filter((node) => node.degree >= 3);
    const labeled = new Set(view.k >= 1.6 ? graph.nodes : hubs);
    if (focus) { labeled.add(focus); for (const key of near) labeled.add(byKey.get(key)); }
    for (const node of graph.nodes) if (match(node)) labeled.add(node);
    for (const node of labeled) {
      if (!node) continue;
      const [sx, sy] = toScreen(node);
      const r = scaled(node);
      const text = node.label.length > 32 ? `${node.label.slice(0, 31)}…` : node.label;
      context.globalAlpha = active(node) ? 1 : 0.25;
      context.lineWidth = 3;
      context.strokeStyle = palette.panel;
      context.strokeText(text, sx, sy + r + 4);
      context.fillStyle = node === focus ? palette.text : palette.muted;
      context.fillText(text, sx, sy + r + 4);
    }
    context.globalAlpha = 1;
  }

  function loop() {
    frame = undefined;
    if (!canvas?.isConnected || section.hidden) return;
    if (alpha > 0.004) tick();
    draw();
    if (alpha > 0.004 || dragging) frame = requestAnimationFrame(loop);
  }
  const wake = (heat = 0) => {
    alpha = Math.max(alpha, heat);
    if (!frame) frame = requestAnimationFrame(loop);
  };

  function resize() {
    if (!canvas) return;
    const box = canvas.parentElement.getBoundingClientRect();
    size = { width: Math.max(320, box.width), height: Math.max(360, box.height) };
    const ratio = devicePixelRatio || 1;
    canvas.width = Math.round(size.width * ratio);
    canvas.height = Math.round(size.height * ratio);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    wake();
  }
  function fit() {
    if (!graph.nodes.length) { view.x = size.width / 2; view.y = size.height / 2; view.k = 1; return; }
    const xs = graph.nodes.map((node) => node.x);
    const ys = graph.nodes.map((node) => node.y);
    const width = Math.max(...xs) - Math.min(...xs) + 120;
    const height = Math.max(...ys) - Math.min(...ys) + 120;
    view.k = Math.max(0.25, Math.min(1.2, Math.min(size.width / width, size.height / height)));
    view.x = size.width / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * view.k;
    view.y = size.height / 2 - ((Math.max(...ys) + Math.min(...ys)) / 2) * view.k;
    wake();
  }

  /* ---------- Tela ---------- */
  function render() {
    content.innerHTML = `<div class="brain-toolbar">
        <p class="brain-hint">${icon("info")}<span>Ligue notas escrevendo <b>/</b> no texto e escolhendo <b>Link para nota</b>. Cada link vira uma linha aqui.</span></p>
        <span class="tk-spacer"></span>
        <label class="crm-search tk-search brain-search"><span>${icon("search")}</span><input type="search" data-brain-search value="${escape(query)}" placeholder="Buscar nota" aria-label="Buscar nota no cérebro"></label>
        <button type="button" class="button" data-brain="options">${icon("more")}Opções</button>
      </div>
      <div class="brain-stage">
        <canvas class="brain-canvas" aria-label="Grafo das notas"></canvas>
        <div class="brain-hud">
          <button type="button" class="icon-button" data-brain="zoom-in" aria-label="Aproximar" title="Aproximar">${icon("plus")}</button>
          <button type="button" class="icon-button" data-brain="zoom-out" aria-label="Afastar" title="Afastar">${icon("minus")}</button>
          <button type="button" class="icon-button" data-brain="fit" aria-label="Enquadrar tudo" title="Enquadrar tudo">${icon("fit")}</button>
          <button type="button" class="icon-button" data-brain="shake" aria-label="Reorganizar" title="Reorganizar">${icon("reload")}</button>
        </div>
        <p class="brain-stats"></p>
        <aside class="brain-card" hidden></aside>
        <div class="brain-empty" hidden>${kit.emptyState("branch", "Nenhuma nota ainda", "Crie notas e ligue umas às outras com / → Link para nota.")}</div>
      </div>`;
    canvas = content.querySelector(".brain-canvas");
    context = canvas.getContext("2d");
    readColors();
    load();
    resize();
    for (let index = 0; index < 260; index += 1) tick();
    fit();
    paintMeta();
  }
  function paintMeta() {
    content.querySelector(".brain-stats").textContent = `${kit.plural(graph.nodes.length, "nota", "notas")} · ${kit.plural(graph.edges.length, "ligação", "ligações")}`;
    content.querySelector(".brain-empty").hidden = graph.nodes.length > 0;
    paintCard();
  }

  /* Cartão da nota escolhida: links que saem dela e notas que a mencionam. */
  function paintCard() {
    const card = content.querySelector(".brain-card");
    if (!selected) { card.hidden = true; return; }
    const project = kit.project(selected.project);
    const list = (keys) => [...keys].map((key) => byKey.get(key)).filter(Boolean).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))
      .map((node) => `<li><button type="button" data-brain="pick" data-key="${escape(node.key)}"><span class="brain-dot" data-color="${kit.project(node.project)?.color ?? ""}"></span><span>${escape(node.label)}</span></button></li>`).join("");
    const out = list(selected.out);
    const into = list(selected.in);
    card.hidden = false;
    card.innerHTML = `<header><span class="brain-dot" data-color="${project?.color ?? ""}"></span><small>${project ? escape(project.name ?? project.title ?? "Projeto") : "Nota"}</small><span class="tk-spacer"></span>
        <button type="button" class="icon-button" data-brain="close" aria-label="Fechar">${icon("close")}</button></header>
      <strong class="brain-card-title">${escape(selected.label)}</strong>
      <button type="button" class="button primary" data-brain="open">${icon("open")}Abrir nota</button>
      <div class="brain-card-lists">
        <small class="brain-card-sub">Links nesta nota · ${selected.out.size}</small>
        ${out ? `<ul class="brain-card-list">${out}</ul>` : '<p class="brain-card-none">Nenhum link. Use / → Link para nota.</p>'}
        <small class="brain-card-sub">Mencionada em · ${selected.in.size}</small>
        ${into ? `<ul class="brain-card-list">${into}</ul>` : '<p class="brain-card-none">Nenhuma nota aponta para esta.</p>'}
      </div>`;
  }

  function openItem(node) {
    if (!node) return;
    actions.notes();
    notes.openById(node.id);
  }
  function focusNode(node) {
    selected = node;
    if (node) {
      const [sx, sy] = toScreen(node);
      /* No celular o cartão cobre a parte de baixo: a nota fica centrada no espaço que sobra em cima. */
      const sheet = matchMedia("(max-width: 720px)").matches;
      view.x += size.width / 2 - sx;
      view.y += size.height * (sheet ? 0.25 : 0.5) - sy;
    }
    paintCard();
    wake();
  }

  /* ---------- Eventos ---------- */
  const pointer = (event) => {
    const box = canvas.getBoundingClientRect();
    return [event.clientX - box.left, event.clientY - box.top];
  };
  function nodeAt(sx, sy) {
    const [wx, wy] = toWorld(sx, sy);
    let best;
    let bestDistance = Infinity;
    for (const node of graph.nodes) {
      const reach = (radius(node) + 5) / Math.min(1, view.k);
      const distance = Math.hypot(node.x - wx, node.y - wy);
      if (distance < reach && distance < bestDistance) { best = node; bestDistance = distance; }
    }
    return best;
  }
  let downAt;
  content.addEventListener("pointerdown", (event) => {
    if (!event.target.matches(".brain-canvas")) return;
    const [sx, sy] = pointer(event);
    const node = nodeAt(sx, sy);
    downAt = { sx, sy, moved: false };
    canvas.setPointerCapture(event.pointerId);
    if (node) { dragging = node; wake(0.3); } else panning = { sx, sy, x: view.x, y: view.y };
  });
  content.addEventListener("pointermove", (event) => {
    if (!event.target.matches(".brain-canvas")) return;
    const [sx, sy] = pointer(event);
    if (downAt && Math.hypot(sx - downAt.sx, sy - downAt.sy) > 4) downAt.moved = true;
    if (dragging) {
      const [wx, wy] = toWorld(sx, sy);
      dragging.x = wx; dragging.y = wy;
      wake(0.25);
      return;
    }
    if (panning) {
      view.x = panning.x + (sx - panning.sx);
      view.y = panning.y + (sy - panning.sy);
      wake();
      return;
    }
    const next = nodeAt(sx, sy);
    if (next !== hover) {
      hover = next;
      canvas.style.cursor = next ? "pointer" : "grab";
      canvas.title = next ? next.label : "";
      wake();
    }
  });
  const release = (event) => {
    if (!downAt) return;
    const [sx, sy] = pointer(event);
    if (!downAt.moved) {
      selected = nodeAt(sx, sy);
      paintCard();
    } else if (dragging) dragging.pinned = true;
    dragging = undefined;
    panning = undefined;
    downAt = undefined;
    wake();
  };
  content.addEventListener("pointerup", release);
  content.addEventListener("pointercancel", release);
  content.addEventListener("pointerleave", (event) => { if (event.target.matches?.(".brain-canvas") && hover) { hover = undefined; wake(); } }, true);
  content.addEventListener("dblclick", (event) => {
    if (!event.target.matches(".brain-canvas")) return;
    const node = nodeAt(...pointer(event));
    if (node) openItem(node);
    else fit();
  });
  content.addEventListener("wheel", (event) => {
    if (!event.target.matches(".brain-canvas")) return;
    event.preventDefault();
    const [sx, sy] = pointer(event);
    const factor = Math.exp(-event.deltaY * 0.0015);
    const k = Math.max(0.2, Math.min(4, view.k * factor));
    view.x = sx - ((sx - view.x) * k) / view.k;
    view.y = sy - ((sy - view.y) * k) / view.k;
    view.k = k;
    wake();
  }, { passive: false });

  content.addEventListener("click", (event) => {
    const button = event.target.closest("[data-brain]");
    if (!button) return;
    const action = button.dataset.brain;
    const zoom = (factor) => {
      const k = Math.max(0.2, Math.min(4, view.k * factor));
      view.x = size.width / 2 - ((size.width / 2 - view.x) * k) / view.k;
      view.y = size.height / 2 - ((size.height / 2 - view.y) * k) / view.k;
      view.k = k;
      wake();
    };
    if (action === "zoom-in") return zoom(1.25);
    if (action === "zoom-out") return zoom(0.8);
    if (action === "fit") return fit();
    if (action === "shake") {
      for (const node of graph.nodes) { node.pinned = false; node.x += (hash(node.key + Date.now()) - 0.5) * 40; node.y += (hash(Date.now() + node.key) - 0.5) * 40; }
      wake(1);
      return setTimeout(fit, 900);
    }
    if (action === "close") { selected = undefined; paintCard(); return wake(); }
    if (action === "open") return openItem(selected);
    if (action === "pick") return focusNode(byKey.get(button.dataset.key));
    if (action === "options") {
      return kit.menu(button, [
        { label: "Mostrar notas sem ligação", checked: showOrphans, action: () => { showOrphans = !showOrphans; render(); } },
      ], { align: "end" });
    }
  });
  content.addEventListener("input", (event) => {
    if (!event.target.matches("[data-brain-search]")) return;
    query = event.target.value;
    const terms = fold(query.trim());
    const first = terms && graph.nodes.filter((node) => fold(node.label).includes(terms)).sort((a, b) => b.degree - a.degree)[0];
    if (first) focusNode(first);
    else wake();
  });
  content.addEventListener("keydown", (event) => {
    if (event.target.matches("[data-brain-search]") && event.key === "Enter" && selected) openItem(selected);
  });
  window.addEventListener("resize", () => { if (!section.hidden) resize(); });
  new MutationObserver(() => { if (!section.hidden && canvas) { readColors(); wake(); } })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  kit.subscribe?.(() => {
    if (section.hidden || !canvas) return;
    load();
    paintMeta();
    wake(0.4);
  });

  const module = { show: render, refresh: () => !section.hidden && render() };
  kit.register("brain", "Cérebro", module);
  return module;
})();
