'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(os.tmpdir(), `safeledger-gui-smoke-${process.pid}-${Date.now()}`);
fs.mkdirSync(root, { recursive: true });

let electronPath;
try {
  electronPath = require('electron');
} catch (err) {
  console.error(`FAIL SafeLedger GUI startup smoke: Electron executable unavailable: ${err.message}`);
  process.exit(1);
}

const result = spawnSync(electronPath, ['.', '--disable-gpu'], {
  cwd: path.join(__dirname, '..'),
  env: Object.assign({}, process.env, {
    SAFELEDGER_GUI_SMOKE: '1',
    PORTABLE_EXECUTABLE_DIR: root,
    ELECTRON_DISABLE_SECURITY_WARNINGS: 'true'
  }),
  stdio: 'inherit',
  timeout: 30000
});

try { fs.rmSync(root, { recursive: true, force: true }); } catch (_) {}

if (result.error) {
  console.error(`FAIL SafeLedger GUI startup smoke: ${result.error.message}`);
  process.exit(1);
}
if (result.signal) {
  console.error(`FAIL SafeLedger GUI startup smoke: Electron ended with signal ${result.signal}`);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status == null ? 1 : result.status);
