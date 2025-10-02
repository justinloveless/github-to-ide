const STORAGE_KEYS = {
  CONFIG: "config",
  AUTO_OPEN: "autoOpenEnabled",
};

const DEFAULT_EDITORS = [
  {
    id: "code",
    name: "VS Code",
    command: "code",
    alternates: [
      "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
      "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code",
      "code.cmd",
    ],
    args: {
      fileWithLine: ["--reuse-window", "-g", "{path}:{line}"],
      file: ["--reuse-window", "-g", "{path}"],
      fileInRepo: ["--reuse-window", "-g", "{path}:{line}"],
      folder: ["-n", "{path}"],
    },
  },
  {
    id: "rider",
    name: "JetBrains Rider",
    command: "open",
    alternates: [
      "/Applications/Rider.app/Contents/MacOS/rider",
      "/Applications/JetBrains Toolbox/Rider.app/Contents/MacOS/rider",
      "C:/Program Files/JetBrains/Rider/bin/rider64.exe",
    ],
    args: {
      fileWithLine: ["-na", "Rider.app", "--args", "--line", "{line}", "{path}"],
      file: ["-na", "Rider.app", "--args", "{path}"],
      fileInRepo: ["-a", "Rider.app", "--args", "--line", "{line}", "{path}"],
      folder: ["-na", "Rider.app", "--args", "{path}"],
    },
  },
  {
    id: "cursor",
    name: "Cursor",
    command: "cursor",
    alternates: [
      "/Applications/Cursor.app/Contents/MacOS/Cursor",
      "C:/Users/%USERNAME%/AppData/Local/Programs/cursor-app/cursor.exe",
    ],
    args: {
      fileWithLine: ["{path}:{line}"],
      file: ["{path}"],
      fileInRepo: ["{path}:{line}"],
      folder: ["{path}"],
    },
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
const rootInput = document.getElementById("clone-root");
const chooseBtn = document.getElementById("choose-clone-root");
const remoteInput = document.getElementById("default-remote");
const groupCheckbox = document.getElementById("group-by-owner");
const openModeRadios = document.querySelectorAll('input[name="open-mode"]');
const defaultEditorSelect = document.getElementById("default-editor");
const editorsTextarea = document.getElementById("editors-json");
const saveBtn = document.getElementById("save");
const resetBtn = document.getElementById("reset");
const openBtn = document.getElementById("open-current");
const statusEl = document.getElementById("status");

let currentConfig = structuredClone(DEFAULT_CONFIG);

init().catch((err) => setStatus(err?.message || String(err), "error"));

async function init() {
  const data = await storageGet({
    [STORAGE_KEYS.CONFIG]: null,
    [STORAGE_KEYS.AUTO_OPEN]: true,
  });

  if (data[STORAGE_KEYS.CONFIG]) {
    applyConfig(data[STORAGE_KEYS.CONFIG]);
  } else {
    currentConfig = structuredClone(DEFAULT_CONFIG);
    await storageSet({ [STORAGE_KEYS.CONFIG]: currentConfig });
  }

  autoCheckbox.checked = data[STORAGE_KEYS.AUTO_OPEN] !== false;
  renderConfig();
}

function applyConfig(raw) {
  currentConfig = sanitizeConfig(raw);
}

function renderConfig() {
  rootInput.value = currentConfig.cloneRoot || "";
  remoteInput.value = currentConfig.defaultRemote || "origin";
  groupCheckbox.checked = currentConfig.groupByOwner === true;
  for (const radio of openModeRadios) {
    radio.checked = radio.value === currentConfig.openMode;
  }
  updateEditorControls();
}

function updateEditorControls() {
  defaultEditorSelect.innerHTML = "";
  currentConfig.editors.forEach((editor) => {
    const option = document.createElement("option");
    option.value = editor.id;
    option.textContent = `${editor.name} (${editor.id})`;
    defaultEditorSelect.appendChild(option);
  });
  if (currentConfig.editors.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No editors configured";
    defaultEditorSelect.appendChild(option);
  }
  defaultEditorSelect.value = currentConfig.defaultEditor;
  editorsTextarea.value = JSON.stringify(currentConfig.editors, null, 2);
}

saveBtn.addEventListener("click", async () => {
  try {
    const editors = parseEditors(editorsTextarea.value);
    const config = sanitizeConfig({
      cloneRoot: rootInput.value,
      defaultRemote: remoteInput.value,
      groupByOwner: groupCheckbox.checked,
      openMode: getSelectedOpenMode(),
      defaultEditor: defaultEditorSelect.value,
      editors,
    });
    currentConfig = config;
    await storageSet({
      [STORAGE_KEYS.CONFIG]: currentConfig,
      [STORAGE_KEYS.AUTO_OPEN]: autoCheckbox.checked,
    });
    setStatus("Settings saved.");
    renderConfig();
  } catch (err) {
    setStatus(err?.message || String(err), "error");
  }
});

resetBtn.addEventListener("click", async () => {
  currentConfig = structuredClone(DEFAULT_CONFIG);
  autoCheckbox.checked = true;
  await storageSet({
    [STORAGE_KEYS.CONFIG]: currentConfig,
    [STORAGE_KEYS.AUTO_OPEN]: true,
  });
  renderConfig();
  setStatus("Reset to defaults.");
});

autoCheckbox.addEventListener("change", async () => {
  try {
    await storageSet({ [STORAGE_KEYS.AUTO_OPEN]: autoCheckbox.checked });
    setStatus(autoCheckbox.checked ? "Automatic opening enabled." : "Automatic opening disabled.");
  } catch (err) {
    setStatus(err?.message || String(err), "error");
  }
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
      rootInput.value = normalizePath(response.path);
      setStatus("Clone root updated – click Save to persist.");
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

chrome.storage?.onChanged?.addListener((changes, areaName) => {
  if (areaName !== "sync" && areaName !== "local") return;
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.CONFIG)) {
    applyConfig(changes[STORAGE_KEYS.CONFIG].newValue);
    renderConfig();
    setStatus("Settings updated in another window.");
  }
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.AUTO_OPEN)) {
    autoCheckbox.checked = changes[STORAGE_KEYS.AUTO_OPEN].newValue !== false;
  }
});

function getSelectedOpenMode() {
  for (const radio of openModeRadios) {
    if (radio.checked) return radio.value === "file" ? "file" : "repo";
  }
  return "repo";
}

function parseEditors(text) {
  if (!text.trim()) return [];
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Editors must be an array.");
    return parsed;
  } catch (err) {
    throw new Error(`Invalid editors JSON: ${err.message}`);
  }
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
    .filter((editor) => {
      if (!editor) return false;
      if (seen.has(editor.id)) return false;
      seen.add(editor.id);
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
  return { id, name, command, alternates, args };
}

function structuredClone(data) {
  return JSON.parse(JSON.stringify(data));
}

function setStatus(text, tone = "info") {
  statusEl.textContent = text || "";
  statusEl.style.color = tone === "error" ? "#c00" : "#555";
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
