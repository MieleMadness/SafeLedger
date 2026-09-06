'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const profileSetup = require('../src/main/profile-setup');
const presets = require('../src/main/vault-item-asset-presets');
const serviceCatalog = require('../src/main/service-catalog');

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 42,
  'SafeLedger 2.6.42 locked-state, QR theme, and Chain Games refinements must remain active on later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.42-tests.js'),
  '2.6.42 locked-state, QR theme, and Chain Games coverage must stay in the locked regression suite.');

const preload = read('src/main/preload.js');
const topActions = read('src/main/top-action-lock-ui.js');
const entry = read('src/main/renderer-entry.js');
const index = read('src/main/index.html');
const qrTheme = read('src/main/css/qr-theme.css');
const profileSetupSource = read('src/main/profile-setup.js');
const walletIcons = read('src/main/wallet-icons.js');
const priorGate = read('scripts/hotfix-2.6.41-tests.js');
const remoteLockedMessage = 'SafeLedger is locked. Please log in again.';
const utilityLockedMessage = 'Please login.';

assert(preload.includes(`const LOCKED_MESSAGE = '${remoteLockedMessage}';`),
  'Preload must keep the normalized remote-call locked message.');
assert(preload.includes('if (message.includes(LOCKED_MESSAGE)) throw new Error(LOCKED_MESSAGE);'),
  'Electron remote-invoke prefixes must be normalized before reaching renderer UI.');
assert(preload.includes("getDashboardSummary: () => invoke('dashboard-summary')") &&
  preload.includes("getActivityHistory: (limit) => invoke('activity-history', limit)"),
  'Top utility reads must use the normalized invoke helper.');

assert(entry.includes("require('./top-action-lock-ui.js');"),
  'The locked top-action guard must be bundled into the renderer.');
for (const id of ['dashboardButton', 'activityButton', 'settingsButton', 'globalSearchButton']) {
  assert(topActions.includes(`guardButton('${id}'`), `Locked guard must cover ${id}.`);
}
assert(topActions.includes('event.stopImmediatePropagation();'),
  'Locked utility clicks must stop before privileged existing handlers run.');
assert(topActions.includes("window.safeLedgerApi.initSystem();"),
  'Home must reuse SafeLedger init-system to restore the canonical login screen while locked.');
assert(topActions.includes("const status = require('./status');") &&
  topActions.includes(`const LOCKED_MESSAGE = '${utilityLockedMessage}';`) &&
  topActions.includes("status.showStatus({ status: 'ERROR', statusMsg: LOCKED_MESSAGE });"),
  'Locked non-Home utilities must keep the current page and use the top-right Please login notice.');
assert(!topActions.includes("area.innerHTML = ''") && !topActions.includes('warning.textContent = LOCKED_MESSAGE;'),
  'Locked non-Home utilities must not replace the detail panel with an error page.');

assert(index.includes('<link href="./css/qr-theme.css" rel="stylesheet">'),
  'The QR theme refinement must be loaded after the main theme styles.');
assert(qrTheme.includes('html[data-theme="dark"] .qr-area') &&
  qrTheme.includes('background: #0c1728 !important;'),
  'Dark mode must use a dark QR container instead of the forced white panel.');
assert(qrTheme.includes('filter: brightness(.84) contrast(1.06);'),
  'The on-screen QR quiet zone must be softened in dark mode without changing encoded data.');
assert(!qrTheme.includes('@media print'),
  'Screen-only QR dimming must not alter printed Recovery Binder QR codes.');

assert(profileSetup.STANDARD_STARTER_NAMES.includes('Chain Games'),
  'Chain Games must be part of the deliberate standard starter selection.');
assert(profileSetup.standardNames().includes('Chain Games'),
  'Chain Games must be preselected for new standard Profile setup.');
assert(profileSetupSource.includes('vaultItemAssetPresets.buildRecords(service.name, vaultItemAssetPresets.WEB3_CATEGORY, today)'),
  'Chain Games starter creation must reuse the canonical reviewed Web3 asset preset.');
assert(walletIcons.includes('serviceCatalog.createIcon(name, brandClass)'),
  'The starter picker must use SafeLedger local Chain Games artwork rather than a missing/generic brand icon.');
assert(serviceCatalog.find('Chain Games'), 'SafeLedger must retain local Chain Games service artwork.');

const chainGroups = profileSetup.buildGroups('2026-09-06T00:00:00.000Z', ['Chain Games']);
assert.strictEqual(chainGroups.length, 1, 'Selecting Chain Games must create one Vault Item.');
assert.strictEqual(chainGroups[0].name, 'Chain Games');
assert.strictEqual(chainGroups[0].category, presets.WEB3_CATEGORY,
  'Chain Games must be created as a Web3 Account rather than a generic wallet.');
assert.strictEqual(chainGroups[0].records.length, 3,
  'The default Chain Games Vault Item must contain Ethereum, Polygon, and Supernet CHAIN entries.');
const networks = chainGroups[0].records.map((record) => {
  const field = (record.customFields || []).find((item) => item.label === 'Network');
  return field && field.value;
});
assert.deepStrictEqual(networks.sort(), ['Chain Games Supernet', 'Ethereum', 'Polygon'].sort());

assert(priorGate.includes('parts[2] >= 41'),
  'The approved 2.6.41 startup-animation gate must remain active on later candidates.');

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.42 dark-mode QR, normalized locked utility behavior, Home-to-Login guard, and Chain Games starter refinements active.`);
