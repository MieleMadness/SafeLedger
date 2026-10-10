# SafeLedger 2.6.97

SafeLedger 2.6.97 continues Code Cleanup Phase 5 with a focused structural change: **canonical settings-manager ownership**.

## What changed

The active settings implementation moved from the historical double-nested path:

`src/main/installManager/installManager/settingsManager.js`

to the canonical runtime path:

`src/main/settings-manager.js`

The trusted main process now imports `./settings-manager` directly. The old nested implementation was deleted rather than retained as a compatibility shim or duplicate copy.

## Why this change matters

The old path was leftover installation-manager structure even though the module had become the current owner for application settings. Keeping current behavior in a historical double-nested directory made ownership harder to understand and made future cleanup more error-prone.

2.6.97 fixes the ownership boundary without rewriting settings behavior.

## Regression protection

The existing durable cleanup and Repository Hygiene contracts now verify that:

- `src/main/settings-manager.js` exists;
- the trusted main process requires it directly;
- `src/main/installManager/installManager/settingsManager.js` remains removed;
- active runtime code and canonical regression suites do not reference the retired path;
- the canonical settings manager remains reachable in the dead-code audit;
- the module remains syntax-valid.

The candidate continues to run 47 durable canonical regression suites.

## Behavior intentionally unchanged

This release does not intentionally change:

- settings file location or schema;
- appearance selection or historical Light-to-Colorful migration;
- privacy mode;
- failed-login or lockout counters;
- Self-Destruct settings;
- backup reminder metadata;
- atomic settings persistence;
- AES-256-GCM encryption;
- Argon2id key derivation;
- main-process-only active data-key ownership;
- sandboxing or offline behavior;
- portable storage paths;
- encrypted-data compatibility;
- normal Profile, Vault Item, Asset, Dashboard, Settings, Activity, Search, or Recovery behavior.

## Phase 5 follow-up targets

Still intentionally separated into later patches:

- retirement of the non-executing patch-numbered historical-test archive;
- consolidation of duplicate runtime/build application icon ownership;
- selector-level CSS and unnecessary `!important` cleanup.

## Release safety

2.6.96 completed successfully on Windows, Linux, and macOS before this candidate was created.

Do not merge 2.6.97 until Windows, Linux, and macOS all pass the canonical regression suite, release-trust contract, encrypted lifecycle test, Electron crypto smoke test, real GUI smoke test, packaging, staging, and attestation/upload stages.
