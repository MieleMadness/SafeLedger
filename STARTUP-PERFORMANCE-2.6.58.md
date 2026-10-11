# SafeLedger 2.6.58 — Startup Performance Architecture

## Why this correction exists

The packaged application could take several seconds before the login experience became available. SafeLedger should remain secure, offline and portable, but work unrelated to login should not block creation of the first application window.

## Root cause found in SafeLedger

SafeLedger prepares a complete local Web3 icon catalog at build time. The catalog currently contains more than two thousand token, network, wallet and exchange icons.

Before 2.6.58, every SVG was converted into a base64 data URL and embedded inside one runtime JSON manifest. That manifest was then bundled into the renderer. The result was convenient and offline, but it forced Electron to read and parse thousands of SVG payloads before the renderer could execute the login UI.

The main process also loaded Profile/template and token-icon helpers before creating the BrowserWindow. Those helpers could pull the same Web3 lookup catalog into the pre-window require graph even though no Profile or Asset icon is needed to display the login screen.

## 2.6.58 replacement

### Lightweight icon lookup manifest

The prepared manifest now contains:

- canonical icon keys;
- aliases;
- wallet/exchange display names;
- relative paths to packaged local SVG files.

It no longer contains the bulk SVG bytes.

### On-demand local SVG files

Each prepared icon is written as its own SVG under:

`src/main/assets/token-icons/<category>/`

The manifest points to those files. The browser loads an SVG only when an icon is actually displayed.

This remains fully offline. There is no CDN, HTTP request, runtime dependency download or blockchain/API lookup.

### Deferred feature catalogs

`profile-setup.js` and `token-icons.js` no longer load `web3-icons.js` as a top-level startup dependency. They load the catalog on first actual icon/template use instead.

This keeps Profile creation and Asset rendering behavior intact while removing them from the critical pre-window startup path.

## Security boundaries unchanged

2.6.58 does not change:

- AES-256-GCM vault encryption;
- Argon2id password/key handling;
- main-process-only DEK ownership;
- encrypted vault compatibility;
- offline operation;
- portable `SafeLedgerData` placement;
- icon source trust (the icon catalog is still generated from the pinned build dependency);
- Content Security Policy — icon files are packaged under the app's own `self` origin.

## Regression policy

`startup-performance-tests.js` protects the architecture rather than timing an overloaded CI machine. It verifies:

- the full icon catalog remains available;
- the runtime manifest contains local paths, not bulk base64 SVG data;
- every manifest icon points to an existing packaged SVG;
- the manifest and renderer bundle stay below generous size ceilings;
- Profile setup and token-icon helper imports do not eagerly load the Web3 manifest.

The ceilings are deliberately regression guards rather than performance promises. Actual launch time depends on hardware, storage, antivirus scanning and packaging format.

## Windows Portable packaging note

The electron-builder Windows `portable` target is a single self-extracting executable. That packaging format has work to do before Electron itself starts. SafeLedger 2.6.58 removes avoidable application-side startup work, but the single-file Portable EXE can still have more cold-start overhead than an already-extracted application folder.

A future optional Windows extracted-folder/ZIP distribution can provide a faster-start alternative without replacing the existing single-file Portable EXE.