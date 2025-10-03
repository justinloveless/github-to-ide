# GitHub to IDE

GitHub to IDE intercepts GitHub links and sends them straight to the IDE of your choice. It works in any Chromium-based browser (Chrome, Arc, Brave, Chromium, etc.) and supports multiple editors (VS Code, Rider, Cursor out of the box).

## Quick install

1. **Clone the repository**
   ```bash
   git clone https://github.com/justinloveless/github-to-ide.git
   cd github-to-ide
   ```

2. **Load the extension (unpacked)**
   1. Enable Developer Mode at `chrome://extensions` (or the equivalent URL in Arc/Brave).
   2. Click **Load unpacked** and choose the `extension/` folder inside this repository.
   
   *Optional:* run `./scripts/package-extension.sh` to produce a ZIP in `dist/` that you can share with teammates. They must still extract that ZIP and choose the extracted folder with **Load unpacked**—Chrome will not load the ZIP directly.

3. **Install the native host**
   
   The native host is available as an npm package for easy installation:
   
   - **Option A - Interactive (Recommended):**
     ```bash
     npx gh2ide
     ```
     The CLI will guide you through finding your extension ID.
   
   - **Option B - Direct install:**
     1. From `chrome://extensions`, copy the extension ID.
     2. Run:
        ```bash
        npx gh2ide --extension-id <your-extension-id>
        ```
   
   - **Option C - Copy from extension:**
     1. Open the extension options page.
     2. At the bottom you'll see a ready-to-copy command with *your* extension ID.
     3. Click **Copy command** and paste into your terminal.
   
   The installer sets up the native host in `~/.github-to-ide/native-host` and configures Chrome/Brave/Edge/Chromium automatically.
   
   **Requirements:** Node.js 16 or higher. [View on npm →](https://www.npmjs.com/package/github-to-ide-host)

4. **Configure**
   - Open the extension options page (`chrome://extensions` → Details → Extension options).
   - Tweak clone root, default editor/open mode, and review per-repository overrides. The options screen shows the exact install command (with your extension ID) so you can re-run it later if needed.

> Tip: the popup menu also has a direct link to the options page.

## Native Host

The native messaging host is published as an npm package: [`github-to-ide-host`](https://www.npmjs.com/package/github-to-ide-host)

**Installation:**
```bash
npx gh2ide --extension-id <your-extension-id>
```

Or use interactive mode:
```bash
npx gh2ide
```

For more details, see the [native host documentation](native-host/README.md).

## Scripts

- `scripts/package-extension.sh` – packages the extension into `dist/github-to-ide-<timestamp>.zip` for easy sharing.
- `scripts/install-native-host.sh` – installs the native host from a local checkout (useful for development).

## Editors

- VS Code, JetBrains Rider, and Cursor are included by default. Add or edit entries via the options page – the configuration lives entirely in `chrome.storage`, so no manual JSON edits are needed.
- Changing the editor from the header dropdown stores a per-repository override. The options page lists every override and lets you clear them individually or all at once.
- The dropdown also selects the default *open mode* (workspace vs current file). Hold <kbd>Shift</kbd> while choosing an editor to perform the opposite mode once.

## Development scripts

- `scripts/install-native-host.sh` – install/update the native host using the files from your local checkout (handy while iterating).
- `native-host/run.sh` – launcher for the Node-based host (`native-host/index.js`).

## Notes

- **Restart your browser** after installing the native host so the manifest loads.
- Requires **Node.js 16+** for the native messaging host.
- GitHub to IDE is not (yet) published in the Chrome Web Store; installation is manual via Developer Mode.

## Troubleshooting

**"No response from native host"**
1. Ensure you've restarted your browser after installation
2. Verify the extension ID matches: run `npx gh2ide --extension-id <your-id>` again
3. Check Node.js is installed: `node --version` (requires v16+)

**Native host installation**
- For detailed installation help, run: `npx gh2ide --help`
- To uninstall: `npx gh2ide --uninstall`
- View troubleshooting guide: [native-host/README.md](native-host/README.md#troubleshooting)
