'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const dashboardSummary = require('../src/main/dashboard-summary');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);

assert.strictEqual(parts[0], 2);
assert.strictEqual(parts[1], 6);
assert(parts[2] >= 70, 'The 2.6.70 dashboard health/maintenance action contract must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.70-tests.js'));

const dashboard = read('src/main/dashboard-ui.js');
const layout = read('src/main/css/dashboard-layout.css');
const historicalGate = read('scripts/hotfix-2.6.54-tests.js');

const inventoryRender = dashboard.indexOf('renderInventory(area, summary);');
const deviceRender = dashboard.indexOf('renderDeviceHealth(area, device);');
const recoveryRender = dashboard.indexOf('renderRecoveryHealth(area, summary);');
assert(inventoryRender >= 0 && deviceRender > inventoryRender && recoveryRender > deviceRender,
  'Device & Backup Health must render directly after Vault Inventory and before Recovery Health.');

assert(dashboard.includes("label: 'Open Storage'"), 'Portable storage should expose a full Open Storage button.');
assert(dashboard.includes("label: 'Create Backup'"));
assert(dashboard.includes("label: 'Verify Backup'"));

const healthRowStart = dashboard.indexOf('function appendHealthRow(');
const healthRowEnd = dashboard.indexOf('\nfunction quantity(', healthRowStart);
const healthRow = dashboard.slice(healthRowStart, healthRowEnd);
assert(healthRow.includes('end.appendChild(resolve);'));
assert(healthRow.includes('end.appendChild(badge);'));
assert(healthRow.indexOf('end.appendChild(resolve);') < healthRow.indexOf('end.appendChild(badge);'),
  'Device health action buttons must appear to the left of their status pill.');

assert(dashboard.includes("cards.className = 'dashboard-maintenance-cards';"));
assert(dashboard.includes("icon: 'fa-clock-o'"));
assert(dashboard.includes("icon: 'fa-life-ring'"));
assert(dashboard.includes("icon: 'fa-archive'"));
assert(!dashboard.includes('fa-wrench'), 'Maintenance cards must not introduce an undefined fallback icon.');
assert(dashboard.includes("title: 'Recovery verification'"));
assert(dashboard.includes("title: 'Recovery coverage'"));
assert(dashboard.includes("title: 'Backup activity'"));
assert(dashboard.includes("label: 'Resolve'"));
assert(!dashboard.includes("list.className = 'dashboard-maintenance-list';"),
  'Maintenance Snapshot should no longer use the old bullet-list presentation.');
assert(!dashboard.includes('function appendMaintenanceItem('),
  'The retired Maintenance Snapshot list renderer should not remain as a second UI path.');

assert(layout.includes('.dashboard-maintenance-card {'));
assert(layout.includes('grid-template-columns: 38px minmax(0, 1fr) auto;'));
assert(layout.includes('.dashboard-maintenance-end {'));
assert(layout.includes('box-shadow: var(--sl-shadow-soft);'));
assert(!layout.includes('!important'));

const now = Date.parse('2026-09-11T12:00:00.000Z');
const summary = dashboardSummary.summarize([{
  profileName: 'Primary',
  profileFile: 'zvault-0.json',
  vaultData: {
    groups: [{
      name: 'Cold Wallet',
      category: 'Hardware Wallet',
      seedPhrase: 'MUST-NOT-LEAK',
      records: []
    }]
  }
}], { now });

assert(summary.maintenanceTargets);
assert(summary.maintenanceTargets.verification, 'Missing/stale verification should produce a direct maintenance target.');
assert(summary.maintenanceTargets.coverage, 'Missing recovery coverage should produce a direct maintenance target.');
assert.strictEqual(summary.maintenanceTargets.verification.walletName, 'Cold Wallet');
assert.strictEqual(summary.maintenanceTargets.coverage.walletName, 'Cold Wallet');
const maintenanceJson = JSON.stringify(summary.maintenanceTargets);
assert(!maintenanceJson.includes('MUST-NOT-LEAK'));
for (const secretField of ['seedPhrase', 'password', 'privateAddress', 'recoveryLocation', 'publicAddress', 'backupPath']) {
  assert(!maintenanceJson.includes(secretField), `Maintenance navigation targets must not expose ${secretField}.`);
}

const staleAt200Days = new Date(now - (200 * 24 * 60 * 60 * 1000)).toISOString();
const staleButRecoveryReady = dashboardSummary.summarize([{
  profileName: 'Primary',
  profileFile: 'zvault-0.json',
  vaultData: {
    groups: [{
      name: 'Verified Wallet',
      category: 'Hardware Wallet',
      recoveryFormat: 'BIP39',
      recoveryLocation: 'Offline location',
      recoveryInstructions: 'Documented recovery process',
      lastVerified: staleAt200Days,
      lastRecoveryDrill: staleAt200Days,
      records: []
    }]
  }
}], { now });
assert.strictEqual(staleButRecoveryReady.stale.count, 1,
  'Maintenance Snapshot uses the 180-day verification freshness threshold.');
assert(staleButRecoveryReady.maintenanceTargets.verification,
  'A Vault Item older than the 180-day maintenance threshold must still receive a Resolve target even when Recovery Health uses a longer scoring threshold.');
assert.strictEqual(staleButRecoveryReady.maintenanceTargets.verification.walletName, 'Verified Wallet');

assert(historicalGate.includes("cards.className = 'dashboard-maintenance-cards';"),
  'The historical Vault Overview gate must track the current actionable maintenance-card design.');

for (const relative of [
  'src/main/dashboard-ui.js',
  'src/main/dashboard-summary.js',
  'scripts/hotfix-2.6.54-tests.js',
  'scripts/hotfix-2.6.70-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} places Device & Backup Health under Vault Inventory, keeps health actions left of status pills, and makes Maintenance Snapshot directly actionable.`);
