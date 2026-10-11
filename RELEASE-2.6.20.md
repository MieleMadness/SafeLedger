# SafeLedger 2.6.20 Workflow Candidate

SafeLedger 2.6.20 carries forward the intended 2.6.19 behavior unchanged and corrects one stale historical regression gate.

## Why 2.6.20 exists

The 2.6.19 Linux workflow passed core regression checks, AES-256-GCM/Argon2id coverage, and the v2-only crypto gate. It then stopped in `scripts/ui-regression-tests.js` because that general UI test still required the old literal `PREFERRED_WIDTH = 1400` value.

The 1283px preferred width is intentional: the navigation grid changed from `2/2/3/5` to `2/2/2/5`, reducing the total grid from 12 units to 11 while preserving approximately the same width per unit and the same Detail-area working width.

## Regression correction

- The general UI regression no longer owns a historical literal 1400px width.
- It still requires trusted-bootstrap main-process sizing.
- It still requires an explicit desktop preferred width of at least 1200px and a 750px preferred height.
- The dedicated 2.6.19 regression remains the exact owner of the current `1283px` width and `2/2/2/5` grid decision.

## Carried-forward behavior

No application behavior changed from 2.6.19:

- Profile, Vault Item, and Asset navigation columns remain equal width.
- Detail remains `5fr`.
- Preferred native opening size remains `1283 x 750`.
- Successful Profile, Vault Item, and Asset deletions show a red **Item Deleted** confirmation.
- Actual deletion failures remain true errors.
- Routine successful reads remain silent.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Workflow rule

This is a **2.6.x workflow/test candidate**. Do **not** merge it to `master`. Validate Windows Portable, Linux AppImage, native Apple Silicon, and hands-on behavior. Promotion to `master` remains reserved for an intentional move to a new 2.x release number.
