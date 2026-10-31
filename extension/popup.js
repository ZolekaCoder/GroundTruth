const claim = document.getElementById("claim");
const app = document.getElementById("app");
chrome.storage.sync.get("appUrl").then(({ appUrl }) => { if (appUrl) app.value = appUrl; });
app.addEventListener("change", () => chrome.storage.sync.set({ appUrl: app.value.trim() }));
document.getElementById("go").addEventListener("click", () => {
  if (!claim.value.trim()) return claim.focus();
  chrome.runtime.sendMessage({ type: "trial", claim: claim.value });
  window.close();
});
