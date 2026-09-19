# SafeLedger 2.6.49

SafeLedger 2.6.49 is a three-platform test candidate carrying forward the approved 2.6.48 login and locked-state refinements without additional runtime behavior changes.

## Included behavior

- Home restores the canonical Login screen while SafeLedger is locked.
- Activity History, Settings, and Global Search stay on the current screen while locked and show the top-right `Please login.` notice.
- The login-required notice uses the same locally drawn person icon as the Login button.
- The Login password field matches the rendered width of the `Welcome to SafeLedger` title.
- The password-strength indicator and Login control row use the same aligned width.
- Login sizing remains capped to the available detail area and updates on window resize.
- The four-line Login password guidance introduced in 2.6.47 remains unchanged.

## Validation

The 2.6.48 candidate passed Windows Portable, Linux AppImage, and native macOS Apple Silicon workflows. 2.6.49 re-runs the full regression, Electron crypto smoke, GUI smoke, and packaging workflows as the next user-test candidate.

## Security and compatibility

This candidate does not change the encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, SafeLedger 1.x read-only import, backup/restore format, Self-Destruct behavior, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network policy.
