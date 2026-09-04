'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '2.6.29', 'This workflow candidate must report SafeLedger 2.6.29.');
assert(read('package.json').includes('node scripts/hotfix-2.6.29-tests.js'),
  '2.6.29 layout-gate correction must stay in the locked regression suite.');

const gate2620 = read('scripts/hotfix-2.6.20-tests.js');
const gate2621 = read('scripts/hotfix-2.6.21-tests.js');
const gate2628 = read('scripts/hotfix-2.6.28-tests.js');
const foundation = read('src/main/css/foundation.css');

for (const [name, source] of [['2.6.20', gate2620], ['2.6.21', gate2621]]) {
  assert(!source.includes("foundation.includes('grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) minmax(0, 2fr) minmax(0, 5fr)')"),
    `${name} must not require the retired literal grid declaration.`);
  for (const variable of ['--sl-profile-column', '--sl-vault-column', '--sl-asset-column']) {
    assert(source.includes(`${variable}: minmax(0, 2fr);`),
      `${name} must protect the equal expanded ${variable} value.`);
  }
  assert(source.includes('--sl-detail-column: minmax(0, 5fr);'));
  assert(source.includes('--sl-compact-nav-column: 56px;'));
}

for (const variable of ['--sl-profile-column', '--sl-vault-column', '--sl-asset-column']) {
  assert(foundation.includes(`${variable}: minmax(0, 2fr);`));
}
assert(foundation.includes('--sl-detail-column: minmax(0, 5fr);'));
assert(foundation.includes('--sl-compact-nav-column: 56px;'));
assert(foundation.includes('grid-template-columns: var(--sl-profile-column) var(--sl-vault-column) var(--sl-asset-column) var(--sl-detail-column);'));
assert(foundation.includes('[data-profile-collapsed="true"]'));
assert(foundation.includes('[data-vault-collapsed="true"]'));
assert(foundation.includes('[data-asset-collapsed="true"]'));
assert(gate2628.includes('parts[2] >= 28'),
  'The 2.6.28 canonical-rendering correction must remain active on later workflow candidates.');

console.log('PASS SafeLedger 2.6.29 modernizes historical layout gates for the equal expanded columns and 56px compact navigation rails.');
