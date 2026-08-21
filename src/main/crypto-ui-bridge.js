'use strict';

const electron = require('electron');
const remote = electron.remote;
const { ipcRenderer: ipc } = electron;
const crypto = require('crypto');
const status = require('./status');
const runtimeUtils = require('./runtime-utils');
const keyEnvelope = require('./key-envelope');

const MAX_MASTER_PASSWORD_LENGTH = runtimeUtils.MAX_MASTER_PASSWORD_LENGTH;
// Load the main-process crypto session module once; it registers narrow IPC handlers.
remote.require('./crypto-session-main');
let latestSettings = null;
let latestVaultList = null;
let pendingLegacyPassword = null;
let migrationRunning = false;

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
    if (await ipc.invoke('crypto-v3-has-envelope')) {
      const unlocked = await ipc.invoke('crypto-v3-login', password);
      input.value = '';
      if (unlocked && unlocked.ok) {
        ipc.send('read-vaultlist-init', {
          cryptoKey: Buffer.from(unlocked.dataKeyHex, 'hex'),
          settings: latestSettings
        });
        return;
      }

      if (unlocked && unlocked.type === 'password-failed') {
        // Let the existing main-process brute-force policy own counters,
        // lockouts, and optional self-destruct. A random candidate key is used
        // only after Argon2 has already proved this password is incorrect.
        ipc.send('read-vaultlist-init', {
          cryptoKey: crypto.randomBytes(32),
          settings: latestSettings
        });
        return;
      }

      return failButton(button, (unlocked && unlocked.message) || 'Unable to unlock SafeLedger key envelope');
    }

    // Legacy SafeLedger data uses the historical HMAC-derived vault key for
    // this one login. The successful result triggers a transactional migration
    // to Argon2id + a random data-encryption key.
    pendingLegacyPassword = password;
    input.value = '';
    ipc.send('read-vaultlist-init', {
      cryptoKey: keyEnvelope.deriveLegacyKey(password),
      settings: latestSettings
    });
  } catch (err) {
    pendingLegacyPassword = null;
    input.value = '';
    failButton(button, err && err.message ? err.message : String(err));
  }
}

async function migrateAfterLegacyLogin(params) {
  if (!pendingLegacyPassword || migrationRunning) return;
  const password = pendingLegacyPassword;
  pendingLegacyPassword = null;
  migrationRunning = true;
  try {
    const migrated = await ipc.invoke('crypto-v3-migrate-legacy', password);
    if (!migrated || !migrated.ok) {
      status.showStatus({
        status: 'ERROR',
        statusMsg: `SafeLedger opened, but the encryption upgrade could not finish: ${(migrated && migrated.message) || 'unknown migration error'}`
      });
      return;
    }

    const migratedVaultList = migrated.vaultList || params.vaultList;
    latestVaultList = migratedVaultList;
    ipc.emit('result', {}, {
      status: 'SUCCESS',
      statusMsg: migrated.pendingCleanup
        ? 'SafeLedger encryption upgraded to Argon2id. Legacy-file cleanup will finish on the next login.'
        : 'SafeLedger encryption upgraded to Argon2id and AES-256-GCM.',
      type: 'vaultlist-init',
      vaultList: migratedVaultList,
      cryptoKey: Buffer.from(migrated.dataKeyHex, 'hex'),
      settings: params.settings || latestSettings
    });
  } catch (err) {
    status.showStatus({
      status: 'ERROR',
      statusMsg: `SafeLedger opened, but the encryption upgrade could not finish: ${err && err.message ? err.message : err}`
    });
  } finally {
    migrationRunning = false;
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
  if (params && params.status === 'SUCCESS' && params.type === 'vaultlist-init') {
    migrateAfterLegacyLogin(params);
  } else if (pendingLegacyPassword && params && params.status === 'ERROR') {
    pendingLegacyPassword = null;
  }
});

ipc.on('result-save-settings', (_event, params) => {
  if (params && params.settings) latestSettings = params.settings;
});

ipc.on('result-lockout-destroy', (_event, params) => {
  pendingLegacyPassword = null;
  latestVaultList = null;
  if (params && params.settings) latestSettings = params.settings;
});

exports._test = { validatePassword };
