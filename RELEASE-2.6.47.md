# SafeLedger 2.6.47 workflow/test candidate

SafeLedger 2.6.47 carries forward the 2.6.42 runtime feature implementation unchanged and corrects the historical 2.6.7 app-menu preload regression exposed by CI.

## Regression correction

The historical 2.6.7 test still required `prepareAppMenu` to call `ipcRenderer.invoke(...)` directly. SafeLedger now intentionally routes renderer-facing promise calls through the normalized preload `invoke(...)` helper so Electron wrapper prefixes can be cleaned up consistently.

The updated gate now requires:

- `prepareAppMenu` to use the normalized `invoke('app-menu-prepare')` path.
- `appMenuCommand` to remain a fire-and-forget `ipcRenderer.send(...)` operation.
- The previous 2.6.46 Chain Games starter correction to remain active.

## Runtime carried forward unchanged

- Dark-mode QR presentation is softened while preserving scan contrast and encoded data.
- Locked remote-call errors surface only: `SafeLedger is locked. Please log in again.`
- While locked, Home restores the canonical Login screen; Activity History, Settings, and Global Search do not invoke protected reads.
- Chain Games is preselected in Standard new-Profile setup and uses SafeLedger-owned local service artwork with reviewed CHAIN entries for Ethereum, Polygon, and Chain Games Supernet.

## Security / compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, SafeLedger 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network policy changes.

## Workflow rule

This is a **2.6.x workflow/test candidate**. **DO NOT MERGE TO `master`.** Keep this candidate unmerged for CI and hands-on validation.
