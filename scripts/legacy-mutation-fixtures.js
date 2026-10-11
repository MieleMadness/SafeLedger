'use strict';

// Historical full-renderer-snapshot request format, retained exclusively
// inside regression fixtures to verify data compatibility from older builds.
// No runtime Electron IPC path loads or accepts this adapter.
const clone = (value) => JSON.parse(JSON.stringify(value));
const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

function legacyGroupRequest(params) {
  if (!isPlainObject(params) || !isPlainObject(params.vaultData)) throw new Error('Invalid vault item update.');
  const type = String(params.type || '');
  if (!['group-create', 'group-modify', 'group-delete'].includes(type)) throw new Error('Invalid vault item update.');
  const vaultData = params.vaultData;
  const file = String(vaultData.file || '');
  if (type === 'group-delete') return { type, file, submittedGroups: Array.isArray(vaultData.groups) ? clone(vaultData.groups) : [] };
  const index = Number(vaultData.groupSelected);
  const group = Number.isInteger(index) && Array.isArray(vaultData.groups) ? vaultData.groups[index] : null;
  if (!group) throw new Error('SafeLedger could not identify the requested vault item.');
  return { type, file, index, group: clone(group), originalGroup: isPlainObject(params.originalGroup) ? clone(params.originalGroup) : null, activityEvent: params.activityEvent };
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
  if (action === 'delete') return { action, file, groupIndex, groupCreated: String(submittedGroup.created || ''), originalGroup: isPlainObject(params.originalGroup) ? clone(params.originalGroup) : null, submittedRecords: Array.isArray(submittedGroup.records) ? clone(submittedGroup.records) : [] };
  const recordIndex = Number(vaultData.recordSelected);
  const record = Number.isInteger(recordIndex) && Array.isArray(submittedGroup.records) ? submittedGroup.records[recordIndex] : null;
  if (!record) throw new Error('SafeLedger could not identify the requested asset.');
  return {
    action, file, groupIndex, groupCreated: String(submittedGroup.created || ''), originalGroup: isPlainObject(params.originalGroup) ? clone(params.originalGroup) : null, recordIndex, record: clone(record),
    originalRecord: action === 'modify' && isPlainObject(params.originalRecord) ? clone(params.originalRecord) : null,
    duplicateConfirmed: params.duplicateConfirmed === true
  };
}


module.exports = { legacyGroupRequest, legacyRecordRequest };
