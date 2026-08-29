'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const settingsManager = require('../src/main/installManager/installManager/settingsManager');
const { sha256Bytes, bytesToHex } = require('../src/main/sha256');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function testRendererSafeSha256() {
  assert.strictEqual(
    bytesToHex(sha256Bytes(new Uint8Array([]))),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  );
  assert.strictEqual(
    bytesToHex(sha256Bytes(Uint8Array.from([0x61, 0x62, 0x63]))),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  );
  const source = read('src/main/sha256.js');
  assert(!source.includes("require('crypto')"));
  assert(!source.includes('Buffer.'));
}

function testPrivacyModeDefaultsAndPersistence() {
  const legacy = settingsManager._test.normalizeSettings({});
  assert.strictEqual(legacy.privacyMode, true, 'legacy settings must default to Privacy Mode enabled');
  assert.strictEqual(settingsManager._test.normalizeSettings({ privacyMode: false }).privacyMode, false);
  assert.strictEqual(settingsManager._test.normalizeSettings({ privacyMode: 'true' }).privacyMode, true);

  const securityUi = read('src/main/security-ui.js');
  const privacyUi = read('src/main/privacy-mode-ui.js');
  const renderer = read('src/main/renderer.js');
  assert(securityUi.includes('let privacyMode = true'));
  assert(securityUi.includes('actions.style.display = privacyMode'));
  assert(securityUi.includes("exports.setPrivacyMode"));
  assert(privacyUi.includes("id = 'privacyModeEnabled'"));
  assert(privacyUi.includes("ipc.send('save-settings'"));
  assert(renderer.includes('securityUi.setPrivacyMode'));
}

function testGuidedRecoveryIsEphemeral() {
  const drillUi = read('src/main/recovery-drill-ui.js');
  const drillModel = read('src/main/recovery-drill.js');
  assert(drillUi.includes("require('./bip39-validator')"));
  assert(drillUi.includes("input.type = 'password'"));
  assert(drillUi.includes("input.value = ''"), 'temporary BIP39 input must be cleared immediately');
  assert(drillUi.includes('Test Recovery'));
  assert(!drillUi.includes("clipboard"));
  assert(!drillUi.includes("ipc.send"));
  assert(!drillUi.includes("fetch("));
  assert(drillModel.includes('lastRecoveryDrill'));
  assert(drillModel.includes('lastVerified'));
  assert(!drillModel.includes('seedPhrase: completedAt'));
}

function testRecoveryIntelligenceBoundary() {
  const bootstrap = read('src/main/bootstrap.js');
  const preload = read('src/main/preload.js');
  const bridge = read('src/main/renderer-bridge.js');
  const dashboard = read('src/main/recovery-intelligence-dashboard-ui.js');

  assert(bootstrap.includes("ipc.handle('recovery-intelligence-summary'"));
  assert(bootstrap.includes('sensitiveFingerprints.findDuplicates'));
  assert(bootstrap.includes('onLock: () => sensitiveFingerprints.clear()'));
  assert(preload.includes('getRecoveryIntelligence'));
  assert(bridge.includes("'recovery-intelligence-summary': 'getRecoveryIntelligence'"));
  assert(dashboard.includes('never addresses, seed phrases, private keys, fingerprints, or backup paths'));
  assert(!dashboard.includes('.publicAddress'));
  assert(!dashboard.includes('.privateAddress'));
  assert(!dashboard.includes('.seedPhrase'));
  assert(!dashboard.includes('backupPath'));
  assert(!bootstrap.includes('scrubContent'), 'Recovery Intelligence must not have a destructive cleanup path');
}

function testBip39RendererBoundary() {
  const bip39 = read('src/main/bip39-validator.js');
  assert(bip39.includes("require('./sha256')"));
  assert(!bip39.includes("require('crypto')"));
  assert(!bip39.includes('Buffer.'));
}

testRendererSafeSha256();
testPrivacyModeDefaultsAndPersistence();
testGuidedRecoveryIsEphemeral();
testRecoveryIntelligenceBoundary();
testBip39RendererBoundary();
console.log('PASS SafeLedger 2.4 Privacy Mode, Guided Test Recovery, renderer-safe BIP39, and sanitized intelligence boundaries.');
