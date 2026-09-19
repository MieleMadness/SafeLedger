# SafeLedger 2.6.48

SafeLedger 2.6.48 refines the locked/login experience based on hands-on review of 2.6.47.

## Locked top actions

- **Home** continues to restore the canonical Login screen while SafeLedger is locked.
- **Activity History**, **Settings**, and **Global Search** no longer replace the detail panel with a locked/error page.
- Those non-Home actions now stay on the current screen and show the existing top-right **Please login.** notice instead.
- The locked action guard still stops the protected action before its normal handler can run.

## Login-required status icon

- The **Please login.** status notice now uses SafeLedger's locally drawn user/person icon.
- It uses the same person artwork as the Login button rather than the missing `fa-exclamation-circle` fallback.
- The icon remains fully local and does not add an icon-font or network dependency.

## Login sizing

- The Login password field is no longer intentionally limited to 50% of the detail-column width.
- SafeLedger measures the rendered **Welcome to SafeLedger** title text and aligns the password field to that width.
- The password-strength indicator uses the same measured width.
- The Login control row follows the same alignment for a cleaner visual edge.
- Width is capped at 100% of the available detail area and is recalculated when the window is resized.

## Regression coverage

- Adds a 2.6.48 gate for locked Home/non-Home behavior, the top-right login-required notice, the shared user icon, and title-aligned login widths.
- Updates the historical 2.6.42 locked-state gate to protect the new non-navigation behavior for Activity History, Settings, and Global Search.
- Keeps the 2.6.47 password-guidance and normalized preload boundary active on later 2.6.x candidates.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, SafeLedger 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network policy changes.

## Promotion gate

This remains a 2.6.x workflow/test candidate. Do not merge to protected `master` until the full regression suite and Windows, Linux, and native Apple Silicon validation workflows are green and hands-on testing is approved.
