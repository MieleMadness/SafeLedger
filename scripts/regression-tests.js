'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const Module = require('module');
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'electron') return {};
  return originalLoad.call(this, request, parent, isMain);
};

const runtimeUtils = require('../src/main/runtime-utils');
const masterKeyVerifier = require('../src/main/master-key-verifier');
const loginFailurePolicy = require('../src/main/login-failure-policy');
const robustVault = require('../src/main/robust-vault');
const encryption = require('../src/main/encryption');

async function expectRejectType(promise, type) {
  let caught = null;
  try { await promise; } catch (err) { caught = err; }
  assert(caught, `Expected rejection type ${type}`);
  assert.strictEqual(caught.type, type);
  return caught;
}

async function expectThrow(fn) {
  let caught = null;
  try { await fn(); } catch (err) { caught = err; }
  assert(caught, 'Expected operation to throw');
  return caught;
}

async function run() {
  const results = [];
  const check = async (name, fn) => {
    await fn();
    results.push(name);
    console.log(`PASS ${name}`);
  };

  await check('portable root - Windows portable executable', async () => {
    assert.strictEqual(runtimeUtils.getPortableRoot({
      platform: 'win32',
      env: { PORTABLE_EXECUTABLE_DIR: 'D:\\SafeLedger' },
      execPath: 'C:\\Temp\\SafeLedger.exe',
      isPackaged: true
    }), 'D:\\SafeLedger');
  });

  await check('portable root - Linux AppImage uses downloaded file location', async () => {
    assert.strictEqual(runtimeUtils.getPortableRoot({
      platform: 'linux',
      env: { APPIMAGE: '/home/alice/Downloads/SafeLedger.AppImage' },
      execPath: '/tmp/.mount_safe/usr/bin/safe-ledger',
      isPackaged: true
    }), '/home/alice/Downloads');
  });

  await check('lockout duration formatting boundaries', async () => {
    assert.strictEqual(runtimeUtils.formatLockDuration(15), '15 minutes');
    assert.strictEqual(runtimeUtils.formatLockDuration(60), '1 hour');
    assert.strictEqual(runtimeUtils.formatLockDuration(61), '1 hour 1 minute');
    assert.strictEqual(runtimeUtils.formatLockDuration(90), '1 hour 30 minutes');
    assert.strictEqual(runtimeUtils.formatLockDuration(120), '2 hours');
    assert.strictEqual(runtimeUtils.formatLockDuration(1440), '24 hours');
  });

  await check('master password UI policy is wired to the 128-character shared limit', async () => {
    assert.strictEqual(runtimeUtils.MAX_MASTER_PASSWORD_LENGTH, 128);
    const source = fs.readFileSync(path.join(__dirname, '../src/main/security-enhancements.js'), 'utf8');
    assert(source.includes('input.maxLength = MAX_MASTER_PASSWORD_LENGTH'));
    assert(source.includes('oldInput.maxLength = MAX_MASTER_PASSWORD_LENGTH'));
    assert(source.includes('newInput.maxLength = MAX_MASTER_PASSWORD_LENGTH'));
    assert(source.includes('confirmInput.maxLength = MAX_MASTER_PASSWORD_LENGTH'));
    const encryptionSource = fs.readFileSync(path.join(__dirname, '../src/main/encryption.js'), 'utf8');
    assert(encryptionSource.includes("setAttribute('maxlength', String(MAX_MASTER_PASSWORD_LENGTH))"));
  });

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'safeledger-regression-'));
  const vaultDir = path.join(root, 'vaults');
  const key = crypto.randomBytes(32);
  const wrongKey = crypto.randomBytes(32);

  try {
    await check('AES-256-GCM authenticated encryption round trip', async () => {
      const clear = JSON.stringify({ secret: 'correct horse battery staple', unicode: '🔐' });
      const encrypted = encryption.encrypt(key, clear);
      assert(encrypted.startsWith('SLG2:'));
      assert.strictEqual(encryption.isAuthenticatedEncryptedPayload(encrypted), true);
      assert.strictEqual(encryption.decrypt(key, encrypted), clear);
    });

    await check('AES-256-GCM rejects ciphertext modification', async () => {
      const encrypted = encryption.encrypt(key, JSON.stringify({ amount: '1.250 BTC' }));
      const last = encrypted[encrypted.length - 1];
      const tampered = `${encrypted.slice(0, -1)}${last === '0' ? '1' : '0'}`;
      await expectThrow(async () => encryption.decrypt(key, tampered));
    });

    await check('v1 CBC-shaped payloads are rejected', async () => {
      const fakeLegacy = `${crypto.randomBytes(16).toString('hex')}:${crypto.randomBytes(32).toString('hex')}`;
      assert.strictEqual(encryption.encryptedPayloadLooksValid(fakeLegacy), false);
      await expectThrow(async () => encryption.decrypt(key, fakeLegacy));
    });

    await check('first-run vault files are authenticated SLG2 data', async () => {
      assert.strictEqual(await robustVault.makeDir(vaultDir), 'CREATE');
      await robustVault.initVaultList(vaultDir, key);
      await robustVault.saveVault(
        path.join(vaultDir, 'zvault-0.json'),
        JSON.stringify({ file: 'zvault-0.json', groups: [{ name: 'Ledger', records: [] }] }),
        key
      );
      assert(fs.readFileSync(path.join(vaultDir, 'vaultlist.json'), 'utf8').startsWith('SLG2:'));
      assert(fs.readFileSync(path.join(vaultDir, 'zvault-0.json'), 'utf8').startsWith('SLG2:'));
      const list = await robustVault.readVaultList(path.join(vaultDir, 'vaultlist.json'), key);
      assert.strictEqual(list.vaults.length, 1);
    });

    await check('authenticated vault tampering is classified as corruption with the verified key', async () => {
      const file = path.join(vaultDir, 'vaultlist.json');
      const original = fs.readFileSync(file, 'utf8');
      const last = original[original.length - 1];
      fs.writeFileSync(file, `${original.slice(0, -1)}${last === '0' ? '1' : '0'}`, 'utf8');
      const err = await expectRejectType(robustVault.readVaultList(file, key), 'password-or-corrupt');
      const verifier = masterKeyVerifier.createMasterKeyVerifier(key);
      const classification = loginFailurePolicy.classifyVaultListFailure(err, key, { masterKeyVerifier: verifier });
      assert.strictEqual(classification.failure.type, 'vault-corrupt');
      assert.strictEqual(classification.countPasswordFailure, false);
      fs.writeFileSync(file, original);
    });

    await check('empty profile list starts again at zvault-0.json', async () => {
      assert.deepStrictEqual(robustVault.nextVaultFileName({ vaults: [] }), { id: 0, fileName: 'zvault-0.json' });
      assert.deepStrictEqual(robustVault.nextVaultFileName({ vaults: [{}] }), { id: 0, fileName: 'zvault-0.json' });
    });

    await check('wrong data key remains ambiguous for password policy classification', async () => {
      await expectRejectType(robustVault.readVaultList(path.join(vaultDir, 'vaultlist.json'), wrongKey), 'password-or-corrupt');
    });

    await check('malformed vault list is classified as corruption', async () => {
      const file = path.join(vaultDir, 'vaultlist.json');
      const original = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(file, 'not-an-encrypted-vault');
      await expectRejectType(robustVault.readVaultList(file, key), 'vault-corrupt');
      fs.writeFileSync(file, original);
    });

    await check('valid ciphertext with damaged JSON is corruption with verified key', async () => {
      const file = path.join(vaultDir, 'vaultlist.json');
      const original = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(file, encryption.encrypt(key, '{broken-json'));
      const err = await expectRejectType(robustVault.readVaultList(file, key), 'password-or-corrupt');
      const verifier = masterKeyVerifier.createMasterKeyVerifier(key);
      const classification = loginFailurePolicy.classifyVaultListFailure(err, key, { masterKeyVerifier: verifier });
      assert.strictEqual(classification.failure.type, 'vault-corrupt');
      assert.strictEqual(classification.countPasswordFailure, false);
      fs.writeFileSync(file, original);
    });

    await check('wrong password increments only when verifier proves the key is wrong', async () => {
      const verifier = masterKeyVerifier.createMasterKeyVerifier(key);
      const classification = loginFailurePolicy.classifyVaultListFailure(
        { status: 'ERROR', type: 'password-or-corrupt' }, wrongKey, { masterKeyVerifier: verifier }
      );
      assert.strictEqual(classification.failure.type, 'password-failed');
      assert.strictEqual(classification.countPasswordFailure, true);
    });

    await check('unreadable/corrupt vault failures never count as password failures', async () => {
      const classification = loginFailurePolicy.classifyVaultListFailure(
        { status: 'ERROR', type: 'vault-read-error' }, key, {}
      );
      assert.strictEqual(classification.countPasswordFailure, false);
    });

    await check('atomic authenticated vault save leaves readable final file and no temp file', async () => {
      const file = path.join(vaultDir, 'atomic.json');
      await robustVault.saveVault(file, JSON.stringify({ file: 'atomic.json', groups: [] }), key);
      assert(fs.readFileSync(file, 'utf8').startsWith('SLG2:'));
      const value = await robustVault.readVault(file, key);
      assert.strictEqual(value.file, 'atomic.json');
      const leftovers = fs.readdirSync(vaultDir).filter((name) => name.includes('.tmp'));
      assert.deepStrictEqual(leftovers, []);
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  console.log(`\n${results.length} regression checks passed.`);
}

run().catch((err) => {
  console.error('REGRESSION TEST FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
