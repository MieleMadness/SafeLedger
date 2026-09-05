# SafeLedger 2.6.38 workflow candidate

SafeLedger 2.6.38 is a workflow/test-only patch candidate. **Do not merge this 2.6.x candidate to `master`.**

## Display cleanup

- Removes the trailing ellipsis from all three column search placeholders:
  - `Search profiles`
  - `Search vaults`
  - `Search assets`
- Removes the recent underline treatment from H1-H6 headings, page headers, and product-section headings in the Detail display.
- Keeps legacy heading-adjacent `<hr>` dividers hidden so removing the underline does not restore a full-width line.
- Leaves genuine content/list/card separators intact.

## Local closed-lock icon

- Replaces the old `fa-lock` square placeholder with a CSS-drawn closed padlock.
- Fixes the Activity History icon for **SafeLedger locked by device security state**.
- Fixes the lock icon in the guided recovery privacy callout that begins **This guided test...**.
- Remains fully local/offline with no icon-font or network dependency.

## Recovery Validation naming

- Renames the guided **Test Recovery** page to **Recovery Validation**.
- Updates its reminders, completion/storage text, alerts, and cancel/complete action labels to the new name.
- Recovery drill data semantics are unchanged: only completion/verification timestamps are recorded; secrets and individual checklist answers are not stored.

## Regression maintenance

- Modernizes historical search/heading tests that intentionally protected the now-retired ellipsis and underline styling.
- Keeps the earlier compact-column, hidden legacy divider, Vault-search control, renderer boundary, crypto, and recovery privacy protections active.

## Security and compatibility

No changes to encrypted vault schema, AES-256-GCM, Argon2id, the DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or offline runtime network behavior.
