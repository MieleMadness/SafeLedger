# SafeLedger 2.4 — Recovery Intelligence & Validation

## Release goal
SafeLedger 2.4 turns existing recovery metadata into actionable, local-only readiness guidance. Target release version: **2.4.0**.

## Core scope
- Explainable Recovery Health Score per Wallet.
- Guided, non-destructive Test Recovery workflow.
- Offline BIP39 mnemonic structure/checksum validation.
- Offline Bitcoin Base58Check/Bech32/Bech32m and Ethereum/EVM address-format validation.
- Privacy-preserving duplicate detection.
- Privacy Mode that keeps sensitive fields masked by default.

## Non-negotiable invariants
- No changes to AES-256-GCM vault encryption or Argon2id key-envelope behavior.
- DEK remains main-process only.
- 1.x read-only import remains compatible.
- Backup v3 and v2 restore compatibility remain intact.
- Portable SafeLedgerData placement remains unchanged.
- SafeLedger 2.3 device/session locking behavior remains unchanged.
- No network dependency, balance lookup, signing, seed generation, or cloud sync.
- No recovery feature can trigger Self-Destruct.
- Secrets never enter global search or activity history.

## Recovery Health
Compute a local score from explicit checks such as recovery method/location, public address where relevant, instructions, last verification, last recovery drill, current verified backup, and Wallet-specific requirements. Return actionable check results but no secret values. Missing data is incomplete, not automatically unsafe.

## Guided Test Recovery
Expand the existing recovery drill into a step-by-step verification flow. Checklist answers remain ephemeral; completion stores only generic status/timestamp metadata. Optional mnemonic validation happens in memory and never writes the entered seed phrase to disk, logs, clipboard, or activity history.

## Offline validators
Create isolated modules such as `bip39-validator.js` and `address-validator.js`. Unsupported address families return `unsupported`, not `invalid`. Existing stored values are never rewritten automatically.

## Duplicate detection
Detect duplicate public addresses and other non-secret recovery metadata. For seed/private-key duplicate checks, use session-local keyed fingerprints only; never persist raw values or deterministic reusable secret hashes. Discard fingerprints at lock.

## Privacy Mode
Add a normalized setting such as `privacyMode`. Sensitive fields stay masked by default while Dashboard, health scores, public addresses, and recovery metadata remain usable. Explicit reveal controls and Emergency Lock behavior remain unchanged.

## Architecture phases
1. Pure Recovery Health model and unit tests.
2. Dashboard integration and Needs Attention ordering.
3. Guided Test Recovery refactor.
4. BIP39 validator.
5. BTC/EVM address validator.
6. Public duplicate detection.
7. Session-local sensitive duplicate fingerprints.
8. Privacy Mode through existing secure-field components.
9. Dedicated `scripts/recovery-intelligence-tests.js` regression suite.
10. Windows/Linux release validation.

## Regression gates
Tests must prove, at minimum:
- Recovery Health output contains no secrets.
- Date thresholds are deterministic at boundaries.
- Test Recovery stores only completion metadata.
- Valid/invalid BIP39 fixtures behave correctly.
- BTC Base58Check and Bech32/Bech32m fixtures validate correctly.
- EVM format/EIP-55 behavior is deterministic.
- Unsupported formats are not mislabeled invalid.
- Duplicate public addresses are detected.
- Sensitive fingerprints expose/persist no secrets and change across sessions.
- Privacy Mode is backward compatible and keeps secrets masked.
- Global search/activity history remain sanitized.
- 1.x import and v2/v3 backup compatibility remain green.
- Windows/Linux GUI smoke tests pass.

## Release gates
2.4 is ready only when all regressions, crypto smoke, real GUI smoke, Windows portable EXE build, and Linux AppImage build pass. Version moves to **2.4.0** only during final release preparation.

## Explicitly deferred
Live blockchain APIs, cloud sync, hardware-wallet communication, transaction signing, seed generation/correction, watch-only export files, encrypted attachments, macOS packaging/signing, and release SBOM/signing/checksum distribution.
