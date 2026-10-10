'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const encryption = require('../src/main/encryption');
const keyEnvelope = require('../src/main/key-envelope');
const robustVault = require('../src/main/robust-vault');
const vaultSchema = require('../src/main/vault-schema');
const securityMain = require('../src/main/security-main');
const profileTransaction = require('../src/main/profile-transaction');

function backupPayload(dataKey, envelope, version = 3) {
  const list = {
    vaults: [{ name: 'Recovery Test', id: 0, file: 'zvault-0.json', created: '2026-09-06T00:00:00.000Z' }]
  };
  const profile = vaultSchema.prepareForSave({
    file: 'zvault-0.json',
    groups: [{ name: 'Hardware Wallet', records: [{ name: 'Bitcoin' }, { name: 'Ethereum' }] }]
  });
  const files = {
    'vaults/vaultlist.json': Buffer.from(encryption.encrypt(dataKey, JSON.stringify(list)), 'utf8').toString('base64'),
    'vaults/zvault-0.json': Buffer.from(encryption.encrypt(dataKey, JSON.stringify(profile)), 'utf8').toString('base64')
  };
  if (version >= 3) files['vaults/key-envelope.json'] = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');
  return {
    format: securityMain._test.BACKUP_FORMAT,
    version,
    created: '2026-09-06T00:00:00.000Z',
    files,
    ...(version >= 3 ? { manifest: securityMain._test.buildBackupManifest(files) } : {})
  };
}

async function testIndependentBackupUnlock() {
  const password = 'RecoveryConfidence123';
  const dataKey = crypto.randomBytes(32);
  const unrelatedCurrentKey = crypto.randomBytes(32);
  const created = await keyEnvelope.createEnvelope(password, dataKey);
  try {
    const payload = backupPayload(dataKey, created.envelope, 3);
    const report = await securityMain._test.verifyBackupPayloadWithPassword(payload, password, unrelatedCurrentKey);
    assert.strictEqual(report.recoveryVerified, true);
    assert.strictEqual(report.verificationMode, 'backup-password');
    assert.strictEqual(report.profileCount, 1);
    assert.strictEqual(report.walletCount, 1);
    assert.strictEqual(report.assetCount, 2);

    await assert.rejects(
      securityMain._test.verifyBackupPayloadWithPassword(payload, 'WrongRecoveryPassword123', unrelatedCurrentKey),
      /failed-login counter was not changed/
    );

    const wrongProfileKey = crypto.randomBytes(32);
    try {
      const damaged = JSON.parse(JSON.stringify(payload));
      const profile = vaultSchema.prepareForSave({ file: 'zvault-0.json', groups: [] });
      damaged.files['vaults/zvault-0.json'] = Buffer.from(encryption.encrypt(wrongProfileKey, JSON.stringify(profile)), 'utf8').toString('base64');
      damaged.manifest = securityMain._test.buildBackupManifest(damaged.files);
      await assert.rejects(
        securityMain._test.verifyBackupPayloadWithPassword(damaged, password, unrelatedCurrentKey),
        /could not be authenticated/
      );
    } finally {
      wrongProfileKey.fill(0);
    }

    const legacy = backupPayload(dataKey, null, 2);
    const legacyReport = await securityMain._test.verifyBackupPayloadWithPassword(legacy, 'ignored-for-v2', dataKey);
    assert.strictEqual(legacyReport.recoveryVerified, false);
    assert.strictEqual(legacyReport.verificationMode, 'legacy-current-session');
    assert(/cannot prove an independent password recovery/i.test(legacyReport.warning));
  } finally {
    dataKey.fill(0);
    unrelatedCurrentKey.fill(0);
    created.dataKey.fill(0);
  }
}

function ioWith(overrides = {}) {
  return {
    rm: (...args) => fs.promises.rm(...args),
    mkdir: (...args) => fs.promises.mkdir(...args),
    writeFile: (...args) => fs.promises.writeFile(...args),
    readFile: (...args) => fs.promises.readFile(...args),
    rename: (...args) => fs.promises.rename(...args),
    unlink: (...args) => fs.promises.unlink(...args),
    ...overrides
  };
}

function restoreFixture() {
  const files = {
    'vaults/vaultlist.json': Buffer.from('encrypted-list-fixture', 'utf8').toString('base64'),
    'vaults/key-envelope.json': Buffer.from('{"fixture":true}', 'utf8').toString('base64'),
    'settings/settings.json': Buffer.from('{"appearance":"dark"}', 'utf8').toString('base64')
  };
  return {
    format: securityMain._test.BACKUP_FORMAT,
    version: 3,
    created: '2026-09-06T00:00:00.000Z',
    files,
    manifest: securityMain._test.buildBackupManifest(files)
  };
}

async function testRestoreStagingVerificationAndRollback() {
  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'safeledger-recovery-confidence-'));
  try {
    const dataRoot = path.join(temp, 'SafeLedgerData');
    await fs.promises.mkdir(dataRoot, { recursive: true });
    await fs.promises.writeFile(path.join(dataRoot, 'original.txt'), 'keep-me', 'utf8');

    const corruptingIo = ioWith({
      readFile: async (file, ...args) => {
        if (String(file).includes('SafeLedgerData-restore-staging-') && String(file).endsWith(path.join('vaults', 'vaultlist.json'))) {
          return Buffer.from('disk-write-corruption', 'utf8');
        }
        return fs.promises.readFile(file, ...args);
      }
    });
    await assert.rejects(
      securityMain._test.stageRestore(dataRoot, restoreFixture(), corruptingIo),
      /Current SafeLedger data was not changed/
    );
    assert.strictEqual(await fs.promises.readFile(path.join(dataRoot, 'original.txt'), 'utf8'), 'keep-me');

    let promoteAttempted = false;
    const rollbackIo = ioWith({
      rename: async (from, to) => {
        if (String(from).includes('SafeLedgerData-restore-staging-') && to === dataRoot && !promoteAttempted) {
          promoteAttempted = true;
          const error = new Error('simulated promotion failure');
          error.code = 'EIO';
          throw error;
        }
        return fs.promises.rename(from, to);
      }
    });
    await assert.rejects(
      securityMain._test.stageRestore(dataRoot, restoreFixture(), rollbackIo),
      /simulated promotion failure/
    );
    assert.strictEqual(await fs.promises.readFile(path.join(dataRoot, 'original.txt'), 'utf8'), 'keep-me', 'failed promotion must roll the original data folder back');

    let call = 0;
    const failedRollbackIo = {
      rename: async () => {
        call++;
        if (call === 1) return;
        const error = new Error(call === 2 ? 'promotion failed' : 'rollback failed');
        error.code = 'EIO';
        throw error;
      }
    };
    await assert.rejects(
      securityMain._test.commitStagedRestore('/data/current', '/data/staging', '/data/safety', failedRollbackIo),
      /pre-restore safety copy remains at \/data\/safety/
    );
  } finally {
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
}

async function writeEncryptedList(vaultDir, list, key) {
  await robustVault.saveVault(path.join(vaultDir, 'vaultlist.json'), JSON.stringify(list), key);
}

async function testProfileCreationTransaction() {
  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'safeledger-profile-transaction-'));
  const vaultDir = path.join(temp, 'vaults');
  const key = crypto.randomBytes(32);
  try {
    await fs.promises.mkdir(vaultDir, { recursive: true });
    const original = { vaults: [{ name: 'Existing', id: 0, file: 'zvault-0.json' }] };
    await writeEncryptedList(vaultDir, original, key);
    await robustVault.initVaultData(vaultDir, 'zvault-0.json', key);

    const nextList = { vaults: original.vaults.concat([{ name: 'New', id: 1, file: 'zvault-1.json' }]) };
    const initializeProfile = async (file, cryptoKey) => robustVault.initVaultData(vaultDir, file, cryptoKey);

    await assert.rejects(
      profileTransaction.createProfile({
        vaultDir,
        nextList,
        profileFile: 'zvault-1.json',
        cryptoKey: key,
        walletNames: [],
        initializeProfile,
        saveList: async () => { throw new Error('simulated list commit failure'); },
        readList: robustVault.readVaultList
      }),
      /simulated list commit failure/
    );
    await assert.rejects(fs.promises.stat(path.join(vaultDir, 'zvault-1.json')), /ENOENT/);
    const afterFailure = await robustVault.readVaultList(path.join(vaultDir, 'vaultlist.json'), key);
    assert.strictEqual(afterFailure.vaults.length, 1, 'failed creation must not publish a missing profile');
    await assert.rejects(fs.promises.stat(path.join(vaultDir, profileTransaction._test.MARKER_FILE)), /ENOENT/);

    // Simulate a process interruption after the encrypted profile was created
    // but before the authoritative profile list was committed.
    await robustVault.initVaultData(vaultDir, 'zvault-1.json', key);
    await fs.promises.writeFile(path.join(vaultDir, profileTransaction._test.MARKER_FILE), JSON.stringify({
      format: profileTransaction._test.MARKER_FORMAT,
      version: 1,
      file: 'zvault-1.json'
    }), 'utf8');
    const recovered = await profileTransaction.recoverPending(vaultDir, key, robustVault.readVaultList);
    assert.strictEqual(recovered.recovered, true);
    assert.strictEqual(recovered.committed, false);
    await assert.rejects(fs.promises.stat(path.join(vaultDir, 'zvault-1.json')), /ENOENT/);

    // If the list commit completed before the interruption, recovery keeps the
    // encrypted profile and only clears the transaction marker.
    await robustVault.initVaultData(vaultDir, 'zvault-1.json', key);
    await writeEncryptedList(vaultDir, nextList, key);
    await fs.promises.writeFile(path.join(vaultDir, profileTransaction._test.MARKER_FILE), JSON.stringify({
      format: profileTransaction._test.MARKER_FORMAT,
      version: 1,
      file: 'zvault-1.json'
    }), 'utf8');
    const committed = await profileTransaction.recoverPending(vaultDir, key, robustVault.readVaultList);
    assert.strictEqual(committed.committed, true);
    assert((await fs.promises.stat(path.join(vaultDir, 'zvault-1.json'))).isFile());
    await assert.rejects(fs.promises.stat(path.join(vaultDir, profileTransaction._test.MARKER_FILE)), /ENOENT/);
  } finally {
    key.fill(0);
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
}

(async () => {
  await testIndependentBackupUnlock();
  await testRestoreStagingVerificationAndRollback();
  await testProfileCreationTransaction();
  console.log('PASS SafeLedger recovery confidence: independent backup unlock, staged restore verification/rollback, and interrupted profile creation recovery.');
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
