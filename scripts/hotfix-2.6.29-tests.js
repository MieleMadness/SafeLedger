'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 29,
  'SafeLedger 2.6.29 layout-gate correction must remain active on 2.6.29 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.29-tests.js'),
  '2.6.29 layout-gate correction must stay in the locked regression suite.');

const packageSource = read('package.json');
const gate2620 = read('scripts/hotfix-2.6.20-tests.js');
const gate2621 = read('scripts/hotfix-2.6.21-tests.js');
const gate2628 = read('scripts/hotfix-2.6.28-tests.js');
const foundation = read('src/main/css/foundation.css');

assert(packageSource.includes('node scripts/hotfix-2.6.20-tests.js') &&
  packageSource.includes('node scripts/hotfix-2.6.21-tests.js'),
  'The historical sizing/layout gates must remain in the locked suite.');
for (const [name, source] of [['2.6.20', gate2620], ['2.6.21', gate2621]]) {
  assert(!source.includes("foundation.includes('grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) minmax(0, 2fr) minmax(0, 5fr)')"),
    `${name} must not require the retired literal grid declaration.`);
}

for (const variable of ['--sl-profile-column', '--sl-vault-column', '--sl-asset-column']) {
  assert(foundation.includes(`${variable}: minmax(0, 2fr);`),
    `Current foundation must retain equal expanded ${variable} sizing.`);
}
assert(foundation.includes('--sl-detail-column: minmax(0, 5fr);'));
assert(foundation.includes('--sl-compact-nav-column: 98px;'));
assert(foundation.includes('grid-template-columns: var(--sl-profile-column) var(--sl-vault-column) var(--sl-asset-column) var(--sl-detail-column);'));
assert(foundation.includes('[data-profile-collapsed="true"]'));
assert(foundation.includes('[data-vault-collapsed="true"]'));
assert(foundation.includes('[data-asset-collapsed="true"]'));
assert(gate2628.includes('parts[2] >= 28'),
  'The 2.6.28 canonical-rendering correction must remain active on later workflow candidates.');

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.29 compact-rail layout regression modernization active with the current balanced compact width.`);
