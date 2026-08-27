'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const keyEnvelope = require('../src/main/key-envelope');
const cryptoSession = require('../src/main/crypto-session-main');
const encryption = require('../src/main/encryption');
const robustVault = require('../src/main/robust-vault');

async function run() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'safeledger-v2-only-'));
  const vaultDir = path.join(root, 'vaults');
  const password = 'SafeLedger9Password!';

  try {
    const controller = cryptoSession.createController(vaultDir);
    assert.strictEqual(controller.hasEnvelope(), false);

    const initialized = await controller.initializeSession(password);
    assert.strictEqual(initialized.ok, true);
    assert.strictEqual(controller.hasEnvelope(), true);
    assert.strictEqual(Buffer.from(initialized.dataKeyHex, 'hex').length, 32);

    const dataKey = Buffer.from(initialized.dataKeyHex, 'hex');
    await robustVault.makeDir(vaultDir);
    await robustVault.initVaultList(vaultDir, dataKey);
    await robustVault.initVaultData(vaultDir, 'zvault-0.json', dataKey);

    const envelope = JSON.parse(fs.readFileSync(path.join(vaultDir, 'key-envelope.json'), 'utf8'));
    assert.strictEqual(envelope.version, 3);
    assert.strictEqual(envelope.migration, undefined);
    assert.strictEqual(keyEnvelope.validateEnvelope(envelope), true);

    const login = await controller.loginWithEnvelope(password);
    assert.strictEqual(login.ok, true);
    assert.strictEqual(login.dataKeyHex, initialized.dataKeyHex);

    const encrypted = fs.readFileSync(path.join(vaultDir, 'vaultlist.json'), 'utf8');
    assert.strictEqual(encryption.isAuthenticatedEncryptedPayload(encrypted), true);
    assert.strictEqual(encryption.encryptedPayloadLooksValid(encrypted), true);

    assert.strictEqual(typeof keyEnvelope.deriveLegacyKey, 'undefined');
    assert.strictEqual(typeof encryption.isLegacyEncryptedPayload, 'undefined');
    assert.strictEqual(typeof robustVault.migrateLegacyEncryption, 'undefined');
    assert.strictEqual(typeof robustVault.rotateCrypto, 'undefined');
    assert.strictEqual(typeof controller.migrateLegacySession, 'undefined');

    const fakeLegacy = `${crypto.randomBytes(16).toString('hex')}:${crypto.randomBytes(32).toString('hex')}`;
    assert.strictEqual(encryption.encryptedPayloadLooksValid(fakeLegacy), false);

    console.log('PASS SafeLedger 2.0.49 creates v2 data directly and exposes no v1 migration path.');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error('V2-ONLY CRYPTO REGRESSION TEST FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
