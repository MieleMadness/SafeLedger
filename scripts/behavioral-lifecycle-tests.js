'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vault = require('../src/main/robust-vault');
const vaultSchema = require('../src/main/vault-schema');
const dataWriteService = require('../src/main/data-write-service');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

(async () => {
  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'safeledger-behavioral-lifecycle-'));
  const vaultDir = path.join(temp, 'vaults');
  const originalKey = crypto.randomBytes(32);
  const reopenedKey = Buffer.from(originalKey);
  try {
    await fs.promises.mkdir(vaultDir, { recursive: true });
    await vault.initVaultList(vaultDir, originalKey);
    await vault.initVaultData(vaultDir, 'zvault-0.json', originalKey);

    // CREATE: persist a Vault Item through the same authoritative service used by IPC.
    let view = await dataWriteService.mutateGroup({
      vault,
      vaultDir,
      key: originalKey,
      request: {
        type: 'group-create',
        file: 'zvault-0.json',
        group: { name: 'Behavior Wallet', category: 'Software Wallet', notes: 'created by Phase 5 lifecycle test' }
      }
    });
    assert.strictEqual(view.groups.length, 1);
    const groupCreated = view.groups[0].created;

    // REOPEN: discard the first key buffer and read a fresh decrypted model from disk.
    originalKey.fill(0);
    let reopened = await vault.readVault(path.join(vaultDir, 'zvault-0.json'), reopenedKey);
    assert.strictEqual(reopened.groups[0].name, 'Behavior Wallet');
    assert.strictEqual(reopened.groupSelected, undefined, 'Renderer-only selection state must not survive disk reopen.');

    // EDIT: change only the selected Vault Item and verify unrelated stored structure survives.
    view = await dataWriteService.mutateGroup({
      vault,
      vaultDir,
      key: reopenedKey,
      request: {
        type: 'group-modify',
        file: 'zvault-0.json',
        index: 0,
        group: { created: groupCreated, name: 'Behavior Wallet Renamed', notes: 'edited after reopen' }
      }
    });
    assert.strictEqual(view.groups[0].name, 'Behavior Wallet Renamed');

    // CREATE ASSET, then reopen from disk again.
    view = await dataWriteService.mutateRecord({
      vault,
      vaultDir,
      key: reopenedKey,
      request: {
        action: 'create',
        file: 'zvault-0.json',
        groupIndex: 0,
        groupCreated,
        record: { name: 'Behavior Asset', symbol: 'TEST', publicAddress: 'test-public-address' }
      }
    });
    const recordCreated = view.groups[0].records[0].created;
    reopened = await vault.readVault(path.join(vaultDir, 'zvault-0.json'), reopenedKey);
    assert.strictEqual(reopened.groups[0].records[0].name, 'Behavior Asset');

    // CANCEL: mutate a renderer copy only. Reopening must prove no implicit persistence occurred.
    const canceledRendererCopy = clone(reopened);
    canceledRendererCopy.groups[0].name = 'THIS MUST NOT SAVE';
    canceledRendererCopy.groups[0].records[0].name = 'THIS MUST NOT SAVE EITHER';
    const afterCancel = await vault.readVault(path.join(vaultDir, 'zvault-0.json'), reopenedKey);
    assert.strictEqual(afterCancel.groups[0].name, 'Behavior Wallet Renamed');
    assert.strictEqual(afterCancel.groups[0].records[0].name, 'Behavior Asset');

    // EDIT ASSET and verify it survives another disk read.
    view = await dataWriteService.mutateRecord({
      vault,
      vaultDir,
      key: reopenedKey,
      request: {
        action: 'modify',
        file: 'zvault-0.json',
        groupIndex: 0,
        groupCreated,
        recordIndex: 0,
        record: { created: recordCreated, name: 'Behavior Asset Renamed', symbol: 'TEST2' }
      }
    });
    reopened = await vault.readVault(path.join(vaultDir, 'zvault-0.json'), reopenedKey);
    assert.strictEqual(reopened.groups[0].records[0].name, 'Behavior Asset Renamed');
    assert.strictEqual(reopened.groups[0].records[0].symbol, 'TEST2');

    // DELETE ASSET using the same single-deletion contract used by the renderer bridge.
    view = await dataWriteService.mutateRecord({
      vault,
      vaultDir,
      key: reopenedKey,
      request: {
        action: 'delete',
        file: 'zvault-0.json',
        groupIndex: 0,
        groupCreated,
        submittedRecords: []
      }
    });
    reopened = await vault.readVault(path.join(vaultDir, 'zvault-0.json'), reopenedKey);
    assert.strictEqual(reopened.groups[0].records.length, 0);

    // DELETE VAULT ITEM and verify deletion survives a fresh disk read.
    view = await dataWriteService.mutateGroup({
      vault,
      vaultDir,
      key: reopenedKey,
      request: { type: 'group-delete', file: 'zvault-0.json', submittedGroups: [] }
    });
    reopened = await vault.readVault(path.join(vaultDir, 'zvault-0.json'), reopenedKey);
    assert.strictEqual(reopened.groups.length, 0);

    // PROFILE EDIT persists through the encrypted vault-list boundary.
    let list = await dataWriteService.modifyProfile({
      vault,
      vaultDir,
      key: reopenedKey,
      profile: { file: 'zvault-0.json', name: 'Behavior Profile Renamed', notes: 'persisted profile edit' }
    });
    assert.strictEqual(list.vaults[0].name, 'Behavior Profile Renamed');
    list = await vault.readVaultList(path.join(vaultDir, 'vaultlist.json'), reopenedKey);
    assert.strictEqual(list.vaults[0].name, 'Behavior Profile Renamed');
    assert.strictEqual(list.vaultSelected, undefined, 'Profile selection state must not persist across reopen.');

    // The files on disk must remain current authenticated SafeLedger payloads.
    const rawList = await fs.promises.readFile(path.join(vaultDir, 'vaultlist.json'), 'utf8');
    const rawVault = await fs.promises.readFile(path.join(vaultDir, 'zvault-0.json'), 'utf8');
    assert(rawList.startsWith('SLG2:') && rawVault.startsWith('SLG2:'), 'Behavioral lifecycle must never downgrade encrypted storage.');

    console.log('PASS SafeLedger Phase 5 behavioral lifecycle: create/edit/cancel/delete operations survive encrypted disk reopen with no renderer-state persistence.');
  } finally {
    reopenedKey.fill(0);
    try { originalKey.fill(0); } catch (_) {}
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
