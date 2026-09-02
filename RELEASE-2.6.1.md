# SafeLedger 2.6.1 — macOS Apple Silicon Foundation

## Status

**Development preview: 2.6.1**

SafeLedger 2.6.1 begins native macOS Apple Silicon support while preserving the Windows/Linux behavior and the existing SafeLedger encryption, backup, recovery, and portable-storage model.

This development release targets **Apple Silicon (`arm64`) only**. Intel/x64 Macs, universal binaries, and Rosetta compatibility are not targets for 2.6.1.

## Why 2.6.1 is a foundation release

The project does not currently have Apple Developer Program credentials. SafeLedger can still build and validate a native Apple Silicon application without those credentials, but an official public Mac release should eventually add Developer ID signing and Apple notarization.

For 2.6.1, the goal is to prove that SafeLedger can run and package natively on Apple Silicon without weakening its local-first design.

## Implemented in 2.6.1

### Native Apple Silicon packaging

- `package.json` version advances to **2.6.1**.
- Electron Builder receives a macOS ZIP target restricted to **arm64**.
- The development artifact is named `SafeLedger-2.6.1-macOS-arm64.zip`.
- `npm run dist:mac:arm64` prepares local icons/renderer assets and builds the arm64 Mac ZIP.
- Code-signing identity auto-discovery is disabled in CI, so the development build does not depend on Apple signing credentials.

### Native GitHub Actions validation

A dedicated `.github/workflows/macos-arm64.yml` workflow runs on GitHub's Apple Silicon macOS runner and verifies:

1. the runner reports `arm64`;
2. Node reports `arm64`;
3. locked dependencies install successfully;
4. the complete SafeLedger regression suite passes;
5. the Electron crypto smoke passes;
6. the real GUI startup smoke passes;
7. the macOS arm64 ZIP builds successfully;
8. the packaged SafeLedger executable reports **arm64 only** through `lipo`;
9. exactly one clearly named macOS arm64 ZIP is uploaded as a development artifact.

The workflow has read-only repository permissions and uses pinned GitHub Action revisions, matching the trust posture of the Windows and Linux validation workflows.

### Portable `SafeLedgerData` path on macOS

A packaged Mac application runs from a bundle path similar to:

```text
/Volumes/SafeLedger/SafeLedger.app/Contents/MacOS/SafeLedger
```

SafeLedger 2.6.1 now recognizes the enclosing `.app` bundle and resolves the portable root to the directory containing `SafeLedger.app`:

```text
/Volumes/SafeLedger/
├─ SafeLedger.app
└─ SafeLedgerData/
```

It does **not** intentionally redirect normal vault storage into `~/Library/Application Support`, iCloud, or the signed `.app` bundle.

The runtime helper also exposes checks for macOS App Translocation and whether the resolved portable directory is writable. These diagnostics are intended to support safe startup handling without ever treating a storage-location problem as a failed password or Self-Destruct event.

## Signing and notarization

SafeLedger 2.6.1 does **not** claim Developer ID signing or Apple notarization.

Those features require Apple Developer Program credentials and are intentionally deferred. When credentials become available, the next signing phase should add:

- Developer ID Application signing;
- Hardened Runtime review;
- notarization;
- stapling;
- `codesign` verification;
- Gatekeeper (`spctl`) verification;
- release-document instructions for users.

Signing credentials must never be committed to the repository or exposed to pull-request workflows.

## Security invariants

The Apple Silicon work must not change:

- AES-256-GCM vault encryption;
- Argon2id master-password/key-envelope behavior;
- main-process-only Data Encryption Key handling;
- SafeLedger 2.x vault/schema compatibility;
- SafeLedger 1.x read-only import behavior;
- backup v3 generation or backup v2 restore compatibility;
- Privacy Mode;
- Recovery Intelligence privacy guarantees;
- portable `SafeLedgerData` ownership;
- centralized device/session locking;
- Self-Destruct semantics;
- normal offline/local-first operation.

A macOS storage-path, App Translocation, packaging, or signing problem is never a password failure and must never trigger Self-Destruct.

## 2.6.1 acceptance goal

Before the Apple Silicon foundation is considered successful, the exact development head should pass the new native macOS workflow and continue passing the repository's regression suite. Windows and Linux support remain unchanged by this work.

2.6.1 is a development milestone, not yet a claim that SafeLedger has a signed/notarized consumer-ready Mac distribution.
