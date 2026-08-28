# SafeLedger 2.2 — Runtime Modernization

## Release goal

SafeLedger 2.2 removes the remaining compatibility-era renderer and UI dependencies while preserving the SafeLedger 2.1 encryption, vault schema, backup, migration, Emergency Lock, and portable-data behavior.

Target version: **2.2.0**.

## Required implementation

- Replace renderer-side Electron imports with an explicit SafeLedger renderer/preload boundary.
- Remove `renderer-electron-shim.js` and the esbuild Electron shim resolver.
- Replace Bootstrap 3 application-shell dependency with SafeLedger-owned CSS Grid/Flexbox.
- Replace Font Awesome 4 / Glyphicons with bundled local icons.
- Standardize visible terminology on **Profile → Wallet → Asset** without renaming persisted `record` fields.
- Remove hard-coded `America/New_York` display formatting and use the host OS timezone.
- Add a dedicated runtime-modernization regression suite.

## Non-negotiable continuity boundaries

2.2 must not change:

- AES-256-GCM vault encryption or `SLG2` payload format.
- Argon2id key-envelope behavior.
- Main-process-only DEK handling.
- Backup format v3 or Verify Backup behavior.
- Version-2 backup restore compatibility.
- SafeLedger 1.x read-only import behavior.
- Portable `SafeLedgerData` placement.
- Emergency Lock login-reset behavior.
- Offline/no-cloud operation.

## Release gates

2.2.0 is releasable only when the final commit passes all of the following on Windows and Linux:

1. Full regression suite.
2. Electron crypto smoke test.
3. Real GUI smoke test.
4. Windows portable build.
5. Linux AppImage build.
6. Existing 2.1 vault continuity tests.
7. 1.x importer tests.
8. Backup v2/v3 tests.
9. No renderer Electron compatibility shim remains.
10. No Bootstrap or Font Awesome runtime dependency remains.
11. No hard-coded geographic timezone remains in renderer code.
12. The package version is stamped `2.2.0` only after implementation is complete.
