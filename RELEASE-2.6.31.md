# SafeLedger 2.6.31

SafeLedger 2.6.31 is a workflow/test candidate only. Do not merge this 2.6.x patch to `master`.

## What changed

2.6.30 successfully fixed the false-positive `MutationObserver` check and the full suite progressed beyond the 2.6.26 compact-navigation gate. CI then stopped in the 2.6.29 meta-test because that test inspected the source text of older 2.6.20/2.6.21 tests and required a specific literal assertion style.

The older tests were already validating the correct behavior, but through loops and current CSS-variable checks. 2.6.31 removes that brittle meta-source requirement and keeps the important behavior protected directly.

- 2.6.29 now verifies the older sizing/layout gates remain locked in the regression suite.
- It continues rejecting the retired hard-coded grid declaration.
- It validates the actual current foundation behavior: equal 2fr Profile/Vault/Asset columns, 5fr Detail, 56px compact rails, and variable-driven grid sizing.
- The 2.6.30 observer-gate correction remains active on later candidates.
- No runtime application files changed between 2.6.30 and 2.6.31.

## Carried-forward UI behavior

- Profiles, Vault Items, and Assets independently collapse to 56px icon rails and start expanded on launch.
- Expanded navigation proportions remain 2fr / 2fr / 2fr with Detail at 5fr.
- The recovery-drill button uses a bundled icon rather than an unsupported glyph.
- Blank preset `Login method` rows are no longer auto-created.
- Blank preset Web3 `Connected wallet(s)` rows are no longer auto-created.
- Existing populated legacy values remain preserved.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Validation target

Run the full Windows Portable, Linux AppImage, and native Apple Silicon workflows including regression, Electron crypto smoke, real GUI smoke, and packaging before hands-on approval.
