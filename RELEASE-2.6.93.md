# SafeLedger 2.6.93

## Code Cleanup Phase 2 — Main-process ownership

SafeLedger 2.6.93 removes a temporary main-process compatibility layer and makes `bootstrap.js` the single application composition root.

## What changed

- `bootstrap.js` now explicitly owns Electron application lifecycle and main-window startup.
- `main.js` no longer starts the app merely by being required.
- `main.js` now exposes explicit `registerCoreIpcHandlers()`, `createWindow()`, `getMainWindow()`, data-root helpers, and session cleanup operations.
- Core IPC registration is idempotent.
- The older `main.js` Emergency Lock listener is removed.
- `bootstrap.js` no longer uses `ipc.removeAllListeners('panic-lock')` to overwrite that older listener.
- Emergency Lock now has exactly one IPC owner and delegates directly to the centralized `session-lock-main.js` controller.
- Application shutdown cleanup for the crypto session, sensitive duplicate fingerprints, and device-security service is owned in one lifecycle path.

## Why

The earlier listener replacement was introduced while SafeLedger was migrating from the original `main.js` startup architecture to centralized session/device security. Removing the old listener at that time would have combined a large startup refactor with a security change, so bootstrap temporarily replaced it at runtime.

That compatibility step had served its purpose. Keeping it permanently would leave two apparent Emergency Lock implementations and make `removeAllListeners()` capable of silently deleting future legitimate listeners.

2.6.93 completes that migration instead of preserving the bandaid.

## Security invariants preserved

The centralized lock controller still destroys the in-memory DEK before session-only cleanup, audit/UI work, minimize, or reload actions.

This release does not intentionally change:

- AES-256-GCM encryption;
- Argon2id key-envelope behavior;
- main-process-only DEK ownership;
- login retry/lockout behavior;
- optional Self-Destruct Protection;
- backup/restore behavior;
- profile/Vault Item/Asset persistence;
- SafeLedger 2.x compatibility;
- SafeLedger 1.x read-only import;
- portable storage paths;
- renderer sandboxing;
- offline/network policy;
- visible application behavior.

## Regression coverage

The canonical test suite now includes a permanent `Main process ownership` contract. Existing runtime-hardening and device-security tests were updated to validate the current architecture rather than the retired listener-replacement implementation.

The contract prevents the following from returning:

- `main.js` application lifecycle side effects;
- a second `panic-lock` owner;
- `removeAllListeners('panic-lock')` startup replacement;
- implicit core IPC registration when `main.js` is required;
- normal runtime initialization during blocked portable startup.

## Release safety

This is a cumulative candidate based on the fully green 2.6.92 head.

**Do not merge to `master` until Windows, Linux, and macOS CI pass and hands-on testing confirms login, Emergency Lock, close/reopen behavior, and normal encrypted-data workflows remain unchanged.**
