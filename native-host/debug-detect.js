#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { homedir, platform } from 'node:os';

const home = homedir();
const os = platform();

console.log('🔍 Debug: Extension Auto-Detection\n');
console.log(`Platform: ${os}`);
console.log(`Home: ${home}\n`);

let extensionDirs = [];

if (os === 'darwin') {
  extensionDirs = [
    ['Chrome', join(home, 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'Extensions')],
    ['Arc', join(home, 'Library', 'Application Support', 'Arc', 'User Data', 'Default', 'Extensions')],
    ['Chrome Beta', join(home, 'Library', 'Application Support', 'Google', 'Chrome Beta', 'Default', 'Extensions')],
    ['Chromium', join(home, 'Library', 'Application Support', 'Chromium', 'Default', 'Extensions')],
    ['Brave', join(home, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser', 'Default', 'Extensions')],
    ['Edge', join(home, 'Library', 'Application Support', 'Microsoft Edge', 'Default', 'Extensions')],
  ];
} else if (os === 'linux') {
  extensionDirs = [
    ['Chrome', join(home, '.config', 'google-chrome', 'Default', 'Extensions')],
    ['Chromium', join(home, '.config', 'chromium', 'Default', 'Extensions')],
    ['Brave', join(home, '.config', 'BraveSoftware', 'Brave-Browser', 'Default', 'Extensions')],
  ];
} else if (os === 'win32') {
  const appData = process.env.LOCALAPPDATA || join(home, 'AppData', 'Local');
  extensionDirs = [
    ['Chrome', join(appData, 'Google', 'Chrome', 'User Data', 'Default', 'Extensions')],
    ['Edge', join(appData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Extensions')],
    ['Brave', join(appData, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Extensions')],
  ];
}

console.log('📂 Checking extension directories:\n');

for (const [browserName, dir] of extensionDirs) {
  console.log(`\n${browserName}:`);
  console.log(`  Path: ${dir}`);
  
  if (!existsSync(dir)) {
    console.log(`  ❌ Directory does not exist`);
    continue;
  }
  
  console.log(`  ✅ Directory exists`);
  
  try {
    const extensionIds = readdirSync(dir);
    console.log(`  📦 Found ${extensionIds.length} extensions`);
    
    // Show first few extension IDs
    const validIds = extensionIds.filter(id => /^[a-p]{32}$/.test(id));
    console.log(`  🔑 Valid extension IDs (32 chars a-p): ${validIds.length}`);
    
    if (validIds.length > 0) {
      console.log(`\n  Checking extensions for GitHub to IDE...`);
    }
    
    for (const extensionId of validIds.slice(0, 10)) { // Check first 10
      const extensionPath = join(dir, extensionId);
      
      try {
        const versions = readdirSync(extensionPath);
        
        for (const version of versions) {
          const manifestPath = join(extensionPath, version, 'manifest.json');
          
          if (existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
              const name = manifest.name || 'Unknown';
              
              // Show all extension names for debugging
              console.log(`    - ${extensionId.substring(0, 8)}... : ${name}`);
              
              // Check if it matches our criteria
              const nameLower = name.toLowerCase();
              const hasGithub = nameLower.includes('github');
              const hasIDE = nameLower.includes('ide') || 
                            nameLower.includes('vscode') || 
                            nameLower.includes('editor');
              
              if (hasGithub && hasIDE) {
                console.log(`      🎯 MATCH! This should be detected!`);
                console.log(`      Name: ${name}`);
                console.log(`      Version: ${manifest.version}`);
                console.log(`      Full ID: ${extensionId}`);
              } else if (hasGithub) {
                console.log(`      ⚠️  Has "github" but missing "ide"/"vscode"/"editor"`);
              }
              
              break; // Only check first version
            } catch (err) {
              console.log(`    - ${extensionId.substring(0, 8)}... : Error reading manifest - ${err.message}`);
            }
          }
        }
      } catch (err) {
        // Skip unreadable extensions
      }
    }
    
    if (validIds.length > 10) {
      console.log(`  ... and ${validIds.length - 10} more extensions`);
    }
    
  } catch (err) {
    console.log(`  ❌ Error reading directory: ${err.message}`);
  }
}

console.log('\n\n💡 Troubleshooting Tips:\n');
console.log('1. Make sure the extension is loaded in your browser');
console.log('2. Check chrome://extensions - is it enabled?');
console.log('3. Look for the extension name in the list above');
console.log('4. The extension name must contain "github" AND ("ide" OR "vscode" OR "editor")');
console.log('\n5. If you see your extension but it says "missing ide/vscode/editor",');
console.log('   please share the exact extension name so we can update the detection logic.');

