'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const encryption = require('./encryption');

function encryptedPayloadLooksValid(value) {
  if (typeof value !== 'string') return false;
  const separator = value.indexOf(':');
  if (separator !== 32 || value.indexOf(':', separator + 1) !== -1) return false;
  const iv = value.slice(0, separator);
  const payload = value.slice(separator + 1);
  return /^[0-9a-fA-F]{32}$/.test(iv) && payload.length > 0 && payload.length % 32 === 0 && /^[0-9a-fA-F]+$/.test(payload);
}

async function atomicWriteFile(file, data, encoding = 'utf8') {
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  const temp = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`
  );
  let handle = null;
  try {
    handle = await fs.promises.open(temp, 'w', 0o600);
    if (Buffer.isBuffer(data)) await handle.writeFile(data);
    else await handle.writeFile(data, encoding);
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
    if (err.code === 'ENOENT') return;
    throw err;
  }
  if (!stat.isFile()) return;
  const length = Math.max(1, stat.size);
  const handle = await fs.promises.open(file, 'r+');
  try {
    const chunkSize = Math.min(1024 * 1024, length);
    let offset = 0;
    while (offset < length) {
      const size = Math.min(chunkSize, length - offset);
      const bytes = crypto.randomBytes(size);
      await handle.write(bytes, 0, size, offset);
      offset += size;
    }
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.promises.unlink(file);
}

exports.saveVault = async (vaultFile, jsonString, myCryptKey) => {
  const result = encryption.encrypt(myCryptKey, jsonString);
  await atomicWriteFile(vaultFile, result, 'utf8');
  return 'SUCCESS';
};

exports.deleteVault = async (vaultFile) => {
  try {
    await fs.promises.unlink(vaultFile);
    return 'SUCCESS';
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error('File does not exist!');
    throw new Error('Could not delete file');
  }
};

exports.readVaultList = async (vaultListFile, myCryptKey) => {
  let data;
  try {
    data = await fs.promises.readFile(vaultListFile, 'utf8');
  } catch (_) {
    throw { status: 'ERROR', statusMsg: 'Could not read vault list file', type: 'vault-read-error' };
  }

  if (!encryptedPayloadLooksValid(data)) {
    throw { status: 'ERROR', statusMsg: 'Vault list is damaged or incomplete. Your failed-login counter was not changed.', type: 'vault-corrupt' };
  }

  let clearText;
  try {
    clearText = encryption.decrypt(myCryptKey, data);
  } catch (_) {
    throw { status: 'ERROR', statusMsg: 'Unable to unlock vault list.', type: 'password-or-corrupt' };
  }

  try {
    const parsed = JSON.parse(clearText);
    if (!parsed || !Array.isArray(parsed.vaults)) throw new Error('Invalid vault list structure');
    return parsed;
  } catch (_) {
    throw { status: 'ERROR', statusMsg: 'Unable to unlock vault list.', type: 'password-or-corrupt' };
  }
};

exports.readVault = async (vaultFile, myCryptKey) => {
  let data;
  try {
    data = await fs.promises.readFile(vaultFile, 'utf8');
  } catch (_) {
    throw { status: 'ERROR', statusMsg: 'Could not read file', type: 'vault-read-error' };
  }
  if (!encryptedPayloadLooksValid(data)) {
    throw { status: 'ERROR', statusMsg: 'This vault file is damaged or incomplete.', type: 'vault-corrupt' };
  }
  let clearText;
  try {
    clearText = encryption.decrypt(myCryptKey, data);
  } catch (_) {
    throw { status: 'ERROR', statusMsg: 'Invalid Password', type: 'password-failed' };
  }
  try {
    return JSON.parse(clearText);
  } catch (_) {
    throw { status: 'ERROR', statusMsg: 'This vault decrypted but its contents are damaged.', type: 'vault-corrupt' };
  }
};

exports.makeDir = async (vaultPath) => {
  await fs.promises.mkdir(vaultPath, { recursive: true });
  return fs.existsSync(path.join(vaultPath, 'vaultlist.json')) ? 'EXISTS' : 'CREATE';
};

exports.initVaultList = async (vaultPath, myCryptKey) => {
  const vaultList = {
    vaults: [{
      name: 'Initial Profile',
      path: vaultPath,
      created: Date(),
      id: 0,
      file: 'zvault-0.json',
      password: '',
      usePass: false,
      encryptkey: '',
      encrypted: false
    }]
  };
  await exports.saveVault(path.join(vaultPath, 'vaultlist.json'), JSON.stringify(vaultList), myCryptKey);
  return 'SUCCESS';
};

exports.initVaultData = async (vaultPath, vaultName, myCryptKey) => {
  const today = Date();
  const initData = { file: vaultName, groups: [] };
  await exports.saveVault(path.join(vaultPath, vaultName), JSON.stringify(initData), myCryptKey);
  return initData;
};

exports.nextVaultFileName = (vaultList) => {
  const vaults = vaultList && Array.isArray(vaultList.vaults) ? vaultList.vaults : [];
  const ids = vaults
    .map((item) => Number(item && item.id))
    .filter((id) => Number.isInteger(id) && id >= 0);
  const nextId = ids.length ? Math.max(...ids) + 1 : 0;
  return { id: nextId, fileName: `zvault-${nextId}.json` };
};

exports.rotateCrypto = async (vaultPath, oldCryptoKey, newCryptoKey, vaultList) => {
  const originalVaults = vaultList && Array.isArray(vaultList.vaults) ? vaultList.vaults : [];
  const nextVaultList = JSON.parse(JSON.stringify(vaultList || { vaults: [] }));
  const first = exports.nextVaultFileName(vaultList);
  const createdFiles = [];
  const oldFiles = [];

  try {
    for (let i = 0; i < originalVaults.length; i++) {
      const oldVault = originalVaults[i];
      const newId = first.id + i;
      const newFile = `zvault-${newId}.json`;
      const oldFilePath = path.join(vaultPath, oldVault.file);
      let encrypted;
      try { encrypted = await fs.promises.readFile(oldFilePath, 'utf8'); }
      catch (_) { throw new Error(`Unable to read vault ${oldVault.file}`); }
      if (!encryptedPayloadLooksValid(encrypted)) throw new Error(`Vault ${oldVault.file} is damaged or incomplete`);

      let clearText;
      try { clearText = encryption.decrypt(oldCryptoKey, encrypted); }
      catch (_) { throw new Error('Invalid old password'); }

      let data;
      try { data = JSON.parse(clearText); }
      catch (_) { throw new Error(`Vault ${oldVault.file} is damaged`); }
      data.file = newFile;
      await exports.saveVault(path.join(vaultPath, newFile), JSON.stringify(data), newCryptoKey);
      createdFiles.push(path.join(vaultPath, newFile));
      oldFiles.push(oldFilePath);
      nextVaultList.vaults[i].id = newId;
      nextVaultList.vaults[i].file = newFile;
      nextVaultList.vaults[i].path = vaultPath;
    }

    await exports.saveVault(path.join(vaultPath, 'vaultlist.json'), JSON.stringify(nextVaultList), newCryptoKey);
  } catch (err) {
    await Promise.all(createdFiles.map((file) => secureDeleteFile(file).catch(() => {})));
    throw { status: 'ERROR', statusMsg: `Change password failed: ${err.message || err}` };
  }

  const cleanup = await Promise.allSettled(oldFiles.map((file) => secureDeleteFile(file)));
  const cleanupFailed = cleanup.some((result) => result.status === 'rejected');
  return {
    status: 'SUCCESS',
    statusMsg: cleanupFailed
      ? 'Password change successful but one or more old vault files could not be removed.'
      : 'Password change successful',
    vaultList: nextVaultList,
    cryptoKey: newCryptoKey
  };
};

exports.scrubContent = async (vaultPath) => {
  let entries;
  try { entries = await fs.promises.readdir(vaultPath, { withFileTypes: true }); }
  catch (_) { throw { status: 'ERROR', statusMsg: 'File clean failed' }; }
  const files = entries.filter((entry) => entry.isFile()).map((entry) => path.join(vaultPath, entry.name));
  try {
    await Promise.all(files.map((file) => secureDeleteFile(file)));
    return { status: 'SUCCESS', statusMsg: 'Data has been destroyed' };
  } catch (_) {
    throw { status: 'ERROR', statusMsg: 'File clean failed' };
  }
};

exports.cryptoTest = () => true;
exports._test = { encryptedPayloadLooksValid, atomicWriteFile };
