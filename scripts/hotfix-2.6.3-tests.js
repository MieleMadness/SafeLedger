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

const savedBuffer = global.Buffer;
try {
  global.Buffer = undefined;
  const serviceIcon = serviceCatalog.iconDataUrl('Chain Games');
  assert(serviceIcon.startsWith('data:image/svg+xml;charset=utf-8,'));
  assert(decodeURIComponent(serviceIcon.split(',').slice(1).join(',')).includes('<svg'));
  const tokenIcon = tokenIcons.getIconMatch({ name: 'Chain Games — Ethereum', symbol: 'CHAIN' });
  assert(tokenIcon && tokenIcon.src && tokenIcon.src.startsWith('data:image/svg+xml;charset=utf-8,'));
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

console.log(`PASS SafeLedger ${pkg.version} preserves sandbox-safe Chain Games artwork and save safety with main-owned starter Asset creation.`);
