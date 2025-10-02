#!/bin/sh
# Wrapper to launch the native host with a best-effort Node binary lookup.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST_SCRIPT="$SCRIPT_DIR/index.js"

# Allow overrides via environment or config.
NODE_CANDIDATES="${NODE_BIN:-} ${GITHUB_VSCODE_NODE:-}"

# Common locations (Homebrew ARM/x86, system node, nvm default symlink).
NODE_CANDIDATES="$NODE_CANDIDATES /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node"

# If node is on PATH, prefer that.
if command -v node >/dev/null 2>&1; then
  NODE_CANDIDATES="$(command -v node) $NODE_CANDIDATES"
fi

SELECTED=""
for candidate in $NODE_CANDIDATES; do
  [ -n "$candidate" ] || continue
  if [ -x "$candidate" ]; then
    SELECTED="$candidate"
    break
  fi
done

if [ -z "$SELECTED" ]; then
  echo "Native host wrapper: unable to locate a usable node binary." >&2
  echo "Checked candidates: $NODE_CANDIDATES" >&2
  exit 1
fi

exec "$SELECTED" "$HOST_SCRIPT"
