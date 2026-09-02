'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const serviceCatalog = require(path.join(root, 'src/main/service-catalog.js'));
const tokenIcons = require(path.join(root, 'src/main/token-icons.js'));
const assetPresets = require(path.join(root, 'src/main/vault-item-asset-presets.js'));

assert.strictEqual(pkg.version, '2.6.3', 'SafeLedger Chain Games save hotfix must report version 2.6.3.');

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

const seedingSource = read('src/main/vault-item-asset-seeding-ui.js');
assert(seedingSource.includes("if (channel === 'process-group')"));
assert(seedingSource.includes('try {\n        seedCreateRequest(args[0]);'),
  'Preset seeding must be isolated from the actual Vault Item save request.');
assert(seedingSource.includes('return originalSend(channel, ...args);'),
  'The encrypted save IPC request must still be sent even if optional preset seeding throws.');
assert(seedingSource.includes('must never prevent the actual encrypted Vault Item save request'),
  'The save-path invariant should remain documented beside the guard.');

console.log('PASS SafeLedger 2.6.3 keeps Chain Games preset seeding sandbox-safe and cannot strand Vault Item saves before IPC.');
