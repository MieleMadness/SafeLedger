# SafeLedger 2.6.96

SafeLedger 2.6.96 begins **Code Cleanup Phase 5: Repository Hygiene and Structural Debt Retirement**.

This candidate is intentionally narrow. It removes one verified orphaned runtime file, fixes a dead-code-audit blind spot discovered during review, and adds a durable regression contract for future repository cleanup.

## What changed

- Removed the unused legacy `src/main/logger.js` file rather than keeping a disabled second-looking logging path.
- Updated `scripts/dead-code-audit.js` so reachable renderer JavaScript can declare local dynamically loaded stylesheets.
- The audit now recognizes `src/main/css/recovery-binder.css`, which is intentionally loaded at runtime by `recovery-binder-ui.js` when Recovery Binder opens.
- Added `scripts/repository-hygiene-tests.js` as a durable canonical suite.
- Added Repository Hygiene to the canonical regression manifest, bringing the current suite to 47 durable subsystem contracts.
- Updated Test Architecture coverage so Repository Hygiene must remain canonical and Recovery Binder CSS cannot be falsely classified as unlinked.
- Added `CODE-CLEANUP-PHASE-5.md` documenting the cleanup policy and the structural items intentionally deferred to separate Phase 5 patches.
- Bumped the SafeLedger candidate version to 2.6.96.

## Why the Recovery Binder stylesheet was not deleted

The Phase 1 audit originally followed stylesheets linked from `index.html`, and Phase 4 extended that to local CSS `@import` chains.

During Phase 5 review, `recovery-binder.css` looked unlinked because it does not enter through `app.css`. Review of the live renderer showed that Recovery Binder deliberately creates a stylesheet `<link>` when the feature opens.

Deleting that file would have been a cleanup regression. 2.6.96 fixes the audit so it understands this dynamic ownership instead.

## Why the legacy logger was removed

The old logger was disabled by default and was not reachable from the current main, preload, or renderer ownership graphs. Current security/activity auditing already has a trusted, sanitized owner.

Leaving an unused legacy logger would make the architecture harder to understand and invite future code to revive a second logging path. It is removed completely rather than wrapped, renamed, or left dormant.

## Intentionally deferred

The following Phase 5 targets are not bundled into 2.6.96:

- moving the active double-nested `settingsManager` module;
- retiring the large archive of patch-numbered historical test files;
- consolidating the duplicate runtime/build icon image;
- broad selector-level CSS and `!important` cleanup.

Each of those changes has a different risk surface and will be easier to validate as a focused follow-up patch.

## Security and compatibility scope

No intentional change is made to:

- AES-256-GCM encryption;
- Argon2id key derivation;
- active data-key ownership;
- renderer sandbox/context isolation;
- offline/network restrictions;
- encrypted vault format or SafeLedger 2.x compatibility;
- SafeLedger 1.x read-only import;
- portable storage behavior;
- backup/restore;
- Recovery Binder privacy defaults or printed content;
- lockout, Emergency Lock, or Self-Destruct behavior;
- normal Profile, Vault Item, Asset, Settings, Dashboard, Activity, Search, or Recovery workflows.

## Release safety

2.6.95 completed successfully on Windows, Linux, and macOS before this branch was created.

Do not merge 2.6.96 until Windows, Linux, and macOS CI all pass the 47-suite canonical regression set, release-trust checks, encrypted lifecycle test, Electron crypto smoke, real GUI smoke, and packaging stages.
