#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdirSync, chmodSync, readFileSync, cpSync, rmSync, existsSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { createInterface } from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VERSION = '1.1.0';

function showHelp() {
  console.log(`
GitHub to IDE Native Host Installer v${VERSION}

USAGE:
  npx gh2ide [OPTIONS]

OPTIONS:
  --extension-id <id>    Chrome extension ID (required for install)
  --uninstall            Remove the native host
  --help, -h             Show this help message
  --version, -v          Show version number

EXAMPLES:
  # Install with extension ID
  npx gh2ide --extension-id abc123xyz

  # Interactive mode (prompts for extension ID)
  npx gh2ide

  # Uninstall the native host
  npx gh2ide --uninstall

  # Show help
  npx gh2ide --help

FINDING YOUR EXTENSION ID:
  1. Open Chrome and navigate to: chrome://extensions
  2. Enable "Developer mode" (toggle in top-right)
  3. Find "GitHub to IDE" extension
  4. Copy the ID shown below the extension name
     (Example: haekngngecedekgjbeoijeaapjkmblgp)

WHAT THIS DOES:
  - Installs the native messaging host to ~/.github-to-ide/native-host
  - Creates a manifest file for Chrome to communicate with the extension
  - Configures your system to allow the extension to open files in your IDE

SUPPORTED PLATFORMS:
  - macOS
  - Linux
  - Windows (limited support)

MORE INFO:
  https://github.com/justinloveless/github-to-ide
`);
}

function showVersion() {
  console.log(`gh2ide v${VERSION}`);
}

async function promptForExtensionId() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n📋 GitHub to IDE - Native Host Installation\n');
  console.log('To find your extension ID:');
  console.log('  1. Open chrome://extensions in your browser');
  console.log('  2. Enable "Developer mode" (toggle in top-right corner)');
  console.log('  3. Find the "GitHub to IDE" extension');
  console.log('  4. Copy the ID shown below the extension name');
  console.log('     (It looks like: haekngngecedekgjbeoijeaapjkmblgp)\n');

  return new Promise((resolve) => {
    rl.question('Enter your Chrome extension ID: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function validateExtensionId(extensionId) {
  // Chrome extension IDs are 32 characters, lowercase letters a-p
  const isValid = /^[a-p]{32}$/.test(extensionId);
  if (!isValid) {
    console.error('\n❌ Invalid extension ID format.');
    console.error('   Extension IDs should be 32 characters (a-p only).');
    console.error('   Example: haekngngecedekgjbeoijeaapjkmblgp\n');
    return false;
  }
  return true;
}

async function install(extensionId) {
  if (!extensionId) {
    console.error('\n❌ Error: Extension ID is required\n');
    showHelp();
    process.exit(1);
  }

  if (!validateExtensionId(extensionId)) {
    process.exit(1);
  }

  console.log('\n🚀 Installing GitHub to IDE native host...\n');
  
  const home = homedir();
  const installDir = join(home, '.github-to-ide', 'native-host');
  const hostPath = join(installDir, 'index.js');
  const runScriptPath = join(installDir, 'run.sh');
  
  try {
    // Create directory
    console.log('📁 Creating installation directory...');
    mkdirSync(installDir, { recursive: true });
    
    // Copy files
    console.log('📦 Copying native host files...');
    const indexJsSource = join(__dirname, 'index.js');
    const runShSource = join(__dirname, 'run.sh');
    
    cpSync(indexJsSource, hostPath);
    cpSync(runShSource, runScriptPath);
    chmodSync(runScriptPath, 0o755);
    
    // Create manifest
    console.log('📝 Creating native messaging manifest...');
    const manifestName = 'com.lovelesslabs.vscodeopener.json';
    let manifestDir;
    
    const os = platform();
    if (os === 'darwin') {
      // macOS - try multiple browser locations
      const browsers = [
        ['Chrome', join(home, 'Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts')],
        ['Chrome Beta', join(home, 'Library', 'Application Support', 'Google', 'Chrome Beta', 'NativeMessagingHosts')],
        ['Chromium', join(home, 'Library', 'Application Support', 'Chromium', 'NativeMessagingHosts')],
        ['Brave', join(home, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser', 'NativeMessagingHosts')],
        ['Edge', join(home, 'Library', 'Application Support', 'Microsoft Edge', 'NativeMessagingHosts')]
      ];
      
      manifestDir = browsers[0][1]; // Default to Chrome
      
      // Install to all found browsers
      for (const [browserName, dir] of browsers) {
        try {
          mkdirSync(dir, { recursive: true });
          const manifestPath = join(dir, manifestName);
          const manifest = {
            name: 'com.lovelesslabs.vscodeopener',
            description: 'GitHub to IDE native messaging host',
            path: runScriptPath,
            type: 'stdio',
            allowed_origins: [`chrome-extension://${extensionId}/`]
          };
          writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
          console.log(`   ✓ Installed for ${browserName}`);
        } catch (err) {
          // Browser not installed, skip silently
        }
      }
    } else if (os === 'linux') {
      // Linux
      const browsers = [
        ['Chrome', join(home, '.config', 'google-chrome', 'NativeMessagingHosts')],
        ['Chromium', join(home, '.config', 'chromium', 'NativeMessagingHosts')],
        ['Brave', join(home, '.config', 'BraveSoftware', 'Brave-Browser', 'NativeMessagingHosts')]
      ];
      
      manifestDir = browsers[0][1]; // Default to Chrome
      
      for (const [browserName, dir] of browsers) {
        try {
          mkdirSync(dir, { recursive: true });
          const manifestPath = join(dir, manifestName);
          const manifest = {
            name: 'com.lovelesslabs.vscodeopener',
            description: 'GitHub to IDE native messaging host',
            path: runScriptPath,
            type: 'stdio',
            allowed_origins: [`chrome-extension://${extensionId}/`]
          };
          writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
          console.log(`   ✓ Installed for ${browserName}`);
        } catch (err) {
          // Browser not installed, skip silently
        }
      }
    } else if (os === 'win32') {
      console.log('\n⚠️  Windows Installation');
      console.log('Windows requires registry entries. Please run as administrator:');
      console.log('\nRegistry path: HKEY_CURRENT_USER\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.lovelesslabs.vscodeopener');
      console.log(`Value: "${join(installDir, manifestName)}"`);
      console.log('\nFor more details, see: https://developer.chrome.com/docs/apps/nativeMessaging/\n');
      process.exit(1);
    } else {
      console.error(`\n❌ Unsupported platform: ${os}`);
      console.error('Supported platforms: macOS, Linux, Windows\n');
      process.exit(1);
    }
    
    console.log('\n✅ Installation complete!\n');
    console.log(`   Native host: ${hostPath}`);
    console.log(`   Manifest: ${manifestDir}\n`);
    console.log('🔄 Please restart your browser for changes to take effect.\n');
    console.log('🧪 Test the connection from the extension options page.\n');
    
  } catch (error) {
    console.error('\n❌ Installation failed:', error.message);
    console.error('\nPlease report issues at: https://github.com/justinloveless/github-to-ide/issues\n');
    process.exit(1);
  }
}

async function uninstall() {
  console.log('\n🗑️  Uninstalling GitHub to IDE native host...\n');
  
  const home = homedir();
  const installDir = join(home, '.github-to-ide');
  const manifestName = 'com.lovelesslabs.vscodeopener.json';
  
  let filesRemoved = 0;
  let errors = [];
  
  try {
    // Remove installation directory
    if (existsSync(installDir)) {
      console.log('📁 Removing installation directory...');
      rmSync(installDir, { recursive: true, force: true });
      console.log(`   ✓ Removed ${installDir}`);
      filesRemoved++;
    } else {
      console.log('   ℹ️  Installation directory not found (already removed)');
    }
    
    // Remove manifests from all browsers
    console.log('📝 Removing native messaging manifests...');
    
    const os = platform();
    let manifestDirs = [];
    
    if (os === 'darwin') {
      manifestDirs = [
        ['Chrome', join(home, 'Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts')],
        ['Chrome Beta', join(home, 'Library', 'Application Support', 'Google', 'Chrome Beta', 'NativeMessagingHosts')],
        ['Chromium', join(home, 'Library', 'Application Support', 'Chromium', 'NativeMessagingHosts')],
        ['Brave', join(home, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser', 'NativeMessagingHosts')],
        ['Edge', join(home, 'Library', 'Application Support', 'Microsoft Edge', 'NativeMessagingHosts')]
      ];
    } else if (os === 'linux') {
      manifestDirs = [
        ['Chrome', join(home, '.config', 'google-chrome', 'NativeMessagingHosts')],
        ['Chromium', join(home, '.config', 'chromium', 'NativeMessagingHosts')],
        ['Brave', join(home, '.config', 'BraveSoftware', 'Brave-Browser', 'NativeMessagingHosts')]
      ];
    } else if (os === 'win32') {
      console.log('   ⚠️  Windows: You may need to manually remove registry entries');
      console.log('   Registry path: HKEY_CURRENT_USER\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.lovelesslabs.vscodeopener\n');
    }
    
    for (const [browserName, dir] of manifestDirs) {
      const manifestPath = join(dir, manifestName);
      if (existsSync(manifestPath)) {
        try {
          rmSync(manifestPath, { force: true });
          console.log(`   ✓ Removed ${browserName} manifest`);
          filesRemoved++;
        } catch (err) {
          errors.push(`Failed to remove ${browserName} manifest: ${err.message}`);
          console.log(`   ✗ Failed to remove ${browserName} manifest`);
        }
      }
    }
    
    if (filesRemoved === 0 && errors.length === 0) {
      console.log('\n⚠️  No installation found. Nothing to uninstall.\n');
      console.log('The native host may have already been uninstalled, or was never installed.\n');
      return;
    }
    
    console.log('\n✅ Uninstallation complete!\n');
    
    if (filesRemoved > 0) {
      console.log(`   Removed ${filesRemoved} file(s)/directory(ies)\n`);
    }
    
    if (errors.length > 0) {
      console.log('⚠️  Some errors occurred:\n');
      errors.forEach(err => console.log(`   • ${err}`));
      console.log('');
    }
    
    console.log('🔄 Please restart your browser for changes to take effect.\n');
    
  } catch (error) {
    console.error('\n❌ Uninstallation failed:', error.message);
    console.error('\nPlease report issues at: https://github.com/justinloveless/github-to-ide/issues\n');
    process.exit(1);
  }
}

// Main CLI logic
async function main() {
  const args = process.argv.slice(2);
  
  // Handle help
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  // Handle version
  if (args.includes('--version') || args.includes('-v')) {
    showVersion();
    process.exit(0);
  }
  
  // Handle uninstall
  if (args.includes('--uninstall')) {
    await uninstall();
    process.exit(0);
  }
  
  // Get extension ID from args
  const extensionIdIndex = args.indexOf('--extension-id');
  let extensionId = extensionIdIndex !== -1 ? args[extensionIdIndex + 1] : null;
  
  // If no extension ID provided, enter interactive mode
  if (!extensionId) {
    extensionId = await promptForExtensionId();
    
    if (!extensionId) {
      console.error('\n❌ Extension ID is required. Installation cancelled.\n');
      process.exit(1);
    }
  }
  
  await install(extensionId);
}

main().catch((error) => {
  console.error('\n❌ Unexpected error:', error.message);
  process.exit(1);
});

