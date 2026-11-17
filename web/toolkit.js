"use strict";

const drawings = {
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17.5 5-4.5 3.5 3 3-2.5 4.5 4"/>',
  bank: '<path d="M3.5 9.5 12 4.5l8.5 5M5 10v7.5m4.7-7.5v7.5m4.6-7.5v7.5M19 10v7.5M3.5 20h17"/>',
  trend: '<path d="m3.5 16.5 5.5-5.5 4 4 7.5-7.5"/><path d="M15 7.5h5.5V13"/>',
  cart: '<path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H6.4"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
  "arrow-in": '<path d="M17.5 6.5 6.5 17.5m0-8v8h8"/>',
  "arrow-out": '<path d="M6.5 17.5 17.5 6.5m0 8v-8h-8"/>',
  scale: '<path d="M12 4v16M7 20h10M5 7h14M5 7l-2.5 6a2.8 2.8 0 0 0 5 0Zm14 0-2.5 6a2.8 2.8 0 0 0 5 0Z"/>',
  tag: '<path d="M4 12.2V4.5h7.7l8.3 8.3-7.7 7.7Z"/><path d="M8 8h.01" stroke-width="2.4"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><path d="M17 7h.01" stroke-width="2.2"/>',
  whatsapp: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z"/>',
  wagrupo: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><circle cx="10" cy="10.5" r="1.6"/><circle cx="14.5" cy="10.5" r="1.6"/><path d="M7.6 15c.5-1.3 1.4-2 2.4-2s1.9.7 2.3 1.6M12.2 14.6c.4-1 1.2-1.6 2.3-1.6 1 0 1.8.6 2.2 1.6"/>',
  linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 10.5V16M8 7.8v.01M11.5 16v-3.2a2.2 2.2 0 0 1 4.4 0V16M11.5 10.5V16"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10 9.5 5 2.5-5 2.5z"/>',
  drive: '<path d="M8.5 3.5h7l6 10.5-3.5 6h-12L2.5 14z"/><path d="M8.5 3.5 14.5 14h7M2.5 14h12L18 20"/>',
  notion: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8.5 16.5V8l7 8.5V8"/>',
  figma: '<path d="M9 3h3v6H9a3 3 0 0 1 0-6zM12 3h3a3 3 0 0 1 0 6h-3zM9 9h3v6H9a3 3 0 0 1 0-6zM12 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0zM9 15h3v3a3 3 0 1 1-3-3z"/>',
  github: '<path d="M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.9-2.3c3-.3 6-1.5 6-6.5a5 5 0 0 0-1.4-3.6 4.7 4.7 0 0 0-.1-3.6s-1.1-.3-3.6 1.4a12.4 12.4 0 0 0-6.5 0C6 1.2 4.9 1.5 4.9 1.5a4.7 4.7 0 0 0-.1 3.6A5 5 0 0 0 3.4 8.7c0 5 3 6.2 6 6.5a3 3 0 0 0-.9 2.3V21"/>',
  chain: '<path d="M10 13.5a4 4 0 0 0 5.66.2l3-3a4 4 0 0 0-5.66-5.66l-1.2 1.2"/><path d="M14 10.5a4 4 0 0 0-5.66-.2l-3 3a4 4 0 0 0 5.66 5.66l1.2-1.2"/>',
  unlink: '<path d="M10 13.5a4 4 0 0 0 5.66.2l3-3a4 4 0 0 0-5.66-5.66l-1.2 1.2"/><path d="M14 10.5a4 4 0 0 0-5.66-.2l-3 3a4 4 0 0 0 5.66 5.66l1.2-1.2"/><path d="m4 4 16 16"/>',
  map: '<circle cx="5" cy="12" r="2.5"/><circle cx="18" cy="5" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m7.2 10.8 8.5-4.6m-8.5 7 8.5 4.6"/>',
  sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  moon: '<path d="M20.8 13.5A9 9 0 0 1 10.5 3.2a9 9 0 1 0 10.3 10.3Z"/>',
  home: '<path d="M4 11 12 4.5 20 11v8a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19Z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  "eye-off": '<path d="M4 4l16 16M10.6 6.1A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M6.6 7.6C4 9.4 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  folder: '<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/>',
  file: '<path d="M7 3.5h7l4.5 4.5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z"/><path d="M14 3.5V8h4.5"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5Z"/>',
  book: '<path d="M5 4.5h10.5a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2Z"/><path d="M5 17.5a2 2 0 0 1 2-2h10.5M9 8.5h5"/>',
  atom: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/>',
  card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
  wallet: '<path d="M4 7.5a2 2 0 0 1 2-2h11.5v3"/><rect x="4" y="8.5" width="16.5" height="11" rx="2"/><path d="M16 14h.01"/>',
  flag: '<path d="M6 21V4.5m0 0h10l-2 4 2 4H6"/>',
  open: '<path d="M14 4.5h5.5V10M19.5 4.5 11 13M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  star: '<path d="m12 4 2.4 5 5.4.7-4 3.7 1 5.4-4.8-2.6-4.8 2.6 1-5.4-4-3.7 5.4-.7Z"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5m0-8v.01"/>',
  more: '<path d="M6 12h.01M12 12h.01M18 12h.01" stroke-width="2.6"/>',
  diamond: '<path d="M12 4.5 19.5 12 12 19.5 4.5 12Z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
  layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5Z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
  comment: '<path d="M5 5.5h14v10H10l-5 3.5Z"/>',
  history: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"/><path d="M4.5 4.5V9H9M12 8v4l3 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4m11.2-11.2L19 5"/>',
  drive: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 14h18m-4 2h.01"/>',
  edit: '<path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15l-1 5Z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13m-8 4v5m4-5v5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  back: '<path d="m12 6-6 6 6 6M6 12h12"/>',
  undo: '<path d="M9 10H4V5m0 5 4-4c4-3 11-1 11 6v3"/>',
  reload: '<path d="M20 4v5h-5M20 9a8 8 0 1 0 .2 5"/>',
  fit: '<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  play: '<path d="m8 5 12 7-12 7Z"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 19v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m1-14a3 3 0 0 1 0 6m2 3a4 4 0 0 1 3 4v1"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  message: '<path d="M5 5h14v11H9l-4 3Z"/>',
  calendar: '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 4v4m8-4v4M4 11h16"/>',
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  board: '<rect x="3" y="5" width="4" height="14" rx="1"/><rect x="10" y="5" width="4" height="9" rx="1"/><rect x="17" y="5" width="4" height="12" rx="1"/>',
  grip: '<path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" stroke-width="3"/>',
  note: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8m-8 4h8m-8 4h5"/>',
  ordered: '<path d="M10 6h10m-10 6h10m-10 6h10M4 5h1v4m-1 0h2m-2 5a1 1 0 0 1 2 0c0 1-2 2-2 3h2"/>',
  lock: '<rect x="6" y="10" width="12" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="6" y="10" width="12" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.6-1.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  checklist: '<path d="m3.5 7 2 2 3.5-4m-5.5 11.5 2 2 3.5-4M12.5 7.5H21m-8.5 9H21"/>',
  quote: '<path d="M5 5v14M9.5 8H20m-10.5 4H20m-10.5 4H16"/>',
  text: '<path d="M5 6.5V5h14v1.5M12 5v14m-3 0h6"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  "chevron-right": '<path d="m10 7 5 5-5 5"/>',
  "chevron-left": '<path d="m14 7-5 5 5 5"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.2"/><path d="M15.5 8.5V6.2A2.2 2.2 0 0 0 13.3 4H6.2A2.2 2.2 0 0 0 4 6.2v7.1a2.2 2.2 0 0 0 2.2 2.2h2.3"/>',
  clipboard: '<rect x="8" y="4" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  template: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M4 9.5h16M10 9.5V20"/>',
  cursor: '<path d="m5 4 13.5 6.2-5.8 1.8-2.2 5.9Z"/><path d="m13 13 5 5"/>',
  pen: '<path d="M4.5 19.5 6 14 15.5 4.5a2.1 2.1 0 0 1 3 3L9 17Z"/><path d="m13.5 6.5 3 3"/>',
  marker: '<path d="m9 15-3.5 3.5H3l3.2-3.2M9 15l-2.5-2.5L15 4l5 5-8.5 8.5Z"/><path d="M14 21h7"/>',
  eraser: '<path d="m8.5 20-4.4-4.4a2 2 0 0 1 0-2.8l8.5-8.5a2 2 0 0 1 2.8 0l4.4 4.4a2 2 0 0 1 0 2.8L13 20Z"/><path d="M8.5 20H20M9.5 8.5l6.5 6.5"/>',
  link: '<path d="M4 12h12.5m-4.5-5 5 5-5 5"/><circle cx="19.5" cy="12" r="1"/>',
  swap: '<path d="M7 7.5h12m-3.5-3.5L19 7.5 15.5 11M17 16.5H5m3.5-3.5L5 16.5 8.5 20"/>',
  branch: '<circle cx="6" cy="12" r="2"/><path d="M8 12h3c2 0 2-5 4-5h3M11 12c2 0 2 5 4 5h3"/>',
  phone: '<path d="M6 4h3l1.8 4.6-2.3 1.4a11 11 0 0 0 5.5 5.5l1.4-2.3L20 15v3a2 2 0 0 1-2 2A15 15 0 0 1 4 6a2 2 0 0 1 2-2Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
  cake: '<path d="M4 20h16M5.5 20v-6.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2V20M5.5 15.5c1.6 1 3 1 4.3 0s2.9-1 4.3 0 3 1 4.4 0M12 11.5V8.5m0-4.3c.9.9 1.2 1.7 0 2.6-1.2-.9-.9-1.7 0-2.6Z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  alert: '<path d="M12 3.8 2.8 19.5h18.4Z"/><path d="M12 10v4.2m0 2.6v.01"/>',
  arrow: '<path d="M5 12h14m-5.5-5.5L19 12l-5.5 5.5"/>',
  activity: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
  heart: '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10C19.5 15.6 12 20 12 20Z"/>',
  chart: '<path d="M5 20V11m7 9V5m7 15v-6"/>',
  pause: '<path d="M9 6v12m6-12v12"/>',
  sparkle: '<path d="M12 4l1.8 4.9L19 10.7l-5.2 1.8L12 17.5l-1.8-5L5 10.7l5.2-1.8Z"/>',
  divider: '<path d="M4 12h16M8 7h8m-8 10h8" opacity=".9"/>',
  wave: '<path d="M3.5 17.5c5 0 4-11 9-11s3.5 11 8 11"/><path d="m17.5 14.5 3 3-3 3"/>',
  "arrow-straight": '<path d="M4 19 19 4"/><path d="M10 4h9v9"/>',
  elbow: '<path d="M4 5v7.5a2 2 0 0 0 2 2h14"/><path d="m16.5 11 3.5 3.5-3.5 3.5"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[name]}</svg>`;
const $ = (selector) => document.querySelector(selector);
const label = (count) => `${count} ${count === 1 ? "tópico" : "tópicos"}`;
const bridge = window.chrome?.webview;
const saveStatus = $("#save-status");
const reloadButton = $("#reload-toolkit");
const viewport = $("#map-viewport");
const nodesLayer = $("#nodes");
const canvas = $("#connections");
const dialog = $("#edit-dialog");
const form = $("#edit-form");
const mapTitle = $("#map-title");
const nodeWidth = 164;
const nodeHeight = 50;
const minNodeWidth = 100;
const maxNodeWidth = 640;
const minNodeHeight = 40;
const maxNodeHeight = 420;
const branchDirections = new Set(["top", "right", "bottom", "left"]);
const cardColors = new Set(["default", "slate", "purple", "blue", "green", "amber", "red", "dark"]);
const cardFgColors = new Set(["auto", "light", "dark", "purple", "blue", "green", "amber", "red"]);
const fgMarkerToKey = {
  "rgb(1, 1, 1)": "auto", "#010101": "auto",
  "rgb(2, 2, 2)": "light", "#020202": "light",
  "rgb(3, 3, 3)": "dark", "#030303": "dark",
  "rgb(4, 4, 4)": "purple", "#040404": "purple",
  "rgb(5, 5, 5)": "blue", "#050505": "blue",
  "rgb(6, 6, 6)": "green", "#060606": "green",
  "rgb(7, 7, 7)": "amber", "#070707": "amber",
  "rgb(8, 8, 8)": "red", "#080808": "red",
};
const fgKeyToMarker = {
  auto: "#010101", light: "#020202", dark: "#030303", purple: "#040404",
  blue: "#050505", green: "#060606", amber: "#070707", red: "#080808",
};
const columnGap = 234;
const rowGap = 76;
const nodeLimit = 500;
const linkLimit = 2000;
const strokeLimit = 3000;
const strokePointLimit = 4000;
const minZoom = .005;
const inkTools = { pen: { label: "Caneta", sizes: [2, 4, 8] }, marker: { label: "Marcador", sizes: [12, 20, 32] } };
const inkColors = {
  auto: ["Cor do texto", null], red: ["Vermelho", "#e5484d"], blue: ["Azul", "#3e7bfa"],
  green: ["Verde", "#2fa36b"], yellow: ["Amarelo", "#f5c400"], purple: ["Roxo", "#9a6ee0"],
};
const ink = { tool: "select", color: { pen: "auto", marker: "yellow" }, size: { pen: 4, marker: 20 } };
const inkCanvas = $("#ink");
const connectMenu = $("#connect-menu");
const cardStyleBar = $("#card-style-bar");
const textBubble = $("#text-bubble");
const copyNodeButton = $("#copy-node-tool");
const pasteNodeButton = $("#paste-node-tool");
const fixNodeButton = $("#fix-node-tool");
const deleteNodeButton = $("#delete-node-tool");
const linkNoteButton = $("#link-note-button");
const noteLinkDialog = $("#note-link-dialog");
const noteLinkCurrent = $("#note-link-current");
const noteLinkSearch = $("#note-link-search");
const noteLinkList = $("#note-link-list");
let selectedLink;
let linkDrag;
let linkEditDrag;
let resizeDrag;
let inkPointer;
let editingNodeId;
let connectMenuTarget;
let bubbleFrame;
let savedCardRange;
let clipboardBranch;

let workspace;
let activeMap;
let selectedId;
let placement = new Map();
let view = { x: 0, y: 0, scale: 1 };
let pointer;
let ignoreTopicClick = false;
let dialogSave;
let presenting = false;
let history = [];
let revision = 0;
let savedRevision = 0;
let saving;
let saveTimer;
let messageId = 0;
const pendingMessages = new Map();

function host(action, data) {
  if (!bridge) return Promise.reject(new Error("Abra o Kuarq pelo aplicativo do Windows."));
  const id = ++messageId;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingMessages.delete(id);
      reject(new Error("O armazenamento local não respondeu."));
    }, 7000);
    pendingMessages.set(id, { resolve, reject, timeout });
    bridge.postMessage({ id, action, data });
  });
}

bridge?.addEventListener("message", ({ data }) => {
  const request = pendingMessages.get(data?.id);
  if (!request) return;
  pendingMessages.delete(data.id);
  clearTimeout(request.timeout);
  if (data.error) request.reject(new Error(data.error));
  else request.resolve(data.data);
});

function showStatus(text, retry = false) {
  saveStatus.textContent = text;
  saveStatus.disabled = !retry;
}

function persist() {
  clearTimeout(saveTimer);
  if (saving) return saving;
  saving = (async () => {
    while (savedRevision !== revision) {
      const target = revision;
      showStatus("Salvando…");
      await host("save", workspace);
      savedRevision = target;
    }
    showStatus("Salvo no PC");
    return true;
  })().catch(() => {
    showStatus("Falha ao salvar. Tentar de novo", true);
    return false;
  }).finally(() => { saving = undefined; });
  return saving;
}

window.finishPendingSave = () => savedRevision === revision || persist();

async function reloadToolkit() {
  if (reloadButton.disabled) return;
  if (document.querySelector("dialog[open]") &&
      !window.confirm("Recarregar o Kuarq e descartar alterações ainda não confirmadas no formulário aberto?")) return;
  reloadButton.disabled = true;
  if (!await window.finishPendingSave()) {
    reloadButton.disabled = false;
    return;
  }
  window.location.reload();
}

function changed(delay = 0) {
  revision++;
  if (!delay) {
    void persist();
    return;
  }
  clearTimeout(saveTimer);
  showStatus("Salvando…");
  saveTimer = setTimeout(persist, delay);
}

const mapImageMax = 1600000;
const isMapImage = (value) => typeof value === "string" && value.length < mapImageMax && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
const imageLimits = { min: 48, max: 1400 };
/* Image cards keep the picture's proportions: width decides, height follows. */
function imageNodeSize(node, width = node?.size?.w ?? 240) {
  const ratio = node.imageRatio;
  let w = Math.max(imageLimits.min, Math.min(imageLimits.max, width));
  let h = w / ratio;
  if (h > imageLimits.max) { h = imageLimits.max; w = h * ratio; }
  if (h < imageLimits.min) { h = imageLimits.min; w = Math.min(imageLimits.max, h * ratio); }
  return { w: Math.round(w), h: Math.round(h) };
}

function nodeSize(node) {
  if (node?.image) return imageNodeSize(node);
  const w = Number.isFinite(node?.size?.w) ? Math.max(minNodeWidth, Math.min(maxNodeWidth, node.size.w)) : nodeWidth;
  const h = Number.isFinite(node?.size?.h) ? Math.max(minNodeHeight, Math.min(maxNodeHeight, node.size.h)) : nodeHeight;
  return { w, h };
}

function validWorkspace(document) {
  if (document?.version !== 1 || !Array.isArray(document.maps)) return false;
  const mapIds = new Set();
  for (const map of document.maps) {
    if (typeof map?.id !== "string" || mapIds.has(map.id) || typeof map.title !== "string" ||
        !Array.isArray(map.nodes) || !map.nodes.length || map.nodes.length > nodeLimit) return false;
    mapIds.add(map.id);
    const seen = new Set();
    for (const [index, node] of map.nodes.entries()) {
      if (typeof node?.id !== "string" || seen.has(node.id) || typeof node.title !== "string" ||
          (node.note !== undefined && typeof node.note !== "string") || (!index && node.parent !== null) ||
          (node.parent !== null && !seen.has(node.parent)) ||
          (node.noteHtml !== undefined && typeof node.noteHtml !== "string") ||
          (node.titleHtml !== undefined && typeof node.titleHtml !== "string") ||
          (node.image !== undefined && (!isMapImage(node.image) || !Number.isFinite(node.imageRatio) || node.imageRatio < 0.05 || node.imageRatio > 20)) ||
          (node.color !== undefined && !cardColors.has(node.color)) ||
          (node.noteId !== undefined && typeof node.noteId !== "string") ||
          (node.dir !== undefined && !branchDirections.has(node.dir)) ||
          (node.size !== undefined && (!Number.isFinite(node.size?.w) || node.size.w < 60 || node.size.w > 2000 ||
            !Number.isFinite(node.size?.h) || node.size.h < 28 || node.size.h > 2000)) ||
          ["collapsed", "titleBold", "titleItalic"].some((key) => node[key] !== undefined && typeof node[key] !== "boolean") ||
          ["offset", "fixed", "pos"].some((key) => node[key] !== undefined &&
            (!Number.isFinite(node[key]?.x) || !Number.isFinite(node[key]?.y)))) return false;
      seen.add(node.id);
    }
    if (map.links !== undefined && (!Array.isArray(map.links) || map.links.length > linkLimit ||
        map.links.some((link) => {
          if (typeof link?.id !== "string") return true;
          const validFrom = (typeof link.from === "string" && seen.has(link.from) && link.fromPos === undefined) ||
            (link.from === null && Number.isFinite(link.fromPos?.x) && Number.isFinite(link.fromPos?.y));
          const validTo = (typeof link.to === "string" && seen.has(link.to) && link.toPos === undefined) ||
            (link.to === null && Number.isFinite(link.toPos?.x) && Number.isFinite(link.toPos?.y));
          if (!validFrom || !validTo) return true;
          if (link.from && link.from === link.to) return true;
          if (link.curved !== undefined && typeof link.curved !== "boolean") return true;
          if (link.elbow !== undefined && typeof link.elbow !== "boolean") return true;
          return ["fromSide", "toSide"].some((key) => link[key] !== undefined && !branchDirections.has(link[key]));
        }))) return false;
    if (map.strokes !== undefined && (!Array.isArray(map.strokes) || map.strokes.length > strokeLimit ||
        map.strokes.some((stroke) => typeof stroke?.id !== "string" || !Object.hasOwn(inkTools, stroke.tool) ||
          !Object.hasOwn(inkColors, stroke.color) || !Number.isFinite(stroke.width) || stroke.width <= 0 || stroke.width > 80 ||
          !Array.isArray(stroke.points) || !stroke.points.length || stroke.points.length > strokePointLimit ||
          stroke.points.some((point) => !Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite))))) return false;
  }
  return true;
}

function applyDiscreet() {
  const on = Boolean(workspace?.settings?.discreet);
  document.documentElement.toggleAttribute("data-discreet", on);
  const button = $("#discreet-toggle");
  button.innerHTML = icon(on ? "eye-off" : "eye");
  button.setAttribute("aria-pressed", String(on));
  button.title = on ? "Modo discreto ativo: clique para mostrar o Núcleo e os valores" : "Modo discreto: esconde o Núcleo e os valores";
}

function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const button = $("#theme-toggle");
  button.innerHTML = icon(dark ? "sun" : "moon");
  button.setAttribute("aria-pressed", String(dark));
  if (bridge) void host("theme", dark ? "dark" : "light").catch(() => {});
  if (activeMap) draw();
  else if (workspace) renderMaps();
}

function actionButton(className, action, text) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.dataset.action = action;
  if (text) button.textContent = text;
  return button;
}

function renderMaps() {
  const library = $("#map-library");
  library.replaceChildren();
  if (!workspace.maps.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.innerHTML = `<span class="empty-mark" data-icon="map">${icon("map")}</span><h2>Nenhum mapa criado</h2><p>Crie um mapa para começar com uma ideia central.</p>`;
    library.append(empty);
    return;
  }
  const grid = document.createElement("div");
  grid.className = "library-grid";
  for (const map of workspace.maps) {
    const card = document.createElement("article");
    card.className = "map-card";
    const open = actionButton("map-card-open", "open-map");
    open.dataset.id = map.id;
    open.innerHTML = '<canvas class="map-preview" width="480" height="184" aria-hidden="true"></canvas><span class="map-card-text"><strong></strong><small></small></span>';
    open.querySelector("strong").textContent = map.title;
    const date = new Date(map.updatedAt ?? NaN);
    const formatted = Number.isNaN(date.getTime()) ? "" : ` · ${date.toLocaleDateString("pt-BR")}`;
    const roots = map.nodes.filter((node) => node.parent === null).length;
    open.querySelector("small").textContent = [roots > 1 ? `${roots} mapas` : "", label(map.nodes.length)]
      .filter(Boolean).join(" · ") + formatted;
    drawPreview(open.querySelector("canvas"), map);
    const controls = document.createElement("div");
    controls.className = "map-card-actions";
    for (const [action, text] of [["duplicate-map", "Duplicar"], ["delete-map", "Excluir"]]) {
      const control = actionButton("button", action, text);
      control.dataset.id = map.id;
      control.setAttribute("aria-label", `${text} ${map.title}`);
      controls.append(control);
    }
    card.append(open, controls);
    grid.append(card);
  }
  library.append(grid);
}

function renderWorkspace() {
  $("#library").hidden = Boolean(activeMap);
  $("#editor").hidden = !activeMap;
  const crumb = $("#current-crumb");
  crumb.hidden = !activeMap;
  crumb.textContent = activeMap?.title ?? "";
  if (activeMap) {
    mapTitle.value = activeMap.title;
    layoutNodes();
  } else {
    renderMaps();
  }
}

function calculateLayout(map, movement) {
  const children = new Map(map.nodes.map((node) => [node.id, []]));
  const roots = [];
  for (const node of map.nodes) {
    if (node.parent === null || !children.has(node.parent)) roots.push(node);
    else children.get(node.parent).push(node);
  }
  const hGap = 70;
  const vGap = 56;
  const stackYGap = 26;
  const stackXGap = 28;

  function layoutSubtree(node) {
    const { w, h } = nodeSize(node);
    const points = new Map([[node.id, { x: 0, y: 0 }]]);
    let minX = -w / 2;
    let maxX = w / 2;
    let minY = -h / 2;
    let maxY = h / 2;
    const descendants = node.collapsed ? [] : children.get(node.id);
    const groups = { right: [], left: [], top: [], bottom: [] };
    for (const child of descendants) groups[child.dir ?? "right"].push(child);

    function placeVertical(list, sideSign) {
      if (!list.length) return;
      const items = list.map((child) => layoutSubtree(child));
      let cursorY = 0;
      const ys = items.map((sub, index) => {
        const y = index === 0 ? -sub.minY : cursorY - sub.minY;
        cursorY = y + sub.maxY + stackYGap;
        return y;
      });
      const centerOffset = (ys[0] + ys.at(-1)) / 2;
      items.forEach((sub, index) => {
        const dy = ys[index] - centerOffset;
        const dx = sideSign > 0 ? w / 2 + hGap - sub.minX : -w / 2 - hGap - sub.maxX;
        for (const [id, point] of sub.points) points.set(id, { x: point.x + dx, y: point.y + dy });
        minX = Math.min(minX, sub.minX + dx);
        maxX = Math.max(maxX, sub.maxX + dx);
        minY = Math.min(minY, sub.minY + dy);
        maxY = Math.max(maxY, sub.maxY + dy);
      });
    }

    function placeHorizontal(list, sideSign) {
      if (!list.length) return;
      const items = list.map((child) => layoutSubtree(child));
      let cursorX = 0;
      const xs = items.map((sub, index) => {
        const x = index === 0 ? -sub.minX : cursorX - sub.minX;
        cursorX = x + sub.maxX + stackXGap;
        return x;
      });
      const centerOffset = (xs[0] + xs.at(-1)) / 2;
      items.forEach((sub, index) => {
        const dx = xs[index] - centerOffset;
        const dy = sideSign > 0 ? h / 2 + vGap - sub.minY : -h / 2 - vGap - sub.maxY;
        for (const [id, point] of sub.points) points.set(id, { x: point.x + dx, y: point.y + dy });
        minX = Math.min(minX, sub.minX + dx);
        maxX = Math.max(maxX, sub.maxX + dx);
        minY = Math.min(minY, sub.minY + dy);
        maxY = Math.max(maxY, sub.maxY + dy);
      });
    }

    placeVertical(groups.right, 1);
    placeVertical(groups.left, -1);
    placeHorizontal(groups.bottom, 1);
    placeHorizontal(groups.top, -1);
    return { points, minX, maxX, minY, maxY };
  }

  const automatic = new Map();
  let nextAutoY;
  for (const root of roots) {
    const sub = layoutSubtree(root);
    let offsetY = 0;
    if (!root.pos) {
      if (nextAutoY === undefined) {
        offsetY = 0;
        nextAutoY = sub.maxY + 110;
      } else {
        offsetY = nextAutoY - sub.minY;
        nextAutoY = offsetY + sub.maxY + 110;
      }
    }
    for (const [id, point] of sub.points) automatic.set(id, { x: point.x, y: point.y + offsetY });
  }

  const positions = new Map();
  for (const node of map.nodes) {
    const base = automatic.get(node.id);
    if (!base) continue;
    const parent = positions.get(node.parent);
    const parentBase = automatic.get(node.parent);
    const shift = movement?.node === node ? movement : undefined;
    const free = node.parent === null && node.pos;
    positions.set(node.id, node.fixed ?? {
      x: (free ? node.pos.x : base.x + (parent ? parent.x - parentBase.x : 0)) + (node.offset?.x ?? 0) + (shift?.dx ?? 0),
      y: (free ? node.pos.y : base.y + (parent ? parent.y - parentBase.y : 0)) + (node.offset?.y ?? 0) + (shift?.dy ?? 0),
    });
  }
  return positions;
}

function visibleEnd(map, id) {
  const byId = new Map(map.nodes.map((node) => [node.id, node]));
  let current = byId.get(id);
  let hidden = false;
  while (current && !placement.has(current.id)) {
    current = byId.get(current.parent);
    hidden = true;
  }
  return current ? { id: current.id, hidden } : undefined;
}

function sidePoint(center, size, side, offset = 4) {
  if (side === "top") return { x: center.x, y: center.y - size.h / 2 - offset };
  if (side === "bottom") return { x: center.x, y: center.y + size.h / 2 + offset };
  if (side === "left") return { x: center.x - size.w / 2 - offset, y: center.y };
  return { x: center.x + size.w / 2 + offset, y: center.y };
}

function sideNormal(side) {
  if (side === "top") return { x: 0, y: -1 };
  if (side === "bottom") return { x: 0, y: 1 };
  if (side === "left") return { x: -1, y: 0 };
  return { x: 1, y: 0 };
}

function edgePoint(from, to, size = { w: nodeWidth, h: nodeHeight }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (!dx && !dy) return { ...from };
  const scale = Math.min((size.w / 2 + 6) / Math.abs(dx || 1e-9), (size.h / 2 + 6) / Math.abs(dy || 1e-9));
  return { x: from.x + dx * Math.min(scale, 1), y: from.y + dy * Math.min(scale, 1) };
}

function bezierPoint(t, p0, p1, p2, p3) {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  return {
    x: uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x,
    y: uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y,
  };
}

function linkGeometry(link) {
  const from = link.from ? visibleEnd(activeMap, link.from) : null;
  const to = link.to ? visibleEnd(activeMap, link.to) : null;
  if (link.from && !from) return undefined;
  if (link.to && !to) return undefined;
  if (from && to && from.id === to.id) return undefined;
  const byId = new Map(activeMap.nodes.map((node) => [node.id, node]));
  const a = from ? placement.get(from.id) : link.fromPos;
  const b = to ? placement.get(to.id) : link.toPos;
  if (!a || !b) return undefined;
  const sizeA = from ? nodeSize(byId.get(from.id)) : null;
  const sizeB = to ? nodeSize(byId.get(to.id)) : null;
  const hidden = Boolean(from?.hidden || to?.hidden);
  const fromSide = sizeA && branchDirections.has(link.fromSide) ? link.fromSide : null;
  const toSide = sizeB && branchDirections.has(link.toSide) ? link.toSide : null;
  if (link.elbow) return elbowGeometry(a, b, sizeA, sizeB, fromSide, toSide, hidden);
  if (link.curved) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const autoFromSide = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "right" : "left") : (dy >= 0 ? "bottom" : "top");
    const autoToSide = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "left" : "right") : (dy >= 0 ? "top" : "bottom");
    const resolvedFromSide = sizeA ? (fromSide ?? autoFromSide) : null;
    const resolvedToSide = sizeB ? (toSide ?? autoToSide) : null;
    const start = sizeA ? sidePoint(a, sizeA, resolvedFromSide, 4) : { ...a };
    const end = sizeB ? sidePoint(b, sizeB, resolvedToSide, 6) : { ...b };
    const nFrom = resolvedFromSide ? sideNormal(resolvedFromSide) : null;
    const nTo = resolvedToSide ? sideNormal(resolvedToSide) : null;
    const bothH = (nFrom || nTo)
      ? ((!nFrom || nFrom.y === 0) && (!nTo || nTo.y === 0))
      : Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
    const bothV = (nFrom || nTo)
      ? ((!nFrom || nFrom.x === 0) && (!nTo || nTo.x === 0))
      : Math.abs(end.y - start.y) > Math.abs(end.x - start.x);
    let cp1;
    let cp2;
    if (bothH &&
        (end.x - start.x) * (nFrom ? nFrom.x : (end.x >= start.x ? 1 : -1)) >= 0 &&
        (start.x - end.x) * (nTo ? nTo.x : (start.x >= end.x ? 1 : -1)) >= 0) {
      const middle = (start.x + end.x) / 2;
      cp1 = { x: middle, y: start.y };
      cp2 = { x: middle, y: end.y };
    } else if (bothV &&
        (end.y - start.y) * (nFrom ? nFrom.y : (end.y >= start.y ? 1 : -1)) >= 0 &&
        (start.y - end.y) * (nTo ? nTo.y : (start.y >= end.y ? 1 : -1)) >= 0) {
      const middle = (start.y + end.y) / 2;
      cp1 = { x: start.x, y: middle };
      cp2 = { x: end.x, y: middle };
    } else {
      const dist = Math.hypot(end.x - start.x, end.y - start.y);
      const pull = Math.max(36, Math.min(160, dist * 0.45));
      const domH = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
      cp1 = nFrom
        ? { x: start.x + nFrom.x * pull, y: start.y + nFrom.y * pull }
        : (domH ? { x: (start.x + end.x) / 2, y: start.y } : { x: start.x, y: (start.y + end.y) / 2 });
      cp2 = nTo
        ? { x: end.x + nTo.x * pull, y: end.y + nTo.y * pull }
        : (domH ? { x: (start.x + end.x) / 2, y: end.y } : { x: end.x, y: (start.y + end.y) / 2 });
    }
    return {
      start,
      end,
      cp1,
      cp2,
      curved: true,
      hidden,
    };
  }
  return {
    start: sizeA ? (fromSide ? sidePoint(a, sizeA, fromSide, 4) : edgePoint(a, b, sizeA)) : { ...a },
    end: sizeB ? (toSide ? sidePoint(b, sizeB, toSide, 6) : edgePoint(b, a, sizeB)) : { ...b },
    hidden,
  };
}

/* "Hold" arrows: leave the card straight, turn at right angles (org-chart style)
   and arrive straight into the target. Sides are chosen so a card below and to the
   side is reached by going down and then turning into its side. */
function elbowGeometry(a, b, sizeA, sizeB, fromSide, toSide, hidden) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const halfH = ((sizeA?.h ?? 0) + (sizeB?.h ?? 0)) / 2;
  const halfW = ((sizeA?.w ?? 0) + (sizeB?.w ?? 0)) / 2;
  let autoFrom;
  let autoTo;
  if (Math.abs(dy) > halfH + 12) {
    autoFrom = dy > 0 ? "bottom" : "top";
    autoTo = Math.abs(dx) > (sizeB?.w ?? 0) / 2 + 24 ? (dx > 0 ? "left" : "right") : (dy > 0 ? "top" : "bottom");
  } else if (Math.abs(dx) > halfW + 12) {
    autoFrom = dx > 0 ? "right" : "left";
    autoTo = dx > 0 ? "left" : "right";
  } else {
    autoFrom = dy >= 0 ? "bottom" : "top";
    autoTo = dy >= 0 ? "top" : "bottom";
  }
  const sideFrom = sizeA ? (fromSide ?? autoFrom) : null;
  const sideTo = sizeB ? (toSide ?? autoTo) : null;
  const start = sizeA ? sidePoint(a, sizeA, sideFrom, 4) : { ...a };
  const end = sizeB ? sidePoint(b, sizeB, sideTo, 6) : { ...b };
  const nFrom = sideFrom ? sideNormal(sideFrom) : (Math.abs(end.x - start.x) >= Math.abs(end.y - start.y) ? { x: Math.sign(end.x - start.x) || 1, y: 0 } : { x: 0, y: Math.sign(end.y - start.y) || 1 });
  const nTo = sideTo ? sideNormal(sideTo) : { x: -nFrom.x, y: -nFrom.y };
  const stub = 18;
  const s1 = { x: start.x + nFrom.x * stub, y: start.y + nFrom.y * stub };
  const e1 = { x: end.x + nTo.x * stub, y: end.y + nTo.y * stub };
  const fromVertical = nFrom.x === 0;
  const toVertical = nTo.x === 0;
  const middle = [];
  if (fromVertical && toVertical) {
    const forward = (e1.y - s1.y) * nFrom.y >= 0;
    if (forward) {
      const midY = (start.y + end.y) / 2;
      middle.push({ x: start.x, y: midY }, { x: end.x, y: midY });
    } else {
      const midX = (s1.x + e1.x) / 2;
      middle.push(s1, { x: midX, y: s1.y }, { x: midX, y: e1.y }, e1);
    }
  } else if (!fromVertical && !toVertical) {
    const forward = (e1.x - s1.x) * nFrom.x >= 0;
    if (forward) {
      const midX = (start.x + end.x) / 2;
      middle.push({ x: midX, y: start.y }, { x: midX, y: end.y });
    } else {
      const midY = (s1.y + e1.y) / 2;
      middle.push(s1, { x: s1.x, y: midY }, { x: e1.x, y: midY }, e1);
    }
  } else if (fromVertical) {
    const corner = { x: start.x, y: end.y };
    const ok = (corner.y - start.y) * nFrom.y >= 0 && (corner.x - end.x) * nTo.x >= 0;
    if (ok) middle.push(corner);
    else middle.push(s1, { x: s1.x, y: (s1.y + e1.y) / 2 }, { x: e1.x, y: (s1.y + e1.y) / 2 }, e1);
  } else {
    const corner = { x: end.x, y: start.y };
    const ok = (corner.x - start.x) * nFrom.x >= 0 && (corner.y - end.y) * nTo.y >= 0;
    if (ok) middle.push(corner);
    else middle.push(s1, { x: (s1.x + e1.x) / 2, y: s1.y }, { x: (s1.x + e1.x) / 2, y: e1.y }, e1);
  }
  const points = [start, ...middle, end].filter((point, index, list) => {
    const previous = list[index - 1];
    return !previous || Math.hypot(point.x - previous.x, point.y - previous.y) > .5;
  }).filter((point, index, list) => {
    const previous = list[index - 1];
    const next = list[index + 1];
    if (!previous || !next) return true;
    return !((previous.x === point.x && point.x === next.x) || (previous.y === point.y && point.y === next.y));
  });
  return { start, end, points, elbow: true, hidden };
}

/* Point halfway along a polyline (for the link toolbar). */
function polylineMiddle(points) {
  const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
  let remaining = lengths.reduce((sum, value) => sum + value, 0) / 2;
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index]) {
      const ratio = lengths[index] ? remaining / lengths[index] : 0;
      return { x: points[index].x + (points[index + 1].x - points[index].x) * ratio, y: points[index].y + (points[index + 1].y - points[index].y) * ratio };
    }
    remaining -= lengths[index];
  }
  return points.at(-1);
}

function drawArrow(context, start, end, { color, width, dashed = false, curved = false, cp1, cp2, points }) {
  if (points?.length > 1) {
    const last = points.at(-2);
    const angle = Math.atan2(end.y - last.y, end.x - last.x);
    const head = 7 + width * 2;
    const tipBase = { x: end.x - Math.cos(angle) * head * .7, y: end.y - Math.sin(angle) * head * .7 };
    const path = [...points.slice(0, -1), tipBase];
    context.save();
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = width;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (dashed) context.setLineDash([6, 5]);
    context.beginPath();
    context.moveTo(path[0].x, path[0].y);
    for (let index = 1; index < path.length - 1; index++) {
      const before = Math.hypot(path[index].x - path[index - 1].x, path[index].y - path[index - 1].y);
      const after = Math.hypot(path[index + 1].x - path[index].x, path[index + 1].y - path[index].y);
      context.arcTo(path[index].x, path[index].y, path[index + 1].x, path[index + 1].y, Math.min(8, before / 2, after / 2));
    }
    context.lineTo(tipBase.x, tipBase.y);
    context.stroke();
    context.setLineDash([]);
    context.beginPath();
    context.moveTo(end.x, end.y);
    context.lineTo(end.x - head * Math.cos(angle - .42), end.y - head * Math.sin(angle - .42));
    context.lineTo(end.x - head * Math.cos(angle + .42), end.y - head * Math.sin(angle + .42));
    context.closePath();
    context.fill();
    context.restore();
    return;
  }
  const tx = curved && cp2 ? end.x - cp2.x : end.x - start.x;
  const ty = curved && cp2 ? end.y - cp2.y : end.y - start.y;
  const angle = Math.hypot(tx, ty) > 1e-2 ? Math.atan2(ty, tx) : Math.atan2(end.y - start.y, end.x - start.x);
  const head = 7 + width * 2;
  const tipBase = { x: end.x - Math.cos(angle) * head * .7, y: end.y - Math.sin(angle) * head * .7 };
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  if (dashed) context.setLineDash([6, 5]);
  context.beginPath();
  context.moveTo(start.x, start.y);
  if (curved && cp1 && cp2) context.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, tipBase.x, tipBase.y);
  else context.lineTo(tipBase.x, tipBase.y);
  context.stroke();
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(end.x, end.y);
  context.lineTo(end.x - head * Math.cos(angle - .42), end.y - head * Math.sin(angle - .42));
  context.lineTo(end.x - head * Math.cos(angle + .42), end.y - head * Math.sin(angle + .42));
  context.closePath();
  context.fill();
  context.restore();
}

function inkColor(key) {
  return inkColors[key]?.[1] ?? getComputedStyle(document.documentElement).getPropertyValue("--text").trim();
}

function strokePath(context, points) {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  if (points.length === 1) {
    context.lineTo(points[0][0] + .01, points[0][1]);
    return;
  }
  for (let index = 1; index < points.length - 1; index++) {
    const [x, y] = points[index];
    const [nx, ny] = points[index + 1];
    context.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  const last = points.at(-1);
  context.lineTo(last[0], last[1]);
}

function drawInk(width, height, pixelRatio) {
  const pixelWidth = Math.round(width * pixelRatio);
  const pixelHeight = Math.round(height * pixelRatio);
  if (inkCanvas.width !== pixelWidth) inkCanvas.width = pixelWidth;
  if (inkCanvas.height !== pixelHeight) inkCanvas.height = pixelHeight;
  const context = inkCanvas.getContext("2d");
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.translate(view.x, view.y);
  context.scale(view.scale, view.scale);
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const stroke of activeMap.strokes ?? []) {
    context.globalAlpha = stroke.tool === "marker" ? .38 : 1;
    context.strokeStyle = inkColor(stroke.color);
    context.lineWidth = stroke.width;
    strokePath(context, stroke.points);
    context.stroke();
  }
  context.globalAlpha = 1;
}

function drawPreview(preview, map) {
  const context = preview.getContext("2d");
  context.clearRect(0, 0, preview.width, preview.height);
  const points = calculateLayout(map);
  if (!points.size) return;
  const bounds = mapBounds(points, map);
  const scale = Math.min(1.8, (preview.width - 70) / bounds.width, (preview.height - 40) / bounds.height);
  const project = (point) => ({
    x: preview.width / 2 + (point.x - bounds.x) * scale,
    y: preview.height / 2 + (point.y - bounds.y) * scale,
  });
  const colors = getComputedStyle(document.documentElement);
  context.strokeStyle = colors.getPropertyValue("--map-line").trim();
  context.lineWidth = 2;
  context.beginPath();
  for (const node of map.nodes) {
    if (node.parent === null || !points.has(node.id)) continue;
    const parent = project(points.get(node.parent));
    const child = project(points.get(node.id));
    context.moveTo(parent.x, parent.y);
    context.lineTo(child.x, child.y);
  }
  context.stroke();
  context.strokeStyle = colors.getPropertyValue("--map-arrow").trim() || colors.getPropertyValue("--map-link").trim();
  context.setLineDash([5, 4]);
  context.beginPath();
  for (const link of map.links ?? []) {
    const fromRaw = link.from ? points.get(link.from) : link.fromPos;
    const toRaw = link.to ? points.get(link.to) : link.toPos;
    if (!fromRaw || !toRaw) continue;
    const from = project(fromRaw);
    const to = project(toRaw);
    context.moveTo(from.x, from.y);
    if (link.elbow) {
      if (Math.abs(to.y - from.y) >= Math.abs(to.x - from.x)) context.lineTo(from.x, to.y);
      else context.lineTo(to.x, from.y);
      context.lineTo(to.x, to.y);
    } else if (link.curved) {
      if (Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)) {
        const midX = (from.x + to.x) / 2;
        context.bezierCurveTo(midX, from.y, midX, to.y, to.x, to.y);
      } else {
        const midY = (from.y + to.y) / 2;
        context.bezierCurveTo(from.x, midY, to.x, midY, to.x, to.y);
      }
    } else {
      context.lineTo(to.x, to.y);
    }
  }
  context.stroke();
  context.setLineDash([]);
  for (const node of map.nodes) {
    if (!points.has(node.id)) continue;
    const point = project(points.get(node.id));
    const root = node.parent === null;
    context.fillStyle = colors.getPropertyValue(root ? "--text" : "--map-accent").trim();
    context.beginPath();
    context.arc(point.x, point.y, root ? 8 : 4, 0, Math.PI * 2);
    context.fill();
  }
}

function cleanCardHtml(html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = String(html ?? "");
  const out = document.createElement("div");

  function appendSanitized(target, src, hasFgAncestor) {
    if (src.nodeType === Node.TEXT_NODE) {
      target.append(document.createTextNode(src.textContent));
      return;
    }
    if (src.nodeType !== Node.ELEMENT_NODE) return;
    const tag = src.tagName.toLowerCase();
    if (tag === "br") {
      target.append(document.createElement("br"));
      return;
    }
    if (tag === "b" || tag === "strong") {
      const el = document.createElement("strong");
      for (const child of src.childNodes) appendSanitized(el, child, hasFgAncestor);
      if (el.childNodes.length) target.append(el);
      return;
    }
    if (tag === "i" || tag === "em") {
      const el = document.createElement("em");
      for (const child of src.childNodes) appendSanitized(el, child, hasFgAncestor);
      if (el.childNodes.length) target.append(el);
      return;
    }
    if (tag === "s" || tag === "strike" || tag === "del") {
      const el = document.createElement("s");
      for (const child of src.childNodes) appendSanitized(el, child, hasFgAncestor);
      if (el.childNodes.length) target.append(el);
      return;
    }
    if (tag === "span" || tag === "font") {
      const fgAttr = src.dataset?.fg;
      const colorAttr = (src.getAttribute("color") ?? src.style?.color ?? "").trim().toLowerCase().replace(/\s*,\s*/g, ", ");
      const fg = cardFgColors.has(fgAttr) ? fgAttr : fgMarkerToKey[colorAttr];
      if (fg && (fg !== "auto" || hasFgAncestor)) {
        const el = document.createElement("span");
        el.dataset.fg = fg;
        for (const child of src.childNodes) appendSanitized(el, child, true);
        if (el.childNodes.length) target.append(el);
      } else {
        for (const child of src.childNodes) appendSanitized(target, child, hasFgAncestor);
      }
      return;
    }
    const isBlock = tag === "div" || tag === "p";
    if (isBlock && target.childNodes.length && target.lastChild?.nodeName !== "BR") {
      target.append(document.createElement("br"));
    }
    for (const child of src.childNodes) appendSanitized(target, child, hasFgAncestor);
  }

  for (const child of tpl.content.childNodes) appendSanitized(out, child, false);
  while (out.lastChild?.nodeName === "BR") out.lastChild.remove();
  return out.innerHTML;
}

function cardPlainText(html) {
  const box = document.createElement("div");
  box.innerHTML = cleanCardHtml(html);
  for (const br of box.querySelectorAll("br")) br.replaceWith("\n");
  return (box.textContent ?? "").replace(/\u00a0/g, " ").trim();
}

function applyCardContent(container, node) {
  container.replaceChildren();
  if (node.titleHtml) {
    container.innerHTML = cleanCardHtml(node.titleHtml);
    return;
  }
  let target = container;
  if (node.titleBold) {
    const strong = document.createElement("strong");
    container.append(strong);
    target = strong;
  }
  if (node.titleItalic) {
    const em = document.createElement("em");
    target.append(em);
    target = em;
  }
  target.textContent = node.title;
}

function linkedNoteFor(node) {
  if (!node?.noteId || !Array.isArray(workspace?.notes)) return undefined;
  return workspace.notes.find((item) => item.id === node.noteId);
}

function layoutNodes() {
  editingNodeId = undefined;
  hideTextBubble();
  closeConnectMenu();
  placement = calculateLayout(activeMap);
  const childrenMap = new Map();
  for (const node of activeMap.nodes) {
    if (node.parent === null) continue;
    if (!childrenMap.has(node.parent)) childrenMap.set(node.parent, []);
    childrenMap.get(node.parent).push(node.id);
  }
  const countSubtree = (id) => {
    let total = 0;
    const stack = [...(childrenMap.get(id) ?? [])];
    while (stack.length) {
      const cur = stack.pop();
      total++;
      const kids = childrenMap.get(cur);
      if (kids) stack.push(...kids);
    }
    return total;
  };

  const fragment = document.createDocumentFragment();
  const sideLabels = {
    top: "Criar conexão acima",
    right: "Criar conexão à direita",
    bottom: "Criar conexão abaixo",
    left: "Criar conexão à esquerda",
  };
  for (const node of activeMap.nodes) {
    if (!placement.has(node.id)) continue;
    const topic = document.createElement("div");
    const isRoot = node.parent === null && !node.pos;
    topic.className = isRoot ? "topic is-root" : "topic";
    if (node.fixed) topic.dataset.fixed = "";
    if (node.color && node.color !== "default") topic.dataset.cardColor = node.color;

    const element = actionButton(isRoot ? "node root" : node.pos ? "node free" : "node", "select-node");
    element.dataset.id = node.id;
    if (node.image) {
      topic.classList.add("has-image");
      const picture = Object.assign(document.createElement("img"), { src: node.image, alt: node.title, draggable: false });
      element.append(picture);
    } else {
      const title = document.createElement("span");
      applyCardContent(title, node);
      element.append(title);
    }
    element.title = node.title;
    topic.append(element);

    const linkedNote = linkedNoteFor(node);
    if (linkedNote) {
      const badge = document.createElement("button");
      badge.type = "button";
      badge.className = "topic-note-badge";
      badge.dataset.action = "open-linked-note";
      badge.dataset.noteId = linkedNote.id;
      const noteName = (linkedNote.title || "").trim() || "Sem título";
      badge.title = `Abrir nota vinculada: ${noteName}`;
      badge.setAttribute("aria-label", `Abrir nota vinculada: ${noteName}`);
      badge.innerHTML = icon("note");
      topic.append(badge);
    }

    if (childrenMap.has(node.id)) {
      const toggle = actionButton("topic-control branch-toggle", "toggle-node");
      toggle.dataset.topic = node.id;
      const hiddenCount = countSubtree(node.id);
      const text = node.collapsed
        ? `Expandir ramo (${hiddenCount} ${hiddenCount === 1 ? "item oculto" : "itens ocultos"})`
        : "Recolher ramo";
      toggle.title = text;
      toggle.setAttribute("aria-label", text);
      toggle.setAttribute("aria-expanded", String(!node.collapsed));
      if (node.collapsed) toggle.textContent = `+${hiddenCount}`;
      else toggle.innerHTML = icon("minus");
      topic.append(toggle);
    }

    for (const corner of ["nw", "ne", "se", "sw"]) {
      const resize = document.createElement("button");
      resize.type = "button";
      resize.className = "topic-resize";
      resize.dataset.topic = node.id;
      resize.dataset.corner = corner;
      resize.setAttribute("aria-label", "Redimensionar card");
      topic.append(resize);
    }

    for (const side of ["top", "right", "bottom", "left"]) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "topic-dot";
      dot.dataset.topic = node.id;
      dot.dataset.side = side;
      dot.title = `${sideLabels[side]} (clique ou arraste)`;
      dot.setAttribute("aria-label", sideLabels[side]);
      dot.innerHTML = icon("arrow");
      topic.append(dot);
    }

    fragment.append(topic);
  }
  nodesLayer.replaceChildren(fragment);
  positionTopics();
  updateSelection();
  draw();
}

function positionTopics() {
  const byId = new Map(activeMap.nodes.map((node) => [node.id, node]));
  for (const topic of nodesLayer.children) {
    const id = topic.firstElementChild.dataset.id;
    const position = placement.get(id);
    const size = nodeSize(byId.get(id));
    topic.style.width = `${size.w}px`;
    topic.style.height = `${size.h}px`;
    topic.style.left = `${position.x - size.w / 2}px`;
    topic.style.top = `${position.y - size.h / 2}px`;
  }
}

function updateSelection() {
  for (const topic of nodesLayer.children) {
    const button = topic.firstElementChild;
    const selected = button.dataset.id === selectedId;
    button.setAttribute("aria-pressed", String(selected));
    topic.classList.toggle("selected", selected);
  }
  const selected = currentNode();
  const canDelete = Boolean(selected) && (selected.parent !== null ||
    activeMap.nodes.some((node) => node.parent === null && node.id !== selectedId));
  if (deleteNodeButton) deleteNodeButton.disabled = !activeMap || presenting || !canDelete;
  if (copyNodeButton) copyNodeButton.disabled = !activeMap || presenting || !selected;
  if (pasteNodeButton) pasteNodeButton.disabled = !activeMap || presenting || !clipboardBranch;
  $('[data-action="undo"]').disabled = !history.length;
  if (fixNodeButton) {
    const isFixed = Boolean(selected?.fixed);
    fixNodeButton.disabled = !activeMap || presenting || !selected;
    fixNodeButton.setAttribute("aria-pressed", String(isFixed));
    fixNodeButton.innerHTML = icon(isFixed ? "lock" : "unlock");
    const text = isFixed ? "Desafixar card selecionado" : "Fixar card selecionado";
    fixNodeButton.title = text;
    fixNodeButton.setAttribute("aria-label", text);
  }
  if (linkNoteButton) {
    const linked = linkedNoteFor(selected);
    linkNoteButton.disabled = !activeMap || presenting || !selected;
    linkNoteButton.dataset.linked = String(Boolean(linked));
    linkNoteButton.lastElementChild.textContent = linked ? "Nota vinculada" : "Vincular nota";
  }
  placeCardStyleBar();
}

function draw() {
  if (!activeMap || !viewport.clientWidth || !viewport.clientHeight) return;
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  const pixelWidth = Math.round(width * pixelRatio);
  const pixelHeight = Math.round(height * pixelRatio);
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  const context = canvas.getContext("2d");
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.translate(view.x, view.y);
  context.scale(view.scale, view.scale);
  context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--map-line").trim();
  context.lineWidth = 1.65;
  context.beginPath();
  const byId = new Map(activeMap.nodes.map((node) => [node.id, node]));
  for (const node of activeMap.nodes) {
    if (node.parent === null || !placement.has(node.id)) continue;
    const parentNode = byId.get(node.parent);
    const parent = placement.get(node.parent);
    const child = placement.get(node.id);
    const ps = nodeSize(parentNode);
    const cs = nodeSize(node);
    if (node.dir === "top" || node.dir === "bottom") {
      const direction = child.y < parent.y ? -1 : 1;
      const start = parent.y + direction * ps.h / 2;
      const end = child.y - direction * cs.h / 2;
      const middle = (start + end) / 2;
      context.moveTo(parent.x, start);
      context.bezierCurveTo(parent.x, middle, child.x, middle, child.x, end);
    } else {
      const direction = child.x < parent.x ? -1 : 1;
      const start = parent.x + direction * ps.w / 2;
      const end = child.x - direction * cs.w / 2;
      const middle = (start + end) / 2;
      context.moveTo(start, parent.y);
      context.bezierCurveTo(middle, parent.y, middle, child.y, end, child.y);
    }
  }
  context.stroke();
  const styles = getComputedStyle(document.documentElement);
  const linkColor = styles.getPropertyValue("--map-arrow").trim() || styles.getPropertyValue("--map-link").trim();
  const panelColor = styles.getPropertyValue("--panel").trim();
  let selectedGeometry;
  for (const link of activeMap.links ?? []) {
    const geometry = linkGeometry(link);
    if (!geometry) continue;
    const selected = link.id === selectedLink;
    if (selected) {
      selectedGeometry = geometry;
      context.save();
      context.globalAlpha = .18;
      drawArrow(context, geometry.start, geometry.end, {
        color: linkColor, width: 8, curved: geometry.curved, cp1: geometry.cp1, cp2: geometry.cp2, points: geometry.points,
      });
      context.restore();
    }
    drawArrow(context, geometry.start, geometry.end, {
      color: linkColor, width: selected ? 2.6 : 1.9, dashed: geometry.hidden,
      curved: geometry.curved, cp1: geometry.cp1, cp2: geometry.cp2, points: geometry.points,
    });
  }
  if (selectedGeometry && !presenting && ink.tool === "select") {
    const scaleClamp = Math.max(0.2, view.scale);
    const radius = 5.5 / scaleClamp;
    context.save();
    context.fillStyle = panelColor;
    context.strokeStyle = linkColor;
    context.lineWidth = 2 / scaleClamp;
    for (const handlePoint of [selectedGeometry.start, selectedGeometry.end]) {
      context.beginPath();
      context.arc(handlePoint.x, handlePoint.y, radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
    context.restore();
  }
  if (linkDrag?.moved) {
    const fromNode = byId.get(linkDrag.from);
    const from = placement.get(linkDrag.from);
    const fromSz = nodeSize(fromNode);
    const targetNode = linkDrag.target && byId.get(linkDrag.target);
    const target = linkDrag.target && placement.get(linkDrag.target);
    const end = target
      ? (linkDrag.targetSide ? sidePoint(target, nodeSize(targetNode), linkDrag.targetSide, 6) : edgePoint(target, from, nodeSize(targetNode)))
      : linkDrag.point;
    const start = linkDrag.fromSide ? sidePoint(from, fromSz, linkDrag.fromSide) : edgePoint(from, end, fromSz);
    drawArrow(context, start, end, { color: linkColor, width: 2, dashed: !target });
  }
  drawInk(width, height, pixelRatio);
  nodesLayer.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
  $(".zoom-value").textContent = `${Math.round(view.scale * 100)}%`;
  placeLinkToolbar();
  placeCardStyleBar();
}

function placeLinkToolbar() {
  const toolbar = $("#link-toolbar");
  const link = activeMap?.links?.find((item) => item.id === selectedLink);
  const geometry = link && linkGeometry(link);
  toolbar.hidden = !geometry || presenting || Boolean(linkEditDrag?.moved);
  if (toolbar.hidden) return;
  const mid = geometry.points ? polylineMiddle(geometry.points) : geometry.curved
    ? bezierPoint(.5, geometry.start, geometry.cp1, geometry.cp2, geometry.end)
    : { x: (geometry.start.x + geometry.end.x) / 2, y: (geometry.start.y + geometry.end.y) / 2 };
  const x = view.x + mid.x * view.scale;
  const y = view.y + mid.y * view.scale;
  const shape = link.elbow ? "hold" : link.curved ? "wave" : "straight";
  for (const button of toolbar.querySelectorAll('[data-action="link-shape"]')) {
    button.setAttribute("aria-pressed", String(button.dataset.shape === shape));
  }
  toolbar.style.left = `${Math.round(x - toolbar.offsetWidth / 2)}px`;
  toolbar.style.top = `${Math.round(y - toolbar.offsetHeight - 12)}px`;
}

function placeCardStyleBar() {
  if (!cardStyleBar) return;
  const selected = activeMap && currentNode();
  const pos = selected && placement.get(selected.id);
  const bubbleOpen = textBubble && !textBubble.hidden;
  const menuOpen = connectMenu && !connectMenu.hidden;
  const dragging = (pointer && pointer.dx !== undefined) || Boolean(resizeDrag) || Boolean(linkDrag?.moved) || Boolean(linkEditDrag?.moved);
  if (!activeMap || !selected || !pos || presenting || ink.tool !== "select" || bubbleOpen || menuOpen || dragging) {
    cardStyleBar.hidden = true;
    return;
  }
  cardStyleBar.querySelector('[data-action="card-image-remove"]').hidden = !selected.image;
  cardStyleBar.querySelector('[data-action="card-image"]').title = selected.image ? "Trocar a imagem do card" : "Colocar uma imagem no card (ou cole com Ctrl+V)";
  const activeColor = selected.color ?? "default";
  for (const swatch of cardStyleBar.querySelectorAll("[data-card-color]")) {
    swatch.setAttribute("aria-pressed", String(swatch.dataset.cardColor === activeColor));
  }
  cardStyleBar.hidden = false;
  const size = nodeSize(selected);
  const barW = cardStyleBar.offsetWidth || 246;
  const barH = cardStyleBar.offsetHeight || 34;
  const centerX = view.x + pos.x * view.scale;
  const topEdge = view.y + (pos.y - size.h / 2) * view.scale;
  const bottomEdge = view.y + (pos.y + size.h / 2) * view.scale;
  const left = Math.max(8, Math.min(viewport.clientWidth - barW - 8, Math.round(centerX - barW / 2)));
  let top = Math.round(topEdge - barH - 28);
  if (top < 8) top = Math.min(viewport.clientHeight - barH - 8, Math.round(bottomEdge + 28));
  cardStyleBar.style.left = `${left}px`;
  cardStyleBar.style.top = `${Math.max(8, top)}px`;
}

function worldPoint(event) {
  const bounds = viewport.getBoundingClientRect();
  return { x: (event.clientX - bounds.left - view.x) / view.scale, y: (event.clientY - bounds.top - view.y) / view.scale };
}

function segmentDistance(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length)) : 0;
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}

function linkAt(point) {
  let best;
  let distance = 8 / view.scale;
  for (const link of activeMap.links ?? []) {
    const geometry = linkGeometry(link);
    if (!geometry) continue;
    let gap;
    if (geometry.points) {
      gap = Infinity;
      for (let index = 1; index < geometry.points.length; index++) gap = Math.min(gap, segmentDistance(point, geometry.points[index - 1], geometry.points[index]));
    } else if (geometry.curved) {
      gap = Infinity;
      let prev = geometry.start;
      for (let step = 1; step <= 16; step++) {
        const next = bezierPoint(step / 16, geometry.start, geometry.cp1, geometry.cp2, geometry.end);
        gap = Math.min(gap, segmentDistance(point, prev, next));
        prev = next;
      }
    } else {
      gap = segmentDistance(point, geometry.start, geometry.end);
    }
    if (gap < distance) {
      distance = gap;
      best = link;
    }
  }
  return best;
}

function linkHandleAt(point) {
  if (!selectedLink || presenting || ink.tool !== "select") return undefined;
  const link = activeMap?.links?.find((item) => item.id === selectedLink);
  const geometry = link && linkGeometry(link);
  if (!geometry) return undefined;
  const reach = 12 / view.scale;
  const distEnd = Math.hypot(point.x - geometry.end.x, point.y - geometry.end.y);
  const distStart = Math.hypot(point.x - geometry.start.x, point.y - geometry.start.y);
  if (distEnd <= reach && distEnd <= distStart) return { link, end: "end", geometry };
  if (distStart <= reach) return { link, end: "start", geometry };
  return undefined;
}

function selectLink(id) {
  if (id && selectedId) {
    selectedId = undefined;
    updateSelection();
  }
  selectedLink = id;
  draw();
}

function setInkTool(tool) {
  if (!activeMap) return;
  if (tool !== "select") {
    commitInlineEdit();
    closeConnectMenu();
  }
  ink.tool = tool;
  viewport.dataset.tool = tool;
  for (const button of document.querySelectorAll("[data-ink-tool]")) {
    button.setAttribute("aria-pressed", String(button.dataset.inkTool === tool));
  }
  const drawing = Object.hasOwn(inkTools, tool);
  $("#ink-options").hidden = !drawing;
  if (drawing) {
    for (const swatch of document.querySelectorAll("[data-ink-color]")) {
      swatch.setAttribute("aria-pressed", String(swatch.dataset.inkColor === ink.color[tool]));
    }
    inkTools[tool].sizes.forEach((size, index) => {
      const button = document.querySelector(`[data-ink-size][data-step="${index + 1}"]`);
      button.dataset.inkSize = size;
      button.setAttribute("aria-pressed", String(size === ink.size[tool]));
    });
  }
  if (tool !== "select") {
    clearSnapHighlights();
    delete viewport.dataset.linkHover;
    selectLink(undefined);
  }
}

function eraseAt(point) {
  const radius = 10 / view.scale;
  const before = activeMap.strokes.length;
  const remaining = activeMap.strokes.filter((stroke) => {
    const reach = radius + stroke.width / 2;
    const points = stroke.points.map(([x, y]) => ({ x, y }));
    if (points.length === 1) return Math.hypot(point.x - points[0].x, point.y - points[0].y) > reach;
    for (let index = 1; index < points.length; index++) {
      if (segmentDistance(point, points[index - 1], points[index]) <= reach) return false;
    }
    return true;
  });
  if (remaining.length === before) return false;
  if (!inkPointer.remembered) {
    rememberMap();
    inkPointer.remembered = true;
  }
  activeMap.strokes = remaining;
  return true;
}

function mapBounds(positions, map = activeMap) {
  if (!positions.size) return { x: 0, y: 0, width: nodeWidth, height: nodeHeight };
  const byId = map ? new Map(map.nodes.map((node) => [node.id, node])) : undefined;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [id, point] of positions.entries()) {
    const size = byId ? nodeSize(byId.get(id)) : { w: nodeWidth, h: nodeHeight };
    minX = Math.min(minX, point.x - size.w / 2);
    maxX = Math.max(maxX, point.x + size.w / 2);
    minY = Math.min(minY, point.y - size.h / 2);
    maxY = Math.max(maxY, point.y + size.h / 2);
  }
  for (const link of map?.links ?? []) {
    for (const pt of [link.fromPos, link.toPos]) {
      if (!pt) continue;
      minX = Math.min(minX, pt.x - 16);
      maxX = Math.max(maxX, pt.x + 16);
      minY = Math.min(minY, pt.y - 16);
      maxY = Math.max(maxY, pt.y + 16);
    }
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function fit() {
  closeConnectMenu();
  const bounds = mapBounds(placement, activeMap);
  const inset = 56;
  const scale = Math.max(minZoom, Math.min(1, (viewport.clientWidth - 65 - inset) / bounds.width,
    (viewport.clientHeight - 90) / bounds.height));
  view = {
    x: (viewport.clientWidth + inset) / 2 - bounds.x * scale,
    y: viewport.clientHeight / 2 - bounds.y * scale,
    scale,
  };
  draw();
}

function zoom(factor, x = viewport.clientWidth / 2, y = viewport.clientHeight / 2) {
  closeConnectMenu();
  const scale = Math.max(minZoom, Math.min(2, view.scale * factor));
  const ratio = scale / view.scale;
  view = { scale, x: x - (x - view.x) * ratio, y: y - (y - view.y) * ratio };
  draw();
}

/* The map fills exactly the free space below the header: no page scroll. */
function sizeMap() {
  if (!activeMap || $("#editor").hidden) return;
  window.scrollTo(0, 0);
  const gap = presenting ? 10 : 16;
  const top = viewport.getBoundingClientRect().top;
  viewport.style.height = `${Math.max(240, Math.floor(innerHeight - top - gap - 1))}px`;
}
window.addEventListener("resize", () => sizeMap());
new ResizeObserver(() => sizeMap()).observe($(".editor-heading"));

/* Open a note by id from anywhere (tasks, projects). */
function openNoteById(id) {
  if (noteLinkDialog?.open) noteLinkDialog.close();
  commitInlineEdit();
  closeConnectMenu();
  activeMap = undefined;
  selectTool("notes", "Notas");
  if (!notes.openById(id)) notes.show();
  $("#main").focus({ preventScroll: true });
}

/* Open a map with one card selected and in view (used from notes). */
function openMapAt(mapId, nodeId) {
  const map = workspace?.maps?.find((item) => item.id === mapId);
  if (!map) return false;
  openMap(map);
  if (nodeId && map.nodes.some((item) => item.id === nodeId)) {
    selectedId = nodeId;
    renderWorkspace();
    if (placement.has(nodeId)) revealTopic(nodeId);
  }
  return true;
}

function openMap(map) {
  commitInlineEdit();
  hideTextBubble();
  closeConnectMenu();
  if (noteLinkDialog?.open) noteLinkDialog.close();
  selectTool("library", "Mapas mentais");
  history = [];
  presenting = false;
  $(".shell").classList.remove("presenting");
  updatePresentationButton();
  activeMap = map;
  if (map) {
    map.links ??= [];
    map.strokes ??= [];
  }
  linkEditDrag = undefined;
  clearSnapHighlights();
  delete viewport.dataset.movingLink;
  delete viewport.dataset.linkHover;
  selectedLink = undefined;
  selectedId = map?.nodes[0].id;
  renderWorkspace();
  if (map) {
    setInkTool("select");
    sizeMap();
    fit();
  }
  $("#main").focus({ preventScroll: true });
}

function selectTool(action, title) {
  if (action !== "crm") crm.hide();
  for (const section of document.querySelectorAll("#main > section[data-module]")) section.hidden = section.id !== action;
  if (action !== "library") $("#library").hidden = $("#editor").hidden = true;
  const crumb = $("#tool-crumb");
  crumb.dataset.action = action;
  crumb.textContent = title;
  const group = typeof kit === "undefined" ? undefined : kit.groupOf(action);
  if (group) kit.rememberGroup(group, action);
  for (const button of document.querySelectorAll(".nav-tool")) {
    if (button.dataset.action === action || button.dataset.action === group) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  }
  for (const tab of document.querySelectorAll("[data-group-tab]")) tab.setAttribute("aria-pressed", String(tab.dataset.groupTab === action));
}

function showEditor({ title, value = "", confirm }, save) {
  dialogSave = save;
  $("#dialog-title").textContent = title;
  $("#title-field").hidden = Boolean(confirm);
  form.elements.title.disabled = Boolean(confirm);
  form.elements.title.value = value;
  form.elements.title.setCustomValidity("");
  $("#confirm-text").hidden = !confirm;
  $("#confirm-text").textContent = confirm ?? "";
  $("#dialog-confirm").textContent = confirm ? "Excluir" : "Concluir";
  $("#dialog-confirm").classList.toggle("danger", Boolean(confirm));
  dialog.showModal();
  if (confirm) $('[data-action="close-dialog"].button').focus();
  else {
    form.elements.title.focus();
    form.elements.title.select();
  }
}

const currentNode = () => activeMap?.nodes.find((node) => node.id === selectedId);

function revealTopic(id) {
  const point = placement.get(id);
  const node = activeMap?.nodes.find((item) => item.id === id);
  const size = nodeSize(node);
  const x = view.x + point.x * view.scale;
  const y = view.y + point.y * view.scale;
  const marginX = Math.max(size.w * view.scale / 2 + 24, 30);
  const marginY = Math.max(size.h * view.scale / 2 + 24, 45);
  if (x < marginX || x > viewport.clientWidth - marginX || y < marginY || y > viewport.clientHeight - marginY) {
    view.x += viewport.clientWidth / 2 - x;
    view.y += viewport.clientHeight / 2 - y;
    draw();
  }
}

function focusTopicControl(action) {
  nodesLayer.querySelector(`.topic.selected [data-action="${action}"]`)?.focus({ preventScroll: true });
}

/* Puts a picture in a card; the card takes the picture's proportions. */
function setNodeImage(id, data) {
  return new Promise((resolve) => {
    const picture = new Image();
    picture.onload = () => {
      const map = activeMap;
      const node = map?.nodes.find((item) => item.id === id);
      if (!node || !isMapImage(data)) return resolve(false);
      commitInlineEdit();
      rememberMap();
      const center = placement.get(node.id);
      node.image = data;
      node.imageRatio = Math.max(0.05, Math.min(20, picture.naturalWidth / picture.naturalHeight || 1));
      node.size = imageNodeSize(node, node.image && node.size?.w && node.imageRatio ? Math.max(160, Math.min(320, node.size.w)) : 240);
      if (node.fixed && center) node.fixed = { ...center };
      selectedId = node.id;
      stamp(map);
      changed();
      layoutNodes();
      resolve(true);
    };
    picture.onerror = () => resolve(false);
    picture.src = data;
  });
}

async function imageFromFiles(fileList) {
  const file = [...(fileList ?? [])].find((item) => /^image\//.test(item.type));
  if (!file) return undefined;
  try {
    return await kit.readImage(file, { size: 1400, max: mapImageMax });
  } catch (error) {
    kit.toast(error.message);
    return undefined;
  }
}

document.addEventListener("paste", (event) => {
  if (!activeMap || presenting || dialog.open || event.target.closest?.("input, textarea, [contenteditable]")) return;
  const files = [...(event.clipboardData?.items ?? [])].filter((item) => item.kind === "file").map((item) => item.getAsFile()).filter(Boolean);
  if (!files.some((file) => /^image\//.test(file.type))) return;
  event.preventDefault();
  const node = currentNode();
  if (!node) return kit.toast("Selecione um card para colar a imagem.");
  void imageFromFiles(files).then((data) => data && setNodeImage(node.id, data));
});

viewport.addEventListener("dragover", (event) => {
  if (!activeMap || presenting || ![...(event.dataTransfer?.types ?? [])].includes("Files")) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
});
viewport.addEventListener("drop", (event) => {
  if (!activeMap || presenting || !event.dataTransfer?.files?.length) return;
  event.preventDefault();
  const id = event.target.closest?.(".topic")?.querySelector(".node")?.dataset.id ?? currentNode()?.id;
  if (!id) return kit.toast("Solte a imagem em cima de um card.");
  void imageFromFiles(event.dataTransfer.files).then((data) => data && setNodeImage(id, data));
});

function rememberMap() {
  if (!activeMap) return;
  history.push({ map: structuredClone(activeMap), selection: selectedId });
  if (history.length > 24) history.shift();
}

function stamp(map) {
  if (map) map.updatedAt = new Date().toISOString();
}

function updatePresentationButton() {
  const control = $("#presentation-toggle");
  control.setAttribute("aria-pressed", String(presenting));
  control.lastElementChild.textContent = presenting ? "Sair da apresentação" : "Apresentar";
  mapTitle.readOnly = presenting;
}

function setPresentation(enabled) {
  if (enabled) {
    commitInlineEdit();
    hideTextBubble();
    closeConnectMenu();
    if (noteLinkDialog?.open) noteLinkDialog.close();
  }
  presenting = enabled;
  $(".shell").classList.toggle("presenting", enabled);
  updatePresentationButton();
  sizeMap();
  fit();
  viewport.focus({ preventScroll: true });
}

function topicElement(id) {
  return nodesLayer.querySelector(`.node[data-id="${CSS.escape(id)}"]`)?.closest(".topic");
}

function activeCardInput() {
  return editingNodeId ? topicElement(editingNodeId)?.querySelector(".node-inline-input") : null;
}

function selectionInsideCard(input) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (!input.contains(range.commonAncestorContainer)) return null;
  if (!range.toString().trim().length) return null;
  return range;
}

function activeCardFgColor(range, input) {
  let node = range.commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  while (node && node !== input) {
    if (node.dataset?.fg && cardFgColors.has(node.dataset.fg)) return node.dataset.fg;
    node = node.parentElement;
  }
  let probe = range.startContainer;
  if (probe.nodeType === Node.ELEMENT_NODE && range.startOffset < probe.childNodes.length) {
    const child = probe.childNodes[range.startOffset];
    if (child?.nodeType === Node.ELEMENT_NODE && child.dataset?.fg && cardFgColors.has(child.dataset.fg)) {
      return child.dataset.fg;
    }
  }
  if (probe.nodeType === Node.TEXT_NODE) probe = probe.parentElement;
  while (probe && probe !== input) {
    if (probe.dataset?.fg && cardFgColors.has(probe.dataset.fg)) return probe.dataset.fg;
    probe = probe.parentElement;
  }
  return "auto";
}

function ensureCardSelection(input) {
  const live = selectionInsideCard(input);
  if (live) {
    savedCardRange = live.cloneRange();
    return live;
  }
  if (savedCardRange && input.contains(savedCardRange.commonAncestorContainer) &&
      !savedCardRange.collapsed && savedCardRange.toString().trim().length) {
    const sel = window.getSelection();
    const restored = savedCardRange.cloneRange();
    sel.removeAllRanges();
    sel.addRange(restored);
    return restored;
  }
  return null;
}

function hideTextBubble() {
  savedCardRange = undefined;
  if (!textBubble || textBubble.hidden) return;
  textBubble.hidden = true;
  placeCardStyleBar();
}

function updateTextBubble() {
  bubbleFrame = undefined;
  if (!textBubble) return;
  const input = activeCardInput();
  const range = input ? selectionInsideCard(input) : null;
  if (!input || !range || presenting || ink.tool !== "select") {
    hideTextBubble();
    return;
  }
  savedCardRange = range.cloneRange();
  for (const button of textBubble.querySelectorAll("[data-card-inline]")) {
    const cmd = button.dataset.cardInline;
    button.setAttribute("aria-pressed", cmd === "normal" ? "false" : String(document.queryCommandState(cmd)));
  }
  const currentFg = activeCardFgColor(range, input);
  for (const swatch of textBubble.querySelectorAll("[data-card-fg]")) {
    swatch.setAttribute("aria-pressed", String(swatch.dataset.cardFg === currentFg));
  }
  textBubble.hidden = false;
  placeCardStyleBar();
  const rects = range.getClientRects();
  const first = rects[0] ?? range.getBoundingClientRect();
  const box = range.getBoundingClientRect();
  const width = textBubble.offsetWidth || 280;
  const height = textBubble.offsetHeight || 38;
  const left = Math.max(10, Math.min(box.left + box.width / 2 - width / 2, window.innerWidth - width - 10));
  let top = first.top - height - 10;
  if (top < 64) top = box.bottom + 10;
  textBubble.style.left = `${Math.round(left)}px`;
  textBubble.style.top = `${Math.round(top)}px`;
}

function queueTextBubble() {
  if (!bubbleFrame) bubbleFrame = requestAnimationFrame(updateTextBubble);
}

function normalizeFontTags(input, selectTouched = false) {
  const nodes = Array.from(input.querySelectorAll("font, span[style]"));
  const replacements = [];
  for (const node of nodes) {
    if (!node.isConnected) continue;
    const rawColor = (node.getAttribute("color") || node.style?.color || "").trim().toLowerCase().replace(/\s*,\s*/g, ", ");
    const fg = fgMarkerToKey[rawColor];
    const hasFgParent = Boolean(node.parentElement?.closest("[data-fg]"));
    if (fg && (fg !== "auto" || hasFgParent)) {
      const span = document.createElement("span");
      span.dataset.fg = fg;
      span.append(...node.childNodes);
      for (const nested of span.querySelectorAll("[data-fg]")) {
        nested.replaceWith(...nested.childNodes);
      }
      node.replaceWith(span);
      replacements.push(span);
    } else if (node.tagName === "FONT" || rawColor) {
      const children = Array.from(node.childNodes);
      node.replaceWith(...children);
      replacements.push(...children);
    } else {
      node.removeAttribute("style");
    }
  }
  if (selectTouched && replacements.length) {
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStartBefore(replacements[0]);
    range.setEndAfter(replacements.at(-1));
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function applyCardInline(kind) {
  const input = activeCardInput();
  if (!input) return;
  const range = ensureCardSelection(input);
  if (!range) return;
  input.focus({ preventScroll: true });
  ensureCardSelection(input);
  if (kind === "normal") {
    document.execCommand("removeFormat", false);
    document.execCommand("styleWithCSS", false, false);
    document.execCommand("foreColor", false, fgKeyToMarker.auto);
    normalizeFontTags(input, true);
  } else {
    document.execCommand(kind, false);
  }
  const nextRange = selectionInsideCard(input);
  if (nextRange) savedCardRange = nextRange.cloneRange();
  queueTextBubble();
}

function applyCardFg(fg) {
  const input = activeCardInput();
  if (!input || !cardFgColors.has(fg)) return;
  const range = ensureCardSelection(input);
  if (!range) return;
  input.focus({ preventScroll: true });
  ensureCardSelection(input);
  document.execCommand("styleWithCSS", false, false);
  document.execCommand("foreColor", false, fgKeyToMarker[fg]);
  normalizeFontTags(input, true);
  const nextRange = selectionInsideCard(input);
  if (nextRange) savedCardRange = nextRange.cloneRange();
  queueTextBubble();
}

function selectAllContents(element) {
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  sel.removeAllRanges();
  sel.addRange(range);
}

function collapseToEnd(element) {
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function startInlineEdit(id, { selectAll = false, initialChar = "" } = {}) {
  if (presenting || !activeMap || ink.tool !== "select") return;
  if (activeMap.nodes.find((item) => item.id === id)?.image) return;
  closeConnectMenu();
  if (editingNodeId === id) {
    const existing = topicElement(id)?.querySelector(".node-inline-input");
    existing?.focus({ preventScroll: true });
    if (initialChar && existing) document.execCommand("insertText", false, initialChar);
    return;
  }
  commitInlineEdit();
  const node = activeMap.nodes.find((item) => item.id === id);
  const topic = topicElement(id);
  if (!node || !topic) return;
  const input = document.createElement("div");
  input.className = "node-inline-input";
  input.contentEditable = "true";
  input.setAttribute("role", "textbox");
  input.setAttribute("aria-label", "Texto do card");
  input.setAttribute("aria-multiline", "true");
  input.spellcheck = true;
  applyCardContent(input, node);
  editingNodeId = id;
  topic.classList.add("editing");
  input.addEventListener("keydown", (event) => {
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      commitInlineEdit();
      viewport.focus({ preventScroll: true });
    } else if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      document.execCommand("insertLineBreak");
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelInlineEdit();
      viewport.focus({ preventScroll: true });
    } else if (mod && key === "b") {
      event.preventDefault();
      applyCardInline("bold");
    } else if (mod && key === "i") {
      event.preventDefault();
      applyCardInline("italic");
    } else if (mod && event.shiftKey && key === "x") {
      event.preventDefault();
      applyCardInline("strikeThrough");
    }
  });
  input.addEventListener("paste", (event) => {
    event.preventDefault();
    const text = (event.clipboardData?.getData("text/plain") ?? "").replace(/\r\n?/g, "\n");
    document.execCommand("insertText", false, text);
  });
  input.addEventListener("input", () => queueTextBubble());
  input.addEventListener("keyup", () => queueTextBubble());
  input.addEventListener("mouseup", () => queueTextBubble());
  input.addEventListener("blur", (event) => {
    if (event.relatedTarget?.closest?.("#text-bubble, #card-style-bar, .ink-toolbar")) return;
    commitInlineEdit();
  });
  topic.append(input);
  input.focus({ preventScroll: true });
  const isDefault = node.title === "Novo tópico" || node.title === "Ideia central";
  if (selectAll || (isDefault && !initialChar)) {
    selectAllContents(input);
  } else if (initialChar) {
    if (isDefault) input.replaceChildren();
    collapseToEnd(input);
    document.execCommand("insertText", false, initialChar);
  } else {
    collapseToEnd(input);
  }
  queueTextBubble();
}

function commitInlineEdit() {
  if (!editingNodeId) return;
  const id = editingNodeId;
  editingNodeId = undefined;
  hideTextBubble();
  const topic = topicElement(id);
  const input = topic?.querySelector(".node-inline-input");
  if (!input) return;
  const rawHtml = input.innerHTML;
  input.remove();
  topic.classList.remove("editing");
  const nextHtml = cleanCardHtml(rawHtml);
  const nextTitle = cardPlainText(nextHtml).slice(0, 400);
  const node = activeMap?.nodes.find((item) => item.id === id);
  const prevHtml = node ? (node.titleHtml ?? "") : "";
  const hasFormatting = /<(strong|em|s|br|span)\b/i.test(nextHtml);
  const canonicalHtml = hasFormatting ? nextHtml : "";
  if (node && nextTitle && (nextTitle !== node.title || canonicalHtml !== prevHtml)) {
    rememberMap();
    node.title = nextTitle;
    if (canonicalHtml) node.titleHtml = canonicalHtml;
    else delete node.titleHtml;
    delete node.titleBold;
    delete node.titleItalic;
    const button = topic.querySelector(".node");
    const span = button?.querySelector("span");
    if (span) applyCardContent(span, node);
    if (button) button.title = nextTitle;
    stamp(activeMap);
    changed();
    $('[data-action="undo"]').disabled = !history.length;
  }
  placeCardStyleBar();
}

function cancelInlineEdit() {
  if (!editingNodeId) return;
  const topic = topicElement(editingNodeId);
  editingNodeId = undefined;
  hideTextBubble();
  topic?.classList.remove("editing");
  topic?.querySelector(".node-inline-input")?.remove();
  placeCardStyleBar();
}

function closeConnectMenu() {
  if (!connectMenu || connectMenu.hidden) {
    connectMenuTarget = undefined;
    return;
  }
  connectMenu.hidden = true;
  connectMenuTarget = undefined;
  for (const dot of nodesLayer.querySelectorAll('.topic-dot[aria-expanded="true"]')) {
    dot.removeAttribute("aria-expanded");
  }
  placeCardStyleBar();
}

function openConnectMenu(nodeId, side, dotEl, dropPoint = null) {
  if (presenting || !activeMap || ink.tool !== "select") return;
  commitInlineEdit();
  connectMenuTarget = { nodeId, side, dropPoint };
  for (const dot of nodesLayer.querySelectorAll('.topic-dot[aria-expanded="true"]')) {
    dot.removeAttribute("aria-expanded");
  }
  dotEl?.setAttribute("aria-expanded", "true");
  const atLimit = activeMap.nodes.length >= nodeLimit;
  for (const option of connectMenu.querySelectorAll(".connect-option")) option.disabled = atLimit;
  connectMenu.hidden = false;
  placeCardStyleBar();
  connectMenu.querySelector(".connect-option:not(:disabled)")?.focus({ preventScroll: true });
}

function findFreeSlot(fromPos, fromSz, side) {
  const stepX = side === "right" ? 1 : side === "left" ? -1 : 0;
  const stepY = side === "bottom" ? 1 : side === "top" ? -1 : 0;
  const baseX = fromPos.x + stepX * (fromSz.w / 2 + 76 + nodeWidth / 2);
  const baseY = fromPos.y + stepY * (fromSz.h / 2 + 64 + nodeHeight / 2);
  const byId = new Map(activeMap.nodes.map((node) => [node.id, node]));
  const collides = (cx, cy) => {
    for (const [id, pos] of placement.entries()) {
      const sz = nodeSize(byId.get(id));
      if (Math.abs(pos.x - cx) < (sz.w + nodeWidth) / 2 + 16 &&
          Math.abs(pos.y - cy) < (sz.h + nodeHeight) / 2 + 16) return true;
    }
    return false;
  };
  for (let i = 0; i < 12; i++) {
    const offset = i === 0 ? 0 : (i % 2 === 1 ? Math.ceil(i / 2) : -Math.ceil(i / 2));
    const x = Math.round(baseX + (stepX === 0 ? offset * (nodeWidth + 24) : 0));
    const y = Math.round(baseY + (stepY === 0 ? offset * rowGap : 0));
    if (!collides(x, y)) return { x, y };
  }
  return { x: Math.round(baseX), y: Math.round(baseY) };
}

function createConnectedTopic(fromNode, side, kind, dropPoint = null) {
  if (!activeMap || presenting || !fromNode || activeMap.nodes.length >= nodeLimit) return;
  rememberMap();
  const newId = crypto.randomUUID();
  if (kind === "branch") {
    delete fromNode.collapsed;
    const newNode = { id: newId, parent: fromNode.id, title: "Novo tópico", note: "" };
    if (side !== "right") newNode.dir = side;
    activeMap.nodes.push(newNode);
  } else {
    const pos = dropPoint ?? findFreeSlot(placement.get(fromNode.id), nodeSize(fromNode), side);
    const newNode = { id: newId, parent: null, title: "Novo tópico", note: "", pos };
    activeMap.nodes.push(newNode);
    activeMap.links.push({ id: crypto.randomUUID(), from: fromNode.id, to: newId, fromSide: side });
  }
  selectedId = newId;
  stamp(activeMap);
  renderWorkspace();
  revealTopic(newId);
  changed();
  startInlineEdit(newId, { selectAll: true });
}

function renderNoteLinkDialog() {
  if (!noteLinkDialog) return;
  const node = currentNode();
  const linked = linkedNoteFor(node);
  noteLinkCurrent.replaceChildren();
  noteLinkCurrent.hidden = !linked;
  if (linked) {
    const titleEl = document.createElement("strong");
    titleEl.textContent = (linked.title || "").trim() || "Sem título";
    const acts = document.createElement("div");
    acts.className = "note-link-current-actions";
    const openBtn = actionButton("button primary", "open-linked-note", "Abrir nota");
    openBtn.dataset.noteId = linked.id;
    const unlinkBtn = actionButton("button", "unlink-note", "Desvincular");
    acts.append(openBtn, unlinkBtn);
    noteLinkCurrent.append(titleEl, acts);
  }
  const query = (noteLinkSearch?.value ?? "").trim().toLowerCase();
  const allNotes = (workspace?.notes ?? [])
    .slice()
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .filter((item) => !query || `${item.title ?? ""} ${item.subtitle ?? ""}`.toLowerCase().includes(query));
  noteLinkList.replaceChildren();
  if (!allNotes.length) {
    const empty = document.createElement("p");
    empty.className = "note-link-empty";
    empty.textContent = query ? "Nenhuma nota encontrada." : "Você ainda não criou notas. Use o botão acima para criar e vincular.";
    noteLinkList.append(empty);
    return;
  }
  for (const item of allNotes) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "note-link-item";
    btn.dataset.action = "select-linked-note";
    btn.dataset.noteId = item.id;
    btn.setAttribute("aria-pressed", String(linked?.id === item.id));
    const name = document.createElement("span");
    name.textContent = (item.title || "").trim() || "Sem título";
    const date = document.createElement("small");
    date.textContent = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("pt-BR") : "";
    btn.append(name, date);
    noteLinkList.append(btn);
  }
}

const actions = {
  library: () => { if (workspace) openMap(undefined); },
  reload: reloadToolkit,
  today: () => {
    if (!workspace) return;
    commitInlineEdit();
    hideTextBubble();
    closeConnectMenu();
    if (noteLinkDialog?.open) noteLinkDialog.close();
    activeMap = undefined;
    selectTool("today", "Hoje");
    today.show();
    $("#main").focus();
  },
  crm: () => {
    if (!workspace) return;
    commitInlineEdit();
    hideTextBubble();
    closeConnectMenu();
    if (noteLinkDialog?.open) noteLinkDialog.close();
    activeMap = undefined;
    selectTool("crm", "Networking");
    crm.show();
    $("#main").focus();
  },
  notes: () => {
    if (!workspace) return;
    commitInlineEdit();
    hideTextBubble();
    closeConnectMenu();
    if (noteLinkDialog?.open) noteLinkDialog.close();
    activeMap = undefined;
    selectTool("notes", "Notas");
    notes.show();
    $("#main").focus();
  },
  sidebar: (button) => {
    const collapsed = $(".shell").classList.toggle("collapsed");
    const label = collapsed ? "Expandir menu" : "Recolher menu";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-expanded", String(!collapsed));
  },
  discreet: () => {
    if (!workspace) return;
    workspace.settings ??= {};
    workspace.settings.discreet = !workspace.settings.discreet;
    applyDiscreet();
    changed();
    if (workspace.settings.discreet && kit.isOpen("nucleus")) actions.today();
    else for (const name of ["today", "nucleus"]) if (kit.isOpen(name)) actions[name]();
  },
  theme: () => {
    const dark = document.documentElement.dataset.theme !== "dark";
    applyTheme(dark);
    if (workspace) {
      workspace.theme = dark ? "dark" : "light";
      changed();
    }
  },
  retry: () => { if (workspace) void persist(); else void initialize(); },
  "open-map": (button) => openMap(workspace.maps.find((map) => map.id === button.dataset.id)),
  "new-map": () => showEditor({ title: "Novo mapa" }, (title) => {
    const root = { id: crypto.randomUUID(), parent: null, title: "Ideia central", note: "" };
    const map = { id: crypto.randomUUID(), title, nodes: [root] };
    workspace.maps.unshift(map);
    openMap(map);
  }),
  "duplicate-map": (button) => {
    const original = workspace.maps.find((map) => map.id === button.dataset.id);
    if (!original) return;
    const map = structuredClone(original);
    map.id = crypto.randomUUID();
    map.title = `${Array.from(original.title).slice(0, 72).join("")} (cópia)`;
    const ids = new Map(map.nodes.map(({ id }) => [id, crypto.randomUUID()]));
    for (const node of map.nodes) {
      node.id = ids.get(node.id);
      if (node.parent !== null) node.parent = ids.get(node.parent) ?? null;
    }
    for (const link of map.links ?? []) {
      Object.assign(link, {
        id: crypto.randomUUID(),
        from: link.from ? (ids.get(link.from) ?? null) : null,
        to: link.to ? (ids.get(link.to) ?? null) : null,
      });
    }
    for (const stroke of map.strokes ?? []) stroke.id = crypto.randomUUID();
    stamp(map);
    workspace.maps.unshift(map);
    renderWorkspace();
    $("#map-library .map-card-open")?.focus();
    changed();
  },
  "delete-map": (button) => {
    const map = workspace.maps.find((item) => item.id === button.dataset.id);
    if (!map) return;
    showEditor({ title: "Excluir mapa", confirm: `Excluir “${map.title}” e todos os seus tópicos?` }, () => {
      workspace.maps = workspace.maps.filter((item) => item !== map);
      openMap(undefined);
    });
  },
  undo: () => {
    if (presenting) return;
    commitInlineEdit();
    hideTextBubble();
    closeConnectMenu();
    const previous = history.pop();
    if (!previous) return;
    Object.assign(activeMap, previous.map);
    selectedId = previous.selection;
    selectedLink = undefined;
    stamp(activeMap);
    renderWorkspace();
    changed();
  },
  present: () => setPresentation(!presenting),
  "select-node": (button) => {
    if (ink.tool !== "select") return;
    closeConnectMenu();
    const id = button.dataset.id;
    const wasSelected = selectedId === id;
    if (!wasSelected) {
      commitInlineEdit();
      selectedId = id;
      updateSelection();
      viewport.focus({ preventScroll: true });
      return;
    }
    if (!presenting) startInlineEdit(id);
  },
  "copy-node": () => {
    commitInlineEdit();
    closeConnectMenu();
    const node = currentNode();
    if (!node || presenting || !activeMap) return;
    const childrenByParent = new Map();
    for (const item of activeMap.nodes) {
      if (item.parent === null) continue;
      if (!childrenByParent.has(item.parent)) childrenByParent.set(item.parent, []);
      childrenByParent.get(item.parent).push(item);
    }
    const included = new Set();
    const subtree = [];
    const queue = [node];
    while (queue.length) {
      const current = queue.shift();
      if (included.has(current.id)) continue;
      included.add(current.id);
      subtree.push(structuredClone(current));
      for (const child of childrenByParent.get(current.id) ?? []) queue.push(child);
    }
    const internalLinks = (activeMap.links ?? [])
      .filter((link) => included.has(link.from) && included.has(link.to))
      .map((link) => structuredClone(link));
    const origin = placement.get(node.id) ?? { x: 0, y: 0 };
    clipboardBranch = {
      sourceId: node.id,
      sourceParentId: node.parent,
      sourceDir: node.dir,
      wasChild: node.parent !== null,
      origin: { x: Math.round(origin.x), y: Math.round(origin.y) },
      nodes: subtree,
      links: internalLinks,
      pasteCount: 0,
      lastPastedRootId: undefined,
    };
    updateSelection();
  },
  "paste-node": () => {
    commitInlineEdit();
    closeConnectMenu();
    if (!clipboardBranch || !activeMap || presenting) return;
    if (activeMap.nodes.length + clipboardBranch.nodes.length > nodeLimit) return;
    rememberMap();
    const idMap = new Map(clipboardBranch.nodes.map((item) => [item.id, crypto.randomUUID()]));
    const newRootId = idMap.get(clipboardBranch.nodes[0].id);
    const selected = currentNode();
    clipboardBranch.pasteCount++;

    let attachParent = null;
    let attachDir;
    let freePos;
    if (selected && selected.id !== clipboardBranch.sourceId && selected.id !== clipboardBranch.lastPastedRootId) {
      attachParent = selected.id;
      delete selected.collapsed;
      attachDir = "right";
    } else if (clipboardBranch.wasChild && activeMap.nodes.some((item) => item.id === clipboardBranch.sourceParentId)) {
      attachParent = clipboardBranch.sourceParentId;
      const parentNode = activeMap.nodes.find((item) => item.id === attachParent);
      if (parentNode) delete parentNode.collapsed;
      attachDir = clipboardBranch.sourceDir;
    } else {
      const hasOriginOnMap = activeMap.nodes.some((item) => item.id === clipboardBranch.sourceId);
      const base = hasOriginOnMap
        ? clipboardBranch.origin
        : {
            x: Math.round((viewport.clientWidth / 2 - view.x) / view.scale),
            y: Math.round((viewport.clientHeight / 2 - view.y) / view.scale),
          };
      const step = hasOriginOnMap ? clipboardBranch.pasteCount : clipboardBranch.pasteCount - 1;
      freePos = { x: base.x + step * 34, y: base.y + step * 34 };
    }

    for (const [index, src] of clipboardBranch.nodes.entries()) {
      const copy = structuredClone(src);
      copy.id = idMap.get(src.id);
      delete copy.fixed;
      if (copy.titleHtml) copy.titleHtml = cleanCardHtml(copy.titleHtml);
      if (index === 0) {
        copy.parent = attachParent;
        delete copy.offset;
        if (attachParent !== null) {
          delete copy.pos;
          if (attachDir && attachDir !== "right") copy.dir = attachDir;
          else delete copy.dir;
        } else {
          copy.pos = freePos;
          delete copy.dir;
        }
      } else {
        copy.parent = idMap.get(src.parent);
      }
      activeMap.nodes.push(copy);
    }
    for (const link of clipboardBranch.links) {
      activeMap.links.push({
        ...structuredClone(link),
        id: crypto.randomUUID(),
        from: idMap.get(link.from),
        to: idMap.get(link.to),
      });
    }
    clipboardBranch.lastPastedRootId = newRootId;
    selectedId = newRootId;
    stamp(activeMap);
    renderWorkspace();
    revealTopic(newRootId);
    changed();
    viewport.focus({ preventScroll: true });
  },
  "add-node": (button) => {
    if (!activeMap || presenting) return;
    if (button?.dataset.topic) selectedId = button.dataset.topic;
    createConnectedTopic(currentNode(), "right", "branch");
  },
  "connect-choice": (button) => {
    if (!connectMenuTarget || !activeMap || presenting || activeMap.nodes.length >= nodeLimit) return;
    const { nodeId, side, dropPoint } = connectMenuTarget;
    const kind = button.dataset.kind;
    closeConnectMenu();
    const fromNode = activeMap.nodes.find((item) => item.id === nodeId);
    if (!fromNode) return;
    createConnectedTopic(fromNode, side, kind, kind === "link" ? dropPoint : null);
  },
  "connect-cancel": () => {
    closeConnectMenu();
    viewport.focus({ preventScroll: true });
  },
  "card-color": (button) => {
    if (presenting || !activeMap) return;
    const node = currentNode();
    if (!node) return;
    const color = button.dataset.cardColor;
    if (!cardColors.has(color)) return;
    const current = node.color ?? "default";
    if (current === color) return;
    rememberMap();
    if (color === "default") delete node.color;
    else node.color = color;
    const topic = topicElement(node.id);
    if (topic) {
      if (node.color) topic.dataset.cardColor = node.color;
      else delete topic.dataset.cardColor;
    }
    stamp(activeMap);
    changed();
    $('[data-action="undo"]').disabled = !history.length;
    placeCardStyleBar();
  },
  "card-image": () => {
    if (presenting || !activeMap) return;
    const node = currentNode();
    if (!node) return;
    kit.pickImage({ size: 1400, max: mapImageMax }).then((data) => { if (data) void setNodeImage(node.id, data); });
  },
  "card-image-remove": () => {
    if (presenting || !activeMap) return;
    const node = currentNode();
    if (!node?.image) return;
    rememberMap();
    delete node.image;
    delete node.imageRatio;
    delete node.size;
    stamp(activeMap);
    changed();
    layoutNodes();
  },
  "link-note-dialog": () => {
    if (presenting || !activeMap || !currentNode()) return;
    commitInlineEdit();
    closeConnectMenu();
    if (noteLinkSearch) noteLinkSearch.value = "";
    renderNoteLinkDialog();
    noteLinkDialog.showModal();
  },
  "close-note-dialog": () => noteLinkDialog?.close(),
  "create-linked-note": () => {
    const node = currentNode();
    if (!node) return;
    const noteTitle = Array.from(node.title || "").slice(0, 160).join("") || "Sem título";
    const created = notes.createNoteRecord(noteTitle);
    rememberMap();
    node.noteId = created.id;
    stamp(activeMap);
    layoutNodes();
    changed();
    renderNoteLinkDialog();
    noteLinkCurrent.querySelector('[data-action="open-linked-note"]')?.focus();
  },
  "select-linked-note": (button) => {
    const node = currentNode();
    const noteId = button.dataset.noteId;
    if (!node || !noteId || !workspace?.notes?.some((item) => item.id === noteId)) return;
    if (node.noteId !== noteId) {
      rememberMap();
      node.noteId = noteId;
      stamp(activeMap);
      layoutNodes();
      changed();
    }
    noteLinkDialog?.close();
  },
  "unlink-note": () => {
    const node = currentNode();
    if (!node || !node.noteId) return;
    rememberMap();
    delete node.noteId;
    stamp(activeMap);
    layoutNodes();
    changed();
    renderNoteLinkDialog();
  },
  "open-linked-note": (button) => {
    const id = button?.dataset.noteId || currentNode()?.noteId;
    if (!id) return;
    if (noteLinkDialog?.open) noteLinkDialog.close();
    commitInlineEdit();
    closeConnectMenu();
    activeMap = undefined;
    selectTool("notes", "Notas");
    if (!notes.openById(id)) notes.show();
    $("#main").focus();
  },
  "toggle-node": (button) => {
    commitInlineEdit();
    closeConnectMenu();
    rememberMap();
    selectedId = button.dataset.topic;
    const node = currentNode();
    if (!node) return;
    const before = placement.get(node.id);
    node.collapsed = !node.collapsed;
    layoutNodes();
    const after = placement.get(node.id);
    view.x += (before.x - after.x) * view.scale;
    view.y += (before.y - after.y) * view.scale;
    draw();
    focusTopicControl("toggle-node");
    stamp(activeMap);
    changed();
  },
  "fix-node": () => {
    if (presenting || !activeMap) return;
    commitInlineEdit();
    closeConnectMenu();
    const node = currentNode();
    if (!node) return;
    rememberMap();
    const point = placement.get(node.id);
    if (node.fixed) {
      delete node.fixed;
      const movable = calculateLayout(activeMap).get(node.id);
      node.offset = {
        x: (node.offset?.x ?? 0) + point.x - movable.x,
        y: (node.offset?.y ?? 0) + point.y - movable.y,
      };
    } else node.fixed = { ...point };
    layoutNodes();
    stamp(activeMap);
    changed();
  },
  "delete-node": () => {
    commitInlineEdit();
    hideTextBubble();
    closeConnectMenu();
    const node = currentNode();
    if (!node || presenting) return;
    if (node.parent === null && !activeMap.nodes.some((item) => item.parent === null && item !== node)) return;
    rememberMap();
    const childrenByParent = new Map();
    for (const item of activeMap.nodes) {
      if (item.parent === null) continue;
      if (!childrenByParent.has(item.parent)) childrenByParent.set(item.parent, []);
      childrenByParent.get(item.parent).push(item.id);
    }
    const removed = new Set([node.id]);
    const stack = [node.id];
    while (stack.length) {
      const currentId = stack.pop();
      for (const childId of childrenByParent.get(currentId) ?? []) {
        if (!removed.has(childId)) {
          removed.add(childId);
          stack.push(childId);
        }
      }
    }
    activeMap.nodes = activeMap.nodes.filter((item) => !removed.has(item.id));
    activeMap.links = (activeMap.links ?? []).filter((link) => !removed.has(link.from) && !removed.has(link.to));
    if (selectedLink && !activeMap.links.some((link) => link.id === selectedLink)) selectedLink = undefined;
    selectedId = node.parent ?? activeMap.nodes[0]?.id;
    stamp(activeMap);
    renderWorkspace();
    changed();
    viewport.focus({ preventScroll: true });
  },
  "link-node": () => {},
  "link-shape": (button) => {
    const link = activeMap?.links.find((item) => item.id === selectedLink);
    const shape = button?.dataset.shape;
    if (!link || !shape) return;
    rememberMap();
    delete link.curved;
    delete link.elbow;
    if (shape === "wave") link.curved = true;
    if (shape === "hold") link.elbow = true;
    stamp(activeMap);
    draw();
    placeLinkToolbar();
    changed();
  },
  "link-reverse": () => {
    const link = activeMap?.links.find((item) => item.id === selectedLink);
    if (!link) return;
    rememberMap();
    const prevFrom = link.from;
    const prevTo = link.to;
    const prevFromPos = link.fromPos;
    const prevToPos = link.toPos;
    link.from = prevTo ?? null;
    link.to = prevFrom ?? null;
    if (prevToPos) link.fromPos = prevToPos;
    else delete link.fromPos;
    if (prevFromPos) link.toPos = prevFromPos;
    else delete link.toPos;
    if (link.fromSide || link.toSide) {
      const prevFromSide = link.fromSide;
      const prevToSide = link.toSide;
      if (prevToSide) link.fromSide = prevToSide;
      else delete link.fromSide;
      if (prevFromSide) link.toSide = prevFromSide;
      else delete link.toSide;
    }
    stamp(activeMap);
    draw();
    changed();
  },
  "link-delete": () => {
    if (!activeMap?.links.some((item) => item.id === selectedLink)) return;
    rememberMap();
    activeMap.links = activeMap.links.filter((item) => item.id !== selectedLink);
    selectedLink = undefined;
    stamp(activeMap);
    draw();
    changed();
    viewport.focus();
  },
  "ink-tool": (button) => setInkTool(button.dataset.inkTool),
  "ink-color": (button) => {
    if (!Object.hasOwn(inkTools, ink.tool)) return;
    ink.color[ink.tool] = button.dataset.inkColor;
    setInkTool(ink.tool);
  },
  "ink-size": (button) => {
    if (!Object.hasOwn(inkTools, ink.tool)) return;
    ink.size[ink.tool] = Number(button.dataset.inkSize);
    setInkTool(ink.tool);
  },
  fit,
  "zoom-in": () => zoom(1.18),
  "zoom-out": () => zoom(1 / 1.18),
  "close-dialog": () => dialog.close(),
};

$(".ink-toolbar")?.addEventListener("mousedown", (event) => {
  if (event.target.closest("button")) event.preventDefault();
});

noteLinkSearch?.addEventListener("input", renderNoteLinkDialog);

cardStyleBar?.addEventListener("mousedown", (event) => {
  if (event.target.closest("button")) event.preventDefault();
});

textBubble?.addEventListener("mousedown", (event) => {
  event.preventDefault();
});

textBubble?.addEventListener("click", (event) => {
  const inlineBtn = event.target.closest("[data-card-inline]");
  if (inlineBtn) {
    applyCardInline(inlineBtn.dataset.cardInline);
    return;
  }
  const fgBtn = event.target.closest("[data-card-fg]");
  if (fgBtn) applyCardFg(fgBtn.dataset.cardFg);
});

document.addEventListener("selectionchange", () => {
  if (editingNodeId) queueTextBubble();
});

document.addEventListener("click", (event) => {
  if (!ignoreTopicClick && connectMenu && !connectMenu.hidden &&
      !event.target.closest("#connect-menu") && !event.target.closest(".topic-dot")) {
    closeConnectMenu();
  }
  const control = event.target.closest("[data-action]");
  if (ignoreTopicClick && control?.dataset.action === "select-node") return;
  if (control && !control.disabled) actions[control.dataset.action]?.(control);
});

mapTitle.addEventListener("change", () => {
  if (!activeMap || presenting) return;
  const title = mapTitle.value.trim();
  if (!title || title === activeMap.title) {
    mapTitle.value = activeMap.title;
    return;
  }
  rememberMap();
  activeMap.title = title;
  stamp(activeMap);
  renderWorkspace();
  changed();
});
mapTitle.addEventListener("keydown", (event) => {
  if (event.key === "Enter") mapTitle.blur();
  if (event.key === "Escape") {
    mapTitle.value = activeMap.title;
    mapTitle.blur();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "F5") {
    event.preventDefault();
    if (!event.repeat) void reloadToolkit();
    return;
  }
  if (!activeMap || dialog.open || noteLinkDialog?.open) return;
  if (presenting && event.key === "Escape") setPresentation(false);
  const mod = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  if (!presenting && mod && !event.target.closest("input, textarea, [contenteditable]")) {
    if (key === "z" && !event.shiftKey) {
      event.preventDefault();
      actions.undo();
      return;
    }
    if (key === "c" && currentNode()) {
      event.preventDefault();
      actions["copy-node"]();
      return;
    }
    if (key === "v" && clipboardBranch) {
      event.preventDefault();
      actions["paste-node"]();
      return;
    }
    if (key === "d" && currentNode()) {
      event.preventDefault();
      actions["copy-node"]();
      actions["paste-node"]();
      return;
    }
  }
});

form.addEventListener("input", () => form.elements.title.setCustomValidity(""));
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = form.elements.title.value.trim();
  if (!form.elements.title.disabled && !title) {
    form.elements.title.setCustomValidity("Informe um nome.");
    form.elements.title.reportValidity();
    return;
  }
  if (activeMap) rememberMap();
  dialogSave(title);
  if (activeMap) stamp(activeMap);
  dialog.close();
  changed();
});

viewport.addEventListener("keydown", (event) => {
  if (event.target.closest("#connect-menu")) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeConnectMenu();
      viewport.focus({ preventScroll: true });
    }
    return;
  }
  if (event.target.closest(".map-overlay")) return;
  if (event.target.closest("input, textarea, [contenteditable]")) return;
  if (event.key === "Delete" || event.key === "Backspace") {
    if (selectedLink) {
      event.preventDefault();
      actions["link-delete"]();
      return;
    }
    if (currentNode() && !presenting) {
      event.preventDefault();
      actions["delete-node"]();
      return;
    }
  }
  const mod = event.ctrlKey || event.metaKey;
  if (!presenting && ink.tool === "select" && currentNode() && !mod && !event.altKey) {
    if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      startInlineEdit(selectedId);
      return;
    }
    if (event.key === "Dead") {
      startInlineEdit(selectedId);
      return;
    }
    if (event.key.length === 1 && event.key !== " ") {
      event.preventDefault();
      startInlineEdit(selectedId, { initialChar: event.key });
      return;
    }
  }
  const tools = { v: "select", p: "pen", m: "marker", e: "eraser" };
  if (!mod && !event.altKey && tools[event.key.toLowerCase()]) {
    event.preventDefault();
    setInkTool(tools[event.key.toLowerCase()]);
    return;
  }
  if (event.key === "Escape") {
    if (connectMenu && !connectMenu.hidden) {
      event.preventDefault();
      closeConnectMenu();
      return;
    }
    if (ink.tool !== "select" || selectedLink) {
      event.preventDefault();
      setInkTool("select");
      return;
    }
    if (selectedId) {
      event.preventDefault();
      selectedId = undefined;
      updateSelection();
      return;
    }
  }
  if (event.key === "Insert" && !event.repeat && currentNode()) {
    event.preventDefault();
    actions["add-node"]();
    return;
  }
  if (event.target !== viewport) return;
  const offsets = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] };
  if (!Object.hasOwn(offsets, event.key)) return;
  event.preventDefault();
  const [x, y] = offsets[event.key];
  view.x += x;
  view.y += y;
  draw();
});
viewport.addEventListener("wheel", (event) => {
  event.preventDefault();
  const bounds = viewport.getBoundingClientRect();
  zoom(event.deltaY < 0 ? 1.12 : 1 / 1.12, event.clientX - bounds.left, event.clientY - bounds.top);
}, { passive: false });
viewport.addEventListener("pointerdown", (event) => {
  if (!activeMap || !event.isPrimary || event.button !== 0 || event.target.closest(".map-overlay, #text-bubble")) return;
  if (event.target.closest(".node-inline-input")) return;
  commitInlineEdit();
  closeConnectMenu();
  if (ink.tool !== "select") {
    event.preventDefault();
    viewport.focus({ preventScroll: true });
    viewport.setPointerCapture(event.pointerId);
    const point = worldPoint(event);
    inkPointer = { id: event.pointerId, last: point };
    if (ink.tool === "eraser") {
      if (eraseAt(point)) draw();
      return;
    }
    if (activeMap.strokes.length >= strokeLimit) {
      inkPointer = undefined;
      return;
    }
    rememberMap();
    inkPointer.stroke = {
      id: crypto.randomUUID(), tool: ink.tool, color: ink.color[ink.tool], width: ink.size[ink.tool],
      points: [[Math.round(point.x * 10) / 10, Math.round(point.y * 10) / 10]],
    };
    activeMap.strokes.push(inkPointer.stroke);
    draw();
    return;
  }
  const resizeHandle = event.target.closest(".topic-resize");
  if (resizeHandle && !presenting) {
    event.preventDefault();
    const id = resizeHandle.dataset.topic;
    const node = activeMap.nodes.find((item) => item.id === id);
    if (!node) return;
    selectedId = id;
    updateSelection();
    viewport.setPointerCapture(event.pointerId);
    const corner = resizeHandle.dataset.corner;
    const startSize = nodeSize(node);
    resizeDrag = {
      id: event.pointerId,
      node,
      dirX: corner.includes("e") ? 1 : -1,
      dirY: corner.includes("s") ? 1 : -1,
      startX: event.clientX,
      startY: event.clientY,
      startSize,
      startCenter: { ...placement.get(id) },
      lastW: startSize.w,
      lastH: startSize.h,
      changed: false,
      snapshot: structuredClone(activeMap),
    };
    placeCardStyleBar();
    return;
  }
  const dot = event.target.closest(".topic-dot");
  if (dot && !presenting) {
    event.preventDefault();
    viewport.setPointerCapture(event.pointerId);
    selectedId = dot.dataset.topic;
    updateSelection();
    linkDrag = {
      id: event.pointerId,
      from: dot.dataset.topic,
      fromSide: dot.dataset.side,
      dotEl: dot,
      startX: event.clientX,
      startY: event.clientY,
      point: worldPoint(event),
    };
    return;
  }
  if (event.target.closest(".topic-control, .topic-note-badge")) return;
  const pt = worldPoint(event);
  const handle = !presenting ? linkHandleAt(pt) : undefined;
  if (handle) {
    event.preventDefault();
    viewport.setPointerCapture(event.pointerId);
    delete viewport.dataset.linkHover;
    linkEditDrag = {
      id: event.pointerId,
      link: handle.link,
      mode: handle.end,
      startX: event.clientX,
      startY: event.clientY,
      startWorld: pt,
      origStart: { ...handle.geometry.start },
      origEnd: { ...handle.geometry.end },
      snapshot: structuredClone(activeMap),
    };
    viewport.focus({ preventScroll: true });
    return;
  }
  const button = event.target.closest(".node");
  if (!button && !presenting) {
    const link = linkAt(pt);
    if (link) {
      event.preventDefault();
      const geometry = linkGeometry(link);
      selectLink(link.id);
      const reach = 12 / view.scale;
      const distEnd = geometry ? Math.hypot(pt.x - geometry.end.x, pt.y - geometry.end.y) : Infinity;
      const distStart = geometry ? Math.hypot(pt.x - geometry.start.x, pt.y - geometry.start.y) : Infinity;
      const mode = distEnd <= reach && distEnd <= distStart ? "end" : distStart <= reach ? "start" : "move";
      viewport.setPointerCapture(event.pointerId);
      delete viewport.dataset.linkHover;
      linkEditDrag = {
        id: event.pointerId,
        link,
        mode,
        startX: event.clientX,
        startY: event.clientY,
        startWorld: pt,
        origStart: geometry ? { ...geometry.start } : { ...pt },
        origEnd: geometry ? { ...geometry.end } : { ...pt },
        snapshot: structuredClone(activeMap),
      };
      viewport.focus({ preventScroll: true });
      return;
    }
  }
  if (selectedLink) selectLink(undefined);
  const node = button && activeMap.nodes.find((item) => item.id === button.dataset.id);
  if (node && (presenting || node.fixed)) return;
  pointer = { id: event.pointerId, node, startX: event.clientX, startY: event.clientY, x: view.x, y: view.y };
  if (!node) {
    viewport.setPointerCapture(event.pointerId);
    viewport.dataset.panning = "";
  }
});
viewport.addEventListener("pointerleave", () => {
  delete viewport.dataset.linkHover;
});
function snapTargetAt(point, excludeId = null) {
  if (!activeMap) return undefined;
  const byId = new Map(activeMap.nodes.map((node) => [node.id, node]));
  const dotRadius = 24 / Math.max(0.25, view.scale);
  const pad = 28 / Math.max(0.25, view.scale);
  let best;
  let bestScore = Infinity;
  for (const node of activeMap.nodes) {
    if (node.id === excludeId || !placement.has(node.id)) continue;
    const center = placement.get(node.id);
    const size = nodeSize(byId.get(node.id));
    const halfW = size.w / 2;
    const halfH = size.h / 2;
    const insideCard = Math.abs(point.x - center.x) <= halfW && Math.abs(point.y - center.y) <= halfH;
    const inExpandedZone = Math.abs(point.x - center.x) <= halfW + pad && Math.abs(point.y - center.y) <= halfH + pad;
    if (!inExpandedZone) continue;

    let closestSide;
    let closestDist = Infinity;
    for (const side of branchDirections) {
      const anchor = sidePoint(center, size, side, 13);
      const dist = Math.hypot(point.x - anchor.x, point.y - anchor.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestSide = side;
      }
    }
    if (!insideCard && closestDist > dotRadius) continue;
    if (closestDist < bestScore) {
      bestScore = closestDist;
      best = { id: node.id, side: closestSide };
    }
  }
  return best;
}

function updateSnapHighlights(snap) {
  for (const node of nodesLayer.querySelectorAll(".node")) {
    node.toggleAttribute("data-link-target", Boolean(snap && node.dataset.id === snap.id));
  }
}

function clearSnapHighlights() {
  for (const el of nodesLayer.querySelectorAll("[data-link-target]")) {
    el.removeAttribute("data-link-target");
  }
}

document.addEventListener("pointermove", (event) => {
  if (inkPointer && event.pointerId === inkPointer.id) {
    const point = worldPoint(event);
    if (inkPointer.stroke) {
      if (Math.hypot(point.x - inkPointer.last.x, point.y - inkPointer.last.y) < 1.5 / view.scale ||
          inkPointer.stroke.points.length >= strokePointLimit) return;
      inkPointer.stroke.points.push([Math.round(point.x * 10) / 10, Math.round(point.y * 10) / 10]);
      inkPointer.last = point;
      draw();
    } else if (eraseAt(point)) draw();
    return;
  }
  if (resizeDrag && event.pointerId === resizeDrag.id) {
    const dx = (event.clientX - resizeDrag.startX) / view.scale;
    const dy = (event.clientY - resizeDrag.startY) / view.scale;
    let w = Math.round(Math.max(minNodeWidth, Math.min(maxNodeWidth, resizeDrag.startSize.w + resizeDrag.dirX * dx)));
    let h = Math.round(Math.max(minNodeHeight, Math.min(maxNodeHeight, resizeDrag.startSize.h + resizeDrag.dirY * dy)));
    if (resizeDrag.node.image) {
      const byWidth = resizeDrag.startSize.w + resizeDrag.dirX * dx;
      const byHeight = (resizeDrag.startSize.h + resizeDrag.dirY * dy) * resizeDrag.node.imageRatio;
      const wanted = Math.abs(byWidth - resizeDrag.startSize.w) >= Math.abs(byHeight - resizeDrag.startSize.w) ? byWidth : byHeight;
      ({ w, h } = imageNodeSize(resizeDrag.node, wanted));
    }
    if (w === resizeDrag.lastW && h === resizeDrag.lastH) return;
    resizeDrag.lastW = w;
    resizeDrag.lastH = h;
    resizeDrag.changed = true;
    const { node, startSize, startCenter, dirX, dirY } = resizeDrag;
    node.size = { w, h };
    const targetCenter = {
      x: startCenter.x + dirX * (w - startSize.w) / 2,
      y: startCenter.y + dirY * (h - startSize.h) / 2,
    };
    if (node.fixed) {
      node.fixed = targetCenter;
    } else if (node.parent === null && node.pos) {
      node.pos = { x: targetCenter.x - (node.offset?.x ?? 0), y: targetCenter.y - (node.offset?.y ?? 0) };
    } else {
      const currentCenter = calculateLayout(activeMap).get(node.id);
      node.offset = {
        x: (node.offset?.x ?? 0) + targetCenter.x - currentCenter.x,
        y: (node.offset?.y ?? 0) + targetCenter.y - currentCenter.y,
      };
    }
    placement = calculateLayout(activeMap);
    positionTopics();
    draw();
    return;
  }
  if (linkDrag && event.pointerId === linkDrag.id) {
    linkDrag.moved ||= Math.hypot(event.clientX - linkDrag.startX, event.clientY - linkDrag.startY) > 10;
    linkDrag.point = worldPoint(event);
    if (linkDrag.moved) {
      const snap = snapTargetAt(linkDrag.point, linkDrag.from);
      linkDrag.target = snap?.id;
      linkDrag.targetSide = snap?.side;
      updateSnapHighlights(snap);
    }
    draw();
    return;
  }
  if (linkEditDrag && event.pointerId === linkEditDrag.id) {
    const pt = worldPoint(event);
    if (!linkEditDrag.moved) {
      if (Math.hypot(event.clientX - linkEditDrag.startX, event.clientY - linkEditDrag.startY) <= 5) return;
      linkEditDrag.moved = true;
      viewport.dataset.movingLink = "";
    }
    const { link, mode, startWorld, origStart, origEnd } = linkEditDrag;
    if (mode === "end" || mode === "start") {
      const oppositeId = mode === "end" ? link.from : link.to;
      const snap = snapTargetAt(pt, oppositeId);
      updateSnapHighlights(snap);
      if (mode === "end") {
        if (snap) {
          link.to = snap.id;
          link.toSide = snap.side;
          delete link.toPos;
        } else {
          link.to = null;
          link.toPos = { x: Math.round(pt.x), y: Math.round(pt.y) };
          delete link.toSide;
        }
      } else {
        if (snap) {
          link.from = snap.id;
          link.fromSide = snap.side;
          delete link.fromPos;
        } else {
          link.from = null;
          link.fromPos = { x: Math.round(pt.x), y: Math.round(pt.y) };
          delete link.fromSide;
        }
      }
    } else {
      const dx = pt.x - startWorld.x;
      const dy = pt.y - startWorld.y;
      link.from = null;
      link.fromPos = { x: Math.round(origStart.x + dx), y: Math.round(origStart.y + dy) };
      delete link.fromSide;
      link.to = null;
      link.toPos = { x: Math.round(origEnd.x + dx), y: Math.round(origEnd.y + dy) };
      delete link.toSide;
    }
    draw();
    return;
  }
  if (!inkPointer && !resizeDrag && !linkDrag && !linkEditDrag && !pointer) {
    if (activeMap && !presenting && ink.tool === "select" &&
        event.target instanceof Element && viewport.contains(event.target) &&
        !event.target.closest(".node, .topic-dot, .topic-resize, .topic-control, .map-overlay")) {
      const pt = worldPoint(event);
      if (linkHandleAt(pt) || linkAt(pt)) viewport.dataset.linkHover = "";
      else delete viewport.dataset.linkHover;
    } else if (viewport.dataset.linkHover !== undefined) {
      delete viewport.dataset.linkHover;
    }
  }
  if (event.pointerId !== pointer?.id) return;
  const dx = event.clientX - pointer.startX;
  const dy = event.clientY - pointer.startY;
  if (pointer.node) {
    if (pointer.dx === undefined) {
      if (Math.hypot(dx, dy) < 5) return;
      selectedId = pointer.node.id;
      updateSelection();
      viewport.setPointerCapture(event.pointerId);
      viewport.dataset.movingTopic = "";
    }
    pointer.dx = dx / view.scale;
    pointer.dy = dy / view.scale;
    placement = calculateLayout(activeMap, pointer);
    positionTopics();
  } else {
    view.x = pointer.x + dx;
    view.y = pointer.y + dy;
  }
  draw();
});
function finishInk(event) {
  if (!inkPointer || event.pointerId !== inkPointer.id) return false;
  const { stroke, remembered } = inkPointer;
  inkPointer = undefined;
  if (stroke || remembered) {
    stamp(activeMap);
    changed();
  }
  return true;
}

function finishResize(event) {
  if (!resizeDrag || event.pointerId !== resizeDrag.id) return false;
  const drag = resizeDrag;
  resizeDrag = undefined;
  placeCardStyleBar();
  if (!drag.changed) return true;
  if (event.type === "pointerup") {
    history.push({ map: drag.snapshot, selection: selectedId });
    if (history.length > 24) history.shift();
    $('[data-action="undo"]').disabled = !history.length;
    stamp(activeMap);
    changed();
  } else {
    Object.assign(activeMap, drag.snapshot);
    renderWorkspace();
  }
  return true;
}

function finishLink(event) {
  if (!linkDrag || event.pointerId !== linkDrag.id) return false;
  const { from, fromSide, dotEl, target, targetSide, moved, point } = linkDrag;
  linkDrag = undefined;
  clearSnapHighlights();
  draw();
  if (event.type !== "pointerup") return true;
  ignoreTopicClick = true;
  setTimeout(() => { ignoreTopicClick = false; }, 0);
  if (!moved) {
    openConnectMenu(from, fromSide, dotEl);
    return true;
  }
  if (target) {
    if (activeMap.links.some((link) => link.from === from && link.to === target && link.fromSide === fromSide && link.toSide === targetSide)) return true;
    if (activeMap.links.length >= linkLimit) return true;
    rememberMap();
    const link = { id: crypto.randomUUID(), from, to: target, fromSide };
    if (targetSide) link.toSide = targetSide;
    activeMap.links.push(link);
    selectedLink = link.id;
    stamp(activeMap);
    draw();
    changed();
    return true;
  }
  if (activeMap.nodes.length >= nodeLimit) return true;
  openConnectMenu(from, fromSide, dotEl, { x: Math.round(point.x), y: Math.round(point.y) });
  return true;
}

function finishLinkEdit(event) {
  if (!linkEditDrag || event.pointerId !== linkEditDrag.id) return false;
  const drag = linkEditDrag;
  linkEditDrag = undefined;
  delete viewport.dataset.movingLink;
  clearSnapHighlights();
  if (!drag.moved) {
    draw();
    return true;
  }
  ignoreTopicClick = true;
  setTimeout(() => { ignoreTopicClick = false; }, 0);
  if (event.type === "pointerup") {
    history.push({ map: drag.snapshot, selection: selectedId });
    if (history.length > 24) history.shift();
    $('[data-action="undo"]').disabled = !history.length;
    stamp(activeMap);
    draw();
    changed();
  } else {
    Object.assign(activeMap, drag.snapshot);
    renderWorkspace();
  }
  return true;
}

function finishMapPointer(event) {
  if (finishInk(event) || finishResize(event) || finishLink(event) || finishLinkEdit(event)) return;
  if (event.pointerId !== pointer?.id) return;
  const { node, dx, dy, startX, startY } = pointer;
  pointer = undefined;
  delete viewport.dataset.panning;
  delete viewport.dataset.movingTopic;
  if (!node && event.type === "pointerup" && Math.hypot(event.clientX - startX, event.clientY - startY) < 5 && selectedId) {
    selectedId = undefined;
    updateSelection();
  }
  if (dx === undefined || !activeMap) return;
  if (event.type === "pointerup") {
    rememberMap();
    node.offset = { x: (node.offset?.x ?? 0) + dx, y: (node.offset?.y ?? 0) + dy };
    ignoreTopicClick = true;
    setTimeout(() => { ignoreTopicClick = false; }, 0);
    stamp(activeMap);
    changed();
  }
  placement = calculateLayout(activeMap);
  positionTopics();
  draw();
}
document.addEventListener("pointerup", finishMapPointer);
document.addEventListener("pointercancel", finishMapPointer);
viewport.addEventListener("lostpointercapture", finishMapPointer);
new ResizeObserver(draw).observe(viewport);

async function initialize() {
  showStatus("Carregando…");
  try {
    const data = await host("load");
    if (!validWorkspace(data) || !crm.valid(data.contacts) || !notes.valid(data.notes) || !notes.valid(data.noteTemplates) || !kit.validate(data)) {
      throw new Error("O arquivo de dados do Kuarq contém informações inválidas.");
    }
    workspace = data;
    applyTheme(data.theme === "dark");
    requestAnimationFrame(() => requestAnimationFrame(() => { document.documentElement.dataset.ready = ""; }));
    $('[data-action="new-map"]').disabled = false;
    for (const tool of document.querySelectorAll(".nav-tool")) tool.disabled = false;
    applyDiscreet();
    showStatus("Dados locais");
    actions.today();
  } catch (error) {
    $("#library").hidden = false;
    $("#map-library").textContent = error.message;
    showStatus("Tentar carregar de novo", true);
  }
}

for (const element of document.querySelectorAll("[data-icon]")) element.innerHTML = icon(element.dataset.icon);
document.addEventListener("DOMContentLoaded", initialize, { once: true });
