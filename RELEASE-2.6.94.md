# SafeLedger 2.6.94

## Code Cleanup Phase 3 — Renderer command and state architecture

This release completes the third cleanup phase identified in the repository-wide code review. The goal is to remove renderer-side compatibility layers and shadow state without changing SafeLedger's user-facing data model or security guarantees.

## What changed

- Added `renderer-state.js` as the single owner of transient renderer session/workspace state: settings, Profile list, loaded Profile data, unlocked state, and save-in-progress state.
- Added `renderer-services.js` as the semantic renderer-facing service facade over the narrow preload API.
- Removed the retired `renderer-bridge.js` pseudo-`ipcRenderer` compatibility layer.
- Removed `settings-shortcut-ui.js`; Settings navigation is now renderer-owned instead of making an unnecessary renderer → main → renderer round trip.
- The Login form directly owns its submit handler and calls the crypto controller.
- Change Password directly owns its submit callback. The document-wide capture click listener and `stopImmediatePropagation()` interception are gone.
- `crypto-ui-bridge.js` no longer keeps duplicate `latestSettings` or `latestVaultList` caches; it consumes the canonical renderer state.
- Profile, Vault Item, Asset, Settings, backup/recovery, device-security, clipboard, and crypto UI code now uses semantic service methods rather than transport channel strings where migrated.
- The preload boundary wraps the existing shared `result` protocol in Promise-returning requests and serializes shared-result workspace commands so concurrent renderer actions cannot consume one another's response.
- Renderer startup now loads the workspace coordinator directly rather than separately loading multiple helper modules that patched the page after render.

## Why the old bridge existed

SafeLedger originally used Electron's renderer-side `ipcRenderer` API directly. During the sandbox migration, `renderer-bridge.js` was introduced as a compatibility adapter so existing UI modules could keep using `send`, `invoke`, `on`, and local `emit` semantics while the privileged Electron API moved behind `contextBridge`.

That was a useful migration step, but leaving it permanently would preserve the old transport architecture inside the renderer and make ownership harder to reason about. Phase 3 removes that compatibility layer and gives UI modules application-level operations instead of IPC vocabulary.

## Request/response compatibility

The trusted main process still has several established event-style write handlers. Rewriting every handler and every historical contract to `ipcMain.handle()` in the same release would combine two large migrations.

For this phase, the preload API hides that legacy transport behind Promise-returning semantic methods. Because multiple workspace operations use the same historical `result` channel, those operations are serialized at the preload boundary. This is an explicit compatibility boundary, not a renderer-wide pseudo-IPC layer. A later transport cleanup can convert the main handlers behind the same semantic API without changing feature modules again.

## Regression coverage

A durable `Renderer architecture` canonical suite protects:

- one transient renderer state owner;
- the semantic service facade;
- no return of `renderer-bridge.js`;
- no Settings IPC round trip helper;
- direct Login and Change Password handlers;
- no document-wide crypto click interception;
- no duplicate crypto settings/Profile caches;
- serialized shared-result requests at the preload boundary;
- no Electron capability added to renderer services.

Existing runtime-hardening, UI-consolidation, device-security, lockout, cleanup, and UI regression suites were updated to validate the current architecture instead of the retired compatibility implementation.

## Production and security scope

This is an architecture cleanup. SafeLedger continues to use the same AES-256-GCM vault encryption, Argon2id key derivation, main-process-only active data key, sandboxed renderer, context-isolated preload API, offline/network restrictions, portable storage model, encrypted persistence, recovery behavior, backup/restore behavior, lockout protections, and optional Self-Destruct behavior.

## Release safety

Do not merge this candidate to `master` until Windows, Linux, and macOS CI pass and hands-on testing confirms login, Profile/Vault Item/Asset create-edit-delete, Settings, Change Password, Emergency Lock, backup/restore, and normal navigation remain correct.
