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

const renderer = read('src/main/renderer.js');
const ui = read('src/main/lockout-ui-enhancements.js');
const cryptoUi = read('src/main/crypto-ui-bridge.js');
const services = read('src/main/renderer-services.js');
const preload = read('src/main/preload.js');
assert(renderer.includes("const lockoutUi = require('./lockout-ui-enhancements');"));
assert(renderer.includes('lockoutUi.handleSecurityResult({ settings: state.settings });'));
assert(!ui.includes("ipc.on('result-init-system'"),
  'Lockout UI must render from canonical renderer state, not transport events.');
assert(ui.includes("header.textContent = 'Login temporarily locked'"));
assert(ui.includes('safeLedgerLockoutCountdown'));
assert(ui.includes('window.setInterval(updateCountdown, 1000)'));
assert(!preload.includes('login-retry-guard'));
assert(cryptoUi.includes('rendererState.getSettings()'));
assert(cryptoUi.includes('services.recordPasswordFailure()'));
assert(services.includes("const recordPasswordFailure = () => required('recordPasswordFailure')();"));
assert(!cryptoUi.includes("document.addEventListener('click'"));
assert(!cryptoUi.includes('stopImmediatePropagation'));

for (const relative of [
  'src/main/lockout-state.js','src/main/lockout-ui-enhancements.js','src/main/crypto-ui-bridge.js',
  'src/main/renderer-state.js','src/main/renderer-services.js','src/main/renderer.js','src/main/preload.js'
]) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}
console.log('PASS lockout countdown, canonical renderer state, and direct login retry behavior remain active behind the sandbox bridge.');
