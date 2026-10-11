'use strict';

const lockoutState = require('./lockout-state');
const { createWorkspaceOperationQueue } = require('./workspace-operation-queue');

// All renderer login requests enter through this trusted, serialized boundary.
// The caller cannot verify a password and then omit a separate "count failure"
// request. Even simultaneous IPC attempts are counted one at a time.
function createLoginAttemptHandler(options = {}) {
  const { loadSettings, verifyPassword, recordFailure, onExhaustion, clearSession } = options;
  const now = typeof options.now === 'function' ? options.now : Date.now;
  for (const [name, fn] of Object.entries({ loadSettings, verifyPassword, recordFailure, onExhaustion, clearSession })) {
    if (typeof fn !== 'function') throw new Error(`SafeLedger login requires trusted ${name}().`);
  }

  const serializeAttempt = createWorkspaceOperationQueue();
  const deny = (type, message, settings) => ({
    ok: false,
    type,
    status: 'ERROR',
    statusMsg: message,
    message,
    ...(settings ? { settings } : {})
  });

  async function authenticate(password) {
    try {
      // A fresh normalized settings read prevents stale renderer state from
      // deciding whether a lockout expired or Self-Destruct is due.
      const settings = await loadSettings();
      if (!settings || typeof settings !== 'object') {
        throw new Error('Authentication protection settings are unavailable.');
      }

      if (settings.lockOutCount >= settings.numLockoutRetries) {
        clearSession();
        await onExhaustion();
        return deny('locked-out', 'SafeLedger login protection limit reached.', await loadSettings());
      }

      if (lockoutState.isLockoutActive(settings, now())) {
        clearSession();
        return deny('locked-out', 'Login temporarily locked. Please retry when the lockout expires.', settings);
      }

      // Invalid persisted lock metadata must not silently allow verification.
      if (settings.lockLogin === true && !lockoutState.lockoutDeadline(settings)) {
        throw new Error('SafeLedger lockout state is invalid.');
      }

      const result = await verifyPassword(password);
      if (result && result.type === 'password-failed') {
        clearSession();
        // A completed login failure is not returned until the trusted
        // persisted counter/lockout transition has been confirmed.
        const recorded = await recordFailure();
        if (!recorded || !recorded.settings) {
          throw new Error('Failed-login state was not persisted.');
        }
        return deny('password-failed', 'Invalid Password', recorded.settings);
      }
      if (!result || typeof result.ok !== 'boolean') {
        throw new Error('Password verification returned an invalid result.');
      }
      return result;
    } catch (_) {
      // No working login session may survive a failure to read or persist
      // retry/security state, regardless of the renderer's response handling.
      clearSession();
      return deny('security-state-error', 'Unable to verify login protection state. Restart SafeLedger and check portable storage.');
    }
  }

  return function handleLoginAttempt(password) {
    return serializeAttempt(() => authenticate(password));
  };
}

module.exports = { createLoginAttemptHandler };
