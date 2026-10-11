# SafeLedger Code Cleanup — Phase 2

SafeLedger 2.6.93 performs the second cleanup phase: **main-process ownership and Emergency Lock consolidation**.

Phase 1 made current behavior—not patch history—the active test contract. Phase 2 uses that cleaner test architecture to remove one of the clearest runtime bandaids found during the repository review.

## Problem: two main-process owners

SafeLedger had gradually developed two application startup layers:

- `bootstrap.js` became the real Electron entry point for portable-storage safety, device security, centralized locking, and recovery intelligence.
- `main.js` still behaved like an older standalone entry point. Merely requiring it registered IPC handlers, registered Electron lifecycle hooks, and created the main window when Electron became ready.

That meant startup behavior was split between two files even though `package.json` already identified `bootstrap.js` as the application entry point.

This was functional, but ownership was unclear. Future changes could accidentally register the same lifecycle or IPC behavior twice because `main.js` looked like an entry point while `bootstrap.js` was already the real entry point.

## Problem: Emergency Lock listener replacement

The clearest bandaid was Emergency Lock.

`main.js` still registered an older `panic-lock` listener that directly cleared the crypto session, audited the event, minimized the window, and reloaded the renderer.

Later security work introduced `session-lock-main.js`, a better centralized lock controller that also handles:

- manual Emergency Lock;
- screen lock;
- suspend/resume;
- idle lock;
- storage removal or identity mismatch;
- post-restore and post-import lock transitions;
- session-only sensitive fingerprint cleanup.

Instead of removing the old `main.js` listener when the centralized controller was introduced, `bootstrap.js` used:

`ipc.removeAllListeners('panic-lock')`

and then registered the newer listener.

### Why that bandaid existed

At the time, replacing the listener in bootstrap was a low-risk way to introduce centralized lock behavior without refactoring the large, established `main.js` startup path at the same time. It preserved compatibility while SafeLedger was being actively modernized.

That was reasonable as a temporary migration technique, but it should not remain the permanent architecture. `removeAllListeners()` is broad: a future legitimate listener on the same channel could be removed silently, and developers reading the code would still see two apparently valid Emergency Lock implementations.

## Phase 2 fix

### `bootstrap.js` is now the sole composition root

`bootstrap.js` explicitly owns:

- allowed vs blocked portable startup;
- preferred window sizing registration;
- application window creation timing;
- Electron `window-all-closed`, `activate`, and `before-quit` lifecycle handling;
- centralized session locking;
- device security startup/shutdown;
- device/recovery IPC registration;
- explicit startup of the core `main.js` IPC service.

A blocked macOS portable start still does not load the normal application runtime or create `SafeLedgerData`.

### `main.js` is now a service module

Requiring `main.js` no longer starts the application.

It now exports explicit operations including:

- `registerCoreIpcHandlers()`;
- `createWindow()`;
- `getMainWindow()`;
- `getPortableRoot()`;
- `getDataRoot()`;
- `clearSession()`.

Core IPC registration is idempotent, so a second call does not duplicate handlers.

`main.js` no longer owns Electron application lifecycle events.

### Emergency Lock has one owner

The old `main.js` `panic-lock` listener is removed.

`bootstrap.js` registers exactly one Emergency Lock IPC listener, and that listener delegates to `session-lock-main.js`.

There is no `removeAllListeners('panic-lock')` replacement step anymore.

The centralized lock controller remains responsible for the security-critical ordering:

1. destroy the in-memory DEK;
2. clear session-only sensitive state;
3. record the sanitized lock transition;
4. notify/reset the renderer;
5. minimize/reload when required.

## Behavior intentionally preserved

Phase 2 does **not** change:

- AES-256-GCM vault encryption;
- Argon2id key-envelope behavior;
- the main-only DEK boundary;
- login retry and lockout behavior;
- optional Self-Destruct Protection;
- profile, Vault Item, or Asset persistence;
- SafeLedger 2.x data compatibility;
- SafeLedger 1.x read-only import;
- backup/restore behavior;
- storage location rules;
- offline/network policy;
- renderer sandboxing;
- visible application layout or appearance.

The main window retains `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, denied new-window/navigation behavior, and denied renderer permission requests.

## Test changes

A new durable test, `scripts/main-process-ownership-tests.js`, protects the architecture rather than the 2.6.93 patch number.

It verifies that:

- `bootstrap.js` remains the Electron entry point;
- `bootstrap.js` explicitly owns application lifecycle;
- `main.js` has no lifecycle side effects when required;
- core IPC registration is explicit and idempotent;
- Emergency Lock has exactly one IPC owner;
- `removeAllListeners('panic-lock')` does not return;
- the Emergency Lock route delegates to the centralized lock controller;
- blocked portable startup cannot load/register the normal application runtime;
- the centralized controller still destroys the DEK before UI reset work.

The existing runtime-hardening and device-security suites were updated to test the new ownership model directly instead of requiring the retired listener-replacement implementation.

## Engineering rule going forward

When SafeLedger introduces a replacement architecture during a staged migration, temporary compatibility wiring must be documented with an intended removal phase.

Once the replacement has proven stable:

> **Remove the superseded implementation. Do not permanently disable or overwrite SafeLedger-owned code at runtime.**

This keeps future contributors from inheriting multiple apparent owners for the same security behavior.

## Phase 2 completion criteria

Phase 2 is ready for hands-on approval when:

- the canonical regression suite passes with the new main-process ownership contract;
- Windows, Linux, and macOS CI pass;
- Electron crypto and real GUI smoke tests pass;
- Emergency Lock returns to the sign-in state correctly;
- closing/reopening behavior remains normal on each platform;
- blocked portable-storage startup still fails closed;
- no user-visible workflow or encrypted-data behavior changes.

Phase 3 can then address the renderer command/state architecture: pseudo-IPC compatibility, mixed `send`/`invoke` command patterns, and duplicated renderer state ownership.
