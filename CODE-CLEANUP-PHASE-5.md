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

## Durable regression contract

A new canonical suite, `scripts/repository-hygiene-tests.js`, protects the Phase 5 cleanup rules.

It verifies that:

- the orphaned legacy logger stays removed;
- Recovery Binder CSS remains present while the UI dynamically owns it;
- the dead-code audit recognizes that dynamic stylesheet reference;
- the removed logger does not remain in the dead-code candidate set;
- the audit itself remains syntax-valid and advisory.

The Test Architecture suite now requires Repository Hygiene as a canonical behavior suite and also treats Recovery Binder CSS as part of the current stylesheet ownership graph.

SafeLedger now runs 47 durable canonical regression suites rather than reviving patch-numbered tests as active policy.

## Items intentionally not combined into 2.6.96

Phase 5 contains additional cleanup targets, but they are intentionally isolated into later patches so failures remain easy to attribute.

### Historical patch-test archive

Phase 1 deliberately stopped executing patch-numbered `development-*`, `hotfix-*`, and release-era gates after their behavior was absorbed into durable subsystem tests. Those files are now repository-history candidates, but removing a large archive is a separate repository change from runtime dead-code removal.

A later Phase 5 patch can retire that archive once the removal itself is protected by the Test Architecture contract.

### Legacy `settingsManager` path

The active settings manager still lives at:

`src/main/installManager/installManager/settingsManager.js`

It is live code and has multiple runtime/test consumers. Moving it is a structural ownership change, not dead-code deletion. It will be handled separately after every import and test reference is mapped and updated together. No compatibility shim should be left behind simply to preserve the old path.

### Duplicate application icon source

`sl.png` and `build/icon-source.png` currently contain the same image bytes, but they serve different paths today: one is referenced by the runtime BrowserWindow and one by packaging configuration.

They are not deleted merely because their contents are identical. Consolidation requires updating the runtime/build ownership together and then verifying all three packaged platforms.

### Selector-level CSS cleanup

Phase 4 established one cascade owner. Duplicate selectors and unnecessary `!important` declarations remain a valid cleanup target, but broad visual cleanup is kept separate from Phase 5 repository hygiene so visual regressions are not mixed with file/path changes.

## Behavior and security intentionally preserved

2.6.96 does not intentionally change:

- AES-256-GCM vault encryption;
- Argon2id password/key-envelope behavior;
- main-process-only active data-key ownership;
- renderer sandboxing or context isolation;
- offline/network restrictions;
- Profile, Vault Item, Asset, Settings, Dashboard, Activity, Search, or Recovery behavior;
- Recovery Binder content or privacy defaults;
- Light, Dark, Colorful, or System appearance;
- portable storage paths;
- SafeLedger 2.x encrypted-data compatibility;
- SafeLedger 1.x read-only import;
- backup, restore, lockout, Emergency Lock, or Self-Destruct behavior.

## Engineering rule going forward

Repository cleanup should reduce ambiguity, not hide it.

When a file appears dead:

1. confirm whether it is reachable through normal imports;
2. check dynamic renderer/resource references;
3. check package/build configuration;
4. check durable behavior coverage;
5. remove it only when ownership is truly gone;
6. add a durable regression when the removal represents an architectural decision.

Do not create empty shims, dormant copies, or renamed compatibility layers simply to make a cleanup appear safer. If a live path must move, update all owners together and test the new structure directly.
