#!/usr/bin/env node
const { spawnSync, execSync } = require('child_process');
const path = require('path');

function getGitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    return 'unknown';
  }
}

let pkgVersion = 'dev';
try {
  // require from project root
  const pkg = require(path.join(__dirname, '..', 'package.json'));
  pkgVersion = pkg.version || 'dev';
} catch (e) {}

// Only set VITE_BUILD_* if they are not already provided by the environment
process.env.VITE_BUILD_VERSION = process.env.VITE_BUILD_VERSION || pkgVersion;
process.env.VITE_BUILD_SHA = process.env.VITE_BUILD_SHA || getGitSha();

console.log(`Building with VITE_BUILD_VERSION=${process.env.VITE_BUILD_VERSION} VITE_BUILD_SHA=${process.env.VITE_BUILD_SHA}`);

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['vite', 'build'];
const res = spawnSync(cmd, args, { stdio: 'inherit', env: process.env });
process.exit(res.status);
