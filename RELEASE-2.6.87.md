# SafeLedger 2.6.87 — Restore Solid Profile, Vault, and Asset Columns

SafeLedger 2.6.87 carries forward the complete 2.6.86 candidate and removes the decorative artwork added to the three left navigation columns.

## What changed

The **Profiles**, **Vaults**, and **Assets** columns are back to their normal solid theme colors in every workspace state.

The temporary focused-column artwork behavior is removed completely:

- Clicking a Profile no longer adds an image to the Profiles column.
- Clicking a Vault Item no longer adds an image to the Vaults column.
- Clicking an Asset no longer adds an image to the Assets column.
- There is no longer any `data-column-focus` runtime state or click-order listener for decorative navigation artwork.

The three focused-column SVG assets, their stylesheet, and their renderer module are removed rather than left as dead code.

## Sign-in wallpaper stays

The requested sign-in wallpaper is **not** removed.

Light and Colorful continue using the existing frosted crypto/security sign-in artwork, and Dark continues using the matching navy version. The wallpaper remains scoped only to the Detail/display column while SafeLedger is on the sign-in screen.

## Layout preserved

The existing workspace column divider lines remain unchanged. Search fields, bottom Add buttons, column sizing, collapse behavior, Detail/display layout, and Home/Activity/Settings behavior are unchanged.

## Testing cleanup

The 2.6.84, 2.6.85, and 2.6.86 historical regressions previously enforced the now-retired focused-column artwork and its click-order workaround. Those gates have been modernized so they no longer require obsolete UI behavior.

A new 2.6.87 regression verifies that:

- all three navigation columns remain solid,
- focused-column runtime/CSS/assets stay removed,
- the sign-in wallpaper assets and display-column scope remain intact,
- workspace divider lines remain intact,
- the historical 2.6.84–2.6.86 gates remain compatible with this intentional rollback.

## Security / behavior scope

No authentication, encryption, password, lockout, recovery, vault-data, storage-path, network-permission, persistence, or packaging security behavior changes.

Do not merge to `master` until Windows, Linux, and macOS CI pass and the solid-column appearance is hands-on approved.