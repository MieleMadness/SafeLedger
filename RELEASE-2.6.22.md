# SafeLedger 2.6.22 Workflow Candidate

SafeLedger 2.6.22 carries forward the requested equal-column layout and red deletion feedback unchanged and corrects one historical accessibility regression gate.

## Why 2.6.22 exists

The 2.6.21 workflow successfully passed the modernized 2.6.7 and 2.6.11 window-sizing gates. It then reached `scripts/hotfix-2.6.15-tests.js`, where an old source-shape assertion required every red/danger message to use an assertive live region.

That assumption predates the new successful deletion state. A real error should still be assertive; a successful red **Item Deleted** confirmation should remain a polite status even though it intentionally uses the red visual palette.

## Regression correction

- Normal danger/error messages still default to `role="alert"` and `aria-live="assertive"`.
- Successful red deletion confirmations remain `role="status"` and `aria-live="polite"`.
- The historical 2.6.15 gate now verifies those behaviors directly rather than requiring the old one-line implementation.

## Carried-forward behavior

No application runtime behavior changed from 2.6.19 through 2.6.22:

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
