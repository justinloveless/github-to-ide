# NPM Package Implementation

## Overview

The native host is now available as an npm package (`github-to-ide-host`) that can be installed with a simple `npx` command.

## What Was Created

### 1. **CLI Tool** (`native-host/cli.js`)
A comprehensive command-line interface with:
- ✅ **Interactive mode** - Prompts for extension ID with helpful instructions
- ✅ **Help command** - Full documentation with examples
- ✅ **Version command** - Shows current version
- ✅ **Validation** - Checks extension ID format before installing
- ✅ **Multi-browser support** - Installs for Chrome, Brave, Edge, Chromium automatically
- ✅ **Cross-platform** - Works on macOS, Linux, and Windows (with notes)
- ✅ **Error handling** - Clear error messages and troubleshooting guidance

### 2. **Package Configuration** (`native-host/package.json`)
Updated with:
- Package name: `github-to-ide-host`
- Binary command: `gh2ide`
- Proper metadata (description, keywords, repository, etc.)
- Node.js version requirement (>=16.0.0)
- Files to include in npm package

### 3. **Documentation** (`native-host/README.md`)
Comprehensive user guide including:
- Quick install instructions
- How to find extension ID
- Interactive and direct installation modes
- Platform support details
- Troubleshooting guide
- Uninstall instructions

### 4. **Publishing Guide** (`native-host/PUBLISHING.md`)
Complete guide for publishing to npm:
- Setup instructions
- Testing procedures
- Publishing steps
- Version management
- Best practices

## Usage Examples

### Interactive Mode (Recommended)
```bash
npx gh2ide
```
**Output:**
```
📋 GitHub to IDE - Native Host Installation

To find your extension ID:
  1. Open chrome://extensions in your browser
  2. Enable "Developer mode" (toggle in top-right corner)
  3. Find the "GitHub to IDE" extension
  4. Copy the ID shown below the extension name
     (It looks like: haekngngecedekgjbeoijeaapjkmblgp)

Enter your Chrome extension ID: _
```

### Direct Installation
```bash
npx gh2ide --extension-id haekngngecedekgjbeoijeaapjkmblgp
```

### Help Command
```bash
npx gh2ide --help
```

### Version Command
```bash
npx gh2ide --version
```

### Uninstall Command
```bash
npx gh2ide --uninstall
```
Removes all installed files and manifests from all browsers.

## Features

### 🎯 Interactive Mode with Auto-Detection
- **Automatically scans** browser profiles for GitHub to IDE extension
- **Detects across browsers**: Chrome, Brave, Edge, Chromium
- **Smart selection**: Confirms single extension or lets you choose from multiple
- **Manual fallback**: If auto-detection fails, guides you through manual entry
- Shows extension name, version, and browser
- Validates input format
- Friendly error messages

### 📚 Comprehensive Help
```
GitHub to IDE Native Host Installer v1.0.0

USAGE:
  npx gh2ide [OPTIONS]

OPTIONS:
  --extension-id <id>    Chrome extension ID (required)
  --help, -h             Show this help message
  --version, -v          Show version number

EXAMPLES:
  # Install with extension ID
  npx gh2ide --extension-id abc123xyz

  # Interactive mode (prompts for extension ID)
  npx gh2ide

  # Show help
  npx gh2ide --help

FINDING YOUR EXTENSION ID:
  1. Open Chrome and navigate to: chrome://extensions
  2. Enable "Developer mode" (toggle in top-right)
  3. Find "GitHub to IDE" extension
  4. Copy the ID shown below the extension name
     (Example: haekngngecedekgjbeoijeaapjkmblgp)
```

### ✅ Extension ID Validation
- Checks format (32 lowercase letters a-p)
- Provides helpful error message if invalid
- Example of valid ID shown

### 🌐 Multi-Browser Support
Automatically installs for all detected browsers:
- Chrome
- Chrome Beta
- Chromium
- Brave
- Microsoft Edge

### 🎨 Beautiful Output
```
🚀 Installing GitHub to IDE native host...

📁 Creating installation directory...
📦 Copying native host files...
📝 Creating native messaging manifest...
   ✓ Installed for Chrome
   ✓ Installed for Brave

✅ Installation complete!

   Native host: /Users/you/.github-to-ide/native-host/index.js
   Manifest: /Users/you/Library/Application Support/Google/Chrome/NativeMessagingHosts

🔄 Please restart your browser for changes to take effect.

🧪 Test the connection from the extension options page.
```

## Extension Integration

The extension now shows the simpler npm command:

**Before:**
```bash
curl -fsSL https://raw.githubusercontent.com/justinloveless/github-to-ide/refs/heads/main/scripts/install-native-host-standalone.sh | bash -s -- --extension-id haekngngecedekgjbeoijeaapjkmblgp
```

**After:**
```bash
npx gh2ide --extension-id haekngngecedekgjbeoijeaapjkmblgp
```

Much cleaner and more user-friendly!

## Benefits

### For Users
- ✅ **Simpler installation** - One short command instead of long curl pipe
- ✅ **Interactive mode** - Don't need to figure out extension ID first
- ✅ **Better help** - Clear instructions built into the CLI
- ✅ **Safer** - Can inspect package on npm before running
- ✅ **Versioned** - Easy to update with `npx gh2ide@latest`
- ✅ **Cross-platform** - Works on Mac, Linux, Windows

### For Developers
- ✅ **Easy to update** - Just publish new version to npm
- ✅ **Better distribution** - npm handles hosting and CDN
- ✅ **Version management** - Users can install specific versions
- ✅ **Analytics** - npm provides download stats
- ✅ **Professional** - npm package is more trustworthy than curl | bash

## Publishing to npm

### First Time
1. Create npm account at https://www.npmjs.com
2. Enable 2FA (required for publishing)
3. Login: `npm login`

### Testing Locally
```bash
cd native-host
npm link
gh2ide --help
gh2ide --extension-id test123
npm unlink -g github-to-ide-host
```

### Publishing
```bash
cd native-host
npm publish
```

### Updating
```bash
npm version patch  # or minor, or major
npm publish
git push && git push --tags
```

See `native-host/PUBLISHING.md` for complete details.

## Files Created/Modified

### New Files
- ✅ `native-host/cli.js` - CLI implementation
- ✅ `native-host/README.md` - User documentation
- ✅ `native-host/PUBLISHING.md` - Publishing guide

### Modified Files
- ✅ `native-host/package.json` - Updated for npm publishing
- ✅ `extension/options.js` - Shows new npm command

## Next Steps

1. **Test the CLI locally:**
   ```bash
   cd native-host
   npm link
   gh2ide --help
   ```

2. **Publish to npm:**
   ```bash
   npm login
   npm publish
   ```

3. **Update documentation:**
   - Main README.md
   - Chrome Web Store listing
   - Extension options page hints

4. **Announce the update:**
   - GitHub release notes
   - Chrome Web Store update
   - Social media / blog post

## Comparison

### Old Method (curl | bash)
```bash
# Pros:
- No npm required
- Works immediately

# Cons:
- Long, scary-looking command
- Hard to remember
- Less discoverable
- No built-in help
- Harder to update
- Less trustworthy (pipe to bash)
```

### New Method (npx)
```bash
# Pros:
- Short, clean command
- Interactive mode available
- Built-in help and validation
- Easy to update
- Trustworthy (npm package)
- Better error messages
- Professional appearance

# Cons:
- Requires Node.js/npm (but most devs have it)
```

## Future Enhancements

Possible improvements for future versions:

1. ~~**Auto-detect extension ID**~~ - ✅ **IMPLEMENTED** - Automatically scans browser profiles
2. **Update checker** - Notify when new version available
3. ~~**Uninstall command**~~ - ✅ **IMPLEMENTED** - `npx gh2ide --uninstall`
4. **Config wizard** - Interactive setup for IDE preferences
5. **Multiple extension support** - Install for multiple extensions at once
6. **Logging** - Better troubleshooting with log files
7. **Multiple browser profiles** - Detect extensions in non-default profiles

## Support

- **Documentation:** `native-host/README.md`
- **Issues:** https://github.com/justinloveless/github-to-ide/issues
- **npm package:** https://www.npmjs.com/package/github-to-ide-host (after publishing)

