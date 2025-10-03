# Testing Guide - Auto-Detection Feature

## Prerequisites

Make sure you have:
- Node.js 16+ installed (`node --version`)
- npm installed (`npm --version`)
- GitHub to IDE extension loaded in at least one browser

## Step 1: Link the Package Locally

This makes the `gh2ide` command available as if you installed it from npm:

```bash
cd native-host
npm link
```

You should see output like:
```
added 1 package, and audited 2 packages in 234ms
```

Verify it's linked:
```bash
which gh2ide
# Should show: /usr/local/bin/gh2ide (or similar)

gh2ide --version
# Should show: gh2ide v1.2.0
```

## Step 2: Test Help Command

```bash
gh2ide --help
```

**Expected output:**
- Shows version 1.2.0
- Mentions auto-detection
- Shows all options including `--uninstall`

## Step 3: Test Auto-Detection (With Extension Installed)

Make sure you have the GitHub to IDE extension loaded in Chrome/Brave/Edge.

```bash
gh2ide
```

**Expected behavior:**

### If ONE extension is found:
```
📋 GitHub to IDE - Native Host Installation

🔍 Scanning for GitHub to IDE extension...

✅ Found GitHub to IDE extension(s):

  1. GitHub to IDE (v1.0.0)
     Browser: Chrome
     ID: haekngngecedekgjbeoijeaapjkmblgp

Use this extension? (Y/n):
```

- Type `y` or just press Enter → Should proceed with installation
- Type `n` → Should fall back to manual entry

### If MULTIPLE extensions are found:
```
📋 GitHub to IDE - Native Host Installation

🔍 Scanning for GitHub to IDE extension...

✅ Found GitHub to IDE extension(s):

  1. GitHub to IDE (v1.0.0)
     Browser: Chrome
     ID: haekngngecedekgjbeoijeaapjkmblgp

  2. GitHub to IDE (v1.0.1)
     Browser: Brave
     ID: bcdefghijklmnopqrstuvwxyzabcdef

Select extension (1-2), or press Enter to enter manually:
```

- Type `1` or `2` → Should install for that extension
- Press Enter without input → Should fall back to manual entry
- Type invalid number → Should show error and fall back to manual

## Step 4: Test Auto-Detection (Without Extension)

To test the fallback, temporarily remove/disable your extension:

1. Go to `chrome://extensions`
2. Disable or remove the GitHub to IDE extension
3. Run:

```bash
gh2ide
```

**Expected output:**
```
📋 GitHub to IDE - Native Host Installation

🔍 Scanning for GitHub to IDE extension...

ℹ️  No GitHub to IDE extension detected automatically.

To find your extension ID manually:
  1. Open chrome://extensions in your browser
  2. Enable "Developer mode" (toggle in top-right corner)
  3. Find the "GitHub to IDE" extension
  4. Copy the ID shown below the extension name
     (It looks like: haekngngecedekgjbeoijeaapjkmblgp)

Enter your Chrome extension ID:
```

Type a test ID (32 lowercase a-p characters) like: `abcdefghijklmnopqrstuvwxyzabcdef`

## Step 5: Test Direct Installation

With a known extension ID:

```bash
gh2ide --extension-id haekngngecedekgjbeoijeaapjkmblgp
```

**Expected behavior:**
- Should skip auto-detection
- Should proceed directly to installation
- Should show installation progress

## Step 6: Test Uninstall

```bash
gh2ide --uninstall
```

**Expected output:**
```
🗑️  Uninstalling GitHub to IDE native host...

📁 Removing installation directory...
   ✓ Removed /Users/you/.github-to-ide
📝 Removing native messaging manifests...
   ✓ Removed Chrome manifest
   ✓ Removed Brave manifest

✅ Uninstallation complete!

   Removed 3 file(s)/directory(ies)

🔄 Please restart your browser for changes to take effect.
```

## Step 7: Test Version Command

```bash
gh2ide --version
```

**Expected output:**
```
gh2ide v1.2.0
```

## Step 8: Verify Installation Works

After installing with auto-detection:

1. **Check installation directory:**
   ```bash
   ls -la ~/.github-to-ide/native-host/
   ```
   Should show: `index.js`, `run.sh`

2. **Check manifests (macOS):**
   ```bash
   ls -la ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/
   ```
   Should show: `com.lovelesslabs.vscodeopener.json`

3. **Check manifest content:**
   ```bash
   cat ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.lovelesslabs.vscodeopener.json
   ```
   Should show your extension ID in `allowed_origins`

4. **Test from extension:**
   - Restart your browser
   - Open extension options page
   - Click "Test native host connection"
   - Should show: "✅ Connected! Native host is working."

## Test Scenarios Checklist

Use this checklist to ensure everything works:

### Auto-Detection Tests
- [ ] Single extension detected and confirmed
- [ ] Multiple extensions detected and user selects one
- [ ] No extension detected, falls back to manual
- [ ] User declines detected extension, goes to manual
- [ ] Detects extension in Chrome
- [ ] Detects extension in Brave (if installed)
- [ ] Detects extension in Edge (if installed)

### Command Tests
- [ ] `gh2ide --help` shows correct info
- [ ] `gh2ide --version` shows 1.2.0
- [ ] `gh2ide --extension-id <id>` skips detection
- [ ] `gh2ide --uninstall` removes everything
- [ ] `gh2ide` (no args) triggers auto-detection

### Installation Tests
- [ ] Installation creates files in `~/.github-to-ide`
- [ ] Manifests created for all browsers
- [ ] Correct extension ID in manifest
- [ ] Native host connection works from extension

### Error Handling Tests
- [ ] Invalid extension ID shows error
- [ ] Missing directories handled gracefully
- [ ] Unreadable manifests skipped
- [ ] Already uninstalled handled gracefully

## Debugging

### Enable Verbose Logging

If something isn't working, add console.log to the detectExtensions function:

```javascript
// In cli.js, add after line 95:
console.log('Scanning:', dir);
console.log('Found extensions:', extensionIds);
```

Then run with output visible:
```bash
gh2ide 2>&1 | tee test-output.log
```

### Check Extension Location

Manually verify your extension exists:

**macOS - Chrome:**
```bash
ls -la ~/Library/Application\ Support/Google/Chrome/Default/Extensions/
```

**macOS - Brave:**
```bash
ls -la ~/Library/Application\ Support/BraveSoftware/Brave-Browser/Default/Extensions/
```

**Linux - Chrome:**
```bash
ls -la ~/.config/google-chrome/Default/Extensions/
```

### Check Manifest Content

Read your extension's manifest:

```bash
# Find your extension ID first
EXT_ID="haekngngecedekgjbeoijeaapjkmblgp"  # Replace with yours

# macOS Chrome
find ~/Library/Application\ Support/Google/Chrome/Default/Extensions/$EXT_ID -name "manifest.json" -exec cat {} \;
```

Look for the `name` field to verify it contains "GitHub" and "IDE".

## Clean Up After Testing

When you're done testing:

```bash
# Unlink the package
npm unlink -g github-to-ide-host

# Verify it's gone
which gh2ide
# Should show: not found

# Clean up installation (if you installed during testing)
rm -rf ~/.github-to-ide
```

## Common Issues

### "command not found: gh2ide"

**Solution:**
```bash
cd native-host
npm link
```

### "No extension detected" but extension is installed

**Possible causes:**
1. Extension is disabled → Enable it in chrome://extensions
2. Extension is in non-Default profile → Feature only scans Default profile
3. Extension name doesn't match → Check manifest.json name field

**Debug:**
```bash
# Check if extension directory exists
ls -la ~/Library/Application\ Support/Google/Chrome/Default/Extensions/
```

### Installation succeeds but connection fails

**Solution:**
1. Restart your browser (critical!)
2. Check manifest has correct extension ID
3. Test connection from extension options page

### "Permission denied" errors

**Solution:**
- Run without `sudo` (npm link doesn't need it)
- Check directory permissions: `ls -la ~/.github-to-ide`

## Platform-Specific Notes

### macOS
- Extensions in: `~/Library/Application Support/[Browser]/Default/Extensions/`
- Manifests in: `~/Library/Application Support/[Browser]/NativeMessagingHosts/`

### Linux
- Extensions in: `~/.config/[browser]/Default/Extensions/`
- Manifests in: `~/.config/[browser]/NativeMessagingHosts/`

### Windows
- Extensions in: `%LOCALAPPDATA%\[Browser]\User Data\Default\Extensions\`
- Manifests in: `%LOCALAPPDATA%\[Browser]\User Data\Default\NativeMessagingHosts\`
- Note: Windows requires registry entries (CLI shows instructions)

## Success Criteria

You've successfully tested when:

✅ Auto-detection finds your extension  
✅ Installation completes without errors  
✅ Native host files are created  
✅ Manifests are created for all browsers  
✅ Browser connection test passes  
✅ Help and version commands work  
✅ Uninstall removes everything cleanly

## Next Steps

Once local testing is complete:

1. Review changes: `git status`
2. Commit changes: `git add . && git commit -m "feat: add auto-detection v1.2.0"`
3. Publish to npm: `npm publish`
4. Create git tag: `git tag -a v1.2.0 -m "Auto-detection feature"`
5. Push: `git push && git push --tags`

---

**Happy Testing! 🎉**

If you encounter any issues, check the debugging section or create an issue on GitHub.

