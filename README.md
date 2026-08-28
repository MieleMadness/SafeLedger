# SafeLedger

SafeLedger is a **free, local-first, offline encrypted information vault** for organizing cryptocurrency wallet and asset recovery information. It stores Profiles, Wallets, public addresses, recovery information, private keys, balances, notes, and related details in encrypted files that remain under your control.

SafeLedger does not require a cloud account, subscription, license server, or network connection for normal vault operation.

## Release status

### Current stable release: SafeLedger 2.1.0

SafeLedger 2.1 is the version currently merged into `master`.

It includes:

- Portable `SafeLedgerData` storage beside the packaged application
- AES-256-GCM authenticated vault encryption
- Argon2id master-password protection
- A random 256-bit Data Encryption Key (DEK) protected by a key envelope
- Main-process-only DEK handling
- Versioned vault `schemaVersion` support
- Read-only SafeLedger 1.x import into new 2.x encrypted vaults
- Complete backup format v3 with SHA-256 file integrity manifests
- Non-destructive **Verify Backup**
- Version-2 complete-backup restore compatibility
- Staged restore with a pre-restore safety copy
- Brute-force lockout protection
- Self-Destruct Protection disabled by default for new settings
- Hardened Electron sandbox / IPC boundaries
- Global Search, Recovery Dashboard, Activity History, recovery sheets, recovery drills, custom fields, and wallet metadata
- Emergency Lock that clears the active encryption session, minimizes SafeLedger, resets the renderer, and returns the application to a fresh login state

> [!IMPORTANT]
> **SafeLedger 2.2, 2.3, 2.4, and 2.5 are development release tracks. They are not part of the current stable `master` release until their implementation, Windows CI, Linux CI, crypto smoke, GUI smoke, and packaging gates pass and their pull requests are merged.**

## Release roadmap

### SafeLedger 2.2 — Runtime Modernization

Development target: **2.2.0**

Focus:

- Remove the remaining renderer Electron compatibility layer
- Move renderer code to an explicit SafeLedger preload/renderer boundary
- Replace Bootstrap 3 application-shell dependency with SafeLedger-owned CSS Grid/Flexbox
- Replace Font Awesome 4 / Glyphicons with local bundled icons
- Standardize visible terminology on **Profile → Wallet → Asset**
- Use the host operating-system timezone for display timestamps
- Add runtime-modernization regression gates

2.2 must preserve the 2.1 encryption format, backup formats, 1.x importer, portable data layout, and Emergency Lock behavior.

### SafeLedger 2.3 — Device Security & Recovery Health

Development target: **2.3.0**

Focus:

- Centralized main-process session locking
- OS lock and suspend/resume protection where supported
- Removable-storage / `SafeLedgerData` availability monitoring
- Local storage identity checks so a different device at the same path is not silently trusted
- Storage-health reporting
- Backup-age and verification-age awareness
- Generic privacy-safe device-security audit events

Storage removal, suspend, resume, or OS-lock handling must **lock only**. These events must never trigger Self-Destruct.

### SafeLedger 2.4 — Recovery Intelligence & Validation

Development target: **2.4.0**

Focus:

- Explainable Wallet-level Recovery Health scoring
- Guided non-destructive Test Recovery workflow
- Offline BIP39 mnemonic validation
- Offline Bitcoin and EVM address-format validation
- Privacy-preserving duplicate detection
- Privacy Mode for masked-by-default sensitive information

Recovery-intelligence features remain offline and must not send seeds, private keys, passwords, PINs, addresses, or recovery material to external APIs.

### SafeLedger 2.5 — Distribution, Trust & Open Source Readiness

Development target: **2.5.0**

Focus:

- Tag-only official release publishing
- SHA-256 checksums for official binaries
- Machine-readable SBOM generation
- Build provenance / artifact attestation where supported
- Complete Apache 2.0 licensing and attribution files
- Contributor and security documentation
- Issue / pull-request templates
- Fail-closed release checklist
- Windows code-signing integration readiness
- Download-verification instructions

Actual Windows signing remains optional until a trusted signing certificate is configured. Signing secrets and private keys must never be committed to the repository.

## How SafeLedger is organized

```text
Profile
└─ Wallet
   └─ Asset
```

### Profile

A Profile is the top-level container. Profiles can separate people, purposes, businesses, storage strategies, or any other grouping you choose. Each Profile has its own encrypted vault file.

### Wallet

Wallets can store information such as:

- Name and wallet category
- Tags and notes
- Password
- PIN code
- Recovery link
- Seed phrase
- Wallet metadata
- Custom fields
- Assets associated with the Wallet
- Recovery verification and recovery-drill information

Sensitive Wallet values are collapsed in normal View mode and can be revealed or copied locally when needed.

### Asset

Assets can store information such as:

- Name
- Symbol
- Public address
- Tags
- Balance
- Private key, when you choose to store one
- Notes
- Custom fields

SafeLedger does not require private keys or seed phrases to be stored. Decide which secrets you are comfortable keeping digitally.

## Portable data layout

For packaged builds, SafeLedger creates and uses `SafeLedgerData` in the same folder as the SafeLedger application you launch.

### Windows portable example

```text
D:\My SafeLedger\
├─ SafeLedger-2.1.0-Portable.exe
└─ SafeLedgerData\
   ├─ settings\
   └─ vaults\
```

### Linux AppImage example

```text
/home/user/Apps/SafeLedger/
├─ SafeLedger-2.1.0-x86_64.AppImage
└─ SafeLedgerData/
   ├─ settings/
   └─ vaults/
```

The application and its `SafeLedgerData` folder should stay together. This allows SafeLedger to run from a local folder or removable drive without requiring a license or cloud account.

### Moving SafeLedger

Close SafeLedger first, then move **both** the application and the complete `SafeLedgerData` folder.

Moving only the executable/AppImage can cause SafeLedger to create a new empty data folder at the new location, making existing Profiles appear to be missing.

Do not manually merge two different `SafeLedgerData` folders. Use SafeLedger Backup, Restore, or the 1.x importer when appropriate.

## SafeLedger 2.x encryption

### Argon2id master-password protection

SafeLedger derives the master-password protection key with **Argon2id** and a random salt.

Current defaults:

- 64 MiB memory
- 3 passes
- Parallelism of 1
- 256-bit derived key

### Random Data Encryption Key

SafeLedger generates a random 256-bit Data Encryption Key (DEK). The master password protects the DEK through a key envelope rather than serving directly as the vault encryption key.

Changing the master password re-wraps the DEK instead of re-encrypting every vault solely because the password changed.

### AES-256-GCM authenticated encryption

Current 2.x vault files use **AES-256-GCM** authenticated encryption and the `SLG2` encrypted payload format.

Authenticated encryption helps SafeLedger detect modified, damaged, or unauthenticated ciphertext instead of silently accepting it.

The raw DEK remains in the trusted main process and is not exposed to the renderer.

## SafeLedger 1.x import

SafeLedger 2.1+ can import the original SafeLedger 1.x data format through an isolated, read-only migration path.

Open:

**SafeLedger → Settings → Import SafeLedger 1.x Data**

The importer:

1. Reads the selected original 1.x data folder.
2. Authenticates it using the supplied 1.x master password.
3. Reads the original encrypted vault list and Profile vaults.
4. Creates new current-format Profile files protected by the active 2.x DEK.
5. Leaves the original 1.x files unchanged.

Keep an untouched backup of the original 1.x data even after a successful import.

## Backup, Verify, and Restore

Open:

**SafeLedger → Settings → Backup & Recovery**

### Backup

SafeLedger creates a `.slgbak` file containing a complete encrypted backup of the current SafeLedger data set and the metadata required for restore.

Backup format v3 includes a SHA-256 integrity digest for every included file.

Store backups separately from the working SafeLedger folder so a single drive failure does not destroy both the live vault and its backup.

### Verify Backup

**Verify Backup** checks a backup without modifying active SafeLedger data.

Verification checks include:

- Backup structure and safe file paths
- SHA-256 file integrity manifest
- Key-envelope structure
- Encrypted vault-list authentication
- Authentication of every Profile vault
- Profile, Wallet, Asset, and file counts

### Restore

SafeLedger 2.1 supports current version-3 complete backups and retains version-2 restore compatibility.

Before replacing active data, SafeLedger creates a pre-restore safety copy. Restore is staged before replacement, and SafeLedger clears the active session and reloads after a successful restore.

## Emergency Lock and automatic lock

After SafeLedger is unlocked, inactivity can trigger an automatic security lock.

The SafeLedger shield button in the bottom-right provides **Emergency Lock**. The current 2.1 implementation:

1. Clears visible sensitive fields.
2. Clears the active encryption session / DEK.
3. Records the security event in the local audit log.
4. Minimizes SafeLedger.
5. Reloads the renderer from the trusted main process.
6. Returns SafeLedger to a fresh login state before the application can be unlocked again.

The renderer reset is intentional: a lock should not leave decrypted application state sitting in the old renderer session.

## Brute Force and Self-Destruct Protection

SafeLedger tracks failed login attempts and can temporarily lock login after too many failures.

Self-Destruct Protection is **off by default for new settings**. Existing settings that explicitly enabled it remain enabled.

> [!CAUTION]
> Self-Destruct Protection is intentionally destructive. Keep verified backups before enabling it.

When enabled, exhausting the configured failed-login and lockout limits can destroy files in the active `SafeLedgerData/vaults` folder.

Storage removal, system sleep, OS locking, Emergency Lock, and future device-security events are conceptually separate from password-failure Self-Destruct behavior and must never be treated as failed password attempts.

## Clipboard, QR, and printing safety

Sensitive Copy actions automatically clear the clipboard after a short period when the clipboard still contains the copied SafeLedger value.

QR generation is local and does not require an online QR service.

Recovery sheets are generated locally. Printed recovery information may contain highly sensitive material, so use a trusted local printer and protect printed copies appropriately.

## Desktop security boundary

SafeLedger uses an Electron renderer sandbox with:

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- denied unexpected renderer navigation
- denied unexpected new windows
- disabled webviews
- denied renderer permission requests
- disabled insecure mixed content
- restrictive Content Security Policy

Sensitive filesystem and cryptographic operations stay in the trusted main process behind a narrow preload bridge.

## Local audit log

SafeLedger maintains a local `audit.log` under the settings portion of `SafeLedgerData`.

The audit log records generic security/application events and timestamps. It is not intended to contain passwords, seed phrases, private keys, or other vault secrets.

## Development

Install locked dependencies:

```bash
npm ci --no-audit --no-fund
```

Start SafeLedger:

```bash
npm start
```

Run the regression suite:

```bash
npm run test:regression
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

Pull requests are expected to pass regression, crypto, GUI, and packaging checks before a release branch is merged into `master`.

## Release documents

- `RELEASE-2.1.md` — released continuity and hardening foundation
- PR #3 — SafeLedger 2.2 Runtime Modernization development
- PR #4 — SafeLedger 2.3 Device Security & Recovery Health development
- PR #5 — SafeLedger 2.4 Recovery Intelligence & Validation development
- PR #6 — SafeLedger 2.5 Distribution, Trust & Open Source Readiness development

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

SafeLedger is licensed under the Apache License 2.0. See `LICENSE` for details.
