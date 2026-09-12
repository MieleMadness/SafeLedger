# Phase 5 — Behavioral Testing & Release Trust

SafeLedger 2.6.53 closes the five-phase stabilization effort by testing persistence behavior across real encrypted disk boundaries and by making each downloadable CI artifact independently verifiable without burdening normal users with technical files.

## Why this phase exists

Earlier SafeLedger regression coverage was strong at catching source/API regressions, but many tests historically inspected implementation strings. Phases 1–4 replaced the riskiest bandaids and progressively moved tests toward behavior. Phase 5 adds a higher-level promotion contract: common user mutations must survive an encrypted reopen, and a downloadable artifact must have independently accessible evidence showing what was built and where it came from.

## Behavioral lifecycle gate

`scripts/behavioral-lifecycle-tests.js` creates an isolated temporary SafeLedger vault using the real authenticated encryption and authoritative Phase 3 write service. It then exercises:

1. Vault Item creation.
2. Encrypted disk reopen with a fresh key buffer.
3. Vault Item editing after reopen.
4. Asset creation and disk reopen.
5. Cancel semantics by changing only a renderer-side copy and proving disk data did not change.
6. Asset editing and reopen.
7. Asset deletion and reopen.
8. Vault Item deletion and reopen.
9. Profile editing through the encrypted vault-list boundary.
10. Verification that renderer selection state is not persisted.
11. Verification that both vault list and profile remain authenticated `SLG2` payloads.

This is intentionally different from a source-contract test: it reads encrypted files back from disk between operations and fails if the persisted user result is wrong.

## User download vs. verification material

The application artifact and the verification material have separate owners and separate audiences.

### Normal user artifact

The normal download contains only what is needed to use SafeLedger:

- Windows: Portable EXE and `README.pdf`.
- Linux: AppImage.
- macOS: Apple Silicon ZIP.

### Optional verification artifact

Each platform also exposes a separately named GitHub Actions verification artifact containing:

- `<artifact>.sha256` — SHA-256 digest of the exact uploaded executable/AppImage/ZIP.
- `SafeLedger-<version>-<platform>-<arch>-release-manifest.json` — version, platform/architecture, artifact name, SHA-256, and exact checked-out GitHub Actions build commit.
- `SafeLedger-<version>-<platform>-<arch>-SBOM.cdx.json` — CycloneDX 1.5 SBOM generated from the committed `package-lock.json` dependency graph.

This keeps the everyday download clean while preserving all verification material for reviewers, security teams, maintainers, and advanced users.

## GitHub-native attestations

The three trusted build workflows publish two GitHub Artifact Attestations for the packaged application:

1. build provenance;
2. SBOM attestation.

They use the official `actions/attest` action pinned to an immutable commit SHA. GitHub's OIDC-backed attestation service binds the subject digest to workflow/repository/build context and stores the signed attestation outside the normal download artifact.

The required workflow permissions are intentionally narrow:

- `contents: read`
- `id-token: write`
- `attestations: write`

No repository-content write permission is granted. Attestation steps are skipped for fork pull requests because those contexts are intentionally untrusted for write-capable provenance publication.

Consumers can verify an artifact with GitHub CLI:

`gh attestation verify <artifact> --repo MieleMadness/SafeLedger`

## Exact build identity

The Phase 5 release manifest uses `github.sha`, because that is the commit GitHub Actions actually checked out and built. On a pull-request workflow this may be GitHub's temporary merge commit rather than the feature branch head. Recording the checked-out SHA prevents the manifest from claiming that a different commit produced the binary.

## What this does not claim

Checksums, SBOMs, manifests, and GitHub attestations provide integrity and provenance evidence. They are **not an operating-system publisher signature**.

Windows Artifact Signing/Authenticode and Apple Developer ID signing/notarization remain separate future release-hardening steps. Phase 5 does not create or store long-lived signing keys and does not add a SafeLedger runtime network dependency.

## Promotion rule

A 2.6.x candidate is not promotion-ready merely because source tests pass. For 2.6.53 and later stabilization candidates, promotion requires:

- full regression suite;
- Phase 5 source-contract gate;
- encrypted lifecycle behavioral test;
- release-trust generator test;
- Electron crypto smoke;
- real GUI smoke;
- successful native platform packaging;
- checksum/SBOM/manifest generation for the final staged artifact;
- clean application artifact upload;
- separate verification artifact upload;
- GitHub provenance and SBOM attestations for trusted builds;
- hands-on user validation before merging to `master`.

## Future rule

When adding a feature, prefer a test that demonstrates the user-visible persisted outcome across save/reopen boundaries. Source-string tests may still protect critical security boundaries, but they must not force obsolete implementation shapes to remain in production.
