'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '2.6.8', 'This cleanup build must report SafeLedger 2.6.8.');
assert(read('package.json').includes('node scripts/hotfix-2.6.8-tests.js'),
  '2.6.8 regression coverage must stay in the locked suite.');

const renderer = read('src/main/renderer.js');
const entry = read('src/main/renderer-entry.js');
const profile = read('src/main/profile.js');
const group = read('src/main/group.js');
const record = read('src/main/record.js');

for (const retired of [
  'src/main/vault-item-selection-ui.js',
  'src/main/vault-item-selection.js',
  'src/main/add-form-cancel-ui.js',
  'src/main/profile-create-cancel-ui.js'
]) {
  assert.strictEqual(exists(retired), false, `${retired} must stay removed.`);
  assert(!entry.includes(`require('./${path.basename(retired)}')`), `${retired} must not return to renderer-entry.`);
}

assert(renderer.includes('function selectedVaultItem()'),
  'The real renderer must validate Vault Item selection from authoritative vaultData.');
assert(renderer.includes("status: 'INFO'"));
assert(renderer.includes("statusMsg: 'Select a Vault Item first, then choose Add Asset.'"),
  'Add Asset must tell the user to select a Vault Item first.');
assert(!renderer.includes('ensureAddAssetSelection') && !renderer.includes("require('./vault-item-selection')"),
  'Add Asset must not silently choose a Vault Item.');
assert(renderer.includes('record.createRecord({ vaultData, saving, onCancel: showSelectedVaultItemDetail })'));
assert(renderer.includes('group.createGroup({ vaultData, saving, onCancel: showSelectedProfileDetail })'));
assert(renderer.includes('profile.createProfile(profileParams({ onCancel: cancelAddProfile }))'));

assert(profile.includes("title: 'Cancel new profile'"));
assert(profile.includes("!profile && typeof params.onCancel === 'function'"));
assert(group.includes("title: 'Cancel add vault item'"));
assert(group.includes("typeof params.onCancel === 'function'"));
assert(record.includes("title: 'Cancel add asset'"));
assert(record.includes("typeof params.onCancel === 'function'"));

for (const source of [profile, group, record]) {
  assert(!source.includes('MutationObserver'), 'Form owners must not use MutationObserver to create Cancel actions.');
  assert(!source.includes('setTimeout(ensureCancelAction'), 'Form owners must not delay/inject Cancel actions.');
}

assert(renderer.includes('function showSelectedProfileDetail()'));
assert(renderer.includes('vaultData.groupSelected = null;') && renderer.includes('vaultData.recordSelected = null;'),
  'Cancel Add Vault should restore Profile context without synthetic Vault clicks.');
assert(renderer.includes('function showSelectedVaultItemDetail()'));
assert(renderer.includes('group.showGroupDetail({ vaultData, group: selected, saving });'),
  'Cancel Add Asset should restore the selected Vault Item directly.');

console.log('PASS SafeLedger 2.6.8 requires explicit Vault Item selection and renders Add-form Cancel actions directly with no observer injectors.');
