# SafeLedger 2.6.114

## Profile icon search spacing fix

The visible space below **Search icons** is now owned by the results layout instead of the form control.

- Removes the ineffective search-field bottom margin.
- Adds a dedicated Profile icon results wrapper.
- Gives that wrapper an explicit **10px top padding**.
- Removes the grid's old 2px top padding so the intended visible separation is controlled in one place.
- Keeps the 40px bordered icon frames and bordered result tiles from 2.6.113.

This makes the search-to-results spacing independent of Bootstrap/form-control margin behavior and prevents the gap from collapsing visually.

## Carried forward

2.6.114 includes the 2.6.113 incorrect-password retry fix: failed attempts below the configured lockout threshold restore the Login button and password focus after the failed-attempt state is persisted, while active lockouts remain blocked and persistence failures remain fail-closed.

## Regression coverage

Profile icon tests now require the dedicated results wrapper and its exact 10px structural gap rather than checking a form-control margin.

## Security scope

No changes to Argon2id parameters, AES-GCM encryption, DEK lifetime, key-envelope format, brute-force thresholds, Self-Destruct behavior, renderer sandboxing, persistence authority, or encrypted-data formats.
