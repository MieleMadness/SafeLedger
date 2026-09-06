'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const securityMain = read('src/main/security-main.js');
const securityUi = read('src/main/security-enhancements.js');
const preload = read('src/main/preload.js');
const main = read('src/main/main.js');
const profileTransaction = read('src/main/profile-transaction.js');
const gate2649 = read('scripts/hotfix-2.6.49-tests.js');
const parts = String(pkg.version || '').split('.').map(Number);

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 50,
  'Phase 2 Recovery Confidence coverage must stay active on SafeLedger 2.6.50 and later patches.');
assert(read('package.json').includes('node scripts/recovery-confidence-tests.js'),
  'Behavioral Recovery Confidence tests must run in the full regression suite.');
assert(read('package.json').includes('node scripts/hotfix-2.6.50-tests.js'),
  '2.6.50 source-contract coverage must stay in the full regression suite.');

assert(securityMain.includes('async function verifyBackupPayloadWithPassword(payload, password, currentDataKey = null)'),
  'Backup verification must have an independent password-based recovery path.');
assert(securityMain.includes('await keyEnvelope.unlockEnvelope(suppliedPassword, envelope)'),
  'Independent verification must derive the data key from the backup key envelope.');
assert(securityMain.includes("recoveryVerified: true") && securityMain.includes("verificationMode: 'backup-password'"),
  'Successful v3 verification must explicitly report independent recovery confidence.');
assert(securityMain.includes('The live SafeLedger failed-login counter was not changed.'),
  'A backup password failure must be clearly separated from live login lockout accounting.');
assert(securityMain.includes("ipc.handle('security-verify-backup', async (event, password)"),
  'The trusted backup verification IPC boundary must receive the backup password.');
assert(!securityMain.includes('verifyBackupPayload(payload, getSessionKey(cryptoSession))'),
  'The public Verify Backup path must not fall back to the old current-session-only proof for v3 backups.');

assert(securityMain.includes('async function verifyStagedPayload(stagingDir, payload, io = fs.promises)'),
  'Restore must re-read staged files before changing current data.');
assert(securityMain.includes('await verifyStagedPayload(stagingDir, validated, io);'),
  'Restore staging verification must complete before the live folder swap.');
assert(securityMain.includes('async function commitStagedRestore(dataRoot, stagingDir, safetyDir, io = fs.promises)'),
  'Restore folder promotion and rollback must be isolated as a testable transaction.');
assert(securityMain.includes('The pre-restore safety copy remains at'),
  'A failed restore rollback must surface the retained safety-copy location instead of silently swallowing the failure.');

assert(main.includes("const profileTransaction = require('./profile-transaction');"),
  'Profile writes must use the Phase 2 transaction helper.');
assert(main.includes('await profileTransaction.recoverPending(vaultDir, key, vault.readVaultList);'),
  'Pending profile creation must be reconciled on the next successful unlock.');
assert(main.includes('const data = await profileTransaction.createProfile({'),
  'New profiles must create encrypted profile data before publishing the updated profile list.');
assert(profileTransaction.includes("const MARKER_FILE = '.profile-create.pending.json';"),
  'Interrupted profile creation must leave a minimal recovery journal.');
assert(profileTransaction.includes('instead of deleting potentially recoverable data'),
  'Ambiguous profile commits must favor retaining encrypted recoverable data over destructive cleanup.');

assert(securityUi.includes("input.type = 'password';") && securityUi.includes("dialog.showModal();"),
  'Backup recovery verification must collect the password through a masked modal control.');
assert(securityUi.includes("ipc.invoke('security-verify-backup', password)"),
  'The renderer must send the transient backup password only to the trusted verification handler.');
assert(preload.includes("verifyBackup: (password) => invoke('security-verify-backup', String(password || ''))"),
  'The sandbox preload API must support independent backup verification without exposing Node.js.');
assert(gate2649.includes('parts[2] >= 49'),
  '2.6.49 platform-candidate protections must remain active on later patches.');

console.log('PASS SafeLedger Phase 2 Recovery Confidence remains locked on 2.6.50 and later patches.');
