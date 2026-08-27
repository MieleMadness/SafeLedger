'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const settingsManager = require('../src/main/installManager/installManager/settingsManager');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

async function run() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'safeledger-brute-force-'));
  const settingsDir = path.join(tempRoot, 'settings');

  try {
    const saved = await settingsManager.saveSettings(settingsDir, {
      numFailAttempts: -12,
      numLockoutRetries: 0,
      minutesToWaitBetweenLockout: 1400,
      scrubContentAfterRetries: false
    });
    assert.strictEqual(saved.settings.numFailAttempts, 1);
    assert.strictEqual(saved.settings.numLockoutRetries, 1);
    assert.strictEqual(saved.settings.minutesToWaitBetweenLockout, 99);
    assert.strictEqual(saved.settings.scrubContentAfterRetries, false);

    const exact = await settingsManager.saveSettings(settingsDir, {
      numFailAttempts: 1,
      numLockoutRetries: 99,
      minutesToWaitBetweenLockout: 42
    });
    assert.strictEqual(exact.settings.numFailAttempts, 1);
    assert.strictEqual(exact.settings.numLockoutRetries, 99);
    assert.strictEqual(exact.settings.minutesToWaitBetweenLockout, 42);

    fs.writeFileSync(path.join(settingsDir, 'settings.json'), JSON.stringify({
      numFailAttempts: -500,
      numLockoutRetries: 1000,
      minutesToWaitBetweenLockout: -1
    }), 'utf8');
    const loaded = await settingsManager.loadSettings(settingsDir);
    assert.strictEqual(loaded.settings.numFailAttempts, 1);
    assert.strictEqual(loaded.settings.numLockoutRetries, 99);
    assert.strictEqual(loaded.settings.minutesToWaitBetweenLockout, 1);

    const ui = read('src/main/settings-enhancements.js');
    assert(ui.includes('const BRUTE_FORCE_MIN = 1;'));
    assert(ui.includes('const BRUTE_FORCE_MAX = 99;'));
    assert(ui.includes("input.min = String(BRUTE_FORCE_MIN)"));
    assert(ui.includes("input.max = String(BRUTE_FORCE_MAX)"));
    assert(ui.includes("input.step = '1'"));
    assert(ui.includes('configureBruteForceInput(inputFailAttempts)'));
    assert(ui.includes('configureBruteForceInput(inputLockoutRetry)'));
    assert(ui.includes('configureBruteForceInput(inputBetweenLockout)'));
    assert(ui.includes("newSettings: Object.assign({}, latestSettings"));

    const passwordSection = ui.indexOf("const passwordSection = makeSection('Password');");
    const backupSection = ui.indexOf("const backupSection = makeSection('Backup & Recovery');");
    const bruteSection = ui.indexOf("const bruteSection = makeSection('Brute Force Protection');");
    assert(passwordSection >= 0 && backupSection > passwordSection && bruteSection > backupSection);
    assert(ui.includes('area.insertBefore(passwordSection, form);'));
    assert(ui.includes('area.insertBefore(backupSection, form);'));
    assert(ui.includes('area.insertBefore(bruteSection, form);'));
    assert(ui.includes('bruteSection.appendChild(form);'));

    const pkg = JSON.parse(read('package.json'));
    assert.strictEqual(pkg.version, '2.0.47');

    console.log('PASS SafeLedger 2.0.47 brute-force limits and Settings section order.');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error('BRUTE FORCE SETTINGS REGRESSION TEST FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
