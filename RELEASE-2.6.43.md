# SafeLedger 2.6.43 workflow candidate

SafeLedger 2.6.43 carries forward the exact 2.6.42 runtime implementation unchanged and corrects a stale historical regression assertion exposed by CI.

## Why 2.6.43 exists

2.6.42 intentionally routes protected Electron `ipcRenderer.invoke(...)` calls through a small preload `invoke(...)` wrapper so the renderer receives the clean locked-state message:

`SafeLedger is locked. Please log in again.`

The roadmap regression suite still required the old literal direct `ipcRenderer.invoke('dashboard-summary')` source shape. Apple Silicon reached that assertion and stopped before crypto smoke, GUI smoke, or packaging.

2.6.43 updates the historical roadmap gate to verify the actual protected channel contracts through the normalized preload wrapper for:

- Vault Overview / `dashboard-summary`
- Activity History / `activity-history`
- Global Search / `global-search`

The 2.6.42 feature gate is also version-flexed so its QR theme, locked-state utilities, Home-to-Login behavior, and Chain Games starter coverage remain active on later 2.6.x candidates.

## Runtime behavior carried forward unchanged from 2.6.42

- Dark-mode QR presentation is softened while preserving QR scan contrast and encoded data.
- Locked remote-call errors surface only `SafeLedger is locked. Please log in again.`
- Home restores the canonical login screen while SafeLedger is locked.
- Activity History, Settings, and Global Search do not invoke protected actions while locked.
- Chain Games is preselected in Standard new-Profile setup.
- Chain Games uses the existing SafeLedger local artwork and reviewed CHAIN presets for Ethereum, Polygon, and Chain Games Supernet.

## Security / compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, SafeLedger 1.x read-only import, backup/restore format, Self-Destruct behavior, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network policy changes.

## Workflow rule

This is a **2.6.x workflow/test candidate**. **Do not merge it to `master`.**
