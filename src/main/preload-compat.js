'use strict';

// Transitional bridge for the SafeLedger 1.x renderer. The legacy UI expects
// Electron's removed `remote` property. Keep this isolated in one file so it
// can be deleted when renderer IPC is migrated to contextBridge.
const electron = require('electron');
const remote = require('@electron/remote');

if (!electron.remote) {
  Object.defineProperty(electron, 'remote', {
    value: remote,
    configurable: false,
    enumerable: true,
    writable: false
  });
}

// SafeLedger 1.x intentionally scrubbed sensitive in-memory values when the
// renderer closed. The security goal is still useful, but the old handler also
// called event.preventDefault(), which can cancel shutdown on modern Electron.
// That left the window open *after* its live wallet data had been randomized.
//
// Preserve the original scrub routine while neutralizing only the two shutdown
// side effects that are unsafe on current Electron:
//   1. preventDefault() must not cancel application shutdown.
//   2. the legacy blocking alert must not interrupt shutdown.
//
// The encrypted files on disk are not modified by this close-time scrub. The
// separate Self-Destruct Protection feature remains responsible for intentional
// destruction of encrypted vault files after configured failed-login limits.
const originalAddEventListener = window.addEventListener.bind(window);
const originalAlert = window.alert.bind(window);

window.addEventListener = function safeLedgerAddEventListener(type, listener, options) {
  if (type !== 'beforeunload' || typeof listener !== 'function') {
    return originalAddEventListener(type, listener, options);
  }

  const wrappedListener = function safeLedgerBeforeUnload(event) {
    const safeEvent = new Proxy(event, {
      get(target, property) {
        if (property === 'preventDefault') {
          // Let the legacy scrub execute, but never cancel window shutdown.
          return () => {};
        }
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });

    // The old scrub displayed a modal alert after clearing memory. Suppress it
    // only while this shutdown handler executes so closing cannot hang.
    window.alert = () => {};
    try {
      return listener.call(this, safeEvent);
    } finally {
      window.alert = originalAlert;
    }
  };

  return originalAddEventListener(type, wrappedListener, options);
};
