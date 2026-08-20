'use strict';

const { app, BrowserWindow, Menu, ipcMain: ipc } = require('electron');
const remoteMain = require('@electron/remote/main');
const path = require('path');
const vault = require('./vault');
const utils = require('./utils');
const logger = require('./logger');
const installCodeManager = require('./installManager/installManager/installCodeManager');
const settingsManager = require('./installManager/installManager/settingsManager');

remoteMain.initialize();

let mainWindow;
let vaultDir;
let settingsDir;
const currentVault = 'zvault-0.json';
const debug = false;

function getPortableRoot() {
  // electron-builder sets this when running the single-file portable EXE.
  if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
  // A normal unpacked/local build keeps its data beside SafeLedger.exe.
  if (app.isPackaged) return path.dirname(process.execPath);
  // Development mode keeps test data in the project directory.
  return app.getAppPath();
}

function configureStorage() {
  const root = getPortableRoot();
  vaultDir = path.join(root, 'SafeLedgerData', 'vaults');
  settingsDir = path.join(root, 'SafeLedgerData', 'settings');
  logger.initLogger(settingsDir, debug);
}

function createWindow() {
  configureStorage();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 770,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(app.getAppPath(), 'sl.png'),
    webPreferences: {
      // Temporary compatibility bridge for the 1.x renderer. This lets the old
      // UI run on current Electron while legacy Node access is migrated to a
      // context-isolated preload API in the next security pass.
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload-compat.js')
    }
  });

  remoteMain.enable(mainWindow.webContents);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => { mainWindow = null; });

  const template = [{
    label: 'SafeLedger',
    submenu: [
      { label: `Version ${app.getVersion()}`, enabled: false },
      { label: 'Settings', click: () => showSettings() },
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
    .then((val) => mainWindow.webContents.send('result', { status: 'SUCCESS', statusMsg: 'Load successful.', type: params.type, vaultData: val }))
    .catch((val) => mainWindow.webContents.send('result', val));
});

ipc.on('read-vaultlist-init', (evt, params) => {
  // SafeLedger 2 no longer destroys vaults after failed logins. Existing
  // lockout settings are honored as throttling only.
  if (params.settings.lockOutCount >= params.settings.numLockoutRetries) {
    params.settings.lockOutCount = Math.max(0, params.settings.numLockoutRetries - 1);
    params.settings.lockLogin = true;
    params.settings.lockLoginTime = Date.now();
    settingsManager.saveSettings(settingsDir, params.settings)
      .finally(() => mainWindow.webContents.send('result', {
        status: 'ERROR', statusMsg: 'Login temporarily locked. Your vault data has not been deleted.',
        type: 'password-failed', settings: params.settings
      }));
    return;
  }

  vault.makeDir(vaultDir).then((state) => {
    const loadList = () => vault.readVaultList(path.join(vaultDir, 'vaultlist.json'), params.cryptoKey)
      .then((valList) => {
        params.settings.failAttemptCount = 0;
        params.settings.lockOutCount = 0;
        params.settings.lockLogin = false;
        return settingsManager.saveSettings(settingsDir, params.settings).then(() => {
          mainWindow.webContents.send('result', {
            status: 'SUCCESS', statusMsg: 'Loaded Successfully', type: 'vaultlist-init',
            vaultList: valList, cryptoKey: params.cryptoKey, settings: params.settings
          });
        });
      })
      .catch((valList) => {
        params.settings.failAttemptCount++;
        if (params.settings.failAttemptCount >= params.settings.numFailAttempts) {
          params.settings.failAttemptCount = 0;
          params.settings.lockOutCount++;
          params.settings.lockLogin = true;
          params.settings.lockLoginTime = Date.now();
        }
        return settingsManager.saveSettings(settingsDir, params.settings).then(() => {
          valList.settings = params.settings;
          mainWindow.webContents.send('result', valList);
        });
      });

    if (state === 'CREATE') {
      return vault.initVaultList(vaultDir, params.cryptoKey)
        .then(() => vault.initVaultData(vaultDir, currentVault, params.cryptoKey))
        .then(loadList);
    }
    return loadList();
  }).catch(() => mainWindow.webContents.send('result', { status: 'ERROR', statusMsg: 'Unable to access vault list' }));
});

ipc.on('process-vault-list', (evt, params) => {
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

  vault.saveVault(path.join(vaultDir, 'vaultlist.json'), JSON.stringify(params.vaultList), params.cryptoKey)
    .then((val) => {
      if (params.action === 'create' && val === 'SUCCESS') {
        return vault.initVaultData(vaultDir, idInfo.fileName, params.cryptoKey)
          .then((data) => mainWindow.webContents.send('result', {
            status: 'SUCCESS', statusMsg: 'Save successful', type: 'vault-create', vaultList: params.vaultList, vaultData: data
          }));
      }
      mainWindow.webContents.send('result', { type: 'vault-modify', vaultList: params.vaultList, status: 'SUCCESS', statusMsg: 'Save successful' });
    })
    .catch(() => mainWindow.webContents.send('result', { status: 'ERROR', statusMsg: 'Save failed' }));
});

ipc.on('vault-list-delete', (evt, params) => {
  vault.saveVault(path.join(vaultDir, 'vaultlist.json'), JSON.stringify(params.vaultList), params.cryptoKey)
    .then(() => vault.deleteVault(path.join(vaultDir, params.fileName)))
    .then(() => mainWindow.webContents.send('result', { type: 'vault-delete', status: 'SUCCESS', statusMsg: 'Delete successful' }))
    .catch(() => mainWindow.webContents.send('result', { status: 'ERROR', statusMsg: 'Delete failed' }));
});

ipc.on('process-group', (evt, params) => {
  vault.saveVault(path.join(vaultDir, params.vaultData.file), JSON.stringify(params.vaultData), params.cryptoKey)
    .then(() => mainWindow.webContents.send('result', { status: 'SUCCESS', statusMsg: 'Save successful', type: params.type, vaultData: params.vaultData }))
    .catch(() => mainWindow.webContents.send('result', { status: 'ERROR', statusMsg: 'Save failed' }));
});

ipc.on('process-record', (evt, params) => {
  vault.saveVault(path.join(vaultDir, params.vaultData.file), JSON.stringify(params.vaultData), params.cryptoKey)
    .then(() => mainWindow.webContents.send('result', { status: 'SUCCESS', statusMsg: 'Save successful', type: 'record', vaultData: params.vaultData }))
    .catch(() => mainWindow.webContents.send('result', { status: 'ERROR', statusMsg: 'Save failed' }));
});

ipc.on('process-rotate-crypto', (evt, params) => {
  vault.rotateCrypto(vaultDir, params.oldCryptoKey, params.newCryptoKey, params.vaultList)
    .then((val) => mainWindow.webContents.send('result-rotate-crypto', val))
    .catch((val) => mainWindow.webContents.send('result-rotate-crypto', val));
});

ipc.on('init-system', () => {
  settingsManager.loadSettings(settingsDir)
    .then((valSettings) => installCodeManager.checkInstallCode(settingsDir)
      .then(() => mainWindow.webContents.send('result-init-system', {
        keyStatus: 'SUCCESS', settings: valSettings.settings, portableRoot: getPortableRoot()
      })))
    .catch(() => mainWindow.webContents.send('result-init-system', {
      status: 'ERROR', statusMsg: 'Not able to load settings file'
    }));
});

// Retained only so old renderer code cannot fail if it sends this event.
ipc.on('save-install-code', (evt, params) => {
  const settings = Object.assign({}, params.newSettings || {}, { activationCode: 'FREE' });
  settingsManager.saveSettings(settingsDir, settings)
    .then((val) => mainWindow.webContents.send('result-save-install-code', {
      status: 'SUCCESS', statusMsg: 'SafeLedger is free; no activation is required.', settings: val.settings
    }))
    .catch(() => mainWindow.webContents.send('result-save-install-code', { status: 'ERROR', statusMsg: 'Unable to save settings' }));
});

ipc.on('save-settings', (evt, params) => {
  settingsManager.saveSettings(settingsDir, params.newSettings)
    .then((val) => mainWindow.webContents.send('result-save-settings', {
      status: 'SUCCESS', statusMsg: 'Settings saved', settings: val.settings
    }))
    .catch((err) => mainWindow.webContents.send('result-save-settings', {
      status: 'ERROR', statusMsg: err.message || 'Unable to save settings'
    }));
});
