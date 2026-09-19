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

`scripts/test-architecture-tests.js` requires that:

- all 47 canonical suites remain present and unique;
- no canonical suite uses a patch/release-numbered filename;
- no `development-x.y.z-tests.js`, `hotfix-x.y.z-tests.js`, or `release-x.y-tests.js` file exists in `scripts/`;
- package test commands do not invoke a retired numbered gate;
- Windows, Linux, and macOS workflows continue to run `npm run test:regression`;
- those workflows continue to use the canonical release-trust contract;
- no platform workflow directly invokes a retired numbered test.

The filename policy remains in `scripts/regression-suite.js` only as a guard against reintroducing the retired architecture. The historical tests themselves are gone from the active tree.

## 2.6.99: one canonical application icon

Phase 5 also identified two application-icon paths:

- `sl.png`, used by the live Electron `BrowserWindow`;
- `build/icon-source.png`, used by Windows and Linux packaging.

The files were not merely visually similar. Git stored both paths as the same blob (`0eef161eeea26cbed070c117731f1151b3bb3ea1`, 3,453 bytes), proving their contents were identical.

2.6.99 makes `sl.png` the one canonical PNG application icon.

Windows and Linux packaging now point to `sl.png`, the package file list includes that one icon path, and `build/icon-source.png` is deleted.

### Why the runtime path was kept

The cleanup could have moved the BrowserWindow to the build directory instead. That would have introduced a new packaged runtime path assumption only to remove duplicate bytes.

Keeping the existing runtime path is the lower-risk structural fix:

- the BrowserWindow continues loading the same path it already used;
- the icon bytes are unchanged;
- Windows and Linux packaging are redirected to those same bytes;
- no compatibility alias, copied PNG, symlink, or forwarding layer is required;
- one file now owns both runtime and packaging behavior.

### Durable icon ownership contract

`scripts/repository-hygiene-tests.js` requires that:

- `sl.png` exists;
- `build/icon-source.png` stays absent;
- the BrowserWindow uses `sl.png`;
- packaged files include `sl.png` and not the retired duplicate path;
- Windows packaging uses `sl.png`;
- Linux packaging uses `sl.png`;
- no active package build configuration references the retired duplicate path.

The three-platform build matrix remains the final packaged-behavior verification for this structural change.

## 2.6.100: measurable CSS ownership

Phase 4 gave SafeLedger one explicit stylesheet manifest, but a single load order does not automatically mean each declaration has one clear owner. 2.6.100 adds `scripts/css-ownership-audit.js` so selector ownership can be measured before rules are removed.

The initial 18-file cascade audit reported:

- 1,545 rule instances;
- 1,078 unique selector/context pairs;
- 263 repeated selector/context pairs;
- **4 byte-equivalent duplicate selector/context pairs**;
- 259 differing cascade overrides requiring individual review;
- 602 `!important` declarations.

The audit deliberately distinguishes exact duplication from an override. A repeated selector is not automatically wrong: later theme, responsive, accessibility, or feature rules may intentionally refine an earlier owner.

### Retire only proven exact duplicates

2.6.100 removes only the earlier copies of the four declarations whose selector, context, and normalized declaration bodies were identical to later rules:

- `::-webkit-scrollbar` sizing remains owned by theme-aware `ui-current.css`;
- `.coin-list-label` truncation remains owned by the global/list layout in `global-search.css`;
- `.detail-action-button .fa-star` color remains owned by `ui-dock-refinement.css`;
- `.detail-action-button .fa-star-o` color remains owned by `ui-dock-refinement.css`.

The canonical import order and the later winning declarations stay unchanged. No replacement layer, duplicate patch rule, or compatibility selector is added.

### Durable CSS ownership contract

The Style Consolidation regression suite now:

- executes the CSS ownership audit on every supported CI platform;
- requires every `app.css` import to exist;
- verifies the surviving canonical owner for each retired exact duplicate;
- requires the former duplicate copies to stay absent;
- fails if the cascade contains any byte-equivalent duplicate selector/context block.

The audit is also available directly with:

`npm run audit:css-ownership`

## 2.6.101: selective `!important` ownership

2.6.101 adds a second CSS audit focused on declarations that use `!important`.

The purpose is not to treat `!important` as automatically wrong. SafeLedger legitimately uses priority for framework overrides, interaction states, accessibility, theme behavior, and fixed component footprints. The audit instead asks a narrower question: **can an earlier important declaration ever win, or is it always replaced by a later important owner for the same selector, context, and property?**

Only mechanically provable shadowed declarations are candidates for cleanup. The first selective slice removed the clearly owned theme-layer cases while preserving all declarations that remained context-dependent or independently meaningful.

## 2.6.102: complete mechanically provable `!important` cleanup

2.6.102 finishes that mechanically safe ownership pass across the canonical 18-file cascade.

It removes the remaining **29 provably shadowed `!important` declarations** from:

- `product-features.css` — 1;
- `site.css` — 9;
- `token-icons.css` — 5;
- `ui-current.css` — 8;
- `ui-polish.css` — 6.

The cleanup deliberately preserves declarations that still have independent meaning. For example, responsive token artwork retained `flex-basis` ownership where the audit did not prove that declaration was shadowed.

After 2.6.102 the reviewed cascade has:

- **18 canonical stylesheets** in one explicit `app.css` order;
- **0 byte-equivalent duplicate selector/context blocks**;
- **534 physical `!important` declarations**;
- **0 provably shadowed `!important` declarations**.

The Style Consolidation suite now fails if either exact duplicate CSS ownership or mechanically shadowed important ownership returns.

## 2.6.103: final Phase 5 repository audit

2.6.103 closes Phase 5 by turning the cleanup assumptions into repository-wide fail-fast contracts and auditing the supported release pipeline.

### Runtime reachability must finish clean

`repository-hygiene-tests.js` now runs the dead-code audit and requires zero unresolved candidates in all three categories:

- unreachable runtime JavaScript;
- unlinked stylesheets;
- unreferenced runtime assets.

This does **not** convert static analysis into permission to delete files. If a future feature is dynamically owned, the audit must be taught how that ownership works. A live resource should never be deleted merely to make the candidate count reach zero.

The final audit confirms the current tree has no unresolved JavaScript, CSS, or runtime-asset candidates.

### Executable tests require an owner

`test-architecture-tests.js` now builds ownership from:

- the 47 canonical regression suites;
- explicit package test commands;
- the supported Windows, Linux, and macOS workflows;
- local helper modules statically required by those owned scripts.

Any executable-looking `*-tests.js` or `*-regression.js` file without one of those owners fails CI. This prevents a new dormant test archive from accumulating under a different naming convention after the 2.6.98 cleanup.

### Release workflow and security-documentation audit

The three supported workflows were reviewed together. They consistently use Node 24, locked dependency installation, the 47-suite regression runner, release-trust contract, encrypted lifecycle test, release metadata test, Electron crypto smoke, real GUI smoke, platform packaging, provenance/SBOM attestations, and separate clean/verification artifact uploads.

Platform-specific behavior remains intentional:

- Linux configures the Electron sandbox helper and Xvfb for real GUI smoke;
- macOS uses native Apple Silicon runners and verifies the packaged executable architecture;
- Windows builds the x64 portable EXE and publishes its platform verification material.

`RELEASE-VERIFICATION.md` is updated from its older 2.5-era Windows/Linux wording so the documented artifact and attestation model includes the current macOS Apple Silicon pipeline and avoids hard-coded old release filenames.

### Package/dependency consistency review

The locked dependency graph used by `npm ci` remains aligned with the pinned direct dependencies in `package.json`; no dependency upgrade or lock regeneration is part of this cleanup release.

The lockfile's historical root-project version metadata is not packaged into SafeLedger and does not participate in dependency resolution or the release version embedded by `package.json`. Phase 5 intentionally does not synthesize a lockfile rewrite solely to change that non-runtime metadata. The dependency policy continues to protect the dependency specifications that affect reproducible installs. A future intentional dependency/lock refresh should regenerate the lockfile through npm rather than hand-editing generated dependency data.

### Historical documentation is not dead code

The repository retains historical `RELEASE-*.md` files intentionally. They document prior candidates and releases and belong in source history/documentation even though they are not executable runtime inputs.

Likewise, `LICENSE.md` remains a short navigation pointer to the canonical Apache-2.0 `LICENSE` text and historical attribution in `NOTICE`; it is not a duplicate license implementation.

## Phase 5 completion state

Phase 5 is complete when the final 2.6.103 head passes the supported Windows, Linux, and macOS workflows with these contracts intact:

- 47 durable canonical regression suites;
- zero unresolved runtime dead-code candidates;
- zero unowned executable test scripts;
- one canonical settings implementation;
- one canonical application icon;
- no retired numbered test archive;
- one explicit 18-file CSS cascade;
- zero byte-equivalent duplicate selector/context blocks;
- zero mechanically shadowed `!important` declarations;
- current release-verification guidance aligned with the three supported platform workflows.

## Behavior and security intentionally preserved

2.6.96 through 2.6.103 do not intentionally change:

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

When a file, selector, test, or path appears obsolete or duplicated:

1. confirm whether it is reachable through normal imports;
2. check dynamic renderer/resource references;
3. check package/build configuration;
4. check durable behavior and visual coverage;
5. distinguish exact duplication from intentional cascade refinement;
6. remove or move it only when ownership is fully understood;
7. update all active owners together;
8. add a durable regression when the change represents an architectural decision.

For tests, current behavior belongs in durable subsystem suites. Release-specific history belongs in Git history and release documentation, not as dormant executable-looking files in the active source tree.

For CSS, repeated selectors are evidence to inspect—not a deletion list. Exact duplicates should have one owner; differing overrides must be understood before consolidation.

Do not create empty shims, dormant copies, renamed compatibility layers, duplicate binary assets, duplicate CSS patches, or dead test archives simply to make a cleanup appear safer.
