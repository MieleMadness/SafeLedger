# SafeLedger 2.6.36 workflow candidate

SafeLedger 2.6.36 carries forward the approved 2.6.35 cumulative behavior and makes two small wording/heading refinements requested during hands-on review.

## Vault search wording

- The second-column search placeholder is now `Search vaults...` instead of `Search vault items...`.
- The matching clear-control title and accessibility label now say `Clear vault search`.
- Search behavior itself is unchanged.

## Vault and Asset heading underlines

- Vault Item detail headers and Asset detail headers use the same text-width underline treatment as other SafeLedger headings.
- Their title text owns the underline directly.
- The legacy full-width divider immediately below those icon/header rows is hidden.
- Standalone separators elsewhere remain unchanged.
- The underline continues to use the theme border color in Light and Dark modes.

## Carried-forward behavior

- 98px compact navigation rails remain unchanged.
- Compact selected items remain square, shrink-wrapped icon tiles with equal 6px padding.
- Activity History local power/open-lock icons remain unchanged.
- Collapsible navigation remains independent, accessible, and expanded by default on launch.

## Security / compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Workflow rule

This is a **2.6.x workflow/test candidate**. Do **not** merge it to `master`. Validate Windows Portable, Linux AppImage, native Apple Silicon, full regression, Electron crypto smoke, real GUI smoke, and hands-on behavior.
