#!/usr/bin/env node
const { spawnSync } = require('child_process');

const rawLevel = (process.env.VITE_LOG_LEVEL || 'info').toLowerCase();
const level = ['info', 'warn', 'error', 'silent'].includes(rawLevel) ? rawLevel : 'info';

// Optional verbose debug for Vite internals
if (rawLevel === 'debug' && !process.env.DEBUG) {
  process.env.DEBUG = 'vite:*';
}

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['vite', 'preview', '--host', '0.0.0.0', '--port', '5173', '--logLevel', level];

console.log(`Starting preview with VITE_LOG_LEVEL=${rawLevel} (effective=${level})`);
const res = spawnSync(cmd, args, { stdio: 'inherit', env: process.env });
process.exit(res.status);
