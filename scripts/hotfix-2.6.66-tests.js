'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);

assert.strictEqual(parts[0], 2);
assert.strictEqual(parts[1], 6);
assert(parts[2] >= 66, 'The 2.6.66 window-size and Vault Overview spacing/copy contract must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.66-tests.js'));

const dashboard = read('src/main/dashboard-ui.js');
const dashboardCss = read('src/main/css/dashboard-layout.css');
const index = read('src/main/index.html');
const windowSizingSource = read('src/main/window-sizing-main.js');
const historicalWindowGate = read('scripts/hotfix-2.6.54-tests.js');
const priorGate = read('scripts/hotfix-2.6.65-tests.js');
const release = read('RELEASE-2.6.66.md');
const windowSizing = require('../src/main/window-sizing-main.js');

assert.strictEqual(windowSizing.PREFERRED_WIDTH, 1283);
assert.strictEqual(windowSizing.PREFERRED_HEIGHT, 800);
assert.deepStrictEqual(windowSizing.preferredWindowSize({ width: 1600, height: 1200 }), { width: 1283, height: 800 });
assert(windowSizingSource.includes('const PREFERRED_HEIGHT = 800;'));
assert(!windowSizingSource.includes('const PREFERRED_HEIGHT = 850;'));
assert(historicalWindowGate.includes('assert.strictEqual(windowSizing.PREFERRED_HEIGHT, 800);'),
  'The older 2.6.54 gate must be updated when the preferred height changes intentionally.');
assert(!historicalWindowGate.includes('assert.strictEqual(windowSizing.PREFERRED_HEIGHT, 850);'));

const requestedAttentionCopy = 'Vault Items that are not fully recovery-ready appear here with their readiness score and most important gaps. Choose Resolve to open the Vault Item that needs work.';
assert(dashboard.includes(requestedAttentionCopy));
assert(dashboard.includes('if (actionable && showDate)'));
assert(dashboard.includes('Click a recently verified Vault Item below to open it.'));
assert(!dashboard.includes('Each item shows its readiness score and the most important recovery gaps. Choose Resolve to open the Vault Item that needs work.'),
  'Recovery Needs Attention must not render a second redundant helper paragraph.');

assert(dashboardCss.includes('.vault-inventory-section,\n.vault-recovery-section {\n  padding-bottom: 14px;'));
assert(dashboardCss.includes('.vault-inventory-section .dashboard-stats,\n.vault-recovery-section .dashboard-stats {\n  margin-bottom: 0;'));
assert(!dashboardCss.includes('!important'), 'Dashboard spacing should be owned by normal component cascade, not force-overridden.');
const currentCssIndex = index.indexOf('./css/ui-current.css');
const dashboardCssIndex = index.indexOf('./css/dashboard-layout.css');
assert(currentCssIndex >= 0 && dashboardCssIndex > currentCssIndex,
  'Dashboard component spacing must load after the historical consolidated UI cascade it replaces.');

assert(priorGate.includes('parts[2] >= 65'), 'The 2.6.65 Settings and legacy import gate must remain future-compatible.');
assert(release.includes('800px'));
assert(release.includes('14px'));
assert(release.includes(requestedAttentionCopy));
assert(release.includes('timestamps'));

for (const relative of [
  'src/main/dashboard-ui.js',
  'src/main/window-sizing-main.js',
  'scripts/hotfix-2.6.54-tests.js',
  'scripts/hotfix-2.6.66-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} uses the 800px preferred height, removes redundant Recovery Needs Attention copy, and matches dashboard block bottom spacing to the 14px side padding.`);
