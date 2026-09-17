# SafeLedger 2.6.66 — Vault Overview Refinements

SafeLedger 2.6.66 carries forward the complete 2.6.65 candidate and applies three hands-on UI refinements from packaged-build testing.

## Preferred window height

The preferred startup height is reduced by 50px, from 850px to 800px. Width remains 1283px. This keeps more vertical workspace than the original 750px baseline while reducing how much of the desktop SafeLedger occupies when it first opens.

The older 2.6.54 regression gate was updated deliberately so it tests the current 800px contract instead of preserving an obsolete 850px requirement.

## Recovery Needs Attention copy

The section now uses one concise instruction instead of two overlapping helper paragraphs:

> Vault Items that are not fully recovery-ready appear here with their readiness score and most important gaps. Choose Resolve to open the Vault Item that needs work.

The separate helper remains only for Recently Verified items, where it conveys different behavior.

## Vault Overview block spacing

The uploaded UI review showed excessive space below the information tiles in Vault Inventory and Recovery Health. Those blocks use 14px side padding, so their bottom spacing now follows the same 14px rhythm.

The extra stat-grid bottom margin is removed and the block retains 14px bottom padding. This is owned by a dedicated `dashboard-layout.css` component stylesheet loaded after the historical consolidated UI cascade. It does not use `!important`, inline styles, timers, MutationObservers, or DOM repair logic.

## Timestamp format note

No timestamp storage format was changed in this update. SafeLedger continues to retain full ISO timestamps internally because the milliseconds and UTC marker make timestamps precise and unambiguous. User-facing displays can format those timestamps more simply without weakening the stored value.

For example, `2026-09-11T13:45:48.909Z` contains `.909` milliseconds and `Z` means UTC.

## Regression coverage

The 2.6.66 regression gate verifies:

- preferred width remains 1283px;
- preferred height is 800px;
- the older window-size gate no longer requires 850px;
- Recovery Needs Attention contains the requested single instruction;
- the redundant second helper paragraph is gone;
- Recently Verified keeps its distinct helper text;
- Vault Inventory and Recovery Health end with 14px bottom padding;
- the stat grid no longer adds an extra bottom margin;
- dashboard layout ownership uses normal CSS cascade without force overrides;
- the 2.6.65 Settings/legacy-import gate remains active;
- changed JavaScript passes syntax checks.

## Hands-on test focus

1. Launch the packaged app and confirm the initial window is 50px shorter than 2.6.65 while retaining the same width.
2. Open Vault Overview and confirm Vault Inventory and Recovery Health have balanced bottom/side spacing around their tiles.
3. Scroll to Recovery Needs Attention and confirm only the single requested instruction appears above the list.
4. Confirm Recently Verified still explains that its rows can be opened.
5. Re-check the 2.6.65 Settings top-position behavior and SafeLedger 1.x JSON file picker.

## Release safety

This is a cumulative candidate. **Do not merge to `master` until Windows, Linux, and macOS CI pass and the UI refinements are hands-on approved.**
