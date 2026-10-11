# SafeLedger 2.6.117 — Phase 2: Encrypted Data Integrity and Recovery

Phase 2 of [SafeLedger's three-phase cleanup](SECURITY-CLEANUP-3-PHASES.md).
Builds on 2.6.116 main-process-owned authentication and every previous update.

## 1. Fail closed on stale Wallet and Asset identifiers

Before: when a requested Wallet/Asset creation timestamp was absent or
ambiguous, the update code could fall back to the renderer's old selected
array index. After resorting or deleting an item, this might update a
*different* item.

After: a supplied creation identifier must match exactly one authoritative
encrypted record. If it does not, the operation rejects with the existing
reload message. Legacy entries without any creation identifier retain a
restricted index-only compatibility path, but cannot edit modern entries
that have an identifier. Existing starter Wallets sometimes share one
creation timestamp; current Wallet/Asset edit flows now send their original
Wallet snapshot so the trusted main process can identify the exact unchanged
entry rather than guessing from a duplicated timestamp or row index.
No vault schema change or migration is required.

Tests exercise stale and ambiguous IDs, reordering and old vault entries.

## 2. Recoverable encrypted Profile deletion

Before: removing a Profile first removed its index entry, then deleted its
encrypted file. A failed second operation could strand encrypted data
outside the Profile index.

After: `profile-delete-transaction.js` writes a minimal non-secret marker,
moves the encrypted file into a same-directory staging path, commits the
updated encrypted Profile list, and then removes staged ciphertext and
marker. The next successful unlock reconciles a pending marker against
the authenticated encrypted Profile list:
- A still-referenced Profile is restored from staging.
- An unreferenced Profile's staged file is cleaned up.
- An unreadable/invalid marker, unreadable encrypted index, or ambiguous
  duplicate file state is never used as permission to delete ciphertext.

Unlike a broad best-effort cleanup, failures retain the journal and
recoverable ciphertext for later resolution. Tests cover interruption at
all three boundaries, save failures before/after index commit, file
cleanup failures, and corrupted/unauthenticated recovery state.

## 3. Stronger atomic rename durability

After syncing the temporary file and atomically renaming it, the shared
atomic writer attempts to sync the parent directory on supported POSIX
filesystems. Windows and unsupported removable-device/filesystem directory
syncs fall back without weakening the existing atomic replacement.
Unexpected filesystem I/O sync failures are surfaced (the rename may
already have succeeded, so callers must verify authoritative data before
reversing a transaction). This does not guarantee power-loss durability
on every removable drive, USB controller, SSD, or filesystem.

## 4. Accurate Self-Destruct expectations

Self-Destruct warnings now distinguish application-level overwrite and
deletion of local encrypted files from guaranteed physical removal of every
storage, SSD wear-leveling, snapshot, or backup copy.

## Coverage and compatibility

50 canonical regression suites include new Profile deletion recovery tests.
No intentional changes to Argon2id, AES-GCM, stored encrypted vault schema,
key envelope, DEK lifecycle, legacy 1.x import, or portable data paths.

Before release: verify complete Windows, Linux and macOS builds on the
exact final head and manually test Profile add/edit/delete and interrupted
recovery with **disposable test data**, never live recovery secrets.
