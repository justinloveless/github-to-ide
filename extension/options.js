const STORAGE_KEYS = {
  CONFIG: "config",
  AUTO_OPEN: "autoOpenEnabled",
  REPO_EDITORS: "repoEditorMap",
  DARK_MODE: "darkMode",
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
const darkModeToggle = document.getElementById("dark-mode-toggle");
const rootInput = document.getElementById("clone-root");
const chooseBtn = document.getElementById("choose-clone-root");
const remoteInput = document.getElementById("default-remote");
const groupCheckbox = document.getElementById("group-by-owner");
const openModeRadios = document.querySelectorAll('input[name="open-mode"]');
const defaultEditorSelect = document.getElementById("default-editor");
const editorsTextarea = document.getElementById("editors-json");
const saveBtn = document.getElementById("save");
const resetBtn = document.getElementById("reset");
const testConnectionBtn = document.getElementById("test-connection");
const connectionStatusEl = document.getElementById("connection-status");
const repoListContainer = document.getElementById("repo-editor-list");
const clearRepoBtn = document.getElementById("clear-repo-overrides");
const nativeHostCommandEl = document.getElementById("native-host-command");
const copyCommandBtn = document.getElementById("copy-native-host-command");
const statusEl = document.getElementById("status");

let currentConfig = structuredClone(DEFAULT_CONFIG);
let repoEditorMap = {};

init().catch((err) => setStatus(err?.message || String(err), "error"));

async function init() {
  const data = await storageGet({
    [STORAGE_KEYS.CONFIG]: null,
    [STORAGE_KEYS.AUTO_OPEN]: false,
    [STORAGE_KEYS.REPO_EDITORS]: {},
    [STORAGE_KEYS.DARK_MODE]: false,
  });

  if (data[STORAGE_KEYS.CONFIG]) {
    applyConfig(data[STORAGE_KEYS.CONFIG]);
  } else {
    currentConfig = structuredClone(DEFAULT_CONFIG);
    await storageSet({ [STORAGE_KEYS.CONFIG]: currentConfig });
  }

  autoCheckbox.checked = data[STORAGE_KEYS.AUTO_OPEN] === true;
  darkModeToggle.checked = data[STORAGE_KEYS.DARK_MODE] === true;
  repoEditorMap = isPlainObject(data[STORAGE_KEYS.REPO_EDITORS]) ? data[STORAGE_KEYS.REPO_EDITORS] : {};
  renderConfig();
  updateNativeHostCommand();
  applyDarkMode(data[STORAGE_KEYS.DARK_MODE] === true);
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
  renderRepoOverrides();
  updateNativeHostCommand();
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
  autoCheckbox.checked = false;
  await storageSet({
    [STORAGE_KEYS.CONFIG]: currentConfig,
    [STORAGE_KEYS.AUTO_OPEN]: false,
    [STORAGE_KEYS.REPO_EDITORS]: {},
  });
  repoEditorMap = {};
  renderRepoOverrides();
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

darkModeToggle.addEventListener("change", async () => {
  try {
    await storageSet({ [STORAGE_KEYS.DARK_MODE]: darkModeToggle.checked });
    applyDarkMode(darkModeToggle.checked);
    setStatus(darkModeToggle.checked ? "Dark mode enabled." : "Dark mode disabled.");
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

testConnectionBtn.addEventListener("click", async () => {
  testConnectionBtn.disabled = true;
  setConnectionStatus("Testing native host connection…", "info");
  try {
    const response = await sendNative({ action: "ping" });
    if (response && response.status === "PONG") {
      setConnectionStatus("✅ Native host is connected and working!", "success");
      setStatus("Native host connection successful.");
    } else if (response) {
      setConnectionStatus(`⚠️ Unexpected response: ${response.status || "unknown"}`, "warning");
      setStatus("Native host responded but with unexpected status.", "error");
    } else {
      setConnectionStatus("❌ No response from native host.", "error");
      setStatus("Native host is not responding. Please install it using the command below.", "error");
    }
  } catch (err) {
    setConnectionStatus("❌ Native host not installed or not working.", "error");
    setStatus("Native host connection failed. Please install it using the command below.", "error");
  } finally {
    testConnectionBtn.disabled = false;
  }
});

if (copyCommandBtn) {
  copyCommandBtn.addEventListener("click", async () => {
    const command = nativeHostCommandEl?.textContent?.trim();
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setStatus("Install command copied to clipboard.");
    } catch (err) {
      setStatus(err?.message || String(err), "error");
    }
  });
}

if (clearRepoBtn) {
  clearRepoBtn.addEventListener("click", async () => {
    if (!Object.keys(repoEditorMap).length) return;
    repoEditorMap = {};
    renderRepoOverrides();
    try {
      await storageSet({ [STORAGE_KEYS.REPO_EDITORS]: repoEditorMap });
      setStatus("Cleared per-repository overrides.");
    } catch (err) {
      setStatus(err?.message || String(err), "error");
    }
  });
}

if (repoListContainer) {
  repoListContainer.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const repoKey = target.dataset.repoKey;
    if (!repoKey) return;
    delete repoEditorMap[repoKey];
    renderRepoOverrides();
    try {
      await storageSet({ [STORAGE_KEYS.REPO_EDITORS]: repoEditorMap });
      setStatus(`Removed override for ${repoKey}.`);
    } catch (err) {
      setStatus(err?.message || String(err), "error");
    }
  });
}

chrome.storage?.onChanged?.addListener((changes, areaName) => {
  if (areaName !== "sync" && areaName !== "local") return;
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.CONFIG)) {
    applyConfig(changes[STORAGE_KEYS.CONFIG].newValue);
    renderConfig();
    setStatus("Settings updated in another window.");
    updateNativeHostCommand();
  }
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.AUTO_OPEN)) {
    autoCheckbox.checked = changes[STORAGE_KEYS.AUTO_OPEN].newValue === true;
  }
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.DARK_MODE)) {
    const isDark = changes[STORAGE_KEYS.DARK_MODE].newValue === true;
    darkModeToggle.checked = isDark;
    applyDarkMode(isDark);
  }
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.REPO_EDITORS)) {
    repoEditorMap = isPlainObject(changes[STORAGE_KEYS.REPO_EDITORS].newValue)
      ? changes[STORAGE_KEYS.REPO_EDITORS].newValue
      : {};
    renderRepoOverrides();
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

function renderRepoOverrides() {
  if (!repoListContainer) return;
  repoListContainer.innerHTML = "";
  const entries = Object.entries(repoEditorMap || {}).sort(([a], [b]) => a.localeCompare(b));
  if (clearRepoBtn) clearRepoBtn.disabled = entries.length === 0;
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "repo-list-empty";
    empty.textContent = "No overrides saved.";
    repoListContainer.appendChild(empty);
    return;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Repository", "Editor", "Actions"].forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  entries.forEach(([repoKey, editorId]) => {
    const tr = document.createElement("tr");

    const repoTd = document.createElement("td");
    repoTd.textContent = repoKey;
    tr.appendChild(repoTd);

    const editorTd = document.createElement("td");
    const editor = currentConfig.editors.find((ed) => ed.id === editorId);
    editorTd.textContent = editor ? `${editor.name} (${editor.id})` : editorId;
    tr.appendChild(editorTd);

    const actionTd = document.createElement("td");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Remove";
    btn.dataset.repoKey = repoKey;
    actionTd.appendChild(btn);
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  repoListContainer.appendChild(table);
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function updateNativeHostCommand() {
  if (!nativeHostCommandEl) return;
  const extensionId = chrome.runtime?.id || "<extension-id>";
  const command = `npx gh2idehost --extension-id ${extensionId}`;
  nativeHostCommandEl.textContent = command;
}

function setStatus(text, tone = "info") {
  statusEl.textContent = text || "";
  statusEl.style.color = tone === "error" ? "#c00" : "#555";
}

function setConnectionStatus(text, tone = "info") {
  if (!connectionStatusEl) return;
  connectionStatusEl.textContent = text || "";
  connectionStatusEl.style.display = text ? "block" : "none";
  if (tone === "success") {
    connectionStatusEl.style.background = "#dff6dd";
    connectionStatusEl.style.border = "1px solid #2da44e";
    connectionStatusEl.style.color = "#1a7f37";
  } else if (tone === "error") {
    connectionStatusEl.style.background = "#ffebe9";
    connectionStatusEl.style.border = "1px solid #cf222e";
    connectionStatusEl.style.color = "#a40e26";
  } else if (tone === "warning") {
    connectionStatusEl.style.background = "#fff8c5";
    connectionStatusEl.style.border = "1px solid #d4a72c";
    connectionStatusEl.style.color = "#76540d";
  } else {
    connectionStatusEl.style.background = "#ddf4ff";
    connectionStatusEl.style.border = "1px solid #54aeff";
    connectionStatusEl.style.color = "#0969da";
  }
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

function applyDarkMode(enabled) {
  if (enabled) {
    document.documentElement.classList.add('dark-mode');
    document.body.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
    document.body.classList.remove('dark-mode');
  }
}
