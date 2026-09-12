# SafeLedger 2.6.82 — Make Login Crypto Wallpaper Visible

SafeLedger 2.6.82 carries forward the complete 2.6.81 candidate and fixes the hands-on issue where the new crypto/security icons were not visible on the sign-in screen.

## What the user saw

The login remained readable and the Detail/display column layout was intact, but the wallpaper icons were not visible even though the Light/Colorful and Dark SVG assets were present in the build.

## Root cause

The problem was CSS cascade ownership, not missing artwork.

`app-theme.css` intentionally gives `.dark4bg` the normal workspace background with an `!important` **background shorthand**:

`background: var(--sl-bg) !important;`

A shorthand sets all background sub-properties, including `background-image`, `background-position`, `background-repeat`, and `background-size`. The 2.6.81 login rule was more specific and loaded later, but its background declarations were not `!important`, so they could not override the existing important shorthand. The result was a plain Detail-column background with no visible wallpaper.

## Fix

The login-only Detail/display-column rule now explicitly wins that existing cascade using scoped `!important` background longhands:

- `background-color`
- `background-image`
- `background-position`
- `background-repeat`
- `background-size`

The wallpaper remains scoped only to `.app-shell[data-login-mode="true"] .detail-column`.

The artwork is biased to `72% center` so the icon-rich side of the supplied-reference composition is more visible beside and below the login controls.

## What stays unchanged

The existing column dividers remain untouched. There is no border override, no all-cell transparency rule, and no whole-shell wallpaper. Profiles, Vault Items, Assets, the search row, and the bottom action row keep their existing layout and separators.

Light and Colorful still share the frosted white/pale-blue crypto artwork. Dark still uses the matching navy/electric-blue artwork. Both remain fully local/offline and keep the crypto icons, wallet/security imagery, and soft glow treatment introduced in 2.6.81.

## Security / behavior scope

There are **no authentication**, encryption, password, lockout, vault-data, recovery, storage-path, or network-permission changes in this patch.

## Regression maintenance

The 2.6.81 regression was updated to understand the real CSS cascade, and a new 2.6.82 gate verifies that the login wallpaper actually overrides the important base background while preserving the existing workspace column dividers.

Do not merge to `master` until Windows, Linux, and macOS CI pass and the visible Light/Colorful and Dark sign-in wallpaper is hands-on approved.
