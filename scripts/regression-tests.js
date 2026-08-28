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
const passwordPolicy = require('../src/main/password-policy');
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
    assert.strictEqual(passwordPolicy.MAX_MASTER_PASSWORD_LENGTH, 128);
    assert.strictEqual(runtimeUtils.MAX_MASTER_PASSWORD_LENGTH, passwordPolicy.MAX_MASTER_PASSWORD_LENGTH);
    const controls = fs.readFileSync(path.join(__dirname, '../src/main/password-controls.js'), 'utf8');
    const passwordUi = fs.readFileSync(path.join(__dirname, '../src/main/password-settings-ui.js'), 'utf8');
    const cryptoUi = fs.readFileSync(path.join(__dirname, '../src/main/crypto-ui-bridge.js'), 'utf8');
    assert(controls.includes('input.maxLength = passwordPolicy.MAX_MASTER_PASSWORD_LENGTH'));
    assert(passwordUi.includes("require('./password-policy')"));
    assert(cryptoUi.includes("const passwordPolicy = require('./password-policy')"));
    assert(cryptoUi.includes('passwordPolicy.validatePassword'));
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

    await check('authenticated vault tampering cannot be decrypted', async () => {
      const file = path.join(vaultDir, 'vaultlist.json');
      const original = fs.readFileSync(file, 'utf8');
      const last = original[original.length - 1];
      fs.writeFileSync(file, `${original.slice(0, -1)}${last === '0' ? '1' : '0'}`, 'utf8');
      await expectRejectType(robustVault.readVaultList(file, key), 'password-or-corrupt');
      fs.writeFileSync(file, original);
    });

    await check('empty profile list starts again at zvault-0.json', async () => {
      assert.deepStrictEqual(robustVault.nextVaultFileName({ vaults: [] }), { id: 0, fileName: 'zvault-0.json' });
      assert.deepStrictEqual(robustVault.nextVaultFileName({ vaults: [{}] }), { id: 0, fileName: 'zvault-0.json' });
    });

    await check('wrong data key cannot authenticate the encrypted vault list', async () => {
      await expectRejectType(robustVault.readVaultList(path.join(vaultDir, 'vaultlist.json'), wrongKey), 'password-or-corrupt');
    });

    await check('malformed vault list is classified as corruption', async () => {
      const file = path.join(vaultDir, 'vaultlist.json');
      const original = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(file, 'not-an-encrypted-vault');
      await expectRejectType(robustVault.readVaultList(file, key), 'vault-corrupt');
      fs.writeFileSync(file, original);
    });

    await check('valid ciphertext with damaged JSON cannot be accepted as a vault list', async () => {
      const file = path.join(vaultDir, 'vaultlist.json');
      const original = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(file, encryption.encrypt(key, '{broken-json'));
      await expectRejectType(robustVault.readVaultList(file, key), 'password-or-corrupt');
      fs.writeFileSync(file, original);
    });

    await check('runtime separates password failure from vault corruption before vault read', async () => {
      const mainSource = fs.readFileSync(path.join(__dirname, '../src/main/main.js'), 'utf8');
      const bridgeSource = fs.readFileSync(path.join(__dirname, '../src/main/crypto-ui-bridge.js'), 'utf8');
      assert(mainSource.includes("ipc.on('record-password-failure'"));
      assert(bridgeSource.includes("unlocked.type === 'password-failed'"));
      assert(bridgeSource.includes("ipc.send('record-password-failure')"));
      assert(mainSource.includes("type: 'vault-corrupt'"));
      assert(mainSource.includes('Your failed-login counter was not changed.'));
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
    key.fill(0);
    wrongKey.fill(0);
    fs.rmSync(root, { recursive: true, force: true });
  }

  console.log(`\n${results.length} regression checks passed.`);
}

run().catch((err) => {
  console.error('REGRESSION TEST FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
