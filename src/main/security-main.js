'use strict';

const fs = require('fs');
const path = require('path');
const { atomicWriteJson } = require('./atomic-file');

const BACKUP_FORMAT = 'safeledger-complete-data-backup';
const BACKUP_VERSION = 2;

function timestampToken() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sanitizeAuditEvent(value) {
  const eventName = String(value || '').trim();
  const allowed = new Set([
    'app-opened',
    'emergency-lock',
    'inactivity-auto-lock',
    'post-restore-lock',
    'complete-data-backup-exported',
    'complete-data-backup-restored'
  ]);
  return allowed.has(eventName) ? eventName : 'security-event';
}

async function audit(dataRoot, eventName) {
  try {
    const settingsDir = path.join(dataRoot, 'settings');
    await fs.promises.mkdir(settingsDir, { recursive: true });
    const line = `${new Date().toISOString()}\t${sanitizeAuditEvent(eventName)}\n`;
    await fs.promises.appendFile(path.join(settingsDir, 'audit.log'), line, 'utf8');
  } catch (_) {}
}

async function collectFiles(root, current = root, files = {}) {
  let entries;
  try {
    entries = await fs.promises.readdir(current, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return files;
    throw err;
  }
  for (const entry of entries) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) await collectFiles(root, full, files);
    else if (entry.isFile()) {
      const relative = path.relative(root, full).split(path.sep).join('/');
      files[relative] = (await fs.promises.readFile(full)).toString('base64');
    }
  }
  return files;
}

function safeBackupPath(root, relative) {
  const normalized = path.normalize(String(relative || '').replace(/\//g, path.sep));
  if (!normalized || normalized === '.' || normalized.startsWith('..') || path.isAbsolute(normalized)) throw new Error('Backup contains an invalid path.');
  const target = path.resolve(root, normalized);
  const prefix = path.resolve(root) + path.sep;
  if (!target.startsWith(prefix)) throw new Error('Backup contains an invalid path.');
  return target;
}

function validateBackupPayload(payload) {
  if (!payload || payload.format !== BACKUP_FORMAT || payload.version !== BACKUP_VERSION || !payload.files) throw new Error('That file is not a current complete SafeLedger backup.');
  if (!Object.prototype.hasOwnProperty.call(payload.files, 'vaults/vaultlist.json')) throw new Error('Backup does not contain the encrypted SafeLedger vault list.');
  for (const [relative, encoded] of Object.entries(payload.files)) {
    if (typeof relative !== 'string' || typeof encoded !== 'string') throw new Error('Backup contains invalid file data.');
  }
  return payload;
}

function assertTrustedEvent(event, getMainWindow) {
  const win = getMainWindow();
  if (!win || win.isDestroyed() || !event || event.sender !== win.webContents) throw new Error('Untrusted SafeLedger IPC request.');
}

function assertUnlocked(cryptoSession) {
  if (!cryptoSession || typeof cryptoSession.isUnlocked !== 'function' || !cryptoSession.isUnlocked()) throw new Error('SafeLedger is locked. Please log in again.');
}

async function writeBackupFile(filePath, payload) {
  await atomicWriteJson(filePath, payload, { pretty: false });
}

async function stageRestore(dataRoot, payload) {
  const parent = path.dirname(dataRoot);
  const token = timestampToken();
  const stagingDir = path.join(parent, `SafeLedgerData-restore-staging-${token}`);
  const safetyDir = path.join(parent, `SafeLedgerData-pre-restore-${token}`);
  await fs.promises.rm(stagingDir, { recursive: true, force: true });
  await fs.promises.mkdir(stagingDir, { recursive: true });
  try {
    for (const [relative, encoded] of Object.entries(payload.files)) {
      const target = safeBackupPath(stagingDir, relative);
      await fs.promises.mkdir(path.dirname(target), { recursive: true });
      await fs.promises.writeFile(target, Buffer.from(encoded, 'base64'), { mode: 0o600 });
    }
    let movedCurrent = false;
    try {
      await fs.promises.rename(dataRoot, safetyDir);
      movedCurrent = true;
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    try {
      await fs.promises.rename(stagingDir, dataRoot);
    } catch (err) {
      if (movedCurrent) {
        try { await fs.promises.rename(safetyDir, dataRoot); } catch (_) {}
      }
      throw err;
    }
    return { safetyDir: movedCurrent ? safetyDir : null };
  } catch (err) {
    await fs.promises.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}

function registerIpcHandlers({ ipc, dialog, clipboard, cryptoSession, getMainWindow, getDataRoot }) {
  const marker = '__safeLedgerSecurityMainIpcRegistered';
  if (global[marker]) return;
  global[marker] = true;

  ipc.handle('security-backup-all', async (event) => {
    assertTrustedEvent(event, getMainWindow);
    assertUnlocked(cryptoSession);
    const dataRoot = getDataRoot();
    const files = await collectFiles(dataRoot);
    if (!files['vaults/vaultlist.json']) return { ok: false, message: 'No SafeLedger vault data was found to back up.' };
    const selection = await dialog.showSaveDialog(getMainWindow(), {
      title: 'Export Complete SafeLedger Backup',
      defaultPath: `SafeLedger-All-Data-${new Date().toISOString().slice(0, 10)}.slgbak`,
      filters: [{ name: 'SafeLedger Backup', extensions: ['slgbak'] }]
    });
    if (!selection || selection.canceled || !selection.filePath) return { ok: false, canceled: true };
    const payload = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      created: new Date().toISOString(),
      note: 'Contains the complete SafeLedgerData folder. Vault files and the data-key envelope remain encrypted.',
      files
    };
    await writeBackupFile(selection.filePath, payload);
    await audit(dataRoot, 'complete-data-backup-exported');
    return { ok: true, fileCount: Object.keys(files).length };
  });

  ipc.handle('security-restore-all', async (event) => {
    assertTrustedEvent(event, getMainWindow);
    assertUnlocked(cryptoSession);
    const selection = await dialog.showOpenDialog(getMainWindow(), {
      title: 'Restore Complete SafeLedger Backup',
      properties: ['openFile'],
      filters: [{ name: 'SafeLedger Backup', extensions: ['slgbak'] }]
    });
    if (!selection || selection.canceled || !selection.filePaths || !selection.filePaths.length) return { ok: false, canceled: true };
    const payload = validateBackupPayload(JSON.parse(await fs.promises.readFile(selection.filePaths[0], 'utf8')));
    const confirmation = await dialog.showMessageBox(getMainWindow(), {
      type: 'warning',
      buttons: ['Restore Backup', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
      title: 'Restore SafeLedger Backup',
      message: 'Restore the complete SafeLedgerData backup?',
      detail: 'SafeLedger will first preserve the current SafeLedgerData folder as a pre-restore safety copy. The application will lock after the restore.'
    });
    if (confirmation.response !== 0) return { ok: false, canceled: true };
    cryptoSession.clearSession();
    const dataRoot = getDataRoot();
    const restored = await stageRestore(dataRoot, payload);
    await audit(dataRoot, 'complete-data-backup-restored');
    return { ok: true, safetyDir: restored.safetyDir };
  });

  ipc.handle('security-clipboard-write', async (event, text) => {
    assertTrustedEvent(event, getMainWindow);
    assertUnlocked(cryptoSession);
    clipboard.writeText(String(text || ''));
    return { ok: true };
  });

  ipc.handle('security-clipboard-clear-if-matches', async (event, expected) => {
    assertTrustedEvent(event, getMainWindow);
    const value = String(expected || '');
    if (value && clipboard.readText() === value) clipboard.clear();
    return { ok: true };
  });
}

module.exports = {
  audit,
  registerIpcHandlers,
  _test: {
    BACKUP_FORMAT,
    BACKUP_VERSION,
    collectFiles,
    safeBackupPath,
    validateBackupPayload,
    stageRestore,
    sanitizeAuditEvent,
    writeBackupFile
  }
};
