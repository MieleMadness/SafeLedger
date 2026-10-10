'use strict';

// Semantic renderer-facing service facade. Renderer modules should describe
// what they want SafeLedger to do, not transport-level IPC channel names.
function bridge() {
  if (typeof window === 'undefined' || !window.safeLedgerApi) {
    throw new Error('SafeLedger bridge is unavailable.');
  }
  return window.safeLedgerApi;
}

function required(name) {
  const api = bridge();
  if (typeof api[name] !== 'function') throw new Error(`SafeLedger service is unavailable: ${name}`);
  return api[name].bind(api);
}

function errorResult(error, fallback = 'SafeLedger operation failed.') {
  return {
    status: 'ERROR',
    statusMsg: error && error.message ? error.message : String(error || fallback)
  };
}

async function deliver(promise, onResult, fallback) {
  let result;
  try {
    result = await promise;
  } catch (error) {
    result = errorResult(error, fallback);
  }
  if (typeof onResult === 'function') onResult(result || errorResult(null, fallback));
  return result;
}

const initializeSystem = () => required('initSystem')();
const readProfile = (file, type = 'vault-read') => required('readVault')({ type, file });
const loadVaultList = () => required('readVaultListInit')();
const saveProfile = (params) => required('processVaultList')(params);
const deleteProfile = (params) => required('deleteVault')(params);
const saveVaultItem = (params) => required('processGroup')(params);
const saveAsset = (params) => required('processRecord')(params);
const saveSettings = (patch) => required('saveSettings')({ newSettings: patch });
const recordPasswordFailure = () => required('recordPasswordFailure')();
const panicLock = (reason) => required('panicLock')({ reason });

const cryptoHasEnvelope = () => required('cryptoHasEnvelope')();
const cryptoInitialize = (password) => required('cryptoInitialize')(password);
const cryptoLogin = (password) => required('cryptoLogin')(password);
const cryptoChangePassword = (oldPassword, newPassword) => required('cryptoChangePassword')(oldPassword, newPassword);

const getDashboardSummary = () => required('getDashboardSummary')();
const getRecoveryIntelligence = () => required('getRecoveryIntelligence')();
const getActivityHistory = (limit) => required('getActivityHistory')(limit);
const globalSearch = (query) => required('globalSearch')(query);
const getRecoveryBinder = (file, options, recordActivity = false) => required('getRecoveryBinder')(file, options, recordActivity === true);
const getStorageHealth = () => required('getStorageHealth')();
const openDataFolder = () => required('openDataFolder')();
const resetStorageIdentity = () => required('resetStorageIdentity')();
const getBackupHealth = () => required('getBackupHealth')();
const recordBackupSuccess = () => required('recordBackupSuccess')();
const recordBackupVerified = (createdAt) => required('recordBackupVerified')(createdAt);
const backupAllData = () => required('backupAllData')();
const verifyBackup = (password) => required('verifyBackup')(password);
const restoreAllData = () => required('restoreAllData')();
const selectLegacyImportSource = () => required('selectLegacyImportSource')();
const importLegacyData = (password) => required('importLegacyData')(password);
const setSelfDestructProtection = (enabled) => required('setSelfDestructProtection')(enabled === true);

const clipboardWrite = (text) => required('clipboardWrite')(String(text || ''));
const clipboardClearIfMatches = (text) => required('clipboardClearIfMatches')(String(text || ''));

function onLockoutDestroy(callback) {
  return required('onLockoutDestroy')(callback);
}

function onSecuritySessionLocked(callback) {
  return required('onSecuritySessionLocked')(callback);
}

function onShowSettings(callback) {
  return required('onShowSettings')(callback);
}

module.exports = {
  initializeSystem,
  readProfile,
  loadVaultList,
  saveProfile,
  deleteProfile,
  saveVaultItem,
  saveAsset,
  saveSettings,
  recordPasswordFailure,
  panicLock,
  cryptoHasEnvelope,
  cryptoInitialize,
  cryptoLogin,
  cryptoChangePassword,
  getDashboardSummary,
  getRecoveryIntelligence,
  getActivityHistory,
  globalSearch,
  getRecoveryBinder,
  getStorageHealth,
  openDataFolder,
  resetStorageIdentity,
  getBackupHealth,
  recordBackupSuccess,
  recordBackupVerified,
  backupAllData,
  verifyBackup,
  restoreAllData,
  selectLegacyImportSource,
  importLegacyData,
  setSelfDestructProtection,
  clipboardWrite,
  clipboardClearIfMatches,
  onLockoutDestroy,
  onSecuritySessionLocked,
  onShowSettings,
  deliver,
  errorResult,
  _test: { bridge, required }
};
