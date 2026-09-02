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
for (const moduleName of ['service-catalog-ui.js','asset-multichain-ui.js','shitcoin-mode-ui.js']) assert(rendererEntry.includes(moduleName));
const shitCoinUi = read('src/main/shitcoin-mode-ui.js');
assert(shitCoinUi.includes('💩'));
assert(shitCoinUi.includes('visual-only joke setting'));
assert(shitCoinUi.includes('.coin-list-generic-icon, .coin-brand-generic'));
const assetUi = read('src/main/asset-multichain-ui.js');
assert(assetUi.includes("label: 'Network'"));
assert(assetUi.includes("label: 'Contract address'"));
const serviceUi = read('src/main/service-catalog-ui.js');
assert(serviceUi.includes('known-service-brand-image'));

const release = read('RELEASE-2.6.2.md');
assert(release.includes('Shit Coin Mode'));
assert(release.includes('Chain Games'));
assert(release.includes('known website'));

console.log(`PASS SafeLedger ${pkg.version} preserves the 2.6.2 Shit Coin Mode, Chain Games, multichain asset identity, and known-site icon catalog gates.`);
