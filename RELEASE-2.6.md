# SafeLedger 2.6 — macOS Apple Silicon Distribution & Platform Hardening

## Status

**Design complete / implementation not started.**

Target release version: **2.6.0**  
Target architecture: **macOS arm64 only**  
Target platform: **Apple Silicon Macs only**

SafeLedger 2.6 adds a native macOS distribution path for Apple Silicon while preserving the local-first, portable, encrypted architecture established in SafeLedger 2.1–2.5.

There is intentionally **no Intel x64 build, no universal binary, and no Rosetta support target** in this release. Supporting a single Mac architecture keeps the signing, notarization, dependency, runtime, storage, and security test matrix focused and auditable.

## Release thesis

SafeLedger should run on modern Apple Silicon Macs with the same product guarantees users receive on Windows and Linux:

- vault data remains local and encrypted;
- the Data Encryption Key remains main-process only;
- SafeLedger can operate without a cloud account or runtime network service;
- portable data remains under the user's control;
- OS lock, sleep/resume, removable-storage loss, Emergency Lock, Privacy Mode, Recovery Intelligence, backups, and 1.x import keep their existing semantics;
- official macOS downloads are signed, notarized, checksummed, included in the SBOM/release manifest, and covered by the 2.5 provenance pipeline.

## Non-negotiable product invariants

2.6 must not change:

- AES-256-GCM vault encryption;
- Argon2id password/key-envelope behavior;
- main-process-only DEK handling;
- SafeLedger 2.x vault schema;
- SafeLedger 1.x read-only import semantics;
- backup v3 generation or backup v2 restore compatibility;
- Recovery Health scoring;
- Guided Test Recovery;
- Privacy Mode;
- BIP39/address validation;
- duplicate-detection privacy guarantees;
- Self-Destruct rules;
- offline/local-first normal operation.

## Architecture scope

### Supported

- macOS on Apple Silicon (`arm64`)
- Electron arm64 runtime
- arm64 application bundle
- signed DMG or ZIP distribution chosen during implementation based on reliable portable-data behavior
- Apple Developer ID Application signing
- Apple notarization
- notarization stapling where applicable
- Gatekeeper-compatible first launch

### Explicitly unsupported in 2.6

- Intel (`x64`) Macs
- universal binaries
- Rosetta compatibility guarantees
- Mac App Store packaging
- iOS/iPadOS
- automatic updates
- iCloud synchronization
- Keychain migration of vault secrets

## Portable storage rule

SafeLedger must not silently relocate vault data into `~/Library/Application Support`, iCloud, or another hidden user-profile location simply because it is running on macOS.

The target layout is conceptually:

```text
SafeLedger/
├─ SafeLedger.app
└─ SafeLedgerData/
   ├─ settings/
   └─ vaults/
```

`SafeLedgerData` must live beside the distributed application container or beside the user-selected portable launcher location, never inside the signed `.app` bundle.

Implementation must account for macOS translocation/quarantine behavior. If Gatekeeper translocation prevents a stable adjacent writable data location, SafeLedger must present a clear setup instruction rather than silently creating a second vault location.

If the intended portable data location is unwritable, SafeLedger must fail clearly and safely. It must not fall back to a hidden cloud/profile path.

## Platform-security work

### OS lock and session behavior

Validate the SafeLedger 2.3 centralized lock path against macOS events:

- screen lock;
- system sleep;
- system resume;
- fast user switching where Electron exposes a reliable signal;
- idle lock state;
- application hide/minimize behavior;
- storage disappearance while unlocked.

Every device/OS event remains a **lock-only** condition and can never trigger Self-Destruct.

The DEK must still be zeroed before renderer/window cleanup.

### Removable storage

Test external APFS, HFS+, and exFAT volumes where practical.

Validate:

- storage identity creation;
- writable-state checks;
- disconnect while unlocked;
- reconnect behavior;
- application launch from removable media;
- movement of the complete SafeLedger + `SafeLedgerData` directory between machines;
- restore-created storage identity rotation.

No hardware serial number or unrelated volume metadata should enter logs, Settings, or the renderer.

## macOS packaging

Add an Electron Builder macOS target restricted to `arm64`.

Expected artifact naming should make architecture explicit, for example:

```text
SafeLedger-2.6.0-macOS-arm64.dmg
```

or, if ZIP is selected after portability testing:

```text
SafeLedger-2.6.0-macOS-arm64.zip
```

Do not generate an x64 artifact.

The chosen artifact must be reproducibly discoverable by release scripts and must fail the release if zero or multiple matching Mac artifacts exist.

## Signing and notarization

Official 2.6 macOS publishing requires:

- Apple Developer ID Application identity;
- signing credentials isolated to trusted tag/release context;
- Hardened Runtime where compatible with Electron requirements;
- entitlements reviewed and minimized;
- notarization submitted only after the complete macOS test/build gate succeeds;
- notarization success verified;
- stapling verified when the chosen artifact supports it;
- post-signature verification with native Apple tooling.

Apple credentials must never be exposed to pull-request workflows.

PR CI should be able to build/test an unsigned arm64 artifact without production signing credentials when GitHub runner capabilities permit it.

## GitHub Actions design

Add a separate macOS arm64 CI workflow, proposed:

```text
.github/workflows/macos-arm64.yml
```

PR/push validation should include:

1. locked dependency installation;
2. full regression suite;
3. Electron crypto smoke;
4. real GUI startup smoke where runner UI capabilities allow reliable automation;
5. macOS-specific portability regression tests;
6. device/session-lock regression tests;
7. arm64 package build;
8. artifact upload.

All Actions remain pinned to reviewed full commit SHAs.

The official 2.5 release workflow should be extended only after the macOS path is green. The release graph then becomes:

```text
preflight
 ├─ windows
 ├─ linux
 ├─ macos-arm64
 └─ sbom
       ↓
collect-and-verify
       ↓
attest
       ↓
publish
```

If macOS is a required 2.6 artifact, any macOS signing/notarization/build failure must stop the whole official 2.6 release.

## Release metadata

Extend the release manifest to include the macOS artifact with:

- filename;
- architecture: `arm64`;
- SHA-256;
- byte length;
- source commit;
- signing state;
- notarization state;
- stapling state where applicable.

The macOS artifact must be listed in `SHA256SUMS.txt` and included in provenance/attestation coverage.

The SBOM remains one dependency-graph SBOM for the tagged source unless implementation demonstrates a material architecture-specific dependency difference requiring separate metadata.

## User-facing verification

Update `RELEASE-VERIFICATION.md` with macOS instructions covering:

- SHA-256 verification with `shasum -a 256`;
- Gatekeeper signature inspection using native Apple tools;
- notarization/stapling verification where applicable;
- expected Apple Silicon architecture;
- clear statement that Intel Macs are unsupported.

Documentation must never instruct users to globally disable Gatekeeper or remove security protections as the normal installation path.

## Test additions

Create a dedicated macOS platform regression suite proving at minimum:

1. packaging configuration contains only `arm64`;
2. no `x64` or universal target is produced;
3. `SafeLedgerData` is never placed inside `SafeLedger.app`;
4. portable root calculation is deterministic on macOS;
5. unwritable portable root fails clearly rather than silently falling back;
6. DEK/session cleanup ordering remains intact;
7. macOS lock/sleep/resume routes use the centralized lock controller;
8. storage disappearance remains lock-only;
9. Privacy Mode and Recovery Intelligence behavior is unchanged;
10. no runtime network dependency is added;
11. signing/notarization credentials appear only in trusted release context;
12. release workflow expects exactly one Mac arm64 artifact;
13. checksum/release-manifest tooling includes the Mac artifact;
14. official macOS artifact is attested before release publication.

## Implementation phases

### Phase A — macOS runtime portability

- Add platform-aware portable-root logic/tests.
- Test `.app` bundle location behavior and Gatekeeper translocation cases.
- Add clear unwritable-location failure UX.
- Verify storage identity and disconnect behavior.

### Phase B — arm64 CI packaging

- Add Electron Builder arm64 config.
- Add macOS arm64 CI workflow.
- Add GUI/runtime/package smoke gates.
- Confirm no x64 output exists.

### Phase C — signing/notarization

- Define minimal entitlements.
- Add Developer ID signing in trusted tag context.
- Add notarization and verification.
- Add stapling where supported.

### Phase D — 2.5 release-pipeline integration

- Extend artifact collector.
- Extend checksum manifest.
- Extend release manifest.
- Extend provenance/attestation.
- Extend verification docs.

### Phase E — release candidate

Only after unsigned CI is green and trusted signing/notarization gates are validated:

- bump package to `2.6.0`;
- update README and this release record;
- run Windows/Linux/macOS-arm64 final gates on the exact release head;
- merge through protected `master`;
- create `v2.6.0` only from the merged verified commit.

## Acceptance gates

2.6 may be called complete only when:

1. macOS output is arm64-only;
2. no Intel/universal artifact is generated;
3. current Windows/Linux gates remain green;
4. full regression passes on the macOS arm64 environment;
5. Electron crypto behavior remains green;
6. GUI startup is validated on macOS;
7. portable data placement is validated outside the `.app` bundle;
8. external-storage removal safely locks the session;
9. sleep/lock/resume safely locks the session;
10. signing succeeds for official artifacts;
11. notarization succeeds;
12. Gatekeeper verification succeeds without instructing users to disable security;
13. SHA-256 generation/verification includes the Mac artifact;
14. release manifest identifies `arm64` and signing/notarization state;
15. provenance covers the Mac artifact;
16. credentials are inaccessible to PR context;
17. 1.x import and backup v2/v3 continuity remain green;
18. no vault schema or cryptographic format change occurs;
19. no runtime cloud dependency is introduced;
20. the exact `2.6.0` release head passes the complete required matrix before merge/tagging.

## Deferred beyond 2.6

- Intel/x64 macOS
- universal binaries
- Mac App Store
- automatic updates
- package-manager distribution
- iOS/iPadOS
- hardware-wallet integration
- cloud sync
- schema/crypto migrations

These should be separate releases if ever pursued.
