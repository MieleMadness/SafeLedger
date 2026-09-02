'use strict';

function validGroupIndex(vaultData) {
  if (!vaultData || !Array.isArray(vaultData.groups)) return -1;
  const index = Number(vaultData.groupSelected);
  return Number.isInteger(index) && index >= 0 && index < vaultData.groups.length ? index : -1;
}

function ensureGroupSelection(vaultData) {
  if (!vaultData || !Array.isArray(vaultData.groups) || !vaultData.groups.length) return false;
  if (validGroupIndex(vaultData) >= 0) return true;
  vaultData.groupSelected = 0;
  vaultData.recordSelected = null;
  return true;
}

function resetForVaultRead(vaultData) {
  if (!vaultData) return false;
  vaultData.groupSelected = null;
  vaultData.recordSelected = null;
  return ensureGroupSelection(vaultData);
}

module.exports = { validGroupIndex, ensureGroupSelection, resetForVaultRead };