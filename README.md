# SafeLedger

SafeLedger is a free, local-first encrypted information vault for organizing cryptocurrency wallet and asset information. It stores profiles, wallets, public addresses, recovery information, private keys, balances, notes, and other details in encrypted files on your own computer.

SafeLedger does not require a cloud account. Your working data lives in a folder named `SafeLedgerData` beside the packaged SafeLedger application.

> [!IMPORTANT]
> **SafeLedger 2.x is not backward compatible with SafeLedger 1.x data.**
>
> Do not place a SafeLedger 1.x vault folder beside a SafeLedger 2.x executable expecting it to migrate. Keep older data separate and preserve a backup of it.

## How saving and the SafeLedgerData folder work

For packaged builds, SafeLedger creates and uses `SafeLedgerData` in the same folder as the SafeLedger application you launch.

### Windows portable example

```text
D:\My SafeLedger\
├─ SafeLedger-2.x.x-Portable.exe
└─ SafeLedgerData\
   ├─ settings\
   └─ vaults\
```

### Linux AppImage example

```text
/home/user/Apps/SafeLedger/
├─ SafeLedger-2.x.x-x86_64.AppImage
└─ SafeLedgerData/
   ├─ settings/
   └─ vaults/
```

The application and its `SafeLedgerData` folder should stay together.

### If you move SafeLedger

Close SafeLedger first, then move both the application and the entire `SafeLedgerData` folder. Moving only the application may cause SafeLedger to create a new empty data folder in the new location, which can make existing profiles appear to be missing.

If that happens, close SafeLedger, locate the original `SafeLedgerData` folder, make a backup copy, and place the correct folder beside the SafeLedger application you intend to use.

Do not merge two different `SafeLedgerData` folders manually. Use SafeLedger Backup and Restore when possible.

## When changes are saved

SafeLedger does not continuously save while you type. After choosing Add or Edit/Modify, use the **green Save icon** in the bottom action area to commit the change.

If you leave a Modify screen without saving, those form changes are not written to the encrypted vault.

Deleting a Profile, Wallet, or Coin also requires confirmation.

## How SafeLedger is organized

```text
Profile
└─ Wallet
   └─ Coin / Asset
```

### Profile

A Profile is the top-level container. Profiles can separate people, purposes, businesses, storage strategies, or any other grouping you choose. Each Profile has its own encrypted vault file.

### Wallet

Wallets can store:

- Name
- Wallet category
- Tags
- Password
- PIN code
- Recovery link
- Seed phrase
- Notes
- Coins/assets associated with the Wallet

Sensitive Wallet values are collapsed in View mode. Wallet sensitive fields provide Copy controls in View mode but do not generate QR codes. In Add/Modify mode, sensitive values use an eye icon to reveal or hide the field; Copy and QR controls are not shown while editing.

### Coin / Asset

Coins and assets can store:

- Coin/asset name
- Symbol
- Public address
- Tags
- Balance
- Private key, when you choose to store one
- Notes

If no private key is saved, the Private Key field is omitted from the normal View screen. If no public address is entered, SafeLedger displays a lighter placeholder telling you to use Edit to update the asset.

Coin Public Address and Private Key may use Copy and local QR controls in View mode. Balance is treated as sensitive and is Copy-only in View mode. In Add/Modify mode, private values use an eye icon rather than Copy/QR controls.

## Main application areas

From left to right, SafeLedger displays:

1. **Profiles**
2. **Wallets** inside the selected Profile
3. **Coins** inside the selected Wallet
4. **Detail View** for the selected item

Profile, Wallet, and Coin search boxes are available at the top of their columns. The upper-right status area displays success messages, errors, lockout information, and processing status.

## View, Edit, Print, and Delete

Selecting a Profile, Wallet, or Coin opens its View screen. The normal bottom action order is:

**Edit → Print → Delete**

The pencil opens Edit/Modify. The printer opens a printable local information or recovery sheet. The red trash icon opens delete confirmation. On a delete confirmation screen, the X cancels and returns to the selected item.

Printed recovery sheets can contain highly sensitive data. Prefer a trusted local printer rather than a shared, cloud-connected, or remotely managed printer.

## Backup and Restore

Open:

**SafeLedger → Settings → Backup & Recovery**

### Backup

Backup creates a `.slgbak` file containing a complete copy of the current `SafeLedgerData` folder. Vault contents inside the backup remain encrypted, and the backup includes the settings/encryption metadata needed for a complete restore.

Store backups separately from the working SafeLedger folder so a single drive failure does not destroy both the live data and its backup.

### Restore

Restore accepts the current complete SafeLedger `.slgbak` format. Before replacing the active data, SafeLedger creates a safety copy named similarly to:

```text
SafeLedgerData-pre-restore-2026-08-22T...
```

After restore, SafeLedger locks and reloads so the restored data is opened through a new authenticated session.

SafeLedger 2.x does not import or migrate SafeLedger 1.x vault formats.

## SafeLedger 2.x encryption

A new SafeLedger 2.x installation creates the current encryption format directly. It does not bootstrap through the SafeLedger 1.x password-derived vault format.

### Argon2id master-password protection

SafeLedger derives the password-protection key with **Argon2id** and a random salt.

Current defaults:

- 64 MiB memory
- 3 passes
- Parallelism of 1
- 256-bit derived key

### Random Data Encryption Key

SafeLedger generates a random 256-bit Data Encryption Key (DEK). The master password protects the DEK through the key envelope rather than being used directly as the vault encryption key.

Changing the master password re-wraps the existing DEK. SafeLedger does not need to decrypt and re-encrypt every vault file merely to change the password.

### AES-256-GCM authenticated encryption

SafeLedger 2.x vault files use **AES-256-GCM** authenticated encryption and the `SLG2` encrypted payload format. SafeLedger 1.x AES-CBC vault payloads are not accepted by the current application.

Authenticated encryption helps detect modified, damaged, or unauthenticated ciphertext instead of silently accepting it.

### Password requirements

The master password requires at least:

- 8 characters
- 1 lowercase letter
- 1 uppercase letter
- 1 number

Passwords may be up to 128 characters. A longer unique password or passphrase is recommended; the interface recommends 15 or more characters.

## Brute Force Protection

SafeLedger tracks failed login attempts and can temporarily lock login after too many failures.

The three configurable brute-force values are limited to whole numbers from **1 through 99**:

- Failed login attempts before lockout
- Lockouts allowed before self-destruct
- Lockout duration in minutes

Open:

**SafeLedger → Settings → Brute Force Protection**

When a lockout occurs, SafeLedger displays a lockout screen with the remaining time. Closing and reopening the application during an active lockout does not bypass it.

## Self-Destruct Protection

> [!CAUTION]
> Self-Destruct Protection is intentionally destructive. Maintain verified backups before relying on it.

Self-Destruct Protection is enabled by default and can be controlled from:

**SafeLedger → Self-Destruct Protection**

When enabled, exhausting the configured failed-login and lockout limits causes SafeLedger to destroy files in the active `SafeLedgerData/vaults` folder. When disabled, SafeLedger continues to enforce lockouts without intentionally destroying the vault files.

SafeLedger overwrites files before deleting them during secure-delete operations, but no application can guarantee physical erasure on every storage device. SSD wear-leveling, snapshots, cloud-sync history, backups, and operating-system caching may preserve older blocks or copies outside SafeLedger's control.

For higher assurance, use SafeLedger with full-disk encryption and appropriate device security.

## Automatic and Emergency Lock

After SafeLedger is unlocked, approximately five minutes of inactivity triggers an automatic security lock.

The SafeLedger shield button in the bottom-right corner provides Emergency Lock. It clears visible sensitive fields, records the security event in the local audit log, minimizes the window, and reloads SafeLedger back to the locked/login state.

## Clipboard and QR safety

Sensitive Copy actions automatically clear the clipboard after approximately 30 seconds if the clipboard still contains the copied value.

QR generation is local and does not use an online QR service. Treat a QR code containing a private key or other secret exactly like the original secret.

## Local audit log

SafeLedger maintains `audit.log` under the settings portion of `SafeLedgerData`. It records security-related event names and timestamps such as application opens, emergency locks, auto-locks, backups, and restores. It is not intended to contain passwords, seed phrases, private keys, or other vault secrets.

## Password changes

Open:

**SafeLedger → Settings → Password → Change Password**

Provide the current master password and the new password. In SafeLedger 2.x, a password change re-wraps the random Data Encryption Key rather than rotating every encrypted vault file.

After changing the password, close and reopen SafeLedger to verify the new password, then create a fresh backup.

## SafeLedger 1.x compatibility

SafeLedger 2.x **does not support opening, migrating, or converting SafeLedger 1.x vault data**.

If you still have SafeLedger 1.x data:

- Keep a complete untouched backup of the old data.
- Do not copy it over an active SafeLedger 2.x `SafeLedgerData` folder.
- Use the appropriate older software/environment if you need to access that old data.
- Create new SafeLedger 2.x data separately.

If SafeLedger detects an existing vault list without the required 2.x key envelope, it refuses to initialize that directory as a new 2.x vault so older data is not silently overwritten.

## Recommended operating practices

- Keep the SafeLedger application and `SafeLedgerData` together.
- Use the built-in `.slgbak` Backup function regularly.
- Keep at least one backup on a separate device or location.
- Use a long, unique master password or passphrase.
- Treat seed phrases and private keys as highly sensitive secrets.
- Use full-disk encryption on the computer or removable drive containing SafeLedger.
- Lock SafeLedger when stepping away.
- Test restores before depending on a backup strategy.
- Do not assume self-destruct can erase cloud-sync copies, snapshots, backups, or SSD-remapped blocks.

## If profiles appear missing

First confirm that you launched the intended SafeLedger executable/AppImage and that the expected `SafeLedgerData` folder is beside that exact application file.

Check whether an older copy of `SafeLedgerData` remains beside a previous SafeLedger executable. Before moving, deleting, merging, or replacing anything, make a backup copy of the data you are trying to recover.

## What SafeLedger is not

SafeLedger is an encrypted information organizer. It is not a cryptocurrency exchange, blockchain node, hardware wallet, or transaction-signing device.

Storing a seed phrase or private key in any software creates risk. Decide which secrets you are comfortable storing digitally and maintain appropriate offline recovery backups for critical assets.

## License

SafeLedger is licensed under the Apache License 2.0. See `LICENSE` for details.
