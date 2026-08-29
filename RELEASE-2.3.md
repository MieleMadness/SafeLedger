# SafeLedger 2.3 — Device Security & Recovery Health

## Release status

**Release candidate: 2.3.0**

SafeLedger 2.3 strengthens the boundary between an unlocked vault and the physical device running it. The implementation adds centralized automatic session locking, removable-storage failure handling, storage-health visibility, and backup-age awareness while preserving the crypto, vault schema, migration behavior, and offline/portable model established in SafeLedger 2.1 and modernized in 2.2.

The release candidate is ready for final Windows/Linux validation. It must not merge unless regression, Electron crypto smoke, real GUI smoke, and packaging all pass on the exact 2.3.0 head.

## Preserved invariants

- Existing SafeLedger 2.x vaults open without conversion.
- SafeLedger 1.x read-only import remains compatible.
- AES-256-GCM vault encryption is unchanged.
- Argon2id key-envelope behavior is unchanged.
- The Data Encryption Key remains main-process only and is explicitly zeroed on lock.
- Backup format v3 is unchanged.
- Backup format v2 remains accepted for restore compatibility.
- Portable `SafeLedgerData` placement is unchanged.
- No cloud service, telemetry, account, or runtime network dependency was introduced.
- Emergency Lock remains at the lower-right edge of the application.
- Search, Dashboard, and Activity History remain in the top utility area.
- Storage and device-security events never trigger Self-Destruct.

## Implemented outcomes

### 1. Centralized session-lock path

SafeLedger now routes non-password security locks through a main-process lock controller. It clears the active DEK before UI/minimize/reload work, can reset the renderer to a login state, records only generic privacy-safe activity when possible, and is safe to invoke repeatedly.

Recognized privacy-safe lock events include manual Emergency Lock, OS screen lock, suspend, resume fail-safe, storage unavailable, storage identity mismatch, and locked idle-state detection.

### 2. Operating-system security events

Electron `powerMonitor` hooks are installed after application readiness. SafeLedger locks on supported `lock-screen` events, locks on suspend, enforces a locked state on resume, and polls `getSystemIdleState()` while unlocked for an OS-reported locked state. None of these paths auto-unlock.

### 3. Portable-storage disconnect protection

SafeLedger creates a random non-secret `storage-id.json` under `SafeLedgerData` and probes the expected storage while unlocked. Missing/unavailable storage or an unexpected identity causes the DEK to be cleared and the session locked.

The marker is device-local operational metadata, is excluded from complete backups, and is regenerated after a successful restore. A malformed marker can be safely repaired while establishing the startup baseline before a vault is unlocked; corruption or identity changes detected during an unlocked session fail closed and lock the session.

### 4. Storage Health

The main process exposes sanitized operational state only: connection state, writability, free bytes when available, portable data-root path, last check time, status, and a short reason enum. It does not expose disk serials, hardware IDs, volume UUIDs, unrelated mounts, or vault contents.

Storage Health is surfaced in Settings and the Recovery Dashboard.

### 5. Backup-age awareness

Non-secret settings metadata tracks:

- `lastBackupAt`
- `lastVerifiedBackupAt`
- `lastVerifiedBackupCreatedAt`
- `backupReminderDays`

Successful backup/verification operations update timestamps. Cancelled or failed operations do not. Backup paths are not persisted. Reminder choices are Off, 30, 60, or 90 days, with 30 days as the normalized default for existing settings without a value.

### 6. Security & Storage UI

Settings includes a **Device & Storage Security** section with storage state, writability, free-space information when available, backup freshness, and reminder configuration. The Recovery Dashboard includes a compact local device/backup health summary and warnings.

### 7. Activity-history integration

Activity History records only generic event names and timestamps for device-security transitions. It does not log backup paths, Profile/Wallet/Asset names, drive identifiers, secrets, recovery locations, or detailed device information.

## Implementation phases completed

### Phase A — Centralized lock controller
- Main-process lock controller added.
- Emergency Lock routed through the controller.
- Renderer reset/login path retained.
- Idempotency regression coverage added.
- DEK-clearing-first behavior covered by tests.

### Phase B — OS lock/suspend integration
- `powerMonitor` listeners installed.
- Supported OS screen-lock events lock the vault.
- Suspend locks the vault.
- Resume cannot restore an old unlocked session.
- Idle-state polling runs only while unlocked.
- Test seams cover event behavior.

### Phase C — Storage identity and disconnect guard
- Random local storage identity implemented.
- Unlocked-session storage probing implemented.
- Missing/unavailable storage locks the session.
- Wrong identity locks the session.
- Startup repair handles malformed non-secret marker metadata before unlock.
- No storage path invokes Self-Destruct.

### Phase D — Storage Health
- Main-process storage-health service implemented.
- Explicit preload API implemented.
- Writable/free-space checks implemented.
- Settings and Dashboard presentation implemented.
- Warning states remain non-secret and non-destructive.

### Phase E — Backup-age metadata
- Settings normalization extended backward-compatibly.
- Successful Backup and Verify flows record timestamps.
- Deterministic age helper coverage added.
- Settings and Dashboard presentation added.
- Backup paths are never stored in settings.

### Phase F — Release hardening
- Dedicated device-security regression tests added.
- Dashboard device-health regression test added to the mandatory suite.
- Full regression suite passed on the pre-version-bump implementation head on Windows and Linux.
- Electron crypto smoke passed on Windows and Linux.
- Real GUI smoke passed on Windows and Linux.
- Windows portable and Linux AppImage packaging passed on the pre-version-bump implementation head.
- SafeLedger 1.x import and v2/v3 backup compatibility remain part of the mandatory regression suite.
- Package version moved to 2.3.0 for the final release-candidate validation.

## Release acceptance gates

SafeLedger 2.3 may merge only when the exact **2.3.0** release-candidate head passes:

1. Full regression suite on Windows and Linux.
2. Electron crypto smoke on Windows and Linux.
3. Real GUI startup smoke on Windows and Linux.
4. Windows portable EXE build and artifact upload.
5. Linux AppImage build and artifact upload.
6. Device-security regressions proving DEK-clearing-first lock behavior.
7. Simulated storage removal and identity mismatch lock behavior.
8. Proof that storage/device-security paths cannot trigger destructive cleanup.
9. Sanitized Storage Health field boundaries.
10. Timestamp-only backup-age persistence.
11. SafeLedger 1.x import continuity.
12. Backup v2/v3 compatibility.
13. No new runtime network dependency.

## Package/version strategy

The application package version is **2.3.0** for the final release candidate. The dependency graph is unchanged from the tested implementation; the existing dependency lock remains the install source of truth for `npm ci`.

After the exact release-candidate head passes both platform workflows, PR #4 can be merged into `master`. Release tagging/publishing remains separate from the merge and is handled by the later distribution/trust release work.
