# SafeLedger 2.6.73 — Repair 2.6.72 Regression Self-Check

SafeLedger 2.6.73 carries forward the complete 2.6.72 candidate with no production UI or behavior change.

## Why 2.6.72 failed

Windows, Linux, and macOS all completed the full historical regression chain through the repaired `development-2.5.12-tests.js` successfully. The failure happened only when the new `hotfix-2.6.72-tests.js` gate checked its own historical-test cleanup.

The gate used broad substring checks for:

- `list.className = 'dashboard-maintenance-list';`
- `details.className = 'dashboard-maintenance-details';`

Those strings are still intentionally present inside **negative assertions** in the repaired historical test so CI can prove the retired bullet-list renderer never returns. The 2.6.72 gate incorrectly treated those protective negative assertions as evidence that the old renderer was still required.

## Root cause

The test attempted to verify intent by searching for implementation text rather than checking whether the historical test still had the obsolete **positive assertion**.

That made the regression gate fail on the very safeguards added to prevent the retired UI from returning.

## Fix

`hotfix-2.6.72-tests.js` now distinguishes between positive and negative requirements:

- it rejects the exact obsolete positive assertions that would require the old bullet-list renderer;
- it requires the current negative assertions that explicitly keep the old renderer retired;
- all existing 2.6.70 / 2.6.71 / 2.6.72 behavioral checks remain intact.

No dashboard production code changed in 2.6.73.

## Carried-forward dashboard behavior

- Device & Backup Health remains directly below Vault Inventory.
- Open Storage remains a full button.
- Device-health action buttons remain to the left of their status pills.
- Maintenance Snapshot remains the static icon/header/subheader card design.
- Recovery verification, Recovery coverage, and Backup activity remain directly actionable.
- Resolve routing remains secret-free.
- Maintenance verification freshness remains based on the 180-day threshold.

## Release safety

This is a cumulative candidate. **Do not merge to `master` until Windows, Linux, and macOS CI pass and the dashboard redesign is hands-on approved.**
