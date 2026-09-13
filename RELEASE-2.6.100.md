# SafeLedger 2.6.100

## Code Cleanup Phase 5 — CSS Ownership Cleanup

SafeLedger 2.6.100 begins the final visual-structure portion of Phase 5 by replacing guesswork about the stylesheet cascade with an explicit ownership audit, then removing only CSS that was proven to be byte-equivalent duplication.

## What changed

### Added a reusable CSS ownership audit

`scripts/css-ownership-audit.js` reads the canonical `src/main/css/app.css` cascade and reports:

- every imported stylesheet;
- selector/context rule ownership across the full cascade;
- repeated selector/context pairs;
- whether repeated declarations are byte-equivalent or are actual cascade overrides;
- `!important` usage by stylesheet.

The audit is also available directly through:

`npm run audit:css-ownership`

The canonical Style Consolidation regression suite executes the audit on every supported CI platform.

### Baseline findings

Before selector cleanup, the 18-file canonical cascade contained:

- 1,545 rule instances;
- 1,078 unique selector/context pairs;
- 263 repeated selector/context pairs;
- 4 byte-equivalent duplicate selector/context pairs;
- 259 differing override relationships requiring separate review;
- 602 `!important` declarations.

2.6.100 intentionally does **not** treat all repeated selectors as defects. A later rule can legitimately refine an earlier feature, theme, responsive, or accessibility rule.

### Removed the four proven exact duplicates

The audit identified four byte-equivalent duplicate selector/context entries. 2.6.100 removes the earlier copies and keeps the later canonical owners:

1. `::-webkit-scrollbar` sizing now belongs only to the theme-aware `ui-current.css` layer.
2. `.coin-list-label` truncation now belongs only to the global/list layout rule in `global-search.css`.
3. `.detail-action-button .fa-star` color now belongs only to `ui-dock-refinement.css`.
4. `.detail-action-button .fa-star-o` color now belongs only to `ui-dock-refinement.css`.

No replacement selector, shim, compatibility rule, or new cascade layer was added.

## Why this is low risk

Each removed declaration block was identical to a later declaration already winning in the canonical cascade. The later owner and the `app.css` import order remain unchanged, so the computed declarations are intentionally preserved.

The patch does not broadly flatten the 259 non-identical override relationships. Those relationships can encode real theme, responsive, feature, accessibility, or historical cascade behavior and require separate review before consolidation.

## Durable protection

The Style Consolidation regression suite now requires:

- all 18 canonical cascade files to remain present in the reviewed order;
- the retired exact duplicate blocks to stay absent from their former owners;
- each surviving canonical owner to remain present;
- the CSS ownership audit to report **zero byte-equivalent duplicate selector/context blocks**.

Existing visual-contract tests and real GUI smoke tests remain part of the release gate.

## Behavior intentionally unchanged

2.6.100 does not intentionally change:

- visible layout, spacing, colors, icon artwork, or responsive behavior;
- Light, Dark, Colorful, or System appearance behavior;
- encryption, Argon2id, or key ownership;
- renderer sandboxing or offline restrictions;
- portable storage or encrypted-data compatibility;
- Profiles, Vault Items, Assets, Settings, Dashboard, Activity, Search, Recovery, backup/restore, lockout, Emergency Lock, or Self-Destruct behavior.

## Next cleanup target

The audit also measured 602 `!important` declarations before this cleanup. SafeLedger 2.6.101 should review those selectively, beginning where cascade ownership is already explicit. `!important` must not be removed in bulk: some declarations are intentionally protecting theme, accessibility, legacy framework, or responsive behavior.

## Release safety

SafeLedger 2.6.99 was fully green on Windows, Linux, and macOS before 2.6.100 began. 2.6.100 must not merge until the final selector-cleanup head passes all 47 canonical regression suites, release trust, encrypted lifecycle, Electron crypto, real GUI smoke, platform packaging, staging, attestations, and uploads on all three supported platforms.
