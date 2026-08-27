'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const layoutPath = path.join(root, 'src/main/coin-form-layout-enhancements.js');

execFileSync(process.execPath, ['--check', layoutPath], { stdio: 'pipe' });

const index = read('src/main/index.html');
const layout = read('src/main/coin-form-layout-enhancements.js');
const css = read('src/main/css/2.0.37.css');

assert(index.includes('./css/2.0.37.css'));
assert(index.includes("require('./coin-form-layout-enhancements.js')"));

const expectedOrder = [
  "id: 'inputName'",
  "id: 'inputSymbol'",
  "id: 'inputPublicAddress'",
  "id: 'inputPrivateAddress'",
  "id: 'inputTags'",
  "id: 'inputManualBalance'",
  "id: 'inputNotes'"
];
let lastIndex = -1;
for (const token of expectedOrder) {
  const tokenIndex = layout.indexOf(token);
  assert(tokenIndex > lastIndex, `Expected ${token} after the previous coin field`);
  lastIndex = tokenIndex;
}

assert(layout.includes("{ id: 'inputPublicAddress', label: 'Public address', full: true }"));
assert(layout.includes("{ id: 'inputPrivateAddress', label: 'Private key', full: true }"));
assert(layout.includes("{ id: 'inputNotes', label: 'Notes', full: true }"));
assert(layout.includes("shell.nextElementSibling.classList.contains('compact-qr-area')"));
assert(layout.includes('if (qrArea) field.appendChild(qrArea)'));
assert(layout.includes("group.querySelector('.sensitive-controls')"));
assert(css.includes('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)'));
assert(css.includes('grid-column: 1 / -1'));
assert(css.includes('column-gap: 16px'));
assert(css.includes('row-gap: 18px'));

console.log('PASS SafeLedger 2.0.37 coin form layout regression checks.');
