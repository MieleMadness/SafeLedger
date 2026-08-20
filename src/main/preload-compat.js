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
