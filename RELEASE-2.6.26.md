# SafeLedger 2.6.26 workflow candidate

SafeLedger 2.6.26 carries forward the fully green 2.6.25 candidate and applies the next hands-on UI refinements. This is a workflow/test candidate only and must not be merged to `master`.

## Recovery Readiness icon

- Replaces the unsupported recovery-drill pseudo-glyph that rendered as a rectangle on Windows.
- `Run recovery drill` now uses SafeLedger's already-bundled Font Awesome refresh/retest icon.
- Removes the retired `.fa-shield::before` glyph override.

## Cleaner account presets

- Exchange, Web3, and Website presets no longer auto-create a blank `Login method` row.
- Web3 presets no longer auto-create a blank `Connected wallet(s)` row.
- When editing older Vault Items, those retired preset rows are removed only when they are still blank.
- Any existing populated `Login method` or `Connected wallet(s)` value is preserved and remains editable/encrypted.
- No encrypted vault schema or compatibility format changes are made.

## Collapsible navigation columns

Profiles, Vault Items, and Assets now support an explicit compact navigation mode based on familiar desktop navigation-rail behavior:

- All three columns start expanded on every launch so labels remain discoverable.
- Each column has its own chevron Collapse/Expand control.
- A collapsed column becomes a 56px icon rail instead of disappearing completely.
- Search text, item labels, pin badges, and Add-button text are visually hidden in compact mode while icons and selection state remain available.
- Item names remain available to assistive technology and native hover/focus labels.
- Collapsing a column clears an active hidden search so the compact rail cannot appear mysteriously filtered.
- The Detail column automatically receives the freed grid space.
- Each column can be collapsed or expanded independently.
- Compact state is intentionally session-only; SafeLedger starts with full labels again on the next launch.
- No MutationObserver or renderer patch loop is introduced.

## Security and compatibility

Unchanged:

- encrypted vault schema
- AES-256-GCM
- Argon2id
- DEK/session boundary
- SafeLedger 2.x compatibility
- 1.x read-only import
- backup/restore format
- Self-Destruct semantics
- Privacy Mode
- Recovery Intelligence secret handling
- portable-storage behavior
- runtime network behavior / offline-first operation

## Workflow rule

SafeLedger 2.6.26 is a **2.6.x workflow/test candidate**. Do **not** merge this PR to `master`. Promotion to `master` remains reserved for an intentional move to a new 2.x release number.
