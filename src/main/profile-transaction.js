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
  if (!list || !Array.isArray(list.vaults)) {
    throw new Error('Cannot authenticate the Profile list. Pending creation is preserved for recovery.');
  }
  const referenced = list.vaults.some((profile) => profile && profile.file === marker.file);

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

  const pending = markerPath(vaultDir);
  // A pending marker or existing Profile is never safe to overwrite. Resolve
  // unfinished operations from authenticated data before creating anything.
  try {
    await io.stat(pending);
    throw new Error('Resolve the pending Profile creation before starting another.');
  } catch (err) { if (!err || err.code !== 'ENOENT') throw err; }
  try {
    await io.stat(path.join(vaultDir, profileFile));
    throw new Error('An encrypted Profile with this name already exists.');
  } catch (err) { if (!err || err.code !== 'ENOENT') throw err; }

  await writeMarker(vaultDir, profileFile);
  let profileData;
  try {
    profileData = await initializeProfile(profileFile, cryptoKey, walletNames);
    await saveList(path.join(vaultDir, 'vaultlist.json'), JSON.stringify(nextList), cryptoKey);
  } catch (error) {
    // Both profile creation and list commit can succeed at the rename but
    // fail at the later directory fsync. Never infer rollback from an error.
    // Re-check BOTH durable artifacts before touching the encrypted file.
    let listed;
    let profilePresent;
    try {
      const current = await readList(path.join(vaultDir, 'vaultlist.json'), cryptoKey);
      if (!current || !Array.isArray(current.vaults)) throw new Error('Invalid encrypted Profile list');
      listed = current.vaults.some((profile) => profile && profile.file === profileFile);
      try { await io.stat(path.join(vaultDir, profileFile)); profilePresent = true; }
      catch (statError) {
        if (statError && statError.code === 'ENOENT') profilePresent = false;
        else throw statError;
      }
    } catch (_) {
      // Uncertain state means retain the journal and ciphertext for the
      // trusted next-unlock recovery path, not a best-effort deletion.
      throw new Error('Profile creation outcome is uncertain. The encrypted transaction was retained for recovery on the next unlock.');
    }
    if (listed) {
      if (!profilePresent) throw new Error('The Profile list references a missing Profile file. The recovery marker has been preserved.');
      // Initialization may have returned an error after writing the file. The
      // list can only be committed if initializeProfile returned successfully.
      await removeIfPresent(pending, io);
      return profileData;
    }
    if (profilePresent) await removeIfPresent(path.join(vaultDir, profileFile), io);
    await removeIfPresent(pending, io);
    throw error;
  }
  // A cleanup error following a successful list commit should not prompt
  // callers to retry creating the same Profile; recovery can clear the marker.
  await removeIfPresent(pending, io).catch(() => {});
  return profileData;
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
