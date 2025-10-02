console.log("[content] script loaded");

// Optional: intercept in-page clicks so we can handle without full navigation
addEventListener("click", (e) => {
  const a = e.target?.closest("a[href]");
  if (!a || e.defaultPrevented) return;

  const url = a.href; // href property gives absolute URL
  if (!url || !url.startsWith("https://github.com/")) return;

  console.log("[content] intercepting click", { url });
  e.preventDefault();
  chrome.runtime.sendMessage({ type: "GITHUB_LINK_CLICK", url });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "PROMPT_DECISION") {
    const promptMessage = msg.title ? `${msg.title}\n\n${msg.message}` : msg.message;
    const confirmed = window.confirm(promptMessage);
    sendResponse({ confirmed });
  }
});
