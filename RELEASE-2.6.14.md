# SafeLedger 2.6.14

SafeLedger 2.6.14 continues the renderer/UI cleanup sequence as a workflow/test candidate by consolidating the remaining version-numbered runtime UI stylesheet cascade.

## One current runtime UI stylesheet

- Adds `src/main/css/ui-current.css` as the single current refinement layer loaded after the canonical theme and feature stylesheets.
- Preserves the exact rule order previously supplied by ten separate UI patch files:
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
- `index.html` now loads `ui-current.css` once instead of loading those ten versioned files separately.
- No visual redesign is intended in this candidate; the goal is to simplify ownership and runtime load order while preserving the approved interface.

## Historical CSS fixtures

The ten old versioned files remain in the repository temporarily, but they are no longer loaded by the app. Keeping them for this candidate provides a mechanical equivalence reference while the consolidation is validated on Windows, Linux, macOS, and by hands-on testing.

A later cleanup can delete those historical fixture files after the consolidated stylesheet and visual regression coverage are established.

## Regression modernization

- Historical 2.5.8 through 2.5.16 UI behavior tests now inspect the current runtime stylesheet where appropriate rather than requiring their old filename to remain loaded.
- The 2.6.7 visual regression now protects scale, selection, menu, button, and scrollbar behavior through `ui-current.css`.
- UI polish load-order coverage now checks the current refinement layer.
- The existing stylesheet-consolidation regression now requires the old versioned files to stay out of the runtime HTML.
- Adds a 2.6.14 regression that strips comments/whitespace and compares `ui-current.css` against the historical ten-file cascade. The test fails if declaration content or rule order differs.
- Keeps the 2.6.13 Profile picker cleanup regression active on later 2.6.x candidates.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Candidate workflow

SafeLedger 2.6.14 is a workflow/test candidate. Do **not** merge this 2.6.x candidate to `master`. Produce Windows Portable, Linux AppImage, and native Apple Silicon workflow builds for automated and hands-on validation. Promotion to `master` is reserved for an intentional move to a new 2.x release number.
