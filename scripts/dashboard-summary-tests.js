'use strict';
const assert = require('assert');
const dashboard = require('../src/main/dashboard-summary');

const now = Date.parse('2026-08-29T00:00:00.000Z');
const current = new Date(now - (30 * 24 * 60 * 60 * 1000)).toISOString();
const result = dashboard.summarize([
  { profileName: 'Family', vaultData: { groups: [
    {
      name: 'Cold Wallet',
      recoveryFormat: 'BIP39',
      recoveryLocation: 'Home safe',
      recoveryInstructions: 'Documented offline recovery process',
      lastVerified: current,
      lastRecoveryDrill: current,
      password: 'DO-NOT-RETURN',
      seedPhrase: 'DO-NOT-RETURN',
      records: [{ publicAddress: 'bc1q-public-value-do-not-return', privateAddress: 'DO-NOT-RETURN' }]
    },
    { name: 'Travel Wallet', records: [] }
  ] } },
  { profileName: 'Damaged', vaultData: { groups: [] }, readError: true }
], {
  now,
  backupHealth: {
    verified: { state: 'current', ageDays: 10, reminderDays: 30 },
    verifiedBackupCreatedAt: current,
    backupPath: 'DO-NOT-RETURN'
  }
});
assert.strictEqual(result.counts.profiles, 2);
assert.strictEqual(result.counts.wallets, 2);
assert.strictEqual(result.counts.assets, 1);
assert.strictEqual(result.counts.ready, 1);
assert.strictEqual(result.counts.incomplete, 1);
assert.strictEqual(result.profileReadErrors, 1);
assert.strictEqual(result.readinessPercent, 50);
const serialized = JSON.stringify(result);
for (const secret of ['DO-NOT-RETURN', 'seedPhrase', 'password', 'privateAddress', 'recoveryLocation', 'bc1q-public-value-do-not-return', 'backupPath']) {
  assert(!serialized.includes(secret), `dashboard summary leaked ${secret}`);
}
assert(result.needsAttention.some((item) => item.walletName === 'Travel Wallet'));
assert(result.recentlyVerified.some((item) => item.walletName === 'Cold Wallet'));
assert(result.recentlyVerified[0].checks.some((item) => item.id === 'verified-backup'));
console.log('PASS dashboard summary returns explainable, secret-free Recovery Health metadata and aggregate counts.');
