'use strict';

const fs = require('fs');
const path = require('path');
const { atomicWriteJson } = require('./atomic-file');

const MARKER_FILE = '.profile-delete.pending.json';
const MARKER_FORMAT = 'safeledger-profile-delete-transaction';
const safeProfileFile = (value) => typeof value === 'string' && /^zvault-\d+\.json$/i.test(value);
const markerPath = (dir) => path.join(dir, MARKER_FILE);
const stagedPath = (dir, file) => path.join(dir, `.${file}.delete-staged`);

function validateMarker(marker) {
  return !!marker && marker.format === MARKER_FORMAT
    && marker.version === 1 && safeProfileFile(marker.file);
}

async function exists(file, io = fs.promises) {
  try { await io.stat(file); return true; }
  catch (error) { if (error && error.code === 'ENOENT') return false; throw error; }
}

async function removeIfPresent(file, io = fs.promises) {
  try { await io.unlink(file); }
  catch (error) { if (!error || error.code !== 'ENOENT') throw error; }
}

async function recoverPending(vaultDir, cryptoKey, readList, io = fs.promises) {
  if (typeof readList !== 'function') throw new Error('SafeLedger needs the authoritative encrypted Profile list.');
  let marker;
  try { marker = JSON.parse(await io.readFile(markerPath(vaultDir), 'utf8')); }
  catch (error) {
    if (error && error.code === 'ENOENT') return { recovered: false };
    throw new Error('Pending Profile deletion metadata is unreadable. No encrypted Profile was removed.');
  }
  if (!validateMarker(marker)) {
    throw new Error('Pending Profile deletion metadata is invalid. No encrypted Profile was removed.');
  }

  // A failed/unreadable list must never be treated as proof that a Profile
  // was deleted. Preserve its staged encrypted file and transaction marker.
  const list = await readList(path.join(vaultDir, 'vaultlist.json'), cryptoKey);
  if (!list || !Array.isArray(list.vaults)) {
    throw new Error('Cannot authenticate the Profile list to recover a pending deletion.');
  }
  const referenced = list.vaults.some((profile) => profile && profile.file === marker.file);
  const original = path.join(vaultDir, marker.file);
  const staged = stagedPath(vaultDir, marker.file);
  const [hasOriginal, hasStaged] = await Promise.all([exists(original, io), exists(staged, io)]);

  if (referenced) {
    if (hasStaged && hasOriginal) {
      throw new Error('Ambiguous Profile deletion recovery: both Profile copies exist. No data was removed.');
    }
    if (hasStaged) await io.rename(staged, original);
    else if (!hasOriginal) throw new Error('Referenced Profile file is missing. Pending deletion preserved for manual recovery.');
    await removeIfPresent(markerPath(vaultDir), io);
    return { recovered: true, committed: false, file: marker.file };
  }

  // Only an authenticated list WITHOUT the Profile allows final cleanup.
  // If the original still exists and the stage is missing, the transaction
  // is ambiguous; never delete that potentially recoverable file.
  if (hasOriginal) throw new Error('Unreferenced Profile file is still present. Pending deletion preserved for manual recovery.');
  if (hasStaged) await removeIfPresent(staged, io);
  await removeIfPresent(markerPath(vaultDir), io);
  return { recovered: true, committed: true, file: marker.file };
}

async function deleteProfile({
  vaultDir, profileFile, cryptoKey, nextList, readList, saveList, io = fs.promises
}) {
  if (!safeProfileFile(profileFile) || !nextList || !Array.isArray(nextList.vaults)
      || typeof readList !== 'function' || typeof saveList !== 'function') {
    throw new Error('Invalid SafeLedger Profile deletion transaction.');
  }
  // Never overwrite a pending delete transaction. It must be resolved first.
  if (await exists(markerPath(vaultDir), io)) {
    throw new Error('Recover the pending Profile deletion before deleting another Profile.');
  }
  if (await exists(stagedPath(vaultDir, profileFile), io)) {
    throw new Error('An existing staged Profile needs recovery before deletion.');
  }

  const original = path.join(vaultDir, profileFile);
  const staged = stagedPath(vaultDir, profileFile);
  await atomicWriteJson(markerPath(vaultDir), {
    format: MARKER_FORMAT, version: 1, file: profileFile, created: new Date().toISOString()
  }, { pretty: false, mode: 0o600 });

  try {
    // Stage the encrypted file BEFORE removing it from the encrypted index.
    await io.rename(original, staged);
    await saveList(path.join(vaultDir, 'vaultlist.json'), JSON.stringify(nextList), cryptoKey);
  } catch (error) {
    try {
      const recovered = await recoverPending(vaultDir, cryptoKey, readList, io);
      if (recovered.committed) return { committed: true, cleanupPending: false };
    } catch (_) {
      throw new Error('Profile deletion could not be confirmed. SafeLedger retained the encrypted transaction for recovery at the next unlock; do not remove its files manually.');
    }
    throw error;
  }

  try {
    await recoverPending(vaultDir, cryptoKey, readList, io);
    return { committed: true, cleanupPending: false };
  } catch (_) {
    // The index has been durably committed. A failed cleanup must not
    // restore a deleted Profile or discard the encrypted staging file.
    // Next unlock will finish this pending transaction.
    return { committed: true, cleanupPending: true };
  }
}

module.exports = {
  deleteProfile,
  recoverPending,
  _test: { MARKER_FILE, MARKER_FORMAT, markerPath, stagedPath, validateMarker, exists }
};
