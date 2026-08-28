'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { atomicWriteFile, atomicWriteJson } = require('./atomic-file');
const robustVault = require('./robust-vault');
const encryption = require('./encryption');
const keyEnvelope = require('./key-envelope');
const vaultSchema = require('./vault-schema');
const legacyImport = require('./legacy-import');
const dashboardSummary = require('./dashboard-summary');
const recoveryBinder = require('./recovery-binder');
const activityHistory = require('./activity-history');
const globalSearch = require('./global-search');

const BACKUP_FORMAT = 'safeledger-complete-data-backup';
const BACKUP_VERSION = 3;
const SUPPORTED_BACKUP_VERSIONS = new Set([2, 3]);

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

function sha256Base64(encoded) {
  return crypto.createHash('sha256').update(Buffer.from(String(encoded || ''), 'base64')).digest('hex');
}

function buildBackupManifest(files) {
  const manifest = {};
  for (const [relative, encoded] of Object.entries(files || {})) manifest[relative] = sha256Base64(encoded);
  return manifest;
}

function validateBackupManifest(payload) {
  if (payload.version < 3) return true;
  if (!payload.manifest || typeof payload.manifest !== 'object' || Array.isArray(payload.manifest)) throw new Error('Backup integrity manifest is missing.');
  const files = Object.keys(payload.files || {}).sort();
  const manifestFiles = Object.keys(payload.manifest).sort();
  if (files.length !== manifestFiles.length || files.some((file, index) => file !== manifestFiles[index])) throw new Error('Backup integrity manifest does not match the file list.');
  for (const relative of files) {
    const expected = payload.manifest[relative];
    if (typeof expected !== 'string' || !/^[0-9a-f]{64}$/i.test(expected)) throw new Error(`Backup integrity hash is invalid for ${relative}.`);
    if (sha256Base64(payload.files[relative]) !== expected.toLowerCase()) throw new Error(`Backup integrity check failed for ${relative}.`);
  }
  return true;
}

function validateBackupPayload(payload) {
  if (!payload || payload.format !== BACKUP_FORMAT || !SUPPORTED_BACKUP_VERSIONS.has(Number(payload.version)) || !payload.files || typeof payload.files !== 'object') {
    throw new Error('That file is not a supported complete SafeLedger backup.');
  }
  payload.version = Number(payload.version);
  if (!Object.prototype.hasOwnProperty.call(payload.files, 'vaults/vaultlist.json')) throw new Error('Backup does not contain the encrypted SafeLedger vault list.');
  if (payload.version >= 3 && !Object.prototype.hasOwnProperty.call(payload.files, 'vaults/key-envelope.json')) throw new Error('Backup does not contain the SafeLedger key envelope.');
  for (const [relative, encoded] of Object.entries(payload.files)) {
    if (typeof relative !== 'string' || typeof encoded !== 'string') throw new Error('Backup contains invalid file data.');
    safeBackupPath(path.join(process.cwd(), '.safeledger-backup-validation-root'), relative);
  }
  validateBackupManifest(payload);
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

function decodeBackupText(payload, relative) {
  const encoded = payload.files[relative];
  if (typeof encoded !== 'string') throw new Error(`Backup is missing ${relative}.`);
  return Buffer.from(encoded, 'base64').toString('utf8');
}

function verifyBackupPayload(payload, dataKey) {
  const validated = validateBackupPayload(payload);
  if (!Buffer.isBuffer(dataKey) || dataKey.length !== 32) throw new Error('SafeLedger is locked. Please log in again.');

  if (validated.files['vaults/key-envelope.json']) {
    let envelope;
    try { envelope = JSON.parse(decodeBackupText(validated, 'vaults/key-envelope.json')); }
    catch (_) { throw new Error('Backup key envelope is unreadable.'); }
    if (!keyEnvelope.validateEnvelope(envelope)) throw new Error('Backup key envelope is damaged or unsupported.');
  }

  let list;
  try {
    const encryptedList = decodeBackupText(validated, 'vaults/vaultlist.json');
    if (!encryption.isAuthenticatedEncryptedPayload(encryptedList)) throw new Error('unsupported vault list');
    list = JSON.parse(encryption.decrypt(dataKey, encryptedList));
  } catch (_) {
    throw new Error('Backup files passed integrity checks, but the encrypted vault list could not be authenticated with the current SafeLedger data key.');
  }
  if (!robustVault.validVaultListStructure(list)) throw new Error('Backup vault list has an invalid structure.');

  let walletCount = 0;
  let assetCount = 0;
  for (const profile of list.vaults || []) {
    const relative = `vaults/${profile.file}`;
    let vaultData;
    try {
      const encryptedVault = decodeBackupText(validated, relative);
      if (!encryption.isAuthenticatedEncryptedPayload(encryptedVault)) throw new Error('unsupported profile');
      vaultData = vaultSchema.migrateVaultData(JSON.parse(encryption.decrypt(dataKey, encryptedVault)));
    } catch (_) {
      throw new Error(`Backup profile ${profile.name || profile.file} could not be authenticated.`);
    }
    const groups = Array.isArray(vaultData.groups) ? vaultData.groups : [];
    walletCount += groups.length;
    for (const group of groups) assetCount += Array.isArray(group && group.records) ? group.records.length : 0;
  }

  return {
    backupVersion: validated.version,
    created: validated.created || null,
    fileCount: Object.keys(validated.files).length,
    profileCount: (list.vaults || []).length,
    walletCount,
    assetCount
  };
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

async function buildGlobalSearch(dataRoot, cryptoSession, query) {
  const key = getSessionKey(cryptoSession);
  const vaultDir = path.join(dataRoot, 'vaults');
  const list = await robustVault.readVaultList(path.join(vaultDir, 'vaultlist.json'), key);
  const entries = [];
  for (const profile of list.vaults || []) {
    try {
      const vaultData = await robustVault.readVault(path.join(vaultDir, profile.file), key);
      entries.push({ profile, vaultData });
    } catch (_) {
      entries.push({ profile, vaultData: { groups: [] } });
    }
  }
  return globalSearch.search(entries, query);
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
  let selectedLegacySource = null;

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

  ipc.handle('global-search', async (event, query) => {
    assertTrustedEvent(event, getMainWindow);
    assertUnlocked(cryptoSession);
    try {
      const results = await buildGlobalSearch(getDataRoot(), cryptoSession, String(query || '').slice(0, 120));
      return { ok: true, results };
    } catch (err) {
      return { ok: false, message: err && err.message ? err.message : 'Unable to search SafeLedger.' };
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
      files,
      manifest: buildBackupManifest(files)
    };
    await writeBackupFile(selection.filePath, payload);
    await audit(dataRoot, 'complete-data-backup-exported');
    return { ok: true, fileCount: Object.keys(files).length };
  });

  ipc.handle('security-verify-backup', async (event) => {
    assertTrustedEvent(event, getMainWindow);
    assertUnlocked(cryptoSession);
    const selection = await dialog.showOpenDialog(getMainWindow(), {
      title: 'Verify SafeLedger Backup',
      properties: ['openFile'],
      filters: [{ name: 'SafeLedger Backup', extensions: ['slgbak'] }]
    });
    if (!selection || selection.canceled || !selection.filePaths || !selection.filePaths.length) return { ok: false, canceled: true };
    try {
      const payload = JSON.parse(await fs.promises.readFile(selection.filePaths[0], 'utf8'));
      const report = verifyBackupPayload(payload, getSessionKey(cryptoSession));
      await audit(getDataRoot(), 'complete-data-backup-verified');
      return { ok: true, report };
    } catch (err) {
      return { ok: false, message: err && err.message ? err.message : 'Backup verification failed.' };
    }
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

  ipc.handle('legacy-import-select-source', async (event) => {
    assertTrustedEvent(event, getMainWindow);
    assertUnlocked(cryptoSession);
    const selection = await dialog.showOpenDialog(getMainWindow(), {
      title: 'Choose SafeLedger 1.x Data Folder',
      properties: ['openDirectory']
    });
    if (!selection || selection.canceled || !selection.filePaths || !selection.filePaths.length) return { ok: false, canceled: true };
    try {
      selectedLegacySource = legacyImport.resolveLegacySourceDir(selection.filePaths[0]);
      return { ok: true, sourceFolder: path.basename(selectedLegacySource), sourcePath: selectedLegacySource };
    } catch (err) {
      selectedLegacySource = null;
      return { ok: false, message: err && err.message ? err.message : 'Unable to locate SafeLedger 1.x data.' };
    }
  });

  ipc.handle('legacy-import-run', async (event, password) => {
    assertTrustedEvent(event, getMainWindow);
    assertUnlocked(cryptoSession);
    if (!selectedLegacySource) return { ok: false, message: 'Choose the SafeLedger 1.x data folder first.' };
    try {
      const result = await legacyImport.importIntoCurrent({
        sourceDir: selectedLegacySource,
        password: String(password || ''),
        targetVaultDir: path.join(getDataRoot(), 'vaults'),
        targetKey: getSessionKey(cryptoSession)
      });
      await audit(getDataRoot(), 'legacy-1x-import-completed');
      selectedLegacySource = null;
      return {
        ok: true,
        report: {
          profileCount: result.profileCount,
          walletCount: result.walletCount,
          assetCount: result.assetCount,
          sourceFolder: result.sourceFolder
        }
      };
    } catch (err) {
      return { ok: false, message: err && err.message ? err.message : 'SafeLedger 1.x import failed.' };
    }
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
    sha256Base64,
    buildBackupManifest,
    validateBackupManifest,
    validateBackupPayload,
    verifyBackupPayload,
    stageRestore,
    sanitizeAuditEvent,
    writeBackupFile,
    buildDashboard,
    buildGlobalSearch,
    buildRecoveryBinder,
    readActivityHistory
  }
};
