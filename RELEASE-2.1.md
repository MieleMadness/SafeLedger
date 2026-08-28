# SafeLedger 2.1 — Continuity & Hardening

## Release goal

SafeLedger 2.1 focuses on protecting long-lived user data and consolidating the security architecture introduced in SafeLedger 2.x. The release deliberately prioritizes migration safety, backup confidence, IPC boundaries, and future schema compatibility over visual-framework changes.

Target release version: **2.1.0**

## Primary outcomes

### 1. SafeLedger 1.x read-only importer

SafeLedger 2.1 can import an original SafeLedger 1.x `safeledgerdata` folder into an already initialized SafeLedger 2.x data set.

Safety invariants:

- The 1.x source folder is opened read-only by the importer.
- The legacy password is used only to decrypt the selected 1.x files in memory.
- Original 1.x files are never renamed, rewritten, deleted, or converted in place.
- Imported Profiles receive new SafeLedger 2.x vault file identifiers.
- Imported vaults are re-encrypted using the active SafeLedger 2.x Data Encryption Key.
- Duplicate Profile names receive a numeric suffix instead of overwriting an existing Profile.
- Profile, Wallet, and Asset counts are reported when import completes.
- SafeLedger locks and reloads after a successful import.

The importer reproduces the original SafeLedger 1.x password derivation and AES-256-CBC decryption behavior only inside the isolated migration path. Current SafeLedger vault encryption remains AES-256-GCM.

### 2. Versioned vault data schema

SafeLedger vault data now carries a `schemaVersion` independent of the wallet catalog version and encryption format.

The schema layer:

- migrates older/missing schema versions forward in memory;
- rejects vault data created by a newer unsupported schema;
- gives future releases a deterministic `v1 -> v2 -> v3` migration path;
- prevents another data-compatibility cliff as the application evolves.

### 3. Backup verification and integrity manifests

New complete backups use backup format version 3 and contain a SHA-256 digest for every included file.

The **Verify Backup** action checks a backup without restoring it and reports:

- Profile count
- Wallet count
- Asset count
- File count
- Backup creation time when available

Verification checks the backup manifest and cryptographically authenticates the encrypted vault list and every Profile vault against the active SafeLedger data key. Backup format version 2 remains accepted for restore compatibility.

### 4. Safer Self-Destruct behavior

Self-Destruct Protection is now **off by default for new settings**. Brute-force lockouts remain enabled.

Existing settings that explicitly enabled Self-Destruct remain enabled. Enabling it continues to require a destructive-action warning, now with stronger guidance to maintain a verified backup on separate storage.

### 5. IPC and Electron perimeter hardening

SafeLedger 2.1 continues the migration toward a strict main-process security boundary:

- legacy IPC handlers validate the sender;
- Profile vault filenames are validated before filesystem use;
- renderer payload structures are validated before persistence;
- current vault data is normalized through the schema layer before save;
- crypto IPC validates the requesting renderer;
- unexpected navigation is denied;
- new renderer windows are denied;
- webviews are disabled;
- renderer permission requests are denied;
- insecure mixed content is disabled;
- the application document has a restrictive Content Security Policy.

### 6. Pull-request CI

Windows and Linux workflows run on pull requests targeting `master`, before changes are merged.

The version-continuity check no longer requires a product-version bump for every development commit. It prevents version rollback while allowing normal documentation, test, and implementation commits to retain the current package version until release preparation.

## Regression coverage added

SafeLedger 2.1 adds continuity-focused tests for:

- vault schema migration;
- rejection of unsupported future schema versions;
- exact SafeLedger 1.x password/key derivation compatibility;
- SafeLedger 1.x AES-256-CBC import into current encrypted vaults;
- source-file byte-for-byte preservation during legacy import;
- wrong-password rejection;
- Profile/Wallet/Asset migration counts;
- SHA-256 backup manifest validation;
- tamper detection;
- backup path traversal rejection;
- Self-Destruct opt-in defaults;
- CSP, navigation, permission, and trusted-IPC hardening.

## Release acceptance gates

SafeLedger 2.1 is ready to merge when all of the following are true:

1. Full regression suite passes on Windows and Linux.
2. Electron crypto smoke test passes on Windows and Linux.
3. Real GUI smoke test passes on Windows and Linux.
4. Windows portable executable builds successfully.
5. Linux AppImage builds successfully.
6. A legacy 1.x fixture imports without modifying its source files.
7. A tampered version-3 backup fails integrity validation.
8. Existing version-2 complete backups remain structurally accepted for restore.
9. No renderer receives a raw Data Encryption Key.
10. `master` remains unchanged until the release pull request passes its gates.

## Release preparation after CI

After the implementation pull request passes CI:

1. Set `package.json` and lockfile release metadata to `2.1.0`.
2. Update final README release wording.
3. Run both platform workflows again from the release candidate.
4. Merge to `master`.
5. Tag the release as `v2.1.0`.
6. Publish Windows portable and Linux AppImage artifacts with SHA-256 release checksums.

## Deferred to later releases

These are valuable, but intentionally excluded from the 2.1 security/data-continuity scope:

- Bootstrap 3 removal / CSS Grid migration
- Font Awesome 4 replacement
- full renderer Electron-shim removal
- complete Coin/Asset/internal Record terminology migration
- local/configurable display timezone cleanup
- OS lock/suspend/resume auto-lock integration
- removable-drive disconnect detection
- macOS packaging
- Windows code signing
- SBOM publication
- Electron major-version upgrade
- Marked major-version upgrade

Keeping these separate limits the amount of unrelated change surrounding the migration and recovery code.
