'use strict';

const { app, BrowserWindow, Menu, ipcMain: ipc, dialog, clipboard, shell } = require('electron');
const path = require('path');
const vault = require('./robust-vault');
const vaultSchema = require('./vault-schema');
const runtimeUtils = require('./runtime-utils');
const utils = require('./utils');
const settingsManager = require('./installManager/installManager/settingsManager');
const cryptoSession = require('./crypto-session-main');
const securityMain = require('./security-main');
const profileSetup = require('./profile-setup');

let mainWindow;
let vaultDir;
let settingsDir;
let currentSettings;
const currentVault = 'zvault-0.json';
const GUI_SMOKE = process.env.SAFELEDGER_GUI_SMOKE === '1';
const SAFELEDGER_SITE_URL = 'https://safeledger.tnypg.com';

function getPortableRoot() {
  return runtimeUtils.getPortableRoot({ appPath: app.getAppPath(), isPackaged: app.isPackaged });
}

function getDataRoot() {
  return path.join(getPortableRoot(), 'SafeLedgerData');
}

function assertTrustedEvent(event) {
  if (!mainWindow || mainWindow.isDestroyed() || !event || event.sender !== mainWindow.webContents) {
    throw new Error('Untrusted SafeLedger IPC request.');
  }
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function safeActivityReason(value) {
  const reason = String(value || 'security-event').trim().slice(0, 80);
  return /^[a-z0-9-]+$/i.test(reason) ? reason : 'security-event';
}

function validateVaultList(list) {
  if (!vault.validVaultListStructure(list)) throw new Error('Invalid SafeLedger profile list.');
  return list;
}

function validateVaultData(data) {
  if (!isPlainObject(data) || !vault.safeVaultFileName(data.file)) throw new Error('Invalid SafeLedger vault data.');
  return vaultSchema.prepareForSave(data);
}

function resolveNewProfileWalletNames(setup) {
  // Older renderers did not send profileSetup. Preserve their existing
  // behavior by creating the standard starter profile in that case.
  if (setup == null) return profileSetup.standardNames();
  if (!isPlainObject(setup)) throw new Error('Invalid Profile starting setup.');

  const mode = String(setup.mode || '').trim().toLowerCase();
  if (mode === 'blank') return [];
  if (mode !== 'templates') throw new Error('Choose Blank Profile or Standard setup.');
  if (!Array.isArray(setup.walletNames)) throw new Error('Wallet template selection is invalid.');

  const unknown = profileSetup.unknownNames(setup.walletNames);
  if (unknown.length) throw new Error('One or more selected wallet templates are not recognized by SafeLedger.');
  const selected = profileSetup.resolveNames(setup.walletNames);
  if (!selected.length) throw new Error('Choose at least one wallet template or select Blank Profile.');
  return selected;
}

cryptoSession.registerIpcHandlers({ getMainWindow: () => mainWindow });
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
  if (process.platform !== 'darwin') {
    // Windows/Linux use the SafeLedger-owned themed renderer menu because the
    // native Electron menu bar cannot inherit the app light/dark palette.
    Menu.setApplicationMenu(null);
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (typeof mainWindow.setMenuBarVisibility === 'function') mainWindow.setMenuBarVisibility(false);
      if (typeof mainWindow.setAutoHideMenuBar === 'function') mainWindow.setAutoHideMenuBar(true);
    }
    return;
  }

  const template = [{
    label: 'SafeLedger',
    submenu: [
      {
        label: `Version ${app.getVersion()}`,
        click: () => { shell.openExternal(SAFELEDGER_SITE_URL).catch(() => {}); }
      },
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
      detail: 'After the configured failed-login and lockout limits are exhausted, SafeLedger will permanently destroy the encrypted vault files. This action cannot be undone. Keep a verified backup on separate storage before enabling this protection.'
    });
    if (response.response !== 0) {
      buildMenu();
      return;
    }
  }
  currentSettings = Object.assign({}, existing, { scrubContentAfterRetries: enabled === true });
  const saved = await settingsManager.saveSettings(settingsDir, currentSettings);
  currentSettings = saved.settings;
  await securityMain.audit(getDataRoot(), 'self-destruct-protection-changed');
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

async function initializeModernVault(vaultName, cryptoKey, walletNames = profileSetup.standardNames()) {
  const today = new Date().toISOString();
  const groups = profileSetup.buildGroups(today, walletNames);
  const data = vaultSchema.prepareForSave({ file: vaultName, catalogVersion: '2026-08-20.3', groups });
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

function groupActivityEvent(params = {}) {
  if (params.activityEvent === 'recovery-verified' || params.activityEvent === 'recovery-drill-completed') return params.activityEvent;
  return ({
    'group-create': 'wallet-created',
    'group-modify': 'wallet-updated',
    'group-delete': 'wallet-deleted'
  })[params.type] || 'wallet-updated';
}

function recordActivityEvent(params = {}) {
  return ({
    create: 'asset-created',
    modify: 'asset-updated',
    delete: 'asset-deleted'
  })[params.action] || 'asset-updated';
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
  if (settings.scrubContentAfterRetries === true) {
    try {
      await vault.scrubContent(vaultDir);
      settings.failAttemptCount = 0;
      settings.lockOutCount = 0;
      settings.lockLogin = false;
      settings.lockLoginTime = 0;
      currentSettings = settings;
      await settingsManager.saveSettings(settingsDir, settings);
      await securityMain.audit(getDataRoot(), 'self-destruct-triggered');
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

function installGuiSmokeProbe(win) {
  if (!GUI_SMOKE) return;
  let finished = false;
  const finish = (ok, message) => {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    const method = ok ? 'log' : 'error';
    console[method](`${ok ? 'PASS' : 'FAIL'} SafeLedger GUI startup smoke: ${message}`);
    cryptoSession.clearSession();
    setTimeout(() => app.exit(ok ? 0 : 1), 25);
  };
  const timeout = setTimeout(() => finish(false, 'timed out waiting for the real application window'), 15000);

  win.webContents.on('preload-error', (_event, preloadPath, error) =>
    finish(false, `preload failed (${preloadPath}): ${error && error.message ? error.message : error}`));
  win.webContents.on('render-process-gone', (_event, details) =>
    finish(false, `renderer exited unexpectedly: ${details && details.reason ? details.reason : 'unknown reason'}`));
  win.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const state = await win.webContents.executeJavaScript(`(() => ({
          title: document.title,
          rendererReady: document.documentElement.dataset.safeLedgerRendererReady === 'true',
          hasApi: !!window.safeLedgerApi,
          hasInitSystem: !!window.safeLedgerApi && typeof window.safeLedgerApi.initSystem === 'function',
          hasDetailArea: !!document.getElementById('detailArea'),
          hasPanicButton: !!document.getElementById('panicLockButton')
        }))()`, true);
        if (state.title !== 'SafeLedger') throw new Error(`unexpected title: ${state.title}`);
        if (!state.rendererReady) throw new Error('renderer bundle did not report ready');
        if (!state.hasApi || !state.hasInitSystem) throw new Error('sandbox preload bridge is unavailable');
        if (!state.hasDetailArea || !state.hasPanicButton) throw new Error('core SafeLedger UI did not render');
        finish(true, 'real sandboxed window, preload bridge, renderer bundle, and core UI loaded');
      } catch (err) {
        finish(false, err && err.message ? err.message : String(err));
      }
    }, 500);
  });
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
    show: !GUI_SMOKE,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  installGuiSmokeProbe(mainWindow);
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

ipc.on('request-settings', (event) => {
  try { assertTrustedEvent(event); } catch (_) { return; }
  showSettings();
});

ipc.handle('set-self-destruct-protection', async (event, enabled) => {
  assertTrustedEvent(event);
  await setSelfDestructProtection(enabled === true);
  const settings = await ensureCurrentSettings();
  return { ok: true, enabled: settings.scrubContentAfterRetries === true };
});

ipc.on('panic-lock', (event, params = {}) => {
  try { assertTrustedEvent(event); } catch (_) { return; }
  cryptoSession.clearSession();
  securityMain.audit(getDataRoot(), safeActivityReason(params && params.reason));
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Discard decrypted renderer state as well as the main-process DEK. A
    // trusted main-process reload is not blocked by the renderer navigation
    // policy and rebuilds SafeLedger at the login screen.
    mainWindow.minimize();
    mainWindow.webContents.reload();
  }
});

ipc.on('record-password-failure', (event) => {
  try { assertTrustedEvent(event); } catch (_) { return; }
  recordPasswordFailure().catch(() => sendResult({ status: 'ERROR', statusMsg: 'Unable to update login security state.' }));
});

ipc.on('read', (event, params = {}) => {
  try {
    assertTrustedEvent(event);
    if (!isPlainObject(params) || !vault.safeVaultFileName(params.file)) throw new Error('Invalid profile selection.');
  } catch (err) {
    return sendResult({ status: 'ERROR', statusMsg: err.message || 'Invalid profile selection.' });
  }
  const key = getSessionKey();
  if (!key) return sendLocked();
  vault.readVault(path.join(vaultDir, params.file), key)
    .then((val) => sendResult({ status: 'SUCCESS', statusMsg: 'Load successful.', type: String(params.type || '').slice(0, 40), vaultData: val }))
    .catch((val) => sendResult(val));
});

ipc.on('read-vaultlist-init', async (event) => {
  try {
    assertTrustedEvent(event);
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
    await securityMain.audit(getDataRoot(), 'vault-unlocked');
    sendResult({
      status: 'SUCCESS',
      statusMsg: 'Loaded Successfully',
      type: 'vaultlist-init',
      vaultList: valList,
      sessionUnlocked: true,
      settings: currentSettings
    });
  } catch (err) {
    sendResult({ status: 'ERROR', statusMsg: err && err.message ? err.message : 'Unable to access vault list' });
  }
});

ipc.on('process-vault-list', (event, params = {}) => {
  let nextList;
  let nextProfile;
  let idInfo = null;
  let newProfileWalletNames = null;
  try {
    assertTrustedEvent(event);
    if (!isPlainObject(params) || !['create', 'modify'].includes(params.action) || !isPlainObject(params.vault) || !isPlainObject(params.vaultList)) {
      throw new Error('Invalid profile update.');
    }
    validateVaultList(params.vaultList);
    nextList = JSON.parse(JSON.stringify(params.vaultList));
    nextProfile = JSON.parse(JSON.stringify(params.vault));
    nextProfile.name = String(nextProfile.name || '').trim().slice(0, 100);
    if (!nextProfile.name) throw new Error('Profile name is required.');

    if (params.action === 'create') {
      newProfileWalletNames = resolveNewProfileWalletNames(params.profileSetup);
      idInfo = vault.nextVaultFileName(nextList);
      nextProfile.id = idInfo.id;
      nextProfile.file = idInfo.fileName;
      nextProfile.path = vaultDir;
      nextProfile.created = nextProfile.created || new Date().toISOString();
      nextList.vaults.push(nextProfile);
    } else {
      const index = nextList.vaults.findIndex((item) => Number(item && item.id) === Number(nextProfile.id));
      if (index < 0) throw new Error('Profile was not found.');
      const existing = nextList.vaults[index];
      nextProfile.id = existing.id;
      nextProfile.file = existing.file;
      nextProfile.path = vaultDir;
      nextProfile.created = existing.created || nextProfile.created || new Date().toISOString();
      nextList.vaults[index] = nextProfile;
    }
    nextList.vaults.sort(utils.compareIgnoreCase);
    nextList.vaultSelected = nextList.vaults.indexOf(nextProfile);
    validateVaultList(nextList);
  } catch (err) {
    return sendResult({ status: 'ERROR', statusMsg: err.message || 'Invalid profile update.' });
  }

  const key = getSessionKey();
  if (!key) return sendLocked();
  vault.saveVault(path.join(vaultDir, 'vaultlist.json'), JSON.stringify(nextList), key)
    .then(async (val) => {
      if (params.action === 'create' && val === 'SUCCESS') {
        const data = await initializeModernVault(idInfo.fileName, key, newProfileWalletNames);
        await securityMain.audit(getDataRoot(), 'profile-created');
        return sendResult({ status: 'SUCCESS', statusMsg: 'Save successful', type: 'vault-create', vaultList: nextList, vaultData: data });
      }
      await securityMain.audit(getDataRoot(), 'profile-updated');
      sendResult({ type: 'vault-modify', vaultList: nextList, status: 'SUCCESS', statusMsg: 'Save successful' });
    })
    .catch(() => sendResult({ status: 'ERROR', statusMsg: 'Save failed' }));
});

ipc.on('vault-list-delete', (event, params = {}) => {
  let nextList;
  try {
    assertTrustedEvent(event);
    if (!isPlainObject(params) || !vault.safeVaultFileName(params.fileName) || !isPlainObject(params.vaultList)) throw new Error('Invalid profile deletion.');
    nextList = JSON.parse(JSON.stringify(params.vaultList));
    validateVaultList(nextList);
    if (nextList.vaults.some((item) => item.file === params.fileName)) throw new Error('Profile list still references the file being deleted.');
  } catch (err) {
    return sendResult({ status: 'ERROR', statusMsg: err.message || 'Invalid profile deletion.' });
  }
  const key = getSessionKey();
  if (!key) return sendLocked();
  vault.saveVault(path.join(vaultDir, 'vaultlist.json'), JSON.stringify(nextList), key)
    .then(() => vault.deleteVault(path.join(vaultDir, params.fileName)))
    .then(async () => {
      await securityMain.audit(getDataRoot(), 'profile-deleted');
      sendResult({ type: 'vault-delete', status: 'SUCCESS', statusMsg: 'Delete successful' });
    })
    .catch(() => sendResult({ status: 'ERROR', statusMsg: 'Delete failed' }));
});

ipc.on('process-group', (event, params = {}) => {
  let data;
  try {
    assertTrustedEvent(event);
    data = validateVaultData(params.vaultData);
  } catch (err) {
    return sendResult({ status: 'ERROR', statusMsg: err.message || 'Invalid wallet update.' });
  }
  const key = getSessionKey();
  if (!key) return sendLocked();
  vault.saveVault(path.join(vaultDir, data.file), JSON.stringify(data), key)
    .then(async () => {
      await securityMain.audit(getDataRoot(), groupActivityEvent(params));
      sendResult({ status: 'SUCCESS', statusMsg: 'Save successful', type: params.type, vaultData: data });
    })
    .catch(() => sendResult({ status: 'ERROR', statusMsg: 'Save failed' }));
});

ipc.on('process-record', (event, params = {}) => {
  let data;
  try {
    assertTrustedEvent(event);
    data = validateVaultData(params.vaultData);
  } catch (err) {
    return sendResult({ status: 'ERROR', statusMsg: err.message || 'Invalid asset update.' });
  }
  const key = getSessionKey();
  if (!key) return sendLocked();
  vault.saveVault(path.join(vaultDir, data.file), JSON.stringify(data), key)
    .then(async () => {
      await securityMain.audit(getDataRoot(), recordActivityEvent(params));
      sendResult({ status: 'SUCCESS', statusMsg: 'Save successful', type: 'record', vaultData: data });
    })
    .catch(() => sendResult({ status: 'ERROR', statusMsg: 'Save failed' }));
});

ipc.on('init-system', (event) => {
  try { assertTrustedEvent(event); } catch (_) { return; }
  securityMain.audit(getDataRoot(), 'app-opened');
  settingsManager.loadSettings(settingsDir)
    .then((valSettings) => {
      currentSettings = valSettings.settings;
      buildMenu();
      mainWindow.webContents.send('result-init-system', { settings: valSettings.settings, portableRoot: getPortableRoot() });
    })
    .catch(() => mainWindow.webContents.send('result-init-system', { status: 'ERROR', statusMsg: 'Not able to load settings file' }));
});

ipc.on('save-settings', (event, params = {}) => {
  try {
    assertTrustedEvent(event);
    if (!isPlainObject(params.newSettings)) throw new Error('Invalid settings update.');
  } catch (err) {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('result-save-settings', { status: 'ERROR', statusMsg: err.message || 'Invalid settings update.' });
    return;
  }
  settingsManager.saveSettings(settingsDir, params.newSettings)
    .then(async (val) => {
      currentSettings = val.settings;
      await securityMain.audit(getDataRoot(), 'settings-updated');
      buildMenu();
      mainWindow.webContents.send('result-save-settings', { status: 'SUCCESS', statusMsg: 'Settings saved', settings: val.settings });
    })
    .catch((err) => mainWindow.webContents.send('result-save-settings', { status: 'ERROR', statusMsg: err.message || 'Unable to save settings' }));
});