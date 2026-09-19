# SafeLedger 2.6.41 Workflow Candidate

> **Workflow/test candidate only. Do not merge this 2.6.x patch into `master`.**

SafeLedger 2.6.41 changes the locked-to-unlocked workspace transition while preserving the existing compact-navigation system and security boundaries.

## Startup workspace

- Profile, Vault Item, and Asset navigation columns begin in their existing 98px compact state while SafeLedger is locked.
- The Detail area remains available for the login screen.
- No vault data, settings, or selection state is changed merely by collapsing the UI.

## Successful login transition

- SafeLedger reuses the canonical Profile list and selects the first **visibly displayed** Profile. This follows the same pinned-first/alphabetical order the user sees on screen.
- The existing Profile click handler performs the vault read; no second vault-read IPC path was added.
- When that Profile finishes loading, its Vault Items are rendered but `groupSelected` and `recordSelected` remain cleared. No Vault Item or Asset is automatically selected.
- Profile, Vault Item, and Asset columns then slide open together over 420ms to the existing 2/2/2/5 workspace proportions.
- Reduced-motion system preferences skip the animation and open the workspace immediately.
- After the animation, temporary sizing is removed so the existing manual collapse controls remain authoritative.
- If no Profiles exist, the columns open immediately so a Profile can be created.

## Lock behavior

A session-lock event returns all three navigation columns to the compact login state for the next unlock.

## Security and compatibility

This UI-only change does not modify the encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, SafeLedger 1.x read-only import, backup/restore format, Self-Destruct behavior, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network policy.

## Required validation

- Full regression suite
- Electron crypto smoke test
- Real GUI smoke test
- Windows Portable package
- Linux AppImage package
- Native Apple Silicon arm64 package and architecture verification
- Hands-on confirmation of startup collapse, first-Profile selection, unselected Vault Items, and post-login slide animation
