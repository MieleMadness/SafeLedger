'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const LOCKED_MESSAGE = 'SafeLedger is locked. Please log in again.';
const REQUEST_TIMEOUT_MS = 30000;
let resultRequestQueue = Promise.resolve();

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

// The established main-process data protocol returns workspace operations on a
// shared `result` channel. Serialize those requests at the preload boundary so
// one renderer command can never consume another command's response. Renderer
// modules see ordinary Promise-returning semantic methods and never channel
// names; a later main-process transport conversion can happen behind this API.
function requestResult(sendChannel, responseChannels, ...args) {
  const run = () => request(sendChannel, responseChannels, ...args);
  const pending = resultRequestQueue.then(run, run);
  resultRequestQueue = pending.then(() => undefined, () => undefined);
  return pending;
}

contextBridge.exposeInMainWorld('safeLedgerApi', Object.freeze({
  initSystem: () => request('init-system', 'result-init-system'),
  readVault: (params) => requestResult('read', 'result', params),
  readVaultListInit: () => requestResult('read-vaultlist-init', ['result', 'result-lockout-destroy']),
  processVaultList: (params) => requestResult('process-vault-list', 'result', params),
  deleteVault: (params) => requestResult('vault-list-delete', 'result', params),
  processGroup: (params) => requestResult('process-group', 'result', params),
  processRecord: (params) => requestResult('process-record', 'result', params),
  saveSettings: (params) => request('save-settings', 'result-save-settings', params),
  prepareAppMenu: () => invoke('app-menu-prepare'),
  appMenuCommand: (command) => ipcRenderer.send('app-menu-command', String(command || '')),
  setSelfDestructProtection: (enabled) => invoke('set-self-destruct-protection', enabled === true),
  recordPasswordFailure: () => requestResult('record-password-failure', ['result', 'result-lockout-destroy']),
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
