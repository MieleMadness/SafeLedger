'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 2,
  'SafeLedger 2.6.2 feature gates must continue to apply to later 2.6.x patches.');
const settingsManager = require('../src/main/installManager/installManager/settingsManager');
assert.strictEqual(settingsManager._test.defaults().shitCoinMode, false, 'Shit Coin Mode must be opt-in.');
assert.strictEqual(settingsManager._test.normalizeSettings({ shitCoinMode: 'true' }).shitCoinMode, true);
assert.strictEqual(settingsManager._test.normalizeSettings({ shitCoinMode: false }).shitCoinMode, false);

const serviceCatalog = require('../src/main/service-catalog');
for (const name of ['Chain Games','Facebook','Yahoo','Google','Microsoft','Apple','Amazon','PayPal','Instagram','LinkedIn','GitHub','Netflix','Spotify']) {
  const service = serviceCatalog.find(name);
  assert(service, `Known service missing: ${name}`);
  assert(serviceCatalog.iconDataUrl(service).startsWith('data:image/svg+xml'), `${name} icon must be fully local.`);
}
assert.strictEqual(serviceCatalog.find('facebook.com').name, 'Facebook');
assert.strictEqual(serviceCatalog.find('www.yahoo.com').name, 'Yahoo');

const tokenIcons = require('../src/main/token-icons');
const chainIcon = tokenIcons.getIconMatch({ name:'Chain Games — Polygon', symbol:'CHAIN' });
assert(chainIcon && chainIcon.key === 'CHAIN-GAMES');

const presets = require('../src/main/vault-item-asset-presets');
const chainRecords = presets.buildRecords('Chain Games', presets.SERVICE_CATEGORY, 'test');
assert.strictEqual(chainRecords.length, 3, 'Chain Games must seed Ethereum, Polygon, and Supernet CHAIN assets.');
const polygon = chainRecords.find((record) => /Polygon/.test(record.name));
assert(polygon);
assert(polygon.customFields.some((field) => field.label === 'Network' && field.value === 'Polygon'));
assert(polygon.customFields.some((field) => field.label === 'Contract address' && field.value === '0xd55fce7cdab84d84f2ef3f99816d765a2a94a509'));

const rendererEntry = read('src/main/renderer-entry.js');
assert(!rendererEntry.includes('shitcoin-mode-ui.js'), 'Shit Coin Mode must no longer depend on a document-wide repair observer.');
assert(!rendererEntry.includes('asset-multichain-ui.js'));
assert(!rendererEntry.includes('service-catalog-ui.js'));
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/shitcoin-mode-ui.js')), false,
  'The retired Shit Coin Mode DOM repair module must stay removed.');
const displayPreferences = require('../src/main/display-preferences');
displayPreferences.setSettings({ shitCoinMode: true });
assert.strictEqual(displayPreferences.genericAssetFallback('ABC', 2).text, '💩');
displayPreferences.setSettings({ shitCoinMode: false });
assert.strictEqual(displayPreferences.genericAssetFallback('ABC', 2).text, 'AB');
const settingsUi = read('src/main/settings-ui.js');
assert(settingsUi.includes('visual-only joke setting'));
assert(settingsUi.includes("makeSection('Asset Display')"));

assert.strictEqual(fs.existsSync(path.join(root, 'src/main/asset-multichain-ui.js')), false);
const recordSource = read('src/main/record.js');
const customFieldsUiSource = read('src/main/custom-fields-ui.js');
assert(recordSource.includes("Object.freeze({ label: 'Network', type: 'text' })") && recordSource.includes("Object.freeze({ label: 'Contract address', type: 'text' })"));
assert(recordSource.includes('customFieldsUi.createEditor(grid, params.record && params.record.customFields'),
  'Asset identity and user custom fields should be owned by the canonical editor.');
assert(recordSource.includes('customFieldEditor.lockFixedField(identityField)'),
  'Network and Contract address must remain protected identity fields inside the editable custom-field UI.');
assert(!recordSource.includes('fixedFields: ASSET_IDENTITY_FIELDS'),
  'The superseded fixed-only Asset path must not return because it hides user-defined custom fields.');
assert(recordSource.includes('displayPreferences.genericAssetFallback(symbol, maxLength)'));
assert(customFieldsUiSource.includes('function lockFixedField(field = {})'));
assert(customFieldsUiSource.includes('Add custom field'),
  'Asset users must retain the shared Add custom field capability.');
assert(!customFieldsUiSource.includes('MutationObserver') && !customFieldsUiSource.includes('.click()'),
  'Multichain identity/custom-field rendering must remain direct rather than observer or synthetic-event driven.');

const presentationSource = read('src/main/vault-item-presentation.js');
assert(presentationSource.includes("const serviceCatalog = require('./service-catalog');"));
assert(presentationSource.includes('known-service-brand-image'));
assert(presentationSource.includes('serviceCatalog.createIcon(service.name'));

const release = read('RELEASE-2.6.2.md');
assert(release.includes('Shit Coin Mode'));
assert(release.includes('Chain Games'));
assert(release.includes('known website'));

console.log(`PASS SafeLedger ${pkg.version} preserves Shit Coin Mode, Chain Games, protected multichain Asset identity with editable user custom fields, and local known-site artwork without a DOM repair observer.`);
