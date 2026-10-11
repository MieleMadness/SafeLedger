# SafeLedger 2.6.119 — Transaction and Operation Hardening

Builds on the three completed security and code-cleanup phases through 2.6.118.

## Verified recovery over guesses

The Profile creation transaction now checks for existing Profile files or an
unresolved creation marker before beginning. If initialization, encryption,
atomic rename or the post-rename directory-sync phase throws, SafeLedger
authenticates the existing Profile list and checks whether the newly created
file exists **before** deciding what to roll back. When either check fails,
it preserves encrypted files and the recovery journal for next-unlock
reconciliation. Post-commit cleanup failure leaves a marker rather than
misreporting the Profile as missing. Invalid or unreadable list responses
cannot authorize deletion in recovery.

## Trusted storage operation ordering

Workspace reads/writes, backup snapshot/export/verification, staged restore,
legacy import, backup metadata updates, normal Settings saves, Self-Destruct
settings changes and retry counter writes use one main-process serialization
queue. The login-attempt queue remains an **isolated** instance of the same
tested queue primitive.

**Emergency Lock still clears the in-memory data key immediately**, ahead of
file I/O. This is intentional and must never be delayed behind a long backup
dialog. Operations that resume from an interactive backup/restore dialog
recheck the active session before continuing. The queue stops overlapping
writes/restore transactions; it is not a substitute for physical storage
power-loss guarantees or for full-process interruption/fault testing.

## Request-specific Settings and startup IPC

Both `init-system` and `save-settings` now reply to their invoking renderer
with `ipcMain.handle`/`ipcRenderer.invoke`. Their historical events remain
**passive notifications only** for menu/startup listeners. The obsolete
preload request-timeout/listener matching helper has been removed.

## Explicit selection identifiers

Absent, null or empty Vault Item/Asset selections no longer coerce to array
position zero. Unknown/stale stable IDs still fail closed. Legacy encrypted
vault files are not changed or migrated.

## User-facing Self-Destruct accuracy

Settings descriptions and the post-lockout message now explain that the
software **attempts** to overwrite and delete local encrypted files.
Drive firmware, SSD wear leveling, removable storage, snapshots and separate
backups may retain recoverable copies; permanent physical erasure is not
guaranteed.

## Historical adapters and GUI testing

Old full-vault mutation request adapters moved from production into
`scripts/legacy-mutation-fixtures.js` for historical regression coverage.
Main-process mutation IPC still requires the narrower authoritative
commands established in 2.6.118.

The Profile icon Chromium layout inspection moved to
`src/main/gui-smoke-layout.js`, leaving the production `main.js` without
embedded fixture markup. The two separate serial queues now share one small,
tested implementation.

## Verification and release safety

Adds a durable regression suite with simulated post-write initialization and
commit failures, uncertain authenticated recovery, cross-feature serialized
storage operations, direct-reply IPC requirements, and missing-selection
tests. The canonical suite count is **52**.

This update changes no AES-GCM/Argon2id algorithms, data-key envelope format,
encrypted Profile schema, portable root, or legacy import format. Test the
new maintenance release with disposable encrypted test vaults before moving
real recovery secrets. All three platform workflows must pass on the final
commit. **Do not merge without owner approval.**
