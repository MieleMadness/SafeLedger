# SafeLedger 2.6.53 — Phase 5: Behavioral Testing & Release Trust

SafeLedger 2.6.53 is the fifth stabilization-phase development candidate. It focuses on proving persisted user behavior across encrypted disk reopen boundaries and making CI artifacts independently verifiable.

## Behavioral lifecycle testing

A new `scripts/behavioral-lifecycle-tests.js` suite uses temporary encrypted SafeLedger data and the authoritative main-process write service to exercise real persistence behavior:

- create a Vault Item;
- reopen encrypted data from disk with a fresh key buffer;
- edit the Vault Item and verify the edit persists;
- create an Asset and verify it persists after reopen;
- modify a renderer-side copy without saving and prove the encrypted disk data remains unchanged;
- edit the Asset and verify persistence;
- delete the Asset and verify deletion after reopen;
- delete the Vault Item and verify deletion after reopen;
- edit Profile metadata through the encrypted vault-list boundary;
- prove `vaultSelected`, `groupSelected`, and `recordSelected` remain UI-only state;
- prove the resulting encrypted files remain authenticated `SLG2` payloads.

This complements the existing Recovery Confidence, Data Ownership, UI Consolidation, crypto, and GUI smoke suites rather than replacing them.

## Verifiable build metadata

Windows Portable, Linux AppImage, and macOS Apple Silicon workflows now generate and upload verification metadata alongside the packaged application:

- SHA-256 checksum file for the exact staged artifact;
- CycloneDX 1.5 SBOM derived from the committed `package-lock.json` dependency graph;
- release manifest recording SafeLedger version, platform, architecture, artifact filename, SHA-256 digest, and the exact PR source commit.

The metadata generator is itself tested before packaging on every platform.

## Release trust boundaries

These additions improve integrity checking and dependency transparency but do not claim that unsigned CI artifacts are publisher-signed. SafeLedger 2.6.53 does not add signing keys, remote signing services, notarization credentials, telemetry, or a runtime network dependency.

## Security and compatibility

- AES-256-GCM authenticated vault encryption remains unchanged.
- Argon2id password derivation and the main-only DEK boundary remain unchanged.
- Phase 2 independent backup recovery verification remains active.
- Phase 3 authoritative main-process persistence remains active.
- Phase 4 canonical/state-driven UI ownership remains active.
- SafeLedger 2.x encrypted data compatibility remains intact.
- SafeLedger 1.x read-only import remains intact.
- Offline-first and portable-storage behavior remain intact.

## Promotion gate

**Do not merge this candidate to `master` yet.** Promotion still requires the full three-platform CI matrix and hands-on testing of create/edit/delete/cancel/reopen/recovery behavior using the packaged 2.6.53 builds.
