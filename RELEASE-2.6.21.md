# SafeLedger 2.6.21 Workflow Candidate

SafeLedger 2.6.21 carries forward the requested 2.6.19 behavior unchanged and completes the historical sizing-test modernization exposed by the 2.6.20 workflow.

## Why 2.6.21 exists

The 2.6.20 workflow passed the updated general UI regression, the 2/2/2/5 layout gate, crypto, sandbox, device-security, recovery, and many historical checks. It then reached `scripts/hotfix-2.6.7-tests.js`, which still expected the former literal 1400px preferred window width.

A review of the related 2.6.11 historical gate found the same retired 1400px expectation. Both are corrected together in this candidate.

## Historical regression correction

- `hotfix-2.6.7-tests.js` now protects an explicit desktop preferred width, 750px height, grow-only sizing, and trusted main-process ownership without freezing the old 1400px value.
- `hotfix-2.6.11-tests.js` now validates the same current sizing policy while continuing to protect direct Vault Item detail artwork.
- The dedicated 2.6.19 regression remains the exact owner of the current 1283px width and 2/2/2/5 layout decision.

## Carried-forward behavior

No application runtime behavior changed from 2.6.19/2.6.20:

- Profile, Vault Item, and Asset navigation columns remain equal width (`2fr / 2fr / 2fr`).
- Detail remains `5fr`.
- Preferred native opening size remains `1283 x 750`.
- Successful Profile, Vault Item, and Asset deletions show a red **Item Deleted** confirmation.
- Actual deletion failures remain true errors.
- Routine successful reads remain silent.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Workflow rule

This is a **2.6.x workflow/test candidate**. Do **not** merge it to `master`. Validate Windows Portable, Linux AppImage, native Apple Silicon, and hands-on behavior. Promotion to `master` remains reserved for an intentional move to a new 2.x release number.
