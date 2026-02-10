#!/usr/bin/env node
const { spawn } = require('child_process');

const rawLevel = (process.env.VITE_LOG_LEVEL || 'info').toLowerCase();
const level = ['info', 'warn', 'error', 'silent'].includes(rawLevel) ? rawLevel : 'info';

// Optional verbose debug for Vite internals
if (rawLevel === 'debug' && !process.env.DEBUG) {
  process.env.DEBUG = 'vite:*';
}

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['vite', 'preview', '--host', '0.0.0.0', '--port', '5173', '--logLevel', level];

console.log(`[frontend] Starting preview with VITE_LOG_LEVEL=${rawLevel} (effective=${level})`);
console.log(`[frontend] Allowed hosts: ${process.env.VITE_PREVIEW_ALLOWED_HOSTS || 'localhost,127.0.0.1 (default)'}`);

const child = spawn(cmd, args, { stdio: 'inherit', env: process.env });

// Forward signals to child process for clean shutdown
function forward(signal) {
  if (child && !child.killed) child.kill(signal);
}
process.on('SIGTERM', () => forward('SIGTERM'));
process.on('SIGINT', () => forward('SIGINT'));

child.on('exit', (code, signal) => {
  process.exit(code != null ? code : 1);
});
