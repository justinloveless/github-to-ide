# GitHub to IDE - Native Host

Native messaging host for the [GitHub to IDE](https://github.com/justinloveless/github-to-ide) Chrome extension.

## What is this?

This is a helper application that allows the GitHub to IDE browser extension to communicate with your computer to open repositories and files in your local IDE (VS Code, Cursor, JetBrains Rider, etc.).

## Quick Install

```bash
npx gh2ide --extension-id <your-extension-id>
```

### Finding Your Extension ID

1. Open `chrome://extensions` in your browser
2. Enable "Developer mode" (toggle in top-right corner)
3. Find the "GitHub to IDE" extension
4. Copy the ID shown below the extension name (32 characters, looks like: `haekngngecedekgjbeoijeaapjkmblgp`)

## Usage

### Interactive Mode (Recommended)

Simply run without arguments and the CLI will auto-detect your extension:

```bash
npx gh2ide
```

**Features:**
- 🔍 **Auto-detection**: Scans your browser profiles for GitHub to IDE extension
- 🎯 **Smart prompts**: Confirms detected extension or lets you choose from multiple
- 📝 **Manual fallback**: If auto-detection fails, guides you through manual entry

The CLI will automatically find your extension in Chrome, Brave, Edge, or Chromium.

### Direct Installation

If you already know your extension ID:

```bash
npx gh2ide --extension-id abc123xyz
```

### Help

```bash
npx gh2ide --help
```

### Version

```bash
npx gh2ide --version
```

### Uninstall

```bash
npx gh2ide --uninstall
```

This removes all installed files and manifests from all browsers.

## What it Does

1. Installs the native messaging host to `~/.github-to-ide/native-host/`
2. Creates a manifest file that allows Chrome to communicate with the host
3. Configures your browser(s) to recognize the extension

## Supported Platforms

- ✅ **macOS** - Automatically installs for Chrome, Brave, Edge, Chromium
- ✅ **Linux** - Automatically installs for Chrome, Brave, Chromium
- ⚠️ **Windows** - Requires manual registry configuration (see [Windows Setup](#windows-setup))

## Supported Browsers

- Chrome
- Chromium
- Brave
- Microsoft Edge
- Arc (uses Chrome profile)
- Vivaldi (uses Chrome profile)

## After Installation

1. **Restart your browser** - This is required for the browser to recognize the native host
2. **Test the connection** - Open the extension options page and click "Test native host connection"
3. **Configure your IDE** - Set your preferred editor and clone directory in the extension options

## Windows Setup

Windows requires additional steps due to registry requirements:

1. Run the installer: `npx gh2ide --extension-id <your-id>`
2. Open Registry Editor (`regedit`)
3. Navigate to: `HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts`
4. Create a new key: `com.lovelesslabs.vscodeopener`
5. Set the default value to the path shown by the installer

For more details, see the [Chrome Native Messaging documentation](https://developer.chrome.com/docs/apps/nativeMessaging/).

## Updating

To update to the latest version:

```bash
npx gh2ide@latest --extension-id <your-id>
```

## Uninstalling

To completely remove the native host:

```bash
npx gh2ide --uninstall
```

This automatically removes:
- Installation directory (`~/.github-to-ide`)
- All browser manifests (Chrome, Brave, Edge, Chromium)
- Configuration files

**Manual uninstall (if needed):**

If the automatic uninstall doesn't work, you can manually remove files:

**macOS:**
```bash
rm -rf ~/.github-to-ide
rm ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.lovelesslabs.vscodeopener.json
rm ~/Library/Application\ Support/BraveSoftware/Brave-Browser/NativeMessagingHosts/com.lovelesslabs.vscodeopener.json
```

**Linux:**
```bash
rm -rf ~/.github-to-ide
rm ~/.config/google-chrome/NativeMessagingHosts/com.lovelesslabs.vscodeopener.json
rm ~/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts/com.lovelesslabs.vscodeopener.json
```

## Troubleshooting

### "No response from native host"

1. Ensure you've restarted your browser after installation
2. Check that the extension ID matches what you installed with
3. Run the installer again: `npx gh2ide --extension-id <your-id>`

### "Native host has exited"

1. Ensure Node.js is installed: `node --version` (requires v16+)
2. Check the native host log: `~/.github-vscode-interceptor/native-host.log`

### Extension ID doesn't match

If you reinstall the extension or switch browsers, you may need to reinstall the native host with the new extension ID.

## Requirements

- Node.js 16 or higher
- Chrome/Chromium-based browser
- macOS, Linux, or Windows

## Development

To test locally:

```bash
git clone https://github.com/justinloveless/github-to-ide.git
cd github-to-ide/native-host
npm link
gh2ide --extension-id <your-id>
```

## License

MIT

## Issues & Support

Report issues at: https://github.com/justinloveless/github-to-ide/issues

