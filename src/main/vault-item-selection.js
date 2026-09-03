'use strict';

/*
 * Canonical Vault Item selection state.
 *
 * This module is intentionally UI-free. It does not subscribe to IPC, inspect
 * the DOM, or synthesize clicks. renderer.js owns the authoritative vaultData
 * object and calls this helper only when the real Add Asset action needs a
 * destination.
 */

function hasValidSelection(vaultData) {
  if (!vaultData || !Array.isArray(vaultData.groups)) return false;
  if (vaultData.groupSelected == null || vaultData.groupSelected === '') return false;
  const index = Number(vaultData.groupSelected);
  return Number.isInteger(index) && index >= 0 && index < vaultData.groups.length && Boolean(vaultData.groups[index]);
}

function firstAvailableIndex(vaultData) {
  if (!vaultData || !Array.isArray(vaultData.groups)) return -1;
  return vaultData.groups.findIndex((group) => Boolean(group));
}

function ensureAddAssetSelection(vaultData) {
  if (hasValidSelection(vaultData)) {
    const index = Number(vaultData.groupSelected);
    return { ok: true, changed: false, index, group: vaultData.groups[index] };
  }

  const index = firstAvailableIndex(vaultData);
  if (index < 0) return { ok: false, changed: false, index: null, group: null };

  vaultData.groupSelected = index;
  vaultData.recordSelected = null;
  return { ok: true, changed: true, index, group: vaultData.groups[index] };
}

exports.hasValidSelection = hasValidSelection;
exports.firstAvailableIndex = firstAvailableIndex;
exports.ensureAddAssetSelection = ensureAddAssetSelection;
