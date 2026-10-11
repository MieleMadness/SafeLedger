'use strict';

const { app, dialog, ipcMain: ipc, powerMonitor, shell, screen } = require('electron');
const path = require('path');
const runtimeUtils = require('./runtime-utils');
const cryptoSession = require('./crypto-session-main');
const securityMain = require('./security-main');
const settingsManager = require('./settings-manager');
const backupHealth = require('./backup-health');
const robustVault = require('./robust-vault');
const dashboardSummary = require('./dashboard-summary');
const addressValidator = require('./address-validator');
const bip39 = require('./bip39-validator');
const recoveryDuplicates = require('./recovery-duplicates');
const windowSizing = require('./window-sizing-main');
const { createSessionLockController } = require('./session-lock-main');
const { createDeviceSecurityService } = require('./device-security-main');
const { SensitiveFingerprintSession } = recoveryDuplicates;

function installPreferredWindowSizing() {
  let primaryWindowSized = false;
  app.on('browser-window-created', (_event, win) => {
    if (primaryWindowSized) return;
    primaryWindowSized = true;
    let workArea = {};
    try {
      const display = screen.getPrimaryDisplay();
      workArea = display && display.workAreaSize ? display.workAreaSize : {};
    } catch (_) {}
    windowSizing.applyPreferredWindowSize(win, workArea);
  });
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

function buildRecoveryIntelligence(entries, sensitiveFingerprints) {
  const sensitiveItems = [];
  const invalidAddresses = [];
  const invalidMnemonics = [];
  let addressChecked = 0;
  let addressValid = 0;
  let addressInvalid = 0;
  let addressUnsupported = 0;
  let mnemonicChecked = 0;
  let mnemonicValid = 0;
  let mnemonicInvalid = 0;

  for (const entry of entries) {
    const groups = entry && entry.vaultData && Array.isArray(entry.vaultData.groups) ? entry.vaultData.groups : [];
    for (const group of groups) {
      const walletName = String(group && group.name || 'Unnamed Wallet');
      const seed = String(group && group.seedPhrase || '').trim();
      if (seed) {
        sensitiveItems.push({ value: seed, profileName: entry.profileName, walletName, kind: 'seed-phrase' });
        if (/bip\s*-?39/i.test(String(group && group.recoveryFormat || ''))) {
          mnemonicChecked++;
          const result = bip39.validateMnemonic(seed);
          if (result.valid) mnemonicValid++;
          else {
            mnemonicInvalid++;
            invalidMnemonics.push({
              profileName: entry.profileName,
              walletName,
              reason: result.reason,
              wordCount: result.wordCount
            });
          }
        }
      }

      const records = group && Array.isArray(group.records) ? group.records : [];
      for (const record of records) {
        const assetName = String(record && record.name || 'Unnamed Asset');
        const privateKey = String(record && record.privateAddress || '').trim();
        if (privateKey) sensitiveItems.push({ value: privateKey, profileName: entry.profileName, walletName, kind: 'private-key' });

        const address = String(record && record.publicAddress || '').trim();
        if (!address) continue;
        addressChecked++;
        const result = addressValidator.validateAddress(address);
        if (result.status === 'valid') addressValid++;
        else if (result.status === 'invalid') {
          addressInvalid++;
          invalidAddresses.push({
            profileName: entry.profileName,
            walletName,
            assetName,
            family: result.family || 'address',
            reason: result.reason || 'invalid-format'
          });
        } else addressUnsupported++;
      }
    }
  }

  return {
    addressValidation: {
      checked: addressChecked,
      valid: addressValid,
      invalid: addressInvalid,
      unsupported: addressUnsupported,
      invalidItems: invalidAddresses.slice(0, 20)
    },
    bip39: {
      checked: mnemonicChecked,
      valid: mnemonicValid,
      invalid: mnemonicInvalid,
      invalidWallets: invalidMnemonics.slice(0, 20)
    },
    duplicates: {
      publicAddress: recoveryDuplicates.publicAddressDuplicates(entries),
      walletMetadata: recoveryDuplicates.walletMetadataDuplicates(entries),
      sensitive: sensitiveFingerprints.findDuplicates(sensitiveItems)
    }
  };
}

function startAllowedRuntime() {
  // Bootstrap is the only composition root. It owns application lifecycle,
  // main-window creation, central session locking, device security, and the
  // explicit registration of the legacy-compatible core IPC service module.
  installPreferredWindowSizing();
  const mainRuntime = require('./main');
  const sensitiveFingerprints = new SensitiveFingerprintSession();
  const lockController = createSessionLockController({
    cryptoSession,
    getMainWindow: mainRuntime.getMainWindow,
    getDataRoot,
    audit: securityMain.audit,
    onLock: () => sensitiveFingerprints.clear()
  });
  const deviceSecurity = createDeviceSecurityService({
    powerMonitor,
    lockController,
    getDataRoot
  });

  function assertTrustedEvent(event) {
    const win = mainRuntime.getMainWindow();
    if (!win || !event || event.sender !== win.webContents) throw new Error('Untrusted SafeLedger IPC request.');
  }

  function getSessionKey() {
    const key = cryptoSession.getSessionKey();
    if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('SafeLedger is locked. Please log in again.');
    return key;
  }

  function syncRendererSettings(settings) {
    const win = mainRuntime.getMainWindow();
    if (!win) return;
    try {
      win.webContents.send('result-save-settings', { settings });
    } catch (_) {}
  }

  async function loadProfileEntries() {
    const key = getSessionKey();
    const vaultDir = path.join(getDataRoot(), 'vaults');
    const list = await robustVault.readVaultList(path.join(vaultDir, 'vaultlist.json'), key);
    const entries = [];
    for (const profile of list.vaults || []) {
      try {
        const vaultData = await robustVault.readVault(path.join(vaultDir, profile.file), key);
        entries.push({ profileName: String(profile.name || 'Profile'), profileFile: String(profile.file || ''), vaultData });
      } catch (_) {
        entries.push({ profileName: String(profile.name || 'Profile'), profileFile: String(profile.file || ''), vaultData: { groups: [] }, readError: true });
      }
    }
    return entries;
  }

  async function buildRecoveryIntelligenceSummary() {
    const entries = await loadProfileEntries();
    const loaded = await settingsManager.loadSettings(getSettingsDir());
    const currentBackupHealth = backupHealth.summarize(loaded.settings);
    return {
      summary: dashboardSummary.summarize(entries, { backupHealth: currentBackupHealth }),
      intelligence: buildRecoveryIntelligence(entries, sensitiveFingerprints)
    };
  }

  // Core runtime registration is explicit and idempotent. main.js no longer
  // registers IPC or Electron lifecycle hooks merely by being required.
  mainRuntime.registerCoreIpcHandlers();

  // Emergency Lock has one authoritative owner: the centralized session-lock
  // controller. There is no older listener to remove or override at runtime.
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

  ipc.handle('device-open-data-folder', async (event) => {
    assertTrustedEvent(event);
    const health = await deviceSecurity.storageHealth();
    if (!health || health.connected !== true) {
      return { ok: false, message: 'SafeLedgerData storage is currently unavailable.' };
    }
    const error = await shell.openPath(getDataRoot());
    if (error) return { ok: false, message: 'SafeLedger could not open the SafeLedgerData folder.' };
    return { ok: true };
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

  ipc.handle('recovery-intelligence-summary', async (event) => {
    assertTrustedEvent(event);
    try {
      const result = await buildRecoveryIntelligenceSummary();
      return { ok: true, summary: result.summary, intelligence: result.intelligence };
    } catch (err) {
      return { ok: false, message: err && err.message ? err.message : 'Unable to build Recovery Intelligence summary.' };
    }
  });

  app.whenReady().then(async () => {
    mainRuntime.createWindow();
    try {
      await deviceSecurity.start();
    } catch (_) {
      // Storage initialization failure must never leave an unlocked session alive.
      if (lockController.isUnlocked()) {
        lockController.lockSession('storage-unavailable', { reload: false, forceUi: true });
      }
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (!mainRuntime.getMainWindow()) mainRuntime.createWindow();
  });

  app.on('before-quit', () => {
    // One lifecycle owner tears down all session-only state.
    mainRuntime.clearSession();
    sensitiveFingerprints.clear();
    deviceSecurity.stop();
  });
}

function startBlockedRuntime(startupStorageStatus) {
  // A blocked portable start never loads main.js, registers application IPC,
  // creates SafeLedgerData, or opens the normal application window.
  app.whenReady().then(async () => {
    cryptoSession.clearSession();
    const warning = runtimeUtils.portableStartupMessage(startupStorageStatus);
    if (warning) {
      try {
        await dialog.showMessageBox({
          type: 'warning',
          buttons: ['Quit SafeLedger'],
          defaultId: 0,
          cancelId: 0,
          noLink: true,
          title: warning.title,
          message: warning.message,
          detail: warning.detail
        });
      } catch (_) {}
    }
    app.quit();
  });
  app.on('before-quit', () => cryptoSession.clearSession());
}

const startupStorageStatus = runtimeUtils.getPortableStartupStatus({
  appPath: app.getAppPath(),
  isPackaged: app.isPackaged
});

if (startupStorageStatus.allowed) startAllowedRuntime();
else startBlockedRuntime(startupStorageStatus);
