# SafeLedger 2.6.71 — Trusted Storage Regression Repair

SafeLedger 2.6.71 carries forward the complete 2.6.70 dashboard redesign with no change to the requested Device & Backup Health or Maintenance Snapshot behavior.

## Why 2.6.70 failed

Windows, Linux, and macOS all failed during the regression suite in the older `scripts/hotfix-2.5.1-tests.js` gate.

That historical test still required the retired compact Portable Storage title action:

- `dashboard-title-action`
- the small `fa-external-link` icon

2.6.70 intentionally replaced that old icon-only control with the requested full **Open Storage** button. The trusted main-process folder-opening path was still intact; the historical test was checking obsolete presentation details rather than the security behavior it was originally meant to protect.

## Root cause fix

The historical trusted-folder regression now validates the current contract:

- the renderer exposes a full **Open Storage** button;
- that button calls `openPortableStorageFolder` directly;
- the renderer still uses `window.safeLedgerApi.openDataFolder()`;
- the preload bridge still invokes the fixed `device-open-data-folder` channel;
- the main process still opens only `getDataRoot()`;
- renderer-supplied paths still cannot choose an arbitrary folder.

The obsolete `dashboard-title-action` and external-link requirements were removed from the historical test instead of restoring the retired UI.

## Dead-code cleanup

The old `.dashboard-title-action` CSS block was also removed from `ui-polish.css`. Once 2.6.70 replaced the icon-only action with the full Open Storage button, those styles no longer had a runtime owner. Leaving them behind would create the same kind of stale/band-aid code we are trying to eliminate.

## Carried-forward 2.6.70 behavior

- Device & Backup Health remains directly under Vault Inventory.
- Open Storage remains a full button.
- Open Storage / Create Backup / Verify Backup remain left of their status pill.
- Maintenance Snapshot remains a static icon/header/subheader card layout.
- Maintenance Resolve actions remain direct and secret-free.
- the 180-day Maintenance Snapshot verification threshold remains independent from Recovery Health scoring.
- prior spacing, Settings, legacy import, recovery, security, and icon-registry protections remain unchanged.

## Regression coverage

The 2.6.71 gate:

- executes the repaired `hotfix-2.5.1-tests.js` directly;
- executes the complete 2.6.70 dashboard gate;
- confirms Open Storage still uses the trusted bridge;
- confirms the retired compact title action is absent from renderer code and CSS;
- prevents the stale exact `dashboard-title-action` assertion from returning;
- syntax-checks the repaired historical gate and current patch gates.

## Release safety

This is a cumulative candidate. **Do not merge to `master` until Windows, Linux, and macOS CI pass and the 2.6.70 dashboard redesign is hands-on approved.**
