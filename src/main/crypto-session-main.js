'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const keyEnvelope = require('./key-envelope');
const vault = require('./robust-vault');
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

async function secureDeleteFile(file) {
  let stat;
  try { stat = await fs.promises.stat(file); }
  catch (err) {
    if (err.code === 'ENOENT') return true;
    throw err;
  }
  if (!stat.isFile()) return true;
  const handle = await fs.promises.open(file, 'r+');
  try {
    const chunkSize = Math.min(1024 * 1024, Math.max(1, stat.size));
    let offset = 0;
    while (offset < stat.size) {
      const size = Math.min(chunkSize, stat.size - offset);
      await handle.write(crypto.randomBytes(size), 0, size, offset);
      offset += size;
    }
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.promises.unlink(file);
  return true;
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

  function buildMigrationMap(vaultList) {
    const items = Array.isArray(vaultList.vaults) ? vaultList.vaults : [];
    const validIds = items.map((item) => Number(item && item.id)).filter((id) => Number.isInteger(id) && id >= 0);
    let nextId = validIds.length ? Math.max(...validIds) + 1 : 0;
    return items.map((item) => {
      const result = { old: item.file, new: `zvault-${nextId}.json`, id: nextId };
      nextId++;
      return result;
    });
  }

  async function cleanupLegacyFiles(envelope) {
    const migration = envelope && envelope.migration;
    if (!migration || !Array.isArray(migration.files)) return { complete: true, failed: [] };
    const failed = [];
    for (const item of migration.files) {
      if (!item || !/^zvault-\d+\.json$/i.test(item.old || '')) continue;
      try { await secureDeleteFile(path.join(vaultDir, item.old)); }
      catch (err) { failed.push({ file: item.old, message: err.message || String(err) }); }
    }
    return { complete: failed.length === 0, failed };
  }

  async function markMigrationComplete(envelope) {
    const next = JSON.parse(JSON.stringify(envelope));
    delete next.migration;
    next.modified = new Date().toISOString();
    await atomicWriteJson(envelopePath, next);
    return next;
  }

  async function completePendingIfPossible(envelope, dataKey) {
    if (!envelope.migration) return { envelope, pending: false };
    try {
      await vault.readVaultList(vaultListPath, dataKey);
    } catch (_) {
      return { envelope, pending: true, vaultListUsesDataKey: false };
    }
    const cleanup = await cleanupLegacyFiles(envelope);
    if (!cleanup.complete) {
      return { envelope, pending: true, vaultListUsesDataKey: true, cleanup };
    }
    try {
      const activeEnvelope = await markMigrationComplete(envelope);
      return { envelope: activeEnvelope, pending: false, vaultListUsesDataKey: true, cleanup };
    } catch (err) {
      return {
        envelope,
        pending: true,
        vaultListUsesDataKey: true,
        cleanup,
        markerError: err && err.message ? err.message : String(err)
      };
    }
  }

  async function migrateWithKnownKeys(password, legacyKey, legacyVaultList, existingEnvelope = null, existingDataKey = null) {
    const migrationMap = existingEnvelope && existingEnvelope.migration && Array.isArray(existingEnvelope.migration.files)
      ? existingEnvelope.migration.files
      : buildMigrationMap(legacyVaultList);

    const profileData = [];
    for (const item of legacyVaultList.vaults || []) {
      profileData.push(await vault.readVault(path.join(vaultDir, item.file), legacyKey));
    }

    let envelope = existingEnvelope;
    let dataKey = existingDataKey;
    if (!envelope || !dataKey) {
      const created = await keyEnvelope.createEnvelope(password, undefined, {
        status: 'pending',
        started: new Date().toISOString(),
        files: migrationMap
      });
      envelope = created.envelope;
      dataKey = created.dataKey;
    }

    const nextVaultList = JSON.parse(JSON.stringify(legacyVaultList));
    for (let i = 0; i < nextVaultList.vaults.length; i++) {
      const mapping = migrationMap[i];
      if (!mapping) throw new Error('SafeLedger migration mapping is incomplete.');
      const profile = profileData[i];
      profile.file = mapping.new;
      nextVaultList.vaults[i].id = mapping.id;
      nextVaultList.vaults[i].file = mapping.new;
      nextVaultList.vaults[i].path = vaultDir;
      await vault.saveVault(path.join(vaultDir, mapping.new), JSON.stringify(profile), dataKey);
    }

    // Commit the pending envelope before replacing vaultlist.json. If power is
    // lost after this point, the next login can resume with the legacy key.
    await atomicWriteJson(envelopePath, envelope);
    await vault.saveVault(vaultListPath, JSON.stringify(nextVaultList), dataKey);

    const cleanup = await cleanupLegacyFiles(envelope);
    let markerError = null;
    if (cleanup.complete) {
      try { envelope = await markMigrationComplete(envelope); }
      catch (err) { markerError = err && err.message ? err.message : String(err); }
    }

    legacyKey.fill(0);
    return {
      ok: true,
      migrated: true,
      pendingCleanup: !cleanup.complete || !!markerError,
      markerError,
      cleanup,
      dataKeyHex: dataKey.toString('hex'),
      vaultList: nextVaultList,
      envelopeVersion: envelope.version
    };
  }

  async function migrateLegacySession(password) {
    if (hasEnvelope()) return loginWithEnvelope(password);
    const legacyKey = keyEnvelope.deriveLegacyKey(password);
    let legacyVaultList;
    try {
      legacyVaultList = await vault.readVaultList(vaultListPath, legacyKey);
    } catch (err) {
      legacyKey.fill(0);
      return { ok: false, type: err.type || 'migration-failed', message: err.statusMsg || 'Unable to verify legacy SafeLedger data.' };
    }
    try {
      return await migrateWithKnownKeys(password, legacyKey, legacyVaultList);
    } catch (err) {
      legacyKey.fill(0);
      return { ok: false, type: 'migration-failed', message: err.message || String(err) };
    }
  }

  async function resumePendingMigration(password, envelope, dataKey) {
    const legacyKey = keyEnvelope.deriveLegacyKey(password);
    let legacyVaultList;
    try {
      legacyVaultList = await vault.readVaultList(vaultListPath, legacyKey);
    } catch (_) {
      legacyKey.fill(0);
      return {
        ok: false,
        type: 'migration-corrupt',
        message: 'SafeLedger detected an interrupted encryption migration but could not read the legacy vault list.'
      };
    }
    try {
      return await migrateWithKnownKeys(password, legacyKey, legacyVaultList, envelope, dataKey);
    } catch (err) {
      legacyKey.fill(0);
      return { ok: false, type: 'migration-failed', message: err.message || String(err) };
    }
  }

  async function loginWithEnvelope(password) {
    let envelope;
    try { envelope = await readEnvelope(); }
    catch (err) { return { ok: false, type: 'envelope-corrupt', message: err.message }; }
    if (!envelope) return { ok: false, type: 'legacy', message: 'Legacy SafeLedger data has not been migrated yet.' };

    const unlocked = await keyEnvelope.unlockEnvelope(password, envelope);
    if (!unlocked.ok) return unlocked;
    const dataKey = unlocked.dataKey;

    if (envelope.migration) {
      const completion = await completePendingIfPossible(envelope, dataKey);
      envelope = completion.envelope;
      if (completion.pending && completion.vaultListUsesDataKey === false) {
        return resumePendingMigration(password, envelope, dataKey);
      }
    }

    return {
      ok: true,
      dataKeyHex: dataKey.toString('hex'),
      envelopeVersion: envelope.version,
      migrationPending: !!envelope.migration
    };
  }

  async function changePassword(oldPassword, newPassword) {
    let envelope;
    try { envelope = await readEnvelope(); }
    catch (err) { return { ok: false, type: 'envelope-corrupt', message: err.message }; }
    if (!envelope) return { ok: false, type: 'legacy', message: 'SafeLedger must finish its encryption upgrade before changing the password.' };

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

  return { hasEnvelope, readEnvelope, loginWithEnvelope, migrateLegacySession, changePassword };
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
exports.loginWithEnvelope = (password) => getDefaultController().loginWithEnvelope(password);
exports.migrateLegacySession = (password) => getDefaultController().migrateLegacySession(password);
exports.changePassword = (oldPassword, newPassword) => getDefaultController().changePassword(oldPassword, newPassword);
exports.createController = createController;
exports.ENVELOPE_FILE = ENVELOPE_FILE;
exports._test = { atomicWriteJson, secureDeleteFile };

function registerIpcHandlers() {
  const { ipcMain } = require('electron');
  const marker = '__safeLedgerCryptoV3IpcRegistered';
  if (global[marker]) return;
  global[marker] = true;
  ipcMain.handle('crypto-v3-has-envelope', () => getDefaultController().hasEnvelope());
  ipcMain.handle('crypto-v3-login', (_event, password) => getDefaultController().loginWithEnvelope(password));
  ipcMain.handle('crypto-v3-migrate-legacy', (_event, password) => getDefaultController().migrateLegacySession(password));
  ipcMain.handle('crypto-v3-change-password', (_event, oldPassword, newPassword) =>
    getDefaultController().changePassword(oldPassword, newPassword));
}

try { registerIpcHandlers(); } catch (_) {
  // Unit tests load this module under plain Node where Electron IPC is absent.
}
exports.registerIpcHandlers = registerIpcHandlers;
