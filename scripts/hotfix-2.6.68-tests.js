'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);

assert.strictEqual(parts[0], 2);
assert.strictEqual(parts[1], 6);
assert(parts[2] >= 68, 'The 2.6.68 panel/tile spacing contract must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.68-tests.js'));

const layout = read('src/main/css/dashboard-layout.css');
const index = read('src/main/index.html');
const settings = read('src/main/settings-ui.js');
const priorGate = read('scripts/hotfix-2.6.66-tests.js');
const release = read('RELEASE-2.6.68.md');

assert(layout.includes('--sl-panel-padding: 14px;'));
assert(layout.includes('--sl-tile-padding: 12px;'));

for (const selector of [
  '.settings-section',
  '.vault-inventory-section',
  '.vault-recovery-section',
  '.recovery-readiness-card',
  '.recovery-drill-wizard-card'
]) {
  assert(layout.includes(selector), `${selector} must participate in the shared major-panel spacing contract.`);
}
assert(layout.includes('padding: var(--sl-panel-padding);'));

for (const selector of [
  '.appearance-option',
  '.dashboard-stat',
  '.security-scorecard',
  '.dashboard-maintenance-card'
]) {
  assert(layout.includes(selector), `${selector} must participate in the shared information-tile spacing contract.`);
}
assert(layout.includes('padding: var(--sl-tile-padding);'));

assert(layout.includes('.appearance-options {\n  margin-bottom: 0;'),
  'Appearance tile grid must not add a second bottom gutter inside the Settings panel.');
assert(layout.includes('.dashboard-stats > .dashboard-stat {\n  margin-bottom: 0;'),
  'Dashboard stat tiles must not carry the generic standalone-card bottom margin inside a grid.');
assert(layout.includes('.vault-inventory-section .dashboard-stats,\n.vault-recovery-section .dashboard-stats {\n  margin-bottom: 0;'));
assert(layout.includes('.settings-section > :last-child,'),
  'Major panels should let the panel padding own the final bottom gutter.');
assert(!layout.includes('!important'),
  'The spacing contract must be owned by normal cascade rather than force-overrides.');

assert(settings.includes("const section = makeSection('Appearance');"));
assert(settings.includes("const section = makeSection('Backup & Recovery');"));
assert(settings.includes("section.className = 'settings-section';"),
  'Appearance and Backup & Recovery must continue sharing the same Settings container component.');

const uiCurrentIndex = index.indexOf('./css/ui-current.css');
const layoutIndex = index.indexOf('./css/dashboard-layout.css');
assert(uiCurrentIndex >= 0 && layoutIndex > uiCurrentIndex,
  'The current spacing contract must load after the historical UI cascade.');

assert(priorGate.includes('--sl-panel-padding: 14px;'),
  'The 2.6.66 historical spacing gate must track the current shared 14px panel contract.');
assert(release.includes('Appearance'));
assert(release.includes('Vault Inventory'));
assert(release.includes('Recovery Health'));
assert(release.includes('14px'));
assert(release.includes('12px'));
assert(release.includes('root cause'));

console.log(`PASS SafeLedger ${pkg.version} uses one 14px major-panel rhythm and one 12px information-tile rhythm without stacked bottom gutters.`);
