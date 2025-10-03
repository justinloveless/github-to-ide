# Release Notes - npm Package Integration

## 🎉 Major Update: Native Host Now on npm!

The GitHub to IDE native host is now published as an npm package for easier installation and distribution.

### What's New

#### 📦 npm Package: `github-to-ide-host`

The native host is now available on npm! This makes installation much simpler and more professional.

**Before:**
```bash
curl -fsSL https://raw.githubusercontent.com/justinloveless/github-to-ide/refs/heads/main/scripts/install-native-host-standalone.sh | bash -s -- --extension-id abc123xyz
```

**Now:**
```bash
npx gh2ide --extension-id abc123xyz
```

Or even simpler with interactive mode:
```bash
npx gh2ide
```

#### ✨ New Features

1. **Interactive CLI Mode**
   - Run `npx gh2ide` without arguments
   - The CLI guides you through finding your extension ID
   - Helpful instructions built into the prompts

2. **Better Help System**
   - `npx gh2ide --help` shows comprehensive documentation
   - Clear examples and usage instructions
   - Instructions on finding your extension ID

3. **Version Command**
   - `npx gh2ide --version` shows current version
   - Easy to verify which version is installed

4. **Enhanced Validation**
   - Extension ID format validation before installation
   - Clear error messages if something goes wrong
   - Better troubleshooting guidance

5. **Multi-Browser Support**
   - Automatically installs for all detected Chromium browsers
   - Chrome, Brave, Edge, Chromium all configured at once
   - No need to manually configure each browser

6. **Updated Extension UI**
   - Simpler install command shown in options page
   - Link to npm package for more information
   - Clear Node.js version requirement (16+)

7. **Improved First-Run Experience**
   - Welcome notification mentions `npx gh2ide` command
   - More helpful initial setup guidance

### Breaking Changes

None! The extension remains fully backward compatible. If you've already installed the native host using the old method, it will continue to work perfectly.

### Updated Documentation

All documentation has been updated to reference the npm package:

- ✅ **README.md** - Main installation instructions updated
- ✅ **extension/options.html** - Shows `npx gh2ide` command
- ✅ **extension/background.js** - First-run notification updated
- ✅ **CHROME_WEB_STORE_SETUP.md** - Store listing description updated
- ✅ **native-host/README.md** - Comprehensive npm package documentation
- ✅ **native-host/PUBLISHING.md** - Guide for publishing updates

### npm Package Details

- **Package Name:** `github-to-ide-host`
- **CLI Command:** `gh2ide`
- **npm Registry:** https://www.npmjs.com/package/github-to-ide-host
- **Current Version:** 1.0.0
- **License:** MIT

### Requirements

- Node.js 16 or higher
- npm (comes with Node.js)
- Chromium-based browser (Chrome, Brave, Edge, etc.)

### Installation Methods

#### Method 1: Interactive (Recommended)
```bash
npx gh2ide
```
Follow the prompts to enter your extension ID.

#### Method 2: Direct Install
```bash
npx gh2ide --extension-id <your-extension-id>
```

#### Method 3: Copy from Extension
1. Open extension options page
2. Scroll to "Native host install command"
3. Click "Copy command"
4. Paste into terminal

### Benefits

**For Users:**
- ✅ Simpler installation - one short command
- ✅ Interactive mode - no need to figure out extension ID first
- ✅ Better help and documentation
- ✅ Safer - package is hosted on npm
- ✅ Easy updates - `npx gh2ide@latest`
- ✅ Professional and trustworthy

**For Developers:**
- ✅ Easy to update - just publish to npm
- ✅ Better distribution - npm handles hosting
- ✅ Version management - semantic versioning
- ✅ Download analytics from npm
- ✅ More discoverable

### Migration Guide

If you've already installed the native host using the old curl method, you don't need to do anything! It will continue to work.

If you want to reinstall using the npm package:

1. Get your extension ID from `chrome://extensions`
2. Run: `npx gh2ide --extension-id <your-id>`
3. Restart your browser

That's it! The npm installer will overwrite the old installation.

### Troubleshooting

**"npm not found" or "npx not found"**
- Install Node.js from https://nodejs.org (includes npm and npx)
- Requires Node.js 16 or higher

**"No response from native host"**
1. Restart your browser after installation
2. Verify extension ID matches: `npx gh2ide --extension-id <your-id>`
3. Test connection from extension options page

**Need more help?**
- Run: `npx gh2ide --help`
- Visit: https://www.npmjs.com/package/github-to-ide-host
- Read: [native-host/README.md](native-host/README.md#troubleshooting)

### Testing

To test the npm package locally:

```bash
cd native-host
npm link
gh2ide --help
gh2ide --version
gh2ide --extension-id test123
```

### Publishing Updates

To publish a new version:

```bash
cd native-host
npm version patch  # or minor, or major
npm publish
git push && git push --tags
```

See [native-host/PUBLISHING.md](native-host/PUBLISHING.md) for detailed instructions.

### Future Enhancements

Planned improvements for future versions:

1. **Auto-detect extension ID** - Read from browser profile
2. **Update checker** - Notify when new version available
3. **Uninstall command** - `npx gh2ide --uninstall`
4. **Config wizard** - Interactive setup for IDE preferences
5. **Multiple extension support** - Install for multiple extensions
6. **Logging** - Better troubleshooting with log files

### Feedback

We'd love to hear your feedback!

- Report issues: https://github.com/justinloveless/github-to-ide/issues
- npm package: https://www.npmjs.com/package/github-to-ide-host
- View source: https://github.com/justinloveless/github-to-ide

---

**Version:** 1.0.0  
**Release Date:** October 3, 2025  
**Author:** Justin Loveless

