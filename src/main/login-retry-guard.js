'use strict';

const { ipcRenderer: ipc } = require('electron');

function shouldRestoreLogin(params) {
  return !!params
    && params.status === 'ERROR'
    && !(params.settings && params.settings.lockLogin);
}

function restoreLoginButton(params) {
  if (!shouldRestoreLogin(params)) return false;
  const button = document.getElementById('loginBtn');
  if (!button) return false;

  button.disabled = false;
  const input = document.getElementById('masterCryptoInput');
  if (input) {
    input.disabled = false;
    input.focus();
  }
  return true;
}

ipc.on('result', (_event, params) => {
  queueMicrotask(() => restoreLoginButton(params));
});

exports._test = { shouldRestoreLogin, restoreLoginButton };
