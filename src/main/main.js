'use strict';

const { app, BrowserWindow, Menu, ipcMain: ipc, dialog } = require('electron');
const remoteMain = require('@electron/remote/main');
const path = require('path');
const vault = require('./vault');
const walletCatalog = require('./wallet-catalog');
const walletCatalogUpdate = require('./wallet-catalog-update');
const utils = require('./utils');
const logger = require('./logger');
const installCodeManager = require('./installManager/installManager/installCodeManager');
const settingsManager = require('./installManager/installManager/settingsManager');

remoteMain.initialize();

let mainWindow;
let vaultDir;
let settingsDir;
let currentSettings;
let activeVaultData = null;
let activeCryptoKey = null;
const currentVault = 'zvault-0.json';
const debug = false;

function getPortableRoot() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
  if (app.isPackaged) return path.dirname(process.execPath);
  return app.getAppPath();
}

function configureStorage() {
  const root = getPortableRoot();
  vaultDir = path.join(root, 'SafeLedgerData', 'vaults');
  settingsDir = path.join(root, 'SafeLedgerData', 'settings');
  logger.initLogger(settingsDir, debug);
}

function buildMenu() {
  const selfDestructEnabled = !currentSettings || currentSettings.scrubContentAfterRetries !== false;
  const template = [{
    label: 'SafeLedger',
    submenu: [
      { label: `Version ${app.getVersion()}`, enabled: false },
      { label: 'Settings', click: () => showSettings() },
      { label: 'Update Wallet Catalog', click: () => updateCurrentWalletCatalog() },
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

async function updateCurrentWalletCatalog() {
  if (!activeVaultData || !activeCryptoKey || !activeVaultData.file) {
    await dialog.showMessageBox(mainWindow, {
      type: 'info', buttons: ['OK'], title: 'Update Wallet Catalog', message: 'Open a profile first',
      detail: 'Select and open a SafeLedger profile, then choose Update Wallet Catalog again.'
    });
    return;
  }
  const confirmation = await dialog.showMessageBox(mainWindow, {
    type: 'question', buttons: ['Update Catalog', 'Cancel'], defaultId: 0, cancelId: 1, noLink: true,
    title: 'Update Wallet Catalog', message: 'Add newly supported wallets and assets to this profile?',
    detail: 'SafeLedger will only add missing catalog wallets, networks and token families. Existing private keys, seed phrases, addresses, passwords, notes, custom wallets and custom records will not be overwritten or deleted.'
  });
  if (confirmation.response !== 0) return;
  try {
    const updatedVault = JSON.parse(JSON.stringify(activeVaultData));
    const result = walletCatalogUpdate.mergeCatalog(updatedVault);
    await vault.saveVault(path.join(vaultDir, updatedVault.file), JSON.stringify(updatedVault), activeCryptoKey);
    activeVaultData = updatedVault;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('result', {
        status: 'SUCCESS',
        statusMsg: `Wallet catalog updated: ${result.addedWallets} wallet(s) and ${result.addedRecords} asset/network record(s) added. Existing data was preserved.`,
        type: 'catalog-update', vaultData: updatedVault
      });
    }
    await dialog.showMessageBox(mainWindow, {
      type: 'info', buttons: ['OK'], title: 'Wallet Catalog Updated', message: 'Catalog update complete',
      detail: `${result.addedWallets} new wallet(s) and ${result.addedRecords} new asset/network record(s) were added. Existing SafeLedger data was not overwritten.`
    });
  } catch (err) {
    await dialog.showMessageBox(mainWindow, {
      type: 'error', buttons: ['OK'], title: 'Wallet Catalog Update Failed',
      message: 'SafeLedger could not update this profile.',
      detail: err && err.message ? err.message : 'The existing profile was left unchanged.'
    });
  }
}

async function setSelfDestructProtection(enabled) {
  const existing = currentSettings || (await settingsManager.loadSettings(settingsDir)).settings;
  if (enabled) {
    const response = await dialog.showMessageBox(mainWindow, {
      type: 'warning', buttons: ['Enable Self-Destruct', 'Cancel'], defaultId: 1, cancelId: 1, noLink: true,
      title: 'Enable Self-Destruct Protection', message: 'Enable Self-Destruct Protection?',
      detail: 'After the configured failed-login and lockout limits are exhausted, SafeLedger will permanently destroy the encrypted vault files. This action cannot be undone.'
    });
    if (response.response !== 0) { buildMenu(); return; }
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
  const data = { file: vaultName, catalogVersion: '2026-08-19', groups: walletCatalog.buildDefaultGroups(today) };
  await vault.saveVault(path.join(vaultDir, vaultName), JSON.stringify(data), cryptoKey);
  return data;
}

async function createWindow() {
  configureStorage();
  try { currentSettings = (await settingsManager.loadSettings(settingsDir)).settings; }
  catch (err) { currentSettings = null; }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 770,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(app.getAppPath(), 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload-compat.js')
    }
  });

  remoteMain.enable(mainWindow.webContents);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.on('closed', () => {
    activeVaultData = null;
    activeCryptoKey = null;
    mainWindow = null;
  });
  buildMenu();
}

const showSettings = () => mainWindow && mainWindow.webContents.send('show-settings');

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

ipc.on('save', (evt, params) => {
  vault.saveVault(path.join(vaultDir, currentVault), JSON.stringify(params.vaultData), params.cryptoKey)
    .then((val) => mainWindow.webContents.send('result', val === 'SUCCESS'
      ? { status: 'SUCCESS', statusMsg: 'Save successful' }
      : { status: 'ERROR', statusMsg: 'Save failed' }))
    .catch(() => mainWindow.webContents.send('result', { status: 'ERROR', statusMsg: 'Save failed' }));
});

ipc.on('read', (evt, params) => {
  vault.readVault(path.join(vaultDir, params.file), params.cryptoKey)
    .then((val) => {
      activeVaultData = val;
      activeCryptoKey = params.cryptoKey;
      mainWindow.webContents.send('result', { status: 'SUCCESS', statusMsg: 'Load successful.', type: params.type, vaultData: val });
    })
    .catch((val) => mainWindow.webContents.send('result', val));
});

ipc.on('read-vaultlist-init', (evt, params) => {
  activeVaultData = null;
  activeCryptoKey = params.cryptoKey;
  if (params.settings.lockOutCount >= params.settings.numLockoutRetries) {
    if (params.settings.scrubContentAfterRetries !== false) {
      vault.scrubContent(vaultDir)
        .then(() => {
          activeVaultData = null;
          activeCryptoKey = null;
          params.settings.failAttemptCount = 0;
          params.settings.lockOutCount = 0;
          params.settings.lockLogin = false;
          currentSettings = params.settings;
          return settingsManager.saveSettings(settingsDir, params.settings);
        })
        .then(() => mainWindow.webContents.send('result-lockout-destroy', {
          status: 'ERROR',
          statusMsg: 'Self-destruct protection triggered. Encrypted vault data has been destroyed after repeated failed password attempts.',
          settings: params.settings
        }))
        .catch(() => mainWindow.webContents.send('result', {
          status: 'ERROR', statusMsg: 'Self-destruct protection triggered, but SafeLedger could not complete vault cleanup.'
        }));
      return;
    }
  }

  vault.readVault(path.join(vaultDir, 'vaultlist.json'), params.cryptoKey)
    .then((val) => mainWindow.webContents.send('result-read-vaultlist-init', { status:'SUCCESS', vaultList:val, cryptoKey:params.cryptoKey, settings:params.settings }))
    .catch((val) => mainWindow.webContents.send('result-read-vaultlist-init', val));
});

ipc.on('panic-lock', () => {
  activeVaultData = null;
  activeCryptoKey = null;
});

ipc.on('save-settings', async (evt, params) => {
  const saved = await settingsManager.saveSettings(settingsDir, params.newSettings);
  currentSettings = saved.settings;
  mainWindow.webContents.send('result-save-settings', saved);
  buildMenu();
});

ipc.on('init-system', async () => {
  try {
    const saved = await settingsManager.loadSettings(settingsDir);
    currentSettings = saved.settings;
    const install = await installCodeManager.checkInstallCode();
    mainWindow.webContents.send('result-init-system', {
      status: saved.status || 'SUCCESS', statusMsg: saved.statusMsg || '', settings: currentSettings,
      keyStatus: install.status || 'SUCCESS', keyCode: install.keyCode, initialCode: install.initialCode
    });
    buildMenu();
  } catch (err) {
    mainWindow.webContents.send('result-init-system', { status:'ERROR', statusMsg: err.message, keyStatus:'SUCCESS', settings: currentSettings || {} });
  }
});

// Legacy IPC handlers below are retained for database compatibility.
ipc.on('save-install-code', (evt) => evt.sender.send('result-save-install-code', { status:'SUCCESS', statusMsg:'SafeLedger is free; no activation is required.', settings:currentSettings, keyCode:null }));
ipc.on('vault-list-delete', (evt, params) => vault.deleteVault(path.join(vaultDir, params.fileName), params.vaultList, params.cryptoKey)
  .then((val) => mainWindow.webContents.send('result', val)).catch((err) => mainWindow.webContents.send('result', {status:'ERROR',statusMsg:err.message})));
ipc.on('vault-list-create', async (evt, params) => {
  try {
    await initializeModernVault(params.vault.file, params.cryptoKey);
    await vault.saveVault(path.join(vaultDir, 'vaultlist.json'), JSON.stringify(params.vaultList), params.cryptoKey);
    mainWindow.webContents.send('result', { status:'SUCCESS', statusMsg:'Profile created', type:'vault-list-create', vaultList:params.vaultList });
  } catch (err) { mainWindow.webContents.send('result', {status:'ERROR',statusMsg:err.message}); }
});
ipc.on('process-group', (evt, params) => vault.saveVault(path.join(vaultDir, params.vaultData.file), JSON.stringify(params.vaultData), params.cryptoKey)
  .then(() => { activeVaultData=params.vaultData; activeCryptoKey=params.cryptoKey; mainWindow.webContents.send('result',{status:'SUCCESS',statusMsg:'Save successful',type:params.type,vaultData:params.vaultData}); })
  .catch((err) => mainWindow.webContents.send('result',{status:'ERROR',statusMsg:err.message})));
ipc.on('process-record', (evt, params) => vault.saveVault(path.join(vaultDir, params.vaultData.file), JSON.stringify(params.vaultData), params.cryptoKey)
  .then(() => { activeVaultData=params.vaultData; activeCryptoKey=params.cryptoKey; mainWindow.webContents.send('result',{status:'SUCCESS',statusMsg:'Save successful',type:'record',vaultData:params.vaultData}); })
  .catch((err) => mainWindow.webContents.send('result',{status:'ERROR',statusMsg:err.message})));
