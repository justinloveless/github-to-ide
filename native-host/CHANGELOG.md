# Changelog

All notable changes to the `github-to-ide-host` npm package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-10-03

### Added
- **Uninstall command**: `npx gh2ide --uninstall` removes all installed files and manifests
- Automatic cleanup of installation directory (`~/.github-to-ide`)
- Automatic removal of browser manifests from Chrome, Brave, Edge, and Chromium
- Error handling for partial uninstall failures
- Windows registry removal instructions for uninstall
- Comprehensive uninstall documentation

### Changed
- Help text updated to include uninstall option
- Documentation updated across all files with uninstall instructions

### Technical Details
- Added `rmSync` and `existsSync` imports from `node:fs`
- New `uninstall()` function with cross-platform support
- Graceful handling when native host is not installed

## [1.0.0] - 2025-10-03

### Added
- Initial release of `github-to-ide-host` npm package
- Interactive installation mode with guided prompts
- Direct installation with `--extension-id` flag
- Extension ID validation
- Multi-browser support (Chrome, Brave, Edge, Chromium)
- Cross-platform support (macOS, Linux, Windows)
- Help command (`--help`) with comprehensive documentation
- Version command (`--version`)
- Beautiful CLI output with emojis and status indicators
- Automatic manifest creation for all detected browsers
- Installation to `~/.github-to-ide/native-host`

### Features
- Interactive mode guides users through finding extension ID
- Validates extension ID format before installation
- Installs for multiple browsers simultaneously
- Clear error messages and troubleshooting guidance
- Professional npm package distribution

[1.1.0]: https://github.com/justinloveless/github-to-ide/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/justinloveless/github-to-ide/releases/tag/v1.0.0

