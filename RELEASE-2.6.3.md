# SafeLedger 2.6.3 — Chain Games Save Hotfix

Release: **2.6.3**

SafeLedger 2.6.3 is a focused reliability hotfix for the Chain Games Web3 / Website Account preset introduced in 2.6.2.

## Fixed

- Fixed a renderer-sandbox incompatibility that could leave the Chain Games Vault Item save flow stuck in **processing**.
- The local service/website SVG icon generator no longer depends on Node's `Buffer` global. It now uses renderer-safe URI encoding while remaining completely local and offline.
- Preset asset seeding is now isolated from the core Vault Item save request. If optional preset enrichment ever fails in the renderer, SafeLedger still sends the encrypted save request instead of leaving the UI in a permanent saving state.
- Chain Games continues to seed the reviewed CHAIN entries for Ethereum, Polygon, and Chain Games Supernet with the 2.6.2 Network / Contract address metadata.

## Root cause

SafeLedger's renderer intentionally runs with Node integration disabled and inside Electron's sandbox. The 2.6.2 local known-site icon generator used `Buffer.from(...)` when creating an SVG data URL. Chain Games preset seeding resolves its deterministic CHAIN artwork during the pre-save path, so that sandbox-only `Buffer` reference could throw synchronously after the UI entered its saving state but before the `process-group` IPC request reached the trusted main process.

## Security and compatibility

- No change to AES-256-GCM vault encryption.
- No change to Argon2id master-password protection or the main-process-only DEK boundary.
- No vault schema migration.
- Existing SafeLedger 2.x vaults remain compatible.
- No cloud or network dependency was added.
- Website/service artwork remains fully local.
- The optional preset-seeding guard does not suppress or bypass the encrypted Vault Item save itself.

## Validation target

2.6.3 should pass the complete regression suite, Electron crypto smoke, real GUI smoke, Windows x64 Portable packaging, Linux x64 AppImage packaging, and native macOS Apple Silicon arm64 packaging before promotion to `master`.
