#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOST_NAME="com.lovelesslabs.vscodeopener"
HOST_SCRIPT="$ROOT_DIR/native-host/run.sh"
DEFAULT_TARGETS=(
  "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
  "$HOME/Library/Application Support/Arc/NativeMessagingHosts"
  "$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
)
EXT_IDS=()
CUSTOM_TARGETS=()
DRY_RUN=false

usage() {
  cat <<USAGE
Usage: $(basename "$0") [options]

Options:
  --extension-id <id>      Add an allowed extension ID (repeatable).
  --target-dir <path>      Additional native messaging host directory (repeatable).
  --dry-run                Print actions without writing files.
  -h, --help               Show this help and exit.

Examples:
  $(basename "$0") --extension-id abcdefghijklmnoabcdefghi
  $(basename "$0") --extension-id id1 --extension-id id2 \\
    --target-dir "$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --extension-id)
      [[ $# -lt 2 ]] && { echo "--extension-id requires a value" >&2; exit 1; }
      EXT_IDS+=("$2")
      shift 2
      ;;
    --target-dir)
      [[ $# -lt 2 ]] && { echo "--target-dir requires a value" >&2; exit 1; }
      CUSTOM_TARGETS+=("$2")
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

if [ ! -x "$HOST_SCRIPT" ]; then
  echo "Native host launcher is not executable at $HOST_SCRIPT" >&2
  exit 1
fi

if [ ${#EXT_IDS[@]} -eq 0 ]; then
  read -r -p "Enter extension ID (leave blank to allow none): " ANSWER
  if [ -n "$ANSWER" ]; then
    EXT_IDS+=("$ANSWER")
  else
    echo "Installing manifest with empty allowed_origins; rerun with --extension-id after loading the extension." >&2
  fi
fi

# De-duplicate targets and drop non-existent parent when dry-running only.
TARGET_DIRS=()
for dir in "${DEFAULT_TARGETS[@]}" "${CUSTOM_TARGETS[@]}"; do
  [ -z "$dir" ] && continue
  if [[ ! " ${TARGET_DIRS[*]} " =~ " $dir " ]]; then
    TARGET_DIRS+=("$dir")
  fi
fi

if [ ${#TARGET_DIRS[@]} -eq 0 ]; then
  echo "No target directories resolved." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to generate the manifest JSON." >&2
  exit 1
fi

HOST_SCRIPT_ABS="$HOST_SCRIPT"
EXT_IDS_CSV=$(IFS=,; echo "${EXT_IDS[*]}")
MANIFEST=$(HOST_SCRIPT="$HOST_SCRIPT_ABS" EXT_IDS="$EXT_IDS_CSV" python3 <<'PY'
import json
import os

host_script = os.environ['HOST_SCRIPT']
ext_ids = [ext_id for ext_id in os.environ.get('EXT_IDS', '').split(',') if ext_id]
manifest = {
    "name": "com.lovelesslabs.vscodeopener",
    "description": "GitHub to IDE native helper",
    "path": host_script,
    "type": "stdio",
    "allowed_origins": [f"chrome-extension://{ext_id}/" for ext_id in ext_ids]
}
print(json.dumps(manifest, indent=4))
PY
)

for dir in "${TARGET_DIRS[@]}"; do
  file="$dir/$HOST_NAME.json"
  echo "Installing manifest → $file"
  if [ "$DRY_RUN" = true ]; then
    continue
  fi
  mkdir -p "$dir"
  printf '%s
' "$MANIFEST" > "$file"
  chmod 600 "$file"
done

echo "Done. Restart your browser(s) to pick up the updated native host manifest."
