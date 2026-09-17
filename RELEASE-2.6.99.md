# SafeLedger 2.6.99

SafeLedger 2.6.99 continues Code Cleanup Phase 5 with a focused repository-hygiene change: **one canonical application icon for both the Electron runtime window and packaged Windows/Linux builds**.

## What changed

Before 2.6.99, SafeLedger carried two PNG application-icon paths:

- `sl.png` for the runtime `BrowserWindow`;
- `build/icon-source.png` for electron-builder Windows and Linux packaging.

Git stored both paths as the exact same blob (`0eef161eeea26cbed070c117731f1151b3bb3ea1`, 3,453 bytes). They were duplicate files with split ownership, not separate platform artwork.

2.6.99 keeps `sl.png` as the canonical application icon and removes `build/icon-source.png`.

`package.json` now uses `sl.png` for:

- the packaged-file include list;
- Windows portable build icon ownership;
- Linux AppImage build icon ownership.

The Electron `BrowserWindow` already used `sl.png`, so its runtime path is intentionally unchanged.

## Why keep `sl.png` instead of moving the runtime to `build/`

Either identical PNG could have been selected as the surviving file. Keeping `sl.png` avoids creating a new packaged runtime path assumption solely for cleanup.

This means:

- the runtime window continues to load the same path as 2.6.98;
- the image bytes are unchanged;
- Windows/Linux packaging now uses those same bytes;
- the duplicate file is actually removed rather than hidden behind a copy, alias, or symlink.

The result is one owner and less repository ambiguity with the smallest behavior surface.

## Durable regression protection

The canonical Repository Hygiene suite now verifies that:

- `sl.png` exists;
- `build/icon-source.png` does not exist;
- the BrowserWindow still points at `sl.png`;
- electron-builder includes `sl.png` in packaged files;
- the retired duplicate path is absent from packaged files;
- Windows and Linux packaging both use `sl.png`;
- no active build configuration references `build/icon-source.png`.

SafeLedger remains on the same 47-suite canonical regression architecture established during the earlier cleanup phases.

## Behavior intentionally unchanged

2.6.99 does not intentionally change:

- application icon artwork or PNG bytes;
- AES-256-GCM vault encryption;
- Argon2id password/key-envelope behavior;
- main-process-only active data-key ownership;
- renderer sandboxing or context isolation;
- offline/network restrictions;
- portable storage behavior;
- SafeLedger 2.x encrypted-data compatibility;
- SafeLedger 1.x read-only import;
- Profile, Vault Item, Asset, Settings, Dashboard, Activity, Search, or Recovery behavior;
- backup/restore, lockout, Emergency Lock, or Self-Destruct behavior;
- Light, Dark, Colorful, or System appearance behavior.

## Release safety

SafeLedger 2.6.98 was confirmed fully green on Windows, Linux, and macOS before the 2.6.99 branch was created.

2.6.99 must not merge until all three supported CI workflows pass the canonical regression set, release-trust contract, encrypted lifecycle test, Electron crypto smoke, real GUI smoke, platform packaging, staging, attestations, and uploads with the duplicate icon removed.
