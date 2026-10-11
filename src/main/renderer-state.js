'use strict';

// One renderer-world owner for transient SafeLedger workspace/session state.
// Persistent encrypted data continues to belong to the trusted main process.
const saving = { state: false };
const state = {
  settings: null,
  vaultList: null,
  vaultData: null,
  sessionUnlocked: false,
  saving
};

function getSettings() { return state.settings; }
function setSettings(value) { state.settings = value || null; return state.settings; }
function getVaultList() { return state.vaultList; }
function setVaultList(value) { state.vaultList = value || null; return state.vaultList; }
function getVaultData() { return state.vaultData; }
function setVaultData(value) { state.vaultData = value || null; return state.vaultData; }
function isUnlocked() { return state.sessionUnlocked === true; }
function setUnlocked(value) { state.sessionUnlocked = value === true; return state.sessionUnlocked; }
function getSaving() { return saving; }

function clearWorkspace() {
  state.vaultList = null;
  state.vaultData = null;
  state.sessionUnlocked = false;
  saving.state = false;
}

function snapshot() {
  return {
    settings: state.settings,
    vaultList: state.vaultList,
    vaultData: state.vaultData,
    sessionUnlocked: state.sessionUnlocked,
    saving
  };
}

module.exports = {
  state,
  getSettings,
  setSettings,
  getVaultList,
  setVaultList,
  getVaultData,
  setVaultData,
  isUnlocked,
  setUnlocked,
  getSaving,
  clearWorkspace,
  snapshot
};
