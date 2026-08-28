'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const encryption = require('../src/main/encryption');
const vaultSchema = require('../src/main/vault-schema');
const legacyImport = require('../src/main/legacy-import');
const robustVault = require('../src/main/robust-vault');
const securityMain = require('../src/main/security-main');
const settingsManager = require('../src/main/installManager/installManager/settingsManager');

function encryptLegacy(password, value, ivHex = '00112233445566778899aabbccddeeff') {
  const key = legacyImport.deriveLegacyKey(password);
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  } finally {
    key.fill(0);
  }
}

function validEnvelopeFixture() {
  return {
    format: 'safeledger-key-envelope',
    version: 3,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    kdf: {
      algorithm: 'argon2id',
      salt: '00112233445566778899aabbccddeeff',
      memory: 65536,
      passes: 3,
      parallelism: 1,
      keyBytes: 32
    },
    kekVerifier: 'a'.repeat(64),
    wrappedKey: {
      algorithm: 'aes-256-gcm',
      iv: 'b'.repeat(24),
      tag: 'c'.repeat(32),
      ciphertext: 'd'.repeat(64)
    }
  };
}

async function testVaultSchema() {
  const migrated = vaultSchema.migrateVaultData({ file: 'zvault-1.json', groups: [{ name: 'Wallet', records: [] }] });
  assert.strictEqual(migrated.schemaVersion, vaultSchema.CURRENT_VAULT_SCHEMA_VERSION);
  assert.strictEqual(migrated.groups.length, 1);
  assert.throws(() => vaultSchema.migrateVaultData({ schemaVersion: 999, groups: [] }), /newer SafeLedger data schema/);
  assert.throws(() => vaultSchema.migrateVaultData(null), /invalid structure/);
}

async function testLegacyImporter() {
  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'safeledger-continuity-'));
  const sourceParent = path.join(temp, 'old-install');
  const legacyDir = path.join(sourceParent, 'safeledgerdata');
  const targetDir = path.join(temp, 'SafeLedgerData', 'vaults');
  await fs.promises.mkdir(legacyDir, { recursive: true });
  await fs.promises.mkdir(targetDir, { recursive: true });

  const legacyPassword = 'LegacyPassword123';
  const legacyList = {
    vaults: [{ name: 'Family Recovery', id: 0, file: 'zvault-0.json', created: 'Thu Mar 15 2018 10:00:00 GMT-0400' }]
  };
  const legacyVault = {
    file: 'zvault-0.json',
    groups: [{
      name: 'Ledger Nano S',
      seedPhrase: 'example legacy secret',
      records: [
        { name: 'Bitcoin', symbol: 'BTC', publicAddress: 'bc1example' },
        { name: 'Ethereum', symbol: 'ETH', publicAddress: '0xexample' }
      ]
    }]
  };
  const sourceListText = encryptLegacy(legacyPassword, JSON.stringify(legacyList));
  const sourceVaultText = encryptLegacy(legacyPassword, JSON.stringify(legacyVault), 'ffeeddccbbaa99887766554433221100');
  await fs.promises.writeFile(path.join(legacyDir, 'vaultlist.json'), sourceListText, 'utf8');
  await fs.promises.writeFile(path.join(legacyDir, 'zvault-0.json'), sourceVaultText, 'utf8');

  const targetKey = crypto.randomBytes(32);
  try {
    await robustVault.initVaultList(targetDir, targetKey);
    await robustVault.initVaultData(targetDir, 'zvault-0.json', targetKey);

    const report = await legacyImport.importIntoCurrent({
      sourceDir: sourceParent,
      password: legacyPassword,
      targetVaultDir: targetDir,
      targetKey
    });
    assert.strictEqual(report.profileCount, 1);
    assert.strictEqual(report.walletCount, 1);
    assert.strictEqual(report.assetCount, 2);

    assert.strictEqual(await fs.promises.readFile(path.join(legacyDir, 'vaultlist.json'), 'utf8'), sourceListText, 'legacy vault list must remain byte-for-byte unchanged');
    assert.strictEqual(await fs.promises.readFile(path.join(legacyDir, 'zvault-0.json'), 'utf8'), sourceVaultText, 'legacy profile must remain byte-for-byte unchanged');

    const currentList = await robustVault.readVaultList(path.join(targetDir, 'vaultlist.json'), targetKey);
    assert.strictEqual(currentList.vaults.length, 2);
    const importedProfile = currentList.vaults.find((profile) => profile.importedFrom === 'SafeLedger 1.x');
    assert(importedProfile, 'imported profile metadata should identify its legacy source');
    const importedVault = await robustVault.readVault(path.join(targetDir, importedProfile.file), targetKey);
    assert.strictEqual(importedVault.schemaVersion, vaultSchema.CURRENT_VAULT_SCHEMA_VERSION);
    assert.strictEqual(importedVault.migration.source, 'safeledger-1.x');
    assert.strictEqual(importedVault.groups[0].seedPhrase, legacyVault.groups[0].seedPhrase);
    assert.strictEqual(importedVault.groups[0].records.length, 2);

    await assert.rejects(
      legacyImport.readLegacyBundle(sourceParent, 'WrongPassword123'),
      /password may be incorrect|Unable to unlock/
    );
  } finally {
    targetKey.fill(0);
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
}

async function testBackupIntegrityManifest() {
  const files = {
    'vaults/key-envelope.json': Buffer.from('{}', 'utf8').toString('base64'),
    'vaults/vaultlist.json': Buffer.from('encrypted-list', 'utf8').toString('base64'),
    'settings/settings.json': Buffer.from('{"appearance":"dark"}', 'utf8').toString('base64')
  };
  const manifest = securityMain._test.buildBackupManifest(files);
  const payload = {
    format: securityMain._test.BACKUP_FORMAT,
    version: securityMain._test.BACKUP_VERSION,
    created: new Date().toISOString(),
    files,
    manifest
  };
  assert.strictEqual(securityMain._test.validateBackupPayload(JSON.parse(JSON.stringify(payload))).version, 3);

  const tampered = JSON.parse(JSON.stringify(payload));
  tampered.files['settings/settings.json'] = Buffer.from('{"appearance":"light"}', 'utf8').toString('base64');
  assert.throws(() => securityMain._test.validateBackupPayload(tampered), /integrity check failed/);

  const traversal = JSON.parse(JSON.stringify(payload));
  traversal.files['../escape.txt'] = Buffer.from('x').toString('base64');
  traversal.manifest = securityMain._test.buildBackupManifest(traversal.files);
  assert.throws(() => securityMain._test.validateBackupPayload(traversal), /invalid path/);

  const v2 = {
    format: securityMain._test.BACKUP_FORMAT,
    version: 2,
    created: new Date().toISOString(),
    files: { 'vaults/vaultlist.json': Buffer.from('legacy-v2-backup').toString('base64') }
  };
  assert.strictEqual(securityMain._test.validateBackupPayload(v2).version, 2, 'version-2 complete backups must remain accepted for restore');
}

async function testAuthenticatedBackupVerification() {
  const dataKey = crypto.randomBytes(32);
  try {
    const list = {
      vaults: [{ name: 'Primary', id: 0, file: 'zvault-0.json', created: new Date().toISOString() }]
    };
    const profile = vaultSchema.prepareForSave({
      file: 'zvault-0.json',
      groups: [
        { name: 'Hardware Wallet', records: [{ name: 'Bitcoin' }, { name: 'Ethereum' }] },
        { name: 'Mobile Wallet', records: [{ name: 'Litecoin' }] }
      ]
    });
    const files = {
      'vaults/key-envelope.json': Buffer.from(JSON.stringify(validEnvelopeFixture()), 'utf8').toString('base64'),
      'vaults/vaultlist.json': Buffer.from(encryption.encrypt(dataKey, JSON.stringify(list)), 'utf8').toString('base64'),
      'vaults/zvault-0.json': Buffer.from(encryption.encrypt(dataKey, JSON.stringify(profile)), 'utf8').toString('base64')
    };
    const payload = {
      format: securityMain._test.BACKUP_FORMAT,
      version: 3,
      created: '2026-08-28T12:00:00.000Z',
      files,
      manifest: securityMain._test.buildBackupManifest(files)
    };
    const report = securityMain._test.verifyBackupPayload(payload, dataKey);
    assert.strictEqual(report.profileCount, 1);
    assert.strictEqual(report.walletCount, 2);
    assert.strictEqual(report.assetCount, 3);
    assert.strictEqual(report.fileCount, 3);

    const malicious = JSON.parse(JSON.stringify(payload));
    malicious.files['vaults/zvault-0.json'] = Buffer.from(encryption.encrypt(crypto.randomBytes(32), JSON.stringify(profile)), 'utf8').toString('base64');
    malicious.manifest = securityMain._test.buildBackupManifest(malicious.files);
    assert.throws(() => securityMain._test.verifyBackupPayload(malicious, dataKey), /could not be authenticated/);
  } finally {
    dataKey.fill(0);
  }
}

async function testSaferDefaultsAndStaticHardening() {
  assert.strictEqual(settingsManager._test.defaults().scrubContentAfterRetries, false);
  assert.strictEqual(settingsManager._test.normalizeSettings({ scrubContentAfterRetries: true }).scrubContentAfterRetries, true);
  assert.strictEqual(settingsManager._test.normalizeSettings({}).scrubContentAfterRetries, false);

  const root = path.join(__dirname, '..');
  const main = fs.readFileSync(path.join(root, 'src/main/main.js'), 'utf8');
  const preload = fs.readFileSync(path.join(root, 'src/main/preload.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'src/main/index.html'), 'utf8');
  const securityUi = fs.readFileSync(path.join(root, 'src/main/security-ui.js'), 'utf8');
  assert(main.includes("settings.scrubContentAfterRetries === true"));
  assert(main.includes('setWindowOpenHandler'));
  assert(main.includes("on('will-navigate'"));
  assert(main.includes('setPermissionRequestHandler'));
  assert(main.includes('assertTrustedEvent(event)'));
  assert(preload.includes('verifyBackup'));
  assert(preload.includes('selectLegacyImportSource'));
  assert(preload.includes('importLegacyData'));
  assert(html.includes('Content-Security-Policy'));
  assert(html.includes("connect-src 'none'"));
  assert(securityUi.includes('createPrintFrame'));
  assert(!securityUi.includes("window.open('', '_blank'"), 'recovery printing must not bypass the deny-new-window policy');
}

(async () => {
  await testVaultSchema();
  await testLegacyImporter();
  await testBackupIntegrityManifest();
  await testAuthenticatedBackupVerification();
  await testSaferDefaultsAndStaticHardening();
  console.log('PASS SafeLedger 2.1 continuity, legacy import, authenticated backup verification, security hardening, and secure-print continuity tests.');
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
