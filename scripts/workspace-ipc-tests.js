'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createWorkspaceOperationQueue } = require('../src/main/workspace-operation-queue');
const mutation = require('../src/main/workspace-mutation-command');
const dataWrite = require('../src/main/data-write-service');
const vault = require('../src/main/robust-vault');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const clone = (value) => JSON.parse(JSON.stringify(value));

async function testMainProcessQueue() {
  const run = createWorkspaceOperationQueue();
  let active = 0;
  let peak = 0;
  const order = [];
  const tasks = [
    run(async () => {
      active++; peak = Math.max(peak, active); order.push('first');
      await Promise.resolve();
      active--; return { id: 1 };
    }),
    run(async () => {
      active++; peak = Math.max(peak, active); order.push('second');
      active--; throw Error('intentional error');
    }),
    run(async () => {
      active++; peak = Math.max(peak, active); order.push('third');
      active--; return { id: 3 };
    })
  ];
  const results = await Promise.allSettled(tasks);
  assert.deepStrictEqual(order, ['first', 'second', 'third']);
  assert.strictEqual(peak, 1, 'Main-process writes/reads must not overlap.');
  assert.strictEqual(results[0].value.id, 1);
  assert.strictEqual(results[1].status, 'rejected');
  assert.strictEqual(results[2].value.id, 3, 'A rejected transaction must not poison later requests.');
  await assert.rejects(run('not callable'), /must be a function/);
}

async function testNarrowEncryptedMutations() {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'safeledger-workspace-command-'));
  const key = crypto.randomBytes(32);
  const file = 'zvault-0.json';
  const a = { name: 'Wallet Alpha', created: 'shared', records: [
    { name: 'Bitcoin', symbol: 'BTC', created: 'shared-asset', publicAddress: 'old' }
  ] };
  const b = { name: 'Wallet Beta', created: 'shared', records: [] };
  try {
    await vault.saveVault(path.join(dir, file), JSON.stringify({ file, groups: [a, b] }), key);
    const ui = { file, groupSelected: 0, recordSelected: 0, groups: clone([a, b]) };
    const originalGroup = clone(ui.groups[0]);
    ui.groups[0].notes = 'edited by selected command';
    const cmd = mutation.groupCommand({ type: 'group-modify', vaultData: ui, originalGroup });
    assert.strictEqual(cmd.file, file);
    assert(!Object.prototype.hasOwnProperty.call(cmd, 'vaultData'));
    assert(!JSON.stringify(cmd).includes('Wallet Beta'), 'Wallet command must not include unrelated Wallets.');
    const result = await dataWrite.mutateGroup({ vault, vaultDir: dir, key,
      request: dataWrite.groupCommandRequest(cmd) });
    assert.strictEqual(result.groups[0].notes, 'edited by selected command');

    // Reuse of the original snapshot after any update must fail instead of
    // silently applying a second stale change to the current Wallet.
    await assert.rejects(dataWrite.mutateGroup({ vault, vaultDir: dir, key,
      request: dataWrite.groupCommandRequest(cmd) }), /changed or no longer exists/);

    const actual = await vault.readVault(path.join(dir, file), key);
    const current = clone(actual.groups[0]);
    const coinBefore = clone(current.records[0]);
    const recUi = { file, groupSelected: 0, recordSelected: 0, groups: clone(actual.groups) };
    recUi.groups[0].records[0].publicAddress = 'new';
    const recCmd = mutation.recordCommand({
      action: 'modify', vaultData: recUi, originalGroup: current, originalRecord: coinBefore
    });
    assert(!Object.prototype.hasOwnProperty.call(recCmd, 'vaultData'));
    assert(!JSON.stringify(recCmd).includes('Wallet Beta'), 'Asset command must not send unrelated Wallets.');
    const updated = await dataWrite.mutateRecord({ vault, vaultDir: dir, key,
      request: dataWrite.recordCommandRequest(recCmd) });
    assert.strictEqual(updated.groups[0].records[0].publicAddress, 'new');

    // Delete by exact saved Asset, not an index or the full remaining list.
    const originalWalletForDelete = clone(updated.groups[0]);
    const originalCoinForDelete = clone(originalWalletForDelete.records[0]);
    const deleteUi = { file, groupSelected: 0, recordSelected: null, groups: clone(updated.groups) };
    deleteUi.groups[0].records.splice(0, 1);
    const deleteAsset = mutation.recordCommand({
      action: 'delete', vaultData: deleteUi,
      originalGroup: originalWalletForDelete, originalRecord: originalCoinForDelete
    });
    assert.strictEqual(deleteAsset.submittedRecords, undefined);
    const afterAssetDelete = await dataWrite.mutateRecord({ vault, vaultDir: dir, key,
      request: dataWrite.recordCommandRequest(deleteAsset) });
    assert.strictEqual(afterAssetDelete.groups[0].records.length, 0);
    assert.strictEqual(afterAssetDelete.groups[1].name, 'Wallet Beta');

    const originalBeta = clone(afterAssetDelete.groups[1]);
    const deleteWallet = mutation.groupCommand({
      type: 'group-delete',
      vaultData: { file, groups: [afterAssetDelete.groups[0]], groupSelected: null },
      originalGroup: originalBeta
    });
    assert.strictEqual(deleteWallet.submittedGroups, undefined);
    const afterWalletDelete = await dataWrite.mutateGroup({ vault, vaultDir: dir, key,
      request: dataWrite.groupCommandRequest(deleteWallet) });
    assert.deepStrictEqual(afterWalletDelete.groups.map(g => g.name), ['Wallet Alpha']);
    assert.strictEqual(deleteWallet.originalGroup.name, 'Wallet Beta');

    assert.throws(() => dataWrite.groupCommandRequest({
      type: 'group-modify', vaultData: ui, originalGroup
    }), /snapshots are no longer accepted/);
    assert.throws(() => dataWrite.recordCommandRequest({
      action: 'modify', vaultData: recUi, originalRecord: coinBefore
    }), /snapshots are no longer accepted/);
  } finally {
    key.fill(0);
    await fs.promises.rm(dir, { recursive: true, force: true });
  }
}

function testIpcBoundary() {
  const preload = read('src/main/preload.js');
  const main = read('src/main/main.js');
  const services = read('src/main/renderer-services.js');
  const groupUi = read('src/main/group.js');
  const recordUi = read('src/main/record.js');
  const names = ['read', 'read-vaultlist-init', 'process-vault-list', 'vault-list-delete', 'process-group', 'process-record'];
  for (const name of names) {
    assert(main.includes(`ipc.handle('${name}'`), `Main must own a specific invoke reply for ${name}.`);
    assert(!main.includes(`ipc.on('${name}'`), `Legacy shared reply ownership must be retired: ${name}.`);
    assert(preload.includes(`invoke('${name}'`), `Preload must invoke ${name} without shared-event racing.`);
  }
  assert(!preload.includes('requestResult(') && !preload.includes('resultRequestQueue'),
    'Shared-result queue and listener matching must be absent.');
  assert(main.includes('runWorkspaceOperation(async () =>'),
    'Main must serialize workspace operations even across parallel direct IPC calls.');
  assert(services.includes('mutationCommand.groupCommand(params)'));
  assert(services.includes('mutationCommand.recordCommand(params)'));
  assert(groupUi.includes("type: 'group-delete', vaultData: params.vaultData, originalGroup"));
  assert(recordUi.includes("action: 'delete', vaultData: params.vaultData, originalGroup, originalRecord"));
  assert(!main.includes('dataWriteService.legacyGroupRequest(params)'));
  assert(!main.includes('dataWriteService.legacyRecordRequest(params)'));
  assert(main.includes('assertTrustedEvent(event)'), 'Main must retain trusted-window ownership.');
  assert(preload.includes("onLockoutDestroy: (callback) => subscribe('result-lockout-destroy'"),
    'Self-Destruct notification must remain an explicit out-of-band safety event.');
}

(async () => {
  await testMainProcessQueue();
  await testNarrowEncryptedMutations();
  testIpcBoundary();
  console.log('PASS trusted workspace IPC has per-request responses, serialized main operations, and narrow authoritative Wallet/Asset edits and deletions.');
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
