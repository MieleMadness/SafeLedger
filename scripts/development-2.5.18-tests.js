'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const version = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const atLeast2518 = version[0] > 2 || (version[0] === 2 && version[1] > 5) || (version[0] === 2 && version[1] === 5 && version[2] >= 18);
assert(atLeast2518, 'build must be SafeLedger 2.5.18 or later');

const writes = read('src/main/data-write-service.js');
const renderer = read('src/main/renderer.js');
assert(writes.includes("const assetPresets = require('./vault-item-asset-presets');"),
  'Reviewed starter Assets must remain available to new known Vault Items.');
assert(writes.includes('records: buildTrustedStarterRecords(patch, created)'),
  'Starter Asset seeding must occur inside the authoritative Vault Item creation write.');
assert(renderer.includes("if (params.type === 'group-create' || params.type === 'group-modify')"));
assert(renderer.includes('record.listRecords({ vaultData, saving });'),
  'The returned authoritative Asset list must render immediately after Vault Item save.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/vault-item-asset-seeding-ui.js')), false,
  'The old synthetic post-save refresh must stay retired.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/vault-item-save-forwarder.js')), false,
  'The old IPC-send monkeypatch must stay retired.');

console.log(`PASS SafeLedger ${pkg.version} keeps immediate seeded Asset rendering while Phase 4 moves seeding to the authoritative main write path.`);
