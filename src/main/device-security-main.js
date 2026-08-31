'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { atomicWriteJson } = require('./atomic-file');

const STORAGE_ID_FILE = 'storage-id.json';
const STORAGE_ID_FORMAT = 'safeledger-storage-id';
const STORAGE_ID_VERSION = 1;
const STORAGE_PROBE_INTERVAL_MS = 3000;
const IDLE_POLL_INTERVAL_MS = 5000;
const IDLE_THRESHOLD_SECONDS = 30;
const LOW_SPACE_BYTES = 250 * 1024 * 1024;

function storageIdPath(dataRoot) {
  return path.join(dataRoot, STORAGE_ID_FILE);
}

function newStorageIdentity() {
  return {
    format: STORAGE_ID_FORMAT,
    version: STORAGE_ID_VERSION,
    id: crypto.randomUUID(),
    created: new Date().toISOString()
  };
}

function validStorageIdDocument(value) {
  return !!value && value.format === STORAGE_ID_FORMAT && value.version === STORAGE_ID_VERSION &&
    typeof value.id === 'string' && /^[0-9a-f-]{32,64}$/i.test(value.id);
}

async function readStorageIdentity(dataRoot) {
  const raw = await fs.promises.readFile(storageIdPath(dataRoot), 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw Object.assign(new Error('SafeLedger storage identity is invalid.'), { code: 'EIDENTITY', cause: err });
  }
  if (!validStorageIdDocument(parsed)) throw Object.assign(new Error('SafeLedger storage identity is invalid.'), { code: 'EIDENTITY' });
  return parsed;
}

async function writeNewStorageIdentity(dataRoot) {
  await fs.promises.mkdir(dataRoot, { recursive: true });
  const created = newStorageIdentity();
  await atomicWriteJson(storageIdPath(dataRoot), created);
  return created;
}

async function ensureStorageIdentity(dataRoot) {
  await fs.promises.mkdir(dataRoot, { recursive: true });
  try {
    return await readStorageIdentity(dataRoot);
  } catch (err) {
    // At process startup there is no trusted in-memory identity yet. A missing
    // or malformed non-secret marker can be repaired safely. Once unlocked,
    // probeStorageIdentity compares against the in-memory baseline and fails
    // closed on any disappearance, corruption, or mismatch.
    if (!err || (err.code !== 'ENOENT' && err.code !== 'EIDENTITY')) throw err;
  }
  return writeNewStorageIdentity(dataRoot);
}

async function probeStorageIdentity(dataRoot, expectedId) {
  try {
    const identity = await readStorageIdentity(dataRoot);
    if (!expectedId || identity.id !== expectedId) return { ok: false, reason: 'identity-mismatch' };
    return { ok: true, reason: 'ok' };
  } catch (err) {
    if (err && err.code === 'EIDENTITY') return { ok: false, reason: 'identity-mismatch' };
    return { ok: false, reason: 'missing' };
  }
}

async function writableProbe(dataRoot) {
  const probeDir = path.join(dataRoot, 'settings');
  const probePath = path.join(probeDir, `.storage-health-${process.pid}-${Date.now()}.tmp`);
  try {
    await fs.promises.mkdir(probeDir, { recursive: true });
    await fs.promises.writeFile(probePath, 'ok', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    await fs.promises.unlink(probePath);
    return true;
  } catch (_) {
    try { await fs.promises.unlink(probePath); } catch (_) {}
    return false;
  }
}

async function freeBytesFor(dataRoot) {
  if (typeof fs.promises.statfs !== 'function') return null;
  try {
    const stats = await fs.promises.statfs(dataRoot);
    const free = Number(stats.bsize) * Number(stats.bavail);
    return Number.isFinite(free) && free >= 0 ? free : null;
  } catch (_) {
    return null;
  }
}

async function getStorageHealth(dataRoot, expectedId) {
  const lastCheckedAt = new Date().toISOString();
  const identity = await probeStorageIdentity(dataRoot, expectedId);
  if (!identity.ok) {
    return {
      connected: false,
      writable: false,
      freeBytes: null,
      portableRoot: dataRoot,
      lastCheckedAt,
      status: 'unavailable',
      reason: identity.reason
    };
  }

  const writable = await writableProbe(dataRoot);
  const freeBytes = await freeBytesFor(dataRoot);
  let status = 'healthy';
  let reason = 'ok';
  if (!writable) {
    status = 'warning';
    reason = 'read-only';
  } else if (freeBytes != null && freeBytes < LOW_SPACE_BYTES) {
    status = 'warning';
    reason = 'low-space';
  }

  return {
    connected: true,
    writable,
    freeBytes,
    portableRoot: dataRoot,
    lastCheckedAt,
    status,
    reason
  };
}

function createDeviceSecurityService(options = {}) {
  const powerMonitor = options.powerMonitor;
  const lockController = options.lockController;
  const getDataRoot = options.getDataRoot;
  const setIntervalFn = options.setIntervalFn || setInterval;
  const clearIntervalFn = options.clearIntervalFn || clearInterval;
  let expectedStorageId = null;
  let storageTimer = null;
  let idleTimer = null;
  let stopping = false;
  let lastIdleState = null;
  let suspendSessionGeneration = null;

  if (!lockController || typeof lockController.lockSession !== 'function') throw new Error('Device security requires a lock controller.');
  if (typeof getDataRoot !== 'function') throw new Error('Device security requires getDataRoot().');

  async function initializeStorageIdentity() {
    const identity = await ensureStorageIdentity(getDataRoot());
    expectedStorageId = identity.id;
    return expectedStorageId;
  }

  async function rotateStorageIdentity() {
    const identity = await writeNewStorageIdentity(getDataRoot());
    expectedStorageId = identity.id;
    return expectedStorageId;
  }

  async function checkStorage() {
    if (stopping || !lockController.isUnlocked()) return { ok: true, skipped: true };
    const probe = await probeStorageIdentity(getDataRoot(), expectedStorageId);
    if (!probe.ok) {
      lockController.lockSession(probe.reason === 'identity-mismatch' ? 'storage-identity-mismatch' : 'storage-unavailable', {
        reload: false,
        forceUi: true
      });
    }
    return probe;
  }

  function readIdleState() {
    if (!powerMonitor || typeof powerMonitor.getSystemIdleState !== 'function') return null;
    try { return powerMonitor.getSystemIdleState(IDLE_THRESHOLD_SECONDS); }
    catch (_) { return null; }
  }

  function checkIdleState() {
    if (stopping) return;
    const currentIdleState = readIdleState();
    if (!currentIdleState) return;

    // Treat the operating-system idle/locked state as an edge-triggered signal,
    // not a level-triggered one. After SafeLedger has already reacted to an OS
    // lock, a user may re-authenticate while the OS still briefly reports the
    // previous "locked" state. Re-locking that new session makes a correct
    // password appear to fail until the application is restarted. A new lock is
    // required only when the OS transitions into "locked" again.
    const previousIdleState = lastIdleState;
    lastIdleState = currentIdleState;
    if (!lockController.isUnlocked()) return;
    if (currentIdleState === 'locked' && previousIdleState !== 'locked') {
      lockController.lockSession('idle-state');
    }
  }

  function currentSessionGeneration() {
    if (!lockController || typeof lockController.getSessionGeneration !== 'function') return null;
    const value = Number(lockController.getSessionGeneration());
    return Number.isInteger(value) && value >= 0 ? value : null;
  }

  function installPowerEvents() {
    if (!powerMonitor || typeof powerMonitor.on !== 'function') return;
    powerMonitor.on('lock-screen', () => {
      lastIdleState = 'locked';
      if (lockController.isUnlocked()) lockController.lockSession('screen-lock');
    });
    powerMonitor.on('unlock-screen', () => {
      lastIdleState = 'active';
    });
    powerMonitor.on('suspend', () => {
      suspendSessionGeneration = lockController.isUnlocked() ? currentSessionGeneration() : null;
      if (lockController.isUnlocked()) lockController.lockSession('suspend');
    });
    powerMonitor.on('resume', () => {
      const generationBeforeSuspend = suspendSessionGeneration;
      suspendSessionGeneration = null;
      const resumedIdleState = readIdleState();
      if (resumedIdleState) lastIdleState = resumedIdleState;
      if (!lockController.isUnlocked()) return;

      const currentGeneration = currentSessionGeneration();
      if (generationBeforeSuspend != null && currentGeneration != null && currentGeneration !== generationBeforeSuspend) {
        // The session was freshly authenticated after the suspend lock. A late
        // resume signal belongs to the previous session and must not destroy
        // the new DEK.
        return;
      }

      // If no usable session-generation information exists, retain the
      // original fail-safe behavior and lock any session present on resume.
      lockController.lockSession('resume');
    });
  }

  async function start() {
    stopping = false;
    await initializeStorageIdentity();
    lastIdleState = readIdleState();
    installPowerEvents();
    storageTimer = setIntervalFn(() => { checkStorage().catch(() => {
      if (lockController.isUnlocked()) lockController.lockSession('storage-unavailable', { reload: false, forceUi: true });
    }); }, STORAGE_PROBE_INTERVAL_MS);
    idleTimer = setIntervalFn(checkIdleState, IDLE_POLL_INTERVAL_MS);
    return { expectedStorageId };
  }

  function stop() {
    stopping = true;
    if (storageTimer) clearIntervalFn(storageTimer);
    if (idleTimer) clearIntervalFn(idleTimer);
    storageTimer = null;
    idleTimer = null;
    lastIdleState = null;
    suspendSessionGeneration = null;
  }

  async function storageHealth() {
    if (!expectedStorageId) await initializeStorageIdentity();
    return getStorageHealth(getDataRoot(), expectedStorageId);
  }

  return {
    start,
    stop,
    checkStorage,
    checkIdleState,
    storageHealth,
    initializeStorageIdentity,
    rotateStorageIdentity,
    getExpectedStorageId: () => expectedStorageId,
    getLastIdleState: () => lastIdleState
  };
}

module.exports = {
  createDeviceSecurityService,
  ensureStorageIdentity,
  writeNewStorageIdentity,
  readStorageIdentity,
  probeStorageIdentity,
  getStorageHealth,
  validStorageIdDocument,
  STORAGE_ID_FILE,
  STORAGE_PROBE_INTERVAL_MS,
  IDLE_POLL_INTERVAL_MS,
  IDLE_THRESHOLD_SECONDS,
  LOW_SPACE_BYTES
};
