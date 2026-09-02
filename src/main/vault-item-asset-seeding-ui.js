'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');
const assetPresets = require('./vault-item-asset-presets');

const marker = '__safeLedger2517AssetSeedWrapped';

function seedCreateRequest(request) {
  if (!request || request.type !== 'group-create' || !request.vaultData || !Array.isArray(request.vaultData.groups)) return 0;
  const index = Number(request.vaultData.groupSelected);
  if (!Number.isInteger(index) || index < 0 || index >= request.vaultData.groups.length) return 0;
  const group = request.vaultData.groups[index];
  if (!group || (Array.isArray(group.records) && group.records.length)) return 0;
  const records = assetPresets.buildRecords(group.name, group.category, group.created || Date());
  if (!records.length) return 0;
  group.records = records;
  return records.length;
}

if (!ipc[marker]) {
  const originalSend = ipc.send.bind(ipc);
  ipc.send = function sendWithVaultItemAssetSeed(channel, ...args) {
    if (channel === 'process-group') seedCreateRequest(args[0]);
    return originalSend(channel, ...args);
  };
  Object.defineProperty(ipc, marker, { value: true, enumerable: false, configurable: false });
}

exports._test = { seedCreateRequest };
