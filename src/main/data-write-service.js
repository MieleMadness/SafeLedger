'use strict';

const path = require('path');
const customFields = require('./custom-fields');
const vaultSchema = require('./vault-schema');
const assetPresets = require('./vault-item-asset-presets');
const duplicateAsset = require('./duplicate-asset');
const profileIcons = require('./profile-icon-model');
const profileDeleteTransaction = require('./profile-delete-transaction');

const MAX_SECRET_LENGTH = 20000;
const MAX_ADDRESS_LENGTH = 10000;

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function isPlainObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value, maxLength, { trim = false } = {}) { let next = String(value == null ? '' : value); if (trim) next = next.trim(); return next.slice(0, maxLength); }
function normalizeBoolean(value) { return value === true; }
function normalizeTimestamp(value) { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toISOString(); }

function normalizeProfilePatch(input) {
  if (!isPlainObject(input)) throw new Error('Invalid profile update.');
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(input, 'name')) { patch.name = text(input.name, 100, { trim: true }); if (!patch.name) throw new Error('Profile name is required.'); }
  if (Object.prototype.hasOwnProperty.call(input, 'notes')) patch.notes = text(input.notes, 500);
  if (Object.prototype.hasOwnProperty.call(input, 'customFields')) patch.customFields = customFields.normalize(input.customFields);
  if (Object.prototype.hasOwnProperty.call(input, 'pinned')) patch.pinned = normalizeBoolean(input.pinned);
  if (Object.prototype.hasOwnProperty.call(input, 'profileIcon')) patch.profileIcon = profileIcons.normalizeSelection(input.profileIcon);
  return patch;
}

function normalizeGroupPatch(input) {
  if (!isPlainObject(input)) throw new Error('Invalid vault item update.');
  const patch = {};
  const stringFields = {
    name: [100, true], category: [100, true], manufacturer: [80, false], model: [80, false], purchaseDate: [40, false], recoveryFormat: [80, false],
    recoveryStorageMode: [120, false], recoveryLocation: [180, false], deviceLocation: [180, false], backupLocation: [180, false], passphraseUsed: [40, false],
    beneficiary: [180, false], recoveryInstructions: [2000, false], tags: [250, false], password: [MAX_SECRET_LENGTH, false], pin: [2000, false],
    recoveryLink: [MAX_ADDRESS_LENGTH, false], seedPhrase: [MAX_SECRET_LENGTH, false], notes: [500, false]
  };
  for (const [field, [maxLength, trim]] of Object.entries(stringFields)) if (Object.prototype.hasOwnProperty.call(input, field)) patch[field] = text(input[field], maxLength, { trim });
  if (Object.prototype.hasOwnProperty.call(patch, 'name') && !patch.name) throw new Error('Vault item name is required.');
  if (Object.prototype.hasOwnProperty.call(input, 'customFields')) patch.customFields = customFields.normalize(input.customFields);
  if (Object.prototype.hasOwnProperty.call(input, 'pinned')) patch.pinned = normalizeBoolean(input.pinned);
  if (Object.prototype.hasOwnProperty.call(input, 'lastVerified')) patch.lastVerified = normalizeTimestamp(input.lastVerified);
  if (Object.prototype.hasOwnProperty.call(input, 'lastRecoveryDrill')) patch.lastRecoveryDrill = normalizeTimestamp(input.lastRecoveryDrill);
  return patch;
}

function normalizeRecordPatch(input) {
  if (!isPlainObject(input)) throw new Error('Invalid asset update.');
  const patch = {};
  const stringFields = { name: [100, true], symbol: [30, true], publicAddress: [MAX_ADDRESS_LENGTH, false], privateAddress: [MAX_SECRET_LENGTH, false], tags: [250, false], manualBalance: [100, false], notes: [500, false] };
  for (const [field, [maxLength, trim]] of Object.entries(stringFields)) if (Object.prototype.hasOwnProperty.call(input, field)) patch[field] = text(input[field], maxLength, { trim });
  if (Object.prototype.hasOwnProperty.call(patch, 'name') && !patch.name) throw new Error('Asset name is required.');
  if (Object.prototype.hasOwnProperty.call(input, 'customFields')) patch.customFields = customFields.normalize(input.customFields);
  if (Object.prototype.hasOwnProperty.call(input, 'pinned')) patch.pinned = normalizeBoolean(input.pinned);
  return patch;
}

function compareByName(a, b) { return String(a && a.name || '').localeCompare(String(b && b.name || ''), undefined, { sensitivity: 'base' }); }
function stripViewState(data) { const clean = clone(data); delete clean.groupSelected; delete clean.recordSelected; return clean; }
function stripProfileViewState(list) { const clean = clone(list); delete clean.vaultSelected; return clean; }
function withViewState(data, groupSelected = null, recordSelected = null) { const view = clone(data); view.groupSelected = groupSelected; view.recordSelected = recordSelected; return view; }
function withProfileViewState(list, vaultSelected = null) { const view = clone(list); view.vaultSelected = vaultSelected; return view; }
function exactEqual(a, b) { try { return JSON.stringify(a) === JSON.stringify(b); } catch (_) { return false; } }

function findSingleDeletionIndex(authoritative, submitted) {
  if (!Array.isArray(authoritative) || !Array.isArray(submitted) || submitted.length !== authoritative.length - 1) return -1;
  for (let removed = 0; removed < authoritative.length; removed++) {
    let valid = true;
    for (let out = 0, current = 0; out < submitted.length; out++, current++) {
      if (current === removed) current++;
      if (!exactEqual(authoritative[current], submitted[out])) { valid = false; break; }
    }
    if (valid) return removed;
  }
  return -1;
}

function resolveExistingIndex(items, requestedIndex, candidate) {
  if (!Array.isArray(items) || !items.length) return -1;
  const created = candidate && String(candidate.created || '');
  if (created) {
    // A supplied stable identity is authoritative. Never fall back to the
    // selected row if it is missing or ambiguous: that row may now be a
    // different wallet/asset after a deletion or resort.
    const matches = items.map((item, index) => ({ item, index }))
      .filter(({ item }) => String(item && item.created || '') === created);
    return matches.length === 1 ? matches[0].index : -1;
  }
  // Backward compatibility for old encrypted entries with no created field:
  // only allow index lookup when BOTH sides lack an identity. A missing
  // request identity must not silently target a modern identified item.
  if (requestedIndex == null || requestedIndex === '') return -1;
  const index = Number(requestedIndex);
  if (!Number.isInteger(index) || index < 0 || index >= items.length) return -1;
  return items[index] && !items[index].created ? index : -1;
}

function resolveOriginalGroupIndex(items, originalGroup, requestedIndex, candidate) {
  if (isPlainObject(originalGroup)) {
    // Starter templates historically share one creation timestamp. A full
    // original snapshot, captured before the edit, identifies one exact group
    // without depending on row order or a non-unique timestamp.
    const matches = (Array.isArray(items) ? items : [])
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => exactEqual(item, originalGroup));
    return matches.length === 1 ? matches[0].index : -1;
  }
  return resolveExistingIndex(items, requestedIndex, candidate);
}

function resolveRecordModifyIndex(items, requestedIndex, originalRecord, candidate) {
  if (!Array.isArray(items) || !items.length) return -1;
  if (isPlainObject(originalRecord)) {
    const matches = items.map((item, index) => ({ item, index })).filter(({ item }) => exactEqual(item, originalRecord));
    return matches.length === 1 ? matches[0].index : -1;
  }
  return resolveExistingIndex(items, requestedIndex, candidate);
}

// Narrow commands are the sole runtime transport format as of 2.6.118.
// Legacy full-snapshot adapters remain test-only until all saved-structure
// compatibility cases have dedicated narrow-command coverage.
function groupCommandRequest(params) {
  if (!isPlainObject(params) || isPlainObject(params.vaultData)) throw new Error('Full Vault Item snapshots are no longer accepted.');
  if (!['group-create', 'group-modify', 'group-delete'].includes(params.type)) throw new Error('Invalid Vault Item action.');
  if (typeof params.file !== 'string') throw new Error('Invalid Profile identifier.');
  if (params.type !== 'group-create' && !isPlainObject(params.originalGroup)) throw new Error('Missing original Vault Item snapshot.');
  if (params.type !== 'group-delete' && !isPlainObject(params.group)) throw new Error('Missing selected Vault Item.');
  return {
    type: params.type, file: params.file, index: params.index,
    group: params.group || null, originalGroup: params.originalGroup || null,
    activityEvent: params.activityEvent
  };
}

function recordCommandRequest(params) {
  if (!isPlainObject(params) || isPlainObject(params.vaultData)) throw new Error('Full Asset snapshots are no longer accepted.');
  if (!['create', 'modify', 'delete'].includes(params.action)) throw new Error('Invalid Asset action.');
  if (typeof params.file !== 'string' || !isPlainObject(params.originalGroup)) throw new Error('Missing original Wallet identity.');
  if (params.action !== 'create' && !isPlainObject(params.originalRecord)) throw new Error('Missing original Asset identity.');
  if (params.action !== 'delete' && !isPlainObject(params.record)) throw new Error('Missing selected Asset.');
  return {
    action: params.action, file: params.file,
    groupIndex: params.groupIndex, groupCreated: params.groupCreated,
    originalGroup: params.originalGroup,
    recordIndex: params.recordIndex, record: params.record || null,
    originalRecord: params.originalRecord || null,
    duplicateConfirmed: params.duplicateConfirmed === true
  };
}

function findExactOriginalIndex(items, original) {
  if (!Array.isArray(items) || !isPlainObject(original)) return -1;
  const matches = items.map((item, index) => ({ item, index })).filter(({ item }) => exactEqual(item, original));
  return matches.length === 1 ? matches[0].index : -1;
}

async function readAuthoritativeVault(vault, vaultDir, file, key) {
  if (!vault.safeVaultFileName(file)) throw new Error('Invalid SafeLedger vault file.');
  return vault.readVault(path.join(vaultDir, file), key);
}
async function saveAuthoritativeVault(vault, vaultDir, file, key, data) { const prepared = vaultSchema.prepareForSave(stripViewState(data)); await vault.saveVault(path.join(vaultDir, file), JSON.stringify(prepared), key); return prepared; }
function buildTrustedStarterRecords(group, created) { if (!group || !group.name) return []; return assetPresets.buildRecords(group.name, group.category, created); }

async function mutateGroup({ vault, vaultDir, key, request }) {
  const data = await readAuthoritativeVault(vault, vaultDir, request.file, key);
  if (!Array.isArray(data.groups)) data.groups = [];
  let selected = null;
  if (request.type === 'group-create') {
    const created = new Date().toISOString(); const patch = normalizeGroupPatch(request.group); if (!patch.name) throw new Error('Vault item name is required.');
    const group = Object.assign({ created, records: buildTrustedStarterRecords(patch, created) }, patch); data.groups.push(group); data.groups.sort(compareByName); selected = data.groups.indexOf(group);
  } else if (request.type === 'group-modify') {
    const index = resolveOriginalGroupIndex(data.groups, request.originalGroup, request.index, request.group); if (index < 0) throw new Error('The vault item changed or no longer exists. Reload the Profile and try again.');
    const existing = data.groups[index]; const updated = Object.assign({}, existing, normalizeGroupPatch(request.group), { modified: new Date().toISOString() }); if (!updated.name) throw new Error('Vault item name is required.');
    data.groups[index] = updated; data.groups.sort(compareByName); selected = data.groups.indexOf(updated);
  } else if (request.type === 'group-delete') {
    const index = request.originalGroup
      ? findExactOriginalIndex(data.groups, request.originalGroup)
      : findSingleDeletionIndex(data.groups, request.submittedGroups); if (index < 0) throw new Error('Vault item delete request did not match the current encrypted Profile. Reload and try again.'); data.groups.splice(index, 1);
  } else throw new Error('Invalid vault item update.');
  const saved = await saveAuthoritativeVault(vault, vaultDir, request.file, key, data);
  return withViewState(saved, selected, null);
}

function assertDuplicateApproved(records, candidate, excludeIndex, request) {
  const duplicate = duplicateAsset.warning(records, candidate, excludeIndex);
  if (duplicate && request.duplicateConfirmed !== true) throw new Error(`${duplicate.message.replace(/\?$/, '.') } Review the matching Asset and confirm the duplicate before saving.`);
}

async function mutateRecord({ vault, vaultDir, key, request }) {
  const data = await readAuthoritativeVault(vault, vaultDir, request.file, key);
  if (!Array.isArray(data.groups)) throw new Error('The selected Profile has no vault items.');
  const groupIndex = resolveOriginalGroupIndex(data.groups, request.originalGroup, request.groupIndex, { created: request.groupCreated });
  if (groupIndex < 0) throw new Error('The vault item changed or no longer exists. Reload the Profile and try again.');
  const group = data.groups[groupIndex];
  if (!Array.isArray(group.records)) group.records = [];
  let recordSelected = null;

  if (request.action === 'create') {
    const patch = normalizeRecordPatch(request.record);
    if (!patch.name) throw new Error('Asset name is required.');
    const record = Object.assign({ created: new Date().toISOString() }, patch);
    if (record.manualBalance) record.balanceUpdated = new Date().toISOString();
    assertDuplicateApproved(group.records, record, -1, request);
    group.records.push(record);
    group.records.sort(compareByName);
    recordSelected = group.records.indexOf(record);
  } else if (request.action === 'modify') {
    const index = resolveRecordModifyIndex(group.records, request.recordIndex, request.originalRecord, request.record);
    if (index < 0) throw new Error('The asset changed or no longer exists. Reload the vault item and try again.');
    const existing = group.records[index];
    const patch = normalizeRecordPatch(request.record);
    const updated = Object.assign({}, existing, patch, { modified: new Date().toISOString() });
    if (!updated.name) throw new Error('Asset name is required.');
    if (Object.prototype.hasOwnProperty.call(patch, 'manualBalance') && patch.manualBalance && patch.manualBalance !== existing.manualBalance) updated.balanceUpdated = new Date().toISOString();
    if (!duplicateAsset.sameIdentity(existing, updated)) assertDuplicateApproved(group.records, updated, index, request);
    group.records[index] = updated;
    group.records.sort(compareByName);
    recordSelected = group.records.indexOf(updated);
  } else if (request.action === 'delete') {
    const index = request.originalRecord
      ? findExactOriginalIndex(group.records, request.originalRecord)
      : findSingleDeletionIndex(group.records, request.submittedRecords);
    if (index < 0) throw new Error('Asset delete request did not match the current encrypted vault item. Reload and try again.');
    group.records.splice(index, 1);
  } else throw new Error('Invalid asset update.');

  const saved = await saveAuthoritativeVault(vault, vaultDir, request.file, key, data);
  return withViewState(saved, groupIndex, recordSelected);
}

async function modifyProfile({ vault, vaultDir, key, profile }) {
  const listFile = path.join(vaultDir, 'vaultlist.json');
  const list = await vault.readVaultList(listFile, key);
  const file = String(profile && profile.file || '');
  if (!vault.safeVaultFileName(file)) throw new Error('Invalid profile selection.');
  const index = list.vaults.findIndex((item) => item && item.file === file);
  if (index < 0) throw new Error('Profile was not found.');
  const existing = list.vaults[index];
  const updated = Object.assign({}, existing, normalizeProfilePatch(profile), { modified: new Date().toISOString() });
  updated.id = existing.id; updated.file = existing.file; updated.path = vaultDir; updated.created = existing.created;
  list.vaults[index] = updated; list.vaults.sort(compareByName); const selected = list.vaults.indexOf(updated);
  await vault.saveVault(listFile, JSON.stringify(stripProfileViewState(list)), key);
  return withProfileViewState(list, selected);
}

async function deleteProfile({ vault, vaultDir, key, fileName }) {
  if (!vault.safeVaultFileName(fileName)) throw new Error('Invalid profile deletion.');
  const listFile = path.join(vaultDir, 'vaultlist.json');
  const list = await vault.readVaultList(listFile, key);
  const index = list.vaults.findIndex((item) => item && item.file === fileName);
  if (index < 0) throw new Error('Profile was not found.');
  list.vaults.splice(index, 1);
  const outcome = await profileDeleteTransaction.deleteProfile({
    vaultDir, profileFile: fileName, cryptoKey: key,
    nextList: stripProfileViewState(list),
    readList: vault.readVaultList, saveList: vault.saveVault
  });
  const view = withProfileViewState(list, null);
  if (outcome.cleanupPending) view.profileDeleteCleanupPending = true;
  return view;
}

module.exports = {
  normalizeProfilePatch, normalizeGroupPatch, normalizeRecordPatch, groupCommandRequest, recordCommandRequest, mutateGroup, mutateRecord, modifyProfile, deleteProfile,
  stripViewState, stripProfileViewState, withViewState, withProfileViewState, findSingleDeletionIndex, resolveExistingIndex, resolveRecordModifyIndex, buildTrustedStarterRecords,
  _test: { clone, text, normalizeTimestamp, compareByName, exactEqual, assertDuplicateApproved }
};