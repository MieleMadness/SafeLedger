'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const robustVault = require('../src/main/robust-vault');
const dataWrite = require('../src/main/data-write-service');
const settingsManager = require('../src/main/installManager/installManager/settingsManager');

async function saveEncrypted(file, value, key) {
  await robustVault.saveVault(file, JSON.stringify(value), key);
}

async function makeVaultFixture(root, key) {
  const vaultDir = path.join(root, 'vaults');
  await fs.promises.mkdir(vaultDir, { recursive: true });
  const list = {
    vaultSelected: 99,
    compatibilityNote: 'preserve-root-profile-metadata',
    vaults: [
      { id: 0, file: 'zvault-0.json', name: 'Primary', notes: 'old', created: '2026-01-01T00:00:00.000Z', compatibilityField: 'keep-profile-field' },
      { id: 1, file: 'zvault-1.json', name: 'Secondary', notes: '', created: '2026-01-02T00:00:00.000Z' }
    ]
  };
  const profile = {
    file: 'zvault-0.json',
    schemaVersion: 1,
    catalogVersion: 'compat-catalog',
    compatibilityRoot: { keep: true },
    groupSelected: 50,
    recordSelected: 50,
    groups: [
      {
        name: 'Alpha Wallet',
        category: 'Hardware Wallet',
        created: '2026-02-01T00:00:00.000Z',
        compatibilityGroup: 'keep-group-field',
        notes: 'alpha old',
        records: [
          { name: 'Bitcoin', symbol: 'BTC', created: '2026-03-01T00:00:00.000Z', publicAddress: 'bc1-old', compatibilityRecord: 'keep-record-field' },
          { name: 'Ethereum', symbol: 'ETH', created: '2026-03-02T00:00:00.000Z', publicAddress: '0x-old' }
        ]
      },
      {
        name: 'Beta Wallet',
        created: '2026-02-02T00:00:00.000Z',
        notes: 'beta unchanged',
        records: []
      }
    ]
  };
  const secondary = { file: 'zvault-1.json', schemaVersion: 1, groups: [] };
  await saveEncrypted(path.join(vaultDir, 'vaultlist.json'), list, key);
  await saveEncrypted(path.join(vaultDir, 'zvault-0.json'), profile, key);
  await saveEncrypted(path.join(vaultDir, 'zvault-1.json'), secondary, key);
  return { vaultDir, list, profile };
}

async function testProfileOwnership(root, key) {
  const { vaultDir } = await makeVaultFixture(path.join(root, 'profile'), key);
  const result = await dataWrite.modifyProfile({
    vault: robustVault,
    vaultDir,
    key,
    profile: {
      id: 999,
      file: 'zvault-0.json',
      path: '/renderer/should/not/control/this',
      created: '1999-01-01T00:00:00.000Z',
      name: 'Renamed Primary',
      notes: 'renderer-approved note',
      pinned: true,
      injectedRoot: 'must-not-persist'
    }
  });

  assert.strictEqual(result.vaults.length, 2, 'A one-profile edit must not replace or drop another profile.');
  const persisted = await robustVault.readVaultList(path.join(vaultDir, 'vaultlist.json'), key);
  const primary = persisted.vaults.find((item) => item.file === 'zvault-0.json');
  const secondary = persisted.vaults.find((item) => item.file === 'zvault-1.json');
  assert(primary && secondary, 'Both authoritative profiles must remain after one profile edit.');
  assert.strictEqual(primary.id, 0, 'Renderer must not rewrite the authoritative profile id.');
  assert.strictEqual(primary.file, 'zvault-0.json', 'Renderer must not rewrite the authoritative profile file.');
  assert.strictEqual(primary.created, '2026-01-01T00:00:00.000Z', 'Renderer must not rewrite profile creation evidence.');
  assert.strictEqual(primary.compatibilityField, 'keep-profile-field', 'Unknown existing compatibility fields must be preserved.');
  assert.strictEqual(primary.injectedRoot, undefined, 'New unapproved profile fields must not be persisted.');
  assert.strictEqual(primary.name, 'Renamed Primary');
  assert.strictEqual(primary.notes, 'renderer-approved note');
  assert.strictEqual(primary.pinned, true);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(persisted, 'vaultSelected'), false, 'Profile selection is UI state and must not be persisted.');
  assert.strictEqual(persisted.compatibilityNote, 'preserve-root-profile-metadata', 'Unknown existing profile-list metadata must survive an edit.');

  const afterDelete = await dataWrite.deleteProfile({ vault: robustVault, vaultDir, key, fileName: 'zvault-1.json' });
  assert.strictEqual(afterDelete.vaults.length, 1);
  const afterDeletePersisted = await robustVault.readVaultList(path.join(vaultDir, 'vaultlist.json'), key);
  assert.deepStrictEqual(afterDeletePersisted.vaults.map((item) => item.file), ['zvault-0.json']);
}

async function testGroupOwnership(root, key) {
  const { vaultDir, profile } = await makeVaultFixture(path.join(root, 'group'), key);
  const rendererState = JSON.parse(JSON.stringify(profile));
  rendererState.groupSelected = 0;
  rendererState.groups[0] = Object.assign({}, rendererState.groups[0], {
    name: 'Alpha Wallet Updated',
    notes: 'new note',
    records: [{ name: 'Injected Asset', symbol: 'BAD' }],
    compatibilityGroup: 'renderer-tried-to-rewrite-existing-unknown-field',
    newUnknownGroupField: 'must-not-persist'
  });
  rendererState.groups[1].notes = 'renderer tried to alter unrelated group';

  const request = dataWrite.legacyGroupRequest({ type: 'group-modify', vaultData: rendererState });
  const result = await dataWrite.mutateGroup({ vault: robustVault, vaultDir, key, request });
  assert.strictEqual(result.groupSelected, 0);

  const persisted = await robustVault.readVault(path.join(vaultDir, 'zvault-0.json'), key);
  const alpha = persisted.groups.find((item) => item.created === '2026-02-01T00:00:00.000Z');
  const beta = persisted.groups.find((item) => item.created === '2026-02-02T00:00:00.000Z');
  assert.strictEqual(alpha.name, 'Alpha Wallet Updated');
  assert.strictEqual(alpha.notes, 'new note');
  assert.deepStrictEqual(alpha.records.map((item) => item.name), ['Bitcoin', 'Ethereum'], 'A vault-item edit must not gain authority to replace its asset collection.');
  assert.strictEqual(alpha.compatibilityGroup, 'keep-group-field', 'Unknown existing vault-item fields must be preserved rather than renderer-replaced.');
  assert.strictEqual(alpha.newUnknownGroupField, undefined, 'New unapproved vault-item fields must be ignored.');
  assert.strictEqual(beta.notes, 'beta unchanged', 'Unrelated vault items must be reloaded from authoritative disk data, not renderer state.');
  assert.strictEqual(persisted.compatibilityRoot.keep, true);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(persisted, 'groupSelected'), false, 'Vault-item selection is UI state and must not be persisted.');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(persisted, 'recordSelected'), false, 'Asset selection is UI state and must not be persisted.');

  const deleteView = JSON.parse(JSON.stringify(persisted));
  deleteView.groups.splice(1, 1);
  deleteView.groupSelected = null;
  deleteView.recordSelected = null;
  const deleteRequest = dataWrite.legacyGroupRequest({ type: 'group-delete', vaultData: deleteView });
  await dataWrite.mutateGroup({ vault: robustVault, vaultDir, key, request: deleteRequest });
  const deleted = await robustVault.readVault(path.join(vaultDir, 'zvault-0.json'), key);
  assert.deepStrictEqual(deleted.groups.map((item) => item.name), ['Alpha Wallet Updated'], 'Delete compatibility path must accept exactly one unchanged-item omission.');

  await saveEncrypted(path.join(vaultDir, 'zvault-0.json'), persisted, key);
  const maliciousDelete = JSON.parse(JSON.stringify(persisted));
  maliciousDelete.groups.splice(1, 1);
  maliciousDelete.groups[0].notes = 'smuggled change';
  maliciousDelete.groupSelected = null;
  await assert.rejects(
    dataWrite.mutateGroup({ vault: robustVault, vaultDir, key, request: dataWrite.legacyGroupRequest({ type: 'group-delete', vaultData: maliciousDelete }) }),
    /did not match the current encrypted Profile/,
    'A delete request must not be usable to smuggle a second modification.'
  );
}

async function testRecordOwnership(root, key) {
  const { vaultDir, profile } = await makeVaultFixture(path.join(root, 'record'), key);
  const rendererState = JSON.parse(JSON.stringify(profile));
  rendererState.groupSelected = 0;
  rendererState.recordSelected = 0;
  rendererState.groups[0].records[0] = Object.assign({}, rendererState.groups[0].records[0], {
    name: 'Bitcoin Main',
    publicAddress: 'bc1-new',
    compatibilityRecord: 'renderer-tried-to-rewrite-unknown',
    injectedRecordField: 'must-not-persist'
  });
  rendererState.groups[0].notes = 'renderer tried to alter parent group';
  rendererState.groups[1].name = 'renderer tried to alter unrelated group';

  const request = dataWrite.legacyRecordRequest({ action: 'modify', vaultData: rendererState });
  const result = await dataWrite.mutateRecord({ vault: robustVault, vaultDir, key, request });
  assert.strictEqual(result.groupSelected, 0);
  assert.strictEqual(result.recordSelected, 0);

  const persisted = await robustVault.readVault(path.join(vaultDir, 'zvault-0.json'), key);
  const alpha = persisted.groups[0];
  const bitcoin = alpha.records.find((item) => item.created === '2026-03-01T00:00:00.000Z');
  const ethereum = alpha.records.find((item) => item.created === '2026-03-02T00:00:00.000Z');
  assert.strictEqual(bitcoin.name, 'Bitcoin Main');
  assert.strictEqual(bitcoin.publicAddress, 'bc1-new');
  assert.strictEqual(bitcoin.compatibilityRecord, 'keep-record-field', 'Unknown existing asset metadata must survive without becoming renderer-controlled.');
  assert.strictEqual(bitcoin.injectedRecordField, undefined, 'New unapproved asset fields must not be persisted.');
  assert(ethereum, 'Editing one asset must preserve sibling assets.');
  assert.strictEqual(alpha.notes, 'alpha old', 'Asset edits must not rewrite their parent vault item.');
  assert.strictEqual(persisted.groups[1].name, 'Beta Wallet', 'Asset edits must not rewrite unrelated vault items.');

  const deleteView = dataWrite.withViewState(persisted, 0, 0);
  deleteView.groups[0].records.splice(1, 1);
  deleteView.recordSelected = null;
  const deleteRequest = dataWrite.legacyRecordRequest({ action: 'delete', vaultData: deleteView });
  await dataWrite.mutateRecord({ vault: robustVault, vaultDir, key, request: deleteRequest });
  const deleted = await robustVault.readVault(path.join(vaultDir, 'zvault-0.json'), key);
  assert.deepStrictEqual(deleted.groups[0].records.map((item) => item.name), ['Bitcoin Main']);
}

async function testSharedStarterTimestampRecordOwnership(root, key) {
  const { vaultDir, profile } = await makeVaultFixture(path.join(root, 'shared-starter-record-time'), key);
  const sharedCreated = '2026-09-07T12:00:00.000Z';
  profile.groups[0].records = [
    { name: 'Ethereum', symbol: 'ETH', created: sharedCreated, publicAddress: '' },
    { name: 'Bitcoin', symbol: 'BTC', created: sharedCreated, publicAddress: '' }
  ];
  await saveEncrypted(path.join(vaultDir, 'zvault-0.json'), profile, key);

  const originalBitcoin = JSON.parse(JSON.stringify(profile.groups[0].records[1]));
  const rendererState = JSON.parse(JSON.stringify(profile));
  rendererState.groupSelected = 0;
  rendererState.recordSelected = 0;
  rendererState.groups[0].records = [
    Object.assign({}, originalBitcoin, { publicAddress: 'bc1q-selected-bitcoin' }),
    JSON.parse(JSON.stringify(profile.groups[0].records[0]))
  ];

  const request = dataWrite.legacyRecordRequest({
    action: 'modify',
    vaultData: rendererState,
    originalRecord: originalBitcoin
  });
  const result = await dataWrite.mutateRecord({ vault: robustVault, vaultDir, key, request });
  assert.strictEqual(result.groupSelected, 0);

  const persisted = await robustVault.readVault(path.join(vaultDir, 'zvault-0.json'), key);
  const records = persisted.groups[0].records;
  assert.strictEqual(records.length, 2, 'Editing a seeded Asset must not create or transform a sibling into a duplicate Asset.');
  assert.strictEqual(records.filter((item) => item.name === 'Bitcoin').length, 1, 'Bitcoin must remain exactly one Asset after editing its public address.');
  assert.strictEqual(records.filter((item) => item.name === 'Ethereum').length, 1, 'Ethereum must remain intact when Bitcoin is edited.');
  assert.strictEqual(records.find((item) => item.name === 'Bitcoin').publicAddress, 'bc1q-selected-bitcoin');
  assert.strictEqual(records.find((item) => item.name === 'Ethereum').publicAddress, '');

  const staleRendererState = dataWrite.withViewState(persisted, 0, 0);
  const staleOriginal = Object.assign({}, originalBitcoin, { publicAddress: 'not-current' });
  staleRendererState.groups[0].records[0] = Object.assign({}, staleRendererState.groups[0].records[0], { publicAddress: 'should-not-save' });
  await assert.rejects(
    dataWrite.mutateRecord({
      vault: robustVault,
      vaultDir,
      key,
      request: dataWrite.legacyRecordRequest({ action: 'modify', vaultData: staleRendererState, originalRecord: staleOriginal })
    }),
    /asset changed or no longer exists/i,
    'A stale Asset edit must fail closed instead of falling back to a potentially wrong sibling index.'
  );
}

async function testSettingsOwnership(root) {
  const settingsDir = path.join(root, 'settings');
  await fs.promises.mkdir(settingsDir, { recursive: true });
  const initial = (await settingsManager.saveSettings(settingsDir, {
    appearance: 'system',
    privacyMode: true,
    shitCoinMode: false,
    failAttemptCount: 4,
    numFailAttempts: 5,
    lockOutCount: 2,
    numLockoutRetries: 5,
    lockLogin: true,
    lockLoginTime: Date.now(),
    minutesToWaitBetweenLockout: 15,
    scrubContentAfterRetries: true,
    lastBackupAt: new Date().toISOString(),
    lastVerifiedBackupAt: new Date().toISOString(),
    backupReminderDays: 180
  })).settings;

  const rendererSnapshot = Object.assign({}, initial, {
    appearance: 'dark',
    backupReminderDays: 90,
    failAttemptCount: 0,
    lockOutCount: 0,
    lockLogin: false,
    lockLoginTime: 0,
    scrubContentAfterRetries: false,
    lastBackupAt: null,
    lastVerifiedBackupAt: null
  });
  const saved = (await settingsManager.saveUserSettings(settingsDir, rendererSnapshot)).settings;
  assert.strictEqual(saved.appearance, 'dark');
  assert.strictEqual(saved.backupReminderDays, 90);
  assert.strictEqual(saved.failAttemptCount, initial.failAttemptCount, 'Generic settings must not rewrite failed-login accounting.');
  assert.strictEqual(saved.lockOutCount, initial.lockOutCount, 'Generic settings must not rewrite lockout accounting.');
  assert.strictEqual(saved.lockLogin, initial.lockLogin, 'Generic settings must not clear security-owned lock state.');
  assert.strictEqual(saved.lockLoginTime, initial.lockLoginTime, 'Generic settings must not rewrite lock timing.');
  assert.strictEqual(saved.scrubContentAfterRetries, true, 'Self-Destruct remains owned by its confirmed security flow.');
  assert.strictEqual(saved.lastBackupAt, initial.lastBackupAt, 'Generic settings must not fabricate or erase backup evidence.');
  assert.strictEqual(saved.lastVerifiedBackupAt, initial.lastVerifiedBackupAt, 'Generic settings must not fabricate or erase verification evidence.');

  await assert.rejects(
    settingsManager.saveUserSettings(settingsDir, { appearance: 'light', totallyUnknownSetting: true }),
    /Unsupported SafeLedger setting/,
    'Unknown settings should be rejected instead of silently becoming persisted configuration.'
  );
}

(async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'safeledger-data-ownership-'));
  const key = crypto.randomBytes(32);
  try {
    await testProfileOwnership(root, key);
    await testGroupOwnership(root, key);
    await testRecordOwnership(root, key);
    await testSharedStarterTimestampRecordOwnership(root, key);
    await testSettingsOwnership(root);
    console.log('PASS SafeLedger data ownership: main-owned profile/vault-item/asset/settings mutations preserve unrelated data, exact selected-Asset targeting, and reject renderer authority escalation.');
  } finally {
    key.fill(0);
    await fs.promises.rm(root, { recursive: true, force: true });
  }
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
