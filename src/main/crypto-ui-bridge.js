'use strict';

const { ipcRenderer: ipc } = require('electron');
const crypto = require('crypto');
const status = require('./status');
const runtimeUtils = require('./runtime-utils');
const masterKeyVerifier = require('./master-key-verifier');

const MAX_MASTER_PASSWORD_LENGTH = runtimeUtils.MAX_MASTER_PASSWORD_LENGTH;
let latestSettings = null;
let latestVaultList = null;

function validatePassword(value) {
  const password = String(value || '');
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > MAX_MASTER_PASSWORD_LENGTH) return `Password must be ${MAX_MASTER_PASSWORD_LENGTH} characters or fewer`;
  if (!/[a-z]/.test(password)) return 'Password must contain at least 1 lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least 1 number';
  return '';
}

function failButton(button, message) {
  if (button) button.disabled = false;
  status.showStatus({ status: 'ERROR', statusMsg: message });
}

function sendUnlockedDataKey(dataKeyHex) {
  const dataKey = Buffer.from(dataKeyHex, 'hex');
  const sessionSettings = Object.assign({}, latestSettings, {
    masterKeyVerifier: masterKeyVerifier.createMasterKeyVerifier(dataKey)
  });
  latestSettings = sessionSettings;
  ipc.send('read-vaultlist-init', {
    cryptoKey: dataKey,
    settings: sessionSettings
  });
}

async function handleLogin(button) {
  const input = document.getElementById('masterCryptoInput');
  if (!input) return failButton(button, 'Password field is unavailable');
  input.maxLength = MAX_MASTER_PASSWORD_LENGTH;
  const password = input.value;
  const validation = validatePassword(password);
  if (validation) return failButton(button, validation);
  if (!latestSettings) return failButton(button, 'SafeLedger security settings are still loading');

  button.disabled = true;
  status.loadStatus();

  try {
    const hasEnvelope = await ipc.invoke('crypto-v3-has-envelope');
    if (!hasEnvelope) {
      const initialized = await ipc.invoke('crypto-v3-initialize', password);
      input.value = '';
      if (!initialized || !initialized.ok) {
        return failButton(button, (initialized && initialized.message) || 'Unable to initialize SafeLedger encryption');
      }
      sendUnlockedDataKey(initialized.dataKeyHex);
      return;
    }

    const unlocked = await ipc.invoke('crypto-v3-login', password);
    input.value = '';
    if (unlocked && unlocked.ok) {
      sendUnlockedDataKey(unlocked.dataKeyHex);
      return;
    }

    if (unlocked && unlocked.type === 'password-failed') {
      ipc.send('read-vaultlist-init', {
        cryptoKey: crypto.randomBytes(32),
        settings: latestSettings
      });
      return;
    }

    return failButton(button, (unlocked && unlocked.message) || 'Unable to unlock SafeLedger key envelope');
  } catch (err) {
    input.value = '';
    failButton(button, err && err.message ? err.message : String(err));
  }
}

async function handlePasswordChange(button) {
  const oldInput = document.getElementById('inputOldPassword');
  const newInput = document.getElementById('inputNewPassword');
  const confirmInput = document.getElementById('inputConfirmNewPassword');
  if (!oldInput || !newInput || !confirmInput) return failButton(button, 'Password fields are unavailable');

  oldInput.maxLength = MAX_MASTER_PASSWORD_LENGTH;
  newInput.maxLength = MAX_MASTER_PASSWORD_LENGTH;
  confirmInput.maxLength = MAX_MASTER_PASSWORD_LENGTH;

  const oldPassword = oldInput.value;
  const newPassword = newInput.value;
  const validation = validatePassword(newPassword);
  if (validation) return failButton(button, validation);
  if (oldPassword === newPassword) return failButton(button, 'Old password cannot match new password');
  if (newPassword !== confirmInput.value) return failButton(button, 'New password and confirmation must match');

  button.disabled = true;
  status.loadStatus();
  try {
    const changed = await ipc.invoke('crypto-v3-change-password', oldPassword, newPassword);
    oldInput.value = '';
    newInput.value = '';
    confirmInput.value = '';
    if (!changed || !changed.ok) {
      return failButton(button, (changed && changed.message) || 'Password change failed');
    }

    ipc.emit('result-rotate-crypto', {}, {
      status: 'SUCCESS',
      statusMsg: changed.statusMsg,
      vaultList: latestVaultList,
      cryptoKey: Buffer.from(changed.dataKeyHex, 'hex')
    });
  } catch (err) {
    oldInput.value = '';
    newInput.value = '';
    confirmInput.value = '';
    failButton(button, err && err.message ? err.message : String(err));
  }
}

document.addEventListener('click', (event) => {
  const target = event.target && event.target.closest ? event.target.closest('button') : null;
  if (!target) return;

  if (target.id === 'loginBtn') {
    event.preventDefault();
    event.stopImmediatePropagation();
    handleLogin(target);
    return;
  }

  if (target.id === 'encryptionEditBtn') {
    event.preventDefault();
    event.stopImmediatePropagation();
    handlePasswordChange(target);
  }
}, true);

ipc.on('result-init-system', (_event, params) => {
  if (params && params.settings) latestSettings = params.settings;
});

ipc.on('result', (_event, params) => {
  if (params && params.settings) latestSettings = params.settings;
  if (params && params.vaultList) latestVaultList = params.vaultList;
});

ipc.on('result-save-settings', (_event, params) => {
  if (params && params.settings) latestSettings = params.settings;
});

ipc.on('result-lockout-destroy', (_event, params) => {
  latestVaultList = null;
  if (params && params.settings) latestSettings = params.settings;
});

exports._test = { validatePassword };
