'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const version = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
assert(version[0] === 2 && version[1] === 5 && version[2] >= 17, 'development build must be SafeLedger 2.5.17 or later');

const profileSetup = require(path.join(root, 'src/main/profile-setup.js'));
const walletCatalog = require(path.join(root, 'src/main/wallet-catalog.js'));
require(path.join(root, 'src/main/wallet-catalog-extensions.js'));
const tokenIcons = require(path.join(root, 'src/main/token-icons.js'));
const assetPresets = require(path.join(root, 'src/main/vault-item-asset-presets.js'));
const walletPresetUi = require(path.join(root, 'src/main/vault-item-wallet-presets-ui.js'));

const templates = profileSetup.availableTemplates();
assert(templates.length > 0 && templates.every((template) => template.hasIcon === true),
  'wallet preset dropdown must be built only from logo-backed templates');
for (const wallet of walletCatalog.catalog) {
  if (!profileSetup.iconMatch(wallet.name)) {
    assert(!templates.some((template) => template.name === wallet.name), `${wallet.name} must stay out of logo-backed wallet selectors.`);
  }
}
for (const category of ['Hardware Wallet', 'Software Wallet', 'Other Wallet']) {
  assert(walletPresetUi._test.templatesForCategory(category).every((template) => template.hasIcon === true),
    `${category} dropdown must contain only wallets with local artwork.`);
}

const ledgerAssets = assetPresets.buildRecords('Ledger', 'Hardware Wallet', '2026-09-02T00:00:00.000Z');
assert(ledgerAssets.some((asset) => asset.symbol === 'BTC'), 'Ledger should preload Bitcoin when created as a Vault Item.');
assert(ledgerAssets.some((asset) => asset.symbol === 'ETH'), 'Ledger should preload Ethereum when created as a Vault Item.');
assert(ledgerAssets.every((asset) => tokenIcons.getIconMatch(asset)), 'every seeded wallet asset must resolve to local artwork.');

const krakenAssets = assetPresets.buildRecords('Kraken', assetPresets.EXCHANGE_CATEGORY, '2026-09-02T00:00:00.000Z');
assert(krakenAssets.some((asset) => asset.symbol === 'BTC'), 'Kraken Exchange should preload reviewed Bitcoin support.');
assert(krakenAssets.some((asset) => asset.symbol === 'ETH'), 'Kraken Exchange should preload reviewed Ethereum support.');
assert(krakenAssets.every((asset) => tokenIcons.getIconMatch(asset)), 'every seeded exchange asset must resolve to local artwork.');

const fioAssets = assetPresets.buildRecords('FIO App', assetPresets.SERVICE_CATEGORY, '2026-09-02T00:00:00.000Z');
assert.deepStrictEqual(fioAssets.map((asset) => asset.symbol), ['FIO'], 'FIO App should preload the icon-backed FIO asset only.');

const seedSource = read('src/main/vault-item-asset-seeding-ui.js');
assert(seedSource.includes("channel === 'process-group'"), 'new Vault Item saves must pass through the asset seeding hook.');
assert(seedSource.includes("request.type !== 'group-create'"), 'asset seeding must be limited to newly created Vault Items.');
assert(seedSource.includes('if (!records.length) return 0;'), 'unknown Vault Items must remain empty instead of receiving guessed assets.');

const cancelSource = read('src/main/add-form-cancel-ui.js');
assert(cancelSource.includes("text === 'add asset'"), 'Add Asset must have an explicit Cancel action.');
assert(cancelSource.includes("text === 'add vault item'"), 'Add Vault Item must have an explicit Cancel action.');
assert(cancelSource.includes("#groupArea .nav > li > a.item-selected"), 'Cancel Add Asset should return to the selected Vault Item.');
assert(cancelSource.includes("#vaultArea .nav > li > a.item-selected"), 'Cancel Add Vault Item should return to the selected Profile.');

const iconFix = read('src/main/settings-icon-fix-ui.js');
assert(iconFix.includes('sl-change-password-icon'), 'Change Password should use the local SVG icon replacement.');
assert(iconFix.includes("button.querySelector('i.fa-lock')"), 'the broken legacy lock icon should be explicitly removed.');
assert(iconFix.includes('<svg viewBox="0 0 24 24"'), 'Change Password replacement should be a local inline SVG.');

const rendererEntry = read('src/main/renderer-entry.js');
for (const moduleName of [
  'vault-item-wallet-presets-ui.js',
  'vault-item-asset-seeding-ui.js',
  'add-form-cancel-ui.js',
  'settings-icon-fix-ui.js'
]) assert(rendererEntry.includes(`require('./${moduleName}')`), `${moduleName} must load in the renderer.`);

console.log('PASS SafeLedger 2.5.17 logo-backed wallet selectors, reviewed icon-backed asset seeding, Add-form cancellation, and local Change Password icon.');
