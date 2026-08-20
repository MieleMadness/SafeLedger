'use strict';

const { app, BrowserWindow, Menu, ipcMain: ipc, dialog } = require('electron');
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
let currentSettings;
let activeVaultData = null;
let activeCryptoKey = null;
let walletCatalog = null;
const currentVault = 'zvault-0.json';
const debug = false;
const excludedDefaultWallets = new Set(['bitbox02 multi', 'coldcard', 'keystone', 'rabby wallet']);

function getWalletCatalog() {
  if (!walletCatalog) walletCatalog = require('./wallet-catalog');
  return walletCatalog;
}

function isExcludedDefaultWallet(group) {
  return excludedDefaultWallets.has(String(group && group.name || '').trim().toLowerCase());
}

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
  const data = {
    file: vaultName,
    catalogVersion: '2026-08-20.3',
    groups
  };
  await vault.saveVault(path.join(vaultDir, vaultName), JSON.stringify(data), cryptoKey);
  return data;
}

function createWindow() {
  configureStorage();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 770,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0D47A1',
    icon: path.join(app.getAppPath(), 'sl.png'),
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

    params.settings.lockOutCount = Math.max(0, params.settings.numLockoutRetries - 1);
    params.settings.lockLogin = true;
    params.settings.lockLoginTime = Date.now();
    currentSettings = params.settings;
    settingsManager.saveSettings(settingsDir, params.settings)
      .finally(() => mainWindow.webContents.send('result', {
        status: 'ERROR', statusMsg: 'Login temporarily locked. Self-destruct protection is disabled.',
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
        currentSettings = params.settings;
        return settingsManager.saveSettings(settingsDir, params.settings).then(() => {
          mainWindow.webContents.send('result', {
            status: 'SUCCESS', statusMsg: 'Loaded Successfully', type: 'vaultlist-init',
            vaultList: valList, cryptoKey: params.cryptoKey, settings: params.settings
          });
        });
      })
      .catch((valList) => {
        activeCryptoKey = null;
        params.settings.failAttemptCount++;
        if (params.settings.failAttemptCount >= params.settings.numFailAttempts) {
          params.settings.failAttemptCount = 0;
          params.settings.lockOutCount++;
          params.settings.lockLogin = true;
          params.settings.lockLoginTime = Date.now();
        }
        currentSettings = params.settings;
        return settingsManager.saveSettings(settingsDir, params.settings).then(() => {
          valList.settings = params.settings;
          mainWindow.webContents.send('result', valList);
        });
      });

    if (state === 'CREATE') {
      return vault.initVaultList(vaultDir, params.cryptoKey)
        .then(() => initializeModernVault(currentVault, params.cryptoKey))
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
        return initializeModernVault(idInfo.fileName, params.cryptoKey)
          .then((data) => {
            activeVaultData = data;
            activeCryptoKey = params.cryptoKey;
            mainWindow.webContents.send('result', {
              status: 'SUCCESS', statusMsg: 'Save successful', type: 'vault-create', vaultList: params.vaultList, vaultData: data
            });
          });
      }
      mainWindow.webContents.send('result', { type: 'vault-modify', vaultList: params.vaultList, status: 'SUCCESS', statusMsg: 'Save successful' });
    })
    .catch(() => mainWindow.webContents.send('result', { status: 'ERROR', statusMsg: 'Save failed' }));
});

ipc.on('vault-list-delete', (evt, params) => {
  vault.saveVault(path.join(vaultDir, 'vaultlist.json'), JSON.stringify(params.vaultList), params.cryptoKey)
    .then(() => vault.deleteVault(path.join(vaultDir, params.fileName)))
    .then(() => {
      if (activeVaultData && activeVaultData.file === params.fileName) activeVaultData = null;
      mainWindow.webContents.send('result', { type: 'vault-delete', status: 'SUCCESS', statusMsg: 'Delete successful' });
    })
    .catch(() => mainWindow.webContents.send('result', { status: 'ERROR', statusMsg: 'Delete failed' }));
});

ipc.on('process-group', (evt, params) => {
  vault.saveVault(path.join(vaultDir, params.vaultData.file), JSON.stringify(params.vaultData), params.cryptoKey)
    .then(() => {
      activeVaultData = params.vaultData;
      activeCryptoKey = params.cryptoKey;
      mainWindow.webContents.send('result', { status: 'SUCCESS', statusMsg: 'Save successful', type: params.type, vaultData: params.vaultData });
    })
    .catch(() => mainWindow.webContents.send('result', { status: 'ERROR', statusMsg: 'Save failed' }));
});

ipc.on('process-record', (evt, params) => {
  vault.saveVault(path.join(vaultDir, params.vaultData.file), JSON.stringify(params.vaultData), params.cryptoKey)
    .then(() => {
      activeVaultData = params.vaultData;
      activeCryptoKey = params.cryptoKey;
      mainWindow.webContents.send('result', { status: 'SUCCESS', statusMsg: 'Save successful', type: 'record', vaultData: params.vaultData });
    })
    .catch(() => mainWindow.webContents.send('result', { status: 'ERROR', statusMsg: 'Save failed' }));
});

ipc.on('process-rotate-crypto', (evt, params) => {
  vault.rotateCrypto(vaultDir, params.oldCryptoKey, params.newCryptoKey, params.vaultList)
    .then((val) => {
      if (val && val.status === 'SUCCESS') activeCryptoKey = params.newCryptoKey;
      mainWindow.webContents.send('result-rotate-crypto', val);
    })
    .catch((val) => mainWindow.webContents.send('result-rotate-crypto', val));
});

ipc.on('init-system', () => {
  settingsManager.loadSettings(settingsDir)
    .then((valSettings) => {
      currentSettings = valSettings.settings;
      buildMenu();
      return installCodeManager.checkInstallCode(settingsDir)
        .then(() => mainWindow.webContents.send('result-init-system', {
          keyStatus: 'SUCCESS', settings: valSettings.settings, portableRoot: getPortableRoot()
        }));
    })
    .catch(() => mainWindow.webContents.send('result-init-system', {
      status: 'ERROR', statusMsg: 'Not able to load settings file'
    }));
});

ipc.on('save-install-code', (evt, params) => {
  const settings = Object.assign({}, params.newSettings || {}, { activationCode: 'FREE' });
  settingsManager.saveSettings(settingsDir, settings)
    .then((val) => {
      currentSettings = val.settings;
      buildMenu();
      mainWindow.webContents.send('result-save-install-code', {
        status: 'SUCCESS', statusMsg: 'SafeLedger is free; no activation is required.', settings: val.settings
      });
    })
    .catch(() => mainWindow.webContents.send('result-save-install-code', { status: 'ERROR', statusMsg: 'Unable to save settings' }));
});

ipc.on('save-settings', (evt, params) => {
  settingsManager.saveSettings(settingsDir, params.newSettings)
    .then((val) => {
      currentSettings = val.settings;
      buildMenu();
      mainWindow.webContents.send('result-save-settings', {
        status: 'SUCCESS', statusMsg: 'Settings saved', settings: val.settings
      });
    })
    .catch((err) => mainWindow.webContents.send('result-save-settings', {
      status: 'ERROR', statusMsg: err.message || 'Unable to save settings'
    }));
});
