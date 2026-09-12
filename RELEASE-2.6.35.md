# SafeLedger 2.6.35 workflow candidate

SafeLedger 2.6.35 carries forward the approved 2.6.34 cumulative behavior and refines the collapsed navigation selection shape.

## Compact selection tile

- Collapsed Profile, Vault Item, and Asset links now shrink-wrap their icon instead of stretching across the available rail width.
- The selection tile keeps the approved 6px padding on all four sides.
- Collapsed list rows center the compact tile inside the 98px rail.
- Profile and Asset row wrappers no longer force the compact tile to full width.
- Profiles now use the same square link-level selection outline as Vault Items and Assets while collapsed.
- The old circular Profile badge selection border is suppressed only in compact mode to avoid a double outline.

## Carried-forward behavior

- Compact rails remain 98px wide with 15px outer column padding.
- Detail heading underline remains limited to heading text width.
- Activity History open/unlock icons remain locally rendered and offline.
- Columns remain expanded by default and independently collapsible.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Workflow rule

This is a **2.6.x workflow/test candidate**. Do **not** merge it to `master`. Validate Windows Portable, Linux AppImage, native Apple Silicon, full regression, Electron crypto smoke, real GUI smoke, and hands-on behavior before promotion to a future intentional 2.x release.
