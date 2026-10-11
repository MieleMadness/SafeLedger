# SafeLedger 2.6.53 — Phase 5: Behavioral Testing & Release Trust

SafeLedger 2.6.53 is the fifth stabilization-phase development candidate. It focuses on proving persisted user behavior across encrypted disk reopen boundaries and making CI artifacts independently verifiable without cluttering the normal user download.

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

## Clean user downloads

The normal GitHub Actions artifact is intentionally kept simple:

- Windows: Portable EXE plus `README.pdf`.
- Linux: AppImage only.
- macOS: Apple Silicon ZIP only.

Checksum, SBOM, and release-manifest files are no longer mixed into the normal application download.

## Separate verification artifacts

Each platform also publishes a separate verification artifact:

- `SafeLedger-Windows-Verification`
- `SafeLedger-Linux-Verification`
- `SafeLedger-macOS-arm64-Verification`

Those optional technical downloads contain:

- SHA-256 checksum for the exact packaged application;
- CycloneDX 1.5 SBOM derived from the committed `package-lock.json` dependency graph;
- release manifest recording SafeLedger version, platform, architecture, artifact filename, SHA-256 digest, and the exact GitHub Actions commit that was checked out and built.

The metadata generator is itself tested before packaging on every platform.

## GitHub Artifact Attestations

Trusted same-repository builds also publish GitHub-native cryptographic attestations for the application artifact:

1. build provenance attestation;
2. SBOM attestation referencing the generated CycloneDX SBOM.

SafeLedger pins the official `actions/attest` action by immutable commit SHA instead of using a movable version tag. The workflows grant only the additional `id-token: write` and `attestations: write` permissions needed for attestation; repository contents remain read-only.

GitHub stores these attestations separately from the downloadable application. They can be inspected in the repository's GitHub Attestations interface and verified with GitHub CLI, for example:

`gh attestation verify <SafeLedger artifact> --repo MieleMadness/SafeLedger`

Write attestations are skipped for untrusted fork pull requests because GitHub intentionally restricts write-capable workflow permissions in that context.

## Release trust boundaries

Checksums, SBOMs, manifests, and GitHub attestations provide integrity and build-provenance evidence. They are still **not the same as operating-system publisher code signing**. Windows Authenticode/Artifact Signing and Apple Developer ID signing/notarization remain separate future release-hardening steps.

SafeLedger 2.6.53 does not add signing keys, remote runtime services, telemetry, or a runtime network dependency.

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
