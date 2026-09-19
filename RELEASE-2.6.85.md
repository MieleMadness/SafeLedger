# SafeLedger 2.6.85 — Repair Focused Column Click Ordering

SafeLedger 2.6.85 carries forward the complete 2.6.84 candidate and fixes a click-order issue discovered while validating the new focused Profile, Vault, and Asset artwork.

## Root cause

The 2.6.84 focus listener originally ran during normal event bubbling. Profile, Vault, and Asset list-item click handlers can immediately rerender their own column after a selection. That rerender replaces the clicked anchor before the event reaches the column-level focus listener, so the old listener could no longer confirm that the clicked anchor was still inside the column.

The artwork and CSS were correct; the focus state could simply fail to activate because the DOM node had already been replaced.

## Fix

The Profile, Vault, and Asset column listener now runs in the **capture phase**. It records the intended column focus before the list-item handler rerenders that column.

This preserves the requested behavior:

- Profile click → Profile artwork only.
- Vault Item click → Vault artwork only; Profile returns to solid color.
- Asset click → Asset artwork only; Profile and Vault return to solid colors.
- Home, Activity History, and Settings → all three navigation columns return to their normal solid colors.

## No artwork changes

There are **no artwork changes** in 2.6.85. The three approved 2.6.84 local SVG backgrounds, theme overlays, soft-glow styling, one-column-only CSS scope, and existing column dividers are carried forward unchanged.

## Security / behavior scope

The focus state remains transient renderer-only UI state. No authentication, encryption, password, lockout, recovery, vault-data, storage-path, network-permission, or persistence behavior changes.

## Regression coverage

The 2.6.84 regression now protects capture-phase ownership so the focused-column behavior cannot silently regress when list rendering changes. A new 2.6.85 gate directly runs the full 2.6.84 artwork contract and verifies the click-order repair.

Do not merge to `master` until Windows, Linux, and macOS CI pass and the focused Profile/Vault/Asset behavior is hands-on approved.
