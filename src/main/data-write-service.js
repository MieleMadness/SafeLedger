'use strict';

const path = require('path');
const customFields = require('./custom-fields');
const vaultSchema = require('./vault-schema');

const MAX_SECRET_LENGTH = 20000;
const MAX_ADDRESS_LENGTH = 10000;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value, maxLength, { trim = false } = {}) {
  let next = String(value == null ? '' : value);
  if (trim) next = next.trim();
  return next.slice(0, maxLength);
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function normalizeProfilePatch(input) {
  if (!isPlainObject(input)) throw new Error('Invalid profile update.');
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(input, 'name')) {
    patch.name = text(input.name, 100, { trim: true });
    if (!patch.name) throw new Error('Profile name is required.');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'notes')) patch.notes = text(input.notes, 500);
  if (Object.prototype.hasOwnProperty.call(input, 'pinned')) patch.pinned = normalizeBoolean(input.pinned);
  return patch;
}

function normalizeGroupPatch(input) {
  if (!isPlainObject(input)) throw new Error('Invalid vault item update.');
  const patch = {};
  const stringFields = {
    name: [100, true],
    category: [100, true],
    manufacturer: [80, false],
    model: [80, false],
    purchaseDate: [40, false],
    recoveryFormat: [80, false],
    recoveryStorageMode: [120, false],
    recoveryLocation: [180, false],
    deviceLocation: [180, false],
    backupLocation: [180, false],
    passphraseUsed: [40, false],
    beneficiary: [180, false],
    recoveryInstructions: [2000, false],
    tags: [250, false],
    password: [MAX_SECRET_LENGTH, false],
    pin: [2000, false],
    recoveryLink: [MAX_ADDRESS_LENGTH, false],
    seedPhrase: [MAX_SECRET_LENGTH, false],
    notes: [500, false]
  };
  for (const [field, [maxLength, trim]] of Object.entries(stringFields)) {
    if (Object.prototype.hasOwnProperty.call(input, field)) patch[field] = text(input[field], maxLength, { trim });
  }
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
  const stringFields = {
    name: [100, true],
    symbol: [30, true],
    publicAddress: [MAX_ADDRESS_LENGTH, false],
    privateAddress: [MAX_SECRET_LENGTH, false],
    tags: [250, false],
    manualBalance: [100, false],
    notes: [500, false]
  };
  for (const [field, [maxLength, trim]] of Object.entries(stringFields)) {
    if (Object.prototype.hasOwnProperty.call(input, field)) patch[field] = text(input[field], maxLength, { trim });
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'name') && !patch.name) throw new Error('Asset name is required.');
  if (Object.prototype.hasOwnProperty.call(input, 'customFields')) patch.customFields = customFields.normalize(input.customFields);
  if (Object.prototype.hasOwnProperty.call(input, 'pinned')) patch.pinned = normalizeBoolean(input.pinned);
  return patch;
}

function compareByName(a, b) {
  return String(a && a.name || '').localeCompare(String(b && b.name || ''), undefined, { sensitivity: 'base' });
}

function stripViewState(data) {
  const clean = clone(data);
  delete clean.groupSelected;
  delete clean.recordSelected;
  return clean;
}

function stripProfileViewState(list) {
  const clean = clone(list);
  delete clean.vaultSelected;
  return clean;
}

function withViewState(data, groupSelected = null, recordSelected = null) {
  const view = clone(data);
  view.groupSelected = groupSelected;
  view.recordSelected = recordSelected;
  return view;
}

function withProfileViewState(list, vaultSelected = null) {
  const view = clone(list);
  view.vaultSelected = vaultSelected;
  return view;
}

function exactEqual(a, b) {
  try { return JSON.stringify(a) === JSON.stringify(b); }
  catch (_) { return false; }
}

function findSingleDeletionIndex(authoritative, submitted) {
  if (!Array.isArray(authoritative) || !Array.isArray(submitted) || submitted.length !== authoritative.length - 1) return -1;
  for (let removed = 0; removed < authoritative.length; removed++) {
    let valid = true;
    for (let out = 0, current = 0; out < submitted.length; out++, current++) {
      if (current === removed) current++;
      if (!exactEqual(authoritative[current], submitted[out])) {
        valid = false;
        break;
      }
    }
    if (valid) return removed;
  }
  return -1;
}

function resolveExistingIndex(items, requestedIndex, candidate) {
  if (!Array.isArray(items) || !items.length) return -1;
  const created = candidate && String(candidate.created || '');
  if (created) {
    const matches = items.map((item, index) => ({ item, index }))
      .filter(({ item }) => String(item && item.created || '') === created);
    if (matches.length === 1) return matches[0].index;
  }
  const index = Number(requestedIndex);
  return Number.isInteger(index) && index >= 0 && index < items.length ? index : -1;
}

function legacyGroupRequest(params) {
  if (!isPlainObject(params) || !isPlainObject(params.vaultData)) throw new Error('Invalid vault item update.');
  const type = String(params.type || '');
  if (!['group-create', 'group-modify', 'group-delete'].includes(type)) throw new Error('Invalid vault item update.');
  const vaultData = params.vaultData;
  const file = String(vaultData.file || '');
  if (type === 'group-delete') {
    return { type, file, submittedGroups: Array.isArray(vaultData.groups) ? clone(vaultData.groups) : [] };
  }
  const index = Number(vaultData.groupSelected);
  const group = Number.isInteger(index) && Array.isArray(vaultData.groups) ? vaultData.groups[index] : null;
  if (!group) throw new Error('SafeLedger could not identify the requested vault item.');
  return { type, file, index, group: clone(group), activityEvent: params.activityEvent };
}

function legacyRecordRequest(params) {
  if (!isPlainObject(params) || !isPlainObject(params.vaultData)) throw new Error('Invalid asset update.');
  const action = String(params.action || '');
  if (!['create', 'modify', 'delete'].includes(action)) throw new Error('Invalid asset update.');
  const vaultData = params.vaultData;
  const file = String(vaultData.file || '');
  const groupIndex = Number(vaultData.groupSelected);
  const submittedGroup = Number.isInteger(groupIndex) && Array.isArray(vaultData.groups) ? vaultData.groups[groupIndex] : null;
  if (!submittedGroup) throw new Error('SafeLedger could not identify the requested vault item for this asset.');
  if (action === 'delete') {
    return {
      action,
      file,
      groupIndex,
      groupCreated: String(submittedGroup.created || ''),
      submittedRecords: Array.isArray(submittedGroup.records) ? clone(submittedGroup.records) : []
    };
  }
  const recordIndex = Number(vaultData.recordSelected);
  const record = Number.isInteger(recordIndex) && Array.isArray(submittedGroup.records) ? submittedGroup.records[recordIndex] : null;
  if (!record) throw new Error('SafeLedger could not identify the requested asset.');
  return {
    action,
    file,
    groupIndex,
    groupCreated: String(submittedGroup.created || ''),
    recordIndex,
    record: clone(record)
  };
}

async function readAuthoritativeVault(vault, vaultDir, file, key) {
  if (!vault.safeVaultFileName(file)) throw new Error('Invalid SafeLedger vault file.');
  return vault.readVault(path.join(vaultDir, file), key);
}

async function saveAuthoritativeVault(vault, vaultDir, file, key, data) {
  const prepared = vaultSchema.prepareForSave(stripViewState(data));
  await vault.saveVault(path.join(vaultDir, file), JSON.stringify(prepared), key);
  return prepared;
}

async function mutateGroup({ vault, vaultDir, key, request }) {
  const data = await readAuthoritativeVault(vault, vaultDir, request.file, key);
  if (!Array.isArray(data.groups)) data.groups = [];
  let selected = null;

  if (request.type === 'group-create') {
    const group = Object.assign({ created: new Date().toISOString(), records: [] }, normalizeGroupPatch(request.group));
    if (!group.name) throw new Error('Vault item name is required.');
    data.groups.push(group);
    data.groups.sort(compareByName);
    selected = data.groups.indexOf(group);
  } else if (request.type === 'group-modify') {
    const index = resolveExistingIndex(data.groups, request.index, request.group);
    if (index < 0) throw new Error('The vault item changed or no longer exists. Reload the Profile and try again.');
    const existing = data.groups[index];
    const updated = Object.assign({}, existing, normalizeGroupPatch(request.group), { modified: new Date().toISOString() });
    if (!updated.name) throw new Error('Vault item name is required.');
    data.groups[index] = updated;
    data.groups.sort(compareByName);
    selected = data.groups.indexOf(updated);
  } else if (request.type === 'group-delete') {
    const index = findSingleDeletionIndex(data.groups, request.submittedGroups);
    if (index < 0) throw new Error('Vault item delete request did not match the current encrypted Profile. Reload and try again.');
    data.groups.splice(index, 1);
  } else {
    throw new Error('Invalid vault item update.');
  }

  const saved = await saveAuthoritativeVault(vault, vaultDir, request.file, key, data);
  return withViewState(saved, selected, null);
}

async function mutateRecord({ vault, vaultDir, key, request }) {
  const data = await readAuthoritativeVault(vault, vaultDir, request.file, key);
  if (!Array.isArray(data.groups)) throw new Error('The selected Profile has no vault items.');
  const groupIndex = resolveExistingIndex(data.groups, request.groupIndex, { created: request.groupCreated });
  if (groupIndex < 0) throw new Error('The vault item changed or no longer exists. Reload the Profile and try again.');
  const group = data.groups[groupIndex];
  if (!Array.isArray(group.records)) group.records = [];
  let recordSelected = null;

  if (request.action === 'create') {
    const patch = normalizeRecordPatch(request.record);
    if (!patch.name) throw new Error('Asset name is required.');
    const record = Object.assign({ created: new Date().toISOString() }, patch);
    if (record.manualBalance) record.balanceUpdated = new Date().toISOString();
    group.records.push(record);
    group.records.sort(compareByName);
    recordSelected = group.records.indexOf(record);
  } else if (request.action === 'modify') {
    const index = resolveExistingIndex(group.records, request.recordIndex, request.record);
    if (index < 0) throw new Error('The asset changed or no longer exists. Reload the vault item and try again.');
    const existing = group.records[index];
    const patch = normalizeRecordPatch(request.record);
    const updated = Object.assign({}, existing, patch, { modified: new Date().toISOString() });
    if (!updated.name) throw new Error('Asset name is required.');
    if (Object.prototype.hasOwnProperty.call(patch, 'manualBalance') && patch.manualBalance && patch.manualBalance !== existing.manualBalance) {
      updated.balanceUpdated = new Date().toISOString();
    }
    group.records[index] = updated;
    group.records.sort(compareByName);
    recordSelected = group.records.indexOf(updated);
  } else if (request.action === 'delete') {
    const index = findSingleDeletionIndex(group.records, request.submittedRecords);
    if (index < 0) throw new Error('Asset delete request did not match the current encrypted vault item. Reload and try again.');
    group.records.splice(index, 1);
  } else {
    throw new Error('Invalid asset update.');
  }

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
  updated.id = existing.id;
  updated.file = existing.file;
  updated.path = vaultDir;
  updated.created = existing.created;
  list.vaults[index] = updated;
  list.vaults.sort(compareByName);
  const selected = list.vaults.indexOf(updated);
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
  await vault.saveVault(listFile, JSON.stringify(stripProfileViewState(list)), key);
  await vault.deleteVault(path.join(vaultDir, fileName));
  return withProfileViewState(list, null);
}

module.exports = {
  normalizeProfilePatch,
  normalizeGroupPatch,
  normalizeRecordPatch,
  legacyGroupRequest,
  legacyRecordRequest,
  mutateGroup,
  mutateRecord,
  modifyProfile,
  deleteProfile,
  stripViewState,
  stripProfileViewState,
  withViewState,
  withProfileViewState,
  findSingleDeletionIndex,
  resolveExistingIndex,
  _test: { clone, text, normalizeTimestamp, compareByName, exactEqual }
};
