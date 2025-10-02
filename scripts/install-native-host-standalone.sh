#!/usr/bin/env bash
set -euo pipefail

CHANNEL="main"
EXT_IDS=()
INSTALL_ROOT_DEFAULT="$HOME/.github-to-ide/native-host"
INSTALL_ROOT="$INSTALL_ROOT_DEFAULT"
DRY_RUN=false

usage() {
  cat <<USAGE
Usage: $(basename "$0") --extension-id <id> [options]

Options:
  --extension-id <id>      Extension ID to authorize (repeatable).
  --install-root <path>    Directory to place native host files (default: $INSTALL_ROOT_DEFAULT).
  --channel <branch>       Git branch/tag to download from (default: main).
  --dry-run                Print actions without writing files.
  -h, --help               Show this help.

Example:
  curl -fsSL https://raw.githubusercontent.com/justinloveless/github-vscode-interceptor/main/scripts/install-native-host-standalone.sh \\
    | bash -s -- --extension-id abcdefghijklmnoabcdefghi
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --extension-id)
      [[ $# -lt 2 ]] && { echo "--extension-id requires a value" >&2; exit 1; }
      EXT_IDS+=("$2")
      shift 2
      ;;
    --install-root)
      [[ $# -lt 2 ]] && { echo "--install-root requires a value" >&2; exit 1; }
      INSTALL_ROOT="$2"
      shift 2
      ;;
    --channel)
      [[ $# -lt 2 ]] && { echo "--channel requires a value" >&2; exit 1; }
      CHANNEL="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [ ${#EXT_IDS[@]} -eq 0 ]; then
  echo "At least one --extension-id is required" >&2
  exit 1
fi

if [[ "$INSTALL_ROOT" != /* ]]; then
  INSTALL_ROOT="$PWD/$INSTALL_ROOT"
fi

HOST_NAME="com.lovelesslabs.vscodeopener"
RUN_URL="https://raw.githubusercontent.com/justinloveless/github-vscode-interceptor/$CHANNEL/native-host/run.sh"
SCRIPT_URL="https://raw.githubusercontent.com/justinloveless/github-vscode-interceptor/$CHANNEL/native-host/index.js"
PACKAGE_URL="https://raw.githubusercontent.com/justinloveless/github-vscode-interceptor/$CHANNEL/native-host/package.json"

TARGET_DIRS=(
  "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
  "$HOME/Library/Application Support/Arc/NativeMessagingHosts"
  "$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
  "$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
  "$HOME/Library/Application Support/Vivaldi/NativeMessagingHosts"
  "$HOME/.config/chromium/NativeMessagingHosts"
  "$HOME/.config/google-chrome/NativeMessagingHosts"
)

fetch() {
  local url="$1" dest="$2"
  if [ "$DRY_RUN" = true ]; then
    echo "Would download $url -> $dest"
    return
  fi
  echo "Downloading $url"
  curl -fsSL "$url" -o "$dest"
}

if [ "$DRY_RUN" = true ]; then
  echo "=== Dry run ==="
fi

echo "Installing native host files into $INSTALL_ROOT"
if [ "$DRY_RUN" = false ]; then
  mkdir -p "$INSTALL_ROOT"
fi

fetch "$RUN_URL" "$INSTALL_ROOT/run.sh"
fetch "$SCRIPT_URL" "$INSTALL_ROOT/index.js"
fetch "$PACKAGE_URL" "$INSTALL_ROOT/package.json"

if [ "$DRY_RUN" = false ]; then
  chmod +x "$INSTALL_ROOT/run.sh"
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to generate the manifest" >&2
  exit 1
fi

EXT_IDS_JOIN=$(printf "%s\n" "${EXT_IDS[@]}")
MANIFEST=$(INSTALL_ROOT="$INSTALL_ROOT" EXT_IDS="$EXT_IDS_JOIN" python3 <<'PY'
import json
import os
install_root = os.environ['INSTALL_ROOT']
ext_ids = [ext for ext in os.environ.get('EXT_IDS', '').split('\n') if ext]
manifest = {
    "name": "com.lovelesslabs.vscodeopener",
    "description": "GitHub to IDE native helper",
    "path": os.path.join(install_root, 'run.sh'),
    "type": "stdio",
}
manifest["allowed_origins"] = [f"chrome-extension://{ext}/" for ext in ext_ids] if ext_ids else []
print(json.dumps(manifest, indent=4))
PY
)

for dir in "${TARGET_DIRS[@]}"; do
  [ -z "$dir" ] && continue
  manifest_path="$dir/$HOST_NAME.json"
  echo "Writing manifest → $manifest_path"
  if [ "$DRY_RUN" = true ]; then
    continue
  fi
  mkdir -p "$dir"
  printf '%s\n' "$MANIFEST" > "$manifest_path"
  chmod 600 "$manifest_path"
  if [ ! -w "$dir" ]; then
    echo "Note: manifest directory $dir may require administrative permissions." >&2
  fi
done

echo "Native host installed. Restart your browser(s) if they were running."
