'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const typeSplit = require(path.join(root, 'src/main/vault-item-type-split-ui.js'));
const typeTests = typeSplit._test;
const assetPresets = require(path.join(root, 'src/main/vault-item-asset-presets.js'));

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 5,
  'SafeLedger 2.6.5 account-type/dropdown regressions must remain active on later 2.6.x patches.');

const typeLabels = typeSplit.TYPE_GROUPS.map((group) => group.label);
assert.deepStrictEqual(typeLabels, [...typeLabels].sort((a, b) => a.localeCompare(b)),
  'Vault Item type groups must be alphabetized.');
assert.deepStrictEqual(typeLabels, ['Accounts', 'Wallets']);
for (const group of typeSplit.TYPE_GROUPS) {
  assert.deepStrictEqual(group.values, [...group.values].sort((a, b) => a.localeCompare(b)),
    `${group.label} Vault Item types must be alphabetized.`);
}
const allTypes = typeSplit.TYPE_GROUPS.flatMap((group) => group.values);
assert(allTypes.includes('Web3 Account') && allTypes.includes('Website Account'),
  'Web3 Account and Website Account must be distinct Vault Item types.');
assert(!allTypes.includes('Web3 / Website Account'),
  'The long legacy combined account label must not appear in the new type dropdown.');

assert.strictEqual(typeTests.inferAccountType('Chain Games', 'Web3 / Website Account'), 'Web3 Account');
assert.strictEqual(typeTests.inferAccountType('Aave', 'Web3 / Website Account'), 'Web3 Account');
assert.strictEqual(typeTests.inferAccountType('Facebook', 'Web3 / Website Account'), 'Website Account');
assert.strictEqual(typeTests.inferAccountType('Yahoo', 'Web3 / Website Account'), 'Website Account');

const web3Groups = typeTests.groupedPresetNames('Web3 Account');
const web3Labels = web3Groups.map((group) => group.label);
assert.deepStrictEqual(web3Labels, [...web3Labels].sort((a, b) => a.localeCompare(b)),
  'Web3 preset groups must be alphabetized.');
for (const group of web3Groups) {
  assert.deepStrictEqual(group.names, [...group.names].sort((a, b) => a.localeCompare(b)),
    `${group.label} Web3 presets must be alphabetized.`);
}
assert(web3Groups.some((group) => group.label === 'Gaming' && group.names.includes('Chain Games')),
  'Chain Games must appear under the Gaming Web3 preset group.');

const websiteGroups = typeTests.groupedPresetNames('Website Account');
const websiteLabels = websiteGroups.map((group) => group.label);
assert.deepStrictEqual(websiteLabels, [...websiteLabels].sort((a, b) => a.localeCompare(b)),
  'Website preset groups must be alphabetized.');
for (const group of websiteGroups) {
  assert.deepStrictEqual(group.names, [...group.names].sort((a, b) => a.localeCompare(b)),
    `${group.label} website presets must be alphabetized.`);
}
const websiteGroupFor = (name) => websiteGroups.find((group) => group.names.includes(name));
assert.strictEqual(websiteGroupFor('GitHub').label, 'Developer');
assert.strictEqual(websiteGroupFor('Yahoo').label, 'Email');
assert.strictEqual(websiteGroupFor('Facebook').label, 'Social & Community');
assert.strictEqual(websiteGroupFor('PayPal').label, 'Shopping & Payments');

const chainWeb3Assets = assetPresets.buildRecords('Chain Games', 'Web3 Account', 'test-created');
assert.strictEqual(chainWeb3Assets.length, 3,
  'Chain Games must retain its three reviewed CHAIN starter assets after moving to Web3 Account.');
assert.strictEqual(assetPresets.buildRecords('Chain Games', 'Website Account', 'test-created').length, 0,
  'Website Account must not accidentally seed Chain Games crypto assets.');

const typeSource = read('src/main/vault-item-type-split-ui.js');
assert(typeSource.includes("document.createElement('optgroup')"),
  'Grouped dropdowns must render with native optgroup elements.');
assert(typeSource.includes('Finance & Crypto') && typeSource.includes('Social & Community') && typeSource.includes('Identity & Naming'),
  'Known account dropdowns must keep meaningful grouped categories.');
const walletPresetSource = read('src/main/vault-item-wallet-presets-ui.js');
assert(walletPresetSource.includes("'Web3 Account', 'Website Account'"),
  'Wallet preset UI must leave the account-specific preset dropdowns alone.');
const rendererEntry = read('src/main/renderer-entry.js');
assert(rendererEntry.includes("require('./vault-item-type-split-ui.js')"),
  'The Web3/Website type split must load in the real renderer bundle.');

console.log(`PASS SafeLedger ${pkg.version} preserves the 2.6.5 Web3/Website type split, grouped alphabetized dropdowns, and Chain Games Web3 presets.`);
