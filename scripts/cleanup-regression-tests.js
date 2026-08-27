'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const main = read('src/main/main.js');
const cryptoSession = read('src/main/crypto-session-main.js');
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
assert(main.includes("require('./crypto-session-main').registerIpcHandlers()"));
assert(main.includes("keyStatus: 'SUCCESS'"));

// Crypto IPC registration is explicit from main.js rather than a hidden module side effect.
assert(cryptoSession.includes('exports.registerIpcHandlers = registerIpcHandlers'));
assert(!cryptoSession.includes('try { registerIpcHandlers(); }'));

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

for (const relative of ['src/main/main.js', 'src/main/crypto-session-main.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}

console.log('PASS safe-deletion cleanup preserves SafeLedger encryption, portability, and Electron isolation invariants.');
