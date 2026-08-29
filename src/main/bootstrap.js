'use strict';

const { app, BrowserWindow, ipcMain: ipc, powerMonitor } = require('electron');
const path = require('path');
const runtimeUtils = require('./runtime-utils');
const cryptoSession = require('./crypto-session-main');
const securityMain = require('./security-main');
const settingsManager = require('./installManager/installManager/settingsManager');
const backupHealth = require('./backup-health');
const { createSessionLockController } = require('./session-lock-main');
const { createDeviceSecurityService } = require('./device-security-main');
const { SensitiveFingerprintSession } = require('./recovery-duplicates');

// Load the established SafeLedger application runtime first. SafeLedger 2.4
// extends the released 2.3 security lifecycle without changing vault/encryption
// persistence.
require('./main');

function getMainWindow() {
  return BrowserWindow.getAllWindows().find((win) => win && !win.isDestroyed()) || null;
}

function getPortableRoot() {
  return runtimeUtils.getPortableRoot({ appPath: app.getAppPath(), isPackaged: app.isPackaged });
}

function getDataRoot() {
  return path.join(getPortableRoot(), 'SafeLedgerData');
}

function getSettingsDir() {
  return path.join(getDataRoot(), 'settings');
}

function assertTrustedEvent(event) {
  const win = getMainWindow();
  if (!win || !event || event.sender !== win.webContents) throw new Error('Untrusted SafeLedger IPC request.');
}

function syncRendererSettings(settings) {
  const win = getMainWindow();
  if (!win) return;
  try {
    win.webContents.send('result-save-settings', { settings });
  } catch (_) {}
}

// Sensitive duplicate fingerprints are keyed with a random in-memory key that
// exists only for the current unlocked process session. The central lock path
// destroys it immediately after destroying the vault DEK.
const sensitiveFingerprints = new SensitiveFingerprintSession();

const lockController = createSessionLockController({
  cryptoSession,
  getMainWindow,
  getDataRoot,
  audit: securityMain.audit,
  onLock: () => sensitiveFingerprints.clear()
});

const deviceSecurity = createDeviceSecurityService({
  powerMonitor,
  lockController,
  getDataRoot
});

// main.js contains the older Emergency Lock listener. Replace that listener
// with the centralized 2.3+ lock controller while leaving established IPC
// routes untouched.
ipc.removeAllListeners('panic-lock');
ipc.on('panic-lock', (event, params = {}) => {
  try { assertTrustedEvent(event); } catch (_) { return; }
  lockController.lockSession(params && params.reason, {
    minimize: true,
    reload: true,
    forceUi: true
  });
});

ipc.handle('device-storage-health', async (event) => {
  assertTrustedEvent(event);
  return deviceSecurity.storageHealth();
});

ipc.handle('device-reset-storage-identity', async (event) => {
  assertTrustedEvent(event);
  const id = await deviceSecurity.rotateStorageIdentity();
  return { ok: true, reset: true, idPresent: typeof id === 'string' && id.length > 0 };
});

ipc.handle('device-backup-health', async (event) => {
  assertTrustedEvent(event);
  const loaded = await settingsManager.loadSettings(getSettingsDir());
  return { ok: true, health: backupHealth.summarize(loaded.settings), settings: loaded.settings };
});

ipc.handle('device-record-backup-success', async (event) => {
  assertTrustedEvent(event);
  const loaded = await settingsManager.loadSettings(getSettingsDir());
  const saved = await settingsManager.saveSettings(getSettingsDir(), Object.assign({}, loaded.settings, {
    lastBackupAt: new Date().toISOString()
  }));
  // The underlying backup operation already writes the generic backup audit
  // event. This endpoint records only non-secret reminder metadata.
  syncRendererSettings(saved.settings);
  return { ok: true, settings: saved.settings, health: backupHealth.summarize(saved.settings) };
});

ipc.handle('device-record-backup-verified', async (event, createdAt) => {
  assertTrustedEvent(event);
  const loaded = await settingsManager.loadSettings(getSettingsDir());
  const saved = await settingsManager.saveSettings(getSettingsDir(), Object.assign({}, loaded.settings, {
    lastVerifiedBackupAt: new Date().toISOString(),
    lastVerifiedBackupCreatedAt: backupHealth.normalizeTimestamp(createdAt)
  }));
  // Backup verification itself owns its Activity History entry.
  syncRendererSettings(saved.settings);
  return { ok: true, settings: saved.settings, health: backupHealth.summarize(saved.settings) };
});

app.whenReady().then(() => deviceSecurity.start().catch(() => {
  // Storage initialization failure must never leave an unlocked session alive.
  if (lockController.isUnlocked()) {
    lockController.lockSession('storage-unavailable', { reload: false, forceUi: true });
  }
}));

app.on('before-quit', () => {
  sensitiveFingerprints.clear();
  deviceSecurity.stop();
});

module.exports = {
  lockController,
  deviceSecurity,
  sensitiveFingerprints,
  getDataRoot,
  getMainWindow
};
