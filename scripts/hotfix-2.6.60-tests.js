'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const simulator = require('../src/main/recovery-simulator');
const commandCenter = require('../src/main/recovery-command-center');
const dashboardSummary = require('../src/main/dashboard-summary');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map(Number);
assert.strictEqual(versionParts[0], 2);
assert.strictEqual(versionParts[1], 6);
assert(versionParts[2] >= 60, 'The 2.6.60 hierarchy/resolution contract must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.60-tests.js'));

const emptyFacts = {
  vaultItemCount: 1,
  methodCoverageCount: 0,
  locationCoverageCount: 0,
  instructionCoverageCount: 0,
  beneficiaryCoverageCount: 0,
  separateLocationCoverageCount: 0,
  exchangeCount: 0,
  exchangePlanCoverageCount: 0
};
const noBackup = simulator.simulate('safeledger-device-lost', emptyFacts, {
  backup: { state: 'never' }, verified: { state: 'never' }
});
assert.strictEqual(noBackup.score, 0, 'No backup work must earn 0%, not a synthetic baseline score.');
assert.deepStrictEqual(noBackup.actions.map((item) => item.id), ['create-backup']);

const staleBackup = simulator.simulate('safeledger-device-lost', emptyFacts, {
  backup: { state: 'due' }, verified: { state: 'never' }
});
assert.strictEqual(staleBackup.score, 35);
assert.deepStrictEqual(staleBackup.actions.map((item) => item.id), ['create-backup']);

const currentUnverified = simulator.simulate('safeledger-device-lost', emptyFacts, {
  backup: { state: 'current' }, verified: { state: 'never' }
});
assert.strictEqual(currentUnverified.score, 65);
assert.deepStrictEqual(currentUnverified.actions.map((item) => item.id), ['verify-backup']);

const verified = simulator.simulate('safeledger-device-lost', emptyFacts, {
  backup: { state: 'current' }, verified: { state: 'current' }
});
assert.strictEqual(verified.score, 100);
assert.deepStrictEqual(verified.actions, []);

const entries = [{
  profileName: 'Primary',
  profileFile: 'zvault-0.json',
  vaultData: {
    groups: [
      {
        name: 'Ledger',
        category: 'Hardware Wallet',
        seedPhrase: 'must-never-leak-this-seed',
        recoveryLocation: '',
        backupLocation: '',
        recoveryInstructions: '',
        beneficiary: '',
        records: [{ name: 'Bitcoin', publicAddress: 'must-never-leak-this-address' }]
      },
      {
        name: 'Coinbase',
        category: 'Exchange Account',
        password: 'must-never-leak-this-password',
        recoveryLink: '',
        recoveryInstructions: '',
        records: []
      }
    ]
  }
}];

const targets = commandCenter.buildResolutionTargets(entries);
for (const id of ['device-lost', 'location-unavailable', 'family-access', 'exchange-lockout']) {
  assert(targets[id], `${id} should point to the next Vault Item that can resolve the scenario gap.`);
  assert(Number.isInteger(targets[id].profileIndex));
  assert(Number.isInteger(targets[id].walletIndex));
}
const targetJson = JSON.stringify(targets);
for (const secret of ['must-never-leak-this-seed', 'must-never-leak-this-address', 'must-never-leak-this-password']) {
  assert(!targetJson.includes(secret), 'Resolution navigation targets must remain metadata-only.');
}
for (const sensitiveFieldName of ['seedPhrase', 'password', 'privateAddress', 'recoveryLocation', 'publicAddress', 'backupPath']) {
  assert(!targetJson.includes(sensitiveFieldName), `Resolution targets must not expose sensitive field names: ${sensitiveFieldName}`);
}

const summary = dashboardSummary.summarize(entries, {
  backupHealth: { backup: { state: 'never' }, verified: { state: 'never' } }
});
assert(summary.resolutionTargets && summary.resolutionTargets['device-lost']);
const summaryJson = JSON.stringify(summary.resolutionTargets);
assert(!summaryJson.includes('must-never-leak-this-seed'));
assert(!summaryJson.includes('must-never-leak-this-address'));
assert(!summaryJson.includes('must-never-leak-this-password'));

for (const id of ['device-lost', 'location-unavailable', 'family-access']) {
  const result = simulator.simulate(id, summary.simulationFacts, null);
  assert(result.actions.some((item) => item.id === 'open-resolution-target'), `${id} should expose a contextual resolution action while gaps remain.`);
}
const exchangeResult = simulator.simulate('exchange-lockout', summary.simulationFacts, null);
assert(exchangeResult.actions.some((item) => item.id === 'open-resolution-target'));

const dashboardUi = read('src/main/dashboard-ui.js');
const recoveryCss = read('src/main/css/recovery-refinement.css');
const dividerCss = read('src/main/css/workspace-dividers.css');
const index = read('src/main/index.html');
const priorGate = read('scripts/hotfix-2.6.59-tests.js');
const release = read('RELEASE-2.6.60.md');

assert(dashboardUi.includes("const securityEnhancements = require('./security-enhancements');"));
assert(dashboardUi.includes('dashboard-resolve-button'));
assert(dashboardUi.includes('summary.resolutionTargets'));
assert(dashboardUi.includes("runBackupResolution('create-backup')"));
assert(dashboardUi.includes("runBackupResolution('verify-backup')"));
assert(dashboardUi.includes("makeResolveButton('Resolve', () => openWallet(item)"));
assert(recoveryCss.includes('.dashboard-list-end'));
assert(recoveryCss.includes('.recovery-resolution-actions'));
assert(dividerCss.includes('.app-search-row > .app-cell:nth-child(-n+3)'));
assert(dividerCss.includes('.app-main-row > .app-cell:nth-child(-n+3)'));
assert(dividerCss.includes('.app-button-row > .app-cell:nth-child(-n+3)'));
assert(dividerCss.includes('.content-middle .nav > li + li'));
assert(index.includes('./css/workspace-dividers.css'));
assert(index.indexOf('./css/workspace-dividers.css') < index.indexOf('./css/appearance-palettes.css'), 'Appearance palettes must remain the final color layer.');
assert(priorGate.includes('versionParts[2] >= 59'));
assert(release.includes('hardcoded 20%'));
assert(release.includes('Resolve'));

execFileSync(process.execPath, [path.join(root, 'scripts/recovery-command-center-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'scripts/hotfix-2.6.59-tests.js',
  'scripts/hotfix-2.6.60-tests.js',
  'src/main/recovery-command-center.js',
  'src/main/recovery-simulator.js',
  'src/main/dashboard-summary.js',
  'src/main/dashboard-ui.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log('PASS SafeLedger 2.6.60 adds workspace dividers, evidence-based device-failure scoring, and contextual resolution actions without exposing recovery secrets.');
