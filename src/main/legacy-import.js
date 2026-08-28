'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const robustVault = require('./robust-vault');
const vaultSchema = require('./vault-schema');

function deriveLegacyKey(password) {
  const value = String(password || '');
  if (!value || value.length > 512) throw new Error('Enter the SafeLedger 1.x master password.');
  return crypto.createHmac('sha256', value.split('').reverse().join('')).update(value).digest();
}

function legacyPayloadLooksValid(value) {
  if (typeof value !== 'string') return false;
  const parts = value.trim().split(':');
  return parts.length === 2
    && /^[0-9a-f]{32}$/i.test(parts[0])
    && /^[0-9a-f]+$/i.test(parts[1])
    && parts[1].length % 2 === 0;
}

function decryptLegacyPayload(key, encrypted) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('Invalid legacy decryption key.');
  if (!legacyPayloadLooksValid(encrypted)) throw new Error('SafeLedger 1.x data is damaged or unsupported.');
  const [ivHex, dataHex] = encrypted.trim().split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final()
  ]).toString('utf8');
}

function parseLegacyJson(encrypted, key, label) {
  try {
    const parsed = JSON.parse(decryptLegacyPayload(key, encrypted));
    if (!parsed || typeof parsed !== 'object') throw new Error('invalid json');
    return parsed;
  } catch (_) {
    throw new Error(`Unable to unlock the SafeLedger 1.x ${label}. The password may be incorrect or the data may be damaged.`);
  }
}

function safeLegacyFileName(value) {
  return typeof value === 'string' && /^zvault-\d+\.json$/i.test(value);
}

function resolveLegacySourceDir(selectedDir) {
  const selected = path.resolve(String(selectedDir || ''));
  const candidates = [selected, path.join(selected, 'safeledgerdata'), path.join(selected, 'SafeLedgerData')];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'vaultlist.json'))) return candidate;
  }
  throw new Error('The selected folder does not contain SafeLedger 1.x data. Choose the old safeledgerdata folder or its parent folder.');
}

function countVaultData(vaultData) {
  const groups = Array.isArray(vaultData && vaultData.groups) ? vaultData.groups : [];
  let assets = 0;
  for (const group of groups) assets += Array.isArray(group && group.records) ? group.records.length : 0;
  return { wallets: groups.length, assets };
}

function uniqueProfileName(existing, requested) {
  const base = String(requested || 'Imported Profile').trim() || 'Imported Profile';
  const names = new Set((existing || []).map((entry) => String(entry && entry.name || '').trim().toLowerCase()));
  if (!names.has(base.toLowerCase())) return base;
  let suffix = 2;
  while (names.has(`${base} (${suffix})`.toLowerCase())) suffix++;
  return `${base} (${suffix})`;
}

async function readLegacyBundle(sourceDir, password) {
  const root = resolveLegacySourceDir(sourceDir);
  const listPath = path.join(root, 'vaultlist.json');
  let encryptedList;
  try { encryptedList = await fs.promises.readFile(listPath, 'utf8'); }
  catch (_) { throw new Error('Unable to read the SafeLedger 1.x vault list.'); }

  const key = deriveLegacyKey(password);
  try {
    const vaultList = parseLegacyJson(encryptedList, key, 'vault list');
    if (!Array.isArray(vaultList.vaults) || !vaultList.vaults.length) throw new Error('Legacy vault list does not contain profiles.');

    const profiles = [];
    for (const profile of vaultList.vaults) {
      if (!profile || !safeLegacyFileName(profile.file)) throw new Error('Legacy vault list contains an invalid profile file.');
      const filePath = path.join(root, profile.file);
      let encryptedVault;
      try { encryptedVault = await fs.promises.readFile(filePath, 'utf8'); }
      catch (_) { throw new Error(`Unable to read legacy profile file ${profile.file}.`); }
      const data = parseLegacyJson(encryptedVault, key, `profile ${profile.name || profile.file}`);
      profiles.push({ profile: JSON.parse(JSON.stringify(profile)), data });
    }
    return { root, profiles };
  } finally {
    key.fill(0);
  }
}

async function importIntoCurrent({ sourceDir, password, targetVaultDir, targetKey }) {
  if (!Buffer.isBuffer(targetKey) || targetKey.length !== 32) throw new Error('SafeLedger is locked. Please log in again.');
  const sourceRoot = resolveLegacySourceDir(sourceDir);
  const targetRoot = path.resolve(String(targetVaultDir || ''));
  if (sourceRoot === targetRoot) throw new Error('Choose the original SafeLedger 1.x vault folder, not the active SafeLedger 2.x vault folder.');

  const legacy = await readLegacyBundle(sourceRoot, password);
  const currentListPath = path.join(targetRoot, 'vaultlist.json');
  const currentList = await robustVault.readVaultList(currentListPath, targetKey);
  const nextList = JSON.parse(JSON.stringify(currentList));
  if (!Array.isArray(nextList.vaults)) nextList.vaults = [];
  nextList.vaultSelected = null;

  const createdFiles = [];
  let walletCount = 0;
  let assetCount = 0;
  try {
    for (const item of legacy.profiles) {
      const idInfo = robustVault.nextVaultFileName(nextList);
      const importedAt = new Date().toISOString();
      const importedData = vaultSchema.prepareForSave(item.data);
      importedData.file = idInfo.fileName;
      importedData.groupSelected = null;
      importedData.recordSelected = null;
      importedData.migration = { source: 'safeledger-1.x', importedAt };

      const counts = countVaultData(importedData);
      walletCount += counts.wallets;
      assetCount += counts.assets;

      const profile = {
        name: uniqueProfileName(nextList.vaults, item.profile && item.profile.name),
        path: targetRoot,
        created: item.profile && item.profile.created ? item.profile.created : importedAt,
        id: idInfo.id,
        file: idInfo.fileName,
        importedFrom: 'SafeLedger 1.x',
        importedAt
      };

      await robustVault.saveVault(path.join(targetRoot, idInfo.fileName), JSON.stringify(importedData), targetKey);
      createdFiles.push(path.join(targetRoot, idInfo.fileName));
      nextList.vaults.push(profile);
    }

    nextList.vaults.sort((a, b) => String(a && a.name || '').localeCompare(String(b && b.name || ''), undefined, { sensitivity: 'base' }));
    await robustVault.saveVault(currentListPath, JSON.stringify(nextList), targetKey);
  } catch (err) {
    await Promise.all(createdFiles.map((file) => fs.promises.unlink(file).catch(() => {})));
    throw err;
  }

  return {
    profileCount: legacy.profiles.length,
    walletCount,
    assetCount,
    sourceFolder: path.basename(legacy.root),
    vaultList: nextList
  };
}

module.exports = {
  deriveLegacyKey,
  legacyPayloadLooksValid,
  decryptLegacyPayload,
  parseLegacyJson,
  safeLegacyFileName,
  resolveLegacySourceDir,
  countVaultData,
  uniqueProfileName,
  readLegacyBundle,
  importIntoCurrent
};
