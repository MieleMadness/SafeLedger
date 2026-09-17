# SafeLedger 2.6.25 Workflow Candidate

SafeLedger 2.6.25 carries forward the 2.6.24 application changes unchanged and corrects a stale historical regression test discovered by CI.

## Carried-forward UI changes

- `Item Deleted` uses a trash-can icon while remaining a polite red status notification.
- `Run recovery drill` uses a clearer checklist-style glyph.
- The Test Recovery safety callout uses a lock icon instead of the old shield/diamond appearance.
- Optional BIP39 Check appears directly below the Test Recovery heading.
- The BIP39 field and `Validate Locally` button use the same six-pixel spacing rhythm as login.

## Regression-gate correction

The historical 2.6.19 deletion test was hard-coded to the exact pre-icon options object. That made it reject the new dedicated trash icon even though the important behavior remained correct.

2.6.25 modernizes that gate to verify the rendered behavior instead:

- deletion remains in the red visual palette,
- deletion remains visible,
- deletion remains `role=status` with polite live-region semantics,
- the rendered icon is `fa fa-trash`, and
- the message remains `Item Deleted`.

No 2.6.24 application code was changed for this correction.

## Security and compatibility

This candidate does **not** change encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundaries, SafeLedger 2.x compatibility, SafeLedger 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or offline/runtime network behavior.

## Workflow rule

SafeLedger 2.6.25 is a **workflow/test candidate only**. Do **not** merge this 2.6.x patch into `master`. Promotion to `master` remains reserved for an intentional move to a new 2.x release number.
