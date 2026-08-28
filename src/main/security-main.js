'use strict';

const fs = require('fs');
const path = require('path');
const { atomicWriteFile, atomicWriteJson } = require('./atomic-file');
const robustVault = require('./robust-vault');
const dashboardSummary = require('./dashboard-summary');
const recoveryBinder = require('./recovery-binder');
const activityHistory = require('./activity-history');

const BACKUP_FORMAT = 'safeledger-complete-data-backup';
const BACKUP_VERSION = 2;

function timestampToken() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sanitizeAuditEvent(value) {
  return activityHistory.normalizeEvent(value);
}

async function audit(dataRoot, eventName) {
  try {
    const settingsDir = path.join(dataRoot, 'settings');
    await fs.promises.mkdir(settingsDir, { recursive: true });
    const auditPath = path.join(settingsDir, 'audit.log');
    await fs.promises.appendFile(auditPath, activityHistory.serialize(new Date(), eventName), { encoding: 'utf8', mode: 0o600 });
    await fs.promises.chmod(auditPath, 0o600).catch(() => {});
    const raw = await fs.promises.readFile(auditPath, 'utf8');
    const compacted = activityHistory.compactLog(raw);
    if (compacted !== raw) await atomicWriteFile(auditPath, compacted, { mode: 0o600 });
  } catch (_) {}
}

async function readActivityHistory(dataRoot, limit) {
  const auditPath = path.join(dataRoot, 'settings', 'audit.log');
  try {
    const raw = await fs.promises.readFile(auditPath, 'utf8');
    return activityHistory.parseLog(raw, limit);
  } catch (err) {
    if (err && err.code === 'ENOENT') return [];
    throw err;
  }
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

function getSessionKey(cryptoSession) {
  const key = cryptoSession.getSessionKey();
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('SafeLedger is locked. Please log in again.');
  return key;
}

async function buildDashboard(dataRoot, cryptoSession) {
  const key = getSessionKey(cryptoSession);
  const vaultDir = path.join(dataRoot, 'vaults');
  const list = await robustVault.readVaultList(path.join(vaultDir, 'vaultlist.json'), key);
  const entries = [];
  for (const profile of list.vaults || []) {
    try {
      const vaultData = await robustVault.readVault(path.join(vaultDir, profile.file), key);
      entries.push({ profileName: String(profile.name || 'Profile'), vaultData });
    } catch (_) {
      entries.push({ profileName: String(profile.name || 'Profile'), vaultData: { groups: [] }, readError: true });
    }
  }
  return dashboardSummary.summarize(entries);
}

async function buildRecoveryBinder(dataRoot, cryptoSession, fileName, options) {
  const key = getSessionKey(cryptoSession);
  const requested = String(fileName || '').trim();
  if (!requested || path.basename(requested) !== requested) throw new Error('Invalid SafeLedger profile selection.');
  const vaultDir = path.join(dataRoot, 'vaults');
  const list = await robustVault.readVaultList(path.join(vaultDir, 'vaultlist.json'), key);
  const profile = (list.vaults || []).find((entry) => String(entry && entry.file || '') === requested);
  if (!profile) throw new Error('The selected SafeLedger profile was not found.');
  const vaultData = await robustVault.readVault(path.join(vaultDir, requested), key);
  return recoveryBinder.buildBinder(profile, vaultData, options);
}

function registerIpcHandlers({ ipc, dialog, clipboard, cryptoSession, getMainWindow, getDataRoot }) {
  const marker = '__safeLedgerSecurityMainIpcRegistered';
  if (global[marker]) return;
  global[marker] = true;

  ipc.handle('dashboard-summary', async (event) => {
    assertTrustedEvent(event, getMainWindow);
    assertUnlocked(cryptoSession);
    try {
      const summary = await buildDashboard(getDataRoot(), cryptoSession);
      return { ok: true, summary };
    } catch (err) {
      return { ok: false, message: err && err.message ? err.message : 'Unable to build recovery dashboard.' };
    }
  });

  ipc.handle('activity-history', async (event, limit) => {
    assertTrustedEvent(event, getMainWindow);
    assertUnlocked(cryptoSession);
    try {
      const entries = await readActivityHistory(getDataRoot(), limit);
      return { ok: true, entries, maxStored: activityHistory.MAX_STORED_ENTRIES };
    } catch (err) {
      return { ok: false, message: err && err.message ? err.message : 'Unable to read activity history.' };
    }
  });

  ipc.handle('recovery-binder-model', async (event, request = {}) => {
    assertTrustedEvent(event, getMainWindow);
    assertUnlocked(cryptoSession);
    try {
      const dataRoot = getDataRoot();
      const binder = await buildRecoveryBinder(dataRoot, cryptoSession, request.file, request.options);
      if (request.recordActivity === true) await audit(dataRoot, 'recovery-binder-prepared');
      return { ok: true, binder };
    } catch (err) {
      return { ok: false, message: err && err.message ? err.message : 'Unable to prepare the Recovery Binder.' };
    }
  });

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
  readActivityHistory,
  registerIpcHandlers,
  _test: {
    BACKUP_FORMAT,
    BACKUP_VERSION,
    collectFiles,
    safeBackupPath,
    validateBackupPayload,
    stageRestore,
    sanitizeAuditEvent,
    writeBackupFile,
    buildDashboard,
    buildRecoveryBinder,
    readActivityHistory
  }
};
