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

function hasValidVaultItemSelection(vaultData) {
  if (!vaultData || !Array.isArray(vaultData.groups)) return false;
  const index = Number(vaultData.groupSelected);
  return Number.isInteger(index) && index >= 0 && index < vaultData.groups.length;
}

function ensureVaultItemSelected(doc, vaultData = activeVaultData) {
  const selected = selectedVaultItem(doc);
  if (hasValidVaultItemSelection(vaultData)) return selected || firstVaultItem(doc);

  const first = firstVaultItem(doc);

  // Prefer the real Vault Item click path because it selects the exact first
  // visible item and refreshes its detail/asset columns in the normal way.
  if (first && typeof first.click === 'function') first.click();
  if (hasValidVaultItemSelection(vaultData)) return selectedVaultItem(doc) || first;

  // 2.6.4 relied only on the DOM click above. If renderer state and the DOM
  // became temporarily out of sync, Add Asset could still see null and stop.
  // The renderer bridge now fans one shared result object to all UI listeners,
  // so this fallback repairs the actual state object used by renderer.js.
  if (vaultData && Array.isArray(vaultData.groups) && vaultData.groups.length) {
    vaultData.groupSelected = 0;
    vaultData.recordSelected = null;
    return selectedVaultItem(doc) || first || vaultData.groups[0];
  }

  return null;
}

function install(doc = document) {
  const addAsset = doc.getElementById('addRecord');
  if (addAsset && !addAsset.dataset.safeLedgerSelectionGuard) {
    // Capture phase runs before renderer.js's normal Add Asset handler. Repair
    // the shared Vault Item state first so the existing handler can open the
    // Add Asset form instead of returning "Please select a Vault Item."
    addAsset.addEventListener('click', () => ensureVaultItemSelected(doc, activeVaultData), true);
    addAsset.dataset.safeLedgerSelectionGuard = 'true';
  }

  ipc.on('result', (_event, result) => {
    if (!result) return;
    if (result.type === 'vault-delete' || result.type === 'session-locked') {
      activeVaultData = null;
      return;
    }
    if (result.vaultData) activeVaultData = result.vaultData;
    if (result.type !== 'vault-read') return;

    // renderer.js handles vault-read first and rebuilds #groupArea. Then this
    // selects the first visible Vault Item and, if necessary, repairs the same
    // shared vault state object used by the Add Asset handler.
    queueMicrotask(() => ensureVaultItemSelected(doc, activeVaultData));
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
  setActiveVaultData: (value) => { activeVaultData = value; },
  getActiveVaultData: () => activeVaultData
};