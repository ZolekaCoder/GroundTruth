// No API keys live here. The extension only hands the highlighted text and page URL to the
// Ground Truth web app, which talks to the server where the model key is kept.
const DEFAULT_APP = "http://localhost:5173";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "put-on-trial", title: "Put This On Trial", contexts: ["selection"] });
});

async function appUrl() {
  const { appUrl } = await chrome.storage.sync.get("appUrl");
  return (appUrl || DEFAULT_APP).replace(/\/$/, "");
}

async function openTrial(claim, pageUrl) {
  const params = new URLSearchParams({ claim: claim.trim().slice(0, 600) });
  if (pageUrl && /^https?:/.test(pageUrl)) params.set("url", pageUrl);
  chrome.tabs.create({ url: `${await appUrl()}/?${params}` });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "put-on-trial" && info.selectionText) openTrial(info.selectionText, tab?.url);
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "trial" && msg.claim) openTrial(msg.claim, msg.url);
});
