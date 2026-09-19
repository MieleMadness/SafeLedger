# SafeLedger 2.6.95

## Code Cleanup Phase 4 — UI stylesheet and cascade ownership

This release begins Phase 4 of the current repository-cleanup plan by giving the renderer one explicit stylesheet entry point and one reviewed cascade order.

## What changed

- Added `src/main/css/app.css` as the canonical renderer stylesheet manifest.
- `index.html` now loads only `app.css` instead of maintaining the full stylesheet stack itself.
- Preserved the existing reviewed order of base styles, feature/component refinements, and appearance palettes.
- Removed the draft `app-state.css` import because no such runtime stylesheet exists; SafeLedger does not create an empty compatibility file merely to satisfy a planned layer.
- Updated the Phase 1 dead-code audit to recursively follow local CSS `@import` dependencies so imported styles and their assets remain correctly classified as reachable.
- Updated the durable `Style consolidation` suite to protect the one-link application shell, exact manifest order, import existence, and continued retirement of historical versioned CSS files.
- Updated test-architecture coverage so representative canonical stylesheets cannot be falsely reported as dead after moving behind the manifest.

## Why the old setup existed

SafeLedger's UI was modernized incrementally. Adding another stylesheet link was a low-risk way to ship a visual change without rewriting older working CSS at the same time. Over many releases, however, the order of those links became an implicit application contract and encouraged later rules to win by position or `!important` rather than by clear ownership.

The old structure was therefore a reasonable migration path, but not a good permanent architecture.

## Why this phase starts with ownership instead of deleting CSS

2.6.95 intentionally does not merge every stylesheet or mass-remove `!important` declarations. First, the cascade itself gets one explicit owner and a regression-protected order. That creates a stable base for follow-up Phase 4 patches to remove duplicate selectors and unnecessary overrides without combining too many visual risks into one candidate.

## Regression coverage

The canonical regression suite now protects:

- one renderer stylesheet link;
- one canonical `app.css` manifest;
- exact cascade ordering;
- existence of every imported stylesheet;
- no return of retired versioned CSS layers;
- no phantom `app-state.css` compatibility layer;
- CSS import traversal in the advisory dead-code audit;
- preservation of the current visual-contract and consolidated selector coverage.

## Production and security scope

This is a UI architecture cleanup. There are no intentional changes to SafeLedger's visible design or to AES-256-GCM vault encryption, Argon2id key derivation, main-process-only active data-key ownership, renderer sandbox/context isolation, offline/network restrictions, portable storage behavior, encrypted persistence, backup/restore, lockout/self-destruct behavior, or recovery semantics.

## Release safety

This candidate is based on the fully green 2.6.94 Phase 3 head. Do not merge to `master` until Windows, Linux, and macOS CI pass and hands-on testing confirms Login, Profile/Vault Item/Asset navigation, Settings, Dashboard, Activity History, Global Search, Light/Dark/Colorful appearance, and normal create/edit/delete flows remain visually and functionally correct.
