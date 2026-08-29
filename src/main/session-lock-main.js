'use strict';

const REASON_EVENTS = Object.freeze({
  'emergency-lock': 'session-locked-manual',
  'panic-lock': 'session-locked-manual',
  'inactivity-auto-lock': 'session-locked-idle-state',
  'screen-lock': 'session-locked-screen',
  suspend: 'session-locked-suspend',
  resume: 'session-locked-resume',
  'storage-unavailable': 'session-locked-storage-unavailable',
  'storage-identity-mismatch': 'session-locked-storage-unavailable',
  'idle-state': 'session-locked-idle-state',
  'post-restore-lock': 'session-locked-data-change',
  'post-legacy-import-lock': 'session-locked-data-change'
});

function normalizeReason(reason) {
  return REASON_EVENTS[String(reason || '').trim()] || 'session-locked-manual';
}

function createSessionLockController(options = {}) {
  const cryptoSession = options.cryptoSession;
  const getMainWindow = options.getMainWindow;
  const audit = options.audit;
  const getDataRoot = options.getDataRoot;
  const onLock = options.onLock;

  if (!cryptoSession || typeof cryptoSession.clearSession !== 'function') {
    throw new Error('SafeLedger session lock controller requires cryptoSession.clearSession().');
  }

  function isUnlocked() {
    try {
      return typeof cryptoSession.isUnlocked === 'function' ? cryptoSession.isUnlocked() === true : !!cryptoSession.getSessionKey();
    } catch (_) {
      return false;
    }
  }

  function safeWindow() {
    try {
      const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
      if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) return null;
      return win;
    } catch (_) {
      return null;
    }
  }

  function recordAudit(eventName) {
    if (typeof audit !== 'function' || typeof getDataRoot !== 'function') return;
    try {
      Promise.resolve(audit(getDataRoot(), eventName)).catch(() => {});
    } catch (_) {}
  }

  function clearSessionOnlyState() {
    if (typeof onLock !== 'function') return;
    try { onLock(); } catch (_) {}
  }

  function lockSession(reason, lockOptions = {}) {
    const eventName = normalizeReason(reason);
    const wasUnlocked = isUnlocked();

    // Security invariant: destroy the in-memory DEK before any UI, audit, I/O,
    // minimize, reload, or other session-local cleanup operation. No later
    // failure is allowed to keep the previous session key alive.
    cryptoSession.clearSession();
    clearSessionOnlyState();

    // Repeated lock calls are intentionally harmless and do not produce a
    // second audit transition after the session is already locked.
    if (wasUnlocked) recordAudit(eventName);

    const shouldTouchUi = wasUnlocked || lockOptions.forceUi === true;
    const win = shouldTouchUi ? safeWindow() : null;
    if (win) {
      try {
        if (win.webContents && typeof win.webContents.send === 'function') {
          win.webContents.send('security-session-locked', {
            reason: eventName,
            requiresRestart: lockOptions.reload === false
          });
        }
      } catch (_) {}

      if (lockOptions.minimize === true) {
        try { if (typeof win.minimize === 'function') win.minimize(); } catch (_) {}
      }

      if (lockOptions.reload !== false) {
        try {
          if (win.webContents && typeof win.webContents.reload === 'function') win.webContents.reload();
        } catch (_) {}
      }
    }

    return { locked: true, wasUnlocked, reason: eventName };
  }

  return { lockSession, isUnlocked };
}

exports.createSessionLockController = createSessionLockController;
exports.normalizeReason = normalizeReason;
exports.REASON_EVENTS = REASON_EVENTS;
