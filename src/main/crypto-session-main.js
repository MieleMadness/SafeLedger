'use strict';

const fs = require('fs');
const path = require('path');
const keyEnvelope = require('./key-envelope');
const runtimeUtils = require('./runtime-utils');
const { atomicWriteJson } = require('./atomic-file');

const ENVELOPE_FILE = 'key-envelope.json';

function createController(vaultDir) {
  const envelopePath = path.join(vaultDir, ENVELOPE_FILE);
  const vaultListPath = path.join(vaultDir, 'vaultlist.json');
  let activeDataKey = null;

  const hasEnvelope = () => fs.existsSync(envelopePath);
  const isUnlocked = () => Buffer.isBuffer(activeDataKey) && activeDataKey.length === keyEnvelope.KEY_BYTES;

  function clearSession() {
    if (Buffer.isBuffer(activeDataKey)) activeDataKey.fill(0);
    activeDataKey = null;
  }

  function setSessionKey(dataKey) {
    if (!Buffer.isBuffer(dataKey) || dataKey.length !== keyEnvelope.KEY_BYTES) {
      throw new Error('SafeLedger data key has an invalid length.');
    }
    clearSession();
    activeDataKey = Buffer.from(dataKey);
  }

  function getSessionKey() {
    return activeDataKey;
  }

  async function readEnvelope() {
    let parsed;
    try { parsed = JSON.parse(await fs.promises.readFile(envelopePath, 'utf8')); }
    catch (err) {
      if (err.code === 'ENOENT') return null;
      throw new Error('SafeLedger key envelope is unreadable or damaged.');
    }
    if (!keyEnvelope.validateEnvelope(parsed)) throw new Error('SafeLedger key envelope is damaged or unsupported.');
    return parsed;
  }

  async function initializeSession(password) {
    clearSession();
    if (hasEnvelope()) return { ok: false, type: 'already-initialized', message: 'SafeLedger is already initialized.' };
    if (fs.existsSync(vaultListPath)) {
      return {
        ok: false,
        type: 'unsupported-legacy-data',
        message: 'This SafeLedgerData folder contains data without the current key envelope. Keep it untouched and use the SafeLedger 1.x importer from a separate SafeLedger 2.x data folder.'
      };
    }
    const created = await keyEnvelope.createEnvelope(password);
    try {
      await atomicWriteJson(envelopePath, created.envelope);
      setSessionKey(created.dataKey);
      return {
        ok: true,
        initialized: true,
        unlocked: true,
        envelopeVersion: created.envelope.version
      };
    } finally {
      created.dataKey.fill(0);
    }
  }

  async function loginWithEnvelope(password) {
    clearSession();
    let envelope;
    try { envelope = await readEnvelope(); }
    catch (err) { return { ok: false, type: 'envelope-corrupt', message: err.message }; }
    if (!envelope) return { ok: false, type: 'not-initialized', message: 'SafeLedger has not been initialized.' };

    const unlocked = await keyEnvelope.unlockEnvelope(password, envelope);
    if (!unlocked.ok) return unlocked;
    try {
      setSessionKey(unlocked.dataKey);
      return {
        ok: true,
        unlocked: true,
        envelopeVersion: envelope.version
      };
    } finally {
      unlocked.dataKey.fill(0);
    }
  }

  async function changePassword(oldPassword, newPassword) {
    let envelope;
    try { envelope = await readEnvelope(); }
    catch (err) { return { ok: false, type: 'envelope-corrupt', message: err.message }; }
    if (!envelope) return { ok: false, type: 'not-initialized', message: 'SafeLedger has not been initialized.' };

    const rewrapped = await keyEnvelope.rewrapEnvelope(oldPassword, newPassword, envelope);
    if (!rewrapped.ok) return rewrapped;
    try {
      rewrapped.envelope.modified = new Date().toISOString();
      await atomicWriteJson(envelopePath, rewrapped.envelope);
      setSessionKey(rewrapped.dataKey);
      return {
        ok: true,
        status: 'SUCCESS',
        statusMsg: 'Password change successful. Vault data did not need to be re-encrypted.',
        unlocked: true,
        envelopeVersion: rewrapped.envelope.version
      };
    } finally {
      rewrapped.dataKey.fill(0);
    }
  }

  return {
    hasEnvelope,
    readEnvelope,
    initializeSession,
    loginWithEnvelope,
    changePassword,
    isUnlocked,
    getSessionKey,
    clearSession
  };
}

let defaultController = null;
function getDefaultController() {
  if (defaultController) return defaultController;
  const { app } = require('electron');
  const root = runtimeUtils.getPortableRoot({ appPath: app.getAppPath(), isPackaged: app.isPackaged });
  defaultController = createController(path.join(root, 'SafeLedgerData', 'vaults'));
  return defaultController;
}

exports.hasEnvelope = () => getDefaultController().hasEnvelope();
exports.initializeSession = (password) => getDefaultController().initializeSession(password);
exports.loginWithEnvelope = (password) => getDefaultController().loginWithEnvelope(password);
exports.changePassword = (oldPassword, newPassword) => getDefaultController().changePassword(oldPassword, newPassword);
exports.isUnlocked = () => getDefaultController().isUnlocked();
exports.getSessionKey = () => getDefaultController().getSessionKey();
exports.clearSession = () => getDefaultController().clearSession();
exports.createController = createController;
exports.ENVELOPE_FILE = ENVELOPE_FILE;
exports._test = { atomicWriteJson };

function registerIpcHandlers(options = {}) {
  const { ipcMain } = require('electron');
  const marker = '__safeLedgerCryptoV3IpcRegistered';
  if (global[marker]) return;
  global[marker] = true;

  const assertTrusted = (event) => {
    const win = typeof options.getMainWindow === 'function' ? options.getMainWindow() : null;
    if (win && (!event || event.sender !== win.webContents)) throw new Error('Untrusted SafeLedger IPC request.');
  };

  ipcMain.handle('crypto-v3-has-envelope', (event) => {
    assertTrusted(event);
    return getDefaultController().hasEnvelope();
  });
  ipcMain.handle('crypto-v3-initialize', (event, password) => {
    assertTrusted(event);
    return getDefaultController().initializeSession(password);
  });
  ipcMain.handle('crypto-v3-login', (event, password) => {
    assertTrusted(event);
    return getDefaultController().loginWithEnvelope(password);
  });
  ipcMain.handle('crypto-v3-change-password', (event, oldPassword, newPassword) => {
    assertTrusted(event);
    return getDefaultController().changePassword(oldPassword, newPassword);
  });
}

exports.registerIpcHandlers = registerIpcHandlers;
