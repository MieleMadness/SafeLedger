# SafeLedger 2.6.16

SafeLedger 2.6.16 carries forward the readable Light/Dark status-message work from 2.6.15, fixes the visual baseline so it is identical across Windows/Linux/macOS checkouts, and completes the next stylesheet-cleanup step by removing retired versioned CSS fixtures.

## Readable status messages carried forward

- Keeps the 15px semibold top-bar status messages introduced in 2.6.15.
- Keeps separate Light and Dark semantic palettes for info, success, error, and processing states.
- Keeps 4.5:1-or-better regression-tested text/background contrast.
- Keeps semantic icons, long-message wrapping, a 5-second normal display duration, and accessible live-region behavior.
- Keeps status text rendered as text instead of HTML.
- Keeps the status region genuinely empty when no message is active.

## Cross-platform visual baseline

The first 2.6.15 Windows workflow exposed a test-only portability issue: Windows checked out `ui-current.css` with CRLF line endings while Linux/macOS used LF. The visual fingerprint treated those line-ending representations as different even though the CSS was identical.

- Visual baseline hashing now normalizes CRLF/CR line endings to LF before computing the Git-blob fingerprint.
- No CSS rules, declarations, ordering, or approved baseline values are ignored.
- The 2.6.16 regression explicitly checks both an LF copy and a synthetic Windows CRLF copy against the same approved baseline.

## Retired stylesheet fixture removal

SafeLedger 2.6.14 stopped loading ten historical version-numbered UI stylesheets after consolidating their exact cascade into `ui-current.css`. SafeLedger 2.6.16 now removes those duplicate fixture files from the repository:

- `ui-2.5.8.css`
- `ui-2.5.9.css`
- `ui-2.5.11.css`
- `ui-2.5.12.css`
- `ui-2.5.13.css`
- `ui-2.5.14.css`
- `ui-2.5.15.css`
- `ui-2.5.16.css`
- `ui-2.6.7-scale.css`
- `ui-2.6.7-theme-refinement.css`

Their runtime behavior remains in the unchanged `ui-current.css` consolidated stylesheet. Historical regression tests now protect the canonical current stylesheet and approved visual baseline rather than requiring duplicate old files.

## Visual regression coverage

- Keeps the approved `ui-current.css` fingerprint in `scripts/ui-visual-baseline.json`.
- Keeps the reusable Light/Dark visual-contract regression.
- Updates stylesheet consolidation coverage to require the retired files to stay deleted.
- Updates the login-eye regression to use the canonical `ui-current.css` source.
- Keeps the 2.6.14 consolidation and 2.6.15 message-readability gates active on this candidate.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Candidate workflow

SafeLedger 2.6.16 is a workflow/test candidate. Do **not** merge this 2.6.x candidate to `master`. Produce Windows Portable, Linux AppImage, and native Apple Silicon workflow builds for automated and hands-on validation. Promotion to `master` is reserved for an intentional move to a new 2.x release number.
