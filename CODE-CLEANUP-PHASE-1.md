# SafeLedger Code Cleanup — Phase 1

SafeLedger 2.6.91 starts the repository cleanup with **test architecture and dead-code mapping**. This phase intentionally avoids production application refactors. Authentication, encryption, recovery, persistence, storage paths, renderer behavior, and user-visible features are carried forward unchanged from 2.6.90.

## Why this phase comes first

SafeLedger accumulated patch-numbered regression files while the application was being modernized. Those files were valuable when each fix was introduced, but keeping every historical gate in the active CI chain created a new problem: old implementation details could fail a current release even when the current behavior was correct.

The 2.6.88 → 2.6.90 Chain Games sequence demonstrated the failure mode. Current local/offline artwork was correct, but historical tests still required older representations such as inline data URLs. CI therefore became a test of implementation archaeology rather than the current product contract.

Phase 1 changes that rule:

> **Current behavior is protected by durable subsystem contracts. Patch-numbered tests are historical evidence, not permanent executable policy.**

## Canonical regression architecture

`scripts/regression-suite.js` is the canonical manifest, and `scripts/run-regression-suite.js` is now the single main regression runner.

The manifest names tests after the behavior they protect, including:

- encryption and crypto compatibility;
- brute-force and lockout behavior;
- renderer sandbox and runtime hardening;
- atomic persistence and continuity;
- recovery confidence and recovery intelligence;
- authoritative data ownership;
- UI consolidation, appearance, visual contracts, and local icons;
- dashboard/search/activity/custom-field/recovery workflows;
- device security and startup performance;
- the current SafeLedger product contract;
- release/distribution trust;
- the test architecture itself.

`npm run test:regression` prepares local icon assets and the sandboxed renderer bundle once, then executes the canonical manifest.

## Historical tests are archived, not deleted

Files named like these remain in the repository for now:

- `development-x.y.z-tests.js`
- `hotfix-x.y.z-tests.js`
- `release-x.y-tests.js`

They document what a release was repairing and remain useful when investigating old regressions. They are no longer allowed in the main regression command or the canonical suite manifest.

This is intentionally safer than mass-deleting them in Phase 1. A later repository-cleanup phase can move or remove historical files after their useful behavioral coverage has been confirmed in durable suites.

## Current product contract

`scripts/current-product-contract-tests.js` consolidates the current end state that had been spread across the latest patch gates. It protects behavior rather than release history:

- Profile, Vault Item, and Asset navigation columns remain solid theme colors;
- the sign-in artwork remains local and scoped to the Detail/display column;
- workspace divider lines remain present;
- the retired focused-column artwork experiment stays removed;
- Chain Games uses the approved theme-aware rounded-square local SVGs;
- CHAIN Asset recognition continues to use the same local Chain Games artwork family;
- artwork remains self-contained and network-free.

No assertion depends on release-note wording or on the sequence of patches that produced the behavior.

## Release trust contract

The old `hotfix-2.6.53-tests.js` Phase 5 gate is replaced in active CI by `scripts/release-trust-contract-tests.js`.

The canonical gate continues to protect:

- encrypted lifecycle behavioral coverage;
- CycloneDX SBOM generation;
- SHA-256 release checksums;
- source-commit binding;
- GitHub provenance and SBOM attestations;
- separation of normal user downloads from verification artifacts.

Windows, Linux, and macOS workflows all use the same named contract. The macOS push trigger is also aligned with Windows/Linux so all three build workflows target `master` consistently instead of retaining old 2.6.1/2.6.2 development-branch triggers.

## Dead-code mapping

`scripts/dead-code-audit.js` performs a non-destructive static reachability audit.

Its explicit runtime roots are:

1. `src/main/bootstrap.js` — Electron main-process composition root.
2. `src/main/preload.js` — sandbox preload root.
3. `src/main/renderer-entry.js` — renderer source bundled by esbuild.

The audit follows local CommonJS dependencies, reads CSS linked by `index.html`, and identifies packaged assets referenced by reachable source/CSS.

It reports three **candidate** lists:

- JavaScript not statically reachable from the runtime roots;
- CSS not linked by the application shell;
- packaged assets not statically referenced by reachable runtime sources.

Static reachability is not proof that a file is safe to delete. Dynamic paths, packaging behavior, tests, migration tooling, and hands-on flows must still be checked. For that reason Phase 1 does **not** automatically remove anything the scanner reports.

## Initial cleanup map

The repository review identified these items for later phases:

| Area | Current status | Planned handling |
| --- | --- | --- |
| `src/main/logger.js` | Legacy debug helper; not part of the traced runtime entry chain | Verify with the static audit and test references, then remove if still orphaned |
| `src/main/css/recovery-binder.css` | Present in source but not linked by `index.html` | Confirm its rules are superseded or unused before deletion |
| `sl.png` and `build/icon-source.png` | Same underlying image content | Keep for current packaging/runtime compatibility; consolidate in repository-cleanup phase |
| `src/main/installManager/installManager/settingsManager.js` | Active code in a legacy double-nested path | Move only after imports/tests are updated in a dedicated structural phase |
| Patch/release regression files | Historical evidence, previously all active | Archived in place; excluded from active canonical CI |
| `main.js` + `bootstrap.js` composition | Both active; ownership cleanup still needed | Phase 2 will make bootstrap the sole composition root and remove runtime listener replacement bandaids |
| Renderer pseudo-IPC bridge | Active compatibility layer | Later renderer-architecture phase will replace it with semantic services |
| Layered CSS + broad `!important` use | Active and functional but hard to reason about | Later UI/CSS consolidation phase |

## Engineering rules introduced by Phase 1

1. **Name tests for behavior, not patch numbers.**
2. **Do not make a current release satisfy a retired implementation detail.**
3. **When a bug is fixed, add coverage to the owning subsystem suite or a durable new contract.**
4. **Historical test files may explain the past, but they do not define the present architecture.**
5. **Dead-code tools are advisory until runtime ownership, tests, packaging, and compatibility are verified.**
6. **A replacement should eventually remove the implementation it supersedes rather than disabling it at startup.**

## Phase 1 completion criteria

Phase 1 is ready for hands-on approval when:

- `npm run test:regression` runs only the canonical manifest and passes;
- no npm `test:*` script directly executes patch-numbered historical gates;
- Windows, Linux, and macOS use the canonical release-trust gate;
- the three platform workflows pass;
- behavioral lifecycle, Electron crypto smoke, and GUI smoke remain green;
- `npm run audit:dead-code` produces an advisory candidate report without deleting or modifying runtime files;
- there is no production application behavior change from 2.6.90.
