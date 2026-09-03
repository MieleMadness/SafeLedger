'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');

let activeVaultData = null;

function selectedVaultItem(doc) {
  return doc && doc.querySelector
    ? doc.querySelector('#groupArea .nav > li > a.item-selected')
    : null;
}

function firstVaultItem(doc) {
  return doc && doc.querySelector
    ? doc.querySelector('#groupArea .nav > li > a')
    : null;
}

function hasValidVaultItemSelection(vaultData = activeVaultData) {
  if (!vaultData || !Array.isArray(vaultData.groups)) return false;
  if (vaultData.groupSelected == null || vaultData.groupSelected === '') return false;
  const index = Number(vaultData.groupSelected);
  return Number.isInteger(index) && index >= 0 && index < vaultData.groups.length;
}

function ensureVaultItemSelected(doc, vaultData = activeVaultData) {
  if (hasValidVaultItemSelection(vaultData)) return selectedVaultItem(doc) || firstVaultItem(doc);

  const candidate = selectedVaultItem(doc) || firstVaultItem(doc);
  if (!candidate || typeof candidate.click !== 'function') return null;

  // Selection repair happens only when Add Asset is actually requested. This
  // keeps a Profile click on the Profile detail screen instead of silently
  // navigating into the first Vault Item after the Profile finishes loading.
  candidate.click();
  return candidate;
}

function repairAddAssetClick(_event, doc, vaultData = activeVaultData) {
  if (hasValidVaultItemSelection(vaultData)) return false;
  const repaired = ensureVaultItemSelected(doc, vaultData);
  return !!repaired && hasValidVaultItemSelection(vaultData);
}

function install(doc = document) {
  const addAsset = doc.getElementById('addRecord');
  if (addAsset && !addAsset.dataset.safeLedgerSelectionGuard) {
    // Capture phase repairs selection synchronously, then deliberately allows
    // renderer.js's real Add Asset handler to continue on the same click.
    addAsset.addEventListener('click', (event) => repairAddAssetClick(event, doc, activeVaultData), true);
    addAsset.dataset.safeLedgerSelectionGuard = 'true';
  }

  ipc.on('result', (_event, result) => {
    if (!result) return;
    if (result.type === 'vault-delete' || result.type === 'session-locked') {
      activeVaultData = null;
      return;
    }
    if (result.vaultData) activeVaultData = result.vaultData;

    // Do not auto-click a Vault Item after vault-read. renderer.js intentionally
    // shows the selected Profile detail before reading its encrypted contents;
    // automatically clicking the first Vault Item here would replace that view.
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => install(document));
}

exports._test = {
  selectedVaultItem,
  firstVaultItem,
  hasValidVaultItemSelection,
  ensureVaultItemSelected,
  repairAddAssetClick,
  install,
  setActiveVaultData: (value) => { activeVaultData = value; },
  getActiveVaultData: () => activeVaultData
};
