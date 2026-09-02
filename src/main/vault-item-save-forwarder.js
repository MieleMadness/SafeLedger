'use strict';

function createSeededSend(originalSend, seedFn, logError = console.error) {
  if (typeof originalSend !== 'function') throw new TypeError('SafeLedger save forwarder requires an IPC send function.');
  if (typeof seedFn !== 'function') throw new TypeError('SafeLedger save forwarder requires a preset seeding function.');

  return function sendWithOptionalPresetSeed(channel, ...args) {
    if (channel === 'process-group') {
      try {
        seedFn(args[0]);
      } catch (err) {
        // Preset enrichment is optional. It must never prevent the encrypted
        // Vault Item save request from reaching the trusted main process.
        try {
          logError('SafeLedger preset asset seeding skipped:', err && err.message ? err.message : err);
        } catch (_) {
          // Logging is diagnostic only and must not become another save blocker.
        }
      }
    }
    return originalSend(channel, ...args);
  };
}

module.exports = { createSeededSend };
