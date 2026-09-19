# SafeLedger 2.6.58 — Faster Startup

SafeLedger 2.6.58 is a user-reported startup-performance correction carried forward from the unmerged 2.6.57 candidate.

## What changed

- Replaced the runtime Web3 icon manifest's thousands of inline base64 SVG payloads with lightweight paths to packaged local SVG files.
- Icons remain fully offline and are loaded only when SafeLedger actually renders them.
- Deferred Profile-template Web3 icon loading until Profile/template functionality is used.
- Deferred token Web3 icon loading until an Asset icon lookup is actually needed.
- Added startup-performance regression coverage for catalog completeness, local-only assets, bundle/manifest size ceilings and pre-window import behavior.
- Modernized the 2.5.5 icon regression so it protects local/offline artwork without requiring the retired inline-base64 implementation.
- Modernized the 2.6.57 gate so the approved Recovery UX behavior remains active on later 2.6.x patches rather than freezing the package version at 2.6.57.

## What did not change

- No vault format change.
- No encryption or key-management change.
- No internet connection is introduced.
- No icon CDN or remote icon service is introduced.
- No change to SafeLedgerData portability.
- No change to the 2.6.55 exact selected-Asset targeting correction.
- No change to 2.6.57 Recovery UX refinements.
- No change to Phase 1–5 lifecycle/release-trust protections.

## Windows Portable note

The single-file Windows Portable EXE is a self-extracting package, so some launch overhead exists before Electron starts. 2.6.58 removes avoidable SafeLedger-side startup parsing. A separate extracted-folder/ZIP distribution can be considered later if a faster-start Windows option is desired while retaining the single-file Portable EXE.

## Merge rule

**DO NOT MERGE TO `master`** until the complete Windows/Linux/macOS CI matrix is green and the packaged 2.6.58 build receives hands-on startup and functional approval.