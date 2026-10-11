'use strict';

// Workstation UI state is not an authority to rewrite an encrypted vault.
// Send only the selected item's command/snapshot, not every other Profile,
// Vault Item and Asset in the renderer's current workspace.
const copy = (value) => value == null ? null : JSON.parse(JSON.stringify(value));
function selectedGroup(vaultData) {
  if (!vaultData || vaultData.groupSelected == null || vaultData.groupSelected === '') return null;
  const index = Number(vaultData.groupSelected);
  if (!Number.isInteger(index) || !vaultData || !Array.isArray(vaultData.groups)) return null;
  return { index, group: vaultData.groups[index] || null };
}

function groupCommand(params = {}) {
  const data = params.vaultData;
  const type = String(params.type || '');
  if (!data || typeof data.file !== 'string' || !['group-create', 'group-modify', 'group-delete'].includes(type)) {
    throw new Error('Invalid SafeLedger Vault Item command.');
  }
  if (type === 'group-delete') {
    if (!params.originalGroup) throw new Error('A deletion needs the original Vault Item snapshot.');
    return { type, file: data.file, originalGroup: copy(params.originalGroup) };
  }
  const target = selectedGroup(data);
  if (!target || !target.group) throw new Error('SafeLedger could not identify the selected Vault Item.');
  if (type === 'group-modify' && !params.originalGroup) {
    throw new Error('A Vault Item edit needs its original snapshot.');
  }
  return {
    type, file: data.file, index: target.index, group: copy(target.group),
    originalGroup: copy(params.originalGroup), activityEvent: params.activityEvent
  };
}

function recordCommand(params = {}) {
  const data = params.vaultData;
  const action = String(params.action || '');
  if (!data || typeof data.file !== 'string' || !['create', 'modify', 'delete'].includes(action)) {
    throw new Error('Invalid SafeLedger Asset command.');
  }
  const target = selectedGroup(data);
  if (!target || !params.originalGroup) throw new Error('An Asset command needs the original Vault Item snapshot.');
  if (action === 'delete') {
    if (!params.originalRecord) throw new Error('An Asset deletion needs the original Asset snapshot.');
    return {
      action, file: data.file, groupIndex: target.index,
      groupCreated: String(params.originalGroup.created || ''),
      originalGroup: copy(params.originalGroup), originalRecord: copy(params.originalRecord)
    };
  }
  if (data.recordSelected == null || data.recordSelected === '') throw new Error('Choose an Asset before saving.');
  const index = Number(data.recordSelected);
  if (!target.group || !Array.isArray(target.group.records) || !Number.isInteger(index)
    || index < 0 || index >= target.group.records.length) {
    throw new Error('SafeLedger could not identify the selected Asset.');
  }
  if (action === 'modify' && !params.originalRecord) {
    throw new Error('An Asset edit needs the original Asset snapshot.');
  }
  return {
    action, file: data.file, groupIndex: target.index,
    groupCreated: String(params.originalGroup.created || ''),
    originalGroup: copy(params.originalGroup),
    recordIndex: index, record: copy(target.group.records[index]),
    originalRecord: copy(params.originalRecord),
    duplicateConfirmed: params.duplicateConfirmed === true
  };
}

module.exports = { groupCommand, recordCommand };
