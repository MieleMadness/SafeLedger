'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 31,
  'SafeLedger 2.6.31 meta-gate correction must remain active on 2.6.31 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.31-tests.js'),
  '2.6.31 meta-gate correction must stay in the locked regression suite.');

const gate2629 = read('scripts/hotfix-2.6.29-tests.js');
const gate2630 = read('scripts/hotfix-2.6.30-tests.js');
const foundation = read('src/main/css/foundation.css');

assert(!gate2629.includes('source.includes(`${variable}: minmax(0, 2fr);`)'),
  'The 2.6.29 meta-test must not require older tests to contain one exact implementation string.');
assert(gate2629.includes("packageSource.includes('node scripts/hotfix-2.6.20-tests.js')") &&
  gate2629.includes("packageSource.includes('node scripts/hotfix-2.6.21-tests.js')"),
  'The 2.6.29 gate must keep the historical sizing/layout tests locked into the suite.');

for (const variable of ['--sl-profile-column', '--sl-vault-column', '--sl-asset-column']) {
  assert(foundation.includes(`${variable}: minmax(0, 2fr);`));
}
assert(foundation.includes('--sl-detail-column: minmax(0, 5fr);'));
assert(foundation.includes('--sl-compact-nav-column: 104px;'));
assert(foundation.includes('grid-template-columns: var(--sl-profile-column) var(--sl-vault-column) var(--sl-asset-column) var(--sl-detail-column);'));
assert(gate2630.includes('parts[2] >= 30'),
  'The 2.6.30 observer-gate correction must remain active on later candidates.');

console.log('PASS SafeLedger keeps compact-layout coverage behavior-based while preserving the 2.6.30 observer correction and current padded compact width.');
