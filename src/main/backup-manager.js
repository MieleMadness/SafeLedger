'use strict';

const fs = require('fs');
const path = require('path');

const BACKUP_FORMAT = 'safeledger-encrypted-backup';
const BACKUP_VERSION = 1;

const safeTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

exports.exportBackup = async (vaultDir, destinationFile) => {
  const files = await fs.promises.readdir(vaultDir, { withFileTypes: true });
  const vaultFiles = {};

  for (const entry of files) {
    if (!entry.isFile()) continue;
    const fullPath = path.join(vaultDir, entry.name);
    vaultFiles[entry.name] = (await fs.promises.readFile(fullPath)).toString('base64');
  }

  if (!vaultFiles['vaultlist.json']) {
    throw new Error('No SafeLedger vault list was found to back up.');
  }

  const backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    created: new Date().toISOString(),
    note: 'Vault files remain encrypted with the user master password.',
    files: vaultFiles
  };

  const temp = `${destinationFile}.tmp`;
  await fs.promises.writeFile(temp, JSON.stringify(backup, null, 2), 'utf8');
  await fs.promises.rename(temp, destinationFile);
  return { fileCount: Object.keys(vaultFiles).length };
};

exports.restoreBackup = async (vaultDir, backupFile) => {
  const raw = await fs.promises.readFile(backupFile, 'utf8');
  const backup = JSON.parse(raw);

  if (!backup || backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION || !backup.files) {
    throw new Error('This is not a supported SafeLedger backup file.');
  }
  if (!backup.files['vaultlist.json']) {
    throw new Error('Backup is missing vaultlist.json.');
  }

  const dataRoot = path.dirname(vaultDir);
  const safetyDir = path.join(dataRoot, `pre-restore-${safeTimestamp()}`);
  await fs.promises.mkdir(safetyDir, { recursive: true });
  await fs.promises.mkdir(vaultDir, { recursive: true });

  const existing = await fs.promises.readdir(vaultDir, { withFileTypes: true });
  for (const entry of existing) {
    if (!entry.isFile()) continue;
    await fs.promises.copyFile(path.join(vaultDir, entry.name), path.join(safetyDir, entry.name));
  }

  for (const [name, encoded] of Object.entries(backup.files)) {
    if (name.includes('/') || name.includes('\\') || name === '.' || name === '..') {
      throw new Error('Backup contains an invalid file name.');
    }
    const target = path.join(vaultDir, name);
    const temp = `${target}.restore-tmp`;
    await fs.promises.writeFile(temp, Buffer.from(encoded, 'base64'));
    await fs.promises.rename(temp, target);
  }

  return {
    restoredFiles: Object.keys(backup.files).length,
    safetyDir
  };
};
