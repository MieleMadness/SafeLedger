'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const gate2648 = read('scripts/hotfix-2.6.48-tests.js');
const parts = String(pkg.version || '').split('.').map(Number);

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 49,
  'The 2.6.49 three-platform candidate coverage must stay active on SafeLedger 2.6.49 and later patches.');
assert(read('package.json').includes('node scripts/hotfix-2.6.49-tests.js'),
  '2.6.49 coverage must stay in the locked regression suite.');
assert(gate2648.includes('parts[2] >= 48'),
  'The approved 2.6.48 logged-out action and login-width regression must remain active on 2.6.49 and later patches.');

console.log('PASS SafeLedger 2.6.49 candidate coverage remains active on later 2.6.x patches.');
