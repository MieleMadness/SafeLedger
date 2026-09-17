# SafeLedger 2.6.13

SafeLedger 2.6.13 carries forward the 2.6.12 direct Add Profile wallet-template artwork cleanup and corrects a historical regression gate that still depended on the retired observer helper.

## Carried-forward Profile renderer cleanup

- `profile.js` directly renders local wallet artwork while each Add Profile template row is created.
- `profile-wallet-picker-ui.js` remains removed.
- The renderer entry no longer loads the retired wallet-picker helper.
- Add Profile no longer uses a `MutationObserver` or post-render template scan to show wallet icons.
- Standard setup, Blank Profile, Select standard, Clear all, selection count, and selected-wallet persistence remain unchanged.

## Historical regression modernization

- The older 2.5.8 wallet-picker regression previously opened `profile-wallet-picker-ui.js` directly.
- That gate now checks `profile.js`, the canonical owner of the wallet-template UI.
- It still protects the original behavior: local artwork on wallet rows and the responsive two-, three-, and four-column picker layout.
- Adds a 2.6.13 regression that prevents historical coverage from depending on the retired observer file again.
- Keeps the 2.6.12 direct Profile artwork regression active on later 2.6.x candidates.

## Why 2.6.13 follows 2.6.12

The 2.6.12 workflow reached the historical 2.5.8 test after passing the earlier security, crypto, UI, recovery, and modernization gates. That old test failed because it attempted to read the intentionally removed `profile-wallet-picker-ui.js`. The user-facing renderer change itself was not reverted; 2.6.13 updates the regression contract to the canonical renderer and reruns the complete workflow suite.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Candidate workflow

SafeLedger 2.6.13 is a workflow/test candidate. Do **not** merge this 2.6.x candidate to `master`. Produce Windows Portable, Linux AppImage, and native Apple Silicon workflow builds for automated and hands-on validation. Promotion to `master` is reserved for an intentional move to a new 2.x release number.
