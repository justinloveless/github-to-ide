import { parseGitHubUrl } from "./url.js";

const HOST_NAME = "com.lovelesslabs.vscodeopener";
const pendingPrompts = new Map();
const PROMPT_TIMEOUT_MS = 30000;

console.log("[bg] service worker initialized");

chrome.notifications?.onButtonClicked.addListener((notificationId, buttonIndex) => {
  const entry = pendingPrompts.get(notificationId);
  if (!entry) return;
  pendingPrompts.delete(notificationId);
  clearTimeout(entry.timeout);
  entry.resolve(buttonIndex === 0);
  chrome.notifications.clear(notificationId);
});

chrome.notifications?.onClosed.addListener((notificationId) => {
  const entry = pendingPrompts.get(notificationId);
  if (!entry) return;
  pendingPrompts.delete(notificationId);
  clearTimeout(entry.timeout);
  entry.resolve(false);
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("GitHub → VS Code Interceptor installed.");
});

// Option 1: Intercept top-level navigations (omnibox, new tab loads)
chrome.webNavigation?.onBeforeNavigate?.addListener(async (details) => {
  console.log("[bg] onBeforeNavigate", { tabId: details.tabId, frameId: details.frameId, url: details.url });
  if (details.frameId !== 0) {
    console.log("[bg] skip navigation: not top frame");
    return;
  }

  const url = details.url;
  if (!url?.startsWith("https://github.com/")) {
    console.log("[bg] skip navigation: not a GitHub URL");
    return;
  }

  await maybeIntercept(url, details.tabId);
});

// Option 2: Content script catches in-page clicks; we receive messages here
chrome.runtime.onMessage.addListener((msg, sender) => {
  console.log("[bg] onMessage", { type: msg?.type, url: msg?.url, tabId: sender.tab?.id });
  if (msg?.type === "GITHUB_LINK_CLICK") {
    maybeIntercept(msg.url, sender.tab?.id);
  }
  return true;
});

async function maybeIntercept(url, tabId) {
  console.log("[bg] maybeIntercept", { url, tabId });
  try {
    const gh = parseGitHubUrl(url);
    console.log("[bg] parsed GitHub URL", gh);
    if (!gh.owner || !gh.repo) {
      console.log("[bg] abort: owner/repo missing");
      return;
    }

    const query = {
      action: "resolve",
      url,
      owner: gh.owner,
      repo: gh.repo,
      branch: gh.branch,
      commit: gh.commit,
      filepath: gh.filepath,
      line: gh.line,
    };

    console.log("[bg] sending native message", query);
    const response = await sendNativeMessage(query);
    if (!response) {
      console.log("[bg] no response from native host");
      return;
    }

    console.log("[bg] native host response", response);
    switch (response.status) {
      case "OPENED":
        if (tabId) chrome.tabs.update(tabId, { url: "about:blank" });
        break;
      case "NEEDS_CLONE":
        await confirmAndClone(response, tabId);
        break;
      case "WRONG_BRANCH":
        await warnAndSwitch(response, tabId);
        break;
      case "ERROR":
        notify("GitHub → VS Code: " + response.message);
        break;
      default:
        console.log("[bg] response status not handled, letting navigation proceed");
        break;
    }
  } catch (e) {
    console.error("[bg] maybeIntercept error", e);
  }
}

async function confirmAndClone(info, tabId) {
  console.log("[bg] confirmAndClone", info);
  const confirmed = await promptUser({
    tabId,
    title: "Clone repository?",
    message: `Clone ${info.remote} to ${info.localPath}?`,
    confirmText: "Clone",
    cancelText: "Cancel",
  });
  if (!confirmed) return;
  const res = await sendNativeMessage({ action: "clone", remote: info.remote, localPath: info.localPath });
  if (res?.status === "CLONED") {
    const openRes = await sendNativeMessage(info.openPayload);
    if (openRes?.status === "OPENED" && tabId) chrome.tabs.update(tabId, { url: "about:blank" });
  } else if (res?.status === "ERROR") {
    notify("Clone failed: " + res.message);
  }
}

async function warnAndSwitch(info, tabId) {
  console.log("[bg] warnAndSwitch", info);
  const proceed = await promptUser({
    tabId,
    title: "Switch branches?",
    message: `Repo is on \"${info.currentBranch}\" but URL requests \"${info.expectedBranch}\". Switch branches?`,
    confirmText: "Switch",
    cancelText: "Stay",
  });
  if (!proceed) return;
  const res = await sendNativeMessage({ action: "switchBranch", localPath: info.localPath, branch: info.expectedBranch });
  if (res?.status === "SWITCHED") {
    const openRes = await sendNativeMessage(info.openPayload);
    if (openRes?.status === "OPENED" && tabId) chrome.tabs.update(tabId, { url: "about:blank" });
  } else if (res?.status === "ERROR") {
    notify("Branch switch failed: " + res.message);
  }
}

function notify(message) {
  console.log("[bg] notify", message);
  chrome.notifications?.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "GitHub → VS Code",
    message,
  });
}

async function promptUser({ tabId, title, message, confirmText, cancelText }) {
  const tabChoice = await promptViaExecuteScript(tabId, { title, message });
  if (tabChoice !== null) {
    console.log("[bg] promptUser resolved via executeScript", tabChoice);
    return tabChoice;
  }

  const contentScriptChoice = await promptViaContentScript(tabId, { title, message });
  if (contentScriptChoice !== null) {
    console.log("[bg] promptUser resolved via content script", contentScriptChoice);
    return contentScriptChoice;
  }

  console.log("[bg] promptUser falling back to notification");
  return promptViaNotification({ title, message, confirmText, cancelText });
}

function promptViaExecuteScript(tabId, { title, message }) {
  if (typeof tabId !== "number" || !chrome.scripting) return Promise.resolve(null);
  return chrome.scripting
    .executeScript({
      target: { tabId },
      func: (titleText, messageText) => {
        const text = titleText ? `${titleText}\n\n${messageText}` : messageText;
        try {
          return window.confirm(text);
        } catch (_) {
          return null;
        }
      },
      args: [title, message],
    })
    .then((results) => {
      if (!Array.isArray(results) || !results.length) return null;
      const value = results[0]?.result;
      return typeof value === "boolean" ? value : null;
    })
    .catch((err) => {
      console.warn("[bg] promptViaExecuteScript failed", err?.message || err);
      return null;
    });
}

function promptViaContentScript(tabId, { title, message }) {
  if (typeof tabId !== "number") return Promise.resolve(null);
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: "PROMPT_DECISION", title, message },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn("[bg] promptViaContentScript failed", chrome.runtime.lastError.message);
          resolve(null);
          return;
        }
        if (response && typeof response.confirmed === "boolean") {
          resolve(response.confirmed);
          return;
        }
        resolve(null);
      }
    );
  });
}

function promptViaNotification({ title, message, confirmText, cancelText }) {
  if (!chrome.notifications) {
    console.warn("[bg] notifications API unavailable; defaulting to cancel");
    return Promise.resolve(false);
  }

  const notificationId = `gh-vscode-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const options = {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title,
    message,
    requireInteraction: true,
    buttons: [
      { title: confirmText },
      { title: cancelText },
    ],
  };

  console.log("[bg] promptViaNotification", { notificationId, options });

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (pendingPrompts.delete(notificationId)) {
        resolve(false);
        chrome.notifications.clear(notificationId);
      }
    }, PROMPT_TIMEOUT_MS);

    pendingPrompts.set(notificationId, { resolve, timeout });
    chrome.notifications.create(notificationId, options, () => {
      if (chrome.runtime.lastError) {
        console.error("[bg] promptViaNotification error", chrome.runtime.lastError);
        clearTimeout(timeout);
        pendingPrompts.delete(notificationId);
        resolve(false);
      }
    });
  });
}

function sendNativeMessage(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendNativeMessage(HOST_NAME, payload, (response) => {
      if (chrome.runtime.lastError) {
        console.error("[bg] native message error", chrome.runtime.lastError);
        resolve(null);
        return;
      }
      resolve(response);
    });
  });
}
