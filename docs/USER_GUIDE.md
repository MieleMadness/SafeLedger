# SafeLedger User Guide & Technical Field Manual

**Documentation revision:** 12 October 2026 | Documentation patch **2.6.120**, covering functionality through development candidate **2.6.119**

> **Read this first:** This manual describes the features present in the **SafeLedger 2.6.119 development candidate**, not a statement that those features are already in the public `master` build. The repository's current `master` package was **2.6.10** when this edition was checked. Verify your installed version and use the manual appropriate to that build. Some screens or controls can differ in older copies.

**What this guide is:** Part everyday how-to, part technical reference. The numbered procedures explain where to begin and what to do. The **Under the hood** notes explain what SafeLedger is actually doing so you can make informed security and recovery decisions.

**What SafeLedger does not do:** It is not a cryptocurrency wallet, signer, exchange, online account synchronizer, blockchain node, token-price feed, cloud backup system, or guarantee that a seed phrase is recoverable. It organizes recovery information; you remain responsible for the quality and protection of that information.

# 1. The five-minute mental model

SafeLedger is a free, local-first, offline encrypted organizer for recovery information. It can store passwords, recovery notes, wallet details, encrypted private-key fields, account information, public addresses, and other records. It needs no license server, cloud account, or internet connection for normal vault operation.

Its organizational model has three levels:

```
Profile (for a person, purpose, company or recovery plan)
  -> Vault Item (wallet, exchange, Web3 account, website account)
       -> Asset (optional coin/token/account asset)
```

A **Profile** is the top-level container and corresponds to an individual encrypted vault file. A **Vault Item** represents something you may need to regain access to. An **Asset** is an optional record inside that item. Your entire Profile should not be confused with an individual crypto wallet, and an Asset should not be confused with a balance automatically retrieved from a blockchain.

**Suggested first session:** Create a disposable test Profile, add a Vault Item, add an Asset, create a complete backup, verify that backup, and practice locating the recovery information without using real private keys. Only then build your real recovery documentation.

# 2. Install and keep your data portable

## 2.1 Supported packaged applications

| Platform | Packaging | What to know |
|:--|:--|:--|
| Windows x64 | Portable `.exe` | Keep the EXE beside its `SafeLedgerData` folder. |
| Linux x64 | AppImage | Make the AppImage executable as appropriate; keep its folder writable. |
| macOS Apple Silicon (arm64) | ZIP containing `.app` | Keep the `.app` in a normal writable folder; the development build is not Developer ID signed or notarized. |

1. Obtain a build from the project's GitHub Actions or an explicitly published project release. Verify the file against the release's published checksum and provenance information when available.
2. Put the application in a dedicated folder on a reliable local drive or USB drive. Extract the Mac archive fully before running; avoid a temporary or read-only launch location.
3. Launch the application from that folder. The packaged application uses an adjacent `SafeLedgerData` folder for its files.
4. When relocating SafeLedger, close it first. Move **the application and the complete `SafeLedgerData` directory together**; avoid manually merging data directories from two copies.
5. Maintain separate backups. A portable USB copy by itself is not a backup.

Typical folder structure:

```
SafeLedger/
  SafeLedger-<version>-Portable.exe   # Windows example
  README.pdf                          # when included with the Windows build
  SafeLedgerData/
    vaults/                            # encrypted Profile vaults and key envelope
    settings/                          # settings and privacy-safe audit history
    storage-id.json                    # non-secret storage identity marker
```

**Mac caution:** SafeLedger checks for App Translocation and a writable portable folder. It may refuse to start instead of silently creating a second data location. Correct the location rather than manually editing encrypted files.

**Under the hood — portability:** The location of `SafeLedgerData` is determined relative to the launched packaged application; it is not an automatic cloud-synchronization path. The storage-identity marker helps detect a different or unexpectedly missing data location during a session. It is not a password or encryption key.

# 3. First launch and master password

1. Open SafeLedger in your chosen folder and allow the initial setup to load.
2. Create a long, unique master password or passphrase. Use a password manager or a well-protected offline recovery method to retain it.
3. Unlock the application with that password on subsequent launches.
4. Confirm that you can reach the Profile list, Settings, and Vault Overview before storing real secrets.
5. Create a complete backup as soon as the application contains information you cannot easily reconstruct.

There is no cloud-password-reset service. Loss of the master password can make encrypted vault data inaccessible. Do not rely on Self-Destruct or a backup as a substitute for remembering how to unlock it.

**Under the hood — two different keys:** SafeLedger uses a random **256-bit Data Encryption Key (DEK)** for encrypted vault content. Your master password is processed through **Argon2id** to protect that DEK inside a versioned **key envelope**. The encrypted Profile files use **AES-256-GCM**, which provides confidentiality and authenticated integrity checks. Changing the master password rewraps the existing DEK; it does not require a bulk rewrite of every Profile just because the password changed. These features make password guessing more expensive and tampering detectable; they do not eliminate risks from malicious endpoints, weak passwords, or copies of unencrypted secrets outside SafeLedger.

**Under the hood — main versus renderer:** The Electron main process is the authority for encryption keys and file access. The sandboxed user interface sends narrowly scoped commands across an IPC bridge. It does not directly own the decrypted data key or unrestricted filesystem access.

# 4. Create and organize Profiles

1. Choose the application action for **New Profile**.
2. Give the Profile a recognizable name such as `Personal`, `Business` or `Estate Plan`.
3. Choose **Blank Profile** or the **Standard/templates** selection. Standard setup offers nine reviewed starter wallet configurations; select only those you actually use.
4. Save the Profile. Open it and inspect its Vault Items.
5. Add encrypted Profile Notes for instructions applying to the whole Profile, such as whom to contact or where sealed recovery material is held.

To change a Profile later, select it and use the available edit action. Confirm you are editing the intended Profile. When deleting a Profile, ensure a verified backup exists and read any warnings carefully.

**Under the hood — safer creation/deletion:** Development versions 2.6.117–2.6.119 use transaction markers and authenticated Profile-list checks to recover from interruptions. A deletion stages the encrypted file and only finalizes removal when the encrypted list confirms the Profile is no longer referenced. Creation similarly checks whether a new file and list change actually committed; ambiguous outcomes preserve recovery evidence rather than guessing. These safeguards reduce failure risk but are not a substitute for backups or protection against total storage loss.

# 5. Add Vault Items and Assets

## 5.1 Vault Item types and when to choose them

| Type | Best used for | Typical information |
|:--|:--|:--|
| Wallet | Hardware/software cryptocurrency wallets | Device, seed storage location, passphrase use, addresses, recovery instructions |
| Exchange Account | Accounts at exchanges and custodians | Account ID, access methods, 2FA/recovery codes, assets |
| Web3 Account | dApps, NFT or connected-wallet services | Connected wallet context, verified website, service-specific recovery notes |
| Website Account | Ordinary online accounts and logins | Username, verified website, 2FA method, recovery codes, password where appropriate |

1. Open a Profile and choose **Add Vault Item**.
2. Select the appropriate item type; review the available preset or enter a custom name.
3. Record only the information useful for future recovery. Include where the real recovery secret is stored if you choose not to store it digitally.
4. Save and verify that the new item appears under the intended Profile.
5. Update notes, tags, recovery instructions and verification dates over time. For a discontinued account, update or remove stale records rather than leaving them unreviewed.

Presets and brand icons come from a **local catalog**. SafeLedger does not retrieve online favicons while you browse your vault. Presets never prove a website URL is legitimate; verify the service address separately.

## 5.2 Add or edit an Asset

1. Select the correct Profile and Vault Item first.
2. Choose **Add Asset** and record the Asset name/symbol as appropriate.
3. Optionally document **Network**, **Contract address**, **Public address**, notes, tags and a manually maintained balance. An Asset's balance is not automatically fetched from a live blockchain.
4. If you choose to store a private key or similar secret, treat the whole device, backup and any printed outputs as sensitive. It is equally valid to store a reference to sealed offline material instead.
5. Save, reopen and check the values. For duplicate-looking Assets, review the application's duplicate warning before confirming.

**Under the hood — stale edit protection:** Modern builds submit a selected record plus its original snapshot, not an entire renderer-owned Profile. The main process rereads authoritative encrypted data and rejects stale, deleted or ambiguous targets. Empty or missing selection IDs are not silently converted to the first item. Older starter wallets can share timestamps, so matching uses exact original snapshots where needed.

## 5.3 Icons, appearance and display preferences

SafeLedger includes offline token, network, wallet, exchange and website icon catalogs, including reviewed branded service artwork. **Light**, **Colorful** and **Dark** appearance modes are supported. Look under Settings for appearance and display preferences.

**Shit Coin Mode**, in **Settings → Asset Display**, is an optional joke display setting: unknown Assets without a recognized local icon use the poop emoji instead of a generic fallback. It does not classify, score, validate or modify any cryptocurrency or Asset data.

# 6. Search, review and strengthen recovery readiness

## 6.1 Vault Overview and Global Search

Use **Vault Overview** for inventory, recovery/maintenance indicators, and navigation to items requiring attention. Use **Global Search** to locate a Profile, Wallet or Asset rather than hunting through every section. Results are local to the unlocked application.

## 6.2 Recovery Intelligence and Test Recovery

1. Open the application's Recovery Intelligence/Recovery Health view for the relevant Profile or Vault Item.
2. Review missing instructions, undocumented recovery locations, stale verification dates and backup-health context.
3. Update missing non-secret recovery metadata first.
4. Use the guided **Test Recovery** flow to conduct a non-destructive recovery drill. Do not initiate a live wallet transfer simply to test documentation.
5. Mark verification or drill completion only after checking the real evidence, not merely because the notes look complete.

**Optional local checks:** BIP39 validation uses the official English word list, where supported; Bitcoin Base58Check, Bech32 and Bech32m validation check formats/checksums; Ethereum/EVM validation includes address format and EIP-55 checksum handling. These tests can catch many transcription mistakes, but **valid format does not prove control, ownership, a positive balance, correct derivation path or successful wallet recovery**.

**Under the hood — sensitive duplicate checks:** Public data may be compared directly using sanitized metadata. Sensitive recovery-secret duplicate checking uses session-only keyed fingerprints that are not saved as reusable hashes and are discarded when the session locks. Recovery Intelligence is designed not to return raw seeds, private keys, passwords or backup paths in its summary outputs.

## 6.3 Recovery Binder, QR and printing

Use the **Recovery Binder** or available recovery-sheet feature to prepare a human-readable recovery record. QR generation is performed locally. If an option to include QR codes is shown, verify the output carefully; remember that a printed private-key or seed QR is effectively another copy of the secret. Keep it secure and dispose of unnecessary drafts appropriately. Printing is not required to use SafeLedger.

# 7. Back up, verify, restore and move safely

## 7.1 Create a complete backup

1. Open **Settings → Backup & Recovery**.
2. Choose the complete **Backup** action and save the `.slgbak` file to a location separate from your working SafeLedger folder.
3. Keep the backup filename, approximate creation date and storage location in your offline recovery plan.
4. Never assume a successful file copy alone proves the backup can be opened.

Current complete-backup format **v3** contains encrypted vault files and the key envelope, plus a **SHA-256 integrity manifest** for included files. The container is not a new plaintext backup of your secrets, but it still deserves physical protection: attackers can attempt offline guessing against encrypted material they possess.

## 7.2 Verify a backup without restoring

1. In the same Backup & Recovery area, choose **Verify Backup**.
2. Select the backup and provide the matching master password if prompted.
3. Check the results for structure, manifest integrity, encrypted-vault authentication, record counts and whether independent password recovery was demonstrated.
4. Record the verification date. Repeat after important changes and before retiring an old backup.

**Under the hood — hash versus password:** A SHA-256 digest detects changes in archived bytes; it does not prove that you know the correct master password. Version-3 verification can use its key envelope to demonstrate independent password-based recovery. Older compatible backups may support more limited verification depending on how they were created. Verification does not alter the live vault.

## 7.3 Restore a backup

1. Make a fresh backup of the current working folder first whenever possible.
2. Open **Settings → Backup & Recovery**, choose **Restore**, select the intended `.slgbak` and inspect its identity/date.
3. Confirm the application's destructive replacement warning only after choosing the correct file.
4. Let SafeLedger stage and verify files, replace the active data, and create its **pre-restore safety copy**.
5. The session locks after restore. Log in again, inspect Profiles, and verify your latest recovery information before removing any safety copy.

**Under the hood — staged restore:** SafeLedger prepares and checks a staging directory, then renames directories to promote the restored data while retaining a pre-restore safety directory. A partial failure may require using that safety copy. Never delete a `pre-restore` directory automatically just because the application appears to open normally.

## 7.4 Move to a new USB drive or computer

Close SafeLedger, copy the complete application directory and `SafeLedgerData` folder, and confirm that the new location is writable. On a removable drive, wait for outstanding writes before unplugging. Keep the old copy isolated until the new installation and its backups are verified. Do not run two copies against the same data directory or attempt to merge encrypted files by hand.

# 8. Import old SafeLedger 1.x data

1. Create a safe copy of the original **1.x** data first.
2. Unlock your current SafeLedger 2.x vault.
3. Open **Settings → Import SafeLedger 1.x Data** and select the older data file/source.
4. Supply the old 1.x password to the importer when requested.
5. Review the import summary and inspect Profiles and Assets in the current-format vault.
6. Retain the untouched original 1.x data in case you need to audit or repeat the migration.

The importer is designed to read the old source without modifying it. It creates current encrypted data rather than silently rewriting the original source. Do not interpret importing as proof that an old password or private key is still correct for the service it originally protected.

# 9. Privacy and everyday security controls

## 9.1 Privacy Mode and revealing fields

**Privacy Mode** is enabled by default for new settings. Sensitive fields remain masked or collapsed until explicitly revealed, and some Copy/QR actions are unavailable until reveal. Revealing a secret makes it visible to anyone who can see your screen or capture the current desktop.

## 9.2 Emergency Lock and automatic locking

Use the application's shield/**Emergency Lock** control when stepping away. It clears the active main-process key, hides session data and resets the interface to a locked/login state; the application may minimize. Supported operating-system lock, idle, suspend/resume and portable-storage removal/identity events can also cause a session lock.

**Important:** Emergency Lock, storage removal or computer sleep do **not** count as incorrect password attempts and do **not** trigger Self-Destruct.

## 9.3 Failed password attempts and Self-Destruct

Repeated wrong master passwords can cause temporary login lockouts. The trusted main process checks lockout state and persists failed-attempt counters as part of the login request; the renderer cannot legitimately skip a separate 'record failure' step. Concurrent attempts are serialized.

**Self-Destruct Protection is off by default for new settings.** If you explicitly enable it and the configured failed-login/lockout limits are exhausted, SafeLedger **attempts to overwrite and delete local encrypted vault files**. Treat this as potentially irreversible application-level data loss. It is *not* a guarantee of physical erasure: SSD wear leveling, USB firmware, filesystem snapshots, backups and other copies can retain recoverable bytes. Create and verify backups before even considering this option. Test such behavior only on disposable data.

## 9.4 Clipboard and Activity History

The program attempts to clear a copied secret from the clipboard after a short period when the clipboard still contains that same value. This is a hygiene feature, not a guarantee: clipboard managers, screen capture, remote sessions and other applications may already have captured the secret.

The local Activity History records generic event names/timestamps, not the sensitive values of seeds, private keys or passwords. It is intended to help understand workflow events, not to serve as a complete tamper-proof security ledger.

# 10. Nerd notebook: the architecture and what it guarantees

## 10.1 Encryption layers in one diagram

```
Master password
   | Argon2id (memory-hard password KDF)
   v
Key-encryption material
   | decrypts/authenticates versioned envelope
   v
Random 256-bit Data Encryption Key (DEK)
   | AES-256-GCM authenticated encryption
   v
Encrypted Profile/Vault data files (SLG2 format)
```

The encrypted **key envelope** permits password changes without a full rewrite of every vault file. AES-GCM detects data authentication failures; it does not provide forward secrecy if the master password and encrypted copies are compromised later. The data key lives in the trusted main-process session while the application is unlocked and is cleared on lock.

## 10.2 Why narrow IPC and serialized writes matter

The renderer sends requests to trusted Electron main-process handlers, which validate the request and reread the encrypted authority. Modern mutations send only the selected Wallet/Asset, the prior snapshot and intended operation. A stale or ambiguous selection is rejected rather than silently modifying a different row.

Starting with the 2.6.118/2.6.119 development cleanup, normal storage requests use **per-request IPC responses** and trusted operation ordering. Backup, restore and import coordinate with storage operations so they do not casually race active writes. Emergency Lock still clears the key immediately rather than waiting behind a potentially long storage task. This makes failures easier to reason about; it is not a claim of formal transactional verification across every possible power-loss scenario.

## 10.3 Why journal markers exist

Atomic file replacement writes a temporary file and renames it into place, syncing the containing directory where supported. A crash may occur between a change to an encrypted Profile file and a change to the encrypted Profile list. Tiny non-secret transaction markers help the next successful unlock decide whether to restore, finish or preserve the operation for manual recovery. On uncertain outcomes, preserving encrypted bytes is safer than guessing they are orphaned.

## 10.4 Threat model and limitations

| Helps protect against | Does not by itself eliminate |
|:--|:--|
| Casual reading of files copied from a lost USB drive | Weak/stolen master passwords and offline brute force |
| Unnoticed changes to authenticated encrypted data | Malware/keylogging on an unlocked computer |
| Misidentification of stale Wallet/Asset edits | User errors in recovery instructions or wrong blockchain selection |
| Simple whole-folder loss when a verified backup exists | Loss of every backup; physical destruction; bad backup passwords |
| Unwanted session exposure after OS/device lock events | Memory forensics, compromised operating systems, screenshots |

SafeLedger is a recovery-information manager, not a substitute for hardware-wallet practices, cold-storage planning, independent proof-of-recovery drills, or a secure endpoint.

# 11. Troubleshooting without making things worse

| Symptom | Safer first response |
|:--|:--|
| Incorrect password / temporary lockout | Stop guessing; check your recorded master password and wait out the configured lockout. |
| Profiles appear missing after moving the app | Close it; inspect whether the full `SafeLedgerData` folder moved with the application. Do not create a new empty data folder over the old one. |
| Portable storage rejected | Use a writable, non-translocated folder and ensure the correct drive is mounted. Do not disable storage checks by moving vault files randomly. |
| "Item changed" when saving | Reload the Profile and retry the edit against its current encrypted version; another change may have invalidated the original snapshot. |
| Backup fails verification | Preserve that backup unchanged; create a new backup if the live vault is intact and inspect the provided error. |
| Restore interrupted or safety copy present | Stop modifying files; keep both current and `pre-restore` directories and seek help using copies, not originals. |
| Old data will not import | Retain the original 1.x source and confirm the matching 1.x password; do not edit the encrypted source file. |
| QR or printed output contains a secret | Treat it as sensitive recovery material and secure or destroy unnecessary copies. |

# 12. New and changed in the 2.6.115–2.6.119 development line

| Version | Relevant update |
|:--|:--|
| 2.6.115 | Additional real offline account/service brand artwork and its local registry. |
| 2.6.116 | Main-process password-attempt accounting and lockout authority; locked Change Password requests denied. |
| 2.6.117 | Stale Wallet/Asset targeting protections; crash-recoverable Profile deletion and improved write durability; accurate Self-Destruct notices. |
| 2.6.118 | Direct IPC responses; narrow encrypted-data mutation requests; real Light/Colorful/Dark GUI layout checks. |
| 2.6.119 | More conservative Profile creation recovery; shared storage operation ordering; remaining Settings/startup IPC modernization; historical adapters moved to test fixtures. |

These are development-branch changes until explicitly merged and released. The build's own version and release notes always take precedence over this edition's feature list.

# 13. Practical security checklist

- [ ] The master password is unique, strong, and recoverable by your approved method.
- [ ] The application and its complete `SafeLedgerData` folder are kept together.
- [ ] Your operating system and removable drive have appropriate full-disk encryption.
- [ ] Real recovery secrets are stored only when you deliberately choose to store them.
- [ ] At least one complete `.slgbak` exists on separate storage.
- [ ] A recent backup has passed **Verify Backup**, and you know its password.
- [ ] You have rehearsed a safe, non-destructive recovery drill.
- [ ] Key recovery information has both a digital plan and an independent offline fallback.
- [ ] You understand that Self-Destruct can erase the live vault but cannot guarantee physical erasure.
- [ ] You can identify your installed version and the appropriate matching release notes.

**Project resources:** [GitHub repository](https://github.com/MieleMadness/SafeLedger) · [Security policy](https://github.com/MieleMadness/SafeLedger/blob/master/SECURITY.md) · [License](https://github.com/MieleMadness/SafeLedger/blob/master/LICENSE) · [Project website](https://safeledger.tnypg.com)

*This manual is educational documentation, not a security certification or an endorsement of storing every sensitive recovery secret digitally. SafeLedger is licensed under Apache 2.0; refer to the project LICENSE, NOTICE and third-party notices for binding terms.*