# SafeLedger 2.5 — Distribution, Trust & Open Source Readiness

## Release status

**Release candidate: 2.5.0**

Target official tag: **v2.5.0**

SafeLedger 2.5 extends SafeLedger's trust boundary from the local encrypted application to the software distribution chain. The release infrastructure is implemented on top of SafeLedger 2.4 without changing vault encryption, persisted schemas, backup semantics, recovery behavior, device-security behavior, or normal offline operation.

The implementation must pass the complete Windows and Linux regression, crypto, GUI, packaging, SBOM, and distribution-trust gates on the exact 2.5.0 head before merge. Official tag publishing additionally requires `master` to be protected.

## Release thesis

The official release chain is:

`protected/reviewed master commit → v2.5.0 tag → policy preflight → Windows/Linux validation → official builds → SBOM → checksum/manifest verification → provenance attestations → GitHub Release`

Publishing fails closed if a required stage is missing or unsuccessful.

## Implemented outcomes

### 1. Tag-only official publishing

`.github/workflows/release.yml` runs only for version tags matching the release tag pattern. It does not run in pull-request context and does not use `pull_request_target`.

A dedicated release-policy script validates:

- exact `vMAJOR.MINOR.PATCH` syntax;
- exact equality between tag version and `package.json` version;
- expected Windows/Linux artifact naming policy;
- required release/legal files;
- tagged commit ancestry from `master`.

The official workflow also requires the repository metadata for `master` to report that the branch is protected before publishing can continue.

### 2. Least-privilege workflow permissions

Release jobs default to `contents: read`.

Only the provenance stage receives the OIDC/attestation permissions it requires, and only the final publish job receives `contents: write`.

Windows signing credentials are exposed only to the dedicated Authenticode signing step, never to pull-request workflows or earlier build/test steps.

### 3. Immutable GitHub Action references

Release-critical Actions are pinned to reviewed full commit SHAs rather than movable major-version tags.

The normal Windows and Linux CI workflows were also moved to immutable Action pins so release validation and pull-request validation use the same trust posture.

### 4. Official artifact contract

SafeLedger 2.5 expects exactly one of each required binary/document artifact for an official release:

- `SafeLedger-2.5.0-Portable.exe`
- `SafeLedger-2.5.0-x86_64.AppImage`
- `README.pdf`
- `safeledger-2.5.0.cdx.json`
- `LICENSE`
- `NOTICE`
- `THIRD-PARTY-NOTICES.md`
- `RELEASE-VERIFICATION.md`

Duplicate or missing required artifacts fail collection rather than producing a partial official release.

### 5. SHA-256 checksums and release manifest

`scripts/release-artifacts.js` stages the final bundle, computes SHA-256 values, writes `SHA256SUMS.txt`, and immediately verifies those values before allowing the workflow to continue.

It also creates `release-manifest.json` containing release version, tag, source commit, Windows signing state, artifact filenames, byte sizes, and SHA-256 hashes.

The final publish job verifies checksums again immediately before creating the GitHub Release.

### 6. CycloneDX SBOM

The trusted release workflow generates a CycloneDX SBOM from the committed npm dependency graph.

The mandatory distribution-trust regression suite also invokes the active npm CLI directly through the running Node process and parses the generated CycloneDX JSON on Windows and Linux. This avoids platform-specific shell-wrapper behavior and verifies that SBOM generation actually works before a release tag is created.

The committed `package-lock.json` has been normalized to SafeLedger 2.5.0 and reflects the current root dependency graph. Retired Bootstrap and Font Awesome root dependencies are no longer represented as active application dependencies.

### 7. Build provenance / attestations

After the release bundle is collected and verified, GitHub artifact attestations are created for the Windows Portable EXE and Linux AppImage before release publication.

Attestation is used to associate official artifacts with the trusted GitHub workflow/source context. It does not claim that the software is free of vulnerabilities.

### 8. Windows Authenticode signing readiness

The official Windows release path supports optional Authenticode signing when the expected protected secrets are configured.

If neither credential is configured, the artifact is clearly recorded as unsigned. If only part of the signing configuration is present, the workflow fails instead of silently publishing an ambiguously signed build.

Signing credentials are not committed to the repository and are not available to ordinary PR CI.

### 9. Open-source trust surface

SafeLedger 2.5 adds or normalizes:

- complete Apache License 2.0 text in `LICENSE`;
- `NOTICE` preserving known SafeLedger historical attribution;
- `THIRD-PARTY-NOTICES.md`;
- `CONTRIBUTING.md`;
- `SECURITY.md`;
- `CODE_OF_CONDUCT.md` collaboration standards;
- pull-request template;
- bug-report template;
- release-trust report template;
- `RELEASE-VERIFICATION.md`.

Issue/contribution guidance explicitly warns contributors not to upload real seed phrases, private keys, passwords, PINs, vault files, or other recovery secrets.

### 10. User-facing release verification

`RELEASE-VERIFICATION.md` explains how users can verify an official download against `SHA256SUMS.txt`, inspect the release manifest, understand the SBOM/provenance information, and distinguish checksums from code signing.

Checksums prove file identity relative to the published digest; they are not presented as proof that a binary is vulnerability-free.

## Preserved product invariants

SafeLedger 2.5 does not change:

- AES-256-GCM authenticated vault encryption;
- Argon2id master-password/key-envelope behavior;
- main-process-only Data Encryption Key handling;
- SafeLedger 2.x vault/data format;
- read-only SafeLedger 1.x import behavior;
- backup format v3 generation;
- backup format v2 restore compatibility;
- portable `SafeLedgerData` behavior;
- centralized Emergency/OS/storage session locking;
- Recovery Health scoring;
- Guided Test Recovery;
- Privacy Mode;
- offline BIP39/address validation;
- duplicate-detection privacy guarantees;
- Self-Destruct separation from device/security lock events;
- offline/local-first normal application operation.

No runtime telemetry, cloud validation, auto-update service, blockchain API, signing service, or other network dependency was added to normal SafeLedger vault use.

## Regression coverage

The mandatory SafeLedger regression suite now verifies, in addition to all prior 2.1–2.4 gates:

1. release tags must use exact semantic version syntax;
2. tag/package mismatches fail;
3. required trust/legal files exist;
4. Windows/Linux artifact naming templates remain controlled;
5. duplicate/missing release artifacts fail closed;
6. SHA-256 verification detects artifact tampering;
7. release-manifest generation is deterministic for supplied inputs;
8. official publishing is tag-only;
9. `pull_request_target` is absent from publishing;
10. workflow permissions remain least-privilege;
11. only the final publish job has `contents: write`;
12. attestation permissions are isolated to the attestation job;
13. release-critical Actions are pinned by full SHA;
14. normal Windows/Linux CI Actions are pinned by full SHA;
15. signing secrets are scoped only to the signing step;
16. the release workflow uses read-accessible branch metadata for the protected-`master` gate;
17. the release workflow does not require the administration-only branch-protection API endpoint;
18. legal/verification files are included in the official artifact set;
19. live CycloneDX SBOM generation parses successfully;
20. no 2.5 distribution change expands product crypto/schema/recovery scope.

## Release acceptance gates

SafeLedger 2.5 may merge only when the exact **2.5.0** release-candidate head passes:

1. `npm ci` from the normalized lockfile on Windows and Linux;
2. full regression suite on Windows and Linux;
3. live CycloneDX SBOM regression on Windows and Linux;
4. Electron crypto smoke on Windows and Linux;
5. real GUI startup smoke on Windows and Linux;
6. Windows Portable EXE build and artifact upload;
7. Linux AppImage build and artifact upload;
8. 1.x import continuity;
9. backup v2/v3 compatibility;
10. device/session-lock regressions;
11. Recovery Intelligence / Privacy Mode regressions;
12. distribution-trust regressions;
13. no new runtime network dependency.

Before the official `v2.5.0` tag is created:

14. the exact release candidate must be merged into `master`;
15. `master` must be protected;
16. the tag must point to the intended merged commit;
17. official tag preflight must pass;
18. Windows and Linux trusted-tag builds must both succeed;
19. SBOM/checksum/release-manifest collection must succeed;
20. artifact attestations must succeed;
21. final checksum re-verification must succeed;
22. the GitHub Release must be created from the verified bundle without replacing artifacts in place.

## Current external prerequisite

The repository currently reports `master` as unprotected. This is intentionally treated as a release blocker by the 2.5 publishing workflow.

For a solo-maintainer repository, a practical minimum is:

- protect `master`;
- require pull requests before merging;
- require the Windows and Linux build checks;
- require the branch to be up to date before merging;
- disallow force pushes;
- disallow branch deletion;
- avoid requiring an external approving reviewer if that would prevent the sole maintainer from merging.

Do not create `v2.5.0` until this protection is active and the exact 2.5.0 candidate is merged.

## Deferred beyond 2.5

SafeLedger 2.6 is planned as **macOS Apple Silicon (`arm64`) Distribution & Platform Hardening**. It intentionally does not target Intel/x64 Macs, universal binaries, or Rosetta compatibility.

macOS Developer ID signing, notarization, Gatekeeper validation, and macOS-specific portable-storage/runtime testing remain outside the 2.5 Windows/Linux release gate.
