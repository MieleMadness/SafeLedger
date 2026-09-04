'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 27,
  'SafeLedger 2.6.27 historical Web3-gate correction must remain active on 2.6.27 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.27-tests.js'),
  '2.6.27 historical Web3-gate correction must stay in the locked suite.');

const gate2606 = read('scripts/hotfix-2.6.6-tests.js');
const gate2626 = read('scripts/hotfix-2.6.26-tests.js');
const presentation = require('../src/main/vault-item-presentation.js');

assert(!gate2606.includes("label === 'Connected wallet(s)' && type === 'text'"),
  'The historical 2.6.6 gate must not force the retired Connected wallet(s) preset row back into Web3 forms.');
assert(gate2606.includes("!web3Fields.some(([label]) => label === 'Connected wallet(s)')"),
  'The 2.6.6 gate must protect the newly simplified Web3 preset behavior.');
assert(gate2606.includes("!web3Fields.some(([label]) => label === 'Login method')"),
  'The historical Web3 gate must also protect removal of the blank Login method preset row.');
assert(gate2606.includes("label === '2FA recovery / backup codes'"),
  'Useful Web3 recovery-code support must remain covered.');

for (const category of [presentation.EXCHANGE_CATEGORY, presentation.WEB3_CATEGORY, presentation.WEBSITE_CATEGORY]) {
  const labels = presentation.accountFields(category).map(([label]) => label);
  assert(!labels.includes('Login method'));
}
assert(!presentation.accountFields(presentation.WEB3_CATEGORY).map(([label]) => label).includes('Connected wallet(s)'));
assert(gate2626.includes('parts[2] >= 26'),
  'The full 2.6.26 compact-navigation and form-cleanup gate must remain active on later candidates.');

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.27 historical Web3 preset correction active on later candidates.`);
