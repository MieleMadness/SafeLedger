'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const LOCKED_MESSAGE = 'SafeLedger is locked. Please log in again.';

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

contextBridge.exposeInMainWorld('safeLedgerApi', Object.freeze({
  initSystem: () => ipcRenderer.send('init-system'),
  readVault: (params) => ipcRenderer.send('read', params),
  readVaultListInit: () => ipcRenderer.send('read-vaultlist-init'),
  processVaultList: (params) => ipcRenderer.send('process-vault-list', params),
  deleteVault: (params) => ipcRenderer.send('vault-list-delete', params),
  processGroup: (params) => ipcRenderer.send('process-group', params),
  processRecord: (params) => ipcRenderer.send('process-record', params),
  saveSettings: (params) => ipcRenderer.send('save-settings', params),
  requestSettings: () => ipcRenderer.send('request-settings'),
  prepareAppMenu: () => invoke('app-menu-prepare'),
  appMenuCommand: (command) => ipcRenderer.send('app-menu-command', String(command || '')),
  setSelfDestructProtection: (enabled) => invoke('set-self-destruct-protection', enabled === true),
  recordPasswordFailure: () => ipcRenderer.send('record-password-failure'),
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
