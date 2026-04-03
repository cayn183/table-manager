#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function getGitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    return 'unknown';
  }
}

let pkgVersion = 'dev';
try {
  const pkg = require(path.join(__dirname, '..', 'package.json'));
  pkgVersion = pkg.version || 'dev';
} catch (e) {}

// Only set VITE_BUILD_* if they are not already provided by the environment
process.env.VITE_BUILD_VERSION = process.env.VITE_BUILD_VERSION || pkgVersion;
process.env.VITE_BUILD_SHA = process.env.VITE_BUILD_SHA || getGitSha();

console.log(`\n📦 Building with VITE_BUILD_VERSION=${process.env.VITE_BUILD_VERSION} VITE_BUILD_SHA=${process.env.VITE_BUILD_SHA}\n`);

try {
  // Step 1: Run Vite build
  console.log('🔨 Running Vite build...');
  execSync('npx vite build', { 
    stdio: 'inherit', 
    env: process.env 
  });
  
  // Step 2: Run prerender
  console.log('\n✨ Injecting SEO meta tags...');
  execSync('node scripts/prerender.js', { 
    stdio: 'inherit',
    cwd: __dirname + '/..',
    env: process.env 
  });
  
  // Step 3: Validate
  console.log('\n🔍 Validating build...');
  execSync('node scripts/validate-seo-build.js', { 
    stdio: 'inherit',
    cwd: __dirname + '/..',
    env: process.env 
  });
  
  console.log('\n✅ Build complete!\n');
  process.exit(0);
} catch (err) {
  console.error('\n❌ Build failed!\n', err.message);
  process.exit(1);
}
