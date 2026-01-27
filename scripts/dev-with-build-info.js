#!/usr/bin/env node
const { spawnSync, execSync } = require('child_process');

function getGitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    return 'unknown';
  }
}

process.env.VITE_BUILD_VERSION = 'dev';
process.env.VITE_BUILD_SHA = getGitSha();

console.log(`Starting dev with VITE_BUILD_VERSION=${process.env.VITE_BUILD_VERSION} VITE_BUILD_SHA=${process.env.VITE_BUILD_SHA}`);

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['vite'];
const res = spawnSync(cmd, args, { stdio: 'inherit', env: process.env });
process.exit(res.status);
