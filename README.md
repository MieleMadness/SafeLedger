# SafeLedger

SafeLedger is a free, local-first encrypted information vault for organizing cryptocurrency wallet and asset recovery information. It stores Profiles, Wallets, public addresses, recovery information, private keys, balances, notes, and other details in encrypted files on your own computer.

SafeLedger does not require a cloud account. Your working data lives in a folder named `SafeLedgerData` beside the packaged SafeLedger application.

## SafeLedger 2.1

SafeLedger 2.1 focuses on **continuity and hardening**. It adds a read-only SafeLedger 1.x importer, versioned vault data schemas, backup integrity verification, safer Self-Destruct defaults, and tighter Electron/IPC security boundaries.

> [!IMPORTANT]
> SafeLedger 2.1 can **import** SafeLedger 1.x data, but it does not open 1.x vault files directly as active 2.x data.
>
> Keep the original 1.x `safeledgerdata` folder untouched. Initialize and unlock SafeLedger 2.1 separately, then use **SafeLedger → Settings → Import SafeLedger 1.x Data**. The importer reads the old files, creates new 2.x encrypted vaults, and leaves the original files unchanged.

## How saving and the SafeLedgerData folder work

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

The application and its `SafeLedgerData` folder should stay together.

### If you move SafeLedger

Close SafeLedger first, then move both the application and the entire `SafeLedgerData` folder. Moving only the application may cause SafeLedger to create a new empty data folder in the new location, which can make existing Profiles appear to be missing.

If that happens, close SafeLedger, locate the original `SafeLedgerData` folder, make a backup copy, and place the correct folder beside the SafeLedger application you intend to use.

Do not manually merge two different `SafeLedgerData` folders. Use SafeLedger Backup, Restore, or the 1.x importer when appropriate.

## When changes are saved

SafeLedger does not continuously save while you type. After choosing Add or Edit/Modify, use the green Save action in the bottom action area to commit the change.

If you leave a Modify screen without saving, those form changes are not written to the encrypted vault.

Deleting a Profile, Wallet, or Asset also requires confirmation.

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

- Name
- Wallet category
- Tags
- Password
- PIN code
- Recovery link
- Seed phrase
- Notes
- Assets associated with the Wallet

Sensitive Wallet values are collapsed in View mode. Sensitive fields provide local Copy controls in View mode. In Add/Modify mode, sensitive values use an eye control to reveal or hide the field.

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

If no private key is saved, the Private Key field is omitted from the normal View screen. Public addresses and private keys can use local QR controls where supported. Balance is treated as sensitive and is Copy-only in View mode.

## Main application areas

From left to right, SafeLedger displays:

1. **Profiles**
2. **Wallets** inside the selected Profile
3. **Assets** inside the selected Wallet
4. **Detail View** for the selected item

Profile, Wallet, and Asset search boxes are available at the top of their columns. Global Search, Recovery Dashboard, and Activity History shortcuts are available from the top utility area. The SafeLedger shield in the bottom-right is the Emergency Lock.

## View, Edit, Print, and Delete

Selecting a Profile, Wallet, or Asset opens its View screen. Detail actions include Edit, Print where appropriate, and Delete.

Recovery sheets are generated locally. SafeLedger 2.1 prepares printing inside the existing application window rather than opening an unrestricted browser-style popup. Printed recovery sheets can contain highly sensitive information, so use a trusted local printer and store printed copies securely.

## Backup, Verify, and Restore

Open:

**SafeLedger → Settings → Backup & Recovery**

### Backup

Backup creates a `.slgbak` file containing a complete copy of the current `SafeLedgerData` folder. Vault contents inside the backup remain encrypted, and the backup includes the settings and encryption metadata needed for a complete restore.

SafeLedger 2.1 creates **backup format version 3**. Version-3 backups include a SHA-256 integrity digest for every included file.

Store backups separately from the working SafeLedger folder so a single drive failure does not destroy both the live data and its backup.

### Verify Backup

**Verify Backup** checks a `.slgbak` file without changing the active SafeLedger data.

Verification checks:

- Backup structure and safe file paths
- Version-3 SHA-256 integrity manifest
- Key-envelope structure
- Authentication of the encrypted vault list
- Authentication of every Profile vault
- Profile, Wallet, Asset, and file counts

Verification uses the currently unlocked SafeLedger data key. A backup from a different SafeLedger key lineage may therefore fail **Verify Backup** even though it can still be selected for Restore and authenticated after SafeLedger reloads into the restored data set.

### Restore

Restore accepts supported complete SafeLedger backups. SafeLedger 2.1 continues to accept version-2 complete backups for restore compatibility.

Before replacing active data, SafeLedger creates a safety copy named similarly to:

```text
SafeLedgerData-pre-restore-2026-08-28T...
```

Restore is staged first. If replacement fails, SafeLedger attempts to preserve or return to the current data. After a successful restore, SafeLedger clears the active session and reloads so the restored data is opened through a new authenticated session.

## Import SafeLedger 1.x Data

Open:

**SafeLedger → Settings → Import SafeLedger 1.x Data**

The importer accepts the original SafeLedger 1.x `safeledgerdata` folder or its parent folder.

The import process:

1. Select the original SafeLedger 1.x data folder.
2. Enter the SafeLedger 1.x master password.
3. SafeLedger reads the old encrypted vault list and Profile vaults.
4. The old data is decrypted only for migration.
5. New Profile files are created using the current SafeLedger 2.x encryption system.
6. Duplicate Profile names receive a numeric suffix rather than overwriting current data.
7. SafeLedger reports imported Profile, Wallet, and Asset counts.
8. SafeLedger locks and reloads after a successful import.

The original 1.x files are not renamed, rewritten, deleted, or converted in place. Keep a complete untouched copy of them even after a successful import.

The 1.x compatibility code exists only inside the migration path. Active SafeLedger 2.x vaults continue to use the current authenticated encryption format.

## Versioned vault data schema

SafeLedger 2.1 introduces a separate `schemaVersion` for vault contents. This is independent of the encryption version and wallet catalog version.

When SafeLedger reads an older supported vault schema, it can migrate that structure forward in memory before saving. If a vault declares a schema version newer than the installed application supports, SafeLedger refuses to rewrite it and reports that a newer SafeLedger version is required.

This provides a controlled upgrade path for future data-model changes instead of requiring another incompatible rewrite.

## SafeLedger 2.x encryption

A new SafeLedger installation creates the current encryption format directly.

### Argon2id master-password protection

SafeLedger derives the password-protection key with **Argon2id** and a random salt.

Current defaults:

- 64 MiB memory
- 3 passes
- Parallelism of 1
- 256-bit derived key

### Random Data Encryption Key

SafeLedger generates a random 256-bit Data Encryption Key (DEK). The master password protects the DEK through a key envelope rather than being used directly as the vault encryption key.

Changing the master password re-wraps the existing DEK. SafeLedger does not need to decrypt and re-encrypt every vault file merely to change the password.

### AES-256-GCM authenticated encryption

Current vault files use **AES-256-GCM** authenticated encryption and the `SLG2` encrypted payload format.

Authenticated encryption helps detect modified, damaged, or unauthenticated ciphertext instead of silently accepting it.

The SafeLedger 1.x importer contains isolated compatibility code for the original AES-256-CBC format so legacy information can be moved into current authenticated vaults.

### Password requirements

The master password requires at least:

- 8 characters
- 1 lowercase letter
- 1 uppercase letter
- 1 number

Passwords may be up to 128 characters. A longer unique password or passphrase is recommended; the interface recommends 15 or more characters.

## Brute Force Protection

SafeLedger tracks failed login attempts and can temporarily lock login after too many failures.

The configurable brute-force values are limited to whole numbers from **1 through 99**:

- Failed login attempts before lockout
- Lockouts allowed before Self-Destruct, when Self-Destruct is enabled
- Lockout duration in minutes

Open:

**SafeLedger → Settings → Brute Force Protection**

Closing and reopening the application during an active lockout does not bypass it.

## Self-Destruct Protection

> [!CAUTION]
> Self-Destruct Protection is intentionally destructive. Maintain verified backups before enabling it.

Self-Destruct Protection is **off by default for new SafeLedger 2.1 settings**. Brute-force lockouts remain active when Self-Destruct is disabled.

Existing settings that explicitly enabled Self-Destruct remain enabled.

Control it from:

**SafeLedger → Self-Destruct Protection**

Enabling it requires a destructive-action warning. When enabled, exhausting the configured failed-login and lockout limits causes SafeLedger to destroy files in the active `SafeLedgerData/vaults` folder.

SafeLedger overwrites files before deleting them during secure-delete operations, but no application can guarantee physical erasure on every storage device. SSD wear-leveling, snapshots, cloud-sync history, backups, and operating-system caching may preserve older blocks or copies outside SafeLedger's control.

For higher assurance, use SafeLedger with full-disk encryption and appropriate device security.

## Automatic and Emergency Lock

After SafeLedger is unlocked, approximately five minutes of inactivity triggers an automatic security lock.

The SafeLedger shield button in the bottom-right provides Emergency Lock. It clears visible sensitive fields, records the security event in the local audit log, minimizes the window, and reloads SafeLedger back to the locked/login state.

## Clipboard and QR safety

Sensitive Copy actions automatically clear the clipboard after approximately 30 seconds if the clipboard still contains the copied value.

QR generation is local and does not use an online QR service. Treat a QR code containing a private key or other secret exactly like the original secret.

## Local audit log

SafeLedger maintains `audit.log` under the settings portion of `SafeLedgerData`. It records security-related event names and timestamps such as application opens, emergency locks, auto-locks, backups, backup verification, restores, and legacy imports.

The audit log is not intended to contain passwords, seed phrases, private keys, or other vault secrets.

## Desktop security boundary

SafeLedger uses an Electron renderer sandbox with Node integration disabled and context isolation enabled. Sensitive filesystem and cryptographic operations stay in the main process behind a narrow preload bridge.

SafeLedger 2.1 additionally:

- Validates IPC senders for legacy and crypto operations
- Validates vault filenames and renderer payloads before persistence
- Denies unexpected renderer navigation
- Denies new renderer windows
- Disables webviews
- Denies renderer permission requests
- Disables insecure mixed content
- Applies a restrictive Content Security Policy

SafeLedger is designed as an offline application and does not require network access for normal vault operation.

## Recommended operating practices

- Keep the SafeLedger application and `SafeLedgerData` together.
- Use the built-in `.slgbak` Backup function regularly.
- Use **Verify Backup** after creating important backups.
- Keep at least one backup on a separate device or location.
- Preserve original SafeLedger 1.x files after migration.
- Use a long, unique master password or passphrase.
- Treat seed phrases and private keys as highly sensitive secrets.
- Use full-disk encryption on the computer or removable drive containing SafeLedger.
- Lock SafeLedger when stepping away.
- Keep Self-Destruct disabled unless its destructive behavior is specifically required and understood.
- Do not assume secure deletion can erase cloud-sync copies, snapshots, backups, or SSD-remapped blocks.

## If Profiles appear missing

First confirm that you launched the intended SafeLedger executable/AppImage and that the expected `SafeLedgerData` folder is beside that exact application file.

Check whether an older copy of `SafeLedgerData` remains beside a previous SafeLedger executable. Before moving, deleting, merging, restoring, or replacing anything, make a backup copy of the data you are trying to recover.

## What SafeLedger is not

SafeLedger is an encrypted information organizer. It is not a cryptocurrency exchange, blockchain node, hardware wallet, or transaction-signing device.

Storing a seed phrase or private key in any software creates risk. Decide which secrets you are comfortable storing digitally and maintain appropriate offline recovery backups for critical assets.

## Release planning

See `RELEASE-2.1.md` for the SafeLedger 2.1 release scope, acceptance gates, and deferred modernization work.

## License

SafeLedger is licensed under the Apache License 2.0. See `LICENSE` for details.
