# Phase 5 — Behavioral Testing & Release Trust

SafeLedger 2.6.53 closes the five-phase stabilization effort by testing persistence behavior across real encrypted disk boundaries and by making each downloadable CI artifact independently verifiable.

## Why this phase exists

Earlier SafeLedger regression coverage was strong at catching source/API regressions, but many tests historically inspected implementation strings. Phases 1–4 replaced the riskiest bandaids and progressively moved tests toward behavior. Phase 5 adds a higher-level promotion contract: the software must demonstrate that common user mutations survive an encrypted reopen, and the artifact a user downloads must carry enough metadata to verify exactly what was built.

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

This is intentionally different from a source-contract test: it reads the encrypted files back from disk between operations and fails if the persisted user result is wrong.

## Release trust bundle

Every Windows, Linux, and macOS CI package now ships with three verification files next to the application artifact:

- `<artifact>.sha256` — SHA-256 digest of the exact uploaded executable/AppImage/ZIP.
- `SafeLedger-<version>-<platform>-<arch>-release-manifest.json` — artifact name, version, SHA-256, platform/architecture, and the exact source commit used for the PR build.
- `SafeLedger-<version>-<platform>-<arch>-SBOM.cdx.json` — CycloneDX 1.5 software bill of materials generated from the committed `package-lock.json` dependency graph.

The generator is local and deterministic with respect to the artifact/package lock. It does not contact a signing service or introduce a runtime network dependency.

## What this does not claim

Checksums and an SBOM provide integrity, provenance context, and dependency transparency. They are **not a cryptographic publisher signature**. Current CI builds remain unsigned unless a future release process adds platform code signing/notarization with protected signing keys. Phase 5 deliberately does not create a false sense of signed provenance.

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
- artifact upload;
- hands-on user validation before merging to `master`.

## Future rule

When adding a feature, prefer a test that demonstrates the user-visible persisted outcome across save/reopen boundaries. Source-string tests may still protect critical security boundaries, but they must not force obsolete implementation shapes to remain in production.
