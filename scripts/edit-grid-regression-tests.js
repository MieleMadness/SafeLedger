'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const layoutPath = path.join(root, 'src/main/edit-form-grid-enhancements.js');

execFileSync(process.execPath, ['--check', layoutPath], { stdio: 'pipe' });

const index = read('src/main/index.html');
const layout = read('src/main/edit-form-grid-enhancements.js');
const css = read('src/main/css/2.0.38.css');
const record = read('src/main/record.js');

assert(index.includes('./css/2.0.38.css'));
assert(index.includes("require('./edit-form-grid-enhancements.js')"));
assert(!index.includes("require('./coin-form-layout-enhancements.js')"));

assert(layout.includes("{ id: 'inputPublicAddress', label: 'Public address' }"));
assert(layout.includes("{ id: 'inputPrivateAddress', label: 'Private key', sensitive: true }"));
assert(!layout.includes("inputPublicAddress', label: 'Public address', full: true"));
assert(!layout.includes("inputPrivateAddress', label: 'Private key', full: true"));
assert(layout.includes("{ id: 'inputNotes', label: 'Notes', full: true }"));

for (const walletField of [
  "{ id: 'inputName', label: 'Name' }",
  "{ id: 'inputCategory', label: 'Wallet category' }",
  "{ id: 'inputTags', label: 'Tags (comma separated)' }",
  "{ id: 'inputPassword', label: 'Password', sensitive: true }",
  "{ id: 'inputPin', label: 'PIN code', sensitive: true }",
  "{ id: 'inputRecoveryLink', label: 'Recovery link', sensitive: true }",
  "{ id: 'inputSeedPhrase', label: 'Seed phrase', sensitive: true }"
]) assert(layout.includes(walletField));

assert(css.includes('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)'));
assert(css.includes('.edit-info-grid-full'));
assert(css.includes('grid-column: 1 / -1'));
assert(css.includes('column-gap: 16px'));
assert(css.includes('row-gap: 18px'));

assert(record.includes("textInput('inputManualBalance','Balance'"));
assert(record.includes("addLine('Balance',params.record.manualBalance)"));
assert(record.includes("{label:'Balance',value:params.record.manualBalance}"));
assert(!record.includes('Last known balance'));

console.log('PASS SafeLedger 2.0.38 coin and wallet edit-grid regression checks.');
