# SafeLedger 2.6.28 workflow candidate

SafeLedger 2.6.28 carries forward the requested 2.6.26 application behavior unchanged and modernizes the remaining stale canonical Vault Item rendering expectation found by CI in 2.6.27.

## Carried-forward application behavior
- Recovery Readiness uses a bundled refresh/retest icon for `Run recovery drill` instead of the unsupported rectangle glyph.
- Exchange, Web3, and Website Vault Items no longer auto-create blank `Login method` rows.
- Web3 Vault Items no longer auto-create a blank `Connected wallet(s)` row.
- Existing populated legacy values remain preserved; only blank retired preset rows are removed while editing.
- Profiles, Vault Items, and Assets can independently collapse into 56px icon rails.
- All three columns start expanded on launch for discoverability.
- Collapsing a column clears any hidden active search and expands the Detail workspace into the freed width.
- Compact navigation retains real item icons, selection state, accessible names, and bottom add actions.

## 2.6.28 regression correction
- `vault-item-rendering-consolidation-tests.js` no longer requires `Connected wallet(s)` to be auto-created.
- The canonical renderer test now protects the simplified form contract while retaining Web3 recovery-code support, grouped presets, direct rendering ownership, and the observer-free architecture.
- The historical 2.6.6 correction from 2.6.27 remains active.
- No runtime application files changed between 2.6.27 and 2.6.28.

## Security and compatibility
This candidate does not change the encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or offline runtime network behavior.

## Workflow rule
This is a 2.6.x workflow/test candidate only. Do not merge it to `master`. Promotion to `master` remains reserved for an intentional move to a new 2.x release number.
