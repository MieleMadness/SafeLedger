# SafeLedger 2.6.4 — Add Asset & Icon Usability Hotfix

Release: **2.6.4**

SafeLedger 2.6.4 is a focused usability and reliability patch for Vault Item selection, Add Asset behavior, and local icon clarity.

## Fixed

- Fixed **Add Asset** appearing to do nothing after opening a Profile whose Vault Items were visible but no internal Vault Item selection had been established.
- After a normal Profile vault read, SafeLedger now selects the first visible Vault Item when no explicit Vault Item is already selected.
- The Add Asset action also repairs a missing Vault Item selection before the existing Add Asset handler runs, so the form opens from the visible first item instead of silently showing only a status message.
- Existing explicit Vault Item selections are preserved and are never replaced by the default-selection helper.

## Chain Games artwork

- Replaced the Chain Games `CG` initials tile with dedicated local vector artwork using the angular interlocking Chain Games visual motif.
- Chain Games Vault Items and reviewed `CHAIN` Asset entries now resolve to the same local/offline artwork source.
- No favicon lookup, remote image request, or runtime network dependency was added.

## Icon sizing

- Vault Item and Asset navigation artwork now shares the same **28px** desktop size.
- Compact layouts use the same **24px** size for both navigation columns.
- Branded, generic, catalog, and fallback icon containers follow the same sizing contract for a more consistent and readable interface.

## Security and compatibility

- No change to AES-256-GCM vault encryption.
- No change to Argon2id master-password protection or the main-process-only DEK boundary.
- No vault schema migration.
- Existing SafeLedger 2.x vaults remain compatible.
- No cloud or network dependency was added.
- The 2.6.3 preset-save forwarding protection remains active.

## Validation target

2.6.4 should pass the complete regression suite, Electron crypto smoke, real GUI smoke, Windows x64 Portable packaging, Linux x64 AppImage packaging, and native macOS Apple Silicon arm64 packaging before promotion to `master`.
