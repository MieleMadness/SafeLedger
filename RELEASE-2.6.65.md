# SafeLedger 2.6.65 — Settings Position + Visible Legacy Import Files

SafeLedger 2.6.65 carries forward the full 2.6.64 candidate and fixes two usability problems found during hands-on testing: Settings could open at the bottom of its page, and the SafeLedger 1.x importer used a directory-only chooser that hid the legacy files the user was trying to select.

## Settings now opens at the top

The Detail column (`.content-middle`) is the actual vertical scroll container. Replacing the contents of `#detailArea` did not reset that parent scroll position, so a long previously viewed page could leave Settings positioned near the bottom immediately after opening it.

The canonical Settings renderer now resets both the detail element and its real scroll-owning parent to `scrollTop = 0` after the complete Settings page is rendered. This is a direct state/layout correction—there is no timeout, MutationObserver, synthetic click, or post-render repair loop.

Expected behavior: every time Settings is opened, the **Settings** heading and Appearance section are visible first.

## SafeLedger 1.x files are visible in the picker

The previous **Choose 1.x Folder** action intentionally opened an operating-system directory picker. Directory pickers hide files, which made it look as though `vaultlist.json` and the old `zvault-#.json` files were missing even when the user was in the correct SafeLedger 1.x data folder.

The import action is now **Choose 1.x Data File** and opens a JSON file picker. The user may select either:

- `vaultlist.json`, or
- any legacy `zvault-#.json` profile file.

SafeLedger resolves the containing legacy `safeledgerdata` folder from the selected file and imports the complete set referenced by `vaultlist.json`; choosing one file does not limit the import to that one profile.

## Compatibility and security

The underlying 1.x compatibility rules remain intact. Folder resolution is still supported internally for existing tests and compatibility paths, while the user-facing dialog now provides the clearer file-based workflow.

The importer still validates the legacy vault-list structure and expected `zvault-#.json` filenames, decrypts with the supplied 1.x master password, migrates into current authenticated SafeLedger vault files, and rejects unrelated JSON files. The original 1.x files remain unchanged.

No legacy password, seed phrase, private key, or imported content is added to logs or UI routing metadata.

## Regression coverage

The 2.6.65 gate verifies that:

- Settings resets the actual Detail-column scroll owner after rendering;
- the import dialog is a JSON file picker rather than a directory-only picker;
- selecting `vaultlist.json` resolves the complete legacy folder;
- selecting a `zvault-#.json` file resolves the same complete legacy folder;
- unrelated JSON files are rejected;
- internal folder selection remains compatible;
- the 2.6.64 icon-registry contract remains active;
- all changed JavaScript passes syntax checks.

## Release process

This remains a **candidate update**. Do not merge it to `master` until Windows, Linux, and macOS CI pass and hands-on testing confirms both the Settings position and SafeLedger 1.x import workflow.
