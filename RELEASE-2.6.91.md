# SafeLedger 2.6.91 — Code Cleanup Phase 1

SafeLedger 2.6.91 begins the repository cleanup with **test architecture and dead-code mapping**. This candidate carries forward the complete 2.6.90 application behavior and intentionally avoids production feature, encryption, recovery, persistence, storage-path, or UI behavior changes.

## Root problem

The regression suite had accumulated patch-numbered gates from years of fixes. Many still provided useful historical context, but all of them remained executable in the main CI chain. Several newer gates also launched older gates again.

That meant current code could be correct while CI failed because an old test still required the exact implementation used by an earlier patch. The recent Chain Games regressions were a clear example: SafeLedger remained fully local/offline, but old tests still required inline SVG data URLs after the current design intentionally moved to packaged theme-aware SVG assets.

## Canonical behavior suites

2.6.91 introduces:

- `scripts/regression-suite.js` — one manifest of durable current-behavior suites;
- `scripts/run-regression-suite.js` — one sequential regression runner;
- `scripts/current-product-contract-tests.js` — current solid-column/login-wallpaper/Chain-Games end-state coverage;
- `scripts/release-trust-contract-tests.js` — durable Phase 5 release/download/attestation coverage;
- `scripts/test-architecture-tests.js` — prevents patch-numbered gates from returning to active npm/CI test paths.

`npm run test:regression` now prepares local assets and the sandboxed renderer once, then runs only the canonical manifest.

## Historical tests

Patch/release files such as `hotfix-x.y.z-tests.js`, `development-x.y.z-tests.js`, and `release-x.y-tests.js` are **not deleted** in this phase. They remain in Git as historical evidence, but they no longer define current CI policy.

Future regressions should be added to the subsystem that owns the behavior instead of creating another permanently chained patch gate.

## Dead-code audit

2.6.91 adds `npm run audit:dead-code`.

The audit starts from the real runtime roots—`bootstrap.js`, `preload.js`, and `renderer-entry.js`—then follows local JavaScript dependencies, linked CSS, and referenced local assets. It reports candidate unreachable/unlinked/unreferenced files without deleting anything.

Static analysis is advisory only. Candidate files must still be checked against dynamic behavior, migration/compatibility needs, packaging, tests, and hands-on use before removal.

## CI consistency

Windows, Linux, and macOS now all run `scripts/release-trust-contract-tests.js` instead of the patch-numbered `hotfix-2.6.53-tests.js` Phase 5 gate.

The macOS workflow also removes stale push triggers for the old `safeledger-2.6.1-development` and `safeledger-2.6.2-development` branches and now matches Windows/Linux by building on `master` pushes and pull requests targeting `master`.

## Preserved security/release behavior

The canonical release-trust contract continues to protect:

- encrypted lifecycle behavior;
- CycloneDX SBOM generation;
- SHA-256 checksums;
- exact source-commit binding;
- GitHub provenance and SBOM attestations;
- clean user-facing artifacts separated from verification files.

The existing main-only DEK boundary, AES-256-GCM/Argon2id design, 2.x compatibility, 1.x read-only import path, local/offline model, authoritative writes, recovery verification, and sandboxed renderer remain unchanged.

## Release safety

This is a cumulative candidate based on 2.6.90. **Do not merge to `master` until Windows, Linux, and macOS CI pass and hands-on smoke testing confirms there is no application behavior change.**
