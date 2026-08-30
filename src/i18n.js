(function (root) {
  "use strict";

  const messages = {
    en: {
      panelTitle: "Reading Highlights",
      panelAriaLabel: "Reading highlights sidebar",
      toggleTitle: "Reading highlights",
      searchPlaceholder: "Search highlights or notes…",
      exportMarkdown: "Export Markdown",
      exportJson: "Export JSON",
      addNote: "+ Note",
      addNoteTitle: "Highlight and add a note",
      createNotePrompt: "Add a note to this passage:",
      editNotePrompt: "Edit note:",
      note: "Note",
      delete: "Delete",
      emptyState: "Select text in an assistant response to start highlighting.",
      itemCount: "{count} items",
      source: "Source",
      color: "Color",
      noteLabel: "Note",
      colorYellow: "Yellow",
      colorGreen: "Green",
      colorBlue: "Blue",
      colorPink: "Pink"
    },
    zh: {
      panelTitle: "阅读标注",
      panelAriaLabel: "阅读标注侧边栏",
      toggleTitle: "阅读标注",
      searchPlaceholder: "搜索标记或旁注…",
      exportMarkdown: "导出 Markdown",
      exportJson: "导出 JSON",
      addNote: "＋旁注",
      addNoteTitle: "高亮并添加旁注",
      createNotePrompt: "给这段内容添加旁注：",
      editNotePrompt: "编辑旁注：",
      note: "旁注",
      delete: "删除",
      emptyState: "选中回答中的文字，即可开始标记。",
      itemCount: "{count} 条",
      source: "来源",
      color: "颜色",
      noteLabel: "旁注",
      colorYellow: "黄色",
      colorGreen: "绿色",
      colorBlue: "蓝色",
      colorPink: "粉色"
    }
  };

  function resolveLanguage(language) {
    return /^zh(?:-|_|$)/i.test(String(language || "")) ? "zh" : "en";
  }

  function translate(language, key, variables = {}) {
    const locale = messages[language] ? language : "en";
    const template = messages[locale][key] || messages.en[key] || key;
    return template.replace(/\{(\w+)\}/g, (_, name) => String(variables[name] ?? `{${name}}`));
  }

  const api = { messages, resolveLanguage, translate };
  root.ChatGPTReadingI18n = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
