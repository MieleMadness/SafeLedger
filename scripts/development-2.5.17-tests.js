'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const version = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const atLeast2517 = version[0] > 2 ||
  (version[0] === 2 && version[1] > 5) ||
  (version[0] === 2 && version[1] === 5 && version[2] >= 17);
assert(atLeast2517, 'build must be SafeLedger 2.5.17 or later');

const profileSetup = require(path.join(root, 'src/main/profile-setup.js'));
const walletCatalog = require(path.join(root, 'src/main/wallet-catalog.js'));
require(path.join(root, 'src/main/wallet-catalog-extensions.js'));
const tokenIcons = require(path.join(root, 'src/main/token-icons.js'));
const assetPresets = require(path.join(root, 'src/main/vault-item-asset-presets.js'));
const vaultItemPresentation = require(path.join(root, 'src/main/vault-item-presentation.js'));
const serviceCatalog = require(path.join(root, 'src/main/service-catalog.js'));
const dataWrite = require(path.join(root, 'src/main/data-write-service.js'));

const templates = profileSetup.availableTemplates();
assert(templates.length > 0, 'starter preset picker must contain reviewed local-artwork templates');
for (const template of templates) {
  if (template.service === true) {
    assert(serviceCatalog.find(template.name), `${template.name} service starter must resolve to SafeLedger-owned local artwork.`);
    assert(assetPresets.hasAssetPreset(template.name, assetPresets.WEB3_CATEGORY),
      `${template.name} service starter must have a reviewed Web3 asset preset.`);
  } else {
    assert.strictEqual(template.hasIcon, true, `${template.name} conventional wallet template must remain logo-backed.`);
  }
}
for (const wallet of walletCatalog.catalog) {
  if (!profileSetup.iconMatch(wallet.name)) {
    assert(!templates.some((template) => template.name === wallet.name), `${wallet.name} must stay out of logo-backed wallet selectors.`);
  }
}
for (const category of ['Hardware Wallet', 'Software Wallet', 'Other Wallet']) {
  const categoryTemplates = vaultItemPresentation.walletTemplatesForCategory(category);
  assert(categoryTemplates.every((template) => template.hasIcon === true && template.service !== true),
    `${category} dropdown must contain only conventional wallets with local artwork.`);
  assert(!categoryTemplates.some((template) => template.name === 'Chain Games'),
    'The Chain Games Web3 service starter must not appear in Wallet-type preset dropdowns.');
}

const chainTemplate = templates.find((template) => template.name === 'Chain Games');
assert(chainTemplate && chainTemplate.service === true,
  'Chain Games must remain explicitly identified as the reviewed service starter in Profile setup.');

const ledgerAssets = assetPresets.buildRecords('Ledger', 'Hardware Wallet', '2026-09-02T00:00:00.000Z');
assert(ledgerAssets.some((asset) => asset.symbol === 'BTC'), 'Ledger should preload Bitcoin when created as a Vault Item.');
assert(ledgerAssets.some((asset) => asset.symbol === 'ETH'), 'Ledger should preload Ethereum when created as a Vault Item.');
assert(ledgerAssets.every((asset) => tokenIcons.getIconMatch(asset)), 'every seeded wallet asset must resolve to local artwork.');

const krakenAssets = assetPresets.buildRecords('Kraken', assetPresets.EXCHANGE_CATEGORY, '2026-09-02T00:00:00.000Z');
assert(krakenAssets.some((asset) => asset.symbol === 'BTC'), 'Kraken Exchange should preload reviewed Bitcoin support.');
assert(krakenAssets.some((asset) => asset.symbol === 'ETH'), 'Kraken Exchange should preload Ethereum support.');
assert(krakenAssets.every((asset) => tokenIcons.getIconMatch(asset)), 'every seeded exchange asset must resolve to local artwork.');

const fioAssets = assetPresets.buildRecords('FIO App', assetPresets.SERVICE_CATEGORY, '2026-09-02T00:00:00.000Z');
assert.deepStrictEqual(fioAssets.map((asset) => asset.symbol), ['FIO'], 'FIO App should preload the icon-backed FIO asset only.');

const trustedLedger = dataWrite.buildTrustedStarterRecords({ name: 'Ledger', category: 'Hardware Wallet' }, '2026-09-02T00:00:00.000Z');
assert(trustedLedger.some((asset) => asset.symbol === 'BTC') && trustedLedger.some((asset) => asset.symbol === 'ETH'),
  'The authoritative main-process write path must seed reviewed Ledger starter Assets.');
const trustedChain = dataWrite.buildTrustedStarterRecords({ name: 'Chain Games', category: assetPresets.WEB3_CATEGORY }, '2026-09-02T00:00:00.000Z');
assert.strictEqual(trustedChain.length, 3, 'The authoritative main-process write path must seed all reviewed Chain Games Assets.');
const writeSource = read('src/main/data-write-service.js');
assert(writeSource.includes('records: buildTrustedStarterRecords(patch, created)'),
  'New Vault Item starter Assets must be created inside the authoritative main-process write.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/vault-item-asset-seeding-ui.js')), false,
  'The old renderer-side asset seeding hook must stay retired.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/vault-item-save-forwarder.js')), false,
  'The old renderer IPC-send forwarding monkeypatch must stay retired.');

const rendererEntry = read('src/main/renderer-entry.js');
const rendererSource = read('src/main/renderer.js');
const groupSource = read('src/main/group.js');
const recordSource = read('src/main/record.js');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/add-form-cancel-ui.js')), false,
  'The post-render Add Vault/Add Asset cancel injector must stay removed.');
assert(!rendererEntry.includes("require('./add-form-cancel-ui.js')"),
  'Renderer entry must not restore the retired Add-form cancel observer.');
assert(groupSource.includes("title: 'Cancel add vault item'") && groupSource.includes("typeof params.onCancel === 'function'"),
  'Add Vault Item must render its Cancel action directly.');
assert(recordSource.includes("title: 'Cancel add asset'") && recordSource.includes("typeof params.onCancel === 'function'"),
  'Add Asset must render its Cancel action directly.');
assert(rendererSource.includes('group.createGroup({ vaultData, saving, onCancel: showSelectedProfileDetail })'),
  'The real Add Vault action must provide direct cancel navigation.');
assert(rendererSource.includes('record.createRecord({ vaultData, saving, onCancel: showSelectedVaultItemDetail })'),
  'The real Add Asset action must provide direct cancel navigation.');

const settingsUi = read('src/main/settings-ui.js');
assert(settingsUi.includes('function lockIconMarkup()'), 'Change Password should keep a local lock icon helper.');
assert(settingsUi.includes('changePassword.innerHTML = `${lockIconMarkup()}Change Password`;'),
  'Change Password should render its local icon directly from the canonical Settings owner.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/settings-icon-fix-ui.js')), false,
  'The old post-render Settings icon replacement module must stay retired.');

assert(groupSource.includes("const vaultItemPresentation = require('./vault-item-presentation');"),
  'Vault Item forms must use the canonical direct preset/presentation helper.');
assert(!rendererEntry.includes("require('./vault-item-wallet-presets-ui.js')"),
  'The retired post-render wallet preset observer must not return to the renderer.');
assert(!rendererEntry.includes("require('./vault-item-asset-seeding-ui.js')") &&
  !rendererEntry.includes("require('./vault-item-save-forwarder.js')") &&
  !rendererEntry.includes("require('./settings-icon-fix-ui.js')"),
  'Retired Phase 4 repair/forwarding modules must not return to the renderer bundle.');

console.log(`PASS SafeLedger ${pkg.version} keeps conventional wallet selectors logo-backed, permits the reviewed Chain Games service starter, preserves main-owned starter Asset seeding, direct Add-form cancellation, and the directly rendered Change Password icon.`);