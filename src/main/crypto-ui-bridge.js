'use strict';

const services = require('./renderer-services');
const rendererState = require('./renderer-state');
const status = require('./status');
const passwordPolicy = require('./password-policy');

const MAX_MASTER_PASSWORD_LENGTH = passwordPolicy.MAX_MASTER_PASSWORD_LENGTH;
let onCommandResult = null;
let onPasswordChanged = null;

function configure(options = {}) {
  onCommandResult = typeof options.onCommandResult === 'function' ? options.onCommandResult : null;
  onPasswordChanged = typeof options.onPasswordChanged === 'function' ? options.onPasswordChanged : null;
}

function failButton(button, message) {
  if (button) button.disabled = false;
  status.showStatus({ status: 'ERROR', statusMsg: message });
}

function loginRetryAllowed(result, now = Date.now()) {
  const settings = result && result.settings;
  if (!settings) return false;
  if (settings.lockLogin !== true) return true;
  const deadline = Number(settings.lockLoginTime || 0)
    + (Number(settings.minutesToWaitBetweenLockout || 0) * 60000);
  return deadline <= Number(now);
}

function restoreLoginRetry(button, input, result, now = Date.now()) {
  if (!loginRetryAllowed(result, now)) return false;
  if (button) button.disabled = false;
  if (input && typeof input.focus === 'function') input.focus();
  return true;
}

function loadUnlockedVaultList() {
  return services.deliver(services.loadVaultList(), onCommandResult, 'Unable to load SafeLedger Profiles.');
}

async function handleLogin(button) {
  const input = document.getElementById('masterCryptoInput');
  if (!input) return failButton(button, 'Password field is unavailable');
  input.maxLength = MAX_MASTER_PASSWORD_LENGTH;
  const password = input.value;
  if (!rendererState.getSettings()) return failButton(button, 'SafeLedger security settings are still loading');

  try {
    const hasEnvelope = await services.cryptoHasEnvelope();
    const validation = hasEnvelope
      ? passwordPolicy.validateExistingPassword(password)
      : passwordPolicy.validatePassword(password);
    if (validation) return failButton(button, validation);

    button.disabled = true;
    status.loadStatus();
    if (!hasEnvelope) {
      const initialized = await services.cryptoInitialize(password);
      input.value = '';
      if (!initialized || !initialized.ok) return failButton(button, (initialized && initialized.message) || 'Unable to initialize SafeLedger encryption');
      return loadUnlockedVaultList();
    }

    const unlocked = await services.cryptoLogin(password);
    input.value = '';
    if (unlocked && unlocked.ok) return loadUnlockedVaultList();
    if (unlocked && unlocked.type === 'password-failed') {
      const failure = await services.deliver(
        services.recordPasswordFailure(),
        onCommandResult,
        'Unable to update login security state.'
      );
      // A failed password attempt is not itself a UI lockout. Restore the
      // submit control only after the main process confirms the updated retry
      // state. If the configured lockout threshold was reached (or the retry
      // state could not be persisted), remain fail-closed.
      restoreLoginRetry(button, input, failure);
      return failure;
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
  const oldPassword = oldInput.value;
  const newPassword = newInput.value;
  if (newPassword && !oldPassword) return failButton(button, 'Old Password Must Be Specified');
  const validation = passwordPolicy.validatePassword(newPassword);
  if (validation) return failButton(button, validation);
  if (oldPassword === newPassword) return failButton(button, 'Old password cannot match new password');
  if (newPassword !== confirmInput.value) return failButton(button, 'New password and confirmation must match');
  button.disabled = true;
  status.loadStatus();
  try {
    const changed = await services.cryptoChangePassword(oldPassword, newPassword);
    oldInput.value = '';
    newInput.value = '';
    confirmInput.value = '';
    if (!changed || !changed.ok) return failButton(button, (changed && changed.message) || 'Password change failed');
    button.disabled = false;
    rendererState.setUnlocked(true);
    status.showStatus({ status: 'SUCCESS', statusMsg: changed.statusMsg || 'Password changed successfully.' });
    if (onPasswordChanged) onPasswordChanged(changed);
  } catch (err) {
    oldInput.value = '';
    newInput.value = '';
    confirmInput.value = '';
    failButton(button, err && err.message ? err.message : String(err));
  }
}

module.exports = {
  configure,
  handleLogin,
  handlePasswordChange,
  _test: {
    validateExistingPassword: passwordPolicy.validateExistingPassword,
    validatePassword: passwordPolicy.validatePassword,
    loginRetryAllowed,
    restoreLoginRetry
  }
};
