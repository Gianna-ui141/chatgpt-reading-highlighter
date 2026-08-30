(function () {
  "use strict";

  const STORAGE_KEY = "cgrh_annotations_v1";
  const SETTINGS_KEY = "cgrh_settings_v1";
  const COLORS = {
    yellow: { label: "黄色", hex: "#fde68a" },
    green: { label: "绿色", hex: "#bbf7d0" },
    blue: { label: "蓝色", hex: "#bfdbfe" },
    pink: { label: "粉色", hex: "#fbcfe8" }
  };
  const state = {
    annotations: [],
    currentRange: null,
    currentMessage: null,
    panelOpen: false,
    query: "",
    renderQueued: false
  };

  const anchor = globalThis.ChatGPTReadingAnchor;

  function conversationId() {
    const match = location.pathname.match(/\/c\/([^/?#]+)/);
    return match?.[1] || `page:${location.pathname}`;
  }

  function assistantMessages() {
    const direct = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
    if (direct.length) return direct;
    return Array.from(document.querySelectorAll('article[data-testid^="conversation-turn-"]'))
      .filter((element) => !element.querySelector('[data-message-author-role="user"]'));
  }

  function messageRoot(node) {
    if (!(node instanceof Node)) return null;
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return element?.closest('[data-message-author-role="assistant"]') ||
      element?.closest('article[data-testid^="conversation-turn-"]') || null;
  }

  function messageIdentity(message) {
    const article = message.closest('article[data-testid^="conversation-turn-"]') || message;
    const explicit = article.getAttribute("data-message-id") || article.getAttribute("data-testid");
    const normalized = anchor.normalizeText(message.innerText || message.textContent || "");
    return {
      id: explicit || `fingerprint:${anchor.hashText(normalized.slice(0, 240))}`,
      fingerprint: anchor.hashText(normalized.slice(0, 240))
    };
  }

  function textNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!node.nodeValue || !parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest("#cgrh-root, #cgrh-toolbar")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  function offsetsFromRange(root, range) {
    const before = document.createRange();
    before.selectNodeContents(root);
    before.setEnd(range.startContainer, range.startOffset);
    return { start: before.toString().length, end: before.toString().length + range.toString().length };
  }

  function rangeFromOffsets(root, start, end) {
    const nodes = textNodes(root);
    let position = 0;
    let startNode = null;
    let endNode = null;
    let startOffset = 0;
    let endOffset = 0;
    for (const node of nodes) {
      const next = position + node.nodeValue.length;
      if (!startNode && start >= position && start <= next) {
        startNode = node;
        startOffset = Math.min(node.nodeValue.length, start - position);
      }
      if (end >= position && end <= next) {
        endNode = node;
        endOffset = Math.min(node.nodeValue.length, end - position);
        break;
      }
      position = next;
    }
    if (!startNode || !endNode) return null;
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  }

  async function load() {
    const result = await chrome.storage.local.get([STORAGE_KEY, SETTINGS_KEY]);
    state.annotations = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
    state.panelOpen = Boolean(result[SETTINGS_KEY]?.panelOpen);
  }

  async function persist() {
    await chrome.storage.local.set({
      [STORAGE_KEY]: state.annotations,
      [SETTINGS_KEY]: { panelOpen: state.panelOpen }
    });
  }

  function createUi() {
    if (document.getElementById("cgrh-root")) return;
    const root = document.createElement("div");
    root.id = "cgrh-root";
    root.innerHTML = `
      <button id="cgrh-toggle" type="button" title="阅读标注">✦</button>
      <aside id="cgrh-panel" aria-label="阅读标注侧边栏">
        <header><div><strong>阅读标注</strong><small id="cgrh-count"></small></div><button id="cgrh-close" type="button">×</button></header>
        <div class="cgrh-search"><input id="cgrh-search" type="search" placeholder="搜索标记或旁注…"></div>
        <div id="cgrh-list"></div>
        <footer><button id="cgrh-export-md" type="button">导出 Markdown</button><button id="cgrh-export-json" type="button">导出 JSON</button></footer>
      </aside>`;
    document.documentElement.appendChild(root);

    const toolbar = document.createElement("div");
    toolbar.id = "cgrh-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.innerHTML = Object.entries(COLORS).map(([key, color]) =>
      `<button type="button" data-color="${key}" title="${color.label}" style="--swatch:${color.hex}"></button>`
    ).join("") + `<button type="button" data-note title="高亮并添加旁注">＋旁注</button>`;
    document.documentElement.appendChild(toolbar);

    root.querySelector("#cgrh-toggle").addEventListener("click", togglePanel);
    root.querySelector("#cgrh-close").addEventListener("click", togglePanel);
    root.querySelector("#cgrh-search").addEventListener("input", (event) => {
      state.query = event.target.value.trim().toLowerCase();
      renderPanel();
    });
    root.querySelector("#cgrh-export-md").addEventListener("click", () => exportData("md"));
    root.querySelector("#cgrh-export-json").addEventListener("click", () => exportData("json"));
    toolbar.addEventListener("mousedown", (event) => event.preventDefault());
    toolbar.addEventListener("click", onToolbarClick);
    renderPanel();
  }

  function togglePanel() {
    state.panelOpen = !state.panelOpen;
    document.getElementById("cgrh-panel")?.classList.toggle("is-open", state.panelOpen);
    persist();
  }

  function showToolbar(range) {
    const toolbar = document.getElementById("cgrh-toolbar");
    if (!toolbar) return;
    const rect = range.getBoundingClientRect();
    toolbar.style.left = `${Math.max(12, Math.min(innerWidth - 260, rect.left + rect.width / 2 - 105))}px`;
    toolbar.style.top = `${Math.max(12, rect.top - 48)}px`;
    toolbar.classList.add("is-visible");
  }

  function hideToolbar() {
    document.getElementById("cgrh-toolbar")?.classList.remove("is-visible");
  }

  function onSelection() {
    const selection = getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return hideToolbar();
    const range = selection.getRangeAt(0);
    const startMessage = messageRoot(range.startContainer);
    const endMessage = messageRoot(range.endContainer);
    if (!startMessage || startMessage !== endMessage || !range.toString().trim()) return hideToolbar();
    state.currentRange = range.cloneRange();
    state.currentMessage = startMessage;
    showToolbar(range);
  }

  async function onToolbarClick(event) {
    const button = event.target.closest("button");
    if (!button || !state.currentRange || !state.currentMessage) return;
    const color = button.dataset.color || "yellow";
    let note = "";
    if (button.hasAttribute("data-note")) {
      note = prompt("给这段内容添加旁注：", "")?.trim() || "";
    }
    await addAnnotation(color, note);
  }

  async function addAnnotation(color, note) {
    const range = state.currentRange;
    const message = state.currentMessage;
    const offsets = offsetsFromRange(message, range);
    const fullText = message.textContent || "";
    const identity = messageIdentity(message);
    const quote = range.toString();
    const annotation = {
      id: crypto.randomUUID(),
      conversationId: conversationId(),
      conversationTitle: document.title.replace(/\s*\|\s*ChatGPT.*$/i, ""),
      url: location.href,
      messageId: identity.id,
      messageFingerprint: identity.fingerprint,
      quote,
      prefix: fullText.slice(Math.max(0, offsets.start - 48), offsets.start),
      suffix: fullText.slice(offsets.end, offsets.end + 48),
      start: offsets.start,
      end: offsets.end,
      color: COLORS[color] ? color : "yellow",
      note,
      createdAt: new Date().toISOString()
    };
    state.annotations.unshift(annotation);
    await persist();
    getSelection()?.removeAllRanges();
    hideToolbar();
    renderHighlights();
    renderPanel();
  }

  function findMessage(annotation) {
    const messages = assistantMessages();
    return messages.find((message) => messageIdentity(message).id === annotation.messageId) ||
      messages.find((message) => messageIdentity(message).fingerprint === annotation.messageFingerprint) ||
      messages.find((message) => (message.textContent || "").includes(annotation.quote));
  }

  function resolvedRange(annotation) {
    const message = findMessage(annotation);
    if (!message) return null;
    const text = message.textContent || "";
    const location = anchor.locateQuote(text, annotation);
    if (!location) return null;
    const range = rangeFromOffsets(message, location.start, location.end);
    return range ? { range, message } : null;
  }

  function renderHighlights() {
    if (!globalThis.CSS?.highlights || typeof Highlight === "undefined") return;
    for (const color of Object.keys(COLORS)) {
      const ranges = state.annotations
        .filter((item) => item.conversationId === conversationId() && item.color === color)
        .map(resolvedRange)
        .filter(Boolean)
        .map((item) => item.range);
      CSS.highlights.set(`cgrh-${color}`, new Highlight(...ranges));
    }
  }

  function renderPanel() {
    const panel = document.getElementById("cgrh-panel");
    if (!panel) return;
    panel.classList.toggle("is-open", state.panelOpen);
    const local = state.annotations.filter((item) => item.conversationId === conversationId());
    const filtered = local.filter((item) =>
      !state.query || `${item.quote} ${item.note}`.toLowerCase().includes(state.query)
    );
    panel.querySelector("#cgrh-count").textContent = `${local.length} 条`;
    const list = panel.querySelector("#cgrh-list");
    if (!filtered.length) {
      list.innerHTML = `<div class="cgrh-empty">选中回答中的文字，即可开始标记。</div>`;
      return;
    }
    list.innerHTML = filtered.map((item) => `
      <article class="cgrh-item" data-id="${item.id}" style="--item-color:${COLORS[item.color]?.hex || COLORS.yellow.hex}">
        <button class="cgrh-jump" type="button">“${escapeHtml(item.quote.slice(0, 180))}${item.quote.length > 180 ? "…" : ""}”</button>
        ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
        <div><time>${new Date(item.createdAt).toLocaleString()}</time><button class="cgrh-edit" type="button">旁注</button><button class="cgrh-delete" type="button">删除</button></div>
      </article>`).join("");
    list.querySelectorAll(".cgrh-jump").forEach((button) => button.addEventListener("click", () => jumpTo(button.closest("article").dataset.id)));
    list.querySelectorAll(".cgrh-edit").forEach((button) => button.addEventListener("click", () => editNote(button.closest("article").dataset.id)));
    list.querySelectorAll(".cgrh-delete").forEach((button) => button.addEventListener("click", () => deleteAnnotation(button.closest("article").dataset.id)));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
  }

  function jumpTo(id) {
    const item = state.annotations.find((annotation) => annotation.id === id);
    const resolved = item && resolvedRange(item);
    if (!resolved) return;
    resolved.message.scrollIntoView({ behavior: "smooth", block: "center" });
    resolved.message.classList.add("cgrh-pulse");
    setTimeout(() => resolved.message.classList.remove("cgrh-pulse"), 1300);
  }

  async function editNote(id) {
    const item = state.annotations.find((annotation) => annotation.id === id);
    if (!item) return;
    const next = prompt("编辑旁注：", item.note || "");
    if (next === null) return;
    item.note = next.trim();
    await persist();
    renderPanel();
  }

  async function deleteAnnotation(id) {
    state.annotations = state.annotations.filter((annotation) => annotation.id !== id);
    await persist();
    renderHighlights();
    renderPanel();
  }

  function exportData(format) {
    const items = state.annotations.filter((item) => item.conversationId === conversationId());
    const safeTitle = (document.title || "chatgpt-highlights").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80);
    let content;
    let type;
    if (format === "json") {
      content = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), annotations: items }, null, 2);
      type = "application/json";
    } else {
      content = `# ${document.title}\n\n来源：${location.href}\n\n` + items.map((item) =>
        `> ${item.quote.replace(/\n/g, "\n> ")}\n\n${item.note ? `旁注：${item.note}\n\n` : ""}颜色：${COLORS[item.color]?.label || item.color} · ${new Date(item.createdAt).toLocaleString()}\n`
      ).join("\n---\n\n");
      type = "text/markdown";
    }
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeTitle}-highlights.${format}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function queueRender() {
    if (state.renderQueued) return;
    state.renderQueued = true;
    setTimeout(() => {
      state.renderQueued = false;
      renderHighlights();
    }, 250);
  }

  async function init() {
    await load();
    createUi();
    renderHighlights();
    document.addEventListener("mouseup", () => setTimeout(onSelection, 0));
    document.addEventListener("keyup", (event) => {
      if (event.key === "Escape") hideToolbar();
      else setTimeout(onSelection, 0);
    });
    new MutationObserver(queueRender).observe(document.body, { childList: true, subtree: true });
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === "CGRH_TOGGLE_PANEL") togglePanel();
    });
    let previousUrl = location.href;
    setInterval(() => {
      if (location.href === previousUrl) return;
      previousUrl = location.href;
      renderPanel();
      queueRender();
    }, 800);
  }

  init().catch((error) => console.error("[ChatGPT Reading Highlighter]", error));
})();
