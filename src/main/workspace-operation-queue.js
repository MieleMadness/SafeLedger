'use strict';

// The trusted main process (not the renderer) owns the workspace ordering.
// Rejections cannot poison the queue and each caller receives its own reply.
function createWorkspaceOperationQueue() {
  let pending = Promise.resolve();
  return function runWorkspaceOperation(operation) {
    if (typeof operation !== 'function') {
      return Promise.reject(new Error('SafeLedger workspace operation must be a function.'));
    }
    const result = pending.then(operation, operation);
    pending = result.then(() => undefined, () => undefined);
    return result;
  };
}

// Shared trusted storage queue: both normal workspace writes and security
// backup/restore/import actions participate in the same ordering.
const runStorageOperation = createWorkspaceOperationQueue();

module.exports = { createWorkspaceOperationQueue, runStorageOperation };
