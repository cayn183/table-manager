#!/usr/bin/env node

/**
 * File Encoding Fixer
 * 
 * Detects und fixes encoding issues in TypeScript/React files
 * that may have resulted in corrupted UTF-8 characters (ü → ³, ö → ³, etc.)
 * 
 * Run: node scripts/fix-encoding.js
 */

const fs = require('fs');
const path = require('path');

// Map commonly corrupted Unicode sequences back to proper UTF-8
const ENCODING_FIXES = {
  // Common Windows-1252 → UTF-8 corruption patterns
  'gebr\xfcck': 'gebrück', // Not common but example
  'r\xfccksicht': 'rücksicht',
  'Eigent\xbfmer': 'Eigentümer',
  'Eigent\xb3mer': 'Eigentümer',
  'gelÃ¶scht': 'gelöscht',
  'gel\xb6scht': 'gelöscht',
  'Mitglied\xbfber': 'Mitgliedüber',
  'Mitgliedversamml': 'Mitgliederversammlung',
  '\xbcber': 'über',
  '\xbcrle': 'örle',
  '/ï¿½': '/ü', // Browser display corruption
};

const srcDir = path.join(__dirname, '../src');

function checkAndFixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Check for common patterns that indicate encoding issues
    if (/[^a-zA-Z0-9üöäÜÖÄß\s\-_./:@#(),;'"!?[\]{}=+*/<>|\\]zu/.test(content)) {
      // Potential encoding issue detected
      let fixes = 0;
      Object.entries(ENCODING_FIXES).forEach(([broken, correct]) => {
        if (content.includes(broken)) {
          console.log(`  📝 Fixed: ${broken} → ${correct}`);
          content = content.replaceAll(broken, correct);
          fixes++;
          modified = true;
        }
      });
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ File fixed: ${path.relative(process.cwd(), filePath)} (${fixes} replacements)\n`);
      }
    }
    
    return modified;
  } catch (e) {
    console.warn(`⚠️  Could not process ${filePath}: ${e.message}`);
    return false;
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let fixedCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
      fixedCount += walkDir(filePath);
    } else if ((file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) && file !== 'node_modules') {
      if (checkAndFixFile(filePath)) {
        fixedCount++;
      }
    }
  });
  
  return fixedCount;
}

async function main() {
  console.log('🔧 Scanning for encoding issues in TypeScript/React files...\n');
  
  const fixed = walkDir(srcDir);
  
  if (fixed === 0) {
    console.log('✅ No encoding issues detected!');
  } else {
    console.log(`\n✅ Fixed ${fixed} file(s)`);
  }
  
  console.log('\n💡 If problems persist:');
  console.log('   1. Ensure VS Code saves files as UTF-8 (no BOM)');
  console.log('   2. Right-click file → "Reopen with Encoding" → UTF-8');
  console.log('   3. Restart: npm run dev');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
