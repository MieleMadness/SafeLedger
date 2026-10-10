# SafeLedger 2.6.75 — Simplified Maintenance Snapshot Rows

SafeLedger 2.6.75 carries forward the complete 2.6.74 candidate and refines the Maintenance Snapshot presentation based on hands-on UI feedback.

## Maintenance Snapshot

The Maintenance Snapshot now reads even more like Recovery Needs Attention:

- the visible icons and their surrounding circles are removed;
- no horizontal space is reserved for an icon column;
- heading/subheader copy starts at the normal left row padding;
- rows use compact `10px 12px` spacing, matching the established dashboard list rhythm;
- text stays left aligned while actions and status pills remain on the right;
- the shared bordered shell and row dividers remain;
- floating-card shadows are removed so the section reads as one list instead of separate cards.

Recovery verification, Recovery coverage, Backup activity, Resolve, Create Backup, Verify Backup, status calculations, and secret-free routing are unchanged.

## Responsive behavior

On narrow windows, the text remains left aligned and the action/status area can wrap below the copy without restoring an icon column or extra left indent.

## Settings layout carried forward

The 2.6.74 Settings order remains unchanged:

1. Appearance
2. Asset Display
3. Privacy Mode
4. Backup & Recovery
5. Device & Storage Security
6. Import SafeLedger 1.x Data
7. Brute Force Protection
8. Self-Destruct Protection
9. Password

## Regression maintenance

The historical 2.6.70 Maintenance Snapshot layout gate was updated to follow the current intentional presentation rather than preserving the retired icon-column/card-shadow design.

A new `hotfix-2.6.75-tests.js` gate verifies that:

- Maintenance Snapshot icons/circles are not visible;
- no desktop or mobile icon column is reserved;
- copy remains left aligned and consumes the available row width;
- compact list-row padding remains active;
- direct maintenance actions and the 2.6.74 Settings-order contract remain intact.

## Release safety

This is a cumulative candidate. **Do not merge to `master` until Windows, Linux, and macOS CI pass and the requested UI changes are hands-on approved.**
