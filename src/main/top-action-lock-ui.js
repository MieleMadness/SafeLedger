'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');

const LOCKED_MESSAGE = 'SafeLedger is locked. Please log in again.';
let unlocked = false;

function showLockedMessage() {
  const area = document.getElementById('detailArea');
  if (!area) return;
  area.innerHTML = '';
  const warning = document.createElement('p');
  warning.className = 'alert alert-warning';
  warning.textContent = LOCKED_MESSAGE;
  area.appendChild(warning);
}

function openLogin() {
  if (window.safeLedgerApi && typeof window.safeLedgerApi.initSystem === 'function') {
    window.safeLedgerApi.initSystem();
    return;
  }
  ipc.send('init-system');
}

function guardButton(id, lockedAction) {
  const button = document.getElementById(id);
  if (!button) return;
  button.addEventListener('click', (event) => {
    if (unlocked) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    lockedAction();
  }, true);
}

function start() {
  guardButton('dashboardButton', openLogin);
  guardButton('activityButton', showLockedMessage);
  guardButton('settingsButton', showLockedMessage);
  guardButton('globalSearchButton', showLockedMessage);
}

ipc.on('result-init-system', () => { unlocked = false; });
ipc.on('result', (_event, params = {}) => {
  if (params.type === 'vaultlist-init' && params.sessionUnlocked === true) unlocked = true;
  else if (params.sessionUnlocked === true) unlocked = true;
  if (params.type === 'session-locked') unlocked = false;
});
ipc.on('result-lockout-destroy', () => { unlocked = false; });
ipc.on('security-session-locked', () => { unlocked = false; });

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', start);

exports.LOCKED_MESSAGE = LOCKED_MESSAGE;
exports._test = {
  showLockedMessage,
  openLogin,
  guardButton,
  start,
  isUnlocked: () => unlocked
};
