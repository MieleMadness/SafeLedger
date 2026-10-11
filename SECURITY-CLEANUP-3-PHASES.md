# SafeLedger — Three-Phase Reliability and Security Cleanup

Starting baseline: 2.6.115 (`safeledger-2.6.115-development`).

The guiding rule: document why transitional code exists, replace it with one
authoritative implementation, protect the behavior with failure-path tests, and
never drop compatibility or security invariants merely to simplify code.

## Phase 1 — Authentication and Lockout Authority (2.6.116)

**Problem:** password verification previously returned to the renderer before
a second optional request recorded an incorrect attempt. A direct crypto-login
IPC caller could omit that second operation. A separate Change Password IPC
also allowed wrong-old-password verification while locked.

**Correction:**
- Route all IPC password attempts through one trusted main-process coordinator.
- Serialize concurrent attempts so retries, lockout thresholds and success
  cannot race each other.
- Check stored lockout state before deriving a password key.
- Persist incorrect-attempt counters before the renderer can retry.
- Disallow Change Password while locked.
- Keep invalid/unwritable settings and uncertain accounting fail-closed.
- Continue enforcing the configured lockout and Self-Destruct protections.
- Keep the renderer concerned only with UI status, focus, and retry controls.

**Tests:** direct IPC structural contract, one wrong and one correct login,
parallel guesses, active/expired lockouts, retry exhaustion, corrupted/unwritable
security state, cross-platform CI and GUI smoke.

**Deferred:** in Phase 3, migrate legacy shared-response IPC to request-specific
responses; do not mix that transport rewrite into authentication behavior.

## Phase 2 — Encrypted Data Integrity and Transactions

**Problems:** mutation requests can fall back to a selected index after a
supplied creation identifier stops matching; Profile deletion commits the
encrypted list before removing the encrypted file; filesystem durability
behavior varies by OS and removable-media implementation.

**Proposed correction:**
- Fail closed on stale/missing target identity and prefer stable entity IDs
  over array positions (with a migration/compatibility plan for older vaults).
- Make Profile delete interruption-safe with recoverable transaction state.
- Audit atomic rename and directory-sync behavior on each supported OS.
- Improve the accuracy of Self-Destruct/secure-erasure documentation.
- Add fault-injection tests for crashes, stale edits, and storage failures.

**Preserve:** encrypted data format compatibility, lossless existing fields,
legacy read-only import, portable-drive locations, atomic writes, and recovery
safety. This work needs separate focused implementation reviews.

## Phase 3 — IPC, UI, Build and Maintainability

**Problems:** serialized but shared legacy result channels, large renderer-side
mutation snapshots, overlapping lockout/UI calculations, costly CSS ownership,
limited rendered-layout coverage, and release PRs based on an old master branch.

**Proposed correction:**
- Replace shared send/response pairs with one request/response contract per
  operation, with main-process authorization and narrowly scoped patches.
- Retire legacy whole-vault request adapters only after callers and tests use
  targeted operations.
- Consolidate component CSS owners; preserve theme and accessibility behavior.
- Expand real GUI layout tests for Light, Colorful, and Dark modes, including
  Search icons spacing and selected Profile visuals.
- Improve stacked-PR/release branch strategy and metadata maintenance.

**Tests:** cross-feature compatibility and UI snapshots/layout assertions on
Windows, Linux and macOS; runtime security/IPC authorization checks.

## Release discipline

One patch version per feature release; keep each version's diff scoped to the
previous candidate. Do not merge without owner authorization. Run canonical
regressions, Electron crypto, real GUI smoke, and all three platform packaging
jobs on the exact final commit.

This plan describes work to be done. Only Phase 1 is implemented in 2.6.116.
