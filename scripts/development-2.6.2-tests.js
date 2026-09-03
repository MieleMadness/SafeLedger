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
assert(rendererEntry.includes('shitcoin-mode-ui.js'));
assert(!rendererEntry.includes('asset-multichain-ui.js'),
  'Multichain Asset identity fields must be rendered directly rather than through the retired observer helper.');
assert(!rendererEntry.includes('service-catalog-ui.js'),
  'Known-service icons must be rendered directly by the canonical Vault Item presenter, not a retired observer.');
const shitCoinUi = read('src/main/shitcoin-mode-ui.js');
assert(shitCoinUi.includes('💩'));
assert(shitCoinUi.includes('visual-only joke setting'));
assert(shitCoinUi.includes('.coin-list-generic-icon, .coin-brand-generic'));

assert.strictEqual(fs.existsSync(path.join(root, 'src/main/asset-multichain-ui.js')), false,
  'The retired multichain post-render helper must stay removed.');
const recordSource = read('src/main/record.js');
const customFieldsUiSource = read('src/main/custom-fields-ui.js');
assert(recordSource.includes("Object.freeze({ label: 'Network', type: 'text' })") &&
  recordSource.includes("Object.freeze({ label: 'Contract address', type: 'text' })"),
  'The canonical Asset renderer must retain Network and Contract address identity fields.');
assert(recordSource.includes('fixedFields: ASSET_IDENTITY_FIELDS'),
  'Asset forms must request their identity fields directly from the shared editor.');
assert(customFieldsUiSource.includes('function lockFixedField(field = {})'),
  'The shared custom-field editor must retain direct fixed-field support.');

const presentationSource = read('src/main/vault-item-presentation.js');
assert(presentationSource.includes("const serviceCatalog = require('./service-catalog');"),
  'Canonical Vault Item presentation must retain the local known-service catalog.');
assert(presentationSource.includes('known-service-brand-image'),
  'Known Web3/website Vault Items must retain their local branded service artwork.');
assert(presentationSource.includes('serviceCatalog.createIcon(service.name'),
  'Known service icons must be created directly during Vault Item rendering.');

const release = read('RELEASE-2.6.2.md');
assert(release.includes('Shit Coin Mode'));
assert(release.includes('Chain Games'));
assert(release.includes('known website'));

console.log(`PASS SafeLedger ${pkg.version} preserves the 2.6.2 Shit Coin Mode, Chain Games, direct multichain asset identity, and known-site icon catalog gates.`);
