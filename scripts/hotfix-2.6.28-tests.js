'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 28,
  'SafeLedger 2.6.28 canonical-rendering correction must remain active on 2.6.28 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.28-tests.js'),
  '2.6.28 canonical-rendering correction must stay in the locked suite.');

const consolidation = read('scripts/vault-item-rendering-consolidation-tests.js');
const gate2627 = read('scripts/hotfix-2.6.27-tests.js');
const gate2626 = read('scripts/hotfix-2.6.26-tests.js');
const presentation = require('../src/main/vault-item-presentation.js');

assert(!consolidation.includes("presentation.accountFields('Web3 Account').some(([label]) => label === 'Connected wallet(s)')"),
  'Canonical rendering regression must not force the retired Connected wallet(s) row back into new Web3 forms.');
assert(consolidation.includes("!web3Fields.some(([label]) => label === 'Connected wallet(s)')"));
assert(consolidation.includes("!web3Fields.some(([label]) => label === 'Login method')"));
assert(consolidation.includes("label === '2FA recovery / backup codes' && type === 'sensitive'"),
  'Canonical rendering must continue protecting useful sensitive account recovery support.');
assert(consolidation.includes('function removeEmptyField(label)') && consolidation.includes('if (!isEmpty) return false;'),
  'Canonical rendering regression must protect preservation of populated legacy values during retired-row cleanup.');

const web3Labels = presentation.accountFields('Web3 Account').map(([label]) => label);
assert(!web3Labels.includes('Connected wallet(s)'));
assert(!web3Labels.includes('Login method'));
assert(web3Labels.includes('2FA recovery / backup codes'));

assert(gate2627.includes('parts[2] >= 27'),
  'The corrected 2.6.27 historical Web3 gate must remain active on later candidates.');
assert(gate2626.includes('parts[2] >= 26'),
  'The complete 2.6.26 runtime/UI gate must remain active on later candidates.');

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.28 canonical Vault Item rendering correction active.`);
