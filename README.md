# GitHub to IDE

A browser extension + native helper that intercepts GitHub file URLs and opens the matching file or workspace in your local IDE.

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
Open the extension’s **Options** page (via `chrome://extensions` → Details → Extension options) to configure clone locations, editor list, and default behaviours. All settings are stored in `chrome.storage.sync`; there is no longer a need to edit a JSON file on disk.

### Editors
- The native host supports multiple editors. Update `native-host/config.example.json` (and your personal `~/.github-vscode-interceptor.json`) to list the editors you want to expose – each entry can point at a different binary and argument template.
- Reload the extension and you’ll see the “GitHub to IDE” button in the GitHub header. Click the caret to choose any configured editor; selecting one will set it as the repository default (hold <kbd>Alt</kbd> while clicking to open once without changing the default).
- Repo-specific preferences sync via `chrome.storage.sync`, so the chosen editor is remembered per repository.
- The button also lets you pick the default *open mode*: “Open entire workspace” launches a fresh window for the repo (then activates the requested file), while “Open file only” reuses the current window. Hold <kbd>Shift</kbd> when choosing an editor to perform the opposite mode just once.
- `native-host/config.example.json` remains as a reference for the default editor templates, but it is no longer read by the native helper.

## Native host prerequisites
- macOS / Linux with Node.js installed (the wrapper checks common locations and honours `NODE_BIN` or `GITHUB_VSCODE_NODE`).
- `code` command available somewhere on disk (the native host searches typical install paths if it isn't on `PATH`).

## Dev scripts
- `scripts/package-extension.sh` – bundle the extension into `dist/github-vscode-interceptor-<timestamp>.zip`.
- `scripts/install-native-host.sh` – install/update the native host manifest for local browsers.

## Limitations
Browser vendors still require a manual step to load unpacked extensions; there is no true "single click" install without publishing to the Chrome Web Store. The scripts here minimise the remaining steps (zipping, manifest setup, config). To go fully hands-off, consider publishing a signed build and shipping the native host via a platform-specific installer package.
