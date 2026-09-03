# SafeLedger 2.6.6 — Add Asset & Web3 Interaction Reliability

Release: **2.6.6**

SafeLedger 2.6.6 supersedes the unmerged 2.6.5 release candidate after real-user testing exposed two interaction bugs that the earlier launch-only GUI smoke did not exercise: **Add Asset** could still fail when no Vault Item was selected, and choosing **Web3 Account** could put the renderer into a self-triggering DOM mutation loop.

## Add Asset root cause and fix

The prior selection helper converted `groupSelected` with `Number(...)` before checking for `null`. In JavaScript, `Number(null)` is `0`, so a genuinely unselected Profile could be misclassified as if Vault Item index 0 were already selected. That prevented the repair path from running.

2.6.6 fixes the selection validity check so `null` and an empty value are explicitly treated as **unselected** before any numeric index validation.

2.6.6 also removes the cross-context state ambiguity that made earlier Add Asset repairs fragile:

- `renderer-bridge.js` now registers **one preload subscription per IPC result channel**.
- The bridge fans the same renderer-world payload object out to SafeLedger UI listeners.
- The core renderer and Vault Item selection helper therefore observe the same `vaultData` object rather than separate structured-clone copies.
- The Add Asset capture handler repairs a missing selection through the normal Vault Item click path and then allows the original Add Asset click to continue normally.
- The repair no longer calls `stopImmediatePropagation`.
- The repair no longer cancels the first Add Asset click and no longer relies on a second synthetic Add Asset click.

## Web3 Account freeze root cause and fix

The split Web3/Website account UI used a MutationObserver while also rebuilding labels and grouped `<select>` contents inside the observed DOM. In addition, the older combined `Web3 / Website Account` helper could still touch the same preset field. Those two behaviors could repeatedly trigger each other after choosing Web3 Account.

2.6.6 makes the account UI idempotent:

- Grouped dropdowns cache a content signature and do not rebuild when the rendered options are already correct.
- Label/note text is only rewritten when the text actually changes.
- The split-account MutationObserver disconnects while applying its own DOM patch, then reconnects afterward.
- The legacy combined-account helper explicitly leaves **Web3 Account** and **Website Account** forms alone.
- Web3 and Website account preset organization from 2.6.5 remains grouped and alphabetized.

## Regression coverage

2.6.6 adds executable regressions that verify:

- Two renderer listeners receive the **same result/vault object** through one preload subscription.
- A mutation made by the core renderer listener is visible to the later UI listener.
- `groupSelected: null` is not accepted as Vault Item index 0.
- Add Asset selection repair updates the exact shared object the original renderer handler reads.
- A second identical Web3 grouped-dropdown render performs **zero additional DOM mutations**.
- The legacy combined-account UI does not touch Web3 Account or Website Account forms.
- Existing 2.6.4 and 2.6.5 account/icon/dropdown regressions remain active.

## 2.6.5 account organization retained

- **Web3 Account** and **Website Account** remain separate Vault Item types.
- The Vault Item Type dropdown remains grouped into Accounts and Wallets and alphabetized within each group.
- Web3 presets remain grouped into DeFi, Gaming, Identity & Naming, and NFT.
- Website presets remain grouped into Developer, Email, Entertainment, Finance & Crypto, Productivity & Cloud, Shopping & Payments, and Social & Community.
- Chain Games remains under **Web3 Account → Gaming → Chain Games** and retains its reviewed CHAIN starter assets.

## Security and compatibility

- No encrypted vault schema migration.
- No change to AES-256-GCM vault encryption.
- No change to Argon2id master-password protection.
- No change to the main-process-only DEK boundary.
- No change to backup/restore format.
- No change to Self-Destruct semantics.
- No new cloud or runtime network dependency.
- Existing SafeLedger 2.x vaults remain compatible.

## Validation target

2.6.6 must pass the complete regression suite, Electron crypto smoke, real GUI smoke, Windows x64 Portable packaging, Linux x64 AppImage packaging, and native macOS Apple Silicon arm64 packaging/architecture verification before promotion to `master`.
