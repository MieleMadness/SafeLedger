'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const main = read('src/main/main.js');
const service = read('src/main/data-write-service.js');
const settingsSource = read('src/main/installManager/installManager/settingsManager.js');
const settingsModule = require(path.join(root, 'src/main/installManager/installManager/settingsManager.js'));
const gate2650 = read('scripts/hotfix-2.6.50-tests.js');

assert.strictEqual(pkg.version, '2.6.51', 'Phase 3 Data Ownership must report SafeLedger 2.6.51.');
assert(read('package.json').includes('node scripts/data-ownership-tests.js'),
  'Behavioral data-ownership tests must run in the full regression suite.');
assert(read('package.json').includes('node scripts/hotfix-2.6.51-tests.js'),
  '2.6.51 source-contract coverage must stay in the full regression suite.');

assert(main.includes("const dataWriteService = require('./data-write-service');"),
  'Main process must own persistence through the shared data write service.');
assert(main.includes('await dataWriteService.modifyProfile({ vault, vaultDir, key, profile: params.vault })'),
  'Profile edits must re-read and mutate the authoritative profile list.');
assert(main.includes('await dataWriteService.deleteProfile({ vault, vaultDir, key, fileName: params.fileName })'),
  'Profile deletion must be derived from the authoritative profile list instead of a renderer-supplied replacement list.');
assert(main.includes('request = dataWriteService.legacyGroupRequest(params);') && main.includes('await dataWriteService.mutateGroup({ vault, vaultDir, key, request })'),
  'Vault-item writes must cross an extraction boundary and mutate authoritative encrypted data.');
assert(main.includes('request = dataWriteService.legacyRecordRequest(params);') && main.includes('await dataWriteService.mutateRecord({ vault, vaultDir, key, request })'),
  'Asset writes must cross an extraction boundary and mutate authoritative encrypted data.');
assert(!main.includes('data = validateVaultData(params.vaultData)'),
  'Renderer-supplied complete vault data must no longer be accepted as the object to persist.');
assert(!main.includes("vault.saveVault(path.join(vaultDir, data.file), JSON.stringify(data), key)"),
  'Group/asset handlers must not write the renderer vault object directly.');
assert(!main.includes('validateVaultList(params.vaultList)'),
  'Profile handlers must not treat the renderer profile list as authoritative persisted state.');

assert(service.includes('const data = await readAuthoritativeVault(vault, vaultDir, request.file, key);'),
  'Each vault-item/asset mutation must begin from the encrypted authoritative vault file.');
assert(service.includes('delete clean.groupSelected;') && service.includes('delete clean.recordSelected;'),
  'Temporary wallet/asset selections must stay out of encrypted persistence.');
assert(service.includes('delete clean.vaultSelected;'),
  'Temporary profile selection must stay out of encrypted profile-list persistence.');
assert(service.includes("const updated = Object.assign({}, existing, normalizeGroupPatch(request.group)"),
  'Vault-item edits must patch one authoritative entity instead of replacing the full vault.');
assert(service.includes("const updated = Object.assign({}, existing, patch, { modified: new Date().toISOString() })"),
  'Asset edits must patch one authoritative entity and use a main-owned modification time.');
assert(service.includes('findSingleDeletionIndex(data.groups, request.submittedGroups)'),
  'Compatibility delete requests must prove exactly one unchanged vault item was removed.');
assert(service.includes('findSingleDeletionIndex(group.records, request.submittedRecords)'),
  'Compatibility delete requests must prove exactly one unchanged asset was removed.');
assert(!service.includes('patch.records ='),
  'A vault-item edit must never gain authority to replace its asset collection.');

assert(settingsSource.includes('const USER_EDITABLE_KEYS = Object.freeze(['),
  'Settings must define an explicit user-editable allowlist.');
assert(settingsSource.includes('exports.saveUserSettings = async (dir, request) =>'),
  'Generic settings writes must load authoritative settings and apply only a user patch.');
assert(main.includes('settingsManager.saveUserSettings(settingsDir, params.newSettings)'),
  'The renderer-facing settings IPC path must use the user-settings boundary.');
const allowed = new Set(settingsModule.USER_EDITABLE_KEYS);
for (const expected of ['appearance','privacyMode','shitCoinMode','numFailAttempts','numLockoutRetries','minutesToWaitBetweenLockout','backupReminderDays']) {
  assert(allowed.has(expected), `${expected} should remain a supported user setting.`);
}
for (const protectedField of ['failAttemptCount', 'lockOutCount', 'lockLogin', 'lockLoginTime', 'scrubContentAfterRetries', 'lastBackupAt', 'lastVerifiedBackupAt', 'lastVerifiedBackupCreatedAt']) {
  assert(!allowed.has(protectedField), `${protectedField} must remain main/security-owned.`);
}
assert(gate2650.includes('parts[2] >= 50'),
  'Phase 2 Recovery Confidence must remain active on the Phase 3 candidate.');

for (const relative of [
  'src/main/main.js',
  'src/main/data-write-service.js',
  'src/main/installManager/installManager/settingsManager.js',
  'scripts/data-ownership-tests.js',
  'scripts/hotfix-2.6.51-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log('PASS SafeLedger 2.6.51 Data Ownership locks authoritative main-process mutations, non-persisted UI selection state, and protected settings ownership.');
