'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

const main = read('src/main/main.js');
const cryptoSession = read('src/main/crypto-session-main.js');
const cryptoUi = read('src/main/crypto-ui-bridge.js');
const renderer = read('src/main/renderer.js');
const profile = read('src/main/profile.js');
const group = read('src/main/group.js');
const record = read('src/main/record.js');
const settingsUi = read('src/main/settings-ui.js');
const settingsManager = read('src/main/installManager/installManager/settingsManager.js');
const encryption = read('src/main/encryption.js');
const keyEnvelope = read('src/main/key-envelope.js');
const runtimeUtils = read('src/main/runtime-utils.js');
const preload = read('src/main/preload.js');
const index = read('src/main/index.html');

// Dead compatibility and licensing code should remain gone.
assert(!main.includes("require('./logger')"));
assert(!main.includes('logger.initLogger'));
assert(!main.includes("ipc.on('save-install-code'"));
assert(!main.includes("ipc.on('process-rotate-crypto'"));
assert(!main.includes("ipc.on('save'"));
assert(!main.includes('activeVaultData'));
assert(!main.includes('activeCryptoKey'));
assert.strictEqual(exists('src/main/vault.js'), false);
assert.strictEqual(exists('src/main/installManager/installManager/installCodeManager.js'), false);
assert.strictEqual(exists('src/main/master-key-verifier.js'), false);
assert.strictEqual(exists('src/main/login-failure-policy.js'), false);
assert.strictEqual(exists('src/main/settings-enhancements.js'), false);
assert.strictEqual(exists('src/main/detail-action-enhancements.js'), false);
assert(!renderer.includes('installCode'));
assert(!settingsManager.includes("activationCode: 'FREE'"));

// Direct Profile/Settings screens replace legacy/observer glue.
assert(renderer.includes("const profile = require('./profile')"));
assert(renderer.includes("const settingsUi = require('./settings-ui')"));
assert(!renderer.includes('createEditVault'));
assert(!renderer.includes('showVaultDetail'));
assert(profile.includes('detailActions.set(['));
assert(settingsUi.includes("makeSection('Password')"));
assert(settingsUi.includes('securityEnhancements.exportEncryptedBackup()'));
assert(!settingsUi.includes('MutationObserver'));
assert(!preload.includes('settings-enhancements'));
assert(!preload.includes('detail-action-enhancements'));
assert(!index.includes('legacy-hidden-actions'));
assert(!index.includes('id="encryptionSettings"'));
assert(!index.includes('id="backupButton"'));
assert(!index.includes('id="restoreButton"'));

// The raw DEK must stay in the main process and be explicitly destroyed on lock.
assert(main.includes("const cryptoSession = require('./crypto-session-main')"));
assert(main.includes('cryptoSession.registerIpcHandlers()'));
assert(cryptoSession.includes('let activeDataKey = null'));
assert(cryptoSession.includes('activeDataKey.fill(0)'));
assert(cryptoSession.includes('exports.getSessionKey'));
assert(cryptoSession.includes('exports.clearSession'));
assert(!cryptoSession.includes('dataKeyHex:'));
assert(!main.includes('params.cryptoKey'));
assert(main.includes("ipc.on('record-password-failure'"));
assert(main.includes('cryptoSession.clearSession()'));
assert(main.includes('sessionUnlocked: true'));
assert(!main.includes('cryptoKey: true'));
assert(cryptoUi.includes("ipc.send('read-vaultlist-init')"));
assert(cryptoUi.includes("ipc.send('record-password-failure')"));
assert(cryptoUi.includes('sessionUnlocked: true'));
assert(!cryptoUi.includes('dataKeyHex'));
assert(!cryptoUi.includes('cryptoKey'));
assert(!cryptoUi.includes('randomBytes(32)'));
assert(!renderer.includes('let masterCrypto'));
assert(!renderer.includes('masterCrypto ='));
assert(!renderer.includes('cryptoKey'));
assert(!renderer.includes("require('crypto')"));
assert(!profile.includes('cryptoKey'));
assert(!group.includes('cryptoKey'));
assert(!record.includes('cryptoKey'));
assert(renderer.includes("input.id = 'masterCryptoInput'"));

// Cleanup must not weaken the product's core security/portability invariants.
assert(encryption.includes("createCipheriv('aes-256-gcm'"));
assert(encryption.includes("createDecipheriv('aes-256-gcm'"));
assert(keyEnvelope.includes("const KDF_ALGORITHM = 'argon2id'"));
assert(keyEnvelope.includes('const KDF_MEMORY_KIB = 65536'));
assert(keyEnvelope.includes('const KEY_BYTES = 32'));
assert(runtimeUtils.includes('PORTABLE_EXECUTABLE_DIR'));
assert(runtimeUtils.includes("platform === 'linux' && env.APPIMAGE"));
assert(main.includes('nodeIntegration: false'));
assert(main.includes('contextIsolation: true'));

for (const relative of [
  'src/main/main.js',
  'src/main/crypto-session-main.js',
  'src/main/crypto-ui-bridge.js',
  'src/main/renderer.js',
  'src/main/profile.js',
  'src/main/group.js',
  'src/main/record.js',
  'src/main/settings-ui.js',
  'src/main/settings-schema.js',
  'src/main/startup-ui.js',
  'src/main/detail-actions.js',
  'src/main/search-enhancements.js',
  'src/main/installManager/installManager/settingsManager.js'
]) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}

console.log('PASS direct Profile/Settings cleanup preserves main-only DEK, encryption, portability, and Electron isolation invariants.');
