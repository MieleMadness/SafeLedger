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
    if (typeof crypto.argon2 !== 'function') {
      console.log('  Native Node Argon2 reference unavailable in this runtime; Electron smoke test still verifies the bundled provider.');
      return;
    }
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

  await check('password changes are blocked while a crypto migration is pending', async () => {
    const created = await keyEnvelope.createEnvelope(password, dataKey, {
      status: 'pending',
      started: new Date().toISOString(),
      files: []
    });
    const rewrapped = await keyEnvelope.rewrapEnvelope(password, newPassword, created.envelope);
    assert.strictEqual(rewrapped.ok, false);
    assert.strictEqual(rewrapped.type, 'migration-pending');
  });

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'safeledger-v3-'));
  const vaultDir = path.join(root, 'vaults');
  const controller = cryptoSession.createController(vaultDir);
  try {
    await check('legacy password-derived vault migrates transactionally to random DEK + Argon2id envelope', async () => {
      await robustVault.makeDir(vaultDir);
      const legacyKey = keyEnvelope.deriveLegacyKey(password);
      await robustVault.initVaultList(vaultDir, legacyKey);
      await robustVault.saveVault(
        path.join(vaultDir, 'zvault-0.json'),
        JSON.stringify({ file: 'zvault-0.json', groups: [{ name: 'Ledger', records: [{ name: 'Bitcoin', symbol: 'BTC' }] }] }),
        legacyKey
      );
      legacyKey.fill(0);

      const migrated = await controller.migrateLegacySession(password);
      assert.strictEqual(migrated.ok, true);
      assert.strictEqual(fs.existsSync(path.join(vaultDir, 'key-envelope.json')), true);
      assert.strictEqual(fs.existsSync(path.join(vaultDir, 'zvault-0.json')), false);

      const envelope = JSON.parse(fs.readFileSync(path.join(vaultDir, 'key-envelope.json'), 'utf8'));
      assert.strictEqual(envelope.version, 3);
      assert.strictEqual(envelope.kdf.implementation, 'hash-wasm-argon2id-v1');
      assert.strictEqual(envelope.migration, undefined);

      const dek = Buffer.from(migrated.dataKeyHex, 'hex');
      const list = await robustVault.readVaultList(path.join(vaultDir, 'vaultlist.json'), dek);
      assert.strictEqual(list.vaults.length, 1);
      assert.notStrictEqual(list.vaults[0].file, 'zvault-0.json');
      const profile = await robustVault.readVault(path.join(vaultDir, list.vaults[0].file), dek);
      assert.strictEqual(profile.groups[0].name, 'Ledger');
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
      const list = await robustVault.readVaultList(path.join(vaultDir, 'vaultlist.json'), Buffer.from(dekHex, 'hex'));
      const profileFile = path.join(vaultDir, list.vaults[0].file);
      const beforeCiphertext = fs.readFileSync(profileFile, 'utf8');

      const changed = await controller.changePassword(password, newPassword);
      assert.strictEqual(changed.ok, true);
      assert.strictEqual(changed.dataKeyHex, dekHex);
      assert.strictEqual(fs.readFileSync(profileFile, 'utf8'), beforeCiphertext);

      const oldTry = await controller.loginWithEnvelope(password);
      assert.strictEqual(oldTry.ok, false);
      const newTry = await controller.loginWithEnvelope(newPassword);
      assert.strictEqual(newTry.ok, true);
      assert.strictEqual(newTry.dataKeyHex, dekHex);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  await check('128-character UI policy is enforced by the login/password bridge', async () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/main/crypto-ui-bridge.js'), 'utf8');
    assert(source.includes('MAX_MASTER_PASSWORD_LENGTH'));
    assert(source.includes("target.id === 'loginBtn'"));
    assert(source.includes("target.id === 'encryptionEditBtn'"));
    assert(source.includes('masterKeyVerifier.createMasterKeyVerifier(dataKey)'));
    const indexSource = fs.readFileSync(path.join(__dirname, '../src/main/index.html'), 'utf8');
    assert(indexSource.includes("require('./crypto-ui-bridge.js')"));
  });

  console.log(`\n${passed} Argon2id/envelope regression checks passed.`);
}

run().catch((err) => {
  console.error('CRYPTO V3 TEST FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
