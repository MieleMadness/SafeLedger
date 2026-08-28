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
const settingsManager = read('src/main/installManager/installManager/settingsManager.js');
const encryption = read('src/main/encryption.js');
const keyEnvelope = read('src/main/key-envelope.js');
const runtimeUtils = read('src/main/runtime-utils.js');
const preload = read('src/main/preload.js');
const security = read('src/main/security-enhancements.js');

for (const removed of [
  'src/main/vault.js',
  'src/main/installManager/installManager/installCodeManager.js',
  'src/main/master-key-verifier.js',
  'src/main/login-failure-policy.js',
  'src/main/settings-enhancements.js',
  'src/main/detail-action-enhancements.js',
  'src/main/login-retry-guard.js'
]) assert.strictEqual(exists(removed), false, `${removed} should remain removed`);

assert(!main.includes('activeVaultData'));
assert(!main.includes('activeCryptoKey'));
assert(!main.includes('params.cryptoKey'));
assert(!renderer.includes('cryptoKey'));
assert(!profile.includes('cryptoKey'));
assert(!group.includes('cryptoKey'));
assert(!record.includes('cryptoKey'));
assert(!settingsManager.includes("activationCode: 'FREE'"));
assert(cryptoSession.includes('activeDataKey.fill(0)'));
assert(cryptoSession.includes('exports.isUnlocked'));
assert(!cryptoSession.includes('dataKeyHex:'));
assert(cryptoUi.includes("ipc.send('read-vaultlist-init')"));
assert(!cryptoUi.includes('dataKeyHex'));
assert(!cryptoUi.includes('cryptoKey'));
assert(encryption.includes("createCipheriv('aes-256-gcm'"));
assert(encryption.includes("createDecipheriv('aes-256-gcm'"));
assert(keyEnvelope.includes("const KDF_ALGORITHM = 'argon2id'"));
assert(keyEnvelope.includes('const KDF_MEMORY_KIB = 65536'));
assert(keyEnvelope.includes('const KEY_BYTES = 32'));
assert(runtimeUtils.includes('PORTABLE_EXECUTABLE_DIR'));
assert(runtimeUtils.includes("platform === 'linux' && env.APPIMAGE"));
assert(main.includes('sandbox: true'));
assert(!preload.includes("require('./"));
assert(!security.includes("require('fs')"));
assert(!security.includes("require('path')"));

for (const relative of ['src/main/main.js','src/main/preload.js','src/main/security-main.js','src/main/crypto-session-main.js','src/main/crypto-ui-bridge.js','src/main/security-enhancements.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}
console.log('PASS sandbox cleanup preserves main-only DEK, encryption, portability, and offline invariants.');
