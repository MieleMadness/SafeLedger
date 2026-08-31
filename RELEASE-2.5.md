# SafeLedger 2.5 — Distribution, Trust & Open Source Readiness

## Status

**Design complete / implementation not started.**

Target release version: **2.5.0**  
Target release tag: **v2.5.0**

SafeLedger 2.5 is intentionally a distribution and trust release. It should make an official SafeLedger download independently verifiable without changing how SafeLedger encrypts, stores, imports, restores, or protects user data.

The branch is stacked on the exact SafeLedger 2.4.0 release-candidate head until 2.4 is merged. After 2.4 lands in `master`, this PR should be retargeted to `master` before 2.5 implementation is merged.

---

## Release thesis

SafeLedger already has strong local security properties. Version 2.5 should extend that trust boundary from **“the application protects my vault locally”** to **“I can verify that this official download came from the SafeLedger release process and corresponds to a specific reviewed source commit.”**

The release should establish a traceable chain:

`reviewed source commit → version tag → CI validation → Windows/Linux builds → checksums/SBOM → provenance → GitHub Release`

No step in that chain should silently skip a required gate.

---

## Why 2.5 comes next

SafeLedger 2.4 adds recovery intelligence and validation while preserving the existing encrypted storage model. The next risk is no longer primarily feature completeness; it is distribution trust.

A public open-source security product should make it easy to answer:

- Which source commit produced this binary?
- Does the binary match the published checksum?
- Which dependencies were used to build the release?
- Was the artifact produced by the expected GitHub Actions workflow?
- Is the Windows binary signed, and if not, is that clearly disclosed?
- Are license, contribution, and vulnerability-reporting expectations unambiguous?
- Can an untrusted pull request or arbitrary branch publish an official release?

SafeLedger 2.5 is the release that answers those questions.

---

## Non-negotiable product invariants

2.5 must not change any of the following unless a separate security review explicitly expands scope:

- AES-256-GCM vault encryption.
- Argon2id password/key-envelope behavior.
- Main-process-only Data Encryption Key handling.
- SafeLedger 2.x vault/data format.
- SafeLedger 1.x read-only import behavior.
- Backup format v3 generation.
- Backup format v2 restore compatibility.
- Portable `SafeLedgerData` placement.
- Emergency Lock behavior.
- Device/session lock behavior.
- Storage-removal protection.
- Recovery Health scoring semantics.
- Test Recovery behavior.
- Privacy Mode behavior.
- Offline BIP39/address validation behavior.
- Duplicate-detection privacy guarantees.
- Offline/local-first normal application operation.

A 2.5 change that alters crypto, persisted schemas, vault migration, backup semantics, recovery semantics, or device-security semantics is out of scope and should move to a later release.

---

## Threat model for the release process

2.5 should explicitly defend against these release/distribution failures:

### Untrusted PR publishing

A pull request may contain attacker-controlled code. PR workflows must never receive the permissions or secrets required to create an official release, sign a production binary, or publish provenance as an official tagged release.

### Tag/version mismatch

A tag such as `v2.5.0` must never publish a package whose `package.json` reports another version.

### Tagging an unreviewed commit

An official release tag must point to a commit reachable from the protected/default release branch. A tag on an arbitrary feature branch should fail preflight.

### Mutable workflow dependencies

Release-critical GitHub Actions should be pinned to reviewed full-length commit SHAs rather than movable tags.

### Partial release publication

If Windows succeeds but Linux fails—or checksums, SBOM, legal files, provenance, or required verification fail—no successful official release should be published.

### Artifact substitution

Release artifacts must be checksummed after final staging. Once a release is published, binaries should not be replaced in-place. A changed binary requires a new version/tag.

### Secret leakage

Signing credentials, certificate private keys, passwords, OIDC tokens, and repository secrets must never be written into artifacts, logs, source, test fixtures, or release metadata.

### Misleading trust claims

Unsigned builds must be labeled unsigned. A checksum proves file identity, not authorship. Provenance proves workflow/source association, not that the software is vulnerability-free. Documentation should use precise language.

---

## Design principles

1. **Fail closed.** Missing trust metadata should stop official publishing rather than generate a partial release.
2. **Least privilege.** Read-only permissions by default; write permissions only in the final trusted publishing/attestation jobs that need them.
3. **No PR secrets.** Production signing or release credentials never run in pull-request context.
4. **Immutable workflow dependencies.** Pin release-critical actions to full commit SHAs.
5. **Keep policy in testable scripts.** Version, artifact, checksum, and manifest validation should live in Node scripts where possible instead of fragile shell-only YAML logic.
6. **One source commit.** Every official artifact in a release must come from the same tagged commit.
7. **No runtime cloud dependency.** Supply-chain verification exists in release infrastructure and documentation, not inside the SafeLedger application.
8. **No silent optional security.** If a required release feature is unavailable, the workflow should report the blocker clearly rather than pretending it passed.

---

# Release architecture

## 1. Keep PR CI separate from publishing

The existing Windows Portable and Linux AppImage workflows remain CI/build-validation workflows.

They should continue to:

- run the full regression suite;
- run Electron crypto smoke tests;
- run real GUI smoke tests;
- produce disposable Windows/Linux artifacts;
- use read-only repository permissions;
- never create a GitHub Release;
- never receive production signing credentials;
- never create official provenance for a release tag.

2.5 should add a separate release workflow, proposed path:

`.github/workflows/release.yml`

The release workflow should trigger only for version tags matching the SafeLedger version-tag convention. GitHub event globbing is not sufficient by itself; a dedicated preflight script must validate the exact tag syntax and package version.

Do not use `pull_request_target` for release publishing.

---

## 2. Release preflight job

Create a testable script such as:

`scripts/release-policy.js`

It should validate:

- tag format is exactly `vMAJOR.MINOR.PATCH`;
- `package.json` contains valid semantic versioning;
- tag version equals `package.json` version exactly;
- tag commit is the commit checked out by the release workflow;
- tagged commit is reachable from the expected release branch (`master`) once 2.5 is merged;
- repository is not in a dirty/generated mismatch state;
- required release files exist;
- package/build artifact naming templates include the exact package version;
- release version is not a prerelease unless a future policy explicitly supports prereleases.

The release workflow should fetch enough Git history to verify ancestry.

**Important:** 2.5 development itself remains untagged. Do not create `v2.5.0` while implementation is still in progress.

---

## 3. Release workflow permissions

Default workflow permissions should be read-only.

Example policy intent:

- build/preflight jobs: `contents: read`;
- attestation job: `contents: read`, `id-token: write`, `attestations: write`;
- final release publishing job: `contents: write` only after every required job succeeds.

Do not grant `contents: write` to the entire workflow simply because the final job needs it.

If an environment is used for production signing/publishing, apply protection rules so production secrets are available only in trusted tag context.

---

## 4. Pin release-critical Actions

GitHub recommends full-length commit SHA pinning as the immutable reference for Actions. During implementation:

- replace movable `actions/checkout@vX`, `actions/setup-node@vX`, `actions/upload-artifact@vX`, download-artifact, attestation, and any other release-critical references with reviewed full commit SHAs;
- add comments beside pins indicating the human-readable action version for maintainability;
- review the source repository for each action before pinning;
- avoid unnecessary third-party Actions when an audited Node script or GitHub CLI command can perform the same task.

Whether PR-only workflows are also SHA-pinned can be implemented in the same release if it remains low-risk. The official release workflow must be SHA-pinned.

Current reference:
https://docs.github.com/en/actions/reference/security/secure-use

---

## 5. Build graph

Proposed trusted tag workflow graph:

```text
preflight
   ├── build-windows
   ├── build-linux
   └── generate-sbom
          ↓
collect-and-verify
          ↓
attest-artifacts
          ↓
publish-release
```

### `preflight`

Validates tag/version/branch ancestry and release policy.

### `build-windows`

Runs from the exact tag commit:

- `npm ci --no-audit --no-fund`
- full regression suite
- Electron crypto smoke
- real GUI smoke
- Windows portable build
- README PDF generation if the existing Windows path remains the known-good PDF builder
- optional Authenticode signing when configured
- signature verification when signing is enabled
- upload only staged release artifacts to the workflow artifact store

### `build-linux`

Runs from the exact same tag commit:

- `npm ci --no-audit --no-fund`
- full regression suite
- Electron crypto smoke
- real GUI smoke
- AppImage build
- upload staged AppImage

### `generate-sbom`

Generate a machine-readable SBOM using the lock/install graph from the tagged source. Prefer the built-in npm SBOM command to avoid adding another SBOM generator dependency.

Current npm supports CycloneDX and SPDX output through `npm sbom`.

Planned artifact name:

`SafeLedger-2.5.0-sbom.cdx.json`

The release documentation must be precise: this SBOM represents the npm dependency graph used for the release build; it is not a byte-level inventory of every Electron binary component.

Current reference:
https://docs.npmjs.com/cli/commands/npm-sbom/

### `collect-and-verify`

A single trusted job downloads all workflow artifacts and verifies the complete release set before publication.

It must fail on:

- missing expected file;
- unexpected duplicate artifact filename;
- wrong version in an artifact filename;
- zero-byte artifact;
- malformed SBOM JSON;
- missing required legal file;
- mismatched release manifest metadata;
- checksum self-verification failure;
- signing-required-but-not-valid state.

### `attest-artifacts`

Generate GitHub artifact attestations for official binaries after final artifact identity is known.

At minimum attest:

- Windows Portable EXE;
- Linux AppImage.

The attestation must bind the artifact digest to the official repository, workflow, commit, and tag context.

GitHub artifact attestations use OIDC-backed provenance and require dedicated workflow permissions. Pin the attestation action to a reviewed full SHA at implementation time.

Current references:
https://docs.github.com/en/actions/concepts/security/artifact-attestations
https://docs.github.com/en/actions/reference/security/oidc

### `publish-release`

Only this final job receives GitHub Release write permission.

It should:

- run only after every dependency is successful;
- use the existing immutable tag;
- publish the already-verified staged assets;
- publish release notes from the repository/reviewed release-notes file;
- never rebuild binaries;
- never modify artifacts after checksum generation;
- fail rather than publish a partial asset set.

Prefer GitHub CLI / GitHub-supported primitives over an unnecessary third-party release action.

---

# Official 2.5 artifact contract

The official GitHub Release should contain a predictable set of files.

Required user-facing assets:

- `SafeLedger-2.5.0-Portable.exe`
- `SafeLedger-2.5.0-x86_64.AppImage`
- `README.pdf`
- `SHA256SUMS.txt`
- `SafeLedger-2.5.0-sbom.cdx.json`
- `SafeLedger-2.5.0-release.json`

Release notes may be rendered in GitHub and may also be attached as a text/Markdown file if implementation benefits from it.

No two release assets may use the same filename.

Artifact names should remain deterministic even if the build bytes themselves are not guaranteed reproducible across different build environments. 2.5 should not claim reproducible builds unless that property is explicitly proven.

---

## Release manifest

Add a generated machine-readable manifest:

`SafeLedger-2.5.0-release.json`

Suggested schema:

```json
{
  "schemaVersion": 1,
  "product": "SafeLedger",
  "version": "2.5.0",
  "tag": "v2.5.0",
  "sourceCommit": "<40-char git sha>",
  "nodeVersion": "<version>",
  "npmVersion": "<version>",
  "electronVersion": "<version>",
  "electronBuilderVersion": "<version>",
  "artifacts": [
    {
      "file": "SafeLedger-2.5.0-Portable.exe",
      "platform": "windows",
      "arch": "x64",
      "sha256": "<digest>",
      "signing": "signed|unsigned"
    }
  ]
}
```

The manifest must not contain:

- runner secrets;
- local filesystem paths;
- signing-certificate private material;
- OIDC tokens;
- user/vault data;
- environment variables that may expose secrets.

Create/validate it with a repository-owned script such as:

`scripts/release-manifest.js`

---

# Checksums

Add a repository-owned checksum generator/verifier, proposed:

`scripts/release-checksums.js`

Requirements:

- SHA-256 only;
- lowercase hexadecimal digests;
- stable lexicographic filename order;
- reject duplicate filenames;
- reject path traversal or nested unexpected paths;
- verify every generated checksum before publish;
- include EXE, AppImage, README PDF, SBOM, and release manifest;
- do not attempt to hash `SHA256SUMS.txt` into itself.

`SHA256SUMS.txt` should be generated after signing and after all final files are staged.

Why: signing changes executable bytes. Checksums generated before signing would be wrong.

---

# SBOM strategy

Use a machine-readable CycloneDX JSON SBOM generated from the exact tagged dependency graph.

Implementation goals:

- use the npm CLI already present in the build environment rather than introducing a new runtime dependency;
- generate after `npm ci` from the tagged source;
- validate that output parses as JSON and identifies SafeLedger/version correctly;
- publish the SBOM alongside the binaries;
- include SBOM generation in release-policy regression tests;
- document that the SBOM describes the npm dependency/build graph and is not a guarantee that every OS/Electron transitive binary is enumerated byte-for-byte.

2.5 should also clean stale root lockfile metadata so `package.json` and the lockfile describe the same direct dependency set without changing dependency versions merely for the sake of this release.

Dependency upgrades remain a separate concern unless a critical build/release blocker requires one.

---

# Provenance / artifact attestations

Official 2.5 binary releases should use GitHub artifact attestations when repository support is available.

Acceptance policy:

- provenance is generated only in trusted tag context;
- binary digest is finalized before attestation;
- attestation identity includes the expected repository/workflow/commit context;
- failure to create a required attestation prevents official publishing;
- the application itself gains no network dependency;
- README/release documentation explains what provenance verifies and what it does not.

GitHub currently documents artifact attestations as cryptographically signed claims binding artifacts to build provenance, including workflow/repository/commit context.

2.5 verification documentation should include both normal online verification and a link to GitHub’s documented offline-attestation workflow for advanced users.

Reference:
https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/verify-attestations-offline

---

# Windows code-signing readiness

2.5 should make Windows Authenticode signing integration-ready without requiring a signing certificate for ordinary contributors or PR builds.

## Rules

- no PFX/private key committed to source;
- no signing password committed to source;
- no signing credentials exposed to PR workflows;
- release signing material should live in protected GitHub environment/repository secrets;
- signing occurs before SHA-256 generation;
- when signing is enabled, the workflow verifies the signature before proceeding;
- unsigned state is explicit in the release manifest and release notes;
- unsigned development/PR artifacts remain supported.

Implementation should use the supported electron-builder signing interface or a dedicated signing step, selected only after validating the actual certificate format/provider.

Do not hard-code speculative secret names into contributor instructions until the implementation path is chosen. The release workflow may use one explicit boolean/variable to determine whether signing is configured.

If signing is configured, PowerShell `Get-AuthenticodeSignature` or an equivalent trusted verification path should confirm a valid signature before checksums are created.

---

# Open-source legal hygiene

The current repository `LICENSE` contains the short Apache 2.0 notice, not the complete Apache License 2.0 text. 2.5 should correct that.

Required work:

- replace `LICENSE` with the full Apache License 2.0 text;
- preserve existing SafeLedger copyright attribution in `NOTICE` and/or an appropriate header/notice file;
- add `NOTICE` with project attribution and material notices;
- review `LICENSE.md` or other legacy license files and remove/redirect conflicting or duplicate license statements;
- inspect direct dependency license metadata and create `THIRD_PARTY_NOTICES.md` if upstream obligations require attribution/notices;
- ensure packaged distributions include `LICENSE` and `NOTICE`;
- add automated tests for required legal files and packaging inclusion.

This plan is release-engineering guidance, not a substitute for legal review when third-party attribution requirements are ambiguous.

---

# Contributor readiness

Add:

- `CONTRIBUTING.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/config.yml`

Do **not** provide a public issue template that encourages detailed exploit disclosure.

## CONTRIBUTING.md should include

- supported Node version used by CI;
- `npm ci` as the normal install path;
- renderer build command;
- full regression command;
- crypto smoke command;
- GUI smoke command;
- Windows/Linux packaging commands;
- Profile → Wallet → Asset terminology;
- offline/local-first invariant;
- portable-data invariant;
- crypto/data-format compatibility rules;
- explicit warning never to use real seed phrases/private keys/passwords/PINs/customer vault data in tests/issues;
- requirement that crypto/storage changes include dedicated compatibility tests and release documentation;
- explanation that generated release artifacts do not belong in ordinary PR commits.

## SECURITY.md should include

- currently supported stable release line;
- how to report a vulnerability privately;
- warning not to include real secrets in a report;
- what information is useful for triage;
- responsible disclosure expectations;
- statement that public issues are not appropriate for unpatched exploitable vulnerabilities.

If GitHub private vulnerability reporting is available for the repository, enable it as a repository setting and point `SECURITY.md` to that mechanism. This setting change is operational, not a code dependency.

---

# Repository / workflow hardening recommendations

These are part of the 2.5 trust model but some require repository settings rather than committed code.

Recommended before publishing 2.5:

- require successful Windows/Linux checks before merge to `master`;
- block force pushes to `master`;
- require pull requests for production changes where practical;
- protect release environments/secrets;
- restrict Actions to trusted publishers where repository settings allow;
- consider enabling the GitHub setting that requires Actions to be pinned to full-length commit SHAs;
- consider private vulnerability reporting;
- never make production signing secrets available to forks or PR contexts.

Do not make branch-protection assumptions in code; document any repository-setting prerequisite in the final release checklist.

---

# User-facing download verification

README/release documentation should make verification practical for non-specialists.

Add a **Verify your SafeLedger download** section explaining:

1. Download the binary and `SHA256SUMS.txt` from the same GitHub Release.
2. Calculate SHA-256 locally.
3. Compare the exact digest and filename.
4. When provenance is enabled, optionally verify the GitHub artifact attestation against `MieleMadness/SafeLedger`.
5. On Windows, check Authenticode signing status when the release is signed.

Provide platform-appropriate commands for:

- Windows PowerShell (`Get-FileHash`);
- Linux (`sha256sum`);
- GitHub CLI attestation verification when available.

Never instruct users to disable SmartScreen, antivirus, Gatekeeper, signature checks, or other OS protections merely to run SafeLedger.

Explain clearly that an unsigned Windows binary may produce warnings until a trusted signing certificate is configured.

---

# Proposed implementation file map

## New files

- `.github/workflows/release.yml`
- `scripts/release-policy.js`
- `scripts/release-artifacts.js` or equivalent artifact-contract validator
- `scripts/release-checksums.js`
- `scripts/release-manifest.js`
- `scripts/distribution-trust-tests.js`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`
- `NOTICE`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/config.yml`

Conditional after license review:

- `THIRD_PARTY_NOTICES.md`
- `RELEASE-NOTES-2.5.md`

## Existing files likely modified

- `LICENSE`
- `LICENSE.md` if still present/conflicting
- `README.md`
- `package.json`
- `package-lock.json` metadata only as needed for exact direct-dependency parity
- `.github/workflows/windows-portable.yml`
- `.github/workflows/linux-appimage.yml`

No application runtime source file should require modification unless a packaging/legal inclusion issue makes it unavoidable.

---

# Implementation phases

## Phase A — Baseline and threat-model tests

1. Confirm exact 2.4 stable base after 2.4 merges.
2. Retarget this PR to `master`.
3. Compare `package.json` and `package-lock.json` direct dependency metadata.
4. Inventory current Actions and workflow permissions.
5. Inventory current legal/open-source files.
6. Add failing `distribution-trust-tests.js` assertions for the intended release contract.

**Why:** establish measurable gates before changing the release machinery.

## Phase B — Legal and contributor foundation

1. Full Apache-2.0 `LICENSE`.
2. `NOTICE`.
3. Resolve legacy license duplication.
4. `CONTRIBUTING.md`.
5. `SECURITY.md`.
6. `CODE_OF_CONDUCT.md`.
7. PR/issue templates.
8. Package legal-file inclusion tests.

**Why:** external review should have clear rules before official distribution is promoted.

## Phase C — Release policy scripts

Implement pure/testable scripts for:

- semver/tag validation;
- branch ancestry policy;
- artifact naming contract;
- artifact completeness;
- checksum generation/verification;
- release manifest generation/validation;
- SBOM JSON validation.

**Why:** policy in repository-owned scripts is easier to test across Windows/Linux than large shell blocks embedded in workflow YAML.

## Phase D — Workflow hardening

1. Explicit least-privilege permissions.
2. Pin release-critical Actions to full SHAs.
3. Keep PR CI non-publishing.
4. Ensure production secrets are inaccessible from PRs.
5. Add concurrency protection so duplicate release runs for the same tag cannot race publication.

**Why:** the workflow itself becomes part of SafeLedger’s supply-chain security boundary.

## Phase E — Trusted tag release pipeline

Implement `.github/workflows/release.yml` with:

- preflight;
- Windows build/test;
- Linux build/test;
- SBOM generation;
- collection and artifact validation;
- checksums and manifest;
- provenance/attestation;
- final publish job.

No GitHub Release until all preceding jobs pass.

## Phase F — Windows signing readiness

1. Add signing-disabled path.
2. Add signing-enabled path using protected secrets/environment.
3. Verify signature before checksums.
4. Record signing state in release manifest.
5. Regression-test both configuration branches without requiring a production key in PR CI.

## Phase G — Verification documentation

Update README and release notes with:

- official asset list;
- checksum verification;
- provenance verification;
- signing status explanation;
- portable-data behavior;
- backup-before-upgrade guidance;
- legacy import/restore compatibility summary.

## Phase H — Release candidate

1. All 2.5 implementation complete while package remains inherited 2.4.x version.
2. Full Windows/Linux PR CI green.
3. Distribution-trust regression suite green.
4. Release workflow tested without publishing an official production tag (workflow/unit simulation where possible).
5. Bump package to **2.5.0** only after implementation gates pass.
6. Re-run full CI on exact 2.5.0 head.
7. Merge only exact green 2.5.0 head.
8. After merge and `master` validation, create annotated `v2.5.0` tag on the reviewed commit.
9. Allow trusted tag workflow to produce the official GitHub Release.

---

# Regression gates

`scripts/distribution-trust-tests.js` should prove at minimum:

### Version/tag policy

- accepts `v2.5.0` when package version is `2.5.0`;
- rejects missing `v` prefix;
- rejects malformed semantic versions;
- rejects tag/package mismatch;
- rejects unapproved prerelease syntax unless policy explicitly changes;
- rejects a tagged commit outside the expected release ancestry.

### Artifact contract

- exact Windows filename required;
- exact Linux filename required;
- README PDF required;
- SBOM required;
- release manifest required;
- duplicate filenames rejected;
- unexpected path traversal rejected;
- zero-byte artifacts rejected;
- version mismatch in filenames rejected.

### Checksums

- known SHA-256 fixture matches;
- generated checksum file verifies successfully;
- modified artifact fails verification;
- missing artifact fails verification;
- duplicate checksum entries fail verification;
- checksum order is stable.

### SBOM

- valid JSON required;
- expected CycloneDX identity required;
- SafeLedger package/version present;
- malformed/empty SBOM rejected.

### Manifest

- version/tag/commit required;
- full 40-character commit SHA required;
- artifact hashes required;
- signing state constrained to defined values;
- secret-looking environment/path fields are forbidden.

### Workflow security

Static regression checks should verify:

- release workflow is tag-only;
- no `pull_request_target` publishing path;
- default permissions are not globally write-all;
- publish job depends on validation/attestation jobs;
- release-critical Actions are full-SHA pinned;
- production signing secret references occur only in trusted release context;
- PR workflows do not publish GitHub Releases.

### Legal/package hygiene

- full Apache license text exists;
- `NOTICE` exists;
- package build files include required legal files;
- package/lock root direct dependency metadata is consistent.

### Existing security continuity

All existing regression suites remain mandatory, including:

- crypto/envelope tests;
- continuity/import tests;
- backup/restore tests;
- sandbox/runtime-hardening tests;
- device-security tests;
- Recovery Intelligence / Privacy Mode tests;
- Windows/Linux GUI smoke tests.

---

# Release acceptance gates

SafeLedger 2.5 is **not ready to merge** until all are true:

1. PR targets current `master` after 2.4 is merged.
2. Package version remains inherited until implementation gates pass.
3. Windows full regression passes.
4. Linux full regression passes.
5. Windows Electron crypto smoke passes.
6. Linux Electron crypto smoke passes.
7. Windows real GUI smoke passes.
8. Linux real GUI smoke passes.
9. Windows Portable EXE builds.
10. Linux AppImage builds.
11. Full Apache license and NOTICE are present.
12. Required legal files are included in packaged output.
13. Contributor/security documents are present.
14. Tag/package mismatch tests pass.
15. Release ancestry policy tests pass.
16. Artifact completeness/naming tests pass.
17. Checksum generation and tamper-detection tests pass.
18. SBOM generation/validation passes.
19. Release manifest validation passes.
20. Release workflow uses least-privilege permissions.
21. Release-critical Actions are pinned to reviewed full SHAs.
22. PR workflows cannot publish releases or access production signing secrets.
23. Artifact attestation succeeds in the trusted release design/configuration.
24. Signing-enabled path is architecture-tested without committing signing material.
25. README verification instructions match the actual produced artifacts.
26. Package version is bumped to **2.5.0** only after gates 1–25 pass.
27. The exact final 2.5.0 head passes Windows and Linux CI again.

---

# Official publish gate after merge

After the exact 2.5.0 release candidate is merged:

1. Verify `master` points to/includes the reviewed release commit.
2. Confirm `master` CI is green.
3. Review final release notes.
4. Create annotated tag `v2.5.0` on the exact reviewed commit.
5. Trusted tag workflow validates tag/version/ancestry.
6. Windows and Linux builds/tests run from the tag commit.
7. Signing occurs if configured.
8. Final artifacts are staged.
9. SBOM is generated and validated.
10. Release manifest is generated.
11. SHA-256 checksums are generated after final binary staging/signing.
12. Checksums self-verify.
13. Artifact attestations succeed.
14. Only then create/publish the GitHub Release.
15. Verify the public release asset set matches the manifest.

If any step fails, fix the release process and create a new release attempt. Do not manually replace a published binary under the same version.

---

# Explicitly deferred from 2.5

Keep these out of 2.5 unless required to fix a release-security blocker:

- macOS packaging/notarization;
- Microsoft Store distribution;
- winget/Homebrew packaging;
- automatic in-app updates;
- telemetry;
- crash-reporting cloud services;
- cloud update checks;
- blockchain/network APIs;
- hardware-wallet communication;
- transaction signing;
- vault/data-schema changes;
- crypto primitive changes;
- backup format changes;
- general dependency/Electron major upgrades;
- reproducible-build claims without proof.

A strong candidate for **SafeLedger 2.6** is macOS distribution and notarization, because Apple signing/notarization and portable-data semantics deserve a separate platform-specific design and threat review.

---

## Current reference decisions verified during 2.5 planning

The plan deliberately follows current platform guidance rather than relying on older assumptions:

- GitHub recommends pinning Actions to full-length commit SHAs for immutable action references.
- GitHub artifact attestations bind artifact provenance to repository/workflow/commit context.
- OIDC-backed attestation requires explicit `id-token: write`; attestation storage requires dedicated attestation permissions.
- GitHub recommends explicit least-privilege workflow permissions.
- npm currently provides built-in CycloneDX/SPDX SBOM generation through `npm sbom`.

These external platform details should be rechecked at implementation time before pinning exact action SHAs or finalizing workflow syntax.

---

## Definition of “2.5 design complete”

This design is ready for implementation when:

- the release threat model is accepted;
- the official artifact contract is fixed;
- the release workflow topology is agreed;
- checksum/SBOM/provenance/signing responsibilities are separated clearly;
- product security invariants are explicit;
- implementation phases and regression gates are concrete;
- no 2.5 design item requires a runtime cloud dependency or vault-format change.

**This document satisfies the design/planning phase only. It does not authorize merging an unimplemented 2.5 release into `master`.**
