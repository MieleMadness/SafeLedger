'use strict';

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('safeLedgerRuntime', Object.freeze({
  isolatedRenderer: true
}));

// SafeLedger's trusted CommonJS UI still uses local Node helpers for encrypted
// backup/audit work. Run those modules in this isolated preload world so the
// HTML page itself receives no Node.js or Electron require() capability.
require('./renderer.js');
require('./lockout-ui-enhancements.js');
require('./security-enhancements.js');
require('./crypto-ui-bridge.js');
require('./login-retry-guard.js');
require('./settings-enhancements.js');
require('./search-enhancements.js');
require('./detail-action-enhancements.js');
