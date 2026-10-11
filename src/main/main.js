'use strict';

const { app, BrowserWindow, Menu, ipcMain: ipc, dialog, clipboard, shell } = require('electron');
const path = require('path');
const vault = require('./robust-vault');
const vaultSchema = require('./vault-schema');
const runtimeUtils = require('./runtime-utils');
const utils = require('./utils');
const settingsManager = require('./settings-manager');
const cryptoSession = require('./crypto-session-main');
const { createLoginAttemptHandler } = require('./login-attempt-main');
const securityMain = require('./security-main');
const profileSetup = require('./profile-setup');
const profileTransaction = require('./profile-transaction');
const profileDeleteTransaction = require('./profile-delete-transaction');
const dataWriteService = require('./data-write-service');
const { createWorkspaceOperationQueue } = require('./workspace-operation-queue');

let mainWindow;
let vaultDir;
let settingsDir;
let currentSettings;
let coreIpcRegistered = false;
const currentVault = 'zvault-0.json';
const GUI_SMOKE = process.env.SAFELEDGER_GUI_SMOKE === '1';
const SAFELEDGER_SITE_URL = 'https://safeledger.tnypg.com';

function getPortableRoot() {
  return runtimeUtils.getPortableRoot({ appPath: app.getAppPath(), isPackaged: app.isPackaged });
}

function getDataRoot() {
  return path.join(getPortableRoot(), 'SafeLedgerData');
}

function getMainWindow() {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

function assertTrustedEvent(event) {
  const win = getMainWindow();
  if (!win || !event || event.sender !== win.webContents) {
    throw new Error('Untrusted SafeLedger IPC request.');
  }
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
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

function configureStorage() {
  const root = getPortableRoot();
  vaultDir = path.join(root, 'SafeLedgerData', 'vaults');
  settingsDir = path.join(root, 'SafeLedgerData', 'settings');
}

function showSettings() {
  const win = getMainWindow();
  if (win) win.webContents.send('show-settings');
}

function buildMenu() {
  if (process.platform !== 'darwin') {
    // Windows/Linux use the SafeLedger-owned themed renderer menu because the
    // native Electron menu bar cannot inherit the app light/dark palette.
    Menu.setApplicationMenu(null);
    const win = getMainWindow();
    if (win) {
      if (typeof win.setMenuBarVisibility === 'function') win.setMenuBarVisibility(false);
      if (typeof win.setAutoHideMenuBar === 'function') win.setAutoHideMenuBar(true);
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
      detail: 'After the configured failed-login and lockout limits are exhausted, SafeLedger attempts to overwrite and delete the local encrypted vault files. Storage devices and backups may retain recoverable copies, so physical erasure cannot be guaranteed. Keep a verified backup on separate storage before enabling this protection.'
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
  const win = getMainWindow();
  if (win) {
    win.webContents.send('result-save-settings', {
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
  const win = getMainWindow();
  if (win) win.webContents.send('result', payload);
}

function getSessionKey() {
  const key = cryptoSession.getSessionKey();
  if (!Buffer.isBuffer(key) || key.length !== 32) return null;
  return key;
}

function lockedResult() {
  return { status: 'ERROR', statusMsg: 'SafeLedger is locked. Please log in again.', type: 'session-locked' };
}

// The trusted main process owns workspace operation ordering, while each
// ipc.invoke caller receives its own response rather than a shared event.
const runWorkspaceOperation = createWorkspaceOperationQueue();

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
      const win = getMainWindow();
      if (win) {
        win.webContents.send('result-lockout-destroy', {
          status: 'ERROR',
          statusMsg: 'Self-destruct protection triggered. Local encrypted vault files were overwritten and removed. Storage-level copies and backups may remain.',
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
  const settings = await ensureCurrentSettings();
  cryptoSession.clearSession();
  settings.failAttemptCount++;
  if (settings.failAttemptCount >= settings.numFailAttempts) {
    settings.failAttemptCount = 0;
    settings.lockOutCount++;
    settings.lockLogin = true;
    settings.lockLoginTime = Date.now();
  }
  // An attempt is not considered recorded until the atomic settings write
  // succeeds. A write failure fails closed in login-attempt-main.js.
  const saved = await settingsManager.saveSettings(settingsDir, settings);
  currentSettings = saved.settings;
  return saved;
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
        // Real Chromium layout contract, not CSS-string snapshots. Exercise
        // Profile Search→results spacing and the icon frame in all three
        // appearance modes using the application's loaded stylesheets.
        const layout = await win.webContents.executeJavaScript(`(() => {
          const html = document.documentElement;
          const savedAppearance = html.getAttribute('data-appearance');
          const savedTheme = html.getAttribute('data-theme');
          const fixture = document.createElement('div');
          fixture.className = 'profile-icon-picker';
          fixture.style.cssText = 'position:fixed;top:12px;left:12px;width:360px;visibility:hidden;z-index:-1';
          const search = document.createElement('div');
          search.className = 'profile-icon-picker-search';
          search.style.height = '32px';
          const results = document.createElement('div');
          results.className = 'profile-icon-picker-results';
          const grid = document.createElement('div');
          grid.className = 'profile-icon-picker-grid';
          const option = document.createElement('button');
          option.className = 'profile-icon-option';
          const frame = document.createElement('span');
          frame.className = 'profile-icon-option-frame';
          const logo = document.createElement('img');
          logo.className = 'known-service-brand-image';
          frame.appendChild(logo);
          option.appendChild(frame);
          // The real icon tile has a trailing label span. Without it the
          // existing :last-child label rule stretches the frame to 100%.
          const label = document.createElement('span');
          label.textContent = 'GitHub';
          option.appendChild(label);
          grid.appendChild(option);
          results.appendChild(grid);
          fixture.appendChild(search);
          fixture.appendChild(results);
          document.body.appendChild(fixture);
          const checks = [];
          try {
            for (const appearance of ['light', 'colorful', 'dark']) {
              html.setAttribute('data-appearance', appearance);
              html.setAttribute('data-theme', appearance === 'dark' ? 'dark' : 'light');
              const gap = grid.getBoundingClientRect().top - search.getBoundingClientRect().bottom;
              const bounds = frame.getBoundingClientRect();
              const background = getComputedStyle(logo).backgroundColor;
              const gridDisplay = getComputedStyle(grid).display;
              if (gap < 9.5 || gap > 11.5) throw Error(appearance + ': icon results gap is ' + gap + 'px (expected 10px)');
              if (Math.abs(bounds.width - 40) > 0.5 || Math.abs(bounds.height - 40) > 0.5) {
                throw Error(appearance + ': icon frame dimensions are ' + bounds.width + 'x' + bounds.height);
              }
              if (gridDisplay !== 'grid') throw Error(appearance + ': Profile icon grid does not use CSS grid');
              if (background !== 'rgb(255, 255, 255)') throw Error(appearance + ': brand mark neutral backing missing');
              checks.push(appearance);
            }
            return { ok: true, checks };
          } catch (error) {
            return { ok: false, message: String(error && error.message || error) };
          } finally {
            fixture.remove();
            if (savedAppearance == null) html.removeAttribute('data-appearance');
            else html.setAttribute('data-appearance', savedAppearance);
            if (savedTheme == null) html.removeAttribute('data-theme');
            else html.setAttribute('data-theme', savedTheme);
          }
        })()`, true);
        if (!layout || layout.ok !== true) throw new Error('Profile layout: ' + (layout && layout.message || 'unknown render error'));
        if (layout.checks.join(',') !== 'light,colorful,dark') throw new Error('Profile layout contract did not cover all appearances');
        finish(true, 'sandboxed UI, invoke bridge, and real Light/Colorful/Dark Profile layout passed');
      } catch (err) {
        finish(false, err && err.message ? err.message : String(err));
      }
    }, 500);
  });
}

function createWindow() {
  const existing = getMainWindow();
  if (existing) return existing;

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
  return mainWindow;
}

function registerCoreIpcHandlers() {
  if (coreIpcRegistered) return false;
  coreIpcRegistered = true;

  const loginAttempt = createLoginAttemptHandler({
    loadSettings: async () => {
      const loaded = await settingsManager.loadSettings(settingsDir);
      currentSettings = loaded.settings;
      return currentSettings;
    },
    verifyPassword: (password) => cryptoSession.loginWithEnvelope(password),
    recordFailure: recordPasswordFailure,
    onExhaustion: enforceRetryExhaustion,
    clearSession: () => cryptoSession.clearSession()
  });
  cryptoSession.registerIpcHandlers({ getMainWindow, loginAttempt });
  securityMain.registerIpcHandlers({
    ipc,
    dialog,
    clipboard,
    cryptoSession,
    getMainWindow,
    getDataRoot
  });

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

  ipc.handle('read', (event, params = {}) => runWorkspaceOperation(async () => {
    try {
      assertTrustedEvent(event);
      if (!isPlainObject(params) || !vault.safeVaultFileName(params.file)) throw new Error('Invalid profile selection.');
      const key = getSessionKey();
      if (!key) return lockedResult();
      const val = await vault.readVault(path.join(vaultDir, params.file), key);
      return { status: 'SUCCESS', statusMsg: 'Load successful.', type: String(params.type || '').slice(0, 40), vaultData: val };
    } catch (err) {
      return err && err.status === 'ERROR' ? err : { status: 'ERROR', statusMsg: err && err.message || 'Unable to load Profile.' };
    }
  }));

  ipc.handle('read-vaultlist-init', (event) => runWorkspaceOperation(async () => {
    try {
      assertTrustedEvent(event);
      if (await enforceRetryExhaustion()) return { status: 'ERROR', statusMsg: 'Login protection limit reached.', type: 'password-failed', settings: await ensureCurrentSettings() };
      const key = getSessionKey();
      if (!key) return lockedResult();
      const state = await vault.makeDir(vaultDir);
      if (state === 'CREATE') {
        await vault.initVaultList(vaultDir, key);
        await initializeModernVault(currentVault, key);
      }
      await profileTransaction.recoverPending(vaultDir, key, vault.readVaultList);
      await profileDeleteTransaction.recoverPending(vaultDir, key, vault.readVaultList);
      let valList;
      try {
        valList = await vault.readVaultList(path.join(vaultDir, 'vaultlist.json'), key);
      } catch (_) {
        return ({
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
      return ({
        status: 'SUCCESS',
        statusMsg: 'Loaded Successfully',
        type: 'vaultlist-init',
        vaultList: valList,
        sessionUnlocked: true,
        settings: currentSettings
      });
    } catch (err) {
      return ({ status: 'ERROR', statusMsg: err && err.message ? err.message : 'Unable to access vault list' });
    }
  }));

  ipc.handle('process-vault-list', (event, params = {}) => runWorkspaceOperation(async () => {
    try {
      assertTrustedEvent(event);
      if (!isPlainObject(params) || !['create', 'modify'].includes(params.action) || !isPlainObject(params.vault)) {
        throw new Error('Invalid profile update.');
      }
    } catch (err) {
      return ({ status: 'ERROR', statusMsg: err.message || 'Invalid profile update.' });
    }

    const key = getSessionKey();
    if (!key) return lockedResult();
    try {
      if (params.action === 'modify') {
        const nextList = await dataWriteService.modifyProfile({ vault, vaultDir, key, profile: params.vault });
        await securityMain.audit(getDataRoot(), 'profile-updated');
        return ({ type: 'vault-modify', vaultList: nextList, status: 'SUCCESS', statusMsg: 'Save successful' });
      }

      // Resolve a pending deletion before choosing a new Profile file ID:
      // otherwise a new Profile could reuse the old ID while staged
      // ciphertext for the deleted Profile still occupies that identity.
      await profileDeleteTransaction.recoverPending(vaultDir, key, vault.readVaultList);
      const listFile = path.join(vaultDir, 'vaultlist.json');
      const authoritativeList = await vault.readVaultList(listFile, key);
      const profilePatch = dataWriteService.normalizeProfilePatch(params.vault);
      const newProfileWalletNames = resolveNewProfileWalletNames(params.profileSetup);
      const idInfo = vault.nextVaultFileName(authoritativeList);
      const nextProfile = Object.assign({}, profilePatch, {
        id: idInfo.id,
        file: idInfo.fileName,
        path: vaultDir,
        created: new Date().toISOString()
      });
      authoritativeList.vaults.push(nextProfile);
      authoritativeList.vaults.sort(utils.compareIgnoreCase);
      const selected = authoritativeList.vaults.indexOf(nextProfile);
      const persistedList = dataWriteService.stripProfileViewState(authoritativeList);
      const viewList = dataWriteService.withProfileViewState(authoritativeList, selected);
      const data = await profileTransaction.createProfile({
        vaultDir,
        nextList: persistedList,
        profileFile: idInfo.fileName,
        cryptoKey: key,
        walletNames: newProfileWalletNames,
        initializeProfile: initializeModernVault,
        saveList: vault.saveVault,
        readList: vault.readVaultList
      });
      await securityMain.audit(getDataRoot(), 'profile-created');
      return ({ status: 'SUCCESS', statusMsg: 'Save successful', type: 'vault-create', vaultList: viewList, vaultData: data });
    } catch (err) {
      return ({ status: 'ERROR', statusMsg: (err && (err.message || err.statusMsg)) || 'Save failed' });
    }
  }));

  ipc.handle('vault-list-delete', (event, params = {}) => runWorkspaceOperation(async () => {
    try {
      assertTrustedEvent(event);
      if (!isPlainObject(params) || !vault.safeVaultFileName(params.fileName)) throw new Error('Invalid profile deletion.');
    } catch (err) {
      return ({ status: 'ERROR', statusMsg: err.message || 'Invalid profile deletion.' });
    }
    const key = getSessionKey();
    if (!key) return lockedResult();
    try {
      const nextList = await dataWriteService.deleteProfile({ vault, vaultDir, key, fileName: params.fileName });
      await securityMain.audit(getDataRoot(), 'profile-deleted');
      return ({ type: 'vault-delete', status: 'DELETED', statusMsg: 'Item Deleted', vaultList: nextList });
    } catch (err) {
      return ({ status: 'ERROR', statusMsg: (err && err.message) || 'Delete failed' });
    }
  }));

  ipc.handle('process-group', (event, params = {}) => runWorkspaceOperation(async () => {
    let request;
    try {
      assertTrustedEvent(event);
      request = dataWriteService.groupCommandRequest(params);
    } catch (err) {
      return ({ status: 'ERROR', statusMsg: err.message || 'Invalid vault item update.' });
    }
    const key = getSessionKey();
    if (!key) return lockedResult();
    try {
      const data = await dataWriteService.mutateGroup({ vault, vaultDir, key, request });
      await securityMain.audit(getDataRoot(), groupActivityEvent(request));
      const deleted = request.type === 'group-delete';
      return ({
        status: deleted ? 'DELETED' : 'SUCCESS',
        statusMsg: deleted ? 'Item Deleted' : 'Save successful',
        type: request.type,
        vaultData: data
      });
    } catch (err) {
      return ({ status: 'ERROR', statusMsg: (err && err.message) || 'Save failed' });
    }
  }));

  ipc.handle('process-record', (event, params = {}) => runWorkspaceOperation(async () => {
    let request;
    try {
      assertTrustedEvent(event);
      request = dataWriteService.recordCommandRequest(params);
    } catch (err) {
      return ({ status: 'ERROR', statusMsg: err.message || 'Invalid asset update.' });
    }
    const key = getSessionKey();
    if (!key) return lockedResult();
    try {
      const data = await dataWriteService.mutateRecord({ vault, vaultDir, key, request });
      await securityMain.audit(getDataRoot(), recordActivityEvent(request));
      const deleted = request.action === 'delete';
      return ({
        status: deleted ? 'DELETED' : 'SUCCESS',
        statusMsg: deleted ? 'Item Deleted' : 'Save successful',
        type: 'record',
        vaultData: data
      });
    } catch (err) {
      return ({ status: 'ERROR', statusMsg: (err && err.message) || 'Save failed' });
    }
  }));

  ipc.on('init-system', (event) => {
    try { assertTrustedEvent(event); } catch (_) { return; }
    securityMain.audit(getDataRoot(), 'app-opened');
    settingsManager.loadSettings(settingsDir)
      .then((valSettings) => {
        currentSettings = valSettings.settings;
        buildMenu();
        const win = getMainWindow();
        if (win) win.webContents.send('result-init-system', { settings: valSettings.settings, portableRoot: getPortableRoot() });
      })
      .catch(() => {
        const win = getMainWindow();
        if (win) win.webContents.send('result-init-system', { status: 'ERROR', statusMsg: 'Not able to load settings file' });
      });
  });

  ipc.on('save-settings', (event, params = {}) => {
    try {
      assertTrustedEvent(event);
      if (!isPlainObject(params.newSettings)) throw new Error('Invalid settings update.');
    } catch (err) {
      const win = getMainWindow();
      if (win) win.webContents.send('result-save-settings', { status: 'ERROR', statusMsg: err.message || 'Invalid settings update.' });
      return;
    }
    settingsManager.saveUserSettings(settingsDir, params.newSettings)
      .then(async (val) => {
        currentSettings = val.settings;
        await securityMain.audit(getDataRoot(), 'settings-updated');
        buildMenu();
        const win = getMainWindow();
        if (win) win.webContents.send('result-save-settings', { status: 'SUCCESS', statusMsg: 'Settings saved', settings: val.settings });
      })
      .catch((err) => {
        const win = getMainWindow();
        if (win) win.webContents.send('result-save-settings', { status: 'ERROR', statusMsg: err.message || 'Unable to save settings' });
      });
  });

  return true;
}

function clearSession() {
  cryptoSession.clearSession();
}

module.exports = {
  createWindow,
  registerCoreIpcHandlers,
  getMainWindow,
  getPortableRoot,
  getDataRoot,
  clearSession,
  _test: {
    configureStorage,
    resolveNewProfileWalletNames
  }
};