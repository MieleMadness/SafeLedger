'use strict';

const assert = require('assert');
const commandCenter = require('../src/main/recovery-command-center.js');
const simulator = require('../src/main/recovery-simulator.js');
const duplicateAsset = require('../src/main/duplicate-asset.js');
const dashboardSummary = require('../src/main/dashboard-summary.js');

const now = Date.parse('2026-09-07T16:00:00.000Z');
const entries = [{
  profileName: 'Primary',
  profileFile: 'zvault-0.json',
  profile: { name: 'Primary', created: '2026-08-01T12:00:00.000Z', modified: '2026-09-01T12:00:00.000Z' },
  vaultData: {
    groups: [{
      name: 'Ledger',
      category: 'Hardware Wallet',
      created: '2026-08-02T12:00:00.000Z',
      modified: '2026-09-02T12:00:00.000Z',
      recoveryFormat: 'BIP39',
      recoveryLocation: 'Home safe',
      backupLocation: 'Bank box',
      recoveryInstructions: 'Use the documented recovery process.',
      beneficiary: 'Family',
      deviceLocation: 'Desk safe',
      lastVerified: '2026-09-03T12:00:00.000Z',
      lastRecoveryDrill: '2026-09-04T12:00:00.000Z',
      seedPhrase: 'timeline-must-never-show-this-secret',
      records: [{
        name: 'Bitcoin', symbol: 'BTC', publicAddress: 'bc1q-timeline-private-metadata',
        created: '2026-08-03T12:00:00.000Z', modified: '2026-09-05T12:00:00.000Z'
      }]
    }]
  }
}];

const timeline = commandCenter.buildSecurityTimeline(entries, 20);
assert(timeline.length >= 6, 'Security Timeline should derive meaningful milestones from existing local timestamps.');
assert.strictEqual(timeline[0].title, 'Asset updated');
const timelineJson = JSON.stringify(timeline);
assert(!timelineJson.includes('timeline-must-never-show-this-secret'), 'Security Timeline must never include seed/private recovery values.');
assert(!timelineJson.includes('bc1q-timeline-private-metadata'), 'Security Timeline must not copy public-address values into milestone text.');
assert(timeline.some((item) => item.title === 'Recovery Validation completed'));
assert(timeline.some((item) => item.title === 'Recovery information verified'));

const facts = commandCenter.buildSimulationFacts(entries);
assert.deepStrictEqual(facts, {
  profileCount: 1,
  vaultItemCount: 1,
  assetCount: 1,
  addressDocumentedCount: 1,
  recoveryMethodCount: 1,
  recoveryLocationCount: 1,
  recoveryInstructionCount: 1,
  beneficiaryCount: 1,
  separateLocationCount: 1,
  deviceLocationCount: 1,
  exchangeCount: 0,
  exchangeRecoveryPlanCount: 0,
  walletCount: 1
});
const factsJson = JSON.stringify(facts);
for (const sensitiveFieldName of ['seedPhrase', 'password', 'privateAddress', 'recoveryLocation', 'publicAddress', 'backupPath']) {
  assert(!factsJson.includes(`\"${sensitiveFieldName}\"`), `Simulation facts must not expose a raw sensitive-field key: ${sensitiveFieldName}`);
}

for (const scenario of simulator.SCENARIOS) {
  const result = simulator.simulate(scenario.id, facts, {
    backup: { state: 'current' },
    verified: { state: 'current' }
  });
  assert(['Ready', 'Needs Review', 'Incomplete'].includes(result.status));
  assert(Number.isInteger(result.score) && result.score >= 0 && result.score <= 100);
  assert(result.headline);
}
assert.strictEqual(simulator.simulate('device-lost', facts).status, 'Ready');
assert.strictEqual(simulator.simulate('family-access', facts).status, 'Ready');
assert.strictEqual(simulator.simulate('safeledger-device-lost', facts, { backup: { state: 'current' }, verified: { state: 'current' } }).score, 100);
assert.strictEqual(simulator.simulate('safeledger-device-lost', facts, { backup: { state: 'current' }, verified: { state: 'due' } }).status, 'Needs Review');

const btcA = { name: 'Bitcoin', symbol: 'BTC', customFields: [{ label: 'Network', type: 'text', value: 'Bitcoin' }] };
const btcB = { name: 'Bitcoin', symbol: 'BTC', publicAddress: 'bc1q-another', customFields: [{ label: 'Network', type: 'text', value: 'Bitcoin' }] };
assert(duplicateAsset.sameIdentity(btcA, btcB), 'Public addresses and notes must not change Asset identity.');
assert(duplicateAsset.warning([btcA], btcB, -1), 'Creating the same BTC identity should produce a warning.');

const usdcEth = { name: 'USD Coin', symbol: 'USDC', customFields: [{ label: 'Network', type: 'text', value: 'Ethereum' }, { label: 'Contract address', type: 'text', value: '0xeth' }] };
const usdcPolygon = { name: 'USD Coin', symbol: 'USDC', customFields: [{ label: 'Network', type: 'text', value: 'Polygon' }, { label: 'Contract address', type: 'text', value: '0xpolygon' }] };
assert(!duplicateAsset.sameIdentity(usdcEth, usdcPolygon), 'Same ticker on different networks/contracts must remain a legitimate distinct Asset.');
assert.strictEqual(duplicateAsset.warning([usdcEth], usdcPolygon, -1), null);
assert.strictEqual(duplicateAsset.warning([btcA], btcB, 0), null, 'Editing the selected Asset must exclude itself from duplicate detection.');

const summary = dashboardSummary.summarize(entries, {
  now,
  backupHealth: { backup: { state: 'current' }, verified: { state: 'current' } }
});
assert.strictEqual(summary.counts.vaultItems, 1);
assert.strictEqual(summary.scorecards.length, 1);
assert.strictEqual(summary.scorecards[0].walletName, 'Ledger');
assert(Number.isInteger(summary.readinessPercent));
assert(Array.isArray(summary.securityTimeline) && summary.securityTimeline.length > 0);
assert.strictEqual(summary.simulationFacts.vaultItemCount, 1);
const summaryJson = JSON.stringify(summary);
for (const secret of ['timeline-must-never-show-this-secret', 'bc1q-timeline-private-metadata']) {
  assert(!summaryJson.includes(secret), 'Dashboard summary must remain aggregate/metadata-only.');
}

console.log('PASS SafeLedger Recovery Command Center derives redacted timeline facts, explainable scenario results, scorecards, and network-aware duplicate identities locally.');
