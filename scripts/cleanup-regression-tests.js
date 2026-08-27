'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const main = read('src/main/main.js');
const cryptoSession = read('src/main/crypto-session-main.js');
const cryptoUi = read('src/main/crypto-ui-bridge.js');
const renderer = read('src/main/renderer.js');
const encryption = read('src/main/encryption.js');
const keyEnvelope = read('src/main/key-envelope.js');
const runtimeUtils = read('src/main/runtime-utils.js');

// Dead main-process compatibility state should remain gone.
assert(!main.includes("require('./logger')"));
assert(!main.includes('logger.initLogger'));
assert(!main.includes("require('./installManager/installManager/installCodeManager')"));
assert(!main.includes("ipc.on('save-install-code'"));
assert(!main.includes("ipc.on('process-rotate-crypto'"));
assert(!main.includes('activeVaultData'));
assert(!main.includes('activeCryptoKey'));
assert(main.includes("const cryptoSession = require('./crypto-session-main')"));
assert(main.includes('cryptoSession.registerIpcHandlers()'));
assert(main.includes("keyStatus: 'SUCCESS'"));

// The raw DEK must stay in the main process and be explicitly destroyed on lock.
assert(cryptoSession.includes('let activeDataKey = null'));
assert(cryptoSession.includes('activeDataKey.fill(0)'));
assert(cryptoSession.includes('exports.getSessionKey'));
assert(cryptoSession.includes('exports.clearSession'));
assert(!cryptoSession.includes('dataKeyHex:'));
assert(!main.includes('params.cryptoKey'));
assert(main.includes("ipc.on('record-password-failure'"));
assert(main.includes('cryptoSession.clearSession()'));
assert(cryptoUi.includes("ipc.send('read-vaultlist-init')"));
assert(cryptoUi.includes("ipc.send('record-password-failure')"));
assert(!cryptoUi.includes('dataKeyHex'));
assert(!cryptoUi.includes('randomBytes(32)'));
assert(!cryptoUi.includes("require('./master-key-verifier')"));

// The current renderer still uses a boolean compatibility marker for its
// unlocked UI state, but it must never receive raw key bytes.
assert(main.includes('cryptoKey: true'));
assert(cryptoUi.includes('cryptoKey: true'));
assert(renderer.includes('masterCrypto'));

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
  'src/main/crypto-ui-bridge.js'
]) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}

console.log('PASS main-only DEK session preserves SafeLedger encryption, portability, and Electron isolation invariants.');
