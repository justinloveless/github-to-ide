# GitHub → VS Code Interceptor

A browser extension + native helper that intercepts GitHub file URLs and opens the matching file in your local VS Code checkout.

## Sharing with teammates

### 1. Package the extension
Use the helper script to create a timestamped ZIP archive under `dist/`:

```bash
./scripts/package-extension.sh
```

Share the generated file (for example via Slack or a shared drive). Each teammate can extract or "Load unpacked" from that directory. If you have a private signing key you can also use Chrome's "Pack extension" feature to create a `.crx` for an even smoother install.

### 2. Load the extension (Chrome / Arc / Chromium)
1. Open `chrome://extensions/` (Arc users open Little Arc and paste the URL).
2. Toggle **Developer mode** on.
3. Click **Load unpacked** and choose the folder that contains the extension files (the unzipped package or this repo's `extension/` directory).
4. Note the generated extension ID – you'll paste it in the next step so the native host trusts the browser.

### 3. Install the native messaging host
Run the helper (re-run whenever the extension ID changes):

```bash
./scripts/install-native-host.sh --extension-id <your-extension-id>
```

By default the script writes manifests for Chrome, Arc, and Chromium. Add `--target-dir` if you also need Brave/Vivaldi, or `--dry-run` to inspect changes first. The script writes an absolute `path` to `native-host/run.sh`, so keep the repo in a stable location.

### 4. Configure the native helper (optional)
Copy and edit the sample config if you want to customise clone locations or VS Code command:

```bash
cp native-host/config.example.json ~/.github-vscode-interceptor.json
# then edit the file to match your environment
```

Restart the browser so the updated native host manifest is picked up.

## Native host prerequisites
- macOS / Linux with Node.js installed (the wrapper checks common locations and honours `NODE_BIN` or `GITHUB_VSCODE_NODE`).
- `code` command available somewhere on disk (the native host now searches typical VS Code install paths if it isn't on `PATH`).

## Dev scripts
- `scripts/package-extension.sh` – bundle the extension into `dist/github-vscode-interceptor-<timestamp>.zip`.
- `scripts/install-native-host.sh` – install/update the native host manifest for local browsers.

## Limitations
Browser vendors still require a manual step to load unpacked extensions; there is no true "single click" install without publishing to the Chrome Web Store. The scripts here minimise the remaining steps (zipping, manifest setup, config). To go fully hands-off, consider publishing a signed build and shipping the native host via a platform-specific installer package.
