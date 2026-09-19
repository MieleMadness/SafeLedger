# SafeLedger Stabilization Plan

SafeLedger is being hardened in five focused phases so old compatibility workarounds, UI patches, and security shortcuts can be replaced with explicit behavior and regression coverage instead of accumulating more one-off fixes.

## Engineering rule for every phase

When a workaround is discovered, document four things before it is retired:

1. **What problem it was solving.** Preserve the useful behavior instead of deleting code blindly.
2. **Why it became a bandaid.** Identify the architectural boundary it bypassed or the failure mode it did not cover.
3. **What replaces it.** Prefer a single reusable transaction, state boundary, renderer, schema, or security service.
4. **What test prevents it from returning.** New behavior is not considered fixed until an interruption, invalid input, or security boundary is exercised by regression coverage.

Compatibility is not an excuse to weaken security. SafeLedger 2.x data compatibility and SafeLedger 1.x read-only import should be retained intentionally and tested separately from modern behavior.

---

## Phase 1 — Authentication & Locking

Goal: centralize authentication state, lock behavior, retry accounting, and sensitive-session cleanup so individual screens do not invent their own security state.

Future rule: renderer navigation must never be the source of truth for whether SafeLedger is unlocked. Trusted main-process session state owns the security decision.

---

## Phase 2 — Recovery Confidence — SafeLedger 2.6.50

Goal: prove that recovery will work after loss of the original installation, and make multi-file recovery operations interruption-safe.

### Bandaid retired: backup verification using the current session data key

**What it solved:** The older Verify Backup path authenticated the encrypted vault list and every profile and combined that with the v3 SHA-256 file manifest. This was useful for detecting damaged or mismatched backup contents.

**Why it was still a bandaid:** It used the data key already held by the currently unlocked SafeLedger session. That proved the backup matched the installation that was already open, but it did not prove that the backup's own password/key envelope could recover the data after the original installation was lost.

**Replacement:** SafeLedger 2.6.50 asks for the backup master password in a masked dialog, unlocks the key envelope stored inside the v3 backup with Argon2id, obtains the backup DEK from that envelope, and authenticates the encrypted vault list plus every referenced profile with that independently recovered key. The temporary recovered DEK is zeroed after verification. A wrong backup password does not increment the live SafeLedger failed-login counter.

**Legacy behavior:** Version-2 backups remain restorable and can still be authenticated against the current unlocked session. The UI/report explicitly labels this as a legacy compatibility check because v2 backups predate the portable key envelope and therefore cannot prove independent password recovery.

### Bandaid retired: trusting staging writes before restore promotion

**What it solved:** Restore already wrote a separate staging directory and preserved the existing `SafeLedgerData` folder as a pre-restore safety copy before promoting the staged backup.

**Why it was still a bandaid:** The code validated the backup before writing it, but it did not re-read the staged bytes from disk before replacing current data. The rollback path also swallowed a second failure if the safety copy could not be put back.

**Replacement:** SafeLedger 2.6.50 re-reads every staged file and compares its SHA-256 digest with the source backup bytes before the live folder is moved. Folder promotion and rollback are a dedicated transaction. If promotion fails, the original folder is restored. If rollback itself fails, SafeLedger reports the exact retained pre-restore safety-copy location instead of hiding the failure.

### Bandaid retired: profile-list-first creation

**What it solved:** The older profile creation flow updated the encrypted profile list and then initialized the new encrypted profile file. It matched the UI's save-first flow and kept the implementation simple when each file write was considered independently.

**Why it was still a bandaid:** A failure or process interruption between those two writes could leave the authoritative profile list referencing a profile file that had never been created.

**Replacement:** SafeLedger 2.6.50 journals profile creation with a minimal non-secret transaction marker, creates the encrypted profile first, and publishes the updated encrypted profile list only after the profile file exists. If the list commit fails, the new unreferenced profile file is rolled back. If the process is interrupted, the next successful unlock reconciles the transaction marker: an uncommitted orphan is removed, while a profile that was successfully committed is retained. Ambiguous states favor keeping encrypted recoverable data rather than deleting it.

### Phase 2 regression requirements

The `recovery-confidence-tests.js` suite must prove:

- a v3 backup can be unlocked using its own password/key envelope even when the current SafeLedger session has an unrelated data key;
- a wrong backup password fails without using live login retry accounting;
- a backup whose manifest is valid but whose encrypted profile cannot authenticate is rejected;
- v2 backups retain their legacy compatibility path without being mislabeled as independently recoverable;
- corrupted staged restore bytes abort before current SafeLedger data is touched;
- a failed staging promotion restores the original data directory;
- a failed rollback surfaces the retained safety-copy path;
- a failed profile-list commit does not publish a missing profile;
- an interrupted uncommitted profile transaction is cleaned on the next unlock;
- an interrupted but already committed profile transaction keeps its encrypted profile.

---

## Phase 3 — Data Ownership — SafeLedger 2.6.51

Goal: centralize writes, schema validation, and settings mutations so each data type has one authoritative persistence path.

### Bandaid retired: renderer-owned complete vault saves

**What it solved:** The original desktop UI kept a complete decrypted `vaultData` object in renderer memory. Editing one wallet or asset modified that local object and sent the entire object to the main process for encryption and saving. This was simple and kept the UI responsive.

**Why it became a bandaid:** A request to edit one field effectively carried authority to replace every wallet, every asset, root metadata, selection state, and any other property in the same encrypted file. Main-process validation checked the broad shape but did not independently reconstruct what one user action was allowed to change. A stale renderer snapshot could also overwrite unrelated newer data.

**Replacement:** SafeLedger 2.6.51 adds `data-write-service.js`. The trusted main process re-reads the encrypted vault from disk for every wallet/asset mutation, resolves one requested target, normalizes an explicit allowlist of editable fields, applies that patch to the authoritative entity, writes the result, and returns the saved data to the renderer. Existing unknown fields are retained for forward/backward compatibility, while new unapproved fields supplied by the renderer are ignored. A wallet edit cannot replace its `records` collection, and an asset edit cannot rewrite its parent wallet or sibling assets.

### Bandaid retired: renderer-owned profile-list replacement

**What it solved:** Profile create/edit/delete operations previously sent the renderer's whole `vaultList` back to the main process. The main process validated the list and saved the replacement.

**Why it became a bandaid:** Editing a profile name unnecessarily gave that request authority over every profile entry, IDs, file references, creation metadata, and profile-selection state.

**Replacement:** Profile modifications now re-read `vaultlist.json` with the active DEK and patch only the named authoritative profile. Profile IDs, encrypted filenames, paths, and creation timestamps remain main-owned. Profile deletion uses only the requested safe vault filename against the authoritative encrypted list. New profile creation still uses the Phase 2 crash-safe transaction, but the starting list comes from the main process rather than the renderer snapshot.

### Bandaid retired: persisting UI selection state

**What it solved:** `vaultSelected`, `groupSelected`, and `recordSelected` traveled inside the same objects that were already being saved, so keeping the active UI selection after a save happened automatically.

**Why it became a bandaid:** These values describe a temporary screen state, not user recovery data. Persisting them mixed presentation state into encrypted domain data and increased the amount of renderer-controlled state written to disk.

**Replacement:** SafeLedger 2.6.51 strips profile/wallet/asset selections before persistence. The main process adds the appropriate selection only to the response object returned to the current renderer so the interface can stay focused after a save without storing that focus as vault data.

### Bandaid retired: generic Settings replacing security state

**What it solved:** Settings screens took the current settings object, changed one property, and sent the complete object back through `save-settings`. The settings manager normalized the object before writing it.

**Why it became a bandaid:** A normal appearance or backup-reminder save shared the same write path as failed-login counters, active lock state, Self-Destruct state, and backup verification timestamps. Those fields should be owned by security/device workflows, not by a generic renderer settings request.

**Replacement:** `settingsManager.saveUserSettings()` defines an explicit user-editable allowlist: appearance, Privacy Mode, Shit Coin Mode, brute-force policy limits, and backup reminder cadence. It re-reads authoritative settings and applies only those user fields. Failed-login/lockout counters, lock timing, Self-Destruct state, backup evidence, creation metadata, and other system-owned fields are ignored by the generic path and remain writable only by their dedicated trusted workflows. Unknown setting names are rejected.

### Safe deletion compatibility rule

Older SafeLedger wallet and asset records do not all have dedicated immutable IDs. Phase 3 does not introduce a forced schema migration just to support deletes. For the existing renderer delete contract, the main process compares the submitted post-delete collection against the authoritative decrypted collection and accepts it only when it represents **exactly one omission with every remaining item unchanged**. If another item was modified, reordered unexpectedly, or more than one item disappeared, the delete is rejected and the user must reload. This is a bounded compatibility check, not authorization to persist the submitted collection.

### Phase 3 regression requirements

The `data-ownership-tests.js` suite must prove:

- editing one profile preserves every unrelated profile and cannot rewrite its ID, encrypted filename, creation evidence, or existing compatibility metadata;
- editing one wallet preserves sibling wallets and its authoritative asset collection even if the renderer tries to replace them;
- editing one asset preserves its parent wallet, sibling assets, and unrelated wallets;
- existing unknown compatibility fields survive edits while newly injected unapproved properties do not become persisted data;
- profile/wallet/asset selection indexes are not written back to encrypted files;
- a delete succeeds only when exactly one item was removed and all remaining submitted items are unchanged;
- a delete carrying a hidden second modification is rejected;
- generic Settings can change supported user preferences but cannot rewrite failed-login counters, lock state/timing, Self-Destruct, or backup verification evidence;
- unknown setting names are rejected.

Future rule: renderer data is a request, never trusted persisted state. Main-process write services validate, normalize, and begin from authoritative disk state before every domain-data mutation. Compatibility adapters may narrow older request shapes at the trust boundary, but they must never restore renderer authority over a full encrypted object.

---

## Phase 4 — UI Consolidation

Goal: replace synthetic clicks, observer-driven icon repairs, delayed rendering fixes, and other timing-dependent UI patches with direct state-driven rendering.

Future rule: if UI correctness depends on a timer, synthetic event, or DOM repair observer, treat it as a signal that ownership of the rendered state should be moved to a single component/module.

---

## Phase 5 — Behavioral Testing & Release Trust

Goal: exercise real user flows across save/cancel/reopen/recovery boundaries and strengthen downloadable-build provenance with checksums/SBOM/release verification where practical.

Future rule: unit/source-contract tests protect implementation details, but promotion to `master` requires platform workflows plus behavioral tests that demonstrate what an end user actually experiences.
