'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

// encryption.js is shared with the Electron renderer but its crypto functions
// are safe to exercise under Node when Electron is represented by a minimal stub.
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

const keyFromPassword = (password) => crypto
  .createHmac('sha256', password.split('').reverse().join(''))
  .update(password)
  .digest();

function legacyEncrypt(cryptoKey, clearData) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', cryptoKey, iv);
  return `${iv.toString('hex')}:${Buffer.concat([
    cipher.update(String(clearData), 'utf8'),
    cipher.final()
  ]).toString('hex')}`;
}

function mutateHexCharacter(value) {
  const last = value[value.length - 1];
  const replacement = last === '0' ? '1' : '0';
  return `${value.slice(0, -1)}${replacement}`;
}

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
    assert(!encryptionSource.includes("setAttribute('maxlength','60')"));
  });

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'safeledger-regression-'));
  const vaultDir = path.join(root, 'vaults');
  const oldPassword = 'CorrectHorse9Battery';
  const newPassword = 'NewCorrectHorse8Battery';
  const wrongPassword = 'WrongHorse7Battery';
  const oldKey = keyFromPassword(oldPassword);
  const newKey = keyFromPassword(newPassword);
  const wrongKey = keyFromPassword(wrongPassword);

  try {
    await check('AES-256-GCM authenticated encryption round trip', async () => {
      const clear = JSON.stringify({ secret: 'correct horse battery staple', unicode: '🔐' });
      const encrypted = encryption.encrypt(oldKey, clear);
      assert(encrypted.startsWith('SLG2:'));
      assert.strictEqual(encryption.isAuthenticatedEncryptedPayload(encrypted), true);
      assert.strictEqual(encryption.decrypt(oldKey, encrypted), clear);
    });

    await check('AES-256-GCM rejects a one-character ciphertext modification', async () => {
      const encrypted = encryption.encrypt(oldKey, JSON.stringify({ amount: '1.250 BTC' }));
      const tampered = mutateHexCharacter(encrypted);
      await expectThrow(async () => encryption.decrypt(oldKey, tampered));
    });

    await check('AES-256-GCM rejects authentication-tag modification', async () => {
      const encrypted = encryption.encrypt(oldKey, JSON.stringify({ seed: 'test only' }));
      const parts = encrypted.split(':');
      parts[2] = mutateHexCharacter(parts[2]);
      await expectThrow(async () => encryption.decrypt(oldKey, parts.join(':')));
    });

    await check('legacy AES-CBC vaults remain readable', async () => {
      const clear = JSON.stringify({ file: 'zvault-0.json', groups: [] });
      const legacy = legacyEncrypt(oldKey, clear);
      assert.strictEqual(encryption.isLegacyEncryptedPayload(legacy), true);
      assert.strictEqual(encryption.decrypt(oldKey, legacy), clear);
    });

    await check('first-run vault directory and encrypted profile creation uses authenticated format', async () => {
      assert.strictEqual(await robustVault.makeDir(vaultDir), 'CREATE');
      await robustVault.initVaultList(vaultDir, oldKey);
      await robustVault.saveVault(
        path.join(vaultDir, 'zvault-0.json'),
        JSON.stringify({ file: 'zvault-0.json', groups: [{ name: 'Ledger', records: [{ name: 'Bitcoin', symbol: 'BTC' }] }] }),
        oldKey
      );
      assert(fs.readFileSync(path.join(vaultDir, 'vaultlist.json'), 'utf8').startsWith('SLG2:'));
      assert(fs.readFileSync(path.join(vaultDir, 'zvault-0.json'), 'utf8').startsWith('SLG2:'));
      const list = await robustVault.readVaultList(path.join(vaultDir, 'vaultlist.json'), oldKey);
      assert.strictEqual(list.vaults.length, 1);
    });

    await check('successful login migrates legacy CBC vault files to authenticated GCM', async () => {
      const legacyRoot = fs.mkdtempSync(path.join(root, 'legacy-'));
      const legacyVaultDir = path.join(legacyRoot, 'vaults');
      fs.mkdirSync(legacyVaultDir, { recursive: true });
      const list = {
        vaults: [{
          name: 'Legacy Profile',
          path: legacyVaultDir,
          created: Date(),
          id: 0,
          file: 'zvault-0.json'
        }]
      };
      const profile = { file: 'zvault-0.json', groups: [{ name: 'Legacy Wallet', records: [] }] };
      fs.writeFileSync(path.join(legacyVaultDir, 'vaultlist.json'), legacyEncrypt(oldKey, JSON.stringify(list)), 'utf8');
      fs.writeFileSync(path.join(legacyVaultDir, 'zvault-0.json'), legacyEncrypt(oldKey, JSON.stringify(profile)), 'utf8');

      const opened = await robustVault.readVaultList(path.join(legacyVaultDir, 'vaultlist.json'), oldKey);
      assert.strictEqual(opened.vaults[0].name, 'Legacy Profile');
      assert(fs.readFileSync(path.join(legacyVaultDir, 'vaultlist.json'), 'utf8').startsWith('SLG2:'));
      assert(fs.readFileSync(path.join(legacyVaultDir, 'zvault-0.json'), 'utf8').startsWith('SLG2:'));
      const migratedProfile = await robustVault.readVault(path.join(legacyVaultDir, 'zvault-0.json'), oldKey);
      assert.strictEqual(migratedProfile.groups[0].name, 'Legacy Wallet');
    });

    await check('authenticated vault tampering is classified as corruption with the verified key', async () => {
      const file = path.join(vaultDir, 'vaultlist.json');
      const original = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(file, mutateHexCharacter(original), 'utf8');
      const err = await expectRejectType(robustVault.readVaultList(file, oldKey), 'password-or-corrupt');
      const verifier = masterKeyVerifier.createMasterKeyVerifier(oldKey);
      const classification = loginFailurePolicy.classifyVaultListFailure(err, oldKey, { masterKeyVerifier: verifier });
      assert.strictEqual(classification.failure.type, 'vault-corrupt');
      assert.strictEqual(classification.countPasswordFailure, false);
      fs.writeFileSync(file, original);
    });

    await check('empty profile list starts again at zvault-0.json', async () => {
      assert.deepStrictEqual(robustVault.nextVaultFileName({ vaults: [] }), { id: 0, fileName: 'zvault-0.json' });
      assert.deepStrictEqual(robustVault.nextVaultFileName({ vaults: [{}] }), { id: 0, fileName: 'zvault-0.json' });
    });

    await check('wrong password remains an ambiguous authenticated failure for policy classification', async () => {
      await expectRejectType(robustVault.readVaultList(path.join(vaultDir, 'vaultlist.json'), wrongKey), 'password-or-corrupt');
    });

    await check('malformed encrypted vault list is classified as corruption', async () => {
      const file = path.join(vaultDir, 'vaultlist.json');
      const original = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(file, 'not-an-encrypted-vault');
      await expectRejectType(robustVault.readVaultList(file, oldKey), 'vault-corrupt');
      fs.writeFileSync(file, original);
    });

    await check('valid authenticated ciphertext with damaged JSON is corruption with verified key', async () => {
      const file = path.join(vaultDir, 'vaultlist.json');
      const original = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(file, encryption.encrypt(oldKey, '{broken-json'));
      const err = await expectRejectType(robustVault.readVaultList(file, oldKey), 'password-or-corrupt');
      const verifier = masterKeyVerifier.createMasterKeyVerifier(oldKey);
      const classification = loginFailurePolicy.classifyVaultListFailure(err, oldKey, { masterKeyVerifier: verifier });
      assert.strictEqual(classification.failure.type, 'vault-corrupt');
      assert.strictEqual(classification.countPasswordFailure, false);
      fs.writeFileSync(file, original);
    });

    await check('wrong password increments only when verifier proves the key is wrong', async () => {
      const verifier = masterKeyVerifier.createMasterKeyVerifier(oldKey);
      const classification = loginFailurePolicy.classifyVaultListFailure(
        { status: 'ERROR', type: 'password-or-corrupt' },
        wrongKey,
        { masterKeyVerifier: verifier }
      );
      assert.strictEqual(classification.failure.type, 'password-failed');
      assert.strictEqual(classification.countPasswordFailure, true);
    });

    await check('unreadable/corrupt vault failures never count as password failures', async () => {
      const classification = loginFailurePolicy.classifyVaultListFailure(
        { status: 'ERROR', type: 'vault-read-error' }, oldKey, {}
      );
      assert.strictEqual(classification.countPasswordFailure, false);
    });

    await check('atomic authenticated vault save leaves readable final file and no temp file', async () => {
      const file = path.join(vaultDir, 'atomic.json');
      await robustVault.saveVault(file, JSON.stringify({ file: 'atomic.json', groups: [] }), oldKey);
      assert(fs.readFileSync(file, 'utf8').startsWith('SLG2:'));
      const value = await robustVault.readVault(file, oldKey);
      assert.strictEqual(value.file, 'atomic.json');
      const leftovers = fs.readdirSync(vaultDir).filter((name) => name.includes('.tmp'));
      assert.deepStrictEqual(leftovers, []);
    });

    await check('password rotation writes authenticated files before removing old files', async () => {
      const list = await robustVault.readVaultList(path.join(vaultDir, 'vaultlist.json'), oldKey);
      const oldFile = list.vaults[0].file;
      const result = await robustVault.rotateCrypto(vaultDir, oldKey, newKey, list);
      assert.strictEqual(result.status, 'SUCCESS');
      assert.notStrictEqual(result.vaultList.vaults[0].file, oldFile);
      assert.strictEqual(fs.existsSync(path.join(vaultDir, oldFile)), false);
      const newFile = path.join(vaultDir, result.vaultList.vaults[0].file);
      assert(fs.readFileSync(newFile, 'utf8').startsWith('SLG2:'));
      const newData = await robustVault.readVault(newFile, newKey);
      assert.strictEqual(newData.groups[0].name, 'Ledger');
      const newList = await robustVault.readVaultList(path.join(vaultDir, 'vaultlist.json'), newKey);
      assert.strictEqual(newList.vaults[0].file, result.vaultList.vaults[0].file);
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
