# SafeLedger

SafeLedger is a **free, local-first, offline encrypted information vault** for organizing cryptocurrency recovery information. It stores Profiles, Wallets, Assets, public addresses, recovery details, private keys, balances, notes, and related information in encrypted files that remain under your control.

SafeLedger does not require a cloud account, subscription, license server, or network connection for normal vault operation.

## Release status

### Current stable release: SafeLedger 2.5.0

SafeLedger **2.5.0** is the version currently merged into protected `master`.

The current release includes the SafeLedger 2.1 continuity/security foundation, 2.2 runtime modernization, 2.3 device-security layer, 2.4 Recovery Intelligence & Validation, and 2.5 Distribution, Trust & Open Source Readiness work.

Key capabilities include:

- Portable `SafeLedgerData` storage beside the packaged application
- AES-256-GCM authenticated vault encryption
- Argon2id master-password protection
- Random 256-bit Data Encryption Key (DEK) protected by a key envelope
- Main-process-only DEK handling
- Versioned vault `schemaVersion` support
- Read-only SafeLedger 1.x import into current encrypted vaults
- Complete backup format v3 with SHA-256 integrity manifests
- Version-2 complete-backup restore compatibility
- Non-destructive **Verify Backup**
- Staged restore with a pre-restore safety copy
- Brute-force lockout protection
- Self-Destruct Protection disabled by default for new settings
- Hardened Electron sandbox / IPC boundaries
- Explicit preload/renderer bridge with no renderer-side Electron compatibility shim
- SafeLedger-owned CSS Grid/Flexbox application shell
- User-facing hierarchy standardized on **Profile → Wallet → Asset**
- Host operating-system locale/timezone for displayed timestamps
- Global Search, Recovery Dashboard, Activity History, recovery sheets, custom fields, and wallet metadata
- Centralized main-process locking for Emergency Lock and device-security events
- OS lock, suspend/resume, idle-state, and portable-storage session protection where supported
- Sanitized Storage Health and backup-age awareness
- Explainable Wallet-level **Recovery Health** scoring
- Guided, non-destructive **Test Recovery** workflow
- Offline BIP39 mnemonic validation using the official English word list
- Offline Bitcoin Base58Check, Bech32, and Bech32m validation
- Offline Ethereum/EVM format and EIP-55 checksum validation
- Privacy-preserving duplicate recovery-data detection
- Session-only keyed fingerprints for sensitive duplicate checks, cleared on lock
- **Privacy Mode**, enabled by default, for masked sensitive information
- Sanitized Recovery Intelligence output that does not expose seeds, private keys, raw fingerprints, recovery locations, or backup paths
- Emergency Lock that clears the active encryption session, minimizes SafeLedger, resets the renderer, and returns to a fresh login state
- Protected-branch release workflow with required Windows and Linux validation
- Tag/version/source-ancestry release preflight
- SHA-256 release checksums with self-verification
- CycloneDX SBOM generation from the committed dependency graph
- Machine-readable release manifest with source commit and artifact hashes
- GitHub artifact provenance/attestation support for official binaries
- Optional isolated Windows Authenticode signing path
- Full Apache 2.0 license, NOTICE, third-party attribution, contributor, and security documentation
- User-facing official-download verification guidance in `RELEASE-VERIFICATION.md`

> [!IMPORTANT]
> SafeLedger **2.6** is the next planned release and is intentionally scoped to **macOS Apple Silicon (`arm64`) only**. Intel/x64 Macs, universal binaries, and Rosetta compatibility are not 2.6 targets.

## Release roadmap

### SafeLedger 2.1 — Continuity & Hardening

Released foundation covering authenticated encryption continuity, versioned vault schemas, read-only 1.x import, backup verification, hardened Electron boundaries, and safer restore behavior.

### SafeLedger 2.2 — Runtime Modernization

Released modernization covering the explicit renderer/preload bridge, removal of the renderer Electron compatibility shim, SafeLedger-owned native layout/styles/icons, Profile → Wallet → Asset terminology, and host-local time display.

### SafeLedger 2.3 — Device Security & Recovery Health

Released as **2.3.0**.

Included:

- One centralized main-process session-lock path
- OS lock and suspend/resume protection where supported
- Removable-storage / `SafeLedgerData` availability monitoring
- Local random storage identity checks
- Sanitized Storage Health reporting
- Backup-age and verification-age awareness
- Generic privacy-safe device-security activity events
- Dashboard and Settings health presentation

Storage removal, suspend, resume, OS-lock, or idle-state handling **locks only**. These events never trigger Self-Destruct.

### SafeLedger 2.4 — Recovery Intelligence & Validation

Released as **2.4.0**.

Included:

- Explainable Wallet-level Recovery Health scoring
- Verified-backup context in recovery readiness
- Guided non-destructive Test Recovery
- Optional ephemeral BIP39 validation
- Offline Bitcoin and EVM address-format/checksum validation
- Public recovery-metadata duplicate detection
- Session-only keyed sensitive duplicate detection
- Privacy Mode enabled by default
- Sanitized Recovery Intelligence Dashboard
- Dedicated privacy, sandbox, validation, and duplicate-detection regression gates

Recovery-intelligence features remain offline. Seeds, private keys, passwords, PINs, raw duplicate fingerprints, recovery locations, and backup paths are not returned by Recovery Intelligence or sent to external APIs.

### SafeLedger 2.5 — Distribution, Trust & Open Source Readiness

Released as **2.5.0**.

Included:

- Tag-only, fail-closed official GitHub Release publishing
- Exact tag/package-version and protected-`master` source validation
- Required Windows and Linux release validation
- Least-privilege release workflow permissions
- Full-SHA pinning for release-critical and normal CI GitHub Actions
- Windows Portable EXE and Linux AppImage artifact contract
- SHA-256 checksums and self-verification
- CycloneDX SBOM generation and live regression coverage
- Machine-readable release manifest
- GitHub artifact attestations / build provenance
- Windows Authenticode signing-ready architecture with credentials isolated to the signing step
- Normalized 2.5 dependency lock matching the current application graph
- Complete Apache 2.0 licensing, NOTICE, and third-party attribution
- Contributor, security, collaboration, PR, and issue documentation
- Official-download verification instructions
- Dedicated distribution-trust regression suite and fail-closed release gates

2.5 does not change the vault crypto format, Argon2id behavior, backup compatibility, portable data layout, device locking, Recovery Intelligence, or local-first/offline operating model.

### SafeLedger 2.6 — macOS Apple Silicon Distribution & Platform Hardening

**Planned target.** SafeLedger 2.6 is intentionally macOS **arm64-only**.

Planned focus includes Apple Silicon packaging, Developer ID signing, notarization/stapling, Gatekeeper validation, macOS lock/sleep/resume behavior, removable-storage handling, and preserving `SafeLedgerData` beside the application. Intel/x64, universal binaries, and Rosetta compatibility are explicitly out of scope.

## How SafeLedger is organized

```text
Profile
└─ Wallet
   └─ Asset
```

### Profile

A Profile is the top-level container. Profiles can separate people, purposes, businesses, storage strategies, or other recovery groupings. Each Profile has its own encrypted vault file.

### Wallet

Wallets can store information such as:

- Name and wallet category
- Tags and notes
- Password
- PIN code
- Recovery link
- Seed phrase
- Recovery location/instructions
- Wallet metadata
- Custom fields
- Assets associated with the Wallet
- Recovery verification and Test Recovery timestamps

SafeLedger does not require a seed phrase or private key to be stored. Decide which secrets you are comfortable keeping digitally.

### Asset

Assets can store information such as:

- Name and symbol
- Public address
- Tags
- Balance
- Private key, when you choose to store one
- Notes
- Custom fields

## Portable data layout

For packaged builds, SafeLedger creates and uses `SafeLedgerData` in the same folder as the SafeLedger application you launch.

### Windows portable example

```text
D:\My SafeLedger\
├─ SafeLedger-2.5.0-Portable.exe
└─ SafeLedgerData\
   ├─ settings\
   └─ vaults\
```

### Linux AppImage example

```text
/home/user/Apps/SafeLedger/
├─ SafeLedger-2.5.0-x86_64.AppImage
└─ SafeLedgerData/
   ├─ settings/
   └─ vaults/
```

Keep the application and its complete `SafeLedgerData` folder together. This allows SafeLedger to run from a local folder or removable drive without a license or cloud account.

When moving SafeLedger, close the application first and move **both** the application and `SafeLedgerData`. Do not manually merge different data folders; use SafeLedger Backup, Restore, or the 1.x importer when appropriate.

`SafeLedgerData/storage-id.json` contains a random non-secret local storage marker used to detect storage changes during unlocked sessions. Device-local storage identity is not carried inside backups; a valid restore establishes a fresh local identity.

## Encryption and desktop security

SafeLedger 2.x uses **AES-256-GCM** authenticated encryption with the `SLG2` encrypted payload format. The master password protects a random 256-bit DEK through an **Argon2id** key envelope. Changing the master password re-wraps the DEK instead of re-encrypting every vault solely because the password changed.

The raw DEK remains in the trusted main process and is not exposed to the renderer.

The Electron renderer uses:

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- restrictive Content Security Policy
- denied unexpected navigation/new windows
- denied renderer permission requests
- no direct renderer filesystem or Node access

SafeLedger routes non-password device locks through one centralized main-process controller. The DEK is cleared before window/minimize/reload operations, and repeated lock signals do not recreate an unlocked session.

## Recovery Intelligence and Privacy Mode

SafeLedger 2.4 adds local-only recovery analysis without turning the application into a blockchain client or cloud service.

Recovery Health evaluates documented recovery method/location, instructions, public-address coverage where applicable, verification age, Test Recovery age, and verified-backup context. Results are designed to be actionable without returning secret values.

The Test Recovery workflow can optionally validate a BIP39 mnemonic locally. The temporary mnemonic input is cleared after validation and is not written to disk, Activity History, clipboard, or a network service.

Privacy Mode defaults to enabled. Sensitive fields remain masked/collapsed until deliberately revealed, and sensitive Copy/QR shortcuts stay hidden until reveal where applicable.

Duplicate detection uses public metadata directly only for sanitized matching. Sensitive seed/private-key duplicate checks use session-local keyed fingerprints that are discarded when SafeLedger locks and are never persisted as reusable hashes.

## SafeLedger 1.x import

SafeLedger 2.1+ can import original SafeLedger 1.x data through an isolated, read-only migration path.

Open:

**SafeLedger → Settings → Import SafeLedger 1.x Data**

The importer reads the original encrypted data, authenticates it with the supplied 1.x master password, creates new current-format encrypted Profile files, and leaves the original 1.x files unchanged.

Keep an untouched backup of the original 1.x data even after a successful import.

## Backup, Verify, and Restore

Open:

**SafeLedger → Settings → Backup & Recovery**

### Backup

SafeLedger creates a `.slgbak` file containing a complete encrypted backup of the current SafeLedger data set. Backup format v3 includes a SHA-256 integrity digest for every included file.

Store backups separately from the working SafeLedger folder so a single drive failure does not destroy both the live vault and its backup.

SafeLedger records successful backup timestamps for backup-age awareness. The selected backup path is not persisted in Settings.

### Verify Backup

**Verify Backup** checks a backup without modifying active SafeLedger data. Verification includes backup structure, safe paths, integrity hashes, key-envelope structure, encrypted vault authentication, and Profile/Wallet/Asset counts.

SafeLedger records the verification timestamp and verified backup creation timestamp without persisting the backup path.

### Restore

SafeLedger supports current version-3 complete backups and retains version-2 restore compatibility. Before replacing active data, SafeLedger creates a pre-restore safety copy. A successful restore clears the active session and reloads SafeLedger.

## Emergency Lock and automatic lock

The SafeLedger shield button in the bottom-right provides **Emergency Lock**. It clears visible sensitive state, clears the active DEK/session, records a generic security event when storage is available, minimizes SafeLedger, reloads the renderer from the trusted main process, and returns to a fresh login state.

SafeLedger can also lock an unlocked session when the operating system locks or suspends, on resume as a fail-safe, when supported idle-state signals indicate locking, or when expected portable storage becomes unavailable or changes identity. These paths never auto-unlock and never count as failed-password Self-Destruct attempts.

## Brute Force and Self-Destruct Protection

SafeLedger tracks failed login attempts and can temporarily lock login after too many failures.

Self-Destruct Protection is **off by default for new settings**. Existing settings that explicitly enabled it remain enabled.

> [!CAUTION]
> Self-Destruct Protection is intentionally destructive. Keep verified backups before enabling it.

Storage removal, system sleep, OS locking, Emergency Lock, and other device-security events are separate from password-failure Self-Destruct behavior and must never be treated as failed password attempts.

## Clipboard, QR, printing, and activity history

Sensitive Copy actions automatically clear the clipboard after a short period when the clipboard still contains the copied SafeLedger value.

QR generation and recovery-sheet generation are local and do not require online services.

SafeLedger maintains a local `audit.log` under `SafeLedgerData/settings`. Activity entries contain generic event types and timestamps rather than passwords, seed phrases, private keys, wallet names, storage identifiers, recovery locations, or backup paths.

## Official release verification

Official SafeLedger releases include `SHA256SUMS.txt`, `release-manifest.json`, a CycloneDX SBOM, legal/attribution files, and `RELEASE-VERIFICATION.md` alongside the platform binaries. The release workflow verifies checksums before publication and publishes only after its required build/provenance chain succeeds.

Checksums prove that a downloaded file matches the published digest. They are not a guarantee that software contains no vulnerabilities. Windows Authenticode signing is reported separately from checksum/provenance status.

## Development

Install locked dependencies:

```bash
npm ci --no-audit --no-fund
```

Start SafeLedger:

```bash
npm start
```

Run the full regression suite:

```bash
npm run test:regression
```

Run device-security regressions:

```bash
npm run test:device-security
```

Run Recovery Intelligence regressions:

```bash
npm run test:recovery-intelligence
```

Run the Electron crypto smoke test:

```bash
npm run test:electron-crypto
```

Run the real GUI smoke test:

```bash
npm run test:gui-smoke
```

Build Windows portable:

```bash
npm run dist:win
```

Build Linux AppImage:

```bash
npm run dist:linux
```

Release changes are expected to pass regression, crypto, GUI, SBOM, distribution-trust, and packaging checks before implementation is considered releasable.

## Release documents

- `RELEASE-2.1.md` — Continuity & Hardening
- `RELEASE-2.2.md` — Runtime Modernization
- `RELEASE-2.3.md` — Device Security & Recovery Health
- `RELEASE-2.4.md` — released Recovery Intelligence & Validation
- `RELEASE-2.5.md` — released Distribution, Trust & Open Source Readiness
- `RELEASE-VERIFICATION.md` — official download verification guidance

The SafeLedger 2.6 macOS Apple Silicon plan is maintained on its development branch until that release work is ready to move onto `master`.

## Recommended operating practices

- Keep the SafeLedger application and `SafeLedgerData` together.
- Use the built-in `.slgbak` Backup function regularly.
- Use **Verify Backup** after creating important backups.
- Keep at least one backup on a separate device or location.
- Preserve original SafeLedger 1.x files after migration.
- Use a long, unique master password or passphrase.
- Treat seed phrases and private keys as highly sensitive secrets.
- Use full-disk encryption on the computer or removable drive containing SafeLedger.
- Use Emergency Lock when stepping away.
- Keep Self-Destruct disabled unless its destructive behavior is specifically required and understood.

## What SafeLedger is not

SafeLedger is an encrypted information organizer. It is not a cryptocurrency exchange, blockchain node, hardware wallet, or transaction-signing device.

Storing a seed phrase or private key in any software creates risk. Maintain appropriate offline recovery backups for critical assets.

## License

SafeLedger is licensed under the Apache License 2.0. See `LICENSE` for the complete license text, `NOTICE` for SafeLedger attribution/history, and `THIRD-PARTY-NOTICES.md` for third-party attribution information.
