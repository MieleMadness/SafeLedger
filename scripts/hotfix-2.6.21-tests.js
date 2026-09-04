'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(versionParts[0] === 2 && versionParts[1] === 6 && versionParts[2] >= 21,
  'SafeLedger 2.6.21 historical sizing-gate regressions must remain active on 2.6.21 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.21-tests.js'),
  '2.6.21 historical sizing-gate coverage must stay in the locked suite.');

const gate267 = read('scripts/hotfix-2.6.7-tests.js');
const gate2611 = read('scripts/hotfix-2.6.11-tests.js');
const windowSizing = require('../src/main/window-sizing-main.js');
const foundation = read('src/main/css/foundation.css');
const main = read('src/main/main.js');

for (const [name, source] of [['2.6.7', gate267], ['2.6.11', gate2611]]) {
  assert(!source.includes('PREFERRED_WIDTH, 1400'), `${name} gate must not freeze the retired 1400px width.`);
  assert(!source.includes('width: 1400, height: 750'), `${name} gate must not expect the retired 1400px target.`);
  assert(source.includes('window-sizing-main'),
    `${name} gate must continue protecting main-process sizing ownership.`);
}

assert.strictEqual(windowSizing.PREFERRED_WIDTH, 1283);
assert.strictEqual(windowSizing.PREFERRED_HEIGHT, 750);
for (const variable of ['--sl-profile-column', '--sl-vault-column', '--sl-asset-column']) {
  assert(foundation.includes(`${variable}: minmax(0, 2fr);`));
}
assert(foundation.includes('--sl-detail-column: minmax(0, 5fr);'));
assert(foundation.includes('--sl-compact-nav-column: 104px;'));
assert(foundation.includes('grid-template-columns: var(--sl-profile-column) var(--sl-vault-column) var(--sl-asset-column) var(--sl-detail-column);'));
assert(main.includes("status: 'DELETED', statusMsg: 'Item Deleted'"),
  'Red Item Deleted feedback must remain carried forward while sizing gates are modernized.');

let resized = null;
assert.strictEqual(windowSizing.applyPreferredWindowSize({
  getBounds: () => ({ width: 1200, height: 700 }),
  setSize(width, height, animate) { resized = { width, height, animate }; }
}, { width: 1920, height: 1080 }), true);
assert.deepStrictEqual(resized, { width: 1283, height: 750, animate: false },
  'Current preferred sizing must still grow a normal desktop window to the 2.6.19 layout target.');

console.log(`PASS SafeLedger ${pkg.version} keeps retired 1400px assumptions out of historical sizing gates while protecting the current equal expanded columns and padded compact rails.`);
