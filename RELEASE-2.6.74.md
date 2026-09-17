# SafeLedger 2.6.74 — Maintenance Snapshot + Settings Layout Refinements

SafeLedger 2.6.74 carries forward the complete 2.6.73 candidate and makes two requested presentation changes without altering recovery/security behavior.

## Maintenance Snapshot

Maintenance Snapshot now visually follows the same pattern as Recovery Needs Attention:

- one shared bordered container instead of three visually separated cards;
- compact divided rows inside that container;
- the same restrained row spacing and rounded outer shell;
- existing Recovery verification, Recovery coverage, and Backup activity information remains unchanged;
- the requested local clock, lifebuoy, and archive icons remain visible;
- Resolve / Create Backup / Verify Backup actions remain directly available;
- status pills and secret-free routing behavior are unchanged.

This is a CSS presentation refinement. The existing direct Maintenance Snapshot renderer remains the canonical owner, so no DOM repair, observer, timer, or duplicate rendering path was introduced.

## Settings order

The canonical Settings renderer now places the display/privacy controls immediately below Appearance:

1. Appearance
2. Asset Display
3. Privacy Mode
4. Backup & Recovery
5. Device & Storage Security
6. Import SafeLedger 1.x Data
7. Brute Force Protection
8. Self-Destruct Protection
9. Password

Asset Display and Privacy Mode were moved by changing the canonical `showSettings()` render order directly. No CSS reordering or post-render DOM movement is used.

## Regression maintenance

Both existing Settings-order regressions were updated to reflect the intentionally revised canonical sequence instead of preserving the old placement:

- `brute-force-regression-tests.js`
- `development-2.5.8-tests.js`

This avoids repeating the stale-test problem that caused several earlier candidates to turn red after intentional UI changes.

A new `hotfix-2.6.74-tests.js` gate verifies:

- Asset Display and Privacy Mode remain directly below Appearance and before Backup & Recovery;
- both historical Settings-order gates agree with the current canonical renderer;
- Maintenance Snapshot keeps one shared divided-list shell;
- existing maintenance icons and direct actions remain intact;
- the relevant Privacy Mode, Maintenance Snapshot, and 2.6.72 regression gates still pass;
- changed JavaScript continues to pass syntax checks.

## Release safety

This is a cumulative candidate. **Do not merge to `master` until Windows, Linux, and macOS CI pass and the requested UI changes are hands-on approved.**
