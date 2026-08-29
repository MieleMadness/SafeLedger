# SafeLedger 2.3 — Device Security & Recovery Health

## Release goal

SafeLedger 2.3 strengthens the boundary between an unlocked vault and the physical device running it. The release focuses on automatic session locking, removable-storage failure handling, storage-health visibility, and backup-age awareness while preserving the crypto, vault schema, migration behavior, and offline/portable model established in SafeLedger 2.1 and cleaned up in 2.2.

Target release version: **2.3.0**

This release should make SafeLedger safer when a computer is locked, suspended, resumed, or when the storage containing `SafeLedgerData` becomes unavailable.

## Non-negotiable invariants

- Existing SafeLedger 2.x vaults open without conversion.
- SafeLedger 1.x read-only import continues to work.
- AES-256-GCM vault encryption does not change.
- Argon2id key-envelope behavior does not change.
- The Data Encryption Key remains main-process only and is explicitly zeroed on lock.
- Backup format v3 remains unchanged.
- Backup format v2 remains accepted for restore compatibility.
- Portable `SafeLedgerData` placement remains unchanged.
- No cloud service, telemetry, account, or network dependency is introduced.
- Emergency Lock remains available at the lower-right edge of the application.
- Search, Dashboard, and Activity History remain available from the top utility area.
- A storage or device-security event must never trigger Self-Destruct.

## Primary outcomes

### 1. One centralized session-lock path

Create a single main-process function such as `lockSession(reason, options)` and route every non-password lock through it. It must clear the active DEK immediately, reset the renderer to login, optionally minimize/hide depending on reason, record only generic activity when storage is available, and be safe to call repeatedly.

Suggested events: `session-locked-manual`, `session-locked-screen`, `session-locked-suspend`, `session-locked-resume`, `session-locked-storage-unavailable`, `session-locked-idle-state`.

### 2. Lock on operating-system security events

Use Electron `powerMonitor` after `app.whenReady()`. Lock on `lock-screen` where supported, lock on `suspend`, ensure the app is locked on `resume`, and poll `getSystemIdleState()` while unlocked for a reported locked state. Never auto-unlock.

### 3. Portable-storage disconnect protection

Create a random non-secret storage identifier under `SafeLedgerData`, load it in the main process, and probe the data root while unlocked every few seconds. Missing/unavailable storage or an identity mismatch immediately clears the DEK and locks the session. Never invoke Self-Destruct and never auto-unlock when storage returns.

### 4. Storage Health

Expose sanitized operational state only: connected, writable, freeBytes when available, portableRoot, lastCheckedAt, status and short reason enum. Never expose disk serials, OS device IDs, volume UUIDs, unrelated mounts, or vault contents.

### 5. Backup-age awareness

Add non-secret settings metadata: `lastBackupAt`, `lastVerifiedBackupAt`, `lastVerifiedBackupCreatedAt`, and `backupReminderDays` (recommended default 30). Successful backup/verification updates timestamps; cancelled or failed operations do not. Never store backup paths.

### 6. Security & Storage UI

Add compact Settings/Dashboard status presentation for session protection, storage connection/writability/free space, last backup and last verified backup, with concise non-secret warnings.

### 7. Activity-history integration

Only generic events may be recorded. Do not log backup paths, profile/wallet/asset names, drive identifiers, secrets, or recovery locations.

## Implementation sequence

### Phase A — Centralized lock controller
1. Add a main-process lock controller.
2. Route Emergency Lock through it.
3. Add a renderer event/reset path.
4. Add idempotency tests.
5. Verify raw DEK zeroing for every reason.

### Phase B — OS lock/suspend integration
1. Register `powerMonitor` listeners.
2. Lock on supported `lock-screen` events.
3. Lock on `suspend` everywhere.
4. Force locked state on `resume`.
5. Poll idle-state only while unlocked.
6. Add test seams.

### Phase C — Storage identity and disconnect guard
1. Create/read random storage identity.
2. Add unlocked-session storage probe.
3. Handle missing/unavailable storage cleanly.
4. Lock immediately when data root disappears.
5. Reject wrong storage identity on reappearance.
6. Confirm no path invokes Self-Destruct.

### Phase D — Storage Health
1. Add main-process storage-health service.
2. Add preload API with sanitized results.
3. Add writable/free-space checks.
4. Add Settings/Dashboard status card.
5. Add non-blocking warning states.

### Phase E — Backup-age metadata
1. Extend settings normalization.
2. Update successful backup/Verify flows.
3. Add deterministic age helper tests.
4. Add UI presentation.
5. Confirm old settings normalize forward.

### Phase F — Release hardening
1. Add dedicated device-security regression tests.
2. Run full regression suite.
3. Run Electron crypto smoke test.
4. Run real GUI smoke test.
5. Build Windows portable executable.
6. Build Linux AppImage.
7. Verify 1.x import and v2/v3 backup compatibility.
8. Bump to 2.3.0 only after implementation gates pass.

## Release acceptance gates

SafeLedger 2.3 is ready to merge when Windows/Linux regression, Electron crypto smoke, real GUI smoke, and packaging all pass; OS/device security test seams prove DEK zeroing; resume cannot restore an old session; simulated storage removal locks immediately; wrong storage identity is rejected; disconnect paths cannot trigger destructive cleanup; Storage Health exposes only approved fields; backup metadata contains timestamps only; legacy import and v2/v3 backup compatibility remain green; and no network dependency is introduced.

## Package/version strategy

Keep the package at **2.2.0** during implementation. Only after all gates pass set package/lock metadata to **2.3.0**, update README release wording, run both platform workflows again, merge into `master`, and then prepare the release tag/artifacts.
