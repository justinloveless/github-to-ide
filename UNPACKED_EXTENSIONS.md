# Unpacked Extensions & Auto-Detection

## The Issue

**Unpacked extensions cannot be auto-detected.** Here's why:

### How Chrome Stores Extensions

**Installed Extensions** (from Chrome Web Store or .crx files):
```
~/Library/Application Support/Google/Chrome/Default/Extensions/
  ├── haekngngecedekgjbeoijeaapjkmblgp/  ← Extension ID directory
  │   └── 1.0.0_0/
  │       ├── manifest.json
  │       ├── background.js
  │       └── ... other files
```

**Unpacked Extensions** (loaded via "Load unpacked"):
```
~/Library/Application Support/Google/Chrome/Default/Extensions/
  (nothing here - the extension files stay in your project directory)
```

Chrome only creates a reference to your project directory in its internal Preferences file, not a copy in the Extensions folder.

## The Solution

Since auto-detection scans the Extensions directory, **unpacked extensions won't be found**. Users must enter the extension ID manually.

### Updated User Experience

When running `npx gh2ide`:

```
📋 GitHub to IDE - Native Host Installation

🔍 Scanning for GitHub to IDE extension...

ℹ️  No GitHub to IDE extension detected automatically.

💡 Note: Unpacked extensions (loaded via "Load unpacked") cannot be
   auto-detected. Please enter your extension ID manually.

To find your extension ID manually:
  1. Open chrome://extensions in your browser
  2. Enable "Developer mode" (toggle in top-right corner)
  3. Find the "GitHub to IDE" extension
  4. Copy the ID shown below the extension name
     (It looks like: haekngngecedekgjbeoijeaapjkmblgp)

Enter your Chrome extension ID: _
```

## Why We Can't Easily Fix This

### Option 1: Parse Chrome Preferences File ❌

Chrome stores extension info in:
```
~/Library/Application Support/Google/Chrome/Default/Preferences
```

**Problems:**
- File format is complex JSON with internal Chrome IDs
- Structure can change between Chrome versions
- Chrome might lock the file while running
- Fragile and error-prone approach

### Option 2: Use Chrome APIs ❌

**Problems:**
- Would require running Chrome with debugging enabled
- Complex setup for users
- Not cross-platform
- Defeats the purpose of easy installation

### Option 3: Manual Entry ✅

**Benefits:**
- Simple and reliable
- Works for all extensions (unpacked or installed)
- Extension ID is easy to find in chrome://extensions
- No complex parsing or Chrome dependencies

## For Development

If you're developing the extension locally with "Load unpacked":

1. Get your extension ID from `chrome://extensions`
2. Use direct installation:
   ```bash
   npx gh2ide --extension-id your-extension-id-here
   ```

Or use interactive mode and enter manually when prompted.

## For Published Extension

Once published to Chrome Web Store, users who install it normally **will** benefit from auto-detection! 🎉

The auto-detection feature is designed for production use, making it super easy for end-users to install the native host.

## Arc Browser Support

We've added **Arc browser support**! The CLI now:

✅ Detects extensions in Arc  
✅ Installs manifests to Arc's directory  
✅ Removes Arc manifests on uninstall

Arc extensions are stored at:
```
~/Library/Application Support/Arc/User Data/Default/Extensions/
```

Note: Arc also can't auto-detect unpacked extensions, for the same reasons.

## Summary

| Extension Type | Auto-Detection | Workaround |
|---------------|----------------|------------|
| Chrome Web Store | ✅ Works | - |
| Packed .crx file | ✅ Works | - |
| Unpacked (dev) | ❌ Can't detect | Enter ID manually |

**For developers:** Use manual entry during development  
**For end-users:** Auto-detection works perfectly once published!

---

This is a limitation of how Chrome manages unpacked extensions, not a bug in our detection logic.

