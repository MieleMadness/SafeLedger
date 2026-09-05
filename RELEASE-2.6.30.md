# SafeLedger 2.6.30

SafeLedger 2.6.30 is a workflow/test candidate only. Do not merge this 2.6.x patch to `master`.

## What changed

2.6.29 successfully cleared the historical compact-grid sizing assertions, then CI stopped at the historical 2.6.26 compact-navigation gate. The runtime file contained an explanatory comment saying that the implementation works without a `MutationObserver`. The old test rejected any source file containing the text `MutationObserver`, so the comment itself caused a false failure even though no observer was instantiated or called.

2.6.30 corrects that regression test without changing the requested runtime UI behavior:

- The 2.6.26 gate now rejects actual `MutationObserver` construction/calls rather than harmless documentation text.
- The gate explicitly protects the intended `mouseover` and `focusin` event-delegation strategy used to keep compact-rail labels/tooltips current.
- The 2.6.29 layout gate remains active on later candidates.
- No runtime application files changed between 2.6.29 and 2.6.30.

## Carried-forward UI behavior

- Profiles, Vault Items, and Assets independently collapse to 56px icon rails and start expanded on launch.
- Expanded navigation proportions remain 2fr / 2fr / 2fr with Detail at 5fr.
- The recovery-drill button uses a bundled icon rather than an unsupported glyph.
- Blank preset `Login method` rows are no longer auto-created.
- Blank preset `Connected wallet(s)` rows are no longer auto-created for Web3 Vault Items.
- Existing populated legacy values remain preserved.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Validation target

Run the full Windows Portable, Linux AppImage, and native Apple Silicon workflows including regression, Electron crypto smoke, real GUI smoke, and packaging before hands-on approval.
