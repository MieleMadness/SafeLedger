'use strict';

const { app, BrowserWindow, ipcMain: ipc, powerMonitor } = require('electron');
const path = require('path');
const runtimeUtils = require('./runtime-utils');
const cryptoSession = require('./crypto-session-main');
const securityMain = require('./security-main');
const { createSessionLockController } = require('./session-lock-main');
const { createDeviceSecurityService } = require('./device-security-main');

// Load the established SafeLedger application runtime first. SafeLedger 2.3
// wraps its security lifecycle without changing vault/encryption persistence.
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

function assertTrustedEvent(event) {
  const win = getMainWindow();
  if (!win || !event || event.sender !== win.webContents) throw new Error('Untrusted SafeLedger IPC request.');
}

const lockController = createSessionLockController({
  cryptoSession,
  getMainWindow,
  getDataRoot,
  audit: securityMain.audit
});

const deviceSecurity = createDeviceSecurityService({
  powerMonitor,
  lockController,
  getDataRoot
});

// main.js contains the 2.2 Emergency Lock listener. Replace that one listener
// with the centralized 2.3 lock controller while leaving all other established
// IPC routes untouched.
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

app.whenReady().then(() => deviceSecurity.start().catch(() => {
  // Storage initialization failure must never leave an unlocked session alive.
  if (lockController.isUnlocked()) {
    lockController.lockSession('storage-unavailable', { reload: false, forceUi: true });
  }
}));

app.on('before-quit', () => deviceSecurity.stop());

module.exports = { lockController, deviceSecurity, getDataRoot, getMainWindow };
