const STORAGE_KEYS = {
  CONFIG: "config",
  AUTO_OPEN: "autoOpenEnabled",
};

const DEFAULT_CONFIG = {
  cloneRoot: "~/Documents/Code",
  defaultRemote: "origin",
  groupByOwner: false,
  openMode: "repo",
  defaultEditor: "code",
  editors: [],
};

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

const autoCheckbox = document.getElementById("auto-open");
const groupCheckbox = document.getElementById("group-by-owner");
const chooseBtn = document.getElementById("choose-clone-root");
const cloneRootPathEl = document.getElementById("clone-root-path");
const openBtn = document.getElementById("open-current");
const openOptionsBtn = document.getElementById("open-options");
const statusEl = document.getElementById("status");

let currentConfig = structuredClone(DEFAULT_CONFIG);

init().catch((err) => setStatus(err?.message || String(err), "error"));

autoCheckbox.addEventListener("change", async () => {
  const value = autoCheckbox.checked;
  await storageSet({ [STORAGE_KEYS.AUTO_OPEN]: value });
  setStatus(value ? "Automatic opening enabled." : "Automatic opening disabled.");
});

groupCheckbox.addEventListener("change", async () => {
  currentConfig.groupByOwner = groupCheckbox.checked;
  await persistConfig();
  setStatus(currentConfig.groupByOwner ? "Repos will be grouped by owner." : "Repos will stay flat.");
});

chooseBtn.addEventListener("click", async () => {
  chooseBtn.disabled = true;
  setStatus("Choose a folder in the native dialog…");
  try {
    const response = await sendNative({ action: "chooseCloneRoot" });
    if (!response) {
      setStatus("No response from native helper.", "error");
      return;
    }
    if (response.status === "CANCELLED") {
      setStatus("Folder selection cancelled.");
      return;
    }
    if (response.status === "CHOSEN" && response.path) {
      currentConfig.cloneRoot = normalizePath(response.path);
      await persistConfig();
      updateCloneRootPath(currentConfig.cloneRoot);
      setStatus("Clone root updated.");
      return;
    }
    if (response.status === "ERROR") {
      setStatus(response.message ? `Error: ${response.message}` : "Failed to pick folder.", "error");
      return;
    }
    setStatus(`Unexpected response: ${response.status || "unknown"}`, "error");
  } catch (err) {
    setStatus(err?.message || String(err), "error");
  } finally {
    chooseBtn.disabled = false;
  }
});

openBtn.addEventListener("click", async () => {
  openBtn.disabled = true;
  setStatus("Opening…");
  try {
    const tab = await getActiveTab();
    if (!tab?.url) {
      setStatus("No active tab detected.", "error");
      return;
    }

    const result = await chrome.runtime.sendMessage({
      type: "POPUP_OPEN_URL",
      url: tab.url,
      tabId: tab.id,
    });

    if (result?.handled === false && result?.reason === "notGithub") {
      setStatus("Current tab is not a GitHub URL.", "error");
    } else if (result?.status === "OPENED") {
      setStatus("Opened.");
    } else if (result?.status === "NEEDS_CLONE") {
      setStatus("Clone prompt sent – confirm it in the browser.");
    } else if (result?.status === "WRONG_BRANCH") {
      setStatus("Branch switch prompt sent – confirm to proceed.");
    } else if (result?.status === "ERROR") {
      setStatus(result?.message ? `Error: ${result.message}` : "Failed to open.", "error");
    } else if (result?.status) {
      setStatus(`Action completed with status: ${result.status}.`);
    } else {
      setStatus("No action taken.");
    }
  } catch (err) {
    setStatus(err?.message || String(err), "error");
  } finally {
    openBtn.disabled = false;
  }
});

openOptionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

chrome.storage?.onChanged?.addListener((changes, areaName) => {
  if (areaName !== "sync" && areaName !== "local") return;
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.CONFIG)) {
    applyConfig(changes[STORAGE_KEYS.CONFIG].newValue);
    setStatus("Settings updated.");
  }
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.AUTO_OPEN)) {
    autoCheckbox.checked = changes[STORAGE_KEYS.AUTO_OPEN].newValue !== false;
  }
});

function applyConfig(raw) {
  currentConfig = sanitizeConfig(raw);
  autoCheckbox.checked = autoCheckbox.checked; // no-op to ensure binding
  groupCheckbox.checked = currentConfig.groupByOwner === true;
  updateCloneRootPath(currentConfig.cloneRoot);
}

async function init() {
  const data = await storageGet({
    [STORAGE_KEYS.CONFIG]: null,
    [STORAGE_KEYS.AUTO_OPEN]: true,
  });
  if (data[STORAGE_KEYS.CONFIG]) {
    applyConfig(data[STORAGE_KEYS.CONFIG]);
  } else {
    currentConfig = structuredClone(DEFAULT_CONFIG);
    await persistConfig();
  }
  autoCheckbox.checked = data[STORAGE_KEYS.AUTO_OPEN] !== false;
  groupCheckbox.checked = currentConfig.groupByOwner === true;
  updateCloneRootPath(currentConfig.cloneRoot);
}

function updateCloneRootPath(value) {
  cloneRootPathEl.textContent = value ? value : "(Using default)";
}

function setStatus(text, tone = "info") {
  statusEl.textContent = text || "";
  statusEl.style.color = tone === "error" ? "#c00" : "#555";
}

function normalizePath(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[\\/]+$/, "");
}

function sanitizeConfig(raw) {
  const candidate = raw && typeof raw === "object" ? raw : {};
  const cloneRoot = normalizePath(typeof candidate.cloneRoot === "string" ? candidate.cloneRoot : DEFAULT_CONFIG.cloneRoot);
  const defaultRemote = typeof candidate.defaultRemote === "string" && candidate.defaultRemote.trim()
    ? candidate.defaultRemote.trim()
    : DEFAULT_CONFIG.defaultRemote;
  const groupByOwner = candidate.groupByOwner === true;
  const openMode = candidate.openMode === "file" ? "file" : "repo";
  const defaultEditor = typeof candidate.defaultEditor === "string" ? candidate.defaultEditor : DEFAULT_CONFIG.defaultEditor;
  const editors = Array.isArray(candidate.editors) ? candidate.editors : [];
  return {
    cloneRoot,
    defaultRemote,
    groupByOwner,
    openMode,
    defaultEditor,
    editors,
  };
}

function structuredClone(data) {
  return JSON.parse(JSON.stringify(data));
}

async function persistConfig() {
  await storageSet({ [STORAGE_KEYS.CONFIG]: currentConfig });
}

function sendNative(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage("com.lovelesslabs.vscodeopener", payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs?.[0]);
    });
  });
}
