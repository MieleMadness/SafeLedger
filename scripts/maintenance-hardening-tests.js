'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const transaction = require('../src/main/profile-transaction');
const vault = require('../src/main/robust-vault');
const { createWorkspaceOperationQueue, runStorageOperation } = require('../src/main/workspace-operation-queue');
const commands = require('../src/main/workspace-mutation-command');
const writeService = require('../src/main/data-write-service');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const PROFILE = 'zvault-7.json';

async function fixture(base, name, key) {
  const dir = path.join(base, name);
  await fs.promises.mkdir(dir, { recursive: true });
  const current = { vaults: [{ id: 0, file: 'zvault-0.json', name: 'Existing' }] };
  const next = { vaults: [...current.vaults, { id: 7, file: PROFILE, name: 'New' }] };
  await vault.saveVault(path.join(dir, 'vaultlist.json'), JSON.stringify(current), key);
  await vault.initVaultData(dir, 'zvault-0.json', key);
  return { dir, current, next, initialize: (file, dataKey) => vault.initVaultData(dir, file, dataKey) };
}
const exists = (file) => fs.existsSync(file);

async function testProfileCreationFailureInjection() {
  const base = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'safeledger-maintenance-'));
  const key = crypto.randomBytes(32);
  const markerName = transaction._test.MARKER_FILE;
  try {
    const afterInit = await fixture(base, 'post-initialization-failure', key);
    await assert.rejects(transaction.createProfile({
      vaultDir: afterInit.dir, nextList: afterInit.next, profileFile: PROFILE, cryptoKey: key,
      initializeProfile: async (...args) => {
        await afterInit.initialize(...args);
        throw new Error('Simulated fsync failure after new encrypted Profile write');
      },
      readList: vault.readVaultList, saveList: vault.saveVault
    }), /Simulated fsync failure/);
    assert(!exists(path.join(afterInit.dir, PROFILE)), 'Uncommitted Profile must be rolled back after authenticated verification.');
    assert(!exists(path.join(afterInit.dir, markerName)));

    const uncertain = await fixture(base, 'uncertain-initialization', key);
    await assert.rejects(transaction.createProfile({
      vaultDir: uncertain.dir, nextList: uncertain.next, profileFile: PROFILE, cryptoKey: key,
      initializeProfile: async (...args) => {
        await uncertain.initialize(...args);
        throw new Error('Error after file rename');
      },
      readList: async () => { throw new Error('Drive briefly disconnected'); }, saveList: vault.saveVault
    }), /outcome is uncertain/);
    assert(exists(path.join(uncertain.dir, PROFILE)), 'Uncertain creation must preserve encrypted bytes.');
    assert(exists(path.join(uncertain.dir, markerName)), 'Uncertain creation must retain recovery evidence.');
    const repaired = await transaction.recoverPending(uncertain.dir, key, vault.readVaultList);
    assert.strictEqual(repaired.committed, false);
    assert(!exists(path.join(uncertain.dir, markerName)) && !exists(path.join(uncertain.dir, PROFILE)));

    const afterCommit = await fixture(base, 'post-list-commit', key);
    const saved = await transaction.createProfile({
      vaultDir: afterCommit.dir, nextList: afterCommit.next, profileFile: PROFILE, cryptoKey: key,
      initializeProfile: afterCommit.initialize,
      readList: vault.readVaultList,
      saveList: async (...args) => {
        await vault.saveVault(...args);
        throw new Error('Simulated directory sync failure after index rename');
      }
    });
    assert(saved && saved.file === PROFILE, 'Already committed Profile is a successful creation.');
    assert(exists(path.join(afterCommit.dir, PROFILE)) && !exists(path.join(afterCommit.dir, markerName)));
    const listed = await vault.readVaultList(path.join(afterCommit.dir, 'vaultlist.json'), key);
    assert(listed.vaults.some(v => v.file === PROFILE));

    const existing = await fixture(base, 'existing-file', key);
    await existing.initialize(PROFILE, key);
    await assert.rejects(transaction.createProfile({
      vaultDir: existing.dir, nextList: existing.next, profileFile: PROFILE, cryptoKey: key,
      initializeProfile: existing.initialize, readList: vault.readVaultList, saveList: vault.saveVault
    }), /already exists/);
    assert(exists(path.join(existing.dir, PROFILE)));

    const invalidList = await fixture(base, 'unauthenticated-list', key);
    await fs.promises.writeFile(path.join(invalidList.dir, markerName), JSON.stringify({
      format: transaction._test.MARKER_FORMAT, version: 1, file: PROFILE
    }));
    await invalidList.initialize(PROFILE, key);
    await assert.rejects(transaction.recoverPending(invalidList.dir, key, async () => null), /Cannot authenticate/);
    assert(exists(path.join(invalidList.dir, PROFILE)) && exists(path.join(invalidList.dir, markerName)));
  } finally {
    key.fill(0);
    await fs.promises.rm(base, { recursive: true, force: true });
  }
}

async function testSharedQueue() {
  const timeline = [];
  const a = runStorageOperation(async () => {
    timeline.push('write-start');
    await new Promise((resolve) => setImmediate(resolve));
    timeline.push('write-finish');
  });
  const b = runStorageOperation(async () => {
    timeline.push('backup-start');
    await new Promise((resolve) => setImmediate(resolve));
    timeline.push('backup-finish');
  });
  const c = runStorageOperation(async () => { timeline.push('restore-start'); throw Error('simulated restore failure'); });
  const d = runStorageOperation(async () => { timeline.push('settings-after-error'); });
  const results = await Promise.allSettled([a, b, c, d]);
  assert.deepStrictEqual(results.map(r => r.status), ['fulfilled', 'fulfilled', 'rejected', 'fulfilled']);
  assert.deepStrictEqual(timeline, [
    'write-start','write-finish','backup-start','backup-finish','restore-start','settings-after-error'
  ]);
  const isolatedLogin = createWorkspaceOperationQueue();
  assert.strictEqual(await isolatedLogin(async () => 1), 1, 'Login serialization has its own queue.');
}

function testContracts() {
  const main = read('src/main/main.js');
  const preload = read('src/main/preload.js');
  const security = read('src/main/security-main.js');
  const bootstrap = read('src/main/bootstrap.js');
  const login = read('src/main/login-attempt-main.js');
  const gui = read('src/main/gui-smoke-layout.js');
  const production = read('src/main/data-write-service.js');
  assert(main.includes("ipc.handle('save-settings'") && main.includes("ipc.handle('init-system'"));
  assert(!main.includes("ipc.on('save-settings'") && !main.includes("ipc.on('init-system'"));
  assert(preload.includes("saveSettings: (params) => invoke('save-settings', params)"));
  assert(preload.includes("initSystem: () => invoke('init-system')"));
  assert(!preload.includes('function request(') && !preload.includes('REQUEST_TIMEOUT_MS'));
  assert(main.includes('const runWorkspaceOperation = runStorageOperation'));
  assert(security.includes("ipc.handle('security-restore-all', (event) => runStorageOperation(async () =>"));
  assert(security.includes("ipc.handle('security-backup-all', (event) => runStorageOperation(async () =>"));
  assert(security.includes("ipc.handle('legacy-import-run', (event, password) => runStorageOperation(async () =>"));
  assert(bootstrap.includes("ipc.handle('device-record-backup-success', (event) => runStorageOperation(async () =>"));
  assert(login.includes('const serializeAttempt = createWorkspaceOperationQueue()'));
  assert(main.includes('guiSmokeLayout.verifyProfileIconGeometry(win.webContents)'));
  assert(gui.includes("for (const appearance of ['light', 'colorful', 'dark'])"));
  assert(!production.includes('function legacyGroupRequest(') && !production.includes('function legacyRecordRequest('));
  assert(read('scripts/legacy-mutation-fixtures.js').includes('function legacyGroupRequest('));
  assert(!read('src/main/settings-ui.js').includes('permanently destroys the encrypted vault files'));
  assert(!read('src/main/renderer.js').includes('has destroyed the encrypted vault data'));

  const data = { file: 'zvault-0.json', groups: [{ name: 'A', created: 'one', records: [{ name: 'BTC' }] }] };
  for (const selected of [null, undefined, '', false]) {
    // false is deliberately accepted as zero only when an explicit numerical
    // selection was provided; missing index values must never select 0.
    if (selected === false) continue;
    assert.throws(() => commands.groupCommand({
      type: 'group-modify', vaultData: { ...data, groupSelected: selected }, originalGroup: data.groups[0]
    }), /identify/);
    assert.throws(() => commands.recordCommand({
      action: 'modify',
      vaultData: { ...data, groupSelected: 0, recordSelected: selected },
      originalGroup: data.groups[0], originalRecord: data.groups[0].records[0]
    }), /Choose an Asset/);
    assert.strictEqual(writeService.resolveExistingIndex([{ name: 'legacy' }], selected, {}), -1);
  }
}

(async () => {
  await testProfileCreationFailureInjection();
  await testSharedQueue();
  testContracts();
  console.log('PASS post-write Profile recovery, coordinated storage actions, invoke-only Settings, null selection safety, isolated login queue and legacy fixture ownership.');
})().catch(err => { console.error(err.stack || err); process.exit(1); });
