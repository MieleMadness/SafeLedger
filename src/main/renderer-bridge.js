'use strict';

// Renderer-only adapter for SafeLedger's narrow preload API.
// This module exposes no Electron or Node capability.
function bridge() {
  if (!window.safeLedgerApi) throw new Error('SafeLedger bridge is unavailable.');
  return window.safeLedgerApi;
}

const localListeners = new Map();
function addLocalListener(channel, listener) {
  const listeners = localListeners.get(channel) || [];
  listeners.push(listener);
  localListeners.set(channel, listeners);
}
function emitLocal(channel, event, payload) {
  const listeners = localListeners.get(channel) || [];
  for (const listener of listeners.slice()) listener(event, payload);
}

const subscriptions = {
  result: 'onResult',
  'result-init-system': 'onInitSystem',
  'result-save-settings': 'onSaveSettings',
  'result-lockout-destroy': 'onLockoutDestroy',
  'security-session-locked': 'onSecuritySessionLocked',
  'show-settings': 'onShowSettings'
};
const sends = {
  'init-system': 'initSystem',
  read: 'readVault',
  'read-vaultlist-init': 'readVaultListInit',
  'process-vault-list': 'processVaultList',
  'vault-list-delete': 'deleteVault',
  'process-group': 'processGroup',
  'process-record': 'processRecord',
  'save-settings': 'saveSettings',
  'record-password-failure': 'recordPasswordFailure',
  'panic-lock': 'panicLock'
};
const invokes = {
  'crypto-v3-has-envelope': 'cryptoHasEnvelope',
  'crypto-v3-initialize': 'cryptoInitialize',
  'crypto-v3-login': 'cryptoLogin',
  'crypto-v3-change-password': 'cryptoChangePassword',
  'security-backup-all': 'backupAllData',
  'security-verify-backup': 'verifyBackup',
  'security-restore-all': 'restoreAllData',
  'legacy-import-select-source': 'selectLegacyImportSource',
  'legacy-import-run': 'importLegacyData',
  'device-storage-health': 'getStorageHealth',
  'device-open-data-folder': 'openDataFolder',
  'device-reset-storage-identity': 'resetStorageIdentity',
  'device-backup-health': 'getBackupHealth',
  'device-record-backup-success': 'recordBackupSuccess',
  'device-record-backup-verified': 'recordBackupVerified',
  'recovery-intelligence-summary': 'getRecoveryIntelligence'
};

// Subscribe to each preload event only once, then fan the same payload object
// out to renderer modules in registration order. This keeps the trusted UI
// working from one coherent in-memory vault state instead of separate cloned
// payloads crossing the contextBridge for every listener.
const nativeSubscriptions = new Set();
function ensureNativeSubscription(channel) {
  const subscription = subscriptions[channel];
  if (!subscription || nativeSubscriptions.has(channel)) return;
  const api = bridge();
  if (typeof api[subscription] !== 'function') return;
  api[subscription]((payload) => emitLocal(channel, {}, payload));
  nativeSubscriptions.add(channel);
}

const ipcRenderer = {
  send(channel, ...args) {
    const method = sends[channel];
    if (!method || typeof bridge()[method] !== 'function') throw new Error(`Blocked SafeLedger bridge send: ${channel}`);
    return bridge()[method](...args);
  },
  invoke(channel, ...args) {
    const method = invokes[channel];
    if (!method || typeof bridge()[method] !== 'function') return Promise.reject(new Error(`Blocked SafeLedger bridge invoke: ${channel}`));
    return bridge()[method](...args);
  },
  on(channel, listener) {
    addLocalListener(channel, listener);
    ensureNativeSubscription(channel);
    return ipcRenderer;
  },
  emit(channel, event, payload) {
    emitLocal(channel, event, payload);
    return true;
  }
};

let lastClipboardWrite = '';
const clipboard = {
  writeText(value) {
    lastClipboardWrite = String(value || '');
    bridge().clipboardWrite(lastClipboardWrite);
  },
  readText() { return lastClipboardWrite; },
  clear() {
    const expected = lastClipboardWrite;
    lastClipboardWrite = '';
    if (expected) bridge().clipboardClearIfMatches(expected);
  }
};

module.exports = { ipcRenderer, clipboard };