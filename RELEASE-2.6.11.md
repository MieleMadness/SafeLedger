# SafeLedger 2.6.11

SafeLedger 2.6.11 continues the renderer cleanup sequence by moving Vault Item detail artwork into the canonical `group.js` render path.

## Direct Vault Item detail header

- `group.js` now creates the Vault Item detail header as one render-time unit: local artwork, title, and category.
- Detail artwork comes from the same canonical `vault-item-presentation.createIconElement()` source used by the Vault Item list.
- Known local service artwork, wallet artwork, and fallback account icons therefore stay consistent between list and detail views.
- The existing `wallet-detail-header`, `wallet-detail-brand-image`, `wallet-detail-title-wrap`, `wallet-detail-title`, and `wallet-detail-category` styling hooks are preserved.
- No vault data, selected-item state, or persistence format changes are required.

## Retired post-render patching

- `ui-scale-2.6.7.js` no longer watches `detailArea` or `groupArea`.
- Removes its Vault Item `MutationObserver`.
- Removes selected-list-icon lookup, icon signatures, DOM cloning, and post-render header reconstruction.
- The helper now has one responsibility: apply the preferred 1400 × 750 initial window size when screen space permits.

## Regression coverage

- Adds a DOM-level 2.6.11 regression for direct Vault Item detail rendering.
- Verifies a known Website Account (`GitHub`) renders its fully local icon directly into the detail header.
- Verifies the existing large-detail artwork class is applied at render time.
- Verifies title and category are placed in the expected detail wrapper.
- Verifies an unknown Website Account retains the local globe fallback and receives the same detail treatment.
- Verifies the scale helper contains no `MutationObserver`, selected-item lookup, icon cloning, or detail patch function.
- Verifies preferred-window sizing still works after the renderer cleanup.
- Updates the 2.6.7 historical visual regression to protect the direct-render behavior instead of the retired observer implementation.
- Keeps the 2.6.10 direct Asset identity-field regression active on later 2.6.x patches.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Promotion gate

Do not merge to protected `master` until the full 2.6.11 regression suite and Windows, Linux, and native Apple Silicon validation workflows are green and hands-on testing is approved.
