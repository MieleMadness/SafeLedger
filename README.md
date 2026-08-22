# SafeLedger

SafeLedger is a free, local-first encrypted information vault designed for organizing cryptocurrency wallet and asset information. It can store profiles, wallets, public addresses, recovery information, private keys, notes, and other details in encrypted files on your own computer.

SafeLedger does not need a cloud account to store your vault. Your working data lives in a folder named `SafeLedgerData` beside the packaged SafeLedger application.

> [!IMPORTANT]
> **Understand where SafeLedger saves your data before using it.**
>
> The `SafeLedgerData` folder is your live SafeLedger database. It must stay with the SafeLedger executable or AppImage if you move the application.

## How saving and the SafeLedgerData folder work

For packaged builds, SafeLedger creates and uses a folder named `SafeLedgerData` in the same folder as the SafeLedger application you launch.

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

The important part is that the application and its `SafeLedgerData` folder stay together.

### If you move SafeLedger

Close SafeLedger first, then move **both** of these items to the new folder:

1. The SafeLedger `.exe` or `.AppImage`.
2. The entire `SafeLedgerData` folder.

For example, if you move the Windows portable EXE from:

```text
C:\Downloads\SafeLedger\
```

to:

```text
D:\Secure Apps\SafeLedger\
```

move `SafeLedgerData` to the new folder too.

If you move only the application and then launch it, SafeLedger may create a **new empty `SafeLedgerData` folder** beside the moved application. This can make it look like your profiles are missing even though the original encrypted data may still be in the old folder.

If this happens:

1. Close SafeLedger.
2. Find your original `SafeLedgerData` folder.
3. Make a backup copy of it before changing anything.
4. Place the original `SafeLedgerData` folder beside the SafeLedger application you intend to use.
5. Reopen SafeLedger.

Do not merge two different `SafeLedgerData` folders unless you understand the individual encrypted files and profile references. Use SafeLedger's Backup and Restore functions instead when possible.

### Multiple copies of SafeLedger

If you keep SafeLedger in several different folders, each copy can use a different `SafeLedgerData` folder. In practice, this means each folder can behave like a separate SafeLedger installation with separate profiles and settings.

## When changes are saved

SafeLedger does not continuously sync your form while you type.

When you choose **Add** or **Edit/Modify**, make your changes and then use the **green Save icon** in the bottom action area. The data is written to the encrypted vault only after Save is used successfully.

If you leave a Modify screen without pressing Save, the unsaved form changes are not written to the vault.

Deleting an item also requires a confirmation step. Opening the delete screen does not immediately remove the item.

## How SafeLedger is organized

SafeLedger uses three main levels:

```text
Profile
└─ Wallet
   └─ Coin / Asset
```

### Profile

A Profile is the top-level container. Profiles can be used to separate people, purposes, businesses, storage strategies, or any other grouping you want.

Each profile has its own encrypted vault file.

### Wallet

Wallets live inside a Profile. A wallet can store information such as:

- Wallet name
- Wallet category
- Tags
- Password
- PIN code
- Recovery link
- Seed phrase
- Notes
- Coins/assets associated with the wallet

Sensitive wallet fields are hidden or collapsed in normal viewing until you choose to reveal them.

### Coin / Asset

Coins and assets live inside a Wallet. A coin record can store:

- Coin/asset name
- Symbol
- Public address
- Tags
- Last known balance
- Private key, when you choose to store one
- Notes

If a coin has no private key saved, the Private Key field is not displayed in the normal View screen.

If no public address has been entered, SafeLedger displays a lighter placeholder telling you to use Edit to update the asset.

## The four main areas of the application

From left to right, SafeLedger is organized into:

1. **Profiles** — select or add a Profile.
2. **Wallets** — select or add a Wallet inside the selected Profile.
3. **Coins** — select or add a Coin/Asset inside the selected Wallet.
4. **Detail View** — view, modify, print, or delete the currently selected item.

Wallet and coin search boxes are available at the top of their columns.

The status area in the upper-right portion of the application displays success messages, errors, lockout information, and processing status.

## View, Modify, and Delete views

### View

Selecting a Profile, Wallet, or Coin opens its normal View screen.

View mode is intended for reading stored information without changing it. Depending on the item, the bottom action area displays:

**Edit → Print → Delete**

Sensitive values can have additional reveal, copy, or QR controls.

### Modify / Edit

Select the **pencil icon** to open Modify mode.

Modify mode displays editable fields. Sensitive wallet and coin fields include Show/Hide controls so you can inspect a value before saving when needed.

Use the **green Save icon** at the bottom of the application to commit your changes.

### Delete confirmation

Select the **red trash icon** to open the delete confirmation screen.

Two actions are then available:

- **X / Cancel** — return to the item without deleting it.
- **Red trash / Confirm Delete** — permanently remove the selected Profile, Wallet, or Coin from the current SafeLedger data.

## Button and icon reference

| Button / Icon | What it does |
| --- | --- |
| **Add Profile** | Creates a new top-level Profile. |
| **Add Wallet** | Creates a Wallet inside the selected Profile. |
| **Add Coin** | Creates a Coin/Asset inside the selected Wallet. |
| **Pencil** | Opens the selected item in Modify/Edit mode. |
| **Printer** | Opens a printable information or recovery sheet for the selected item. |
| **Red Trash** | Opens delete confirmation, or confirms deletion when already on the confirmation screen. |
| **X** | Cancels a pending delete and returns to the selected item. |
| **Green Save** | Saves the current Add/Modify form to the encrypted vault. |
| **Copy** | Copies the displayed value to the system clipboard. Sensitive-value clipboard copies are automatically cleared after approximately 30 seconds if the clipboard still contains that value. |
| **QR Code** | Generates a QR code locally from the value. QR generation does not require a network connection. |
| **Show / Hide** | Reveals or hides a sensitive value while editing. |
| **+ / − on a sensitive field** | Expands or collapses sensitive information in View mode. |
| **SafeLedger shield button** | Emergency-locks SafeLedger, clears visible sensitive fields, minimizes the window, and returns the app to the locked/login state. |

## Printing

The printer icon creates a local print view.

Wallet recovery sheets can contain sensitive recovery information and SafeLedger displays a warning before printing. Coin sheets also warn when a private key is included.

Treat printed recovery sheets like the secrets they contain. Anyone who obtains a seed phrase or private key may be able to control the associated cryptocurrency.

Prefer a trusted local printer rather than a shared, office, cloud-connected, or remotely managed printer when printing sensitive recovery information.

## Backup and Restore

Open:

**SafeLedger → Settings → Backup & Recovery**

### Backup

The **Backup** button creates a `.slgbak` file containing a complete copy of the current `SafeLedgerData` folder.

The vault files inside the backup remain encrypted with SafeLedger's encryption. The backup also contains local settings needed for a complete restore.

Keep backup files somewhere separate from the working SafeLedger folder so a drive failure does not destroy both the live data and its backup.

### Restore

The **Restore** button restores a complete `.slgbak` backup.

Before replacing the current `SafeLedgerData` folder, SafeLedger creates a safety copy with a name similar to:

```text
SafeLedgerData-pre-restore-2026-08-22T...
```

After a restore, SafeLedger locks and reloads so the restored data is opened through a new authenticated session.

## Security features

SafeLedger is designed around local encrypted storage and includes several layers of protection.

### Argon2id master-password protection

The current key-envelope format derives the password-protection key with **Argon2id** using a random salt.

Current default parameters are:

- 64 MiB memory
- 3 passes
- Parallelism of 1
- 256-bit derived key

The master password protects a randomly generated 256-bit Data Encryption Key rather than directly becoming the vault encryption key.

### AES-256-GCM authenticated encryption

Vault data is encrypted with **AES-256-GCM**.

Authenticated encryption helps SafeLedger detect modified, damaged, or unauthenticated encrypted data instead of silently accepting altered ciphertext.

### Random Data Encryption Key

SafeLedger's current crypto format uses a random 256-bit Data Encryption Key (DEK) for the vault. The DEK is wrapped with a key derived from the master password.

This allows a master-password change to re-protect the data key without requiring the application to use the master password itself as the vault key.

### Password requirements

The current login policy requires at least:

- 8 characters
- 1 lowercase letter
- 1 uppercase letter
- 1 number

Master passwords support up to 128 characters. SafeLedger recommends using a longer password or passphrase; the interface recommends 15 or more characters.

### Brute-force lockouts

SafeLedger tracks failed login attempts and can temporarily lock login after too many failures.

The default settings are:

- **5 failed login attempts before a lockout**
- **5 lockouts allowed before self-destruct protection is reached**
- **15-minute lockout duration**

These values can be changed under:

**SafeLedger → Settings → Brute Force Protection**

### Self-Destruct Protection

> [!CAUTION]
> Self-Destruct Protection is intentionally destructive. Understand and back up your SafeLedger data before relying on it.

Self-Destruct Protection is **enabled by default**.

The on/off control is located in the application menu:

**SafeLedger → Self-Destruct Protection**

A checkmark means Self-Destruct Protection is enabled.

When enabled, exhausting the configured failed-login and lockout limits causes SafeLedger to destroy the encrypted files in the active `SafeLedgerData/vaults` folder.

When disabled, failed logins continue to cause lockouts, but SafeLedger does not intentionally destroy the vault files after the lockout limit is exhausted.

Turning Self-Destruct Protection on requires confirmation because the action it protects can permanently remove vault data.

The **thresholds** used by self-destruct are managed separately under:

**SafeLedger → Settings → Brute Force Protection**

There you can configure:

- Failed login attempts before lockout
- Lockouts allowed before self-destruct
- Lockout duration in minutes

Self-destruct affects the active encrypted vault files. It does **not** erase separate `.slgbak` backups that you have stored elsewhere.

#### Important secure-deletion limitation

SafeLedger overwrites vault files with random data before deleting them when performing its secure-delete operations. However, no application can guarantee physical erasure on every storage device. SSD wear-leveling, flash storage, filesystem snapshots, cloud-sync history, backups, and operating-system caching can preserve older blocks or copies outside the application's control.

For higher assurance, use SafeLedger together with full-disk encryption and appropriate physical/device security.

### Five-minute inactivity lock

After SafeLedger has been unlocked, approximately **5 minutes of inactivity** triggers an automatic security lock.

The auto-lock clears visible sensitive data and returns SafeLedger to a locked state.

### Emergency Lock

The SafeLedger shield button in the bottom-right corner is the Emergency Lock control.

Using it:

1. Marks the session as locked.
2. Clears visible sensitive fields.
3. records an emergency-lock event in the local audit log.
4. Minimizes the SafeLedger window.
5. Reloads SafeLedger back to the locked/login state.

Use this if you need to hide and lock the application quickly.

### Sensitive information controls

Sensitive values such as passwords, PINs, seed phrases, recovery links, and private keys are hidden or collapsed by default in applicable views.

Sensitive copy actions use a timed clipboard clear. If the clipboard still contains the copied sensitive value, SafeLedger clears it after approximately 30 seconds.

### Local QR generation

SafeLedger generates public-address and recovery QR codes locally. The QR code is generated from the value already stored in or entered into SafeLedger and does not require an online QR service.

A QR code containing a seed phrase, private key, password, or other recovery secret should be treated exactly like the original secret.

### Local audit log

SafeLedger maintains a local audit log under the settings portion of `SafeLedgerData`. It records security-related event names and timestamps such as application opens, emergency locks, auto-locks, backups, and restores. It is not intended to store the contents of your vault secrets.

## Password changes

Open:

**SafeLedger → Settings → Password → Change Password**

You must provide the current master password before changing it.

A password change does not mean you should delete your backup. After changing the password, create a new backup and verify that you can close and reopen SafeLedger successfully with the new password.

## Legacy SafeLedger data

SafeLedger contains migration support for older compatible encrypted vault formats.

When upgrading an older data folder, make a full copy of `SafeLedgerData` before opening it with a newer build. Allow any encryption migration to finish before moving files, changing the password, shutting down the computer, or disconnecting removable storage.

## Recommended operating practices

- Keep the SafeLedger application and its `SafeLedgerData` folder together.
- Back up `SafeLedgerData` before upgrading or moving the application.
- Use the built-in `.slgbak` Backup function regularly.
- Keep at least one backup on a separate device or location.
- Use a long, unique master password or passphrase.
- Do not share screenshots containing recovery information.
- Treat seed phrases and private keys as highly sensitive secrets.
- Use full-disk encryption on the computer or removable drive containing SafeLedger.
- Lock SafeLedger when stepping away from the computer.
- Test that backups restore correctly before depending on them.
- Do not assume self-destruct can erase copies stored by cloud-sync software, snapshots, backups, or SSD wear-leveling.

## If SafeLedger opens but your profiles appear missing

The first thing to check is the application folder.

Look beside the exact SafeLedger `.exe` or `.AppImage` you launched and confirm that the expected `SafeLedgerData` folder is there.

Then check whether an older copy of `SafeLedgerData` still exists beside a previous copy of SafeLedger.

Do not create, delete, merge, or overwrite folders until you have made a backup copy of the data you are trying to recover.

## What SafeLedger is not

SafeLedger is an encrypted information organizer. It is not a cryptocurrency exchange, blockchain node, hardware wallet, or transaction-signing device.

Storing a seed phrase or private key in any software creates risk. Decide which secrets you are comfortable storing digitally and maintain appropriate offline backups for critical recovery information.

## License

SafeLedger is licensed under the Apache License 2.0. See `LICENSE` for details.
