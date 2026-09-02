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
const { createSeededSend } = require(path.join(root, 'src/main/vault-item-save-forwarder.js'));

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 3,
  'SafeLedger 2.6.3 save-safety gates must continue to apply to later 2.6.x patches.');

const serviceSource = read('src/main/service-catalog.js');
assert(!serviceSource.includes('Buffer.from('), 'Renderer service icons must not require Node Buffer.');
assert(serviceSource.includes('encodeURIComponent(svg)'), 'Renderer service icons must use sandbox-safe URI encoding.');

const savedBuffer = global.Buffer;
try {
  global.Buffer = undefined;
  const serviceIcon = serviceCatalog.iconDataUrl('Chain Games');
  assert(serviceIcon.startsWith('data:image/svg+xml;charset=utf-8,'), 'Chain Games service icon must be a local SVG data URL.');
  assert(decodeURIComponent(serviceIcon.split(',').slice(1).join(',')).includes('<svg'), 'Encoded service icon must contain SVG markup.');

  const tokenIcon = tokenIcons.getIconMatch({ name: 'Chain Games — Ethereum', symbol: 'CHAIN' });
  assert(tokenIcon && tokenIcon.src && tokenIcon.src.startsWith('data:image/svg+xml;charset=utf-8,'),
    'Reviewed CHAIN icon lookup must work in a renderer without Buffer.');
} finally {
  global.Buffer = savedBuffer;
}

const records = assetPresets.buildRecords('Chain Games', 'Web3 / Website Account', 'test-created');
assert.strictEqual(records.length, 3, 'Chain Games must continue to seed its three reviewed network entries.');
assert(records.every((record) => record.symbol === 'CHAIN'));
assert(records.some((record) => record.customFields.some((field) => field.label === 'Network' && field.value === 'Ethereum')));
assert(records.some((record) => record.customFields.some((field) => field.label === 'Network' && field.value === 'Polygon')));
assert(records.some((record) => record.customFields.some((field) => field.label === 'Network' && field.value === 'Chain Games Supernet')));

let forwarded = null;
let logged = 0;
const request = { type: 'group-create', vaultData: { file: 'zvault-0.json', groups: [] } };
const sendWithBrokenPreset = createSeededSend(
  (channel, payload) => { forwarded = { channel, payload }; return 'FORWARDED'; },
  () => { throw new Error('synthetic preset failure'); },
  () => { logged += 1; }
);
assert.strictEqual(sendWithBrokenPreset('process-group', request), 'FORWARDED');
assert.deepStrictEqual(forwarded, { channel: 'process-group', payload: request },
  'A preset enrichment exception must not block the encrypted Vault Item save IPC request.');
assert.strictEqual(logged, 1, 'Preset enrichment failure should be logged once.');

forwarded = null;
const sendWithBrokenLogger = createSeededSend(
  (channel, payload) => { forwarded = { channel, payload }; return 'FORWARDED'; },
  () => { throw new Error('synthetic preset failure'); },
  () => { throw new Error('synthetic logger failure'); }
);
assert.strictEqual(sendWithBrokenLogger('process-group', request), 'FORWARDED');
assert.deepStrictEqual(forwarded, { channel: 'process-group', payload: request },
  'Even diagnostic logging failure must not block the encrypted Vault Item save IPC request.');

const seedingSource = read('src/main/vault-item-asset-seeding-ui.js');
assert(seedingSource.includes("require('./vault-item-save-forwarder')"));
assert(seedingSource.includes('createSeededSend(originalSend, seedCreateRequest'));
const forwarderSource = read('src/main/vault-item-save-forwarder.js');
assert(forwarderSource.includes("if (channel === 'process-group')"));
assert(forwarderSource.includes('return originalSend(channel, ...args);'));
assert(forwarderSource.includes('must never prevent the encrypted'));

console.log(`PASS SafeLedger ${pkg.version} preserves the 2.6.3 sandbox-safe Chain Games save-forwarding regression.`);
