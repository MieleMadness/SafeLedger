'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const lockoutState = require('../src/main/lockout-state');
const settingsManager = require('../src/main/installManager/installManager/settingsManager');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function syntaxCheck(relative) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}

const now = 1_800_000_000_000;
const active = {
  lockLogin: true,
  lockLoginTime: now - 30_000,
  minutesToWaitBetweenLockout: 1,
  failAttemptCount: 0,
  lockOutCount: 2
};
const expired = Object.assign({}, active, { lockLoginTime: now - 120_000 });

assert.strictEqual(lockoutState.isLockoutActive(active, now), true);
assert.strictEqual(lockoutState.remainingLockoutMs(active, now), 30_000);
assert.strictEqual(lockoutState.isLockoutActive(expired, now), false);
assert.strictEqual(lockoutState.remainingLockoutMs(expired, now), 0);

const normalizedActive = settingsManager._test.normalizeSettings(active, now);
assert.strictEqual(normalizedActive.lockLogin, true);
assert.strictEqual(normalizedActive.lockOutCount, 2);

const normalizedExpired = settingsManager._test.normalizeSettings(expired, now);
assert.strictEqual(normalizedExpired.lockLogin, false);
assert.strictEqual(normalizedExpired.lockLoginTime, 0);
assert.strictEqual(normalizedExpired.lockOutCount, 2);

const malformed = settingsManager._test.normalizeSettings({
  lockLogin: true,
  lockLoginTime: 'not-a-time',
  minutesToWaitBetweenLockout: 15,
  failAttemptCount: 3,
  lockOutCount: 4
}, now);
assert.strictEqual(malformed.lockLogin, false);
assert.strictEqual(malformed.lockLoginTime, 0);
assert.strictEqual(malformed.failAttemptCount, 3);
assert.strictEqual(malformed.lockOutCount, 4);

const index = read('src/main/index.html');
const ui = read('src/main/lockout-ui-enhancements.js');
const css = read('src/main/css/2.0.44.css');
const retryGuard = read('src/main/login-retry-guard.js');
const pkg = JSON.parse(read('package.json'));

assert(index.includes('./css/2.0.44.css'));
assert(index.includes("require('./lockout-ui-enhancements.js')"));
assert(ui.includes("ipc.on('result-init-system'"));
assert(ui.includes("ipc.on('result'"));
assert(ui.includes("header.textContent = 'Login temporarily locked'"));
assert(ui.includes('clearStartupScreen();'));
assert(ui.includes('safeLedgerLockoutCountdown'));
assert(ui.includes('window.location.reload()'));
assert(ui.includes('window.setInterval(updateCountdown, 1000)'));
assert(css.includes('.safeledger-lockout-panel'));
assert(css.includes('.safeledger-lockout-countdown'));
assert(retryGuard.includes('params.settings && params.settings.lockLogin'));
assert.strictEqual(pkg.version, '2.0.49');
assert(pkg.scripts['test:regression'].includes('node scripts/lockout-regression-tests.js'));

syntaxCheck('src/main/lockout-state.js');
syntaxCheck('src/main/lockout-ui-enhancements.js');
syntaxCheck('src/main/installManager/installManager/settingsManager.js');

console.log('PASS SafeLedger 2.0.49 lockout UI, countdown, restart recovery, and stale-lock normalization checks.');
