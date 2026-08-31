# SafeLedger 2.6 — Apple Silicon & Architecture Hardening

## Status

**Design complete / implementation not started.**

Target release version: **2.6.0**  
Current development version until final release gate: **2.5.0**  
New platform target: **macOS Apple Silicon (`arm64`) only**

SafeLedger 2.6 has two tightly related goals:

1. finish the runtime/UI modernization by removing the legacy CSS override stack that can still interfere with current design rules; and
2. add a trusted, signed, notarized Apple Silicon macOS distribution path without weakening SafeLedger's portable, local-first security model.

The order is intentional. UI architecture consolidation is Phase 0 so macOS work starts from one authoritative visual/layout system rather than carrying legacy specificity conflicts onto a third platform.

There is intentionally **no Intel/x64 Mac build, no universal binary, and no Rosetta compatibility target** in 2.6.

---

## Release thesis

SafeLedger 2.6 should make the application easier to trust in two ways:

- **inside the app:** one component should have one styling owner, so old CSS cannot unexpectedly override current spacing, accessibility, icon, or interaction rules;
- **on macOS:** Apple Silicon users should receive the same encrypted, offline, portable-data guarantees as Windows/Linux users, plus Developer ID signing, Apple notarization, checksums, SBOM coverage, provenance, and Gatekeeper-compatible distribution.

The release must improve architecture without changing the vault format or security semantics.

---

## Non-negotiable product invariants

SafeLedger 2.6 must not change:

- AES-256-GCM vault encryption;
- Argon2id password/key-envelope behavior;
- main-process-only Data Encryption Key handling;
- SafeLedger 2.x vault schema/crypto format;
- SafeLedger 1.x read-only import semantics;
- backup v3 generation or backup v2 restore compatibility;
- Profile → Wallet → Asset hierarchy;
- Recovery Health scoring;
- Guided Test Recovery;
- Privacy Mode;
- BIP39/address validation;
- privacy-preserving duplicate detection;
- global-search/history secret-exclusion rules;
- portable `SafeLedgerData` ownership model;
- centralized session-lock behavior;
- Self-Destruct semantics;
- offline/local-first normal operation.

Storage loss, OS lock, sleep/resume, recovery testing, macOS portability errors, signing errors, and Gatekeeper/notarization failures are **never** Self-Destruct conditions.

---

# Pillar A — UI/CSS architecture consolidation

## Why this belongs in 2.6

The current UI is visually stable, but the cascade still contains multiple generations of styling. Recent fixes have required increasingly specific selectors because old rules remain active underneath the new design system.

Examples currently present on the 2.5.x foundation include:

- legacy percentage/flex column sizing underneath the newer CSS Grid layout;
- Bootstrap-era 15px cell gutters that newer files remove and later re-add selectively;
- old 46px circular/scaling Emergency Lock rules underneath the newer 42px shared action contract;
- separate 40px Global Search, Dashboard, and Activity button definitions underneath the shared top-action token;
- icon placeholders (`history`, `print`, `trash`) in `local-icons.css` that are redrawn later by a dock refinement stylesheet;
- generic legacy rules such as `a { color: white; }` that are too broad for the current light/dark surface system;
- duplicate token definitions such as dock height, dock padding, muted text, and favorite color;
- stale selectors for Bootstrap-style `col-*` elements that the current HTML no longer uses;
- legacy Asset action classes that have been replaced by the centralized `detailActions` system.

2.6 should remove the need for override stacking instead of continuing to add stronger overrides.

## Final stylesheet ownership model

The intended permanent ownership model is:

### `foundation.css`
Owns only structural primitives:

- document/app-shell reset;
- CSS Grid shell and responsive structure;
- base form/button/nav/table primitives still needed at runtime;
- no product colors;
- no feature-specific component styling;
- no legacy Bootstrap column selectors.

### `app-theme.css`
Owns the shared visual contract:

- light/dark tokens;
- spacing scale;
- typography and contrast tokens;
- surface/border/radius/shadow tokens;
- top utility button sizing;
- bottom action/dock sizing and spacing;
- navigation row behavior;
- shared button focus/hover language;
- shared detail-area spacing;
- Profile initial sizing;
- accessible muted text;
- shared semantic icon colors.

All shared values must be defined once. `--sl-dock-height`, `--sl-dock-pad`, `--sl-muted`, and icon-color tokens must not be redefined by later compatibility stylesheets.

### `local-icons.css`
Owns every final local fallback icon drawing.

The final floppy disk, clock/history, printer, trash can, star, search, home, copy, QR, lock, etc. definitions must live here. A layout stylesheet must not redraw icons to defeat an earlier fallback definition.

### Feature stylesheets
Examples: `product-features.css`, `activity-history.css`, `global-search.css`, recovery feature CSS.

They own only feature-specific layouts/content. They must not redefine global utility-button dimensions, global action-button dimensions, shell spacing, or shared theme colors when a token/component already exists.

### `site.css`
During migration this file may temporarily retain feature-specific legacy rules, but by the end of 2.6 it must no longer own shared shell/layout/theme/action behavior that conflicts with the layers above.

`ui-polish.css` and `ui-dock-refinement.css` are transitional. Their valid rules must be migrated to the correct permanent owner and the transitional files removed from `index.html` before the 2.6 release candidate.

## Required cleanup targets

At minimum, implementation must remove or migrate:

- old percentage/flex column-width rules superseded by `.app-grid`;
- obsolete `[class*="col-"]` shell selectors;
- Foundation's inherited 15px app-cell gutters where the current grid owns spacing;
- legacy 46px/circular/scaling Emergency Lock rules;
- duplicate Global Search/Dashboard/Activity control sizing;
- generic `a { color: white; }` behavior in favor of scoped navigation links;
- global legacy button radius rules that force new code to use `!important`;
- obsolete `coin-print-button` / `coin-delete-button` rules after usage verification;
- obsolete per-coin fallback classes after repository-wide usage verification;
- placeholder `fa-history`, `fa-print`, and `fa-trash` definitions once their final drawings move into `local-icons.css`;
- stale comments that claim a stylesheet is loaded last when it is not.

Removal must be evidence-based. A selector may be deleted only after source search shows it is unused or its replacement is covered by regression/UI tests.

## New style ownership regression gate

Replace the current "consolidation" test with a stronger architecture test that proves the desired ownership contract.

It should assert at minimum:

1. `index.html` loads no versioned legacy patch stylesheets;
2. `ui-polish.css` and `ui-dock-refinement.css` are absent from the release-candidate stylesheet chain;
3. shared action/dock tokens are defined in one authoritative location;
4. no legacy `col-*` layout selectors remain;
5. no generic white-link rule remains outside explicitly scoped navigation;
6. `local-icons.css` owns the final clock, printer, trash, and Save definitions;
7. feature CSS does not define global utility-button width/height contracts;
8. shared action buttons and Emergency Lock use the same authoritative size token;
9. the top and bottom spacing contracts remain regression-tested;
10. light/dark contrast checks for known UI text states remain enforced.

A release candidate fails if style ownership regresses even when screenshots happen to look correct.

---

# Pillar B — macOS Apple Silicon (`arm64`) support

## Supported platform

SafeLedger 2.6 adds:

- macOS on Apple Silicon only;
- native Electron `arm64` runtime;
- native `arm64` SafeLedger application bundle;
- GitHub-hosted Apple Silicon CI where available;
- Developer ID Application signing for official builds;
- Hardened Runtime;
- Apple notarization;
- stapled notarization ticket on the `.app` bundle;
- Gatekeeper validation;
- integration with the existing 2.5 checksums/SBOM/provenance release chain.

### Explicitly unsupported

- Intel (`x64`) Macs;
- universal binaries;
- Rosetta compatibility guarantees;
- Mac App Store packaging;
- iOS/iPadOS;
- iCloud synchronization;
- Keychain migration of vault secrets;
- automatic updates.

The existing Windows x64 and Linux x86_64 artifacts remain supported and required. The arm64-only decision applies only to macOS.

---

## macOS artifact contract

2.6 will use one canonical Mac artifact:

```text
SafeLedger-2.6.0-macOS-arm64.zip
```

The ZIP must expand into a portable top-level directory:

```text
SafeLedger/
├─ SafeLedger.app
└─ SafeLedgerData/
```

`SafeLedgerData` may be created on first run if absent, but its resolved location must be the sibling data directory outside the signed `.app` bundle.

The official artifact must not contain an x64 or universal app binary.

A ZIP is preferred over making a DMG the primary artifact because SafeLedger is a portable application rather than a conventional `/Applications`-only install. The `.app` itself must be signed, notarized, and stapled before the portable directory is zipped.

The release collector must fail if zero or multiple Mac arm64 artifacts are found.

---

## Portable storage behavior on macOS

SafeLedger must not silently move vault data into:

- `~/Library/Application Support`;
- iCloud Drive;
- another hidden profile directory;
- the signed `SafeLedger.app` bundle.

The macOS portable-root helper must resolve the enclosing directory of `SafeLedger.app`, not `Contents/MacOS`, `Resources`, or `app.asar`.

### Writable-location contract

Recommended use is from a user-writable folder or removable drive containing the complete `SafeLedger/` directory.

If the enclosing portable directory is not writable, SafeLedger must:

1. remain locked;
2. explain that the complete SafeLedger folder needs to be moved to a writable location;
3. avoid creating a second hidden vault location;
4. avoid mutating the source location;
5. never treat the condition as a password failure or Self-Destruct event.

### Gatekeeper/translocation handling

Implementation must explicitly test quarantine/App Translocation behavior. The application must detect when its apparent execution location cannot serve as a stable portable root and present recovery/setup guidance rather than creating a second vault tree.

The chosen root calculation must be deterministic and unit-testable without requiring production signing credentials.

---

## macOS device/session security validation

Validate the centralized SafeLedger 2.3 lock controller against macOS events:

- screen lock;
- system sleep;
- system resume;
- idle locked state;
- fast-user-switching signals where reliable;
- application hide/minimize behavior where relevant;
- removable-storage disappearance while unlocked.

For every supported event:

- the active DEK is cleared first;
- the session returns to locked state;
- renderer cleanup follows the existing centralized path;
- Activity History receives only sanitized event information;
- Self-Destruct is never invoked.

### Removable-media validation

Test APFS and exFAT at minimum; HFS+ when practical.

Cover:

- first-run storage identity creation;
- reconnect with matching storage identity;
- disconnect while unlocked;
- reconnect after forced lock;
- moving the complete `SafeLedger/` directory between Macs;
- moving between internal and removable storage;
- restore-created storage identity rotation;
- no hardware serial number or unrelated volume metadata entering logs/UI.

---

## macOS CI design

Add a dedicated workflow, proposed:

```text
.github/workflows/macos-arm64.yml
```

Use a GitHub-hosted macOS label that GitHub documents as Apple Silicon/arm64 for the repository. Record `uname -m` / process architecture in the job and fail unless it reports arm64.

The PR workflow must run without production Apple signing credentials and include:

1. checkout at exact PR head;
2. locked dependency install;
3. full regression suite;
4. style-ownership regression suite;
5. Electron crypto smoke;
6. real GUI startup smoke where GitHub runner automation is reliable;
7. macOS portable-root tests;
8. macOS session/device-security tests;
9. unsigned/ad-hoc arm64 package build suitable for CI validation;
10. binary architecture assertion (`arm64`, not x64/universal);
11. package layout assertion;
12. artifact upload.

All GitHub Actions remain pinned to reviewed immutable commit SHAs.

---

## Signing and notarization design

Official `v2.6.0` publication requires:

- Apple Developer Program membership;
- Developer ID Application signing identity;
- Hardened Runtime;
- minimal reviewed entitlements;
- secure timestamping;
- Apple notarization using the current supported notary tooling/API path;
- notarization-log inspection;
- stapling the ticket to `SafeLedger.app`;
- `codesign` verification;
- Gatekeeper (`spctl`) verification;
- stapler validation;
- final binary-architecture validation after signing/stapling.

Apple signing/notarization credentials must exist only in trusted tag/release jobs. They must never be available to pull-request builds.

The repository currently uses Electron Builder 26.x. 2.6 must not casually upgrade Electron Builder solely to follow newer documentation syntax. If a builder upgrade becomes necessary, treat it as an explicit gated migration with lockfile review and regression coverage rather than mixing it invisibly into signing work.

---

# Trusted release pipeline extension

The 2.5 trusted release graph becomes:

```text
preflight
 ├─ windows
 ├─ linux
 ├─ macos-arm64
 └─ sbom
       ↓
collect-and-verify
       ↓
attest
       ↓
publish
```

The Mac build must be a required official artifact. A macOS build, signing, notarization, verification, checksum, or attestation failure stops the entire 2.6 release.

Extend `release-manifest.json` for the Mac artifact with:

- filename;
- platform: `macOS`;
- architecture: `arm64`;
- source commit;
- byte length;
- SHA-256;
- signing state;
- notarization state;
- stapling state;
- provenance/attestation state.

`SHA256SUMS.txt` must include the Mac ZIP.

The existing CycloneDX SBOM remains source/dependency-graph based unless implementation introduces a real architecture-specific dependency difference that justifies an additional SBOM.

---

# User-facing verification

Update `RELEASE-VERIFICATION.md` with Apple Silicon instructions covering:

- expected artifact name;
- `shasum -a 256` verification;
- how to verify the `.app` is arm64;
- Developer ID signature inspection;
- Gatekeeper assessment;
- notarization/stapling validation;
- the expected portable directory layout;
- a clear statement that Intel Macs are unsupported.

Documentation must never tell users to globally disable Gatekeeper, disable SIP, or bypass macOS security protections as the normal install path.

---

# Implementation sequence

## Phase 0 — CSS/UI ownership consolidation

- inventory shared selectors and their current owners;
- migrate valid `ui-polish.css` rules into `app-theme.css` or the correct feature stylesheet;
- migrate final clock/printer/trash/save drawings into `local-icons.css`;
- migrate valid dock-refinement rules into `app-theme.css`;
- remove proven-dead legacy shell/action/icon rules from `site.css` and feature CSS;
- remove obsolete grid/Bootstrap selectors;
- remove transitional polish/refinement stylesheet links;
- replace the old style-consolidation test with ownership-focused regression gates;
- run Windows/Linux full regression, crypto, real GUI smoke, and packaging before moving on.

Phase 0 must be behavior-preserving. It is an architectural cleanup, not a redesign.

## Phase 1 — macOS portable-root abstraction

- create a platform-aware portable-root helper;
- preserve existing Windows/Linux behavior exactly;
- add macOS app-bundle-parent resolution;
- add writable-location validation;
- add translocation/quarantine detection strategy;
- add safe locked-state failure UX;
- add unit/regression coverage.

## Phase 2 — Apple Silicon runtime/CI

- add macOS `arm64` Electron Builder target;
- add `dist:mac` command;
- add macOS arm64 CI workflow;
- assert runner and packaged binary architecture;
- add GUI/crypto/full regression gates;
- validate ZIP directory structure.

## Phase 3 — macOS device security

- validate lock/sleep/resume behavior;
- validate removable-storage loss/reconnect;
- validate storage identity behavior on supported file systems;
- prove all device events remain lock-only;
- add sanitized Activity History regression coverage.

## Phase 4 — signing/notarization

- add minimal entitlements;
- add trusted signing step;
- add notarization submission and status verification;
- staple/validate the app ticket;
- run native signature/Gatekeeper checks;
- keep credentials absent from PR context.

## Phase 5 — trusted release integration

- extend artifact collector;
- extend checksum generation/verification;
- extend release manifest;
- extend provenance/attestation;
- extend release verification documentation;
- prove Windows/Linux release behavior is unchanged.

## Phase 6 — 2.6.0 release candidate

Only after all implementation gates are green:

- bump package/package-lock version from 2.5.0 to **2.6.0**;
- update README current-release text;
- update this document from design to implementation record;
- run Windows, Linux, and macOS-arm64 final required checks on the exact release-candidate head;
- merge only that tested head through protected `master`;
- create `v2.6.0` only from the merged verified commit;
- require the trusted release workflow to publish all three platform artifacts successfully.

---

# Acceptance gates

SafeLedger 2.6 is complete only when all of the following are true:

### UI architecture

1. transitional `ui-polish.css` and `ui-dock-refinement.css` are no longer required by the release candidate;
2. shared shell/layout/action rules have one authoritative owner;
3. final local icon drawings live in `local-icons.css`;
4. no obsolete Bootstrap `col-*` shell rules remain;
5. no generic white-link rule can make links disappear on light surfaces;
6. legacy Emergency Lock sizing/scaling rules are removed;
7. Global Search/Home/Activity sizing comes from the shared token system;
8. style ownership has dedicated regression coverage;
9. light/dark accessibility behavior remains green;
10. Windows/Linux real GUI smoke shows no visual/runtime regression.

### macOS runtime

11. official Mac output is Apple Silicon `arm64` only;
12. no Intel/universal Mac artifact is generated;
13. full regression suite passes on the arm64 macOS runner;
14. Electron crypto smoke passes on macOS arm64;
15. GUI startup is validated on macOS arm64;
16. `SafeLedgerData` resolves outside `SafeLedger.app`;
17. the enclosing portable folder is deterministic and tested;
18. unwritable/translocated locations fail clearly without hidden fallback;
19. APFS/exFAT portable behavior is validated;
20. storage removal safely locks the session;
21. sleep/lock/resume safely locks the session;
22. macOS device events never trigger Self-Destruct.

### distribution trust

23. official Mac app is signed with Developer ID;
24. Hardened Runtime/entitlements pass review;
25. notarization succeeds;
26. the notarization ticket is stapled to the app and validates;
27. Gatekeeper assessment succeeds;
28. the signed app still reports arm64 architecture;
29. Mac ZIP is included in SHA-256 generation and re-verification;
30. release manifest includes architecture/signing/notarization state;
31. provenance/attestation covers the Mac artifact;
32. Apple credentials are inaccessible to PR workflows;
33. existing Windows/Linux trusted release gates remain green;
34. 1.x import and backup v2/v3 continuity remain green;
35. no vault schema/crypto format change occurs;
36. no runtime cloud dependency is introduced;
37. exact `2.6.0` head passes the complete required matrix before merge/tag;
38. trusted `v2.6.0` release publishes Windows, Linux, and macOS-arm64 artifacts together.

---

# Explicitly deferred beyond 2.6

- Intel/x64 macOS;
- universal Mac binaries;
- Rosetta support guarantees;
- Mac App Store distribution;
- automatic updates;
- Homebrew/package-manager distribution;
- iOS/iPadOS;
- cloud sync;
- hardware-wallet integration;
- vault schema/crypto migrations;
- major visual redesign.

Those are separate release decisions, not hidden extensions of 2.6.
