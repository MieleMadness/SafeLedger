'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const layoutPath = path.join(root, 'src/main/edit-form-grid-enhancements.js');
const securityPath = path.join(root, 'src/main/edit-security-enhancements.js');

execFileSync(process.execPath, ['--check', layoutPath], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', securityPath], { stdio: 'pipe' });

const index = read('src/main/index.html');
const layout = read('src/main/edit-form-grid-enhancements.js');
const security = read('src/main/edit-security-enhancements.js');
const css = read('src/main/css/2.0.39.css');
const record = read('src/main/record.js');

assert(index.includes('./css/2.0.39.css'));
assert(index.includes("require('./edit-form-grid-enhancements.js')"));
assert(index.includes("require('./edit-security-enhancements.js')"));

assert(layout.includes("{ id: 'inputPublicAddress', label: 'Public address' }"));
assert(layout.includes("{ id: 'inputPrivateAddress', label: 'Private key', sensitive: true }"));
assert(layout.includes("{ id: 'inputManualBalance', label: 'Balance', sensitive: true }"));
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

assert(security.includes("{ id: 'inputPrivateAddress', label: 'private key' }"));
assert(security.includes("{ id: 'inputManualBalance', label: 'balance' }"));
assert(security.includes("{ id: 'inputPassword', label: 'password' }"));
assert(security.includes("form.querySelectorAll('.compact-qr-area, .sensitive-controls')"));
assert(security.includes("form.querySelectorAll('.secure-input-shell .field-inline-actions')"));
assert(security.includes('fa fa-eye'));
assert(security.includes('fa-eye-slash'));
assert(!security.includes('fa-copy'));
assert(!security.includes('fa-qrcode'));
assert(security.includes("securityUi.appendSensitiveField(area, 'Balance', value)"));
assert(security.includes("field.label === 'Balance'"));

assert(css.includes('.safeledger-edit-form .compact-qr-area'));
assert(css.includes('display: none !important'));
assert(css.includes('.edit-sensitive-actions'));
assert(css.includes('padding-right: 44px'));

assert(record.includes("textInput('inputManualBalance','Balance'"));
assert(record.includes("addLine('Balance',params.record.manualBalance)"));
assert(record.includes("{label:'Balance',value:params.record.manualBalance}"));
assert(!record.includes('Last known balance'));

console.log('PASS SafeLedger 2.0.39 edit-only security and private Balance regression checks.');
