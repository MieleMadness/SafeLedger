# SafeLedger 2.6.84 — Focused Profile, Vault, and Asset Column Artwork

SafeLedger 2.6.84 carries forward the complete 2.6.83 candidate and adds the requested visual treatment for the three navigation columns.

## What changed

Each main workspace column now has its own local artwork:

- **Profiles** uses a blend of vault/security imagery and crypto assets.
- **Vaults** uses strictly vault, hardware-wallet, secure-storage, shield, and safe imagery.
- **Assets** uses various cryptocurrency token symbols and no vault/storage artwork.

The artwork follows the same dark navy / blue glass style and soft-glow direction as the approved visual references.

## Main-focus behavior

Only one navigation column can show artwork at a time.

- Clicking a Profile makes the **Profiles** main column the visual focus.
- Clicking a Vault Item returns Profiles to its normal solid color and makes the **Vaults** main column the visual focus.
- Clicking an Asset returns the other columns to solid colors and makes the **Assets** main column the visual focus.
- Opening **Home**, **Activity History**, or **Settings** clears column focus so all three navigation columns return to their normal solid theme colors.

The focus state is transient renderer-only UI state. It is not saved into profile, vault, asset, or settings data.

## Scope

Artwork is limited to the three main list columns. It does not apply to the search row, bottom action row, or Detail/display column.

The existing column dividers remain unchanged. No border rules, grid sizing, search layout, button layout, or collapse behavior were modified.

## Appearance behavior

Colorful and Dark use the artwork in its deeper navy/blue presentation. Light uses the same artwork with a pale theme overlay so existing dark text remains readable.

All three artwork files are self-contained SVGs packaged with SafeLedger and remain fully local/offline. They contain no scripts, embedded HTML, nested images, or remote resources.

## Security / behavior scope

There are no authentication, encryption, password, lockout, recovery, vault-data, storage-path, network-permission, or persistence changes in this patch.

## Regression coverage

A new 2.6.84 gate verifies the Profile/Vault/Asset focus mapping, utility-view clearing, one-column-only CSS scope, artwork separation, local/offline packaging, preserved column dividers, and continued execution of the 2.6.83 regression gate.

Do not merge to `master` until Windows, Linux, and macOS CI pass and the focused-column behavior is hands-on approved.
