'use strict';

const fs = require('fs');
const path = require('path');
const { atomicWriteJson } = require('./atomic-file');

const MARKER_FILE = '.profile-create.pending.json';
const MARKER_FORMAT = 'safeledger-profile-create-transaction';

function markerPath(vaultDir) {
  return path.join(vaultDir, MARKER_FILE);
}

function validateMarker(marker) {
  return !!marker
    && marker.format === MARKER_FORMAT
    && marker.version === 1
    && typeof marker.file === 'string'
    && /^zvault-\d+\.json$/i.test(marker.file);
}

async function removeIfPresent(file, io = fs.promises) {
  try {
    await io.unlink(file);
  } catch (err) {
    if (!err || err.code !== 'ENOENT') throw err;
  }
}

async function writeMarker(vaultDir, file) {
  await atomicWriteJson(markerPath(vaultDir), {
    format: MARKER_FORMAT,
    version: 1,
    file,
    created: new Date().toISOString()
  }, { pretty: false, mode: 0o600 });
}

async function recoverPending(vaultDir, cryptoKey, readList, io = fs.promises) {
  const pendingPath = markerPath(vaultDir);
  let marker;
  try {
    marker = JSON.parse(await io.readFile(pendingPath, 'utf8'));
  } catch (err) {
    if (err && err.code === 'ENOENT') return { recovered: false };
    throw new Error('SafeLedger found an unreadable pending profile transaction. No profile data was removed.');
  }
  if (!validateMarker(marker)) {
    throw new Error('SafeLedger found an invalid pending profile transaction. No profile data was removed.');
  }

  const list = await readList(path.join(vaultDir, 'vaultlist.json'), cryptoKey);
  const referenced = Array.isArray(list && list.vaults)
    && list.vaults.some((profile) => profile && profile.file === marker.file);

  if (!referenced) await removeIfPresent(path.join(vaultDir, marker.file), io);
  await removeIfPresent(pendingPath, io);
  return { recovered: true, committed: referenced, file: marker.file };
}

async function createProfile({
  vaultDir,
  nextList,
  profileFile,
  cryptoKey,
  walletNames,
  initializeProfile,
  saveList,
  readList,
  io = fs.promises
}) {
  if (!/^zvault-\d+\.json$/i.test(String(profileFile || ''))) throw new Error('Invalid SafeLedger profile transaction.');
  if (typeof initializeProfile !== 'function' || typeof saveList !== 'function' || typeof readList !== 'function') {
    throw new Error('SafeLedger profile transaction dependencies are unavailable.');
  }

  await writeMarker(vaultDir, profileFile);
  let profileData;
  let profileCreated = false;
  try {
    profileData = await initializeProfile(profileFile, cryptoKey, walletNames);
    profileCreated = true;
    try {
      await saveList(path.join(vaultDir, 'vaultlist.json'), JSON.stringify(nextList), cryptoKey);
    } catch (saveError) {
      // An atomic rename can theoretically succeed even if a later filesystem
      // operation reports an error. Re-read the authoritative list before
      // deciding whether the new encrypted profile is an orphan.
      try {
        const current = await readList(path.join(vaultDir, 'vaultlist.json'), cryptoKey);
        const committed = Array.isArray(current && current.vaults)
          && current.vaults.some((profile) => profile && profile.file === profileFile);
        if (committed) {
          await removeIfPresent(markerPath(vaultDir), io);
          return profileData;
        }
      } catch (_) {
        throw new Error('Profile creation could not be confirmed. SafeLedger kept the encrypted profile transaction for recovery on the next unlock instead of deleting potentially recoverable data.');
      }

      await removeIfPresent(path.join(vaultDir, profileFile), io);
      await removeIfPresent(markerPath(vaultDir), io);
      throw saveError;
    }

    await removeIfPresent(markerPath(vaultDir), io);
    return profileData;
  } catch (err) {
    if (!profileCreated) await removeIfPresent(markerPath(vaultDir), io).catch(() => {});
    throw err;
  }
}

module.exports = {
  createProfile,
  recoverPending,
  _test: {
    MARKER_FILE,
    MARKER_FORMAT,
    markerPath,
    validateMarker,
    removeIfPresent
  }
};
