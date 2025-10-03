# Post-npm Publishing Checklist

## ✅ Completed

- [x] Published `github-to-ide-host` to npm
- [x] Updated `extension/options.html` to show `npx gh2ide` command
- [x] Updated `extension/options.js` to use new command
- [x] Updated `extension/background.js` first-run notification
- [x] Updated main `README.md` with npm installation instructions
- [x] Updated `CHROME_WEB_STORE_SETUP.md` store listing
- [x] Created `native-host/README.md` with npm documentation
- [x] Created `native-host/PUBLISHING.md` with publishing guide
- [x] Created `NPM_PACKAGE.md` implementation overview
- [x] Created `RELEASE_NOTES.md` for this update
- [x] All linter checks passed

## 🚀 Next Steps

### 1. Test the Extension

Test the full flow with the published npm package:

```bash
# Unload current extension from chrome://extensions
# Reload the extension from the extension/ folder
# Test first-run notification
# Copy the install command from options page
# Run it in terminal
# Verify installation works
# Test the connection from options page
```

### 2. Update Git Repository

```bash
# Review all changes
git status
git diff

# Stage changes
git add .

# Commit with clear message
git commit -m "feat: migrate native host to npm package (gh2ide)

- Published native host as npm package: github-to-ide-host
- Added interactive CLI with help system
- Updated all documentation to use 'npx gh2ide'
- Simplified installation process
- Added npm package link to options page
- Updated first-run notification with npm command"

# Push to GitHub
git push origin main
```

### 3. Create GitHub Release

1. Go to: https://github.com/justinloveless/github-to-ide/releases
2. Click "Draft a new release"
3. Tag version: `v1.1.0` (or appropriate version)
4. Release title: "npm Package Integration - v1.1.0"
5. Copy content from `RELEASE_NOTES.md`
6. Publish release

### 4. Test npm Package

Verify the package works for new users:

```bash
# Test in a clean terminal session
npx gh2ide --help
npx gh2ide --version

# Test interactive mode
npx gh2ide
# (Enter a test extension ID)

# Verify it installed correctly
ls -la ~/.github-to-ide/native-host/
ls -la ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/
```

### 5. Update Chrome Web Store (Optional)

If already published to Chrome Web Store:

1. Package the extension: `./scripts/package-extension.sh`
2. Upload new version to Chrome Web Store
3. Update store listing description (from `CHROME_WEB_STORE_SETUP.md`)
4. Submit for review

### 6. Announce the Update (Optional)

Consider sharing the update:

- [ ] Twitter/X
- [ ] LinkedIn
- [ ] Dev.to blog post
- [ ] Reddit (r/webdev, r/javascript, r/chrome)
- [ ] Hacker News
- [ ] Product Hunt

### 7. Monitor Package

Keep an eye on:

- npm package stats: https://npm-stat.com/charts.html?package=github-to-ide-host
- GitHub issues: https://github.com/justinloveless/github-to-ide/issues
- npm package page: https://www.npmjs.com/package/github-to-ide-host

### 8. Documentation Review

Double-check these pages render correctly:

- [ ] Main README.md on GitHub
- [ ] native-host/README.md on GitHub
- [ ] npm package README displays correctly
- [ ] All links work (especially npm links)

## 📝 Future Improvements

Ideas for next version:

1. **Auto-Update Checker**
   - Check npm for newer versions
   - Notify users in extension popup

2. **Uninstall Command**
   - `npx gh2ide --uninstall`
   - Clean up all files and manifests

3. **Better Error Handling**
   - More detailed error messages
   - Automatic troubleshooting suggestions

4. **Config Export/Import**
   - Export settings to file
   - Share configurations with team

5. **GitHub Action for Publishing**
   - Automate npm publishing on release
   - Run tests before publishing

6. **Windows Installer**
   - Better Windows support
   - Automatic registry configuration

7. **Multi-Extension Support**
   - Install for multiple extension IDs
   - Manage multiple installations

## 🐛 Known Issues

None currently! But keep track of any issues reported:

- GitHub Issues: https://github.com/justinloveless/github-to-ide/issues
- npm: Check for reports on package page

## 📊 Success Metrics

Track these over time:

- npm weekly downloads
- GitHub stars
- GitHub issues/PRs
- User feedback
- Chrome Web Store ratings (if published)

## 🎯 Goals

- [ ] 100 npm downloads in first month
- [ ] 10 GitHub stars
- [ ] Positive user feedback
- [ ] Zero critical bugs
- [ ] Chrome Web Store approval (if submitted)

---

**Last Updated:** October 3, 2025  
**Status:** Ready for testing and deployment

