#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXT_DIR="$ROOT_DIR/extension"
DIST_DIR="$ROOT_DIR/dist"
TS="$(date +%Y%m%d-%H%M%S)"
ZIP_NAME="github-to-ide-$TS.zip"
OUTPUT="$DIST_DIR/$ZIP_NAME"

if [ ! -d "$EXT_DIR" ]; then
  echo "Extension directory not found at $EXT_DIR" >&2
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "zip command not found. Please install zip." >&2
  exit 1
fi

mkdir -p "$DIST_DIR"

(
  cd "$EXT_DIR"
  zip -r "$OUTPUT" . -x '*/.DS_Store'
)

echo "Packaged extension → $OUTPUT"
