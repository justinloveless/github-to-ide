# Publishing to npm

## Prerequisites

1. **npm account** - Create one at https://www.npmjs.com/signup if needed
2. **2FA enabled** - npm requires 2FA for package publishing
3. **Email verified** - Ensure your npm email is verified

## First Time Setup

1. **Login to npm:**
   ```bash
   npm login
   ```
   Enter your username, password, and 2FA code when prompted.

2. **Verify you're logged in:**
   ```bash
   npm whoami
   ```

## Before Publishing

1. **Update version** in `package.json` following [semver](https://semver.org/):
   - **Patch** (1.0.0 → 1.0.1): Bug fixes
   - **Minor** (1.0.0 → 1.1.0): New features, backward compatible
   - **Major** (1.0.0 → 2.0.0): Breaking changes

2. **Test locally:**
   ```bash
   # Link package locally
   npm link
   
   # Test the CLI
   gh2ide --help
   gh2ide --version
   
   # Test installation (use a real extension ID)
   gh2ide --extension-id YOUR_EXTENSION_ID
   
   # Unlink when done testing
   npm unlink -g github-to-ide-host
   ```

3. **Verify package contents:**
   ```bash
   npm pack --dry-run
   ```
   This shows what files will be included. Should see:
   - cli.js
   - index.js
   - run.sh
   - package.json
   - README.md

## Publishing

1. **Navigate to the native-host directory:**
   ```bash
   cd native-host
   ```

2. **Publish to npm:**
   ```bash
   npm publish
   ```
   
   Or for first publish of a scoped package:
   ```bash
   npm publish --access public
   ```

3. **Verify it worked:**
   ```bash
   npm info github-to-ide-host
   ```

## After Publishing

1. **Test the published package:**
   ```bash
   npx gh2ide@latest --help
   ```

2. **Create a git tag:**
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

3. **Create a GitHub release:**
   - Go to https://github.com/justinloveless/github-to-ide/releases
   - Click "Draft a new release"
   - Select the tag you just created
   - Add release notes
   - Publish release

## Version Updates

To publish a new version:

```bash
# Update version (automatically updates package.json and creates git tag)
npm version patch  # or minor, or major

# Publish
npm publish

# Push changes and tags
git push && git push --tags
```

## Unpublishing (Emergency Only)

⚠️ **Warning:** You can only unpublish within 72 hours of publishing, and it's discouraged.

```bash
npm unpublish github-to-ide-host@1.0.0
```

Instead, publish a new patch version with fixes.

## Deprecating a Version

If a version has bugs, deprecate it instead:

```bash
npm deprecate github-to-ide-host@1.0.0 "This version has a critical bug. Please upgrade to 1.0.1"
```

## Package Stats

Monitor your package:
- **npm:** https://www.npmjs.com/package/github-to-ide-host
- **Download stats:** https://npm-stat.com/charts.html?package=github-to-ide-host
- **Unpkg (CDN):** https://unpkg.com/github-to-ide-host/

## Troubleshooting

### "You must verify your email"
```bash
npm profile get
# Update email if needed
npm profile set email <your-email@example.com>
```

### "Package already exists"
The package name is taken. Choose a different name in `package.json`.

### "Invalid package name"
Package names must be lowercase, URL-safe, and not start with . or _

### "403 Forbidden"
Ensure you're logged in and have permission:
```bash
npm login
npm whoami
```

## Best Practices

1. **Test before publishing** - Always test with `npm link` first
2. **Write clear release notes** - Document changes for users
3. **Follow semver** - Don't break backward compatibility in minor/patch releases
4. **Keep README updated** - Ensure instructions are current
5. **Monitor issues** - Respond to npm or GitHub issues promptly
6. **Security** - Run `npm audit` before publishing

## Automation (Future)

Consider setting up GitHub Actions to automate publishing:

```yaml
# .github/workflows/publish.yml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: cd native-host && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

