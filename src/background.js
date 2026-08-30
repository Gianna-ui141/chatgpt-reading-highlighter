chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url?.startsWith("https://chatgpt.com/")) return;
  await chrome.tabs.sendMessage(tab.id, { type: "CGRH_TOGGLE_PANEL" }).catch(() => undefined);
});
