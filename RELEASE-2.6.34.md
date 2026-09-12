# SafeLedger 2.6.34

SafeLedger 2.6.34 is a workflow/test candidate only. Do not merge this 2.6.x patch to `master`.

## What changed

### Balanced compact navigation padding
- Collapsed Profile, Vault Item, and Asset navigation items now use 6px padding on every side.
- This replaces the previous 6px vertical / 9px horizontal item spacing.
- Compact rails shrink proportionally from 104px to 98px, preserving the same usable artwork breathing room while returning 6px of width to the Detail pane for each collapsed column.
- The 15px outer column padding remains unchanged.
- Wallet artwork stays centered without its expanded-mode text margin.

### Short heading underlines
- Legacy Detail pages that used a full-width divider directly below a page heading now render the separator as part of the heading itself.
- The underline is only as wide as the heading text.
- The adjacent full-width `<hr>` is hidden only when it belongs directly to that heading; standalone content separators remain available.
- The underline uses the current SafeLedger theme border color in Light and Dark modes.

### Carried-forward Activity History artwork
- `SafeLedger opened` keeps its local power icon.
- `SafeLedger unlocked` keeps its local open-padlock icon.
- No remote icon/font dependency is introduced.

## Regression coverage
- Historical compact-layout gates now follow the current 98px compact width.
- 2.6.32/2.6.33 cross-platform padding coverage remains active.
- New 2.6.34 coverage requires equal 6px item padding, the proportional 98px rail, text-width heading underlines, and removal of heading-adjacent full-width dividers.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Validation target

Run the full Windows Portable, Linux AppImage, and native Apple Silicon workflows including regression, Electron crypto smoke, real GUI smoke, and packaging before hands-on approval.
