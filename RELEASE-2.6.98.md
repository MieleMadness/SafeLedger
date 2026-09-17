# SafeLedger 2.6.98

## Code Cleanup Phase 5 — Historical Test Archive Retirement

SafeLedger 2.6.98 removes the retired patch/release-numbered regression-test archive after confirming that current behavior is fully owned by the durable canonical test architecture.

## What changed

- Removed 108 historical `development-*`, `hotfix-*`, and release-numbered test files from `scripts/`.
- Kept the complete 47-suite canonical regression manifest unchanged.
- Updated Test Architecture so retired patch/release-numbered test files are now forbidden from the active repository.
- Added workflow checks ensuring Windows, Linux, and macOS continue to use `npm run test:regression` and the canonical release-trust contract.
- Updated the regression manifest language so new tests must protect a durable behavior/subsystem rather than a release number.
- Bumped the application candidate version to 2.6.98.

## Why this is safe

Phase 1 stopped executing patch-numbered tests after their behavior was absorbed into durable subsystem suites. By 2.6.97, SafeLedger had 47 canonical suites, and all three platform workflows were using the canonical runner rather than any numbered historical gate.

The deleted files therefore represented historical implementation evidence, not active coverage. Their source remains available in Git history together with the commits that introduced and superseded them.

Removing them from the live tree reduces the chance that contributors mistake stale source-string assertions or old release assumptions for current architecture.

## Durable protection

Test Architecture now fails if:

- the canonical suite count drops below the established 47-suite contract;
- a canonical suite uses a retired numbered-test filename;
- any matching patch/release-numbered test file returns to `scripts/`;
- a package test command invokes a retired numbered gate;
- a supported platform workflow stops using the canonical regression runner;
- a supported platform workflow directly invokes a retired numbered gate.

## Product behavior

2.6.98 is a repository/test-architecture cleanup. It does not intentionally change application behavior, encrypted data, settings, UI, storage paths, or recovery workflows.

The following remain intentionally unchanged:

- AES-256-GCM encrypted vault data;
- Argon2id key-envelope behavior;
- main-process-only active data-key ownership;
- sandboxed/context-isolated renderer architecture;
- offline/network restrictions;
- portable Windows and Linux storage behavior;
- SafeLedger 2.x encrypted-data compatibility;
- SafeLedger 1.x read-only import;
- Profiles, Vault Items, Assets, Settings, Dashboard, Activity History, Global Search, Recovery Intelligence, Recovery Binder, backup/restore, lockout, Emergency Lock, and Self-Destruct behavior;
- Light, Dark, Colorful, and System appearance behavior.

## Release safety

SafeLedger 2.6.97 was confirmed green on Windows, Linux, and macOS—including all 47 canonical regression suites, release-trust gates, encrypted lifecycle testing, Electron crypto smoke, real GUI smoke, packaging, attestations, and uploads—before the 2.6.98 branch was created.

Do not merge 2.6.98 until the same three-platform pipeline is green with the retired archive absent.

## Next Phase 5 target

The duplicate runtime/build application icon remains intentionally separate. Consolidating `sl.png` and `build/icon-source.png` requires coordinated runtime and packaging ownership changes plus packaged verification on all supported platforms.
