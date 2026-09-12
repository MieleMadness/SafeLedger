# SafeLedger 2.6.37 workflow correction

SafeLedger 2.6.37 carries forward the exact 2.6.36 application behavior. It exists because the 2.6.36 workflow exposed one stale historical regression assertion.

## What 2.6.36 changed

- Vault search wording changed from `Search vault items...` to `Search vaults...`.
- Vault Item and Asset detail underlines now match the title text width instead of using a full-width divider.

## Why 2.6.37 exists

The historical `development-2.5.12-tests.js` gate still required the old exact placeholder string `Search vault items...`. That test was originally intended to protect the presence of Vault search, not freeze the wording forever.

2.6.37 updates that historical test to:

- require the `groupSearch` control to remain present,
- require the current `Search vaults...` wording,
- reject the retired verbose placeholder.

No runtime application files changed between 2.6.36 and 2.6.37.

## Security / compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Workflow rule

This is a **2.6.x workflow/test candidate**. Do **not** merge it to `master`. Validate Windows Portable, Linux AppImage, native Apple Silicon, full regression, Electron crypto smoke, real GUI smoke, and hands-on behavior.
