'use strict';

const { app, BrowserWindow, ipcMain: ipc, powerMonitor } = require('electron');
const path = require('path');
const runtimeUtils = require('./runtime-utils');
const cryptoSession = require('./crypto-session-main');
const securityMain = require('./security-main');
const settingsManager = require('./installManager/installManager/settingsManager');
const backupHealth = require('./backup-health');
const robustVault = require('./robust-vault');
const dashboardSummary = require('./dashboard-summary');
const addressValidator = require('./address-validator');
const bip39 = require('./bip39-validator');
const recoveryDuplicates = require('./recovery-duplicates');
const { createSessionLockController } = require('./session-lock-main');
const { createDeviceSecurityService } = require('./device-security-main');
const { SensitiveFingerprintSession } = recoveryDuplicates;

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

function getSessionKey() {
  const key = cryptoSession.getSessionKey();
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('SafeLedger is locked. Please log in again.');
  return key;
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

function buildRecoveryIntelligence(entries) {
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

async function buildRecoveryIntelligenceSummary() {
  const entries = await loadProfileEntries();
  const loaded = await settingsManager.loadSettings(getSettingsDir());
  const currentBackupHealth = backupHealth.summarize(loaded.settings);
  return {
    summary: dashboardSummary.summarize(entries, { backupHealth: currentBackupHealth }),
    intelligence: buildRecoveryIntelligence(entries)
  };
}

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

ipc.handle('recovery-intelligence-summary', async (event) => {
  assertTrustedEvent(event);
  try {
    const result = await buildRecoveryIntelligenceSummary();
    return { ok: true, summary: result.summary, intelligence: result.intelligence };
  } catch (err) {
    return { ok: false, message: err && err.message ? err.message : 'Unable to build Recovery Intelligence summary.' };
  }
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
  buildRecoveryIntelligence,
  buildRecoveryIntelligenceSummary,
  getDataRoot,
  getMainWindow
};
