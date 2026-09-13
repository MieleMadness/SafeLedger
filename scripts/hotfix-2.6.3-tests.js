'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const serviceCatalog = require(path.join(root, 'src/main/service-catalog.js'));
const tokenIcons = require(path.join(root, 'src/main/token-icons.js'));
const assetPresets = require(path.join(root, 'src/main/vault-item-asset-presets.js'));
const dataWrite = require(path.join(root, 'src/main/data-write-service.js'));

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 3,
  'SafeLedger 2.6.3 save-safety gates must continue to apply to later 2.6.x patches.');

const serviceSource = read('src/main/service-catalog.js');
assert(!serviceSource.includes('Buffer.from('));
assert(serviceSource.includes('encodeURIComponent(svg)'));

// 2.6.3 originally verified the Chain Games icon by requiring its then-current
// inline SVG data URL while Buffer was unavailable. Chain Games now uses
// packaged local SVG files so Light/Colorful and Dark can have separate
// variants. Preserve the actual sandbox/offline invariant instead of the old
// representation detail: no Buffer dependency, no network URL, and the local
// asset must exist in packaged source.
const savedBuffer = global.Buffer;
try {
  global.Buffer = undefined;
  const serviceIcon = serviceCatalog.iconDataUrl('Chain Games');
  assert(serviceIcon.startsWith('./assets/chain-games-') && serviceIcon.endsWith('.svg'),
    'Chain Games must resolve to its bundled local SVG asset family without Buffer.');
  assert(!/^https?:\/\//i.test(serviceIcon), 'Chain Games artwork must not require the network.');
  assert(fs.existsSync(path.join(root, 'src/main', serviceIcon.replace(/^\.\//, ''))),
    'Chain Games local SVG must exist in packaged source.');
  const tokenIcon = tokenIcons.getIconMatch({ name: 'Chain Games — Ethereum', symbol: 'CHAIN' });
  assert(tokenIcon && tokenIcon.src === serviceIcon,
    'CHAIN Assets must share the same local Chain Games artwork source while Buffer is unavailable.');
} finally {
  global.Buffer = savedBuffer;
}

const records = assetPresets.buildRecords('Chain Games', 'Web3 / Website Account', 'test-created');
assert.strictEqual(records.length, 3);
assert(records.every((record) => record.symbol === 'CHAIN'));
assert(records.some((record) => record.customFields.some((field) => field.label === 'Network' && field.value === 'Ethereum')));
assert(records.some((record) => record.customFields.some((field) => field.label === 'Network' && field.value === 'Polygon')));
assert(records.some((record) => record.customFields.some((field) => field.label === 'Network' && field.value === 'Chain Games Supernet')));

const trustedRecords = dataWrite.buildTrustedStarterRecords({ name: 'Chain Games', category: 'Web3 / Website Account' }, 'test-created');
assert.strictEqual(trustedRecords.length, 3, 'The main-process write service must create the reviewed Chain Games starter records.');
const dataSource = read('src/main/data-write-service.js');
assert(dataSource.includes('records: buildTrustedStarterRecords(patch, created)'),
  'Starter enrichment must run inside authoritative Vault Item creation rather than around renderer IPC.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/vault-item-save-forwarder.js')), false,
  'The obsolete renderer IPC-send wrapper must stay removed.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/vault-item-asset-seeding-ui.js')), false,
  'The obsolete renderer seeding/refresh helper must stay removed.');

console.log(`PASS SafeLedger ${pkg.version} preserves sandbox-safe local Chain Games artwork and save safety with main-owned starter Asset creation.`);
