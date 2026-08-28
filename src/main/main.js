'use strict';

const { app, BrowserWindow, Menu, ipcMain: ipc, dialog, clipboard } = require('electron');
const path = require('path');
const vault = require('./robust-vault');
const runtimeUtils = require('./runtime-utils');
const utils = require('./utils');
const settingsManager = require('./installManager/installManager/settingsManager');
const cryptoSession = require('./crypto-session-main');
const securityMain = require('./security-main');

cryptoSession.registerIpcHandlers();

let mainWindow;
let vaultDir;
let settingsDir;
let currentSettings;
let walletCatalog = null;
const currentVault = 'zvault-0.json';
const excludedDefaultWallets = new Set(['bitbox02 multi', 'coldcard', 'keystone', 'rabby wallet']);

function getWalletCatalog() {
  if (!walletCatalog) walletCatalog = require('./wallet-catalog');
  return walletCatalog;
}

function isExcludedDefaultWallet(group) {
  return excludedDefaultWallets.has(String(group && group.name || '').trim().toLowerCase());
}

function getPortableRoot() {
  return runtimeUtils.getPortableRoot({ appPath: app.getAppPath(), isPackaged: app.isPackaged });
}

function getDataRoot() {
  return path.join(getPortableRoot(), 'SafeLedgerData');
}

securityMain.registerIpcHandlers({
  ipc,
  dialog,
  clipboard,
  cryptoSession,
  getMainWindow: () => mainWindow,
  getDataRoot
});

function configureStorage() {
  const root = getPortableRoot();
  vaultDir = path.join(root, 'SafeLedgerData', 'vaults');
  settingsDir = path.join(root, 'SafeLedgerData', 'settings');
}

function buildMenu() {
  const selfDestructEnabled = !currentSettings || currentSettings.scrubContentAfterRetries !== false;
  const template = [{
    label: 'SafeLedger',
    submenu: [
      { label: `Version ${app.getVersion()}`, enabled: false },
      { label: 'Settings', click: () => showSettings() },
      {
        label: 'Self-Destruct Protection',
        type: 'checkbox',
        checked: selfDestructEnabled,
        click: (item) => setSelfDestructProtection(item.checked)
      },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }, {
    label: 'Edit',
    submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
    ]
  }];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function setSelfDestructProtection(enabled) {
  const existing = currentSettings || (await settingsManager.loadSettings(settingsDir)).settings;
  if (enabled) {
    const response = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Enable Self-Destruct', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
      title: 'Enable Self-Destruct Protection',
      message: 'Enable Self-Destruct Protection?',
      detail: 'After the configured failed-login and lockout limits are exhausted, SafeLedger will permanently destroy the encrypted vault files. This action cannot be undone.'
    });
    if (response.response !== 0) {
      buildMenu();
      return;
    }
  }
  currentSettings = Object.assign({}, existing, { scrubContentAfterRetries: enabled });
  const saved = await settingsManager.saveSettings(settingsDir, currentSettings);
  currentSettings = saved.settings;
  buildMenu();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('result-save-settings', {
      status: 'SUCCESS',
      statusMsg: enabled
        ? 'Self-Destruct Protection enabled. Vaults will be destroyed after all configured lockouts are exhausted.'
        : 'Self-Destruct Protection disabled. Failed logins will result in lockouts only.',
      settings: currentSettings
    });
  }
}

async function initializeModernVault(vaultName, cryptoKey) {
  const today = Date();
  const groups = getWalletCatalog().buildDefaultGroups(today).filter((group) => !isExcludedDefaultWallet(group));
  const data = { file: vaultName, catalogVersion: '2026-08-20.3', groups };
  await vault.saveVault(path.join(vaultDir, vaultName), JSON.stringify(data), cryptoKey);
  return data;
}

function sendResult(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('result', payload);
}

function getSessionKey() {
  const key = cryptoSession.getSessionKey();
  if (!Buffer.isBuffer(key) || key.length !== 32) return null;
  return key;
}

function sendLocked() {
  sendResult({ status: 'ERROR', statusMsg: 'SafeLedger is locked. Please log in again.', type: 'session-locked' });
}

async function ensureCurrentSettings() {
  if (currentSettings) return currentSettings;
  const loaded = await settingsManager.loadSettings(settingsDir);
  currentSettings = loaded.settings;
  return currentSettings;
}

async function enforceRetryExhaustion() {
  const settings = await ensureCurrentSettings();
  if (settings.lockOutCount < settings.numLockoutRetries) return false;
  cryptoSession.clearSession();
  if (settings.scrubContentAfterRetries !== false) {
    try {
      await vault.scrubContent(vaultDir);
      settings.failAttemptCount = 0;
      settings.lockOutCount = 0;
      settings.lockLogin = false;
      settings.lockLoginTime = 0;
      currentSettings = settings;
      await settingsManager.saveSettings(settingsDir, settings);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('result-lockout-destroy', {
          status: 'ERROR',
          statusMsg: 'Self-destruct protection triggered. Encrypted vault data has been destroyed after repeated failed password attempts.',
          settings
        });
      }
    } catch (_) {
      sendResult({ status: 'ERROR', statusMsg: 'Self-destruct protection triggered, but SafeLedger could not complete vault cleanup.' });
    }
    return true;
  }
  settings.lockOutCount = Math.max(0, settings.numLockoutRetries - 1);
  settings.lockLogin = true;
  settings.lockLoginTime = Date.now();
  currentSettings = settings;
  await settingsManager.saveSettings(settingsDir, settings);
  sendResult({
    status: 'ERROR',
    statusMsg: 'Login temporarily locked. Self-destruct protection is disabled.',
    type: 'password-failed',
    settings
  });
  return true;
}

async function recordPasswordFailure() {
  if (await enforceRetryExhaustion()) return;
  const settings = await ensureCurrentSettings();
  cryptoSession.clearSession();
  settings.failAttemptCount++;
  if (settings.failAttemptCount >= settings.numFailAttempts) {
    settings.failAttemptCount = 0;
    settings.lockOutCount++;
    settings.lockLogin = true;
    settings.lockLoginTime = Date.now();
  }
  currentSettings = settings;
  await settingsManager.saveSettings(settingsDir, settings);
  sendResult({ status: 'ERROR', statusMsg: 'Invalid Password', type: 'password-failed', settings });
}

function createWindow() {
  configureStorage();
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0D47A1',
    icon: path.join(app.getAppPath(), 'sl.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.on('closed', () => {
    cryptoSession.clearSession();
    mainWindow = null;
  });
  buildMenu();
}

const showSettings = () => mainWindow && mainWindow.webContents.send('show-settings');

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('before-quit', () => cryptoSession.clearSession());

ipc.on('panic-lock', (_event, params = {}) => {
  cryptoSession.clearSession();
  securityMain.audit(getDataRoot(), params.reason || 'security-event');
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipc.on('record-password-failure', () => {
  recordPasswordFailure().catch(() => sendResult({ status: 'ERROR', statusMsg: 'Unable to update login security state.' }));
});

ipc.on('read', (_event, params) => {
  const key = getSessionKey();
  if (!key) return sendLocked();
  vault.readVault(path.join(vaultDir, params.file), key)
    .then((val) => sendResult({ status: 'SUCCESS', statusMsg: 'Load successful.', type: params.type, vaultData: val }))
    .catch((val) => sendResult(val));
});

ipc.on('read-vaultlist-init', async () => {
  try {
    if (await enforceRetryExhaustion()) return;
    const key = getSessionKey();
    if (!key) return sendLocked();
    const state = await vault.makeDir(vaultDir);
    if (state === 'CREATE') {
      await vault.initVaultList(vaultDir, key);
      await initializeModernVault(currentVault, key);
    }
    let valList;
    try {
      valList = await vault.readVaultList(path.join(vaultDir, 'vaultlist.json'), key);
    } catch (_) {
      return sendResult({
        status: 'ERROR',
        statusMsg: 'The master password was accepted, but the encrypted vault list could not be authenticated or read. Your failed-login counter was not changed.',
        type: 'vault-corrupt'
      });
    }
    const settings = await ensureCurrentSettings();
    settings.failAttemptCount = 0;
    settings.lockOutCount = 0;
    settings.lockLogin = false;
    settings.lockLoginTime = 0;
    currentSettings = settings;
    const saved = await settingsManager.saveSettings(settingsDir, settings);
    currentSettings = saved.settings;
    sendResult({
      status: 'SUCCESS',
      statusMsg: 'Loaded Successfully',
      type: 'vaultlist-init',
      vaultList: valList,
      sessionUnlocked: true,
      settings: currentSettings
    });
  } catch (_) {
    sendResult({ status: 'ERROR', statusMsg: 'Unable to access vault list' });
  }
});

ipc.on('process-vault-list', (_event, params) => {
  const key = getSessionKey();
  if (!key) return sendLocked();
  let idInfo = null;
  if (params.action === 'create') {
    idInfo = vault.nextVaultFileName(params.vaultList);
    params.vault.id = idInfo.id;
    params.vault.file = idInfo.fileName;
    params.vault.path = vaultDir;
    params.vaultList.vaults.push(params.vault);
    params.vaultList.vaults.sort(utils.compareIgnoreCase);
    params.vaultList.vaultSelected = params.vaultList.vaults.indexOf(params.vault);
  } else if (params.action === 'modify') {
    const vaults = params.vaultList.vaults;
    for (let i = 0; i < vaults.length; i++) {
      if (vaults[i].id == params.vault.id) { params.vaultList.vaults[i] = params.vault; break; }
    }
    params.vaultList.vaults.sort(utils.compareIgnoreCase);
    params.vaultList.vaultSelected = params.vaultList.vaults.indexOf(params.vault);
  }
  vault.saveVault(path.join(vaultDir, 'vaultlist.json'), JSON.stringify(params.vaultList), key)
    .then((val) => {
      if (params.action === 'create' && val === 'SUCCESS') {
        return initializeModernVault(idInfo.fileName, key).then((data) => sendResult({
          status: 'SUCCESS', statusMsg: 'Save successful', type: 'vault-create', vaultList: params.vaultList, vaultData: data
        }));
      }
      sendResult({ type: 'vault-modify', vaultList: params.vaultList, status: 'SUCCESS', statusMsg: 'Save successful' });
    })
    .catch(() => sendResult({ status: 'ERROR', statusMsg: 'Save failed' }));
});

ipc.on('vault-list-delete', (_event, params) => {
  const key = getSessionKey();
  if (!key) return sendLocked();
  vault.saveVault(path.join(vaultDir, 'vaultlist.json'), JSON.stringify(params.vaultList), key)
    .then(() => vault.deleteVault(path.join(vaultDir, params.fileName)))
    .then(() => sendResult({ type: 'vault-delete', status: 'SUCCESS', statusMsg: 'Delete successful' }))
    .catch(() => sendResult({ status: 'ERROR', statusMsg: 'Delete failed' }));
});

ipc.on('process-group', (_event, params) => {
  const key = getSessionKey();
  if (!key) return sendLocked();
  vault.saveVault(path.join(vaultDir, params.vaultData.file), JSON.stringify(params.vaultData), key)
    .then(() => sendResult({ status: 'SUCCESS', statusMsg: 'Save successful', type: params.type, vaultData: params.vaultData }))
    .catch(() => sendResult({ status: 'ERROR', statusMsg: 'Save failed' }));
});

ipc.on('process-record', (_event, params) => {
  const key = getSessionKey();
  if (!key) return sendLocked();
  vault.saveVault(path.join(vaultDir, params.vaultData.file), JSON.stringify(params.vaultData), key)
    .then(() => sendResult({ status: 'SUCCESS', statusMsg: 'Save successful', type: 'record', vaultData: params.vaultData }))
    .catch(() => sendResult({ status: 'ERROR', statusMsg: 'Save failed' }));
});

ipc.on('init-system', () => {
  securityMain.audit(getDataRoot(), 'app-opened');
  settingsManager.loadSettings(settingsDir)
    .then((valSettings) => {
      currentSettings = valSettings.settings;
      buildMenu();
      mainWindow.webContents.send('result-init-system', { settings: valSettings.settings, portableRoot: getPortableRoot() });
    })
    .catch(() => mainWindow.webContents.send('result-init-system', { status: 'ERROR', statusMsg: 'Not able to load settings file' }));
});

ipc.on('save-settings', (_event, params) => {
  settingsManager.saveSettings(settingsDir, params.newSettings)
    .then((val) => {
      currentSettings = val.settings;
      buildMenu();
      mainWindow.webContents.send('result-save-settings', { status: 'SUCCESS', statusMsg: 'Settings saved', settings: val.settings });
    })
    .catch((err) => mainWindow.webContents.send('result-save-settings', { status: 'ERROR', statusMsg: err.message || 'Unable to save settings' }));
});
