'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  if (typeof callback !== 'function') return;
  ipcRenderer.on(channel, (_event, payload) => callback(payload));
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
  recordPasswordFailure: () => ipcRenderer.send('record-password-failure'),
  panicLock: (params) => ipcRenderer.send('panic-lock', params),
  cryptoHasEnvelope: () => ipcRenderer.invoke('crypto-v3-has-envelope'),
  cryptoInitialize: (password) => ipcRenderer.invoke('crypto-v3-initialize', password),
  cryptoLogin: (password) => ipcRenderer.invoke('crypto-v3-login', password),
  cryptoChangePassword: (oldPassword, newPassword) => ipcRenderer.invoke('crypto-v3-change-password', oldPassword, newPassword),
  getDashboardSummary: () => ipcRenderer.invoke('dashboard-summary'),
  getActivityHistory: (limit) => ipcRenderer.invoke('activity-history', limit),
  globalSearch: (query) => ipcRenderer.invoke('global-search', query),
  getRecoveryBinder: (file, options, recordActivity = false) => ipcRenderer.invoke('recovery-binder-model', { file, options, recordActivity: recordActivity === true }),
  getStorageHealth: () => ipcRenderer.invoke('device-storage-health'),
  backupAllData: () => ipcRenderer.invoke('security-backup-all'),
  verifyBackup: () => ipcRenderer.invoke('security-verify-backup'),
  restoreAllData: () => ipcRenderer.invoke('security-restore-all'),
  selectLegacyImportSource: () => ipcRenderer.invoke('legacy-import-select-source'),
  importLegacyData: (password) => ipcRenderer.invoke('legacy-import-run', password),
  clipboardWrite: (text) => ipcRenderer.invoke('security-clipboard-write', text),
  clipboardClearIfMatches: (expected) => ipcRenderer.invoke('security-clipboard-clear-if-matches', expected),
  onResult: (callback) => subscribe('result', callback),
  onInitSystem: (callback) => subscribe('result-init-system', callback),
  onSaveSettings: (callback) => subscribe('result-save-settings', callback),
  onLockoutDestroy: (callback) => subscribe('result-lockout-destroy', callback),
  onSecuritySessionLocked: (callback) => subscribe('security-session-locked', callback),
  onShowSettings: (callback) => subscribe('show-settings', callback)
}));
