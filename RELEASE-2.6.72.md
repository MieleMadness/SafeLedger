# SafeLedger 2.6.72 — Repair Historical Maintenance Regression

SafeLedger 2.6.72 carries forward the complete 2.6.71 candidate with no production UI change. This patch fixes the next stale historical regression exposed by the full cross-platform test chain.

## Why 2.6.71 failed

Windows, Linux, and macOS all reached `scripts/development-2.5.12-tests.js` and failed because that older test still required the retired Maintenance Snapshot bullet-list design.

The stale assertions expected labels and DOM structure such as:

- `Stale information`
- `Last Backup`
- `dashboard-maintenance-list`
- `dashboard-maintenance-details`

Those requirements conflict with the intentional 2.6.70 redesign, where Maintenance Snapshot became static icon/header/subheader action cards with direct Resolve/Create Backup/Verify Backup controls.

## Root cause

The production dashboard and the newer 2.6.70 regression gate had already been updated, but the older 2.5.12 regression still encoded presentation details from the previous bullet-list implementation.

Because the full regression chain intentionally runs historical tests, that obsolete assertion surfaced only after the earlier stale 2.5.1 gate was repaired in 2.6.71.

## Fix

`development-2.5.12-tests.js` now validates the current long-term behavior instead of the retired markup:

- Maintenance Snapshot remains a canonical section;
- it uses `dashboard-maintenance-cards`;
- it includes Recovery verification, Recovery coverage, and Backup activity cards;
- it retains clock, lifebuoy, and archive icons;
- direct Resolve/Create Backup/Verify Backup actions remain available where appropriate;
- the retired bullet-list and nested-detail renderers must stay absent;
- the current `dashboard-layout.css` card styling is required;
- secret-free `maintenanceTargets` remain available for direct routing.

The rest of the historical 2.5.12 coverage for dashboard navigation, QR artwork, recovery validation, and exchange/service Vault Items is unchanged.

## Additional regression coverage

A new `hotfix-2.6.72-tests.js` gate:

- runs the repaired `development-2.5.12-tests.js` directly;
- runs the full 2.6.70 dashboard gate;
- runs the 2.6.71 trusted-storage repair gate;
- prevents the retired Stale information / Last Backup bullet assertions from returning;
- verifies the current Maintenance Snapshot card structure and styling remain intact.

## Carried-forward dashboard behavior

No requested 2.6.70 behavior was changed:

- Device & Backup Health remains directly below Vault Inventory;
- Open Storage is still a full button;
- health action buttons remain left of their status pills;
- Maintenance Snapshot remains the static icon/header/subheader card design;
- Resolve routes to the correct secret-free Vault Item target;
- backup maintenance actions still use Create Backup / Verify Backup;
- the Maintenance Snapshot stale-verification threshold remains 180 days.

## Release safety

This is a cumulative candidate. **Do not merge to `master` until Windows, Linux, and macOS CI pass and the dashboard redesign is hands-on approved.**
