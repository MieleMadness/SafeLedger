'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const encryption = require('./encryption');

function encryptedPayloadLooksValid(value) {
  return encryption.isAuthenticatedEncryptedPayload(value);
}

function safeVaultFileName(value) {
  return typeof value === 'string' && /^zvault-\d+\.json$/i.test(value);
}

function validVaultListStructure(parsed) {
  if (!parsed || !Array.isArray(parsed.vaults)) return false;
  return parsed.vaults.every((item) => item && safeVaultFileName(item.file));
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
    throw { status: 'ERROR', statusMsg: 'Vault list is damaged, unsupported, or incomplete. Your failed-login counter was not changed.', type: 'vault-corrupt' };
  }

  let clearText;
  try {
    clearText = encryption.decrypt(myCryptKey, data);
  } catch (_) {
    throw { status: 'ERROR', statusMsg: 'Unable to authenticate or unlock vault list.', type: 'password-or-corrupt' };
  }

  try {
    const parsed = JSON.parse(clearText);
    if (!validVaultListStructure(parsed)) throw new Error('Invalid vault list structure');
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
    throw { status: 'ERROR', statusMsg: 'This vault file is damaged, unsupported, or incomplete.', type: 'vault-corrupt' };
  }
  let clearText;
  try {
    clearText = encryption.decrypt(myCryptKey, data);
  } catch (_) {
    throw {
      status: 'ERROR',
      statusMsg: 'Vault authentication failed. The encrypted file may have been modified or damaged.',
      type: 'vault-corrupt'
    };
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
      name: 'SafeLedger',
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

exports._test = {
  encryptedPayloadLooksValid,
  atomicWriteFile,
  secureDeleteFile,
  safeVaultFileName,
  validVaultListStructure
};
