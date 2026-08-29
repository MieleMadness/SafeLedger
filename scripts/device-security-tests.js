'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const sessionLock = require('../src/main/session-lock-main');
const deviceSecurity = require('../src/main/device-security-main');

async function testCentralLockController() {
  const sequence = [];
  let unlocked = true;
  let audits = 0;
  const cryptoSession = {
    isUnlocked: () => unlocked,
    clearSession: () => { sequence.push('clear'); unlocked = false; }
  };
  const win = {
    isDestroyed: () => false,
    minimize: () => sequence.push('minimize'),
    webContents: {
      send: (channel, payload) => sequence.push(`send:${channel}:${payload.reason}`),
      reload: () => sequence.push('reload')
    }
  };
  const controller = sessionLock.createSessionLockController({
    cryptoSession,
    getMainWindow: () => win,
    getDataRoot: () => '/safeledger-test',
    audit: async (_root, eventName) => { audits++; sequence.push(`audit:${eventName}`); }
  });

  const first = controller.lockSession('emergency-lock', { minimize: true, reload: true });
  assert.strictEqual(first.wasUnlocked, true);
  assert.strictEqual(first.reason, 'session-locked-manual');
  assert.strictEqual(sequence[0], 'clear', 'DEK must be cleared before any UI/audit work');
  assert(sequence.includes('minimize'));
  assert(sequence.includes('reload'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(audits, 1);

  const before = sequence.length;
  const second = controller.lockSession('screen-lock');
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(second.wasUnlocked, false);
  assert.strictEqual(audits, 1, 'repeated lock must not create a duplicate transition audit');
  assert.strictEqual(sequence.length, before + 1, 'repeated lock should only clear an already-empty session');

  controller.lockSession('storage-unavailable', { reload: false, forceUi: true });
  assert(sequence.some((entry) => entry.includes('session-locked-storage-unavailable')));
}

async function testStorageIdentityAndHealth() {
  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'safeledger-device-security-'));
  try {
    const first = await deviceSecurity.ensureStorageIdentity(temp);
    const second = await deviceSecurity.ensureStorageIdentity(temp);
    assert.strictEqual(first.id, second.id, 'storage identity must remain stable for the same SafeLedgerData root');
    assert(deviceSecurity.validStorageIdDocument(first));

    const ok = await deviceSecurity.probeStorageIdentity(temp, first.id);
    assert.strictEqual(ok.ok, true);
    const mismatch = await deviceSecurity.probeStorageIdentity(temp, '00000000-0000-0000-0000-000000000000');
    assert.strictEqual(mismatch.ok, false);
    assert.strictEqual(mismatch.reason, 'identity-mismatch');

    const health = await deviceSecurity.getStorageHealth(temp, first.id);
    assert.deepStrictEqual(Object.keys(health).sort(), [
      'connected', 'freeBytes', 'lastCheckedAt', 'portableRoot', 'reason', 'status', 'writable'
    ]);
    assert.strictEqual(health.connected, true);
    assert.strictEqual(health.writable, true);
    assert(!('serial' in health));
    assert(!('deviceId' in health));
    assert(!('volumeId' in health));
  } finally {
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
}

async function testDeviceSecurityEvents() {
  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'safeledger-device-events-'));
  try {
    const powerMonitor = new EventEmitter();
    let idleState = 'active';
    powerMonitor.getSystemIdleState = () => idleState;
    let unlocked = true;
    const locks = [];
    const lockController = {
      isUnlocked: () => unlocked,
      lockSession: (reason, options) => { locks.push({ reason, options }); unlocked = false; }
    };
    const intervals = [];
    const service = deviceSecurity.createDeviceSecurityService({
      powerMonitor,
      lockController,
      getDataRoot: () => temp,
      setIntervalFn: (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; },
      clearIntervalFn: () => {}
    });

    await service.start();
    assert.strictEqual(intervals.length, 2);
    assert.strictEqual(intervals[0].ms, deviceSecurity.STORAGE_PROBE_INTERVAL_MS);
    assert.strictEqual(intervals[1].ms, deviceSecurity.IDLE_POLL_INTERVAL_MS);

    powerMonitor.emit('lock-screen');
    assert.strictEqual(locks.pop().reason, 'screen-lock');

    unlocked = true;
    powerMonitor.emit('suspend');
    assert.strictEqual(locks.pop().reason, 'suspend');

    unlocked = true;
    powerMonitor.emit('resume');
    assert.strictEqual(locks.pop().reason, 'resume');

    unlocked = true;
    idleState = 'locked';
    service.checkIdleState();
    assert.strictEqual(locks.pop().reason, 'idle-state');

    unlocked = true;
    await fs.promises.unlink(path.join(temp, deviceSecurity.STORAGE_ID_FILE));
    await service.checkStorage();
    const storageLock = locks.pop();
    assert.strictEqual(storageLock.reason, 'storage-unavailable');
    assert.strictEqual(storageLock.options.reload, false);
    assert.strictEqual(storageLock.options.forceUi, true);

    service.stop();
  } finally {
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
}

function testStaticBootstrapBoundary() {
  const root = path.join(__dirname, '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const bootstrap = fs.readFileSync(path.join(root, 'src/main/bootstrap.js'), 'utf8');
  const preload = fs.readFileSync(path.join(root, 'src/main/preload.js'), 'utf8');
  const rendererBridge = fs.readFileSync(path.join(root, 'src/main/renderer-bridge.js'), 'utf8');
  const rendererSecurity = fs.readFileSync(path.join(root, 'src/main/security-enhancements.js'), 'utf8');
  const service = fs.readFileSync(path.join(root, 'src/main/device-security-main.js'), 'utf8');

  assert.strictEqual(pkg.main, 'src/main/bootstrap.js');
  assert(bootstrap.includes("ipc.removeAllListeners('panic-lock')"));
  assert(bootstrap.includes('lockController.lockSession'));
  assert(bootstrap.includes("ipc.handle('device-storage-health'"));
  assert(preload.includes('getStorageHealth'));
  assert(preload.includes('onSecuritySessionLocked'));
  assert(rendererBridge.includes("'security-session-locked': 'onSecuritySessionLocked'"));
  assert(rendererSecurity.includes("ipc.on('security-session-locked'"));
  assert(service.includes("lockController.lockSession('storage-unavailable'"));
  assert(!service.includes('scrubContent'), 'device security must never invoke Self-Destruct cleanup');
}

(async () => {
  await testCentralLockController();
  await testStorageIdentityAndHealth();
  await testDeviceSecurityEvents();
  testStaticBootstrapBoundary();
  console.log('PASS SafeLedger 2.3 centralized locks, OS events, storage identity/disconnect protection, and sanitized Storage Health.');
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
