'use strict';

const fs = require('fs');
const path = require('path');
const keyEnvelope = require('./key-envelope');
const runtimeUtils = require('./runtime-utils');

const ENVELOPE_FILE = 'key-envelope.json';

async function atomicWriteJson(file, value) {
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  let handle;
  try {
    handle = await fs.promises.open(temp, 'w', 0o600);
    await handle.writeFile(JSON.stringify(value, null, 2), 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    await fs.promises.rename(temp, file);
  } catch (err) {
    if (handle) {
      try { await handle.close(); } catch (_) {}
    }
    try { await fs.promises.unlink(temp); } catch (_) {}
    throw err;
  }
}

function createController(vaultDir) {
  const envelopePath = path.join(vaultDir, ENVELOPE_FILE);
  const vaultListPath = path.join(vaultDir, 'vaultlist.json');
  const hasEnvelope = () => fs.existsSync(envelopePath);

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
    if (hasEnvelope()) return { ok: false, type: 'already-initialized', message: 'SafeLedger is already initialized.' };
    if (fs.existsSync(vaultListPath)) {
      return {
        ok: false,
        type: 'unsupported-legacy-data',
        message: 'This SafeLedgerData folder uses an older unsupported format. SafeLedger 2.x does not migrate version 1 data.'
      };
    }
    const created = await keyEnvelope.createEnvelope(password);
    await atomicWriteJson(envelopePath, created.envelope);
    return {
      ok: true,
      initialized: true,
      dataKeyHex: created.dataKey.toString('hex'),
      envelopeVersion: created.envelope.version
    };
  }

  async function loginWithEnvelope(password) {
    let envelope;
    try { envelope = await readEnvelope(); }
    catch (err) { return { ok: false, type: 'envelope-corrupt', message: err.message }; }
    if (!envelope) return { ok: false, type: 'not-initialized', message: 'SafeLedger has not been initialized.' };

    const unlocked = await keyEnvelope.unlockEnvelope(password, envelope);
    if (!unlocked.ok) return unlocked;
    return {
      ok: true,
      dataKeyHex: unlocked.dataKey.toString('hex'),
      envelopeVersion: envelope.version
    };
  }

  async function changePassword(oldPassword, newPassword) {
    let envelope;
    try { envelope = await readEnvelope(); }
    catch (err) { return { ok: false, type: 'envelope-corrupt', message: err.message }; }
    if (!envelope) return { ok: false, type: 'not-initialized', message: 'SafeLedger has not been initialized.' };

    const rewrapped = await keyEnvelope.rewrapEnvelope(oldPassword, newPassword, envelope);
    if (!rewrapped.ok) return rewrapped;
    rewrapped.envelope.modified = new Date().toISOString();
    await atomicWriteJson(envelopePath, rewrapped.envelope);
    return {
      ok: true,
      status: 'SUCCESS',
      statusMsg: 'Password change successful. Vault data did not need to be re-encrypted.',
      dataKeyHex: rewrapped.dataKey.toString('hex'),
      envelopeVersion: rewrapped.envelope.version
    };
  }

  return { hasEnvelope, readEnvelope, initializeSession, loginWithEnvelope, changePassword };
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
exports.createController = createController;
exports.ENVELOPE_FILE = ENVELOPE_FILE;
exports._test = { atomicWriteJson };

function registerIpcHandlers() {
  const { ipcMain } = require('electron');
  const marker = '__safeLedgerCryptoV3IpcRegistered';
  if (global[marker]) return;
  global[marker] = true;
  ipcMain.handle('crypto-v3-has-envelope', () => getDefaultController().hasEnvelope());
  ipcMain.handle('crypto-v3-initialize', (_event, password) => getDefaultController().initializeSession(password));
  ipcMain.handle('crypto-v3-login', (_event, password) => getDefaultController().loginWithEnvelope(password));
  ipcMain.handle('crypto-v3-change-password', (_event, oldPassword, newPassword) =>
    getDefaultController().changePassword(oldPassword, newPassword));
}

exports.registerIpcHandlers = registerIpcHandlers;
