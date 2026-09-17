# SafeLedger 2.6.12

SafeLedger 2.6.12 continues the renderer-cleanup sequence as a workflow/test candidate. It carries forward the tested 2.6.11 direct Vault Item detail rendering and removes the remaining Add Profile wallet-template artwork observer.

## Direct Add Profile wallet-template artwork

- `profile.js` now owns wallet-template artwork while it creates each Add Profile template row.
- Each reviewed wallet template asks the existing local `wallet-icons` renderer for its artwork immediately.
- The existing `profile-wallet-template-icon` presentation hook is retained for branded artwork.
- Wallet selection, Standard setup, Blank Profile, Select standard, Clear all, and selected-count behavior are unchanged.
- Template artwork remains fully local/offline and does not introduce network access.

## Retired post-render helper

- Removes `profile-wallet-picker-ui.js`.
- Removes its renderer-entry registration.
- Removes its `MutationObserver` on `detailArea`.
- Removes post-render template scanning and icon injection.
- Add Profile no longer needs a second module to notice that the form appeared before its wallet icons can be shown.

## Regression coverage

- Adds a 2.6.12 regression for direct Add Profile wallet-template artwork.
- Verifies `profile.js` owns the wallet-icon dependency and direct template rendering path.
- Verifies a reviewed Ledger template resolves to local artwork with the expected template class and accessible alt text.
- Requires the retired observer helper to remain absent from the repository and renderer entry.
- Keeps the 2.6.11 direct Vault Item detail-artwork regression active on later 2.6.x candidates.
- Keeps all prior SafeLedger regression, crypto, GUI-smoke, and distribution-trust gates in the workflow suite.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Candidate workflow

SafeLedger 2.6.12 is a workflow/test candidate. Do **not** merge this 2.6.x candidate to `master`. Produce Windows Portable, Linux AppImage, and native Apple Silicon workflow builds for automated and hands-on validation. Promotion to `master` is reserved for an intentional move to a new 2.x release number.
