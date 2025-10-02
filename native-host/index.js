#!/usr/bin/env node
// Chrome Native Messaging host: read length-prefixed JSON on stdin, write length-prefixed JSON on stdout
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const LOG_PREFIX = '[native]';
const LOG_FILE = (() => {
  const envPath = process.env.GITHUB_VSCODE_LOG_FILE;
  if (envPath === '') return null;
  return envPath || path.join(os.homedir(), '.github-vscode-interceptor', 'native-host.log');
})();
let logDirEnsured = false;
const resolvedEditorCache = new Map();

function normalizePathValue(p) {
  if (typeof p !== 'string') return '';
  return p.replace(/[\\/]+$/, '');
}

function formatLogArg(arg) {
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg);
  } catch (_) {
    return String(arg);
  }
}

function log(...args) {
  const line = `${new Date().toISOString()} ${LOG_PREFIX} ${args.map(formatLogArg).join(' ')}`;
  console.error(line);
  if (!LOG_FILE) return;
  try {
    if (!logDirEnsured) {
      fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
      logDirEnsured = true;
    }
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (err) {
    console.error(`${LOG_PREFIX} failed to write log file`, err?.message || err);
  }
}

const DEFAULT_EDITORS = [
  {
    id: 'code',
    name: 'VS Code',
    command: 'code',
    alternates: [
      '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
      '/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code',
      'code.cmd',
    ],
    args: {
      fileWithLine: ['--reuse-window', '-g', '{path}:{line}'],
      file: ['--reuse-window', '-g', '{path}'],
      fileInRepo: ['--reuse-window', '-g', '{path}:{line}'],
      folder: ['-n', '{path}'],
    },
  },
  {
    id: 'rider',
    name: 'JetBrains Rider',
    command: 'open',
    alternates: [
      '/Applications/Rider.app/Contents/MacOS/rider',
      '/Applications/JetBrains Toolbox/Rider.app/Contents/MacOS/rider',
      'C:/Program Files/JetBrains/Rider/bin/rider64.exe',
    ],
    args: {
      fileWithLine: ['-na', 'Rider.app', '--args', '--line', '{line}', '{path}'],
      file: ['-na', 'Rider.app', '--args', '{path}'],
      fileInRepo: ['-a', 'Rider.app', '--args', '--line', '{line}', '{path}'],
      folder: ['-na', 'Rider.app', '--args', '{path}'],
    },
  },
  {
    id: 'cursor',
    name: 'Cursor',
    command: 'cursor',
    alternates: [
      '/Applications/Cursor.app/Contents/MacOS/Cursor',
      'C:/Users/%USERNAME%/AppData/Local/Programs/cursor-app/cursor.exe',
    ],
    args: {
      fileWithLine: ['{path}:{line}'],
      file: ['{path}'],
      fileInRepo: ['{path}:{line}'],
      folder: ['{path}'],
    },
  },
];

const DEFAULT_CONFIG = {
  cloneRoot: path.join(os.homedir(), 'Dev'),
  defaultRemote: 'origin',
  groupByOwner: false,
  openMode: 'repo',
  defaultEditor: 'code',
  editors: DEFAULT_EDITORS,
};

function sanitizeConfig(raw) {
  const candidate = raw && typeof raw === 'object' ? raw : {};
  const cloneRoot = normalizePathValue(typeof candidate.cloneRoot === 'string' ? candidate.cloneRoot : DEFAULT_CONFIG.cloneRoot) || DEFAULT_CONFIG.cloneRoot;
  const defaultRemote = typeof candidate.defaultRemote === 'string' && candidate.defaultRemote.trim()
    ? candidate.defaultRemote.trim()
    : DEFAULT_CONFIG.defaultRemote;
  const groupByOwner = candidate.groupByOwner === true;
  const openMode = candidate.openMode === 'file' ? 'file' : 'repo';
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
  if (!entry || typeof entry !== 'object') return null;
  const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : null;
  if (!id) return null;
  const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : id;
  const command = typeof entry.command === 'string' && entry.command.trim() ? entry.command.trim() : null;
  const alternates = Array.isArray(entry.alternates)
    ? entry.alternates.filter((alt) => typeof alt === 'string' && alt.trim()).map((alt) => alt.trim())
    : [];
  if (!command && alternates.length === 0) return null;
  const args = {};
  ['fileWithLine', 'file', 'fileInRepo', 'folder'].forEach((key) => {
    if (Array.isArray(entry.args?.[key])) {
      args[key] = entry.args[key].map((part) => String(part));
    }
  });
  return { id, name, command, alternates, args };
}

function structuredClone(data) {
  return JSON.parse(JSON.stringify(data));
}

function writeMessage(obj) {
  log('writeMessage', obj);
  const json = JSON.stringify(obj);
  const len = Buffer.byteLength(json);
  const header = Buffer.alloc(4);
  header.writeUInt32LE(len, 0);
  process.stdout.write(header);
  process.stdout.write(json);
}

function readMessage() {
  const header = Buffer.alloc(4);
  if (fs.readSync(0, header, 0, 4, null) !== 4) return null;
  const len = header.readUInt32LE(0);
  const buf = Buffer.alloc(len);
  if (fs.readSync(0, buf, 0, len, null) !== len) return null;
  const msg = JSON.parse(buf.toString('utf8'));
  log('readMessage', msg);
  return msg;
}

function repoLocalPath(cloneRoot, owner, repo, groupByOwner) {
  const base = expandTilde(cloneRoot);
  if (groupByOwner && owner) return path.join(base, owner, repo);
  return path.join(base, repo);
}

function expandTilde(p) {
  return p?.startsWith('~') ? p.replace('~', os.homedir()) : p;
}

function findEditor(cfg, editorId) {
  const fallback = cfg.editors[0];
  if (!editorId) return fallback;
  const match = cfg.editors.find((editor) => editor.id === editorId);
  return match || fallback;
}

function editorCandidates(editor) {
  const candidates = [];
  if (editor.command) candidates.push(editor.command);
  if (Array.isArray(editor.alternates)) candidates.push(...editor.alternates);
  return candidates.map((candidate) => expandTilde(candidate));
}

function renderArgs(template, replacements) {
  if (!Array.isArray(template)) return [];
  return template
    .map((part) =>
      part
        .replace(/{path}/g, replacements.path ?? '')
        .replace(/{line}/g, replacements.line ?? '')
        .replace(/{folder}/g, replacements.folder ?? replacements.path ?? '')
    )
    .filter((part) => part !== '');
}

function launchEditor(editor, { targetPath, line, cwd, targetType }) {
  if (!editor) return { ok: false, message: 'Editor not configured' };
  const candidates = editorCandidates(editor);
  if (!candidates.length) return { ok: false, message: 'No executable configured for editor' };

  const replacements = {
    path: targetPath,
    folder: targetPath,
    line: line != null ? String(line) : '',
  };

  let template;
  switch (targetType) {
    case 'folder':
      template = editor.args?.folder;
      break;
    case 'fileInRepo':
      if (line != null) {
        template = editor.args?.fileInRepo || editor.args?.fileWithLine || editor.args?.file;
      } else {
        template = editor.args?.file || editor.args?.fileInRepo || editor.args?.fileWithLine;
      }
      break;
    case 'file':
    default:
      if (line != null && editor.args?.fileWithLine) {
        template = editor.args.fileWithLine;
      } else {
        template = editor.args?.file;
      }
      break;
  }

  if (!template) {
    if (targetType === 'folder') template = ['{path}'];
    else if (line != null) template = ['-g', '{path}:{line}'];
    else template = ['{path}'];
  }

  const args = renderArgs(template, replacements);

  let lastError = 'Editor command failed';
  for (const candidate of candidates) {
    const resolved = resolveCommand(candidate, editor.id);
    if (!resolved) continue;
    const res = spawnSync(resolved, args, { stdio: 'ignore', cwd });
    if (res.error) {
      lastError = res.error.message || String(res.error);
      log('launchEditor spawn error', { editor: editor.id, candidate: resolved, error: lastError });
      continue;
    }
    if (res.status === 0) {
      log('launchEditor success', { editor: editor.id, command: resolved, args });
      resolvedEditorCache.set(editor.id, resolved);
      return { ok: true };
    }
    lastError = res.stderr?.trim() || `Exit code ${res.status}`;
    log('launchEditor non-zero status', { editor: editor.id, candidate: resolved, status: res.status, stderr: res.stderr?.trim() });
  }

  return { ok: false, message: lastError };
}

function resolveCommand(candidate, editorId) {
  if (!candidate) return null;
  if (resolvedEditorCache.has(`${editorId}:${candidate}`)) {
    return resolvedEditorCache.get(`${editorId}:${candidate}`);
  }

  if (candidate.includes(path.sep) || candidate.startsWith('.')) {
    const expanded = path.isAbsolute(candidate) ? candidate : path.resolve(candidate);
    resolvedEditorCache.set(`${editorId}:${candidate}`, expanded);
    return expanded;
  }

  if (process.platform === 'win32') {
    const where = spawnSync('where', [candidate], { encoding: 'utf8' });
    if (where.status === 0) {
      const located = where.stdout.split(/\r?\n/).find((line) => line.trim());
      if (located) {
        const trimmed = located.trim();
        resolvedEditorCache.set(`${editorId}:${candidate}`, trimmed);
        return trimmed;
      }
    }
  } else {
    const which = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (which.status === 0) {
      const located = which.stdout.trim();
      if (located) {
        resolvedEditorCache.set(`${editorId}:${candidate}`, located);
        return located;
      }
    }
  }

  resolvedEditorCache.set(`${editorId}:${candidate}`, candidate);
  return candidate;
}

function ensureCloned(remote, localPath) {
  if (fs.existsSync(localPath)) return { ok: true, existed: true };
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  const res = spawnSync('git', ['clone', remote, localPath], { encoding: 'utf8', stdio: 'pipe' });
  const ok = res.status === 0;
  return { ok, existed: false, stderr: res.stderr };
}

function currentBranch(localPath) {
  const res = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: localPath, encoding: 'utf8', stdio: 'pipe' });
  return res.status === 0 ? res.stdout.trim() : null;
}

function switchBranch(localPath, branch) {
  const fetch = spawnSync('git', ['fetch', '--all', '--prune'], { cwd: localPath, encoding: 'utf8', stdio: 'pipe' });
  if (fetch.status !== 0) return { ok: false, message: fetch.stderr };
  const res = spawnSync('git', ['switch', branch], { cwd: localPath, encoding: 'utf8', stdio: 'pipe' });
  return { ok: res.status === 0, message: res.stderr };
}

function fileFromRepo(localPath, filepath) {
  return filepath ? path.join(localPath, filepath) : null;
}

function handleResolve(msg) {
  const cfg = sanitizeConfig(msg.config);
  const localPath = repoLocalPath(cfg.cloneRoot, msg.owner, msg.repo, cfg.groupByOwner);
  const remote = `https://github.com/${msg.owner}/${msg.repo}.git`;
  const editor = findEditor(cfg, msg.editorId || cfg.defaultEditor);
  const editorId = editor.id;
  const openMode = msg.openMode === 'file' || msg.openMode === 'repo' ? msg.openMode : cfg.openMode;

  if (!fs.existsSync(localPath)) {
    return {
      status: 'NEEDS_CLONE',
      remote,
      localPath,
      openPayload: { action: 'open', localPath, filepath: msg.filepath, line: msg.line, editorId, openMode, config: cfg },
    };
  }

  if (msg.branch) {
    const cur = currentBranch(localPath);
    if (cur && cur !== msg.branch) {
      return {
        status: 'WRONG_BRANCH',
        currentBranch: cur,
        expectedBranch: msg.branch,
        localPath,
        openPayload: { action: 'open', localPath, filepath: msg.filepath, line: msg.line, editorId, openMode, config: cfg },
      };
    }
  }

  const openRes = openPayload({ action: 'open', localPath, filepath: msg.filepath, line: msg.line, editorId, openMode, config: cfg });
  return openRes.ok ? { status: 'OPENED' } : { status: 'ERROR', message: openRes.message || 'Failed to open editor' };
}

function openPayload(payload) {
  const cfg = sanitizeConfig(payload.config);
  const { localPath, filepath, line, editorId, openMode } = payload;
  if (!fs.existsSync(localPath)) return { ok: false, message: `Local repo path not found: ${localPath}` };

  const editor = findEditor(cfg, editorId || cfg.defaultEditor);
  const effectiveMode = openMode === 'file' || openMode === 'repo' ? openMode : cfg.openMode;

  if (effectiveMode === 'repo') {
    const folderResult = launchEditor(editor, {
      targetPath: localPath,
      cwd: localPath,
      targetType: 'folder',
    });
    if (!folderResult.ok) return folderResult;
    if (filepath) {
      const abs = fileFromRepo(localPath, filepath);
      if (abs && fs.existsSync(abs)) {
        const fileResult = launchEditor(editor, {
          targetPath: abs,
          line: line != null ? line : null,
          cwd: localPath,
          targetType: line != null ? 'fileInRepo' : 'file',
        });
        if (!fileResult.ok) return fileResult;
      }
    }
    return folderResult;
  }

  if (filepath) {
    const abs = fileFromRepo(localPath, filepath);
    if (fs.existsSync(abs)) {
      const fileAttempt = launchEditor(editor, {
        targetPath: abs,
        line: line != null ? line : null,
        cwd: localPath,
        targetType: 'file',
      });
      if (fileAttempt.ok) return fileAttempt;
      return launchEditor(editor, {
        targetPath: localPath,
        cwd: localPath,
        targetType: 'folder',
      });
    }
  }

  return launchEditor(editor, {
    targetPath: localPath,
    cwd: localPath,
    targetType: 'folder',
  });
}

function handleClone(msg) {
  const { remote, localPath } = msg;
  const out = ensureCloned(remote, localPath);
  if (!out.ok) return { status: 'ERROR', message: out.stderr || 'clone failed' };
  return { status: 'CLONED' };
}

function handleSwitchBranch(msg) {
  const { localPath, branch } = msg;
  const res = switchBranch(localPath, branch);
  return res.ok ? { status: 'SWITCHED' } : { status: 'ERROR', message: res.message };
}

function handleChooseCloneRoot() {
  if (process.platform === 'darwin') {
    const script = 'set theFolder to choose folder with prompt "Select clone root for GitHub → VS Code"\nPOSIX path of theFolder';
    const res = spawnSync('osascript', ['-e', script], { encoding: 'utf8' });
    if (res.error) {
      return { status: 'ERROR', message: res.error.message };
    }
    if (res.status === 0) {
      const chosen = normalizePathValue(res.stdout.trim());
      return { status: 'CHOSEN', path: chosen };
    }
    const stderr = res.stderr?.trim();
    if (stderr?.toLowerCase().includes('user canceled')) return { status: 'CANCELLED' };
    return { status: 'ERROR', message: stderr || 'Folder selection failed' };
  }

  if (process.platform === 'win32') {
    return { status: 'ERROR', message: 'Directory picker not supported on Windows yet.' };
  }

  return { status: 'ERROR', message: 'Directory picker not supported on this platform yet.' };
}

function main() {
  while (true) {
    const msg = readMessage();
    if (!msg) break;
    try {
      switch (msg.action) {
        case 'resolve':
          writeMessage(handleResolve(msg));
          break;
        case 'clone':
          writeMessage(handleClone(msg));
          break;
        case 'switchBranch':
          writeMessage(handleSwitchBranch(msg));
          break;
        case 'chooseCloneRoot':
          writeMessage(handleChooseCloneRoot());
          break;
        case 'open':
          writeMessage(openPayload(msg).ok ? { status: 'OPENED' } : { status: 'ERROR', message: 'open failed' });
          break;
        default:
          writeMessage({ status: 'ERROR', message: `unknown action: ${msg.action}` });
          break;
      }
    } catch (e) {
      writeMessage({ status: 'ERROR', message: String(e?.message || e) });
    }
  }
}

main();
