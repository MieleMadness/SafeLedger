'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const dataWrite = require('../src/main/data-write-service.js');
const recordSource = read('src/main/record.js');
const dataWriteSource = read('src/main/data-write-service.js');

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 55,
  'SafeLedger 2.6.55 selected-Asset targeting regressions must remain active on 2.6.55 and later 2.6.x candidates.');
assert(recordSource.includes('const originalRecord = cloneValue(params.record);'));
assert(recordSource.includes('const submittedVaultData = cloneValue(params.vaultData);'));
assert(recordSource.includes("ipc.send('process-record', {"),
  'Asset saves must continue through the canonical process-record bridge.');
assert(recordSource.includes('originalRecord,'),
  'Asset modify requests must carry the original selected Asset snapshot into the authoritative writer.');
assert(!recordSource.includes('records.sort(utils.compareIgnoreCase)'));
assert(dataWriteSource.includes('function resolveRecordModifyIndex(items, requestedIndex, originalRecord, candidate)'));
assert(dataWriteSource.includes('.filter(({ item }) => exactEqual(item, originalRecord))'));

const sharedCreated = '2026-09-07T12:00:00.000Z';
const authoritativeAssets = [
  { name: 'Ethereum', symbol: 'ETH', created: sharedCreated, publicAddress: '' },
  { name: 'Bitcoin', symbol: 'BTC', created: sharedCreated, publicAddress: '' }
];
const originalBitcoin = JSON.parse(JSON.stringify(authoritativeAssets[1]));
const editedBitcoin = Object.assign({}, originalBitcoin, { publicAddress: 'bc1q-safeledger-test' });
assert.strictEqual(dataWrite.resolveRecordModifyIndex(authoritativeAssets, 0, originalBitcoin, editedBitcoin), 1,
  'The selected Bitcoin Asset must resolve by its exact original authoritative record even if renderer order points at Ethereum.');
assert.strictEqual(dataWrite.resolveRecordModifyIndex(authoritativeAssets, 0, Object.assign({}, originalBitcoin, { publicAddress: 'stale' }), editedBitcoin), -1,
  'A stale original Asset snapshot must fail closed rather than guessing by renderer index.');

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.54-tests.js')], { stdio: 'pipe' });
for (const relative of ['src/main/record.js', 'src/main/data-write-service.js', 'scripts/hotfix-2.6.55-tests.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}
console.log(`PASS SafeLedger ${pkg.version} updates the exact selected Asset even when starter Assets share timestamps and renderer order differs.`);
