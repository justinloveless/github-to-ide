#!/usr/bin/env node
// Chrome Native Messaging host: read length-prefixed JSON on stdin, write length-prefixed JSON on stdout
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CONFIG_PATH = path.join(os.homedir(), '.github-vscode-interceptor.json');
const LOG_PREFIX = '[native]';
const LOG_FILE = (() => {
  const envPath = process.env.GITHUB_VSCODE_LOG_FILE;
  if (envPath === '') return null;
  return envPath || path.join(os.homedir(), '.github-vscode-interceptor', 'native-host.log');
})();
let logDirEnsured = false;
let resolvedCodeCmdCache = new Map();

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

function readConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const cfg = JSON.parse(raw);
    log('readConfig', { source: CONFIG_PATH, hasFile: true });
    return {
      cloneRoot: cfg.cloneRoot || path.join(os.homedir(), 'Dev'),
      codeCmd: cfg.codeCmd || 'code',
      defaultRemote: cfg.defaultRemote || 'origin'
    };
  } catch {
    log('readConfig fallback defaults', { source: CONFIG_PATH });
    return { cloneRoot: path.join(os.homedir(), 'Dev'), codeCmd: 'code', defaultRemote: 'origin' };
  }
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

function repoLocalPath(cloneRoot, owner, repo) {
  return path.join(expandTilde(cloneRoot), owner, repo);
}

function expandTilde(p) { return p?.startsWith('~') ? p.replace('~', os.homedir()) : p; }

function git(cwd, args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (res.error) return { ok: false, stderr: String(res.error) };
  const ok = res.status === 0;
  if (!ok) log('git command failed', { cwd, args, stderr: res.stderr.trim() });
  return { ok, stdout: res.stdout, stderr: res.stderr };
}

function codeCommandCandidates(raw) {
  const base = raw || 'code';
  const candidates = new Set();
  candidates.add(base);

  const needsWhich = typeof base === 'string' && !base.includes(path.sep);
  if (needsWhich && process.platform !== 'win32') {
    const whichRes = spawnSync('which', [base], { encoding: 'utf8' });
    if (whichRes.status === 0) {
      const located = whichRes.stdout.trim();
      if (located) candidates.add(located);
    }
  }

  if (process.platform === 'darwin') {
    [
      '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
      '/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code',
      path.join(os.homedir(), 'Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'),
      path.join(os.homedir(), 'Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code'),
    ].forEach((candidate) => {
      if (fs.existsSync(candidate)) candidates.add(candidate);
    });
  }

  if (process.platform === 'win32') {
    const programFiles = [process.env['ProgramFiles'], process.env['ProgramFiles(x86)']].filter(Boolean);
    programFiles.forEach((baseDir) => {
      const candidate = path.join(baseDir, 'Microsoft VS Code', 'bin', 'code.cmd');
      if (fs.existsSync(candidate)) candidates.add(candidate);
    });
  }

  return Array.from(candidates.values()).filter(Boolean);
}

function openVSCode(codeCmd, { targetPath, line, cwd } = {}) {
  const cacheKey = `${codeCmd || ''}`;
  if (!resolvedCodeCmdCache.has(cacheKey)) {
    resolvedCodeCmdCache.set(cacheKey, codeCommandCandidates(codeCmd));
  }
  const candidates = resolvedCodeCmdCache.get(cacheKey);
  const argsBase = [];
  if (targetPath) {
    if (line) {
      argsBase.push('-g', `${targetPath}:${line}`);
    } else {
      argsBase.push(targetPath);
    }
  } else {
    argsBase.push('.');
  }

  log('openVSCode', { candidates, args: argsBase, cwd });
  let lastError = 'VS Code command not found';
  for (const candidate of candidates) {
    try {
      const res = spawnSync(candidate, argsBase, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], cwd });
      if (res.error) {
        log('openVSCode spawn error', { candidate, error: res.error.message });
        lastError = `VS Code command not found: ${candidate}`;
        continue;
      }
      if (res.status === 0) {
        const output = res.stdout?.trim();
        if (output) log('openVSCode stdout', { candidate, output });
        return { ok: true };
      }
      const stderr = res.stderr?.trim();
      log('openVSCode non-zero exit', { candidate, status: res.status, stderr });
      lastError = stderr || `VS Code command exited with status ${res.status}`;
    } catch (err) {
      log('openVSCode exception', { candidate, error: err?.message || String(err) });
      lastError = err?.message || String(err);
    }
  }

  return { ok: false, message: lastError };
}

function ensureCloned(remote, localPath) {
  if (fs.existsSync(localPath)) return { ok: true, existed: true };
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  const res = git(path.dirname(localPath), ['clone', remote, localPath]);
  return { ok: res.ok, existed: false, stderr: res.stderr };
}

function currentBranch(localPath) {
  const res = git(localPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return res.ok ? res.stdout.trim() : null;
}

function switchBranch(localPath, branch) {
  const fetch = git(localPath, ['fetch', '--all', '--prune']);
  if (!fetch.ok) return { ok: false, message: fetch.stderr };
  const res = git(localPath, ['switch', branch]);
  return { ok: res.ok, message: res.stderr };
}

function fileFromRepo(localPath, filepath) {
  return filepath ? path.join(localPath, filepath) : null;
}

function handleResolve(msg) {
  const cfg = readConfig();
  const localPath = repoLocalPath(cfg.cloneRoot, msg.owner, msg.repo);
  const remote = `https://github.com/${msg.owner}/${msg.repo}.git`;
  log('handleResolve', { owner: msg.owner, repo: msg.repo, branch: msg.branch, commit: msg.commit, filepath: msg.filepath, localPath });

  if (!fs.existsSync(localPath)) {
    log('handleResolve needs clone', { localPath, remote });
    return {
      status: 'NEEDS_CLONE',
      remote,
      localPath,
      openPayload: { action: 'open', localPath, filepath: msg.filepath, line: msg.line }
    };
  }

  // Already cloned → branch check
  if (msg.branch) {
    const cur = currentBranch(localPath);
    if (cur && cur !== msg.branch) {
      log('handleResolve wrong branch', { currentBranch: cur, expectedBranch: msg.branch });
      return {
        status: 'WRONG_BRANCH',
        currentBranch: cur,
        expectedBranch: msg.branch,
        localPath,
        openPayload: { action: 'open', localPath, filepath: msg.filepath, line: msg.line }
      };
    }
  }

  // Open immediately
  const openRes = openPayload({ action: 'open', localPath, filepath: msg.filepath, line: msg.line });
  log('handleResolve open result', openRes);
  return openRes.ok ? { status: 'OPENED' } : { status: 'ERROR', message: openRes.message || 'Failed to open in VS Code' };
}

function openPayload(payload) {
  const cfg = readConfig();
  const { localPath, filepath, line } = payload;
  log('openPayload', { localPath, filepath, line });
  if (!fs.existsSync(localPath)) return { ok: false, message: `Local repo path not found: ${localPath}` };

  if (filepath) {
    const abs = fileFromRepo(localPath, filepath);
    if (fs.existsSync(abs)) {
      const fileAttempt = openVSCode(cfg.codeCmd, { targetPath: abs, line: line || null });
      if (fileAttempt.ok) return fileAttempt;
      log('openPayload falling back to folder', { filepath, reason: fileAttempt.message });
      const folderAttempt = openVSCode(cfg.codeCmd, { targetPath: localPath });
      return folderAttempt;
    }
    // Path no longer matches; fall back to opening the repo folder.
    const fallback = openVSCode(cfg.codeCmd, { targetPath: localPath });
    return fallback;
  }

  const dirAttempt = openVSCode(cfg.codeCmd, { targetPath: localPath });
  return dirAttempt;
}

function handleClone(msg) {
  const { remote, localPath } = msg;
  log('handleClone', { remote, localPath });
  const out = ensureCloned(remote, localPath);
  if (!out.ok) return { status: 'ERROR', message: out.stderr || 'clone failed' };
  return { status: 'CLONED' };
}

function handleSwitchBranch(msg) {
  const { localPath, branch } = msg;
  log('handleSwitchBranch', { localPath, branch });
  const res = switchBranch(localPath, branch);
  return res.ok ? { status: 'SWITCHED' } : { status: 'ERROR', message: res.message };
}

function main() {
  log('native host started');
  while (true) {
    const msg = readMessage();
    if (!msg) {
      log('readMessage returned null, exiting');
      break;
    }
    try {
      if (msg.action === 'resolve') writeMessage(handleResolve(msg));
      else if (msg.action === 'clone') writeMessage(handleClone(msg));
      else if (msg.action === 'switchBranch') writeMessage(handleSwitchBranch(msg));
      else if (msg.action === 'open') {
        const result = openPayload(msg);
        writeMessage(result.ok ? { status: 'OPENED' } : { status: 'ERROR', message: result.message || 'open failed' });
      }
      else writeMessage({ status: 'ERROR', message: 'unknown action' });
    } catch (e) {
      writeMessage({ status: 'ERROR', message: String(e?.message || e) });
    }
  }
}

main();
