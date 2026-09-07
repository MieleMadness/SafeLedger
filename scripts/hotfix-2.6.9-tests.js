'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(versionParts[0] === 2 && versionParts[1] === 6 && versionParts[2] >= 9,
  'SafeLedger 2.6.9 regressions must remain active on 2.6.9 and later 2.6.x patches.');
assert(read('package.json').includes('node scripts/hotfix-2.6.9-tests.js'),
  '2.6.9 regression coverage must stay in the locked suite.');

const entry = read('src/main/renderer-entry.js');
const renderer = read('src/main/renderer.js');
const dashboard = read('src/main/dashboard-ui.js');
const detailActions = read('src/main/detail-actions.js');

assert.strictEqual(fs.existsSync(path.join(root, 'src/main/dashboard-action-state-ui.js')), false,
  'The retired Vault Overview action-state repair module must stay removed.');
assert(!entry.includes("require('./dashboard-action-state-ui.js')"),
  'Renderer entry must not restore the stale-action repair layer.');

assert(dashboard.includes("const detailActions = require('./detail-actions');"),
  'Vault Overview must own action-dock cleanup directly.');
assert(dashboard.includes('detailActions.clear();'),
  'Opening Vault Overview must clear the prior detail action dock before rendering.');
assert(dashboard.includes('async function showDashboard()'),
  'Vault Overview must have one direct show path.');
assert(dashboard.includes('async function showDashboard() { detailActions.clear(); const area = clearArea();'),
  'Dashboard action cleanup must remain direct and synchronous before any asynchronous dashboard work begins.');
assert(!dashboard.includes('MutationObserver'),
  'Dashboard action cleanup must not return to an observer-based repair layer.');

assert(detailActions.includes("dock.innerHTML = '';"),
  'Shared detail-action cleanup must remove stale Save/Cancel controls.');
assert(detailActions.includes("const DETAIL_MODE_CLASSES = ['wallet-coin-detail', 'wallet-coin-view', 'wallet-coin-edit'];"),
  'Shared detail-action ownership must define all view/edit mode classes in one place.');
assert(detailActions.includes('detail.classList.remove(...DETAIL_MODE_CLASSES);'),
  'Shared detail-action cleanup must remove every stale detail/view/edit mode.');
assert(/function\s+clear\s*\(\)\s*\{\s*clearDockOnly\(\);\s*setDetailMode\(''\);\s*\}/.test(detailActions),
  'Clearing detail actions must synchronously clear both the action dock and detail mode on every platform.');

assert(renderer.includes('function cancelAddProfile()'));
assert(renderer.includes('clearUtilitySelections();'));
assert(renderer.includes('dashboardUi.show();'),
  'Cancel Add Profile must navigate directly through the canonical Vault Overview owner.');
assert(!renderer.includes('dashboardButton.click();'),
  'Cancel Add Profile must not recreate the old synthetic-click navigation bandaid.');

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.9 Vault Overview stale-action fix through direct synchronous dashboard/detail-action ownership while allowing presentation-only motion timing.`);
