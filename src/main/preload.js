'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const LOCKED_MESSAGE = 'SafeLedger is locked. Please log in again.';
const REQUEST_TIMEOUT_MS = 30000;

function subscribe(channel, callback) {
  if (typeof callback !== 'function') return;
  ipcRenderer.on(channel, (_event, payload) => callback(payload));
}

function invoke(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args).catch((error) => {
    const message = String(error && error.message || error || '');
    if (message.includes(LOCKED_MESSAGE)) throw new Error(LOCKED_MESSAGE);
    throw error;
  });
}

function request(sendChannel, responseChannels, ...args) {
  const channels = Array.isArray(responseChannels) ? responseChannels : [responseChannels];
  return new Promise((resolve, reject) => {
    let settled = false;
    const handlers = new Map();
    let timeout = null;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      for (const [channel, handler] of handlers) ipcRenderer.removeListener(channel, handler);
      handlers.clear();
    };
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(payload);
    };

    for (const channel of channels) {
      const handler = (_event, payload) => finish(payload);
      handlers.set(channel, handler);
      ipcRenderer.on(channel, handler);
    }
    timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('SafeLedger operation timed out.'));
    }, REQUEST_TIMEOUT_MS);

    try {
      ipcRenderer.send(sendChannel, ...args);
    } catch (error) {
      settled = true;
      cleanup();
      reject(error);
    }
  });
}

// Core workspace operations use request-specific invoke replies. Only
// legacy initialization/settings notifications retain dedicated events.
contextBridge.exposeInMainWorld('safeLedgerApi', Object.freeze({
  initSystem: () => request('init-system', 'result-init-system'),
  readVault: (params) => invoke('read', params),
  readVaultListInit: () => invoke('read-vaultlist-init'),
  processVaultList: (params) => invoke('process-vault-list', params),
  deleteVault: (params) => invoke('vault-list-delete', params),
  processGroup: (params) => invoke('process-group', params),
  processRecord: (params) => invoke('process-record', params),
  saveSettings: (params) => request('save-settings', 'result-save-settings', params),
  prepareAppMenu: () => invoke('app-menu-prepare'),
  appMenuCommand: (command) => ipcRenderer.send('app-menu-command', String(command || '')),
  setSelfDestructProtection: (enabled) => invoke('set-self-destruct-protection', enabled === true),
  panicLock: (params) => ipcRenderer.send('panic-lock', params),
  cryptoHasEnvelope: () => invoke('crypto-v3-has-envelope'),
  cryptoInitialize: (password) => invoke('crypto-v3-initialize', password),
  cryptoLogin: (password) => invoke('crypto-v3-login', password),
  cryptoChangePassword: (oldPassword, newPassword) => invoke('crypto-v3-change-password', oldPassword, newPassword),
  getDashboardSummary: () => invoke('dashboard-summary'),
  getRecoveryIntelligence: () => invoke('recovery-intelligence-summary'),
  getActivityHistory: (limit) => invoke('activity-history', limit),
  globalSearch: (query) => invoke('global-search', query),
  getRecoveryBinder: (file, options, recordActivity = false) => invoke('recovery-binder-model', { file, options, recordActivity: recordActivity === true }),
  getStorageHealth: () => invoke('device-storage-health'),
  openDataFolder: () => invoke('device-open-data-folder'),
  resetStorageIdentity: () => invoke('device-reset-storage-identity'),
  getBackupHealth: () => invoke('device-backup-health'),
  recordBackupSuccess: () => invoke('device-record-backup-success'),
  recordBackupVerified: (createdAt) => invoke('device-record-backup-verified', createdAt),
  backupAllData: () => invoke('security-backup-all'),
  verifyBackup: (password) => invoke('security-verify-backup', String(password || '')),
  restoreAllData: () => invoke('security-restore-all'),
  selectLegacyImportSource: () => invoke('legacy-import-select-source'),
  importLegacyData: (password) => invoke('legacy-import-run', password),
  clipboardWrite: (text) => invoke('security-clipboard-write', text),
  clipboardClearIfMatches: (expected) => invoke('security-clipboard-clear-if-matches', expected),
  onResult: (callback) => subscribe('result', callback),
  onInitSystem: (callback) => subscribe('result-init-system', callback),
  onSaveSettings: (callback) => subscribe('result-save-settings', callback),
  onLockoutDestroy: (callback) => subscribe('result-lockout-destroy', callback),
  onSecuritySessionLocked: (callback) => subscribe('security-session-locked', callback),
  onShowSettings: (callback) => subscribe('show-settings', callback)
}));
