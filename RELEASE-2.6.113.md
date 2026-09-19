# SafeLedger 2.6.113

## Profile icon picker spacing and definition

- Adds another 10px below the Profile Icon search field, bringing the search-to-results gap to 24px.
- Wraps each rendered Profile icon in a dedicated 40px bordered frame so the artwork is visually defined inside its result tile.
- Keeps the existing bordered result tiles and theme-aware surfaces from 2.6.112.

## Incorrect-password retry fix

A normal incorrect master password no longer leaves the Login button disabled after SafeLedger records the failed attempt.

- SafeLedger waits for the trusted main process to persist the failed-attempt state.
- If the configured brute-force threshold has **not** been reached, Login is re-enabled and focus returns to the password field for the next attempt.
- If a real lockout is active, Login remains disabled and the lockout flow continues unchanged.
- If SafeLedger cannot confirm that the failed-attempt state was persisted, the login remains fail-closed rather than allowing uncounted retries.

## Regression coverage

- Profile icon tests protect the requested 24px search gap and the bordered icon frame.
- Lockout tests verify retry restoration below the threshold, continued blocking during active lockout, and fail-closed behavior when retry state cannot be confirmed.

## Security scope

No changes to Argon2id parameters, AES-GCM encryption, DEK lifetime, key-envelope format, Self-Destruct thresholds, renderer sandboxing, vault persistence authority, or encrypted-data formats.
