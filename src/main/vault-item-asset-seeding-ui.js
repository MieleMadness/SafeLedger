'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');
const assetPresets = require('./vault-item-asset-presets');

const seedMarker = '__safeLedger2517AssetSeedWrapped';
const refreshMarker = '__safeLedger2518AssetSeedRefresh';

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

function refreshCreatedWallet() {
  const selected = document.querySelector('#groupArea .nav > li > a.item-selected');
  if (!selected || typeof selected.click !== 'function') return false;

  // Reuse the normal wallet-selection path after the save response finishes.
  // That path resets record selection and renders the newly seeded asset list,
  // avoiding a second, duplicate implementation of wallet/asset rendering here.
  selected.click();
  return true;
}

if (!ipc[seedMarker]) {
  const originalSend = ipc.send.bind(ipc);
  ipc.send = function sendWithVaultItemAssetSeed(channel, ...args) {
    if (channel === 'process-group') seedCreateRequest(args[0]);
    return originalSend(channel, ...args);
  };
  Object.defineProperty(ipc, seedMarker, { value: true, enumerable: false, configurable: false });
}

if (!ipc[refreshMarker]) {
  ipc.on('result', (_event, result) => {
    if (!result || result.type !== 'group-create') return;

    // renderer.js handles the save result first and rebuilds the wallet list.
    // Run after that result dispatch so the newly selected wallet anchor exists.
    queueMicrotask(() => refreshCreatedWallet());
  });
  Object.defineProperty(ipc, refreshMarker, { value: true, enumerable: false, configurable: false });
}

exports._test = { seedCreateRequest, refreshCreatedWallet };
