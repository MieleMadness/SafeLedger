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

// The legacy renderer registers a beforeunload handler that both scrubs its
// in-memory copies of vault data and calls preventDefault(). In modern Electron
// that can leave the window open after the renderer has already randomized its
// own state, making wallets appear corrupted or stop rendering. Intercept the
// event before the legacy handler runs and allow the process to close normally.
// Process teardown clears the renderer's memory without mutating its live state.
window.addEventListener('beforeunload', (event) => {
  event.stopImmediatePropagation();
}, true);
