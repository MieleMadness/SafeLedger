# SafeLedger 2.6.32

SafeLedger 2.6.32 is a workflow/test candidate only. Do not merge this 2.6.x patch to `master`.

## What changed

### More breathing room for collapsed navigation

Profiles, Vault Items, and Assets still collapse independently, but the compact rail is widened from 56px to 104px so the artwork no longer crowds or overlaps the navigation border.

- Compact rail width: 104px.
- Collapsed cells keep the same 15px left/right padding as expanded columns.
- Collapsed navigation items keep the same 9px horizontal padding as expanded navigation items.
- Wallet/Vault Item artwork drops its expanded-mode right margin while collapsed so the icon is visually centered.
- Search remains hidden and cleared while collapsed, labels remain available through tooltips/accessibility names, and all columns still start expanded each launch.

### Activity History icon rendering

The local/offline icon layer now provides real CSS-drawn artwork for the two Activity History entries that were previously displaying placeholders:

- `SafeLedger opened` uses a locally drawn power symbol (`fa-power-off`).
- `SafeLedger unlocked` uses a locally drawn open padlock (`fa-unlock`).
- The login button keeps its existing separate person-style artwork even though it also uses the `fa-unlock` class in legacy markup.

No remote icon font or network dependency was added.

## Regression coverage

- Historical compact-layout gates now carry the current 104px padded rail width.
- UI polish verifies the current compact width.
- 2.6.32 adds direct checks for 15px outer padding, 9px item padding, centered wallet artwork, retirement of the 56px rail, and the locally drawn Activity History power/unlock icons.
- The 2.6.31 behavior-based meta-gate correction remains active.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Validation target

Run the full Windows Portable, Linux AppImage, and native Apple Silicon workflows including regression, Electron crypto smoke, real GUI smoke, and packaging before hands-on approval.
