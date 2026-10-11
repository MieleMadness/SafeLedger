# SafeLedger 2.6.29 workflow candidate

SafeLedger 2.6.29 carries forward the requested 2.6.26 runtime/UI behavior unchanged and corrects stale historical layout tests exposed by the 2.6.28 workflow.

## Carried-forward user-facing behavior

- `Run recovery drill` uses a bundled Font Awesome recovery/retest icon rather than an unsupported missing-glyph rectangle.
- Exchange, Web3, and Website Vault Items no longer auto-create a blank `Login method` row.
- Web3 Vault Items no longer auto-create a blank `Connected wallet(s)` row.
- Existing populated legacy values are preserved; only empty retired preset rows are cleaned while editing.
- Profiles, Vault Items, and Assets independently collapse to 56px icon rails.
- All three navigation columns start expanded on launch.
- Expanded navigation remains equal at 2fr / 2fr / 2fr, with Detail at 5fr.
- Collapsing a rail gives its freed width to Detail.

## 2.6.29 regression correction

The 2.6.20 and 2.6.21 historical layout gates still searched for the retired literal declaration:

`grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) minmax(0, 2fr) minmax(0, 5fr)`

The current implementation preserves those same expanded proportions through CSS variables so each navigation column can independently switch to the 56px compact rail. The historical gates now validate the behavior contract instead of the retired implementation string:

- Profile/Vault/Asset expanded variables remain 2fr each.
- Detail remains 5fr.
- Compact rail remains 56px.
- The live grid is driven by those variables.
- Preferred native startup sizing remains 1283x750.
- Existing deletion and historical sizing protections remain active.

No runtime application files changed between 2.6.28 and 2.6.29.

## Security / compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Workflow rule

This is a **2.6.x workflow/test candidate**. Do **not** merge it to `master`. Validate Windows Portable, Linux AppImage, native Apple Silicon, full regression, Electron crypto smoke, real GUI smoke, and hands-on behavior. Promotion to `master` remains reserved for an intentional move to a new 2.x release number.
