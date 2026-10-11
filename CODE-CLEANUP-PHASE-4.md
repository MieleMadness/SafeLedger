# SafeLedger Code Cleanup — Phase 4

SafeLedger 2.6.95 begins the fourth cleanup phase: **UI stylesheet and cascade ownership**.

Phase 3 gave the renderer one state owner and semantic service boundary. Phase 4 applies the same ownership rule to styling so the application shell no longer assembles its final appearance by maintaining a long list of independent stylesheet links.

## Problem: the cascade had many owners

SafeLedger's UI was modernized incrementally. Adding a new stylesheet for a feature or refinement was a low-risk way to ship visual improvements without rewriting older working styles at the same time. Historical versioned CSS files were later consolidated, but `index.html` still loaded the surviving style layers one-by-one in a specific order.

That worked, but the order itself had become an undocumented application contract. A feature could appear correct only because its stylesheet happened to load after another file. Future changes could accidentally reorder links, introduce another patch layer, or add `!important` declarations instead of fixing ownership.

Phase 1 identified this as a later cleanup target: layered CSS and broad `!important` usage were functional but increasingly hard to reason about.

## Phase 4 structural fix

### One stylesheet entry point

`src/main/index.html` now loads only:

`./css/app.css`

`app.css` is the explicit renderer cascade manifest. It imports the existing current stylesheets in their reviewed order:

1. base shell, icons, and feature foundations;
2. shared theme/component refinements;
3. theme palettes last.

The application still uses the same underlying CSS files in 2.6.95. This first Phase 4 step changes ownership and ordering, not the intended visual design.

### No phantom patch layer

The initial manifest draft referenced `app-state.css`, but no such runtime stylesheet exists. Activating the manifest with that reference would create a broken import and quietly reintroduce a patch-layer assumption. The reference is removed rather than creating an empty compatibility file merely to satisfy the manifest.

### Dead-code audit follows CSS imports

Phase 1's advisory dead-code audit originally treated only stylesheets linked directly from `index.html` as reachable. With a single manifest, that would falsely classify every imported stylesheet—and assets referenced by those stylesheets—as dead.

The audit now recursively follows local CSS `@import` dependencies. It remains advisory and still does not delete anything automatically.

## Regression contract

The durable `Style consolidation` regression now protects:

- exactly one stylesheet link in `index.html`;
- `app.css` as that stylesheet owner;
- the reviewed cascade order;
- physical existence of every imported stylesheet;
- no return of retired version-numbered CSS files;
- no reference to the nonexistent `app-state.css` patch layer;
- preservation of the consolidated current selectors and visual-contract fixtures.

The test-architecture suite also verifies that representative canonical stylesheets remain reachable through the manifest when the dead-code audit runs.

## Why this is safer than deleting or merging all CSS at once

Phase 4 deliberately separates **cascade ownership** from **selector-level cleanup**. Combining every stylesheet and removing every `!important` declaration in one release would make visual regressions much harder to isolate.

2.6.95 establishes one explicit cascade first. Follow-up Phase 4 patches can then reduce duplicate selectors and unnecessary `!important` usage against a stable ordering contract instead of guessing which file wins.

## Behavior and security intentionally preserved

This phase does not intentionally change:

- Profile, Vault Item, Asset, Settings, Dashboard, Activity, Search, or Recovery layouts;
- Light, Dark, Colorful, or System appearance behavior;
- AES-256-GCM vault encryption;
- Argon2id key derivation;
- main-process-only active data-key ownership;
- renderer sandbox/context isolation;
- offline/network restrictions;
- portable storage behavior;
- encrypted persistence, backup/restore, or recovery semantics.

## Engineering rule going forward

New renderer styles must enter through the canonical `app.css` cascade. Do not add feature-specific `<link>` tags to `index.html` as a shortcut.

When a selector needs stronger precedence, first fix ownership, specificity, or cascade order. Use `!important` only when the declaration represents an intentional application-level override rather than a workaround for uncertain stylesheet ordering.
