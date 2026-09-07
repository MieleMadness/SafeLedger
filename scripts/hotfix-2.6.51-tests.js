'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const main = read('src/main/main.js');
const service = read('src/main/data-write-service.js');
const settingsSource = read('src/main/installManager/installManager/settingsManager.js');
const settingsModule = require(path.join(root, 'src/main/installManager/installManager/settingsManager.js'));
const gate2650 = read('scripts/hotfix-2.6.50-tests.js');

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 51,
  'Phase 3 Data Ownership must remain active on SafeLedger 2.6.51 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/data-ownership-tests.js'),
  'Behavioral data-ownership tests must run in the full regression suite.');
assert(read('package.json').includes('node scripts/hotfix-2.6.51-tests.js'),
  '2.6.51 source-contract coverage must stay in the full regression suite.');

assert(main.includes("const dataWriteService = require('./data-write-service');"));
assert(main.includes('await dataWriteService.modifyProfile({ vault, vaultDir, key, profile: params.vault })'));
assert(main.includes('await dataWriteService.deleteProfile({ vault, vaultDir, key, fileName: params.fileName })'));
assert(main.includes('request = dataWriteService.legacyGroupRequest(params);') && main.includes('await dataWriteService.mutateGroup({ vault, vaultDir, key, request })'));
assert(main.includes('request = dataWriteService.legacyRecordRequest(params);') && main.includes('await dataWriteService.mutateRecord({ vault, vaultDir, key, request })'));
assert(!main.includes('data = validateVaultData(params.vaultData)'));
assert(!main.includes("vault.saveVault(path.join(vaultDir, data.file), JSON.stringify(data), key)"));
assert(!main.includes('validateVaultList(params.vaultList)'));

assert(service.includes('const data = await readAuthoritativeVault(vault, vaultDir, request.file, key);'));
assert(service.includes('delete clean.groupSelected;') && service.includes('delete clean.recordSelected;'));
assert(service.includes('delete clean.vaultSelected;'));
assert(service.includes("const updated = Object.assign({}, existing, normalizeGroupPatch(request.group)"));
assert(service.includes("const updated = Object.assign({}, existing, patch, { modified: new Date().toISOString() })"));
assert(service.includes('findSingleDeletionIndex(data.groups, request.submittedGroups)'));
assert(service.includes('findSingleDeletionIndex(group.records, request.submittedRecords)'));
assert(!service.includes('patch.records ='));

assert(settingsSource.includes('const USER_EDITABLE_KEYS = Object.freeze(['));
assert(settingsSource.includes('exports.saveUserSettings = async (dir, request) =>'));
assert(main.includes('settingsManager.saveUserSettings(settingsDir, params.newSettings)'));
const allowed = new Set(settingsModule.USER_EDITABLE_KEYS);
for (const expected of ['appearance','privacyMode','shitCoinMode','numFailAttempts','numLockoutRetries','minutesToWaitBetweenLockout','backupReminderDays']) assert(allowed.has(expected));
for (const protectedField of ['failAttemptCount', 'lockOutCount', 'lockLogin', 'lockLoginTime', 'scrubContentAfterRetries', 'lastBackupAt', 'lastVerifiedBackupAt', 'lastVerifiedBackupCreatedAt']) assert(!allowed.has(protectedField));
assert(gate2650.includes('parts[2] >= 50'));

for (const relative of [
  'src/main/main.js',
  'src/main/data-write-service.js',
  'src/main/installManager/installManager/settingsManager.js',
  'scripts/data-ownership-tests.js',
  'scripts/hotfix-2.6.51-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} keeps Phase 3 authoritative main-process mutations, non-persisted UI selection state, and protected settings ownership active.`);
