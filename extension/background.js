import { parseGitHubUrl } from "./url.js";

const HOST_NAME = "com.lovelesslabs.vscodeopener";
const PROMPT_TIMEOUT_MS = 30000;

const STORAGE_KEYS = {
  CONFIG: "config",
  AUTO_OPEN: "autoOpenEnabled",
  REPO_EDITORS: "repoEditorMap",
};

const DEFAULT_EDITORS = [
  {
    id: "code",
    name: "VS Code",
    command: "code",
    args: {
      fileWithLine: ["--reuse-window", "-g", "{path}:{line}"],
      file: ["--reuse-window", "-g", "{path}"],
      fileInRepo: ["--reuse-window", "-g", "{path}:{line}"],
      folder: ["-n", "{path}"],
    },
    alternates: [
      "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
      "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code",
      "code.cmd",
    ],
  },
  {
    id: "rider",
    name: "JetBrains Rider",
    command: "open",
    args: {
      fileWithLine: ["-na", "Rider.app", "--args", "--line", "{line}", "{path}"],
      file: ["-na", "Rider.app", "--args", "{path}"],
      fileInRepo: ["-a", "Rider.app", "--args", "--line", "{line}", "{path}"],
      folder: ["-na", "Rider.app", "--args", "{path}"],
    },
    alternates: [
      "/Applications/Rider.app/Contents/MacOS/rider",
      "/Applications/JetBrains Toolbox/Rider.app/Contents/MacOS/rider",
      "C:/Program Files/JetBrains/Rider/bin/rider64.exe",
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    command: "cursor",
    args: {
      fileWithLine: ["{path}:{line}"],
      file: ["{path}"],
      fileInRepo: ["{path}:{line}"],
      folder: ["{path}"],
    },
    alternates: [
      "/Applications/Cursor.app/Contents/MacOS/Cursor",
      "C:/Users/%USERNAME%/AppData/Local/Programs/cursor-app/cursor.exe",
    ],
  },
];

const DEFAULT_CONFIG = {
  cloneRoot: "~/Documents/Code",
  defaultRemote: "origin",
  groupByOwner: false,
  openMode: "repo",
  defaultEditor: "code",
  editors: DEFAULT_EDITORS,
};

const pendingPrompts = new Map();
const recentIntercepts = new Map();

let currentConfig = structuredClone(DEFAULT_CONFIG);
let autoOpenEnabled = true;
let repoEditorMap = {};
let cloneRootSetting = normalizePath(currentConfig.cloneRoot);
let groupByOwnerSetting = currentConfig.groupByOwner;
let openModeSetting = currentConfig.openMode;
let availableEditors = structuredClone(currentConfig.editors);
let defaultEditorId = currentConfig.defaultEditor;
let nativeHostConnected = false;
let configReadyResolve;
const configReadyPromise = new Promise((resolve) => {
  configReadyResolve = resolve;
});

console.log("[bg] GitHub to IDE service worker initialized");

initializeSettings();
checkNativeHostConnection();

function normalizePath(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[\\/]+$/, "");
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function structuredClone(data) {
  return JSON.parse(JSON.stringify(data));
}

function getStorageAreas() {
  const areas = [];
  if (chrome.storage?.sync) areas.push(chrome.storage.sync);
  if (chrome.storage?.local && chrome.storage.local !== chrome.storage.sync) areas.push(chrome.storage.local);
  return areas;
}

function storageGet(keys) {
  const areas = getStorageAreas();
  if (!areas.length) return Promise.resolve({});
  let index = 0;
  return new Promise((resolve) => {
    const tryNext = () => {
      const area = areas[index];
      area.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          index += 1;
          if (index >= areas.length) {
            resolve({});
          } else {
            tryNext();
          }
        } else {
          resolve(result || {});
        }
      });
    };
    tryNext();
  });
}

function storageSet(values) {
  const areas = getStorageAreas();
  if (!areas.length) return Promise.resolve();
  let index = 0;
  let lastError = null;
  return new Promise((resolve, reject) => {
    const tryNext = () => {
      if (index >= areas.length) {
        if (lastError) reject(lastError);
        else resolve();
        return;
      }
      const area = areas[index];
      area.set(values, () => {
        if (chrome.runtime.lastError) {
          lastError = new Error(chrome.runtime.lastError.message);
          index += 1;
          tryNext();
        } else {
          resolve();
        }
      });
    };
    tryNext();
  });
}

function initializeSettings() {
  storageGet({
    [STORAGE_KEYS.CONFIG]: null,
    [STORAGE_KEYS.AUTO_OPEN]: false,
    [STORAGE_KEYS.REPO_EDITORS]: {},
    cloneRoot: undefined,
    groupByOwner: undefined,
    defaultEditor: undefined,
    openMode: undefined,
    root: undefined,
  }).then((data) => {
    let config = data[STORAGE_KEYS.CONFIG];
    if (!config) {
      config = migrateLegacyConfig(data);
      storageSet({ [STORAGE_KEYS.CONFIG]: config }).catch((err) => console.warn("[bg] failed to persist migrated config", err?.message || err));
    }

    applyConfig(config);

    autoOpenEnabled = data[STORAGE_KEYS.AUTO_OPEN] === true;
    repoEditorMap = isPlainObject(data[STORAGE_KEYS.REPO_EDITORS]) ? data[STORAGE_KEYS.REPO_EDITORS] : {};

    configReadyResolve();
  });
}

function migrateLegacyConfig(data) {
  const legacy = {
    cloneRoot: data.cloneRoot ?? data.root ?? DEFAULT_CONFIG.cloneRoot,
    defaultRemote: DEFAULT_CONFIG.defaultRemote,
    groupByOwner: data.groupByOwner === true,
    openMode: data.openMode === "file" ? "file" : DEFAULT_CONFIG.openMode,
    defaultEditor: typeof data.defaultEditor === "string" ? data.defaultEditor : DEFAULT_CONFIG.defaultEditor,
    editors: DEFAULT_EDITORS,
  };
  return sanitizeConfig(legacy);
}

function sanitizeConfig(raw) {
  const candidate = isPlainObject(raw) ? raw : {};
  const cloneRoot = normalizePath(typeof candidate.cloneRoot === "string" ? candidate.cloneRoot : DEFAULT_CONFIG.cloneRoot);
  const defaultRemote = typeof candidate.defaultRemote === "string" && candidate.defaultRemote.trim()
    ? candidate.defaultRemote.trim()
    : DEFAULT_CONFIG.defaultRemote;
  const groupByOwner = candidate.groupByOwner === true;
  const openMode = candidate.openMode === "file" ? "file" : "repo";
  const editors = sanitizeEditors(candidate.editors);
  const defaultEditor = editors.some((ed) => ed.id === candidate.defaultEditor)
    ? candidate.defaultEditor
    : (editors[0]?.id || DEFAULT_CONFIG.defaultEditor);

  return {
    cloneRoot,
    defaultRemote,
    groupByOwner,
    openMode,
    defaultEditor,
    editors,
  };
}

function sanitizeEditors(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set();
  const cleaned = list
    .map((entry) => sanitizeEditor(entry))
    .filter((entry) => {
      if (!entry) return false;
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
  if (cleaned.length) return cleaned;
  return structuredClone(DEFAULT_EDITORS);
}

function sanitizeEditor(entry) {
  if (!entry || typeof entry !== "object") return null;
  const id = typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : null;
  if (!id) return null;
  const name = typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : id;
  const command = typeof entry.command === "string" && entry.command.trim() ? entry.command.trim() : null;
  const alternates = Array.isArray(entry.alternates)
    ? entry.alternates.filter((alt) => typeof alt === "string" && alt.trim()).map((alt) => alt.trim())
    : [];
  if (!command && alternates.length === 0) return null;

  const args = {};
  ["fileWithLine", "file", "fileInRepo", "folder"].forEach((key) => {
    if (Array.isArray(entry.args?.[key])) {
      args[key] = entry.args[key].map((part) => String(part));
    }
  });

  return {
    id,
    name,
    command,
    alternates,
    args,
  };
}

function applyConfig(config) {
  const sanitized = sanitizeConfig(config);
  currentConfig = sanitized;
  cloneRootSetting = sanitized.cloneRoot;
  groupByOwnerSetting = sanitized.groupByOwner;
  openModeSetting = sanitized.openMode;
  availableEditors = structuredClone(sanitized.editors);
  defaultEditorId = sanitized.defaultEditor;
  console.log("[bg] applied config", {
    cloneRootSetting,
    groupByOwnerSetting,
    openModeSetting,
    editorCount: availableEditors.length,
    defaultEditorId,
  });
}

function persistConfig() {
  storageSet({ [STORAGE_KEYS.CONFIG]: currentConfig }).catch((err) => {
    console.warn("[bg] failed to persist config", err?.message || err);
  });
}

function buildHostConfig() {
  return structuredClone(currentConfig);
}

function repoKey(owner, repo) {
  if (!owner || !repo) return null;
  return `${owner}/${repo}`.toLowerCase();
}

function isValidEditorId(editorId) {
  if (!editorId) return false;
  return availableEditors.some((editor) => editor.id === editorId);
}

function getEffectiveDefaultEditor() {
  if (defaultEditorId && isValidEditorId(defaultEditorId)) return defaultEditorId;
  return availableEditors[0]?.id || null;
}

function getEditorForRepo(owner, repo) {
  const key = repoKey(owner, repo);
  if (!key) return getEffectiveDefaultEditor();
  const preferred = repoEditorMap[key];
  if (preferred && isValidEditorId(preferred)) return preferred;
  return getEffectiveDefaultEditor();
}

function setRepoEditorPreference(owner, repo, editorId) {
  const key = repoKey(owner, repo);
  if (!key) return;
  if (!isValidEditorId(editorId)) return;
  if (repoEditorMap[key] === editorId) return;
  repoEditorMap = { ...repoEditorMap, [key]: editorId };
  storageSet({ [STORAGE_KEYS.REPO_EDITORS]: repoEditorMap }).catch((err) => {
    console.warn("[bg] failed to persist repo editor preference", err?.message || err);
  });
}

chrome.storage?.onChanged?.addListener((changes, areaName) => {
  if (areaName !== "sync" && areaName !== "local") return;
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.CONFIG)) {
    applyConfig(changes[STORAGE_KEYS.CONFIG].newValue);
  }
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.AUTO_OPEN)) {
    autoOpenEnabled = changes[STORAGE_KEYS.AUTO_OPEN].newValue === true;
  }
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.REPO_EDITORS)) {
    const { newValue } = changes[STORAGE_KEYS.REPO_EDITORS];
    repoEditorMap = isPlainObject(newValue) ? newValue : {};
  }
});

chrome.notifications?.onButtonClicked.addListener((notificationId, buttonIndex) => {
  // Handle first-run notification button clicks (open options)
  if (buttonIndex === 0 && !pendingPrompts.has(notificationId)) {
    chrome.runtime.openOptionsPage();
    chrome.notifications.clear(notificationId);
    return;
  }
  
  // Handle existing prompt notifications
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

chrome.runtime.onInstalled.addListener((details) => {
  console.log("GitHub to IDE installed.");
  storageGet({ [STORAGE_KEYS.CONFIG]: null }).then((data) => {
    if (!data[STORAGE_KEYS.CONFIG]) {
      storageSet({ [STORAGE_KEYS.CONFIG]: DEFAULT_CONFIG }).catch(() => {});
    }
  });
  storageSet({ [STORAGE_KEYS.AUTO_OPEN]: false }).catch(() => {});
  
  // Show first-run notification
  if (details.reason === "install") {
    showFirstRunNotification();
  }
});

function showFirstRunNotification() {
  chrome.notifications?.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "GitHub to IDE - Setup Required",
    message: "Welcome! Please open the extension options to complete setup. You'll need to install a native helper to connect to your IDE.",
    priority: 2,
    buttons: [
      { title: "Open Options" },
      { title: "Dismiss" },
    ],
  }, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.warn("[bg] failed to show first-run notification", chrome.runtime.lastError.message);
    }
  });
}

chrome.webNavigation?.onBeforeNavigate?.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const result = await maybeIntercept(details.url, details.tabId);
  if (result?.handled) {
    console.log("[bg] navigation handled", result);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "GITHUB_LINK_CLICK") {
    maybeIntercept(msg.url, sender.tab?.id).then((result) => sendResponse?.(result));
    return true;
  }

  if (msg?.type === "POPUP_OPEN_URL") {
    maybeIntercept(msg.url, msg.tabId, {
      force: true,
      editorId: msg.editorId,
      setRepoEditor: msg.setRepoEditor === true,
      openMode: msg.openMode,
    }).then((result) => sendResponse?.(result));
    return true;
  }

  if (msg?.type === "CONTENT_OPEN_URL") {
    maybeIntercept(msg.url, sender.tab?.id, {
      force: true,
      editorId: msg.editorId,
      setRepoEditor: msg.setRepoEditor === true,
      openMode: msg.openMode,
    }).then((result) => sendResponse?.(result));
    return true;
  }

  if (msg?.type === "GET_EDITOR_OPTIONS") {
    configReadyPromise
      .then(() => {
        let gh = {};
        try {
          gh = parseGitHubUrl(msg.url || "");
        } catch (err) {
          console.warn("[bg] failed to parse URL for editor options", err);
        }
        const editorId = gh.owner && gh.repo ? getEditorForRepo(gh.owner, gh.repo) : getEffectiveDefaultEditor();
        sendResponse?.({
          editors: availableEditors,
          defaultEditorId: getEffectiveDefaultEditor(),
          selectedEditorId: editorId,
          repoKey: gh.owner && gh.repo ? repoKey(gh.owner, gh.repo) : null,
          openMode: openModeSetting,
        });
      })
      .catch((err) => {
        console.error("[bg] failed to provide editor options", err);
        sendResponse?.({ error: err?.message || String(err) });
      });
    return true;
  }

  if (msg?.type === "SET_OPEN_MODE") {
    const mode = msg.openMode === "file" ? "file" : "repo";
    if (mode !== openModeSetting) {
      openModeSetting = mode;
      currentConfig.openMode = mode;
      persistConfig();
    }
    sendResponse?.({ status: "OK", openMode: mode });
    return true;
  }

  return false;
});

async function maybeIntercept(url, tabId, { force = false, editorId: overrideEditorId, setRepoEditor = false, openMode: overrideOpenMode } = {}) {
  if (!url?.startsWith("https://github.com/")) return { handled: false, reason: "notGithub" };
  if (!force && !autoOpenEnabled) return { handled: false, reason: "autoOpenDisabled" };

  if (!force) {
    const dedupeKey = `${tabId ?? "no-tab"}::${url}`;
    const now = Date.now();
    const last = recentIntercepts.get(dedupeKey);
    if (last && now - last < 1000) return { handled: false, reason: "duplicate" };
    recentIntercepts.set(dedupeKey, now);
    setTimeout(() => {
      if (recentIntercepts.get(dedupeKey) === now) recentIntercepts.delete(dedupeKey);
    }, 2000);
  }

  await configReadyPromise;

  try {
    const gh = parseGitHubUrl(url);
    if (!gh.owner || !gh.repo) return { handled: false, reason: "missingRepo" };

    let editorId = overrideEditorId && isValidEditorId(overrideEditorId) ? overrideEditorId : getEditorForRepo(gh.owner, gh.repo);
    if (!editorId) editorId = getEffectiveDefaultEditor();
    if (setRepoEditor && overrideEditorId && isValidEditorId(overrideEditorId)) {
      setRepoEditorPreference(gh.owner, gh.repo, overrideEditorId);
      editorId = overrideEditorId;
    }

    const openMode = overrideOpenMode === "file" || overrideOpenMode === "repo" ? overrideOpenMode : openModeSetting;

    const query = {
      action: "resolve",
      url,
      owner: gh.owner,
      repo: gh.repo,
      branch: gh.branch,
      commit: gh.commit,
      filepath: gh.filepath,
      line: gh.line,
      editorId,
      openMode,
      config: buildHostConfig(),
    };

    const response = await sendNativeMessage(query);
    if (!response) return { handled: true, status: "NO_RESPONSE", editorId, openMode };

    switch (response.status) {
      case "OPENED":
        return { handled: true, status: "OPENED", editorId, openMode };
      case "NEEDS_CLONE":
        await confirmAndClone(response, tabId);
        return { handled: true, status: "NEEDS_CLONE", editorId, openMode };
      case "WRONG_BRANCH":
        await warnAndSwitch(response, tabId);
        return { handled: true, status: "WRONG_BRANCH", editorId, openMode };
      case "ERROR":
        notify("GitHub to IDE: " + response.message);
        return { handled: true, status: "ERROR", message: response.message, editorId, openMode };
      default:
        return { handled: true, status: response.status || "UNKNOWN", editorId, openMode };
    }
  } catch (e) {
    console.error("[bg] maybeIntercept error", e);
    return { handled: true, status: "ERROR", message: e?.message || String(e) };
  }
}

async function confirmAndClone(info, tabId) {
  const confirmed = await promptUser({
    tabId,
    title: "Clone repository?",
    message: `Clone ${info.remote} to ${info.localPath}?`,
    confirmText: "Clone",
    cancelText: "Cancel",
  });
  if (!confirmed) return;
  const res = await sendNativeMessage({ action: "clone", remote: info.remote, localPath: info.localPath, config: buildHostConfig() });
  if (res?.status === "CLONED") {
    const openRes = await sendNativeMessage(info.openPayload);
    if (openRes?.status !== "OPENED") notify("GitHub to IDE: Clone completed but opening failed.");
  } else if (res?.status === "ERROR") {
    notify("Clone failed: " + res.message);
  }
}

async function warnAndSwitch(info, tabId) {
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
    if (openRes?.status !== "OPENED") notify("GitHub to IDE: Branch switched but opening failed.");
  } else if (res?.status === "ERROR") {
    notify("Branch switch failed: " + res.message);
  }
}

function notify(message) {
  chrome.notifications?.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "GitHub to IDE",
    message,
  });
}

async function promptUser({ tabId, title, message, confirmText, cancelText }) {
  const tabChoice = await promptViaExecuteScript(tabId, { title, message });
  if (tabChoice !== null) return tabChoice;

  const contentScriptChoice = await promptViaContentScript(tabId, { title, message });
  if (contentScriptChoice !== null) return contentScriptChoice;

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
  if (!chrome.notifications) return Promise.resolve(false);

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
        updateNativeHostStatus(false);
        resolve(null);
        return;
      }
      updateNativeHostStatus(true);
      resolve(response);
    });
  });
}

function checkNativeHostConnection() {
  chrome.runtime.sendNativeMessage(HOST_NAME, { action: "ping" }, (response) => {
    if (chrome.runtime.lastError) {
      updateNativeHostStatus(false);
      console.log("[bg] native host not connected:", chrome.runtime.lastError.message);
    } else if (response?.status === "PONG") {
      updateNativeHostStatus(true);
      console.log("[bg] native host connected");
    } else {
      updateNativeHostStatus(false);
      console.log("[bg] native host responded with unexpected status");
    }
  });
}

function updateNativeHostStatus(connected) {
  if (nativeHostConnected === connected) return;
  nativeHostConnected = connected;
  
  if (chrome.action?.setBadgeText && chrome.action?.setBadgeBackgroundColor) {
    if (!connected) {
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#cf222e" });
      chrome.action.setTitle({ title: "GitHub to IDE - Native host not connected. Click to open options." });
    } else {
      chrome.action.setBadgeText({ text: "" });
      chrome.action.setTitle({ title: "GitHub to IDE" });
    }
  }
}
