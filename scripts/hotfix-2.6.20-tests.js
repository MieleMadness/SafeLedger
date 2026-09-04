'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(versionParts[0] === 2 && versionParts[1] === 6 && versionParts[2] >= 20,
  'SafeLedger 2.6.20 sizing-gate modernization regressions must remain active on 2.6.20 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.20-tests.js'),
  '2.6.20 sizing-gate modernization coverage must stay in the locked suite.');

const uiGate = read('scripts/ui-regression-tests.js');
const windowSizingSource = read('src/main/window-sizing-main.js');
const foundation = read('src/main/css/foundation.css');

assert(!uiGate.includes("windowSizing.includes('const PREFERRED_WIDTH = 1400;')"),
  'General UI regression must not freeze the retired 1400px preferred width.');
assert(uiGate.includes("const sizingPolicy = require('../src/main/window-sizing-main.js');"),
  'General UI regression should validate the actual main-process sizing policy.');
assert(uiGate.includes('sizingPolicy.PREFERRED_WIDTH >= 1200'),
  'General UI regression should retain a desktop-width safety floor without overriding intentional layout tuning.');
assert(windowSizingSource.includes('const PREFERRED_WIDTH = 1283;'));

for (const variable of ['--sl-profile-column', '--sl-vault-column', '--sl-asset-column']) {
  assert(foundation.includes(`${variable}: minmax(0, 2fr);`),
    'Expanded Profile, Vault Item, and Asset columns must remain equal 2fr columns.');
}
assert(foundation.includes('--sl-detail-column: minmax(0, 5fr);'),
  'Expanded Detail must retain its 5fr share.');
assert(foundation.includes('--sl-compact-nav-column: 56px;'),
  'Collapsible navigation must retain its explicit compact-rail width.');
assert(foundation.includes('grid-template-columns: var(--sl-profile-column) var(--sl-vault-column) var(--sl-asset-column) var(--sl-detail-column);'),
  'The current grid must be driven by the collapsible column variables rather than the retired literal declaration.');

const layoutGate = read('scripts/hotfix-2.6.19-tests.js');
assert(layoutGate.includes('windowSizing.PREFERRED_WIDTH, 1283'),
  'The dedicated 2.6.19 regression must remain the exact owner of the 1283px layout decision.');
assert(layoutGate.includes("status: 'DELETED', statusMsg: 'Item Deleted'"),
  'The dedicated 2.6.19 regression must keep red deletion feedback protected.');

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.20 general sizing gate while validating the current equal expanded columns and 56px compact rails.`);
