'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const lockoutState = require('../src/main/lockout-state');
const settingsManager = require('../src/main/installManager/installManager/settingsManager');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const now = 1_800_000_000_000;
const active = { lockLogin: true, lockLoginTime: now - 30_000, minutesToWaitBetweenLockout: 1, failAttemptCount: 0, lockOutCount: 2 };
const expired = Object.assign({}, active, { lockLoginTime: now - 120_000 });
assert.strictEqual(lockoutState.isLockoutActive(active, now), true);
assert.strictEqual(lockoutState.remainingLockoutMs(active, now), 30_000);
assert.strictEqual(lockoutState.isLockoutActive(expired, now), false);
assert.strictEqual(settingsManager._test.normalizeSettings(active, now).lockLogin, true);
assert.strictEqual(settingsManager._test.normalizeSettings(expired, now).lockLogin, false);

const entry = read('src/main/renderer-entry.js');
const ui = read('src/main/lockout-ui-enhancements.js');
const cryptoUi = read('src/main/crypto-ui-bridge.js');
const preload = read('src/main/preload.js');
assert(entry.includes("require('./lockout-ui-enhancements.js')"));
assert(ui.includes("ipc.on('result-init-system'"));
assert(ui.includes("header.textContent = 'Login temporarily locked'"));
assert(ui.includes('safeLedgerLockoutCountdown'));
assert(ui.includes('window.setInterval(updateCountdown, 1000)'));
assert(!preload.includes('login-retry-guard'));
assert(cryptoUi.includes("document.getElementById('loginBtn')"));
assert(cryptoUi.includes("params.status === 'ERROR'"));
assert(cryptoUi.includes('params.settings && params.settings.lockLogin'));

for (const relative of ['src/main/lockout-state.js','src/main/lockout-ui-enhancements.js','src/main/crypto-ui-bridge.js','src/main/preload.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}
console.log('PASS lockout countdown and direct login retry behavior remain active under the sandbox bridge.');
