'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');
const columnCollapseUi = require('./column-collapse-ui');

let awaitingInitialVaultRead = false;

function firstVisibleProfileLink() {
  const area = document.getElementById('vaultArea');
  return area && typeof area.querySelector === 'function'
    ? area.querySelector('.nav > li > a')
    : null;
}

function beginPostLoginWorkspace() {
  const firstProfile = firstVisibleProfileLink();
  if (!firstProfile || typeof firstProfile.click !== 'function') {
    awaitingInitialVaultRead = false;
    return columnCollapseUi.revealAfterLogin();
  }

  awaitingInitialVaultRead = true;
  firstProfile.click();
}

function handleResult(params = {}) {
  if (params.type === 'session-locked') {
    awaitingInitialVaultRead = false;
    columnCollapseUi.collapseForLogin();
    return;
  }

  if (params.type === 'vaultlist-init' && params.vaultList) {
    beginPostLoginWorkspace();
    return;
  }

  if (params.type === 'vault-read' && awaitingInitialVaultRead) {
    awaitingInitialVaultRead = false;
    columnCollapseUi.revealAfterLogin();
  }
}

ipc.on('result', (_event, params) => handleResult(params));

exports._test = {
  firstVisibleProfileLink,
  beginPostLoginWorkspace,
  handleResult,
  isAwaitingInitialVaultRead: () => awaitingInitialVaultRead
};
