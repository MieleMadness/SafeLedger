# SafeLedger 2.4 — Recovery Intelligence & Validation

## Release status

**Release candidate: 2.4.0**

SafeLedger 2.4 turns existing recovery metadata into actionable, local-only readiness guidance while preserving the encryption, migration, backup, portability, and device-security guarantees of SafeLedger 2.3.

The full implementation head passed Windows and Linux regression, Electron crypto smoke, real GUI smoke, Windows portable packaging/artifact upload, and Linux AppImage packaging/artifact upload before the 2.4.0 version stamp. The exact 2.4.0 release-candidate head must pass the same gates before merge.

## Preserved invariants

- Existing SafeLedger 2.x vaults open without conversion.
- SafeLedger 1.x read-only import remains compatible.
- AES-256-GCM vault encryption is unchanged.
- Argon2id key-envelope behavior is unchanged.
- The Data Encryption Key remains main-process only and is explicitly zeroed on lock.
- Backup format v3 is unchanged.
- Backup format v2 remains accepted for restore compatibility.
- Portable `SafeLedgerData` placement is unchanged.
- SafeLedger 2.3 OS/storage/session locking behavior remains intact.
- Recovery-intelligence features never trigger Self-Destruct.
- No cloud service, telemetry, account, balance lookup, signing service, or runtime network dependency was introduced.

## Implemented outcomes

### 1. Explainable Wallet Recovery Health

Each Wallet can be scored from explicit readiness checks including documented recovery method/location, recovery instructions, public-address coverage where applicable, last verification, last Test Recovery, and current verified-backup state.

The model returns only check IDs, states, scores, counts, explanations, and recommended actions. It never returns seed phrases, private keys, passwords, PINs, recovery locations, public-address values, or backup paths.

Missing information is treated as **Incomplete**, not automatically unsafe. Stale verification/drill/backup state is **Needs Review** rather than a claim that funds are unrecoverable.

### 2. Recovery Dashboard intelligence

The Recovery Dashboard now refreshes Wallet readiness using current verified-backup context and adds a **Recovery Intelligence** section with local validation/duplicate status.

The renderer receives sanitized information only: counts, Wallet/Profile/Asset names needed for navigation/context, status/reason codes, and duplicate occurrence metadata. Raw addresses, seeds, private keys, HMAC fingerprints, recovery locations, and backup paths remain outside the Dashboard payload.

### 3. Guided Test Recovery

The existing recovery drill is presented as a guided, non-destructive **Test Recovery** workflow.

- Checklist answers remain in renderer memory only.
- Successful completion stores only `lastRecoveryDrill` and refreshed `lastVerified` timestamps.
- No secret is required to complete the checklist.
- An optional BIP39 checker accepts a temporary mnemonic in a password field, validates it locally, immediately clears the input, and returns only a generic validity/reason result.
- Temporary mnemonic input/results are never written to vault data, Settings, Activity History, clipboard, or network requests.

### 4. Offline BIP39 validation

SafeLedger bundles the official 2,048-word BIP39 English list and validates 12/15/18/21/24-word mnemonics for:

- supported word count,
- official word-list membership,
- BIP39 entropy/checksum structure.

The validator never echoes mnemonic words in its result. A SafeLedger-owned renderer-safe SHA-256 implementation is used for checksum validation so the sandbox does not gain Node `crypto` or `Buffer` privileges.

### 5. Offline Bitcoin and EVM address validation

Local validators support:

- Bitcoin Base58Check P2PKH/P2SH for recognized mainnet/testnet versions,
- Bitcoin Bech32 witness-v0,
- Bitcoin Bech32m witness-v1+,
- Ethereum/EVM 20-byte hexadecimal format,
- optional EIP-55 checksum classification using local Keccak-256.

Unsupported address families return `unsupported` rather than being mislabeled invalid. Existing stored values are never rewritten automatically.

### 6. Privacy-preserving duplicate detection

SafeLedger detects repeated public addresses and repeated normalized Wallet/recovery-method metadata without returning the duplicated value itself.

Seed-phrase/private-key duplicate detection uses a random 32-byte in-memory HMAC key. Fingerprints:

- exist only during the current process/unlocked session,
- are never persisted,
- are never returned to the renderer,
- change after key rotation/new session,
- are explicitly zeroed when SafeLedger locks.

The central lock path still clears the vault DEK first, then clears the duplicate-fingerprint session key before UI work.

### 7. Privacy Mode

A normalized `privacyMode` setting is enabled by default for new and legacy settings that do not contain an explicit value.

When enabled:

- sensitive fields remain collapsed/masked by default,
- sensitive Copy/QR shortcuts remain hidden until the field is deliberately opened,
- edit controls continue to use password-style masking with deliberate reveal controls,
- public addresses and non-secret Recovery Health metadata remain usable.

Privacy Mode does not weaken or replace Emergency Lock.

## Regression coverage

The mandatory regression suite now proves, among other existing guarantees:

1. Recovery Health output is deterministic and secret-free.
2. Verification/Test Recovery date boundaries are deterministic.
3. Verified-backup context affects scoring without exposing a path.
4. Guided Test Recovery stores only completion/verification timestamps.
5. Temporary BIP39 input is cleared immediately and has no persistence/clipboard/network route.
6. The bundled BIP39 word list contains exactly 2,048 unique official English words.
7. Valid/invalid BIP39 checksum fixtures behave correctly.
8. Renderer-safe SHA-256 matches standard SHA-256 vectors.
9. Bitcoin Base58Check and Bech32/Bech32m fixtures validate correctly.
10. Keccak-256/EIP-55 behavior is deterministic.
11. Unsupported address families are not mislabeled invalid.
12. Public-address duplicate output contains no address value.
13. Sensitive HMAC duplicate fingerprints are never returned/persisted and rotate across sessions.
14. Sensitive duplicate-session cleanup occurs after DEK clearing and before UI side effects.
15. Privacy Mode defaults on and explicit opt-out persists.
16. Recovery Intelligence preload/renderer boundaries expose sanitized results only.
17. Global Search and Activity History remain secret-free.
18. SafeLedger 1.x import, current vault crypto, and backup v2/v3 compatibility remain mandatory gates.
19. SafeLedger 2.3 storage/OS/Emergency Lock behavior remains green.

## Release acceptance gates

SafeLedger 2.4 may merge only when the exact **2.4.0** release-candidate head passes:

1. Full regression suite on Windows and Linux.
2. Electron crypto smoke on Windows and Linux.
3. Real GUI startup smoke on Windows and Linux.
4. Windows portable EXE build and artifact upload.
5. Linux AppImage build and artifact upload.
6. BIP39/address/duplicate/privacy regressions.
7. SafeLedger 1.x import continuity.
8. Backup v2/v3 compatibility.
9. Device-security/session-lock regressions.
10. No new runtime network dependency.

## Package/version strategy

The application package version is **2.4.0** for the final release candidate. The dependency graph is unchanged by the version stamp; the committed dependency lock remains the `npm ci` install source of truth.

Official tag/release publishing, checksums, SBOM, provenance, and signing remain part of the SafeLedger 2.5 Distribution & Trust work rather than this merge gate.

## Explicitly deferred

Live blockchain APIs, cloud sync, hardware-wallet communication, transaction signing, seed generation/correction, watch-only export files, encrypted attachments, macOS packaging/signing, official release SBOM/checksum/provenance publishing, and Windows signing are deferred beyond 2.4.
