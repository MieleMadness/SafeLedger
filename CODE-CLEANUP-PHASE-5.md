# SafeLedger Code Cleanup — Phase 5

SafeLedger 2.6.96 begins the fifth cleanup phase: **repository hygiene and structural debt retirement**.

Phases 1–4 established durable tests, clarified main-process ownership, consolidated renderer state/services, and gave the UI one explicit stylesheet cascade. Phase 5 uses those stable contracts to remove repository baggage that no longer belongs in the current architecture—without changing encrypted data, recovery behavior, portable storage, or visible product behavior.

## Phase 5 rule

Phase 5 does not treat a static-analysis result as permission to delete a file.

A candidate is removed only after its runtime ownership, dynamic references, packaging role, regression coverage, and compatibility impact have been reviewed.

> **Delete proven dead code. Preserve live code even when static analysis cannot see how it is reached. Fix the analysis instead of deleting around it.**

This rule matters because Electron applications can load resources through more than CommonJS `require()` and HTML `<link>` tags.

## 2.6.96: first Phase 5 slice

### Retire the orphaned legacy logger

`src/main/logger.js` was an old optional file logger. It defaulted to disabled, wrote to a legacy installation-code directory, and was not part of the current runtime graph.

Current SafeLedger security/activity auditing is owned by the sanitized audit path in the trusted main process. Keeping the old logger created a second-looking logging mechanism with no current owner or contract.

2.6.96 removes `src/main/logger.js` rather than leaving it disabled or wrapping it with compatibility code.

### Fix a dead-code audit blind spot

Phase 1 introduced an advisory dead-code audit. Phase 4 taught it to follow the new `app.css` import graph.

During Phase 5 review, `src/main/css/recovery-binder.css` initially appeared to be an unlinked stylesheet because it is not imported by `app.css`.

That result was misleading. `recovery-binder-ui.js` intentionally creates a `<link>` element when the Recovery Binder opens and sets:

`link.href = 'css/recovery-binder.css'`

The stylesheet is therefore live even though it is loaded dynamically.

2.6.96 updates the audit so reachable renderer JavaScript can contribute local runtime stylesheet references. Those styles then participate in the same recursive `@import` traversal as styles loaded from `index.html`.

This prevents a future cleanup from deleting a working feature stylesheet simply because it is lazy-loaded.

## 2.6.97: canonical settings ownership

The active settings implementation previously lived at:

`src/main/installManager/installManager/settingsManager.js`

That double-nested path was historical installation-manager structure. The module itself had already evolved into the current owner for settings normalization, appearance migration, brute-force/lockout counters, backup reminder metadata, user-editable settings filtering, and atomic settings persistence.

2.6.97 moves that implementation to:

`src/main/settings-manager.js`

The trusted main process now imports the canonical module directly with:

`require('./settings-manager')`

The old nested implementation is deleted. No forwarding file, compatibility shim, duplicate implementation, or dormant copy is retained.

### Why this is a structural fix rather than a rename

The change is protected at the architecture level:

- the security cleanup suite now reads the canonical module and requires the old file to remain absent;
- Repository Hygiene scans all active `src/main` JavaScript and every canonical regression suite for the retired nested settings path;
- the dead-code audit must report `src/main/settings-manager.js` as reachable from the trusted main-process graph;
- the main runtime must require the canonical settings manager directly;
- the settings manager remains syntax-checked with the rest of the trusted runtime.

This means future work cannot quietly reintroduce the old directory through a shim or stale test path.

### Settings behavior intentionally unchanged

The move does not alter:

- `settings.json` location or format;
- appearance migration from historical Light to Colorful;
- privacy-mode normalization;
- brute-force limits or counters;
- lockout state behavior;
- Self-Destruct state;
- backup reminder and verification timestamps;
- the list of user-editable settings;
- atomic file writes.

Only module ownership and repository path change.

## Durable regression contract

The canonical `scripts/repository-hygiene-tests.js` suite protects Phase 5 cleanup rules.

It verifies that:

- the orphaned legacy logger stays removed;
- Recovery Binder CSS remains present while the UI dynamically owns it;
- the dead-code audit recognizes that dynamic stylesheet reference;
- the canonical top-level settings manager exists and is runtime-reachable;
- the retired double-nested settings manager file stays removed;
- active runtime and canonical tests contain no references to the retired nested settings path;
- the audit itself remains syntax-valid and advisory.

SafeLedger continues to run 47 durable canonical regression suites rather than reviving patch-numbered tests as active policy.

## Items intentionally not combined into 2.6.97

Phase 5 contains additional cleanup targets, but they remain isolated into later patches so failures stay easy to attribute.

### Historical patch-test archive

Phase 1 deliberately stopped executing patch-numbered `development-*`, `hotfix-*`, and release-era gates after their behavior was absorbed into durable subsystem tests. Those files are now repository-history candidates, but removing a large archive is a separate repository change from runtime module ownership.

A later Phase 5 patch can retire that archive once the removal itself is protected by the Test Architecture contract.

### Duplicate application icon source

`sl.png` and `build/icon-source.png` currently contain the same image bytes, but they serve different paths today: one is referenced by the runtime BrowserWindow and one by packaging configuration.

They are not deleted merely because their contents are identical. Consolidation requires updating the runtime/build ownership together and then verifying all three packaged platforms.

### Selector-level CSS cleanup

Phase 4 established one cascade owner. Duplicate selectors and unnecessary `!important` declarations remain a valid cleanup target, but broad visual cleanup is kept separate from Phase 5 repository hygiene so visual regressions are not mixed with file/path changes.

## Behavior and security intentionally preserved

2.6.96 and 2.6.97 do not intentionally change:

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

Do not create empty shims, dormant copies, or renamed compatibility layers simply to make a cleanup appear safer. If a live path must move, update all owners together and test the new structure directly.
