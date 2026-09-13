# SafeLedger 2.6.101 — Selective CSS `!important` Ownership Cleanup

SafeLedger 2.6.101 continues Code Cleanup Phase 5 by reducing CSS specificity debt only where source-order ownership is provable.

## What changed

- Added `scripts/important-ownership-audit.js`.
- Added `npm run audit:important-ownership`.
- The audit reviews the 18 files loaded by the canonical `app.css` cascade.
- It marks an earlier `!important` declaration as removable only when the same selector, same at-rule context, and same property are declared later with `!important`.
- For grouped selectors, every selector in the block must have a later owner before the declaration is considered removable.
- Initial review found 67 physically removable shadowed declarations across the cascade.
- 2.6.101 removes the 38 shadowed declarations owned by the broad `app-theme.css` layer.
- Physical `!important` usage drops from 601 declarations to 563; `app-theme.css` drops from 122 to 84.
- Later component owners remain unchanged in `ui-polish.css`, `ui-current.css`, `ui-dock-refinement.css`, and `qr-theme.css`.
- The Style Consolidation regression now fails if `app-theme.css` regains an `!important` declaration that is always shadowed by a later component owner.
- The UI Polish regression validates action-button sizing and wallet-category appearance at their surviving component owner rather than requiring stale copies in the base theme.

## Why this is not a bulk `!important` removal

`!important` is not automatically dead code. SafeLedger uses layered theme, accessibility, responsive, framework-override, and interaction styling. Removing importance based only on a count or selector name could change the cascade.

This release removes only declarations where the later rule has identical applicability and equal importance, making the earlier declaration unable to win.

## Ownership examples

Examples of ownership moved fully out of `app-theme.css` include:

- Detail-area padding → later UI polish ownership.
- Focus ring shadow → `ui-current.css`.
- Top utility padding → `ui-polish.css`.
- Selected navigation styling → later UI polish/current UI ownership.
- Readiness/status colors → `ui-polish.css`.
- QR area appearance → `qr-theme.css`.
- Bottom action dock sizing → `ui-dock-refinement.css`.
- Detail action sizing/radius → later UI polish/current UI ownership.
- Responsive detail-area padding → `ui-polish.css`.

## Intentionally left alone

Twenty-nine additional provably shadowed declarations remain outside `app-theme.css`. They span base layout, token artwork, current UI, and UI polish layers. They are not mixed into this patch so each ownership area can be reviewed independently.

The broader set of `!important` declarations that are not provably shadowed also remains untouched. Those declarations may still be required for specificity, theme, accessibility, responsive, or framework behavior.

## Product behavior

No intentional visible or functional behavior changes are included. Encryption, Argon2id, main-process key ownership, renderer sandboxing, offline operation, portable storage, Profiles, Vault Items, Assets, Settings, Dashboard, Activity, Search, Recovery, backup/restore, lockout, Emergency Lock, Self-Destruct, and appearance modes are unchanged.

## Validation requirement

Do not merge until the final 2.6.101 head passes:

- all 47 canonical regression suites;
- the CSS ownership and `!important` ownership audits;
- visual contracts;
- release trust;
- encrypted lifecycle tests;
- Electron crypto smoke;
- real GUI smoke;
- Windows portable packaging, attestation, and upload;
- Linux AppImage packaging, attestation, and upload;
- macOS Apple Silicon packaging, architecture verification, attestation, and upload.
