# SafeLedger 2.6.83 — Repair Historical Login Wallpaper Regression

SafeLedger 2.6.83 carries forward the complete 2.6.82 candidate and fixes the regression gate that caused all three 2.6.82 platform workflows to fail even though the login wallpaper production CSS had been corrected.

## What failed in 2.6.82

Windows, Linux, and macOS all reached `scripts/hotfix-2.6.78-tests.js` and failed the same assertion:

`Login artwork must fill only the login display column without tiling.`

The 2.6.78 historical regression still searched for the exact source strings `background-size: cover;` and `background-repeat: no-repeat;`.

## Root cause

2.6.82 intentionally changed those declarations to include `!important` so the login-only Detail-column wallpaper could override the existing important `background` shorthand in `app-theme.css`.

That production fix was necessary to make the crypto imagery visible. The historical 2.6.78 test treated the harmless and required cascade-priority change as if the wallpaper behavior had disappeared.

## Fix

The 2.6.78 gate now inspects the actual scoped login Detail-column rule and validates the intended behavior semantically:

- the login background image is present,
- `background-size` is `cover`,
- `background-repeat` is `no-repeat`,
- the declarations may include the later required `!important` priority,
- the wallpaper stays limited to the Detail/display column,
- the workspace divider borders stay untouched.

This removes the stale exact-text assumption without weakening the visual or divider contract.

## Production scope

There are **no production UI changes** in 2.6.83. The visible 2.6.82 login wallpaper implementation is carried forward unchanged:

- Light + Colorful use the frosted crypto/security artwork,
- Dark uses the navy/electric-blue artwork,
- the crypto icons and soft glow remain,
- the wallpaper remains scoped to the display column,
- the existing column dividers remain active.

There are no authentication, encryption, password, lockout, recovery, vault-data, storage-path, or network-permission changes.

## Regression maintenance

A new 2.6.83 gate directly executes both the repaired historical 2.6.78 gate and the current 2.6.82 wallpaper gate. It also prevents the old brittle exact `background-size` / `background-repeat` source assertions from returning.

Do not merge to `master` until Windows, Linux, and macOS CI pass and the login wallpaper remains hands-on approved.
