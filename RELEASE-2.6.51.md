# SafeLedger 2.6.51 — Phase 3: Data Ownership

SafeLedger 2.6.51 is a development/test candidate that changes who is allowed to decide what gets persisted. The renderer remains responsible for presenting forms and tracking temporary UI state, but the trusted main process is now the authority for profile, vault-item, asset, and generic settings writes.

## Authoritative vault writes

- Adds a shared `data-write-service.js` main-process persistence layer.
- Wallet and asset saves now re-read the encrypted profile from disk before applying a mutation.
- A wallet edit can change only approved wallet fields; it cannot replace the wallet's asset collection or rewrite sibling wallets.
- An asset edit can change only approved asset fields; it cannot rewrite its parent wallet, sibling assets, or another wallet.
- Existing unknown fields are preserved on the authoritative entity for compatibility with older/future data, while newly injected unapproved fields from a renderer request are not persisted.
- Creation and modification timestamps for newly changed entities are main-owned.
- Custom fields continue through the shared normalization/cap rules before persistence.

## Authoritative profile-list writes

- Profile edits no longer save a renderer-supplied replacement `vaultList`.
- The main process re-reads encrypted `vaultlist.json`, finds the requested profile by its safe encrypted filename, and applies only allowed profile fields.
- Profile ID, encrypted filename, path, and creation timestamp remain authoritative.
- Profile deletion uses the requested safe filename against the encrypted authoritative list; renderer list replacement is ignored.
- New profile creation begins from the main-process-read authoritative list and retains the crash-safe profile transaction introduced in 2.6.50.

## UI state is no longer domain data

- `vaultSelected`, `groupSelected`, and `recordSelected` are removed before profile/vault persistence.
- SafeLedger still returns the correct selection in the response sent to the active renderer so the UI remains focused after a save.
- This keeps temporary navigation state out of encrypted recovery data.

## Settings ownership

The generic `save-settings` path now uses `settingsManager.saveUserSettings()` and an explicit user-editable allowlist:

- Appearance
- Privacy Mode
- Shit Coin Mode
- Failed-attempt policy limit
- Lockout-retry policy limit
- Lockout duration
- Backup reminder cadence

The generic renderer settings path can no longer alter:

- current failed-login count;
- current lockout count;
- active lock state or lock timestamp;
- Self-Destruct enabled state;
- last backup/verification evidence;
- settings creation metadata.

Those values remain owned by the dedicated trusted security/device workflows. Unknown setting names are rejected rather than silently becoming configuration.

## Safe delete compatibility

Older wallet/asset data does not always contain immutable item IDs. To avoid a forced data migration, the existing renderer delete shape is accepted only after a main-process comparison against authoritative data proves that exactly one item was omitted and every remaining item is unchanged. A delete that also tries to modify another item is rejected.

## Adversarial regression coverage

Adds `scripts/data-ownership-tests.js`, which deliberately attempts to exceed the authority of ordinary UI actions. It verifies that:

- one profile edit cannot rewrite another profile or its own main-owned identity fields;
- one wallet edit cannot replace its assets or modify another wallet;
- one asset edit cannot modify its parent/siblings/other wallets;
- renderer-injected unknown fields do not become stored data while existing compatibility fields survive;
- temporary profile/wallet/asset selections are absent from persisted encrypted data;
- valid single-item deletes work;
- a delete containing a hidden second modification fails;
- a generic Settings save cannot clear lockout/security/backup evidence;
- unknown settings are rejected.

`hotfix-2.6.51-tests.js` locks these ownership contracts into the full regression suite. Phase 2 Recovery Confidence coverage remains active on the candidate.

## Compatibility and security

- No forced vault-schema migration.
- No change to AES-256-GCM encryption.
- No change to Argon2id password derivation.
- No weakening of the main-only DEK/session boundary.
- SafeLedger 2.x data compatibility remains intact.
- Existing unknown compatibility fields are intentionally preserved on authoritative records.
- SafeLedger 1.x read-only import remains intact.
- Offline-first and portable-storage behavior remains intact.

## Promotion gate

**Do not merge to `master`.** SafeLedger 2.6.51 must pass the complete regression suite, Electron crypto smoke, real GUI smoke, Windows Portable, Linux AppImage, native macOS Apple Silicon packaging/architecture verification, and hands-on create/edit/delete/settings testing before promotion.
