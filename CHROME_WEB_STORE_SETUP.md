# Chrome Web Store Setup Guide

This document contains all the information needed to successfully publish this extension to the Chrome Web Store.

## Before You Submit

1. ✅ Verify all code changes are committed
2. ✅ Test the extension thoroughly (see CHANGES.md for test scenarios)
3. ✅ Ensure your contact email is added and verified in the Chrome Web Store Developer Dashboard
4. ✅ Prepare promotional images/screenshots (see recommendations below)

## Privacy Practices Tab

### Single Purpose Description
```
This extension intercepts GitHub repository and file links and opens them directly in the user's preferred IDE (VS Code, Cursor, JetBrains Rider, or custom editors) through a local native messaging helper, eliminating manual copy-paste workflows.
```

### Permission Justifications

#### Host Permissions (https://github.com/*)
```
Required to inject UI elements into GitHub pages (header dropdown for editor selection) and to intercept GitHub repository and file links when clicked by the user. The extension only functions on GitHub.com and does not access any other websites.
```

#### nativeMessaging
```
Essential for communicating with the local native host application that launches the user's chosen IDE with the appropriate repository path and file location. This is the core mechanism that enables opening GitHub links in local editors.
```

#### notifications
```
Used to provide user feedback when repositories are being cloned, files are being opened, or when errors occur (e.g., repository not found locally, IDE not available). Notifications keep users informed of the extension's actions and status. Also used to display a one-time welcome message with setup instructions.
```

#### scripting
```
Required to inject content scripts into GitHub pages to add the editor selection dropdown in the page header and to intercept link clicks. This enables the extension's UI integration with GitHub's interface.
```

#### storage
```
Used to persist user configuration including: preferred default editor, clone directory paths, per-repository editor preferences, auto-open toggle state, and custom editor definitions. No user data is transmitted externally; all storage is local.
```

#### tabs
```
Required to detect which GitHub page the user is viewing (to show repository-specific settings) and to optionally close tabs after successfully opening content in the IDE. This enhances the user experience by maintaining context.
```

#### webNavigation
```
Used to detect when users navigate to different GitHub pages (repositories, files, pull requests) to update the header UI with the appropriate editor options and repository context. This ensures the extension UI stays synchronized with page navigation.
```

#### Remote Code
```
This extension does NOT use remote code. All code is packaged within the extension. The native messaging host is a separate local application that users install manually on their machine - it is not remote code executed by the extension.
```

### Data Usage Certification

- **Does this item collect or transmit user data?** → **No**
- **Does this item use personal or sensitive user data?** → **No**

**Explanation:**
```
This extension does not collect, store, or transmit any user data externally. All configuration settings (editor preferences, clone paths) are stored locally using Chrome's storage API and never leave the user's device. The extension only communicates with a local native messaging host on the user's machine to launch IDE applications.
```

## Store Listing

### Name
```
GitHub to IDE
```

### Short Description (132 characters max)
```
Open GitHub repositories and files directly in your IDE with one click. Supports VS Code, Cursor, Rider, and custom editors.
```

### Detailed Description
```
🚀 GitHub to IDE - Seamless GitHub to Editor Integration

Stop copying repository URLs and manually opening files in your editor. GitHub to IDE intercepts GitHub links and opens them directly in your preferred IDE with a single click.

✨ KEY FEATURES

• One-Click Opening: Click any GitHub link to automatically open repositories and files in your IDE
• Smart File Navigation: Opens files at the exact line number from GitHub code links
• Multiple Editor Support: Works with VS Code, Cursor, JetBrains Rider, and custom editors
• Per-Repository Preferences: Set different editors for different projects
• Flexible Open Modes: Choose between opening the full workspace or just the current file
• Customizable Settings: Configure clone directories, default editors, and per-repo overrides
• Auto-Open Toggle: Enable/disable automatic interception on the fly
• Header UI Integration: Convenient dropdown in GitHub's header for quick editor selection

🎯 HOW IT WORKS

1. Browse GitHub normally
2. Click any repository or file link
3. The extension intercepts the click and opens it in your configured IDE
4. Files open at the exact line number when applicable

The extension uses a local native helper to communicate with your IDE, ensuring secure and reliable operation.

⚙️ SUPPORTED EDITORS

• Visual Studio Code
• Cursor
• JetBrains Rider
• Add your own custom editors through the options page

💡 PERFECT FOR

• Developers who frequently browse GitHub repositories
• Teams collaborating on code reviews
• Anyone tired of manual copy-paste workflows
• Developers working across multiple projects with different editors

📋 SETUP REQUIRED

After installing the extension, you'll need to install a small native helper that communicates with your IDE. Installation is simple:

Run this command in your terminal:
  npx gh2ide

Or get your personalized command from the extension options page. The extension provides:
• Interactive CLI that guides you through setup
• "Test Connection" button to verify everything is working
• Clear status indicators showing when setup is complete

Requires Node.js 16+. Full setup instructions are available on the options page.

🔒 PRIVACY & SECURITY

• Works entirely locally - no data sent to external servers
• Only accesses GitHub.com pages
• Open source - inspect the code yourself

🌟 PRODUCTIVITY BOOST

Save countless hours by eliminating the friction between browsing GitHub and editing code. Jump from code review to your IDE instantly, navigate from documentation to implementation seamlessly, and streamline your entire development workflow.

---

Developed by Justin Loveless | Open Source on GitHub
```

### Category
```
Developer Tools
```

### Language
```
English (United States)
```

## Screenshots to Include

1. **GitHub Repository with Header Dropdown** (1280x800 or 640x400)
   - Show the extension's dropdown menu in GitHub's header
   - Highlight the editor selection and open mode options

2. **Options Page** (1280x800 or 640x400)
   - Show the configuration interface
   - Highlight the "Test Connection" button
   - Show the native host install command

3. **Connection Status** (1280x800 or 640x400)
   - Show successful connection test with green checkmark
   - Display the status indicator

4. **File Opening in Action** (1280x800 or 640x400)
   - Show a GitHub file page
   - Demonstrate the file opening in VS Code/Cursor with the correct line highlighted

5. **Per-Repository Settings** (1280x800 or 640x400)
   - Show the per-repository overrides table
   - Demonstrate different editors for different projects

## Promotional Images (Optional but Recommended)

- **Small Promo Tile:** 440x280 PNG
- **Large Promo Tile:** 920x680 PNG  
- **Marquee Promo Tile:** 1400x560 PNG

## Version Information

- **Version:** 0.1.0
- **Manifest Version:** 3

## Support Links

- **Website:** https://github.com/justinloveless/github-to-ide
- **Support URL:** https://github.com/justinloveless/github-to-ide/issues

## Publishing Checklist

- [ ] All privacy practice justifications filled out
- [ ] Data usage certified
- [ ] Contact email added and verified
- [ ] Store listing description written
- [ ] Screenshots uploaded (minimum 1, recommended 5)
- [ ] Category set to "Developer Tools"
- [ ] Version number matches manifest.json
- [ ] Extension tested in production mode (not just unpacked)
- [ ] Native host install script tested on clean machine
- [ ] All features work as described in listing

## After Approval

1. Update README.md with Chrome Web Store installation link
2. Add Chrome Web Store badge to repository
3. Update installation instructions to reference Web Store listing
4. Consider adding a changelog for future updates

## Notes

- First review may take 1-3 days
- Chrome may request additional information or changes
- Be responsive to reviewer feedback
- Keep the description focused on functionality, not marketing hype

