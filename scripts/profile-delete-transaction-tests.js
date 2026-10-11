'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const robustVault = require('../src/main/robust-vault');
const dataWrite = require('../src/main/data-write-service');
const deletion = require('../src/main/profile-delete-transaction');

const PROFILE = 'zvault-1.json';
const listFile = (dir) => path.join(dir, 'vaultlist.json');
const profileFile = (dir) => path.join(dir, PROFILE);
const markerFile = (dir) => deletion._test.markerPath(dir);
const stagedFile = (dir) => deletion._test.stagedPath(dir, PROFILE);

async function fixture(base, name, key) {
  const dir = path.join(base, name);
  await fs.promises.mkdir(dir, { recursive: true });
  await robustVault.saveVault(listFile(dir), JSON.stringify({
    vaults: [{ id: 1, file: PROFILE, name: 'Recoverable Profile' }]
  }), key);
  await robustVault.saveVault(profileFile(dir), JSON.stringify({
    file: PROFILE, groups: [{ name: 'Test Wallet', records: [{ name: 'Test Coin' }] }]
  }), key);
  return dir;
}

async function marker(dir) {
  await fs.promises.writeFile(markerFile(dir), JSON.stringify({
    format: deletion._test.MARKER_FORMAT, version: 1, file: PROFILE
  }), { mode: 0o600 });
}
async function removeFromList(dir, key) {
  await robustVault.saveVault(listFile(dir), JSON.stringify({ vaults: [] }), key);
}
async function assertProfileIntact(dir, key) {
  const decrypted = await robustVault.readVault(profileFile(dir), key);
  assert.strictEqual(decrypted.groups[0].records[0].name, 'Test Coin');
}

async function main() {
  const base = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'safeledger-profile-delete-'));
  const key = crypto.randomBytes(32);
  const readList = robustVault.readVaultList;
  try {
    const normal = await fixture(base, 'normal', key);
    const view = await dataWrite.deleteProfile({ vault: robustVault, vaultDir: normal, key, fileName: PROFILE });
    assert.deepStrictEqual(view.vaults, []);
    assert.deepStrictEqual((await robustVault.readVaultList(listFile(normal), key)).vaults, []);
    assert.strictEqual(fs.existsSync(profileFile(normal)), false);
    assert.strictEqual(fs.existsSync(stagedFile(normal)), false);
    assert.strictEqual(fs.existsSync(markerFile(normal)), false);

    // Interrupted immediately after journal creation: the original file and
    // its authenticated list entry must be preserved.
    const beforeRename = await fixture(base, 'before-rename', key);
    await marker(beforeRename);
    assert.strictEqual((await deletion.recoverPending(beforeRename, key, readList)).committed, false);
    await assertProfileIntact(beforeRename, key);
    assert.strictEqual(fs.existsSync(markerFile(beforeRename)), false);

    // Interrupted after rename but BEFORE publishing the list: restore file.
    const beforeCommit = await fixture(base, 'before-commit', key);
    await marker(beforeCommit);
    await fs.promises.rename(profileFile(beforeCommit), stagedFile(beforeCommit));
    assert.strictEqual((await deletion.recoverPending(beforeCommit, key, readList)).committed, false);
    await assertProfileIntact(beforeCommit, key);
    assert.strictEqual(fs.existsSync(stagedFile(beforeCommit)), false);

    // Interrupted AFTER publishing the list but before deleting the stage:
    // finish the delete; do not recreate a profile the user already removed.
    const afterCommit = await fixture(base, 'after-commit', key);
    await marker(afterCommit);
    await fs.promises.rename(profileFile(afterCommit), stagedFile(afterCommit));
    await removeFromList(afterCommit, key);
    assert.strictEqual((await deletion.recoverPending(afterCommit, key, readList)).committed, true);
    assert.strictEqual(fs.existsSync(profileFile(afterCommit)), false);
    assert.strictEqual(fs.existsSync(stagedFile(afterCommit)), false);

    // Failed atomic index commit must put the file back and leave list intact.
    const failedSave = await fixture(base, 'failed-save', key);
    await assert.rejects(deletion.deleteProfile({
      vaultDir: failedSave, profileFile: PROFILE, cryptoKey: key, nextList: { vaults: [] },
      readList, saveList: async () => { throw new Error('Simulated write failure'); }
    }), /Simulated write failure/);
    await assertProfileIntact(failedSave, key);
    assert.strictEqual((await readList(listFile(failedSave), key)).vaults.length, 1);
    assert.strictEqual(fs.existsSync(markerFile(failedSave)), false);

    // A file rename can succeed even if the writer reports a later failure.
    // The authoritative list decides the outcome, not the exception.
    const committedOnError = await fixture(base, 'committed-error', key);
    const committed = await deletion.deleteProfile({
      vaultDir: committedOnError, profileFile: PROFILE, cryptoKey: key,
      nextList: { vaults: [] }, readList,
      saveList: async (...args) => {
        await robustVault.saveVault(...args);
        throw new Error('Failure after commit');
      }
    });
    assert.strictEqual(committed.committed, true);
    assert.strictEqual(fs.existsSync(profileFile(committedOnError)), false);
    assert.strictEqual(fs.existsSync(stagedFile(committedOnError)), false);

    // If filesystem cleanup fails after list commit, retain both stage and
    // marker so the next successful unlock can safely retry cleanup.
    const cleanupFailure = await fixture(base, 'cleanup-failure', key);
    const injected = {
      stat: (...args) => fs.promises.stat(...args),
      readFile: (...args) => fs.promises.readFile(...args),
      rename: (...args) => fs.promises.rename(...args),
      unlink: async (file) => {
        if (file === stagedFile(cleanupFailure)) throw new Error('Drive disconnected');
        return fs.promises.unlink(file);
      }
    };
    const pending = await deletion.deleteProfile({
      vaultDir: cleanupFailure, profileFile: PROFILE, cryptoKey: key,
      nextList: { vaults: [] }, readList, saveList: robustVault.saveVault, io: injected
    });
    assert.strictEqual(pending.cleanupPending, true);
    assert.strictEqual(fs.existsSync(stagedFile(cleanupFailure)), true);
    assert.strictEqual(fs.existsSync(markerFile(cleanupFailure)), true);
    assert.strictEqual((await deletion.recoverPending(cleanupFailure, key, readList)).committed, true);
    assert.strictEqual(fs.existsSync(stagedFile(cleanupFailure)), false);

    // An unreadable encrypted index must NEVER authorize deleting or
    // overwriting the retained encrypted Profile.
    const corrupt = await fixture(base, 'corrupt-index', key);
    await marker(corrupt);
    await fs.promises.rename(profileFile(corrupt), stagedFile(corrupt));
    await assert.rejects(deletion.recoverPending(corrupt, key, async () => { throw Error('Unreadable index'); }), /Unreadable index/);
    assert(fs.existsSync(stagedFile(corrupt)) && fs.existsSync(markerFile(corrupt)));
    await deletion.recoverPending(corrupt, key, readList);
    await assertProfileIntact(corrupt, key);

    const invalid = await fixture(base, 'invalid-marker', key);
    await fs.promises.writeFile(markerFile(invalid), JSON.stringify({ format: 'unknown', file: PROFILE }));
    await assert.rejects(deletion.recoverPending(invalid, key, readList), /invalid/i);
    await assertProfileIntact(invalid, key);

    const source = fs.readFileSync(path.join(__dirname, '../src/main/main.js'), 'utf8');
    assert(source.includes('profileDeleteTransaction.recoverPending(vaultDir, key, vault.readVaultList)'),
      'Unlock must reconcile deletion before showing the Profile list.');
    assert.strictEqual(await deletion.recoverPending(normal, key, readList).then(v => v.recovered), false);

    console.log('PASS interrupted Profile deletion restores or finalizes exactly once from authenticated state; ambiguous or corrupt state never removes recoverable data.');
  } finally {
    key.fill(0);
    await fs.promises.rm(base, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
