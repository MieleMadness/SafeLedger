'use strict';
const assert = require('assert');
const dashboard = require('../src/main/dashboard-summary');

const result = dashboard.summarize([
  { profileName: 'Family', vaultData: { groups: [
    { name: 'Cold Wallet', recoveryLocation: 'Home safe', lastVerified: new Date().toISOString(), password: 'DO-NOT-RETURN', seedPhrase: 'DO-NOT-RETURN', records: [{ privateAddress: 'DO-NOT-RETURN' }] },
    { name: 'Travel Wallet', records: [] }
  ] } },
  { profileName: 'Damaged', vaultData: { groups: [] }, readError: true }
]);
assert.strictEqual(result.counts.profiles, 2);
assert.strictEqual(result.counts.wallets, 2);
assert.strictEqual(result.counts.assets, 1);
assert.strictEqual(result.counts.ready, 1);
assert.strictEqual(result.counts.incomplete, 1);
assert.strictEqual(result.profileReadErrors, 1);
const serialized = JSON.stringify(result);
for (const secret of ['DO-NOT-RETURN', 'seedPhrase', 'password', 'privateAddress', 'recoveryLocation']) assert(!serialized.includes(secret));
assert(result.needsAttention.some((item) => item.walletName === 'Travel Wallet'));
console.log('PASS dashboard summary returns only sanitized recovery status metadata and aggregate counts.');
