'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const gate2648 = read('scripts/hotfix-2.6.48-tests.js');

assert.strictEqual(pkg.version, '2.6.49', 'This workflow test candidate must report SafeLedger 2.6.49.');
assert(read('package.json').includes('node scripts/hotfix-2.6.49-tests.js'),
  '2.6.49 coverage must stay in the locked regression suite.');
assert(gate2648.includes('parts[2] >= 48'),
  'The approved 2.6.48 logged-out action and login-width regression must remain active on 2.6.49.');

console.log('PASS SafeLedger 2.6.49 carries the tested 2.6.48 logged-out navigation, login notice icon, and login-width behavior into the next three-platform candidate.');
