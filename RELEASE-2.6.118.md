# SafeLedger 2.6.118 — Phase 3: IPC, UI and Release Maintainability

Implements the third phase of [SECURITY-CLEANUP-3-PHASES.md](SECURITY-CLEANUP-3-PHASES.md).
Carries forward the 2.6.116 login protection and 2.6.117 encrypted-data
integrity/transactional Profile deletion changes.

## 1. Remove shared workspace result-channel plumbing

Prior architecture routed six workspace commands through `ipcRenderer.send`
and a common `result` response event. To prevent one operation stealing
another's response, preload implemented a global Promise queue and temporary
listeners. It was a valid historical workaround, but did not provide direct
per-request ownership.

The six workspace commands now use `ipcMain.handle` / `ipcRenderer.invoke`
with a response returned to exactly its caller. A **trusted main-process
operation queue** preserves serialization of concurrent reads and mutations.
The older `init-system` and `save-settings` events retain their own dedicated
channels pending unrelated UI/lifecycle changes; security/session-lock and
Self-Destruct notifications remain explicit out-of-band events.

This is a structural transport change: the encrypted vault remains owned
by the main process, and every IPC handler still validates the trusted
renderer event and active key before attempting vault operations.

## 2. Send targeted Wallet and Asset commands

The renderer previously sent an entire Profile snapshot for a single Wallet
or Asset edit, even though the main process correctly re-read authoritative
encrypted data before saving. `workspace-mutation-command.js` now extracts
only the current item, its original snapshot, the relevant Profile file, and
the requested action. The main process validates these narrow payloads and
rejects full-vault mutation requests.

Deletes target one unchanged original Wallet or Asset, rather than comparing
entire remaining lists from the renderer. This preserves the exact-original
identity protections added in Phase 2 for starter Wallets with shared
creation timestamps.

The old full-snapshot adapters in `data-write-service.js` are retained only
for old-format compatibility regression fixtures. Runtime IPC does not
accept them, and no renderer module calls them; migration-test coverage
should remain until equivalent narrow-command tests replace every historical
fixture. Avoid reintroducing a renderer-to-main full-vault write path.

## 3. UI ownership and real rendered layout checks

- Remove duplicated `known-service-brand-image` CSS class assignment without
  changing icon appearance or color.
- Extend **real Electron Chromium GUI smoke** with a geometry check of the
  Profile search-to-results gap, Profile icon frame dimensions, grid display,
  and white backing for branded marks, across Light, Colorful and Dark.
- Keep the existing 18-file canonical CSS cascade and ownership audit intact.
  The audit had no mechanically proven duplicate rules or shadowed important
  declarations to remove safely; do not delete cascade overrides merely
  because they appear similar or use `!important`.

The new GUI checks are layout measurements, **not** full screenshot/image
diffs. More coverage may be added as new screens acquire reviewed geometry
contracts without forcing unrelated theme changes.

## 4. Release review and testing

The main-process queue and target command service have standalone behavioral
regression coverage (including concurrent queue failures, actual encrypted
Wallet/Asset editing and exact deletion). The canonical suite count increases
from 50 to **51**. Existing IPC assertion tests now require direct invoke
responses rather than the retired shared event workaround.

Review the scoped branch comparison:

`safeledger-2.6.117-development...safeledger-2.6.118-development`

When building this stacked PR, let GitHub Actions run against `master`
first (the release workflow targets `master`), then change the PR base
to the previous reviewed development branch for a manageable patch-only
diff. Do not merge a later phase before earlier stacked phases without
reviewing the dependency chain. Every release still gets a patch bump,
full regression suite, real GUI smoke, and Windows/Linux/macOS packaging.

## Security and data guarantees

No intended changes to AES-GCM, Argon2id, Self-Destruct thresholds,
portable root paths, current encrypted file schema, backup/restore, or
legacy read-only import. Test with disposable encrypted recovery data.
Never merge without explicit owner approval.
