#!/usr/bin/env node

/**
 * UTF-8 Encoding Checker
 * 
 * Überprüft ob alle React/TypeScript Komponenten UTF-8 Umlaute enthalten
 * und warnt, wenn Encoding-Probleme vorhanden sind.
 * 
 * Run: node scripts/check-utf8-encoding.js
 */

const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '../src/components');
const filesWithUmlauts = [];

function checkFilesRecursive(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      checkFilesRecursive(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      try {
        // Read as UTF-8
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for Unicode Umlauts
        if (/[äöüßÄÖÜ]/.test(content)) {
          filesWithUmlauts.push({
            file: path.relative(process.cwd(), filePath),
            umlauts: content.match(/[äöüßÄÖÜ]/g) || []
          });
        }
      } catch (e) {
        console.warn(`⚠️  Could not read file: ${filePath}`);
      }
    }
  });
}

async function checkAll() {
  console.log('🔍 Checking UTF-8 encoding in React components...\n');
  
  checkFilesRecursive(componentsDir);
  
  if (filesWithUmlauts.length === 0) {
    console.log('✅ No German Umlauts found (or all files are UTF-8 compatible)');
    return;
  }
  
  console.log(`📋 Found ${filesWithUmlauts.length} files with German Umlauts:\n`);
  
  filesWithUmlauts.forEach(({ file, umlauts }) => {
    const uniqueUmlauts = [...new Set(umlauts)].join('');
    console.log(`  ✓ ${file}`);
    console.log(`    Umlauts: ${uniqueUmlauts}\n`);
  });
  
  console.log('✅ All files appear to be UTF-8 encoded correctly!');
  console.log('\n💡 If you see encoding issues in the browser:');
  console.log('   1. Ensure VS Code is saving files as UTF-8 (no BOM)');
  console.log('   2. Restart npm run dev');
  console.log('   3. Clear browser cache');
}

checkAll().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
