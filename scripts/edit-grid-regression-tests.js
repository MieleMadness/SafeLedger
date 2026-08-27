'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

for (const file of ['src/main/edit-form-ui.js', 'src/main/security-ui.js', 'src/main/record.js', 'src/main/group.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
}

const index = read('src/main/index.html');
const formUi = read('src/main/edit-form-ui.js');
const securityUi = read('src/main/security-ui.js');
const record = read('src/main/record.js');
const group = read('src/main/group.js');
const gridCss = read('src/main/css/2.0.38.css');
const securityCss = read('src/main/css/2.0.39.css');

assert(index.includes('./css/2.0.38.css'));
assert(index.includes('./css/2.0.39.css'));
assert(!index.includes("require('./edit-form-grid-enhancements.js')"));
assert(!index.includes("require('./form-spacing-enhancements.js')"));
assert(!index.includes("require('./edit-security-enhancements.js')"));
assert.strictEqual(exists('src/main/edit-form-grid-enhancements.js'), false);
assert.strictEqual(exists('src/main/form-spacing-enhancements.js'), false);
assert.strictEqual(exists('src/main/edit-security-enhancements.js'), false);

assert(formUi.includes("form.className = 'safeledger-edit-form'"));
assert(formUi.includes("grid.className = 'edit-info-grid'"));
assert(formUi.includes('edit-info-grid-full'));
assert(formUi.includes('securityUi.addEditSensitiveInputControl'));
assert(gridCss.includes('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)'));
assert(gridCss.includes('column-gap: 16px'));
assert(gridCss.includes('row-gap: 18px'));

const coinOrder = [
  "id: 'inputName', label: 'Coin'",
  "id: 'inputSymbol', label: 'Symbol'",
  "id: 'inputPublicAddress', label: 'Public address'",
  "id: 'inputPrivateAddress', label: 'Private key'",
  "id: 'inputTags', label: 'Tags (comma separated)'",
  "id: 'inputManualBalance', label: 'Balance'",
  "id: 'inputNotes', label: 'Notes'"
];
let last = -1;
for (const token of coinOrder) {
  const current = record.indexOf(token);
  assert(current > last, `Expected ${token} in direct Coin form order`);
  last = current;
}
assert(record.includes("sensitive: true, revealLabel: 'private key'"));
assert(record.includes("sensitive: true, revealLabel: 'balance'"));
assert(record.includes("{ allowQr: false }"));
assert(record.includes("appendSensitiveField(area, 'Private key', params.record.privateAddress)"));
assert(record.includes('printIncludesSensitive'));

const walletOrder = [
  "id: 'inputName', label: 'Name'",
  "id: 'inputCategory', label: 'Wallet category'",
  "id: 'inputTags', label: 'Tags (comma separated)'",
  "id: 'inputPassword', label: 'Password'",
  "id: 'inputPin', label: 'PIN code'",
  "id: 'inputRecoveryLink', label: 'Recovery link'",
  "id: 'inputSeedPhrase', label: 'Seed phrase'",
  "id: 'inputNotes', label: 'Notes'"
];
last = -1;
for (const token of walletOrder) {
  const current = group.indexOf(token);
  assert(current > last, `Expected ${token} in direct Wallet form order`);
  last = current;
}
for (const label of ['Password', 'PIN code', 'Recovery link', 'Seed phrase']) {
  assert(group.includes(`appendSensitiveField(area, '${label}'`));
}
assert((group.match(/allowQr: false/g) || []).length >= 4);

assert(securityUi.includes('exports.addEditSensitiveInputControl'));
assert(securityUi.includes("'fa-eye'"));
assert(securityUi.includes('fa-eye-slash'));
assert(securityUi.includes('const allowQr = options.allowQr !== false'));
assert(securityUi.includes('if (allowQr) actions.appendChild(makeQrButton'));
assert(!securityUi.includes('addPublicInputControls'));
assert(!securityUi.includes('addSensitiveInputControls'));
assert(securityCss.includes('.edit-sensitive-shell'));
assert(!securityCss.includes('.edit-public-shell'));

console.log('PASS direct Coin/Wallet form rendering and security controls.');
