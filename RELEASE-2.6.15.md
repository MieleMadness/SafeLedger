# SafeLedger 2.6.15

SafeLedger 2.6.15 carries forward the hands-on-approved 2.6.14 stylesheet consolidation, improves top-bar message readability in Light and Dark mode, and establishes a durable visual-regression baseline for the consolidated UI.

## Easier-to-read messages

- Reworks the top-right SafeLedger status/message component instead of relying on legacy Bootstrap alert colors.
- Desktop messages use 15px semibold text with improved padding and line height.
- Long messages can wrap and grow vertically instead of being clipped by the old fixed-height status area.
- Info, success, error, and processing messages each receive dedicated semantic colors.
- Light and Dark themes have separate reviewed foreground/background/border values.
- Every reviewed status text/background pair is regression-tested at 4.5:1 contrast or better.
- Adds simple local semantic icons for info, success, error, and processing states.
- Normal status messages remain visible for 5 seconds instead of 3 seconds to provide more reading time.
- Error messages use assertive live-region semantics; non-error and processing messages use polite status semantics.
- Status text is rendered with `textContent` rather than HTML injection.
- Replaces the old `&nbsp;` placeholder with a genuinely empty status region.

## Canonical message styling

- Adds `src/main/css/status-messages.css` as a named component stylesheet.
- Loads it after `ui-current.css`, so current message rules intentionally override the old historical status-area sizing without modifying the approved 2.6.14 consolidated cascade.
- Keeps the 2.6.14 `ui-current.css` cascade itself unchanged.

## Visual regression foundation

- Captures the approved 2.6.14 consolidated `ui-current.css` as a Git-blob fingerprint in `scripts/ui-visual-baseline.json`.
- Adds `scripts/visual-contract-regression-tests.js`.
- The visual contract verifies the consolidated stylesheet fingerprint has not drifted accidentally.
- The same visual contract verifies the Light/Dark status-message contrast ratios and the canonical stylesheet load order.
- The existing 2.6.14 exact old-cascade equivalence test remains active for this candidate.
- This baseline is intended to let the next cleanup remove the ten historical CSS fixture files while preserving a stable regression target.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Candidate workflow

SafeLedger 2.6.15 is a workflow/test candidate. Do **not** merge this 2.6.x candidate to `master`. Produce Windows Portable, Linux AppImage, and native Apple Silicon workflow builds for automated and hands-on validation. Promotion to `master` is reserved for an intentional move to a new 2.x release number.
