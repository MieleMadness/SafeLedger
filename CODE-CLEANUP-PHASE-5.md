# SafeLedger Code Cleanup — Phase 5

SafeLedger 2.6.96 begins the fifth cleanup phase: **repository hygiene and structural debt retirement**.

Phases 1–4 established durable tests, clarified main-process ownership, consolidated renderer state/services, and gave the UI one explicit stylesheet cascade. Phase 5 uses those stable contracts to remove repository baggage that no longer belongs in the current architecture—without changing encrypted data, recovery behavior, portable storage, or visible product behavior.

## Phase 5 rule

Phase 5 does not treat a static-analysis result as permission to delete a file.

A candidate is removed only after its runtime ownership, dynamic references, packaging role, regression coverage, and compatibility impact have been reviewed.

> **Delete proven dead code. Preserve live code even when static analysis cannot see how it is reached. Fix the analysis instead of deleting around it.**

This rule matters because Electron applications can load resources through more than CommonJS `require()` and HTML `<link>` tags, and because old tests can look important even after their behavior has been absorbed into current durable suites.

## 2.6.96: repository hygiene foundation

### Retire the orphaned legacy logger

`src/main/logger.js` was an old optional file logger. It defaulted to disabled, wrote to a legacy installation-code directory, and was not part of the current runtime graph.

Current SafeLedger security/activity auditing is owned by the sanitized audit path in the trusted main process. 2.6.96 removes the old logger rather than leaving it disabled or wrapping it with compatibility code.

### Fix a dead-code audit blind spot

During Phase 5 review, `src/main/css/recovery-binder.css` initially appeared to be an unlinked stylesheet because it is not imported by `app.css`.

That result was misleading. `recovery-binder-ui.js` intentionally creates a `<link>` element when the Recovery Binder opens and sets:

`link.href = 'css/recovery-binder.css'`

2.6.96 updates the audit so reachable renderer JavaScript can contribute local runtime stylesheet references. This prevents a future cleanup from deleting a working lazy-loaded feature stylesheet simply because static analysis initially missed it.

## 2.6.97: canonical settings ownership

The active settings implementation previously lived at:

`src/main/installManager/installManager/settingsManager.js`

That double-nested path was historical installation-manager structure. The module itself had already evolved into the current owner for settings normalization, appearance migration, brute-force/lockout counters, backup reminder metadata, user-editable settings filtering, and atomic settings persistence.

2.6.97 moves that implementation to:

`src/main/settings-manager.js`

The trusted main process and bootstrap now import the canonical module directly. The old nested implementation is deleted. No forwarding file, compatibility shim, duplicate implementation, or dormant copy is retained.

The Repository Hygiene suite scans active runtime JavaScript and canonical regression suites for the retired nested path so it cannot quietly return.

## 2.6.98: retire the patch-numbered test archive

Phase 1 intentionally stopped executing patch-numbered `development-*`, `hotfix-*`, and release-numbered test gates after their behavior was absorbed into durable subsystem suites. At that time the files remained in the repository as historical evidence while the canonical test architecture matured.

By 2.6.97, SafeLedger had a stable **47-suite canonical regression contract**. Windows, Linux, and macOS workflows all execute that canonical runner plus the durable release-trust, encrypted lifecycle, Electron crypto, and real GUI smoke gates. None of the patch/release-numbered files are part of current CI.

2.6.98 therefore removes **108 retired patch/release-numbered test files** from the active repository.

This is not a reduction in current test coverage. It removes obsolete copies of old release-specific policy after their behavior has been transferred into durable tests named for the subsystem or behavior they protect.

### Why Git history is the correct archive

The deleted tests remain available through repository history, including the commits that introduced and later superseded them. Keeping those same files in the live `scripts/` directory created several problems:

- contributors could mistake an old patch gate for current policy;
- repository searches returned obsolete implementation assumptions alongside current contracts;
- structural refactors had to account for tests that intentionally no longer executed;
- stale source-string assertions could be accidentally revived;
- the difference between current behavior coverage and historical release evidence was unnecessarily ambiguous.

Git already provides the historical record. The live tree should contain the tests that define current behavior.

### Durable retirement contract

`scripts/test-architecture-tests.js` now requires that:

- all 47 canonical suites remain present and unique;
- no canonical suite uses a patch/release-numbered filename;
- no `development-x.y.z-tests.js`, `hotfix-x.y.z-tests.js`, or `release-x.y-tests.js` file exists in `scripts/`;
- package test commands do not invoke a retired numbered gate;
- Windows, Linux, and macOS workflows continue to run `npm run test:regression`;
- those workflows continue to use the canonical release-trust contract;
- no platform workflow directly invokes a retired numbered test.

The filename policy remains in `scripts/regression-suite.js` only as a guard against reintroducing the retired architecture. The historical tests themselves are gone from the active tree.

## Durable regression contract

SafeLedger continues to run 47 durable canonical regression suites. Phase 5 specifically protects:

- removal of the orphaned legacy logger;
- dynamic Recovery Binder stylesheet ownership;
- canonical top-level settings-manager ownership;
- absence of the retired double-nested settings path;
- absence of patch/release-numbered test archives from the active repository;
- continued use of canonical regression and release-trust gates on all supported build workflows.

## Items intentionally not combined into 2.6.98

Phase 5 still contains cleanup targets with different risk surfaces. They remain isolated so failures stay easy to attribute.

### Duplicate application icon source

`sl.png` and `build/icon-source.png` currently contain the same image bytes, but they serve different paths today: one is referenced by the runtime BrowserWindow and one by packaging configuration.

They are not deleted merely because their contents are identical. Consolidation requires updating runtime/build ownership together and then verifying Windows, Linux, and macOS packaged behavior.

### Selector-level CSS cleanup

Phase 4 established one cascade owner. Duplicate selectors and unnecessary `!important` declarations remain a valid cleanup target, but broad visual cleanup stays separate from repository file/path cleanup so visual regressions are not mixed with structural changes.

## Behavior and security intentionally preserved

2.6.96 through 2.6.98 do not intentionally change:

- AES-256-GCM vault encryption;
- Argon2id password/key-envelope behavior;
- main-process-only active data-key ownership;
- renderer sandboxing or context isolation;
- offline/network restrictions;
- Profile, Vault Item, Asset, Settings, Dashboard, Activity, Search, or Recovery behavior;
- Recovery Binder content or privacy defaults;
- Light, Dark, Colorful, or System appearance behavior;
- portable storage paths;
- SafeLedger 2.x encrypted-data compatibility;
- SafeLedger 1.x read-only import;
- backup, restore, lockout, Emergency Lock, or Self-Destruct behavior.

## Engineering rule going forward

Repository cleanup should reduce ambiguity, not hide it.

When a file appears dead or a path appears obsolete:

1. confirm whether it is reachable through normal imports;
2. check dynamic renderer/resource references;
3. check package/build configuration;
4. check durable behavior coverage;
5. remove or move it only when ownership is fully understood;
6. update all active owners together;
7. add a durable regression when the change represents an architectural decision.

For tests, current behavior belongs in durable subsystem suites. Release-specific history belongs in Git history, not as dormant executable-looking files in the active source tree.

Do not create empty shims, dormant copies, renamed compatibility layers, or dead test archives simply to make a cleanup appear safer.
