# SafeLedger 2.6.50 — Phase 2: Recovery Confidence

SafeLedger 2.6.50 is a development/test candidate focused on proving that backups are actually recoverable and making multi-file recovery operations resilient to interruption.

## Independent backup recovery verification

- **Verify Backup now asks for the backup master password in a masked dialog.**
- For current v3 backups, SafeLedger unlocks the key envelope stored inside the selected backup with Argon2id instead of borrowing the data key from the currently unlocked application session.
- The independently recovered data key must authenticate the encrypted vault list and every referenced encrypted profile.
- The temporary recovered data key is zeroed after the verification attempt.
- An incorrect backup password does **not** increment the live SafeLedger failed-login/lockout counter.
- Successful v3 verification is explicitly reported as **Independent password unlock confirmed**.
- Version-2 complete backups remain supported for restore and compatibility checking, but they are labeled as a legacy current-session check because v2 predates the portable key envelope and cannot prove independent password recovery.

### Why this replaces a bandaid

The previous Verify Backup behavior was useful for checking the SHA-256 manifest and proving that encrypted files matched the already-open SafeLedger session. It could still give too much confidence in a disaster-recovery scenario because it never proved that the backup's own password/key envelope could reconstruct the data key. 2.6.50 tests the recovery mechanism that would actually be needed after loss of the original installation.

## Restore transaction hardening

- Restore still writes to an isolated staging directory first.
- SafeLedger now **re-reads every staged file from disk** and compares its SHA-256 digest with the selected backup before current data is moved.
- The current `SafeLedgerData` folder is moved to the pre-restore safety location only after staging verification succeeds.
- If promotion of the staged backup fails, SafeLedger attempts to put the original folder back immediately.
- If that rollback also fails, the error now reports the retained pre-restore safety-copy path instead of silently swallowing the rollback failure.

## Interrupted profile creation recovery

- New profile creation no longer publishes the updated profile list before the encrypted profile file exists.
- A minimal `.profile-create.pending.json` transaction marker is written before multi-file profile creation begins. It contains only transaction metadata and the generated vault filename, not the profile name or secrets.
- SafeLedger creates the encrypted profile first, then atomically saves the authoritative encrypted profile list.
- A failed list commit removes the unreferenced encrypted profile file when the state can be confirmed safely.
- If a process interruption leaves a pending transaction, the next successful unlock reconciles it:
  - an uncommitted orphan profile is removed;
  - an already committed profile is kept and only the marker is cleared.
- If the state is ambiguous, SafeLedger favors retaining encrypted recoverable data rather than deleting it.

## Testing changes

A new `recovery-confidence-tests.js` behavioral suite covers:

- independent v3 password/key-envelope recovery with an unrelated live-session data key;
- wrong backup password behavior;
- authenticated-profile failure even when the backup manifest itself is valid;
- v2 legacy compatibility labeling;
- corrupted restore staging writes before live-data replacement;
- restore promotion failure and automatic rollback;
- explicit reporting when rollback itself fails;
- failed profile-list commit cleanup;
- interrupted uncommitted profile creation recovery;
- interrupted already-committed profile creation recovery.

`hotfix-2.6.50-tests.js` additionally locks the security/source contracts into the full regression suite. Historical 2.6.49 coverage was updated to remain active on later 2.6.x patches rather than requiring the package to stay exactly at 2.6.49.

## Security and compatibility

- No weakening of AES-256-GCM vault encryption.
- No weakening of Argon2id password derivation.
- No changes to the modern encrypted vault schema.
- SafeLedger 2.x data compatibility remains intact.
- SafeLedger 1.x read-only import remains intact.
- Version-2 complete backup restore compatibility remains intact.
- SafeLedger remains offline-first; independent backup verification uses only local backup data and local cryptography.

## Promotion gate

**Do not merge this 2.6.x candidate to `master` yet.** It must pass the full regression suite, Electron crypto smoke, GUI smoke, Windows Portable, Linux AppImage, and native macOS Apple Silicon workflows, followed by hands-on recovery testing.
