'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const runtimeUtils = require('../src/main/runtime-utils');
const passwordPolicy = require('../src/main/password-policy');
const lockoutState = require('../src/main/lockout-state');
const encryption = require('../src/main/encryption');
const vault = require('../src/main/robust-vault');

let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}

async function run() {
  await check('portable root - Windows portable executable', async () => {
    assert.strictEqual(runtimeUtils.getPortableRoot({
      platform: 'win32',
      env: { PORTABLE_EXECUTABLE_DIR: 'E:\\SafeLedger' },
      execPath: 'C:\\Temp\\SafeLedger.exe',
      isPackaged: true
    }), 'E:\\SafeLedger');
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
      const clear = 'sensitive recovery data';
      const encrypted = encryption.encrypt(key, clear);
      assert(encrypted.startsWith('SLG2:'));
      assert.strictEqual(encryption.decrypt(key, encrypted), clear);
    });

    await check('AES-256-GCM rejects ciphertext modification', async () => {
      const encrypted = encryption.encrypt(key, 'tamper test');
      const parts = encrypted.split(':');
      const final = parts[3];
      parts[3] = `${final.slice(0, -2)}${final.slice(-2) === '00' ? '01' : '00'}`;
      assert.throws(() => encryption.decrypt(key, parts.join(':')));
    });

    await check('v1 CBC-shaped payloads are rejected', async () => {
      assert.throws(() => encryption.decrypt(key, `${'00'.repeat(16)}:${'11'.repeat(32)}`));
    });

    await check('first-run vault files are authenticated SLG2 data', async () => {
      await vault.makeDir(vaultDir);
      await vault.initVaultList(vaultDir, key);
      const source = fs.readFileSync(path.join(vaultDir, 'vaultlist.json'), 'utf8');
      assert(source.startsWith('SLG2:'));
      const list = await vault.readVaultList(path.join(vaultDir, 'vaultlist.json'), key);
      assert(Array.isArray(list.vaults));
    });

    await check('authenticated vault tampering cannot be decrypted', async () => {
      const file = path.join(vaultDir, 'tamper.json');
      await vault.saveVault(file, JSON.stringify({ secret: 'seed words' }), key);
      const stored = fs.readFileSync(file, 'utf8');
      const parts = stored.split(':');
      parts[3] = `${parts[3].slice(0, -2)}${parts[3].slice(-2) === '00' ? '01' : '00'}`;
      fs.writeFileSync(file, parts.join(':'), 'utf8');
      await assert.rejects(() => vault.readVault(file, key));
    });

    await check('empty profile list starts again at zvault-0.json', async () => {
      assert.deepStrictEqual(vault.nextVaultFileName({ vaults: [] }), { id: 0, fileName: 'zvault-0.json' });
    });

    await check('wrong data key cannot authenticate the encrypted vault list', async () => {
      await assert.rejects(() => vault.readVaultList(path.join(vaultDir, 'vaultlist.json'), wrongKey));
    });

    await check('malformed vault list is classified as corruption', async () => {
      const file = path.join(vaultDir, 'malformed-list.json');
      fs.writeFileSync(file, 'not encrypted', 'utf8');
      await assert.rejects(() => vault.readVaultList(file, key));
    });

    await check('valid ciphertext with damaged JSON cannot be accepted as a vault list', async () => {
      const file = path.join(vaultDir, 'damaged-json-list.json');
      fs.writeFileSync(file, encryption.encrypt(key, '{bad json'), 'utf8');
      await assert.rejects(() => vault.readVaultList(file, key));
    });

    await check('runtime separates password failure from vault corruption before vault read', async () => {
      const main = fs.readFileSync(path.join(__dirname, '../src/main/main.js'), 'utf8');
      assert(main.includes("ipc.on('record-password-failure'"));
      assert(main.includes("type: 'vault-corrupt'"));
      assert(main.includes('Your failed-login counter was not changed'));
    });

    await check('atomic authenticated vault save leaves readable final file and no temp file', async () => {
      const file = path.join(vaultDir, 'atomic-test.json');
      await vault.saveVault(file, JSON.stringify({ ok: true }), key);
      assert.deepStrictEqual(await vault.readVault(file, key), { ok: true });
      const tempFiles = fs.readdirSync(vaultDir).filter((name) => name.includes('.tmp'));
      assert.strictEqual(tempFiles.length, 0);
    });

    await check('active lockout state is detected', async () => {
      const now = Date.now();
      assert.strictEqual(lockoutState.isLockoutActive({ lockLogin: true, lockLoginTime: now, minutesToWaitBetweenLockout: 15 }, now), true);
    });
  } finally {
    key.fill(0);
    wrongKey.fill(0);
    fs.rmSync(root, { recursive: true, force: true });
  }

  console.log(`\n${passed} regression checks passed.`);
}

run().catch((err) => {
  console.error('REGRESSION TEST FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
