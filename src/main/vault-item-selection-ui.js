'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');

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

function ensureVaultItemSelected(doc) {
  const selected = selectedVaultItem(doc);
  if (selected) return selected;

  const first = firstVaultItem(doc);
  if (!first || typeof first.click !== 'function') return null;
  first.click();
  return first;
}

function repairAddAssetClick(event, doc) {
  if (selectedVaultItem(doc)) return false;
  const first = firstVaultItem(doc);
  if (!first || typeof first.click !== 'function') return false;

  // Do not let renderer.js evaluate its Add Asset guard against the old null
  // selection during this same click. Select the first Vault Item, then retry
  // Add Asset on the next microtask after the normal Vault Item click path has
  // finished updating renderer state and rebuilding the list.
  if (event && typeof event.preventDefault === 'function') event.preventDefault();
  if (event && typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
  first.click();
  queueMicrotask(() => {
    const selected = selectedVaultItem(doc);
    const addAsset = doc.getElementById && doc.getElementById('addRecord');
    if (selected && addAsset && typeof addAsset.click === 'function') addAsset.click();
  });
  return true;
}

function install(doc = document) {
  const addAsset = doc.getElementById('addRecord');
  if (addAsset && !addAsset.dataset.safeLedgerSelectionGuard) {
    addAsset.addEventListener('click', (event) => repairAddAssetClick(event, doc), true);
    addAsset.dataset.safeLedgerSelectionGuard = 'true';
  }

  ipc.on('result', (_event, result) => {
    if (!result || result.type !== 'vault-read') return;
    queueMicrotask(() => ensureVaultItemSelected(doc));
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => install(document));
}

exports._test = { selectedVaultItem, firstVaultItem, ensureVaultItemSelected, repairAddAssetClick };