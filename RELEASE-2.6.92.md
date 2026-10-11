# SafeLedger 2.6.92 — Current Distribution Trust Contract

SafeLedger 2.6.92 carries forward Code Cleanup Phase 1 from 2.6.91 and fixes the first stale non-versioned regression discovered by the new canonical test runner.

## CI root cause

Windows, Linux, and macOS 2.6.91 all passed the first 42 canonical suites. The shared failure occurred in `scripts/distribution-trust-tests.js`.

The production workflows had intentionally been aligned so all three platforms build on `master` pushes and pull requests targeting `master`. However, the distribution trust suite still contained this historical requirement from the original Apple Silicon rollout:

- macOS had to contain the old `safeledger-2.6.1-development` push trigger;
- one assertion message still described the workflow as "2.6.1 CI."

That was no longer a product or release-trust requirement. It was a stale implementation detail inside a file with a durable name.

## Fix

The distribution trust suite now protects the current behavior:

- Windows, Linux, and macOS must all build `master` pushes;
- all three must validate pull requests targeting `master`;
- all three must run the canonical `release-trust-contract-tests.js` gate;
- patch-numbered historical gates are rejected from active workflow YAML;
- macOS still verifies native `arm64` execution and packaged architecture;
- macOS still disables automatic signing discovery so test builds do not require Apple signing credentials;
- existing read-only repository permissions, GitHub attestations, SBOMs, checksums, source-commit binding, GUI smoke, crypto smoke, and clean/verification artifact separation remain protected.

## Why this is part of Phase 1

Phase 1 is specifically removing implementation archaeology from current release policy. The important contract was never "keep a 2.6.1 development branch trigger forever." The important contract is "all supported platform workflows run consistently and preserve the release trust boundary."

2.6.92 updates the test to express that current contract rather than weakening coverage.

## Production scope

There are no production application changes in 2.6.92. Authentication, encryption, recovery, storage, persistence, renderer behavior, SafeLedger 2.x compatibility, SafeLedger 1.x read-only import, and the local/offline security model are unchanged from 2.6.91/2.6.90.

## Release safety

This is a cumulative candidate. **Do not merge to `master` until Windows, Linux, and macOS CI pass and hands-on smoke testing confirms there is no application behavior change.**
