# SafeLedger 2.6.45 workflow candidate

SafeLedger 2.6.45 carries forward the 2.6.42 runtime feature implementation unchanged and completes the historical regression migration to SafeLedger's normalized preload `invoke(...)` boundary.

## Why this candidate exists

- 2.6.43 corrected the roadmap regression after 2.6.42 exposed a stale direct `ipcRenderer.invoke(...)` assertion.
- 2.6.43 then exposed the same obsolete source-shape assumption in the older 2.5.1 trusted SafeLedgerData folder test.
- A second known occurrence was found proactively in the 2.5.3 Self-Destruct settings test.
- While preparing 2.6.44, an incomplete regression file was accidentally pushed. Per SafeLedger's patch-candidate rule, 2.6.44 was not rewritten in place; 2.6.45 corrects that preparation error.

## Regression correction

Historical tests now verify that the same trusted IPC channels are exposed through the normalized preload wrapper rather than requiring direct `ipcRenderer.invoke(...)` source text:

- `device-open-data-folder`
- `set-self-destruct-protection`

The 2.6.43 and 2.6.44 correction gates remain active on later patch candidates.

## Runtime carried forward unchanged

- Dark-mode QR presentation is softened while preserving scan contrast and encoded QR data.
- Locked remote-call errors surface only `SafeLedger is locked. Please log in again.`
- Home restores the canonical Login screen while locked.
- Activity History, Settings, and Global Search are prevented from invoking protected reads while locked.
- Chain Games is preselected in Standard new-Profile setup and uses the existing local artwork plus reviewed CHAIN entries for Ethereum, Polygon, and Chain Games Supernet.

## Security / compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, SafeLedger 1.x read-only import, backup/restore format, Self-Destruct behavior, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network policy changes.

## Workflow rule

This is a **2.6.x workflow/test candidate**. **Do not merge it to `master`.**
