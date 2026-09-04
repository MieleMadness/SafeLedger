'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

const presentationPath = 'src/main/vault-item-presentation.js';
const presentationSource = read(presentationPath);
const presentation = require(path.join(root, presentationPath));
const groupSource = read('src/main/group.js');
const entrySource = read('src/main/renderer-entry.js');
const customFieldsSource = read('src/main/custom-fields-ui.js');
const dashboardSource = read('src/main/dashboard-ui.js');
const profileSource = read('src/main/profile.js');
const searchSource = read('src/main/global-search-ui.js');
const drillSource = read('src/main/recovery-drill-ui.js');
const binderSource = read('src/main/recovery-binder-ui.js');
const intelligenceSource = read('src/main/recovery-intelligence-dashboard-ui.js');

const retiredObservers = [
  'src/main/vault-item-ui.js',
  'src/main/service-catalog-ui.js',
  'src/main/vault-item-type-split-ui.js',
  'src/main/vault-item-wallet-presets-ui.js',
  'src/main/vault-language-ui.js'
];

for (const relative of retiredObservers) {
  assert.strictEqual(exists(relative), false, `${relative} should stay removed after Vault Item renderer consolidation.`);
  const fileName = path.basename(relative);
  assert(!entrySource.includes(`require('./${fileName}')`), `${fileName} must not return to renderer-entry.`);
}

assert(groupSource.includes("const vaultItemPresentation = require('./vault-item-presentation');"),
  'group.js must own Vault Item presentation through the passive shared helper.');
assert(groupSource.includes('vaultItemPresentation.configureEditForm({'));
assert(groupSource.includes('vaultItemPresentation.createIconElement(current)'));
assert(groupSource.includes('vaultItemPresentation.detailInformationTitle(category)'));
assert(groupSource.includes("header.textContent = params.group ? 'Modify Vault Item' : 'Add Vault Item';"));

for (const forbidden of ['MutationObserver', 'DOMContentLoaded', 'queueMicrotask', 'setTimeout(', '.click()']) {
  assert(!presentationSource.includes(forbidden), `Canonical Vault Item presentation must not depend on ${forbidden}.`);
}
assert(customFieldsSource.includes('function ensureField(field = {})'));
assert(customFieldsSource.includes('return existing || addRow(normalized);'),
  'Standard account fields must use the editor API directly instead of clicking Add custom field.');
assert(customFieldsSource.includes('function removeEmptyField(label)'));
assert(customFieldsSource.includes('if (!isEmpty) return false;'),
  'Retired preset cleanup must preserve populated legacy values.');

const labels = presentation.TYPE_GROUPS.map((group) => group.label);
assert.deepStrictEqual(labels, ['Accounts', 'Wallets']);
assert(presentation.TYPE_GROUPS.flatMap((group) => group.values).includes('Exchange Account'));
assert(presentation.TYPE_GROUPS.flatMap((group) => group.values).includes('Web3 Account'));
assert(presentation.TYPE_GROUPS.flatMap((group) => group.values).includes('Website Account'));
assert.strictEqual(presentation.normalizeCategory('Chain Games', 'Web3 / Website Account'), 'Web3 Account');
assert.strictEqual(presentation.normalizeCategory('FIO App', 'Web3 / Website Account'), 'Web3 Account');
assert.strictEqual(presentation.normalizeCategory('Facebook', 'Web3 / Website Account'), 'Website Account');
assert.strictEqual(presentation.normalizeCategory('Yahoo', 'Web3 / Website Account'), 'Website Account');
assert(presentation.groupedPresetNames('Web3 Account').some((group) => group.label === 'Gaming' && group.names.includes('Chain Games')));
assert(presentation.groupedPresetNames('Website Account').some((group) => group.names.includes('GitHub')));
assert(presentation.presetNames('Exchange Account').length >= 20);

const web3Fields = presentation.accountFields('Web3 Account');
assert(!web3Fields.some(([label]) => label === 'Connected wallet(s)'),
  'Canonical Web3 rendering must not force the retired blank Connected wallet(s) row back into new forms.');
assert(!web3Fields.some(([label]) => label === 'Login method'),
  'Canonical Web3 rendering must not force the retired blank Login method row back into new forms.');
assert(web3Fields.some(([label, type]) => label === '2FA recovery / backup codes' && type === 'sensitive'),
  'Canonical Web3 rendering must retain useful sensitive recovery-code support.');
assert(presentation.accountFields('Website Account').some(([label, type]) => label === '2FA recovery / backup codes' && type === 'sensitive'));

assert(profileSource.includes('Create a Profile to organize vault items, assets, and recovery plans.'));
assert(groupSource.includes('Vault Items appear after a Profile is selected.'));
assert(groupSource.includes('No matching vault items'));
assert(searchSource.includes('Search Profiles, Vault Items, and Assets without indexing secret values.'));
assert(searchSource.includes("return type === 'wallet' ? 'VAULT ITEM'"));
assert(drillSource.includes('Vault Item: ${params.walletName || \'Vault Item\'}'));
assert(drillSource.includes('Edit Vault Item'));
assert(binderSource.includes('vault item${safeBinder.walletCount === 1'));
assert(intelligenceSource.includes('Repeated Vault Item recovery metadata'));
assert(dashboardSource.includes("makeStat('Vault Items', vaultItems)"));
assert(dashboardSource.includes('Vault Items include wallets, exchange accounts, and Web / Web3 services.'));
assert(dashboardSource.includes('function vaultContentsLabel(counts = {})'));

console.log('PASS Vault Item list/detail/edit/preset/icon/terminology rendering has one canonical owner, no retired observer stack, and no retired blank account preset rows.');
