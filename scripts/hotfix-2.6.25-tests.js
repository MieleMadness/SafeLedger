'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 25,
  'SafeLedger 2.6.25 historical-gate correction must remain active on 2.6.25 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.25-tests.js'),
  '2.6.25 historical-gate correction must stay in the locked regression suite.');

const gate2619 = read('scripts/hotfix-2.6.19-tests.js');
const gate2624 = read('scripts/hotfix-2.6.24-tests.js');
const statusSource = read('src/main/status.js');

assert(!gate2619.includes("state === 'DELETED' ? { role: 'status', ariaLive: 'polite' } : {}"),
  'The historical 2.6.19 gate must not require the pre-trash-icon options object.');
assert(gate2619.includes("appended.children[0].className, 'fa fa-trash'"),
  'The 2.6.19 gate must now verify actual rendered deletion icon behavior.');
assert(gate2619.includes("appended.attributes['aria-live'], 'polite'"),
  'The historical deletion gate must continue protecting polite accessibility semantics.');
assert(statusSource.includes("iconClass: 'fa fa-trash'"),
  'Runtime deletion status must keep the dedicated trash-can icon.');
assert(gate2624.includes('parts[2] >= 24'),
  'The 2.6.24 recovery UI gate must remain active on later candidates.');

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.25 historical deletion-gate correction active on later candidates.`);
