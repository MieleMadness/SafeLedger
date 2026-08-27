'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const keyEnvelope = require('../src/main/key-envelope');
const robustVault = require('../src/main/robust-vault');
const cryptoSession = require('../src/main/crypto-session-main');

async function nativeArgon2id(password, kdf) {
  if (typeof crypto.argon2 !== 'function') return null;
  return new Promise((resolve, reject) => {
    const message = Buffer.from(String(password), 'utf8');
    crypto.argon2('argon2id', {
      message,
      nonce: Buffer.from(kdf.salt, 'hex'),
      parallelism: kdf.parallelism,
      tagLength: kdf.keyBytes,
      memory: kdf.memory,
      passes: kdf.passes
    }, (err, derivedKey) => {
      message.fill(0);
      if (err) reject(err);
      else resolve(Buffer.from(derivedKey));
    });
  });
}

async function run() {
  let passed = 0;
  const check = async (name, fn) => {
    await fn();
    passed++;
    console.log(`PASS ${name}`);
  };

  const password = 'CorrectHorse9Battery!';
  const newPassword = 'NewCorrectHorse8Battery!';
  const dataKey = crypto.randomBytes(32);

  await check('Electron-safe Argon2id provider matches the stock Node reference', async () => {
    if (typeof crypto.argon2 !== 'function') return;
    const kdf = keyEnvelope.defaultKdf();
    kdf.salt = '00112233445566778899aabbccddeeff';
    const bundled = await keyEnvelope._test.argon2id(password, kdf);
    const reference = await nativeArgon2id(password, kdf);
    assert.strictEqual(bundled.toString('hex'), reference.toString('hex'));
    bundled.fill(0);
    reference.fill(0);
  });

  await check('Argon2id envelope creates a random-salt 256-bit wrapped data key', async () => {
    const first = await keyEnvelope.createEnvelope(password, dataKey);
    const second = await keyEnvelope.createEnvelope(password, dataKey);
    assert.strictEqual(first.envelope.version, 3);
    assert.strictEqual(first.envelope.kdf.algorithm, 'argon2id');
    assert.strictEqual(first.envelope.kdf.implementation, 'hash-wasm-argon2id-v1');
    assert.strictEqual(first.envelope.kdf.memory, 65536);
    assert.strictEqual(first.envelope.kdf.passes, 3);
    assert.strictEqual(first.envelope.kdf.parallelism, 1);
    assert.strictEqual(first.envelope.kdf.keyBytes, 32);
    assert.notStrictEqual(first.envelope.kdf.salt, second.envelope.kdf.salt);
    assert.notStrictEqual(first.envelope.wrappedKey.ciphertext, second.envelope.wrappedKey.ciphertext);
    assert.strictEqual(first.envelope.migration, undefined);
  });

  await check('correct password unwraps the exact random data key', async () => {
    const created = await keyEnvelope.createEnvelope(password, dataKey);
    const unlocked = await keyEnvelope.unlockEnvelope(password, created.envelope);
    assert.strictEqual(unlocked.ok, true);
    assert.strictEqual(unlocked.dataKey.toString('hex'), dataKey.toString('hex'));
  });

  await check('wrong password fails after Argon2id without exposing the data key', async () => {
    const created = await keyEnvelope.createEnvelope(password, dataKey);
    const unlocked = await keyEnvelope.unlockEnvelope('WrongHorse7Battery!', created.envelope);
    assert.strictEqual(unlocked.ok, false);
    assert.strictEqual(unlocked.type, 'password-failed');
    assert.strictEqual(unlocked.dataKey, undefined);
  });

  await check('tampered wrapped data key is rejected as envelope corruption', async () => {
    const created = await keyEnvelope.createEnvelope(password, dataKey);
    const damaged = JSON.parse(JSON.stringify(created.envelope));
    damaged.wrappedKey.tag = `${damaged.wrappedKey.tag.slice(0, -1)}${damaged.wrappedKey.tag.endsWith('0') ? '1' : '0'}`;
    const unlocked = await keyEnvelope.unlockEnvelope(password, damaged);
    assert.strictEqual(unlocked.ok, false);
    assert.strictEqual(unlocked.type, 'envelope-corrupt');
  });

  await check('password rewrap changes KEK/salt but preserves the data key', async () => {
    const created = await keyEnvelope.createEnvelope(password, dataKey);
    const rewrapped = await keyEnvelope.rewrapEnvelope(password, newPassword, created.envelope);
    assert.strictEqual(rewrapped.ok, true);
    assert.notStrictEqual(rewrapped.envelope.kdf.salt, created.envelope.kdf.salt);
    const oldTry = await keyEnvelope.unlockEnvelope(password, rewrapped.envelope);
    assert.strictEqual(oldTry.ok, false);
    const newTry = await keyEnvelope.unlockEnvelope(newPassword, rewrapped.envelope);
    assert.strictEqual(newTry.ok, true);
    assert.strictEqual(newTry.dataKey.toString('hex'), dataKey.toString('hex'));
  });

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'safeledger-v3-'));
  const vaultDir = path.join(root, 'vaults');
  const controller = cryptoSession.createController(vaultDir);
  try {
    await check('new installation creates Argon2id envelope and random DEK directly', async () => {
      const initialized = await controller.initializeSession(password);
      assert.strictEqual(initialized.ok, true);
      assert.strictEqual(fs.existsSync(path.join(vaultDir, 'key-envelope.json')), true);
      const dek = Buffer.from(initialized.dataKeyHex, 'hex');
      assert.strictEqual(dek.length, 32);
      await robustVault.makeDir(vaultDir);
      await robustVault.initVaultList(vaultDir, dek);
      await robustVault.saveVault(
        path.join(vaultDir, 'zvault-0.json'),
        JSON.stringify({ file: 'zvault-0.json', groups: [{ name: 'Ledger', records: [] }] }),
        dek
      );
      const envelope = JSON.parse(fs.readFileSync(path.join(vaultDir, 'key-envelope.json'), 'utf8'));
      assert.strictEqual(envelope.version, 3);
      assert.strictEqual(envelope.migration, undefined);
      assert(fs.readFileSync(path.join(vaultDir, 'vaultlist.json'), 'utf8').startsWith('SLG2:'));
    });

    await check('envelope login returns the same DEK and rejects the wrong password', async () => {
      const good = await controller.loginWithEnvelope(password);
      assert.strictEqual(good.ok, true);
      const bad = await controller.loginWithEnvelope('WrongHorse7Battery!');
      assert.strictEqual(bad.ok, false);
      assert.strictEqual(bad.type, 'password-failed');
    });

    await check('changing password only rewraps DEK; encrypted vault ciphertext stays unchanged', async () => {
      const beforeLogin = await controller.loginWithEnvelope(password);
      const dekHex = beforeLogin.dataKeyHex;
      const beforeCiphertext = fs.readFileSync(path.join(vaultDir, 'zvault-0.json'), 'utf8');
      const changed = await controller.changePassword(password, newPassword);
      assert.strictEqual(changed.ok, true);
      assert.strictEqual(changed.dataKeyHex, dekHex);
      assert.strictEqual(fs.readFileSync(path.join(vaultDir, 'zvault-0.json'), 'utf8'), beforeCiphertext);
      assert.strictEqual((await controller.loginWithEnvelope(password)).ok, false);
      const newTry = await controller.loginWithEnvelope(newPassword);
      assert.strictEqual(newTry.ok, true);
      assert.strictEqual(newTry.dataKeyHex, dekHex);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  await check('v1 migration APIs are not exposed', async () => {
    assert.strictEqual(typeof keyEnvelope.deriveLegacyKey, 'undefined');
    assert.strictEqual(typeof robustVault.migrateLegacyEncryption, 'undefined');
    assert.strictEqual(typeof robustVault.rotateCrypto, 'undefined');
    assert.strictEqual(typeof controller.migrateLegacySession, 'undefined');
    const bridge = fs.readFileSync(path.join(__dirname, '../src/main/crypto-ui-bridge.js'), 'utf8');
    assert(bridge.includes("ipc.invoke('crypto-v3-initialize', password)"));
    assert(!bridge.includes('crypto-v3-migrate-legacy'));
    assert(!bridge.includes('deriveLegacyKey'));
  });

  console.log(`\n${passed} Argon2id/envelope regression checks passed.`);
}

run().catch((err) => {
  console.error('CRYPTO V3 TEST FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
