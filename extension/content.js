console.log("[content] script loaded");

const STORAGE_KEY = "autoOpenEnabled";
const STORAGE_OPEN_MODE = "openMode";
const HEADER_CONTAINER_CLASS = "gh-vscode-header-group";
const HEADER_MAIN_BUTTON_CLASS = "gh-vscode-header-button";
const HEADER_TOGGLE_CLASS = "gh-vscode-header-toggle";
const MENU_CONTAINER_CLASS = "gh-vscode-editor-menu";
const MENU_ITEM_CLASS = "gh-vscode-editor-menu-item";
const MENU_DIVIDER_CLASS = "gh-vscode-menu-divider";
const MENU_SECTION_TITLE_CLASS = "gh-vscode-menu-title";
const OPEN_MODE_REPO = "repo";
const OPEN_MODE_FILE = "file";
const STATE_CLASSES = ["is-working", "is-success", "is-error"];

let autoOpenEnabled = true;
let headerObserver = null;
let headerElements = null; // { container, mainButton, labelSpan, dropdown, toggleSummary, menu }
let currentEditors = [];
let selectedEditorId = null;
let currentRepoKey = null;
let mainButtonResetTimer = null;
let editorsRequestInflight = false;
let currentOpenMode = OPEN_MODE_REPO;

loadSetting();
setupAutoOpenClickListener();
setupHeaderUI();

const initialStorageArea = chrome.storage?.sync || chrome.storage?.local;
initialStorageArea?.get?.([STORAGE_KEY], (data) => {
  autoOpenEnabled = data?.[STORAGE_KEY] !== false;
});

chrome.storage?.onChanged?.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY)) {
    autoOpenEnabled = changes[STORAGE_KEY].newValue !== false;
    console.log("[content] autoOpen setting changed", { autoOpenEnabled });
  }
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_OPEN_MODE)) {
    const value = changes[STORAGE_OPEN_MODE].newValue === OPEN_MODE_FILE ? OPEN_MODE_FILE : OPEN_MODE_REPO;
    if (value !== currentOpenMode) {
      currentOpenMode = value;
      updateHeaderUI();
    }
  }
});

function loadSetting() {
  const area = chrome.storage?.sync || chrome.storage?.local;
  area?.get?.([STORAGE_KEY], (data) => {
    autoOpenEnabled = data?.[STORAGE_KEY] !== false;
    console.log("[content] autoOpen setting", { autoOpenEnabled });
  });
}

function setupAutoOpenClickListener() {
  addEventListener("click", (e) => {
    if (!autoOpenEnabled) return;
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.button !== 0 && e.button !== undefined) return;
    const a = e.target?.closest?.("a[href]");
    if (!a) return;

    const url = a.href;
    if (!url || !url.startsWith("https://github.com/")) return;

    chrome.runtime.sendMessage({ type: "GITHUB_LINK_CLICK", url });
  });
}

function setupHeaderUI() {
  injectHeaderStyles();
  const init = () => {
    attachHeaderButton();
    refreshEditorOptions();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  document.addEventListener("pjax:end", refreshEditorOptions);
  document.addEventListener("turbo:render", refreshEditorOptions);

  if (!headerObserver && window.MutationObserver) {
    headerObserver = new MutationObserver(() => {
      attachHeaderButton();
    });
    headerObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  document.addEventListener("click", (event) => {
    if (!headerElements) return;
    if (!headerElements.container.contains(event.target)) {
      headerElements.dropdown.open = false;
    }
  });
}

function injectHeaderStyles() {
  if (document.getElementById("gh-vscode-header-style")) return;
  const style = document.createElement("style");
  style.id = "gh-vscode-header-style";
  style.textContent = `
.${HEADER_CONTAINER_CLASS} {
  display: inline-flex;
  align-items: stretch;
  position: relative;
  gap: 0;
}
.${HEADER_MAIN_BUTTON_CLASS}, .${HEADER_TOGGLE_CLASS} {
  width: auto;
  min-width: 0;
  height: auto;
  line-height: inherit;
}
.${HEADER_MAIN_BUTTON_CLASS}.${STATE_CLASSES[0]} {
  opacity: 0.7;
}
.${HEADER_MAIN_BUTTON_CLASS}.${STATE_CLASSES[1]} {
  box-shadow: 0 0 0 1px rgba(46, 160, 67, 0.6);
}
.${HEADER_MAIN_BUTTON_CLASS}.${STATE_CLASSES[2]} {
  box-shadow: 0 0 0 1px rgba(255, 99, 71, 0.6);
}
.${HEADER_TOGGLE_CLASS} {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}
.${HEADER_TOGGLE_CLASS}[aria-disabled="true"] {
  pointer-events: none;
  opacity: 0.5;
}
.gh-vscode-header-dropdown summary {
  list-style: none;
}
.${HEADER_TOGGLE_CLASS}::marker {
  content: "";
}
.gh-vscode-header-dropdown {
  display: inline-flex;
  position: relative;
  margin: 0;
}
.${MENU_CONTAINER_CLASS} {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 180px;
  padding: 6px 0;
  background: var(--bgColor-default, #161b22);
  border: 1px solid var(--borderColor-default, rgba(240, 246, 252, 0.1));
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(140, 149, 159, 0.2);
  z-index: 9999;
}
.${MENU_CONTAINER_CLASS}[hidden] {
  display: none;
}
.${MENU_ITEM_CLASS} {
  width: 100%;
  padding: 6px 12px;
  background: none;
  border: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  font: inherit;
}
.${MENU_ITEM_CLASS}:hover,
.${MENU_ITEM_CLASS}:focus {
  background: rgba(110, 118, 129, 0.2);
}
.${MENU_ITEM_CLASS}.is-selected::after {
  content: "✔";
  float: right;
}
.${MENU_DIVIDER_CLASS} {
  height: 1px;
  margin: 4px 0;
  background: rgba(110, 118, 129, 0.4);
}
.${MENU_SECTION_TITLE_CLASS} {
  padding: 4px 12px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: rgba(201, 209, 217, 0.7);
}
`;
  (document.head || document.documentElement).appendChild(style);
}

function attachHeaderButton() {
  const actions = document.querySelector(".AppHeader-actions");
  if (!actions) return;
  if (!headerElements) {
    headerElements = buildHeaderElements();
  }

  const container = headerElements.container;
  if (container.parentElement === actions) return;
  if (container.isConnected) container.remove();

  const anchorButton = actions.querySelector("#global-create-menu-anchor");
  if (anchorButton && anchorButton.parentNode === actions) {
    const reference = anchorButton.nextSibling;
    if (reference) {
      actions.insertBefore(container, reference);
    } else {
      actions.appendChild(container);
    }
  } else {
    actions.appendChild(container);
  }

  headerElements.dropdown.open = false;
}

function buildHeaderElements() {
  const container = document.createElement("div");
  container.className = HEADER_CONTAINER_CLASS;

  const mainButton = document.createElement("button");
  mainButton.type = "button";
  mainButton.className = `Button Button--secondary Button--medium AppHeader-button AppHeader-buttonLeft color-fg-muted ${HEADER_MAIN_BUTTON_CLASS}`;
  mainButton.dataset.defaultLabel = "Open in editor";

  const mainContent = document.createElement("span");
  mainContent.className = "Button-content";

  const labelSpan = document.createElement("span");
  labelSpan.className = "Button-label";
  labelSpan.textContent = "IDE";

  mainContent.appendChild(labelSpan);
  mainButton.appendChild(mainContent);

  mainButton.addEventListener("click", (event) => {
    if (!selectedEditorId) return;
    const openModeOverride = event.shiftKey
      ? currentOpenMode === OPEN_MODE_REPO
        ? OPEN_MODE_FILE
        : OPEN_MODE_REPO
      : null;
    openWithEditor(selectedEditorId, { setAsDefault: false, openModeOverride });
  });

  const dropdown = document.createElement("details");
  dropdown.className = "details-overlay details-reset gh-vscode-header-dropdown";

  const summary = document.createElement("summary");
  summary.className = `Button Button--secondary Button--iconOnly Button--medium AppHeader-button AppHeader-buttonRight color-fg-muted ${HEADER_TOGGLE_CLASS}`;
  summary.setAttribute("aria-label", "Open in another editor");
  summary.addEventListener("click", (event) => {
    if (summary.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  const summaryContent = document.createElement("span");
  summaryContent.className = "Button-content";

  const summaryVisual = document.createElement("span");
  summaryVisual.className = "Button-visual";
  summaryVisual.innerHTML = `
    <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-triangle-down">
      <path d="m4.427 7.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z"></path>
    </svg>
  `;

  summaryContent.appendChild(summaryVisual);
  summary.appendChild(summaryContent);
  dropdown.appendChild(summary);

  const menu = document.createElement("div");
  menu.className = MENU_CONTAINER_CLASS;
  menu.setAttribute("role", "menu");
  menu.hidden = true;
  dropdown.appendChild(menu);

  dropdown.addEventListener("toggle", () => {
    menu.hidden = !dropdown.open;
  });

  container.appendChild(mainButton);
  container.appendChild(dropdown);

  return {
    container,
    mainButton,
    labelSpan,
    dropdown,
    toggleSummary: summary,
    menu,
  };
}

function refreshEditorOptions() {
  if (editorsRequestInflight) return;
  editorsRequestInflight = true;
  chrome.runtime.sendMessage({ type: "GET_EDITOR_OPTIONS", url: window.location.href }, (response) => {
    editorsRequestInflight = false;
    if (chrome.runtime.lastError) {
      console.warn("[content] editor options error", chrome.runtime.lastError.message);
      updateEditorState({ editors: [], selectedEditorId: null, repoKey: null, openMode: OPEN_MODE_REPO });
      return;
    }
    if (!response || response.error) {
      console.warn("[content] editor options unavailable", response?.error);
      updateEditorState({ editors: [], selectedEditorId: null, repoKey: null, openMode: OPEN_MODE_REPO });
      return;
    }
    updateEditorState({
      editors: Array.isArray(response.editors) ? response.editors : [],
      selectedEditorId: response.selectedEditorId || null,
      repoKey: response.repoKey || null,
      openMode: response.openMode === OPEN_MODE_FILE ? OPEN_MODE_FILE : OPEN_MODE_REPO,
    });
  });
}

function updateEditorState({ editors, selectedEditorId: selectedId, repoKey, openMode }) {
  currentEditors = editors;
  currentRepoKey = repoKey;
  currentOpenMode = openMode === OPEN_MODE_FILE ? OPEN_MODE_FILE : OPEN_MODE_REPO;
  if (repoKey) {
    selectedEditorId = selectedId && editors.some((ed) => ed.id === selectedId) ? selectedId : (editors[0]?.id || null);
  } else {
    selectedEditorId = null;
  }
  updateHeaderUI();
}

function updateHeaderUI() {
  if (!headerElements) return;
  const { mainButton, labelSpan, toggleSummary } = headerElements;
  const activeEditor = currentEditors.find((editor) => editor.id === selectedEditorId);
  const labelText = activeEditor?.name || "Open in editor";
  labelSpan.textContent = labelText;
  const actionLabel = currentOpenMode === OPEN_MODE_REPO ? `Open workspace in ${labelText}` : `Open file in ${labelText}`;
  mainButton.dataset.defaultLabel = actionLabel;
  setMainButtonState("", mainButton.dataset.defaultLabel);

  const hasEditors = currentEditors.length > 0;
  const enableActions = hasEditors && !!currentRepoKey && !!selectedEditorId;
  mainButton.disabled = !enableActions;
  toggleSummary.setAttribute("aria-disabled", enableActions ? "false" : "true");
  if (!hasEditors) {
    headerElements.dropdown.open = false;
    headerElements.menu.hidden = true;
  }

  rebuildEditorMenu();
}

function rebuildEditorMenu() {
  if (!headerElements) return;
  const { dropdown, menu } = headerElements;
  menu.innerHTML = "";
  addOpenModeSection(menu, dropdown);
  if (currentEditors.length) {
    addMenuDivider(menu);
    addEditorsSection(menu, dropdown);
  }
}

function addOpenModeSection(menu, dropdown) {
  const title = document.createElement("div");
  title.className = MENU_SECTION_TITLE_CLASS;
  title.textContent = "Default open mode";
  menu.appendChild(title);

  const createModeItem = (mode, text) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = MENU_ITEM_CLASS;
    item.textContent = text;
    item.dataset.mode = mode;
    if (currentOpenMode === mode) item.classList.add("is-selected");
    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropdown.open = false;
      setDefaultOpenMode(mode);
    });
    menu.appendChild(item);
  };

  createModeItem(OPEN_MODE_REPO, "Workspace");
  createModeItem(OPEN_MODE_FILE, "Current file only");
}

function addMenuDivider(menu) {
  const divider = document.createElement("div");
  divider.className = MENU_DIVIDER_CLASS;
  menu.appendChild(divider);
}

function addEditorsSection(menu, dropdown) {
  currentEditors.forEach((editor) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = MENU_ITEM_CLASS;
    item.textContent = editor.name;
    item.dataset.editorId = editor.id;
    if (editor.id === selectedEditorId) {
      item.classList.add("is-selected");
      item.title = buildEditorItemTitle(true);
    } else {
      item.title = buildEditorItemTitle(false);
    }
    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropdown.open = false;
      const setAsDefault = !event.altKey && !event.shiftKey;
      const openModeOverride = event.shiftKey
        ? currentOpenMode === OPEN_MODE_REPO
          ? OPEN_MODE_FILE
          : OPEN_MODE_REPO
        : null;
      openWithEditor(editor.id, { setAsDefault, openModeOverride });
    });
    menu.appendChild(item);
  });
}

function openWithEditor(editorId, { setAsDefault, openModeOverride = null }) {
  if (!editorId) return;
  if (!headerElements) return;
  const { mainButton, toggleSummary } = headerElements;
  const modeToUse = openModeOverride === OPEN_MODE_FILE || openModeOverride === OPEN_MODE_REPO ? openModeOverride : currentOpenMode;
  const actionText = modeToUse === OPEN_MODE_REPO ? "Opening workspace" : "Opening file";
  setMainButtonState("is-working", `${actionText} in ${getEditorName(editorId)}…`);
  mainButton.disabled = true;
  toggleSummary.setAttribute("aria-disabled", "true");

  chrome.runtime.sendMessage(
    {
      type: "CONTENT_OPEN_URL",
      url: window.location.href,
      editorId,
      openMode: modeToUse,
      setRepoEditor: setAsDefault && !!currentRepoKey,
    },
    (response) => {
      mainButton.disabled = false;
      toggleSummary.setAttribute("aria-disabled", currentEditors.length ? "false" : "true");

      if (chrome.runtime.lastError) {
        setMainButtonState("is-error", chrome.runtime.lastError.message || "Failed to reach extension");
        scheduleMainButtonReset();
        return;
      }
      if (!response) {
        setMainButtonState("is-error", "No response from native helper");
        scheduleMainButtonReset();
        return;
      }

      const responseMode = response.openMode === OPEN_MODE_FILE || response.openMode === OPEN_MODE_REPO ? response.openMode : modeToUse;

      if (setAsDefault && editorId !== selectedEditorId) {
        selectedEditorId = editorId;
      }
      if (setAsDefault && responseMode !== currentOpenMode) {
        currentOpenMode = responseMode;
      }

      switch (response.status) {
        case "OPENED":
          setMainButtonState(
            "is-success",
            `${responseMode === OPEN_MODE_REPO ? "Opened workspace" : "Opened file"} in ${getEditorName(editorId)}`
          );
          break;
        case "NEEDS_CLONE":
          setMainButtonState("", "Clone prompt sent – confirm in browser");
          break;
        case "WRONG_BRANCH":
          setMainButtonState("", "Branch switch prompt sent – confirm in browser");
          break;
        case "ERROR":
          setMainButtonState("is-error", response.message ? `Error: ${response.message}` : "Failed to open editor");
          break;
        default:
          setMainButtonState("", response.status ? `Status: ${response.status}` : "No action taken");
          break;
      }
      scheduleMainButtonReset();
      if (setAsDefault) {
        updateHeaderUI();
      }
      if (setAsDefault) {
        setTimeout(() => refreshEditorOptions(), 200);
      }
    }
  );
}

function setMainButtonState(stateClass, label) {
  if (!headerElements) return;
  const { mainButton } = headerElements;
  STATE_CLASSES.forEach((cls) => mainButton.classList.remove(cls));
  if (stateClass) mainButton.classList.add(stateClass);
  const title = label || mainButton.dataset.defaultLabel || "Open in editor";
  mainButton.title = title;
  mainButton.setAttribute("aria-label", title);
}

function scheduleMainButtonReset() {
  if (mainButtonResetTimer) clearTimeout(mainButtonResetTimer);
  if (!headerElements) return;
  mainButtonResetTimer = setTimeout(() => {
    if (!headerElements) return;
    setMainButtonState("", headerElements.mainButton.dataset.defaultLabel || "Open in editor");
  }, 2000);
}

function getEditorName(editorId) {
  const editor = currentEditors.find((ed) => ed.id === editorId);
  return editor?.name || "editor";
}

function setDefaultOpenMode(mode) {
  const normalized = mode === OPEN_MODE_FILE ? OPEN_MODE_FILE : OPEN_MODE_REPO;
  if (normalized === currentOpenMode) return;
  currentOpenMode = normalized;
  updateHeaderUI();
  chrome.runtime.sendMessage({ type: "SET_OPEN_MODE", openMode: normalized }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("[content] failed to persist open mode", chrome.runtime.lastError.message);
      return;
    }
    if (response?.openMode) {
      currentOpenMode = response.openMode === OPEN_MODE_FILE ? OPEN_MODE_FILE : OPEN_MODE_REPO;
      updateHeaderUI();
    }
    refreshEditorOptions();
  });
}

function buildEditorItemTitle(isDefault) {
  const base = isDefault ? "Default editor – click to open" : "Click to open and set as default";
  const modifiers = [];
  modifiers.push("Hold Alt to keep current editor");
  modifiers.push(
    currentOpenMode === OPEN_MODE_REPO
      ? "Hold Shift to open file only once"
      : "Hold Shift to open workspace once"
  );
  return `${base}. ${modifiers.join('. ')}.`;
}
