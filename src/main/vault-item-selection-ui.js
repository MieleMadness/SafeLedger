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

function install(doc = document) {
  const addAsset = doc.getElementById('addRecord');
  if (addAsset && !addAsset.dataset.safeLedgerSelectionGuard) {
    // Run before renderer.js's normal Add Asset handler. If a Profile was just
    // loaded and its Vault Items are visible but none is selected yet, select
    // the first visible item synchronously so Add Asset opens as expected.
    addAsset.addEventListener('click', () => ensureVaultItemSelected(doc), true);
    addAsset.dataset.safeLedgerSelectionGuard = 'true';
  }

  ipc.on('result', (_event, result) => {
    if (!result || result.type !== 'vault-read') return;

    // renderer.js handles vault-read first and rebuilds #groupArea. Select the
    // first visible Vault Item only when no explicit target/selection exists.
    // This makes a freshly opened Profile immediately ready for Add Asset.
    queueMicrotask(() => ensureVaultItemSelected(doc));
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => install(document));
}

exports._test = { selectedVaultItem, firstVaultItem, ensureVaultItemSelected };