# SafeLedger 2.6.47 workflow/test candidate

SafeLedger 2.6.47 includes the requested login password-guidance wording update and carries forward the previously assembled 2.6.42 runtime feature set plus the CI regression corrections needed to validate it.

## Requested change

The Login screen now presents the master-password requirements as four separate lines, in this order:

- `Must be at least 8 characters long.`
- `Must contain at least one uppercase letter.`
- `Must contain one lowercase letter.`
- `Must contain at least one number`

The actual password policy is unchanged; this is a clarity/wording update only.

## CI regression corrections carried forward

- The historical 2.6.7 app-menu test validates `prepareAppMenu` through the normalized preload `invoke('app-menu-prepare')` wrapper rather than requiring the retired direct `ipcRenderer.invoke(...)` source shape.
- The historical 2.5.x preload tests validate trusted operations through that same normalized wrapper.
- The historical 2.5.17 starter-template test distinguishes conventional logo-backed wallets from the reviewed Chain Games service starter.

## Runtime carried forward

- Dark-mode QR presentation is softened while preserving scan contrast and encoded data.
- Locked remote-call errors surface only: `SafeLedger is locked. Please log in again.`
- While locked, Home restores the canonical Login screen; Activity History, Settings, and Global Search do not invoke protected reads.
- Chain Games is preselected in Standard new-Profile setup and uses SafeLedger-owned local service artwork with reviewed CHAIN entries for Ethereum, Polygon, and Chain Games Supernet.

## Security / compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, SafeLedger 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network policy changes.

## Workflow/version rule

This is a **2.6.x workflow/test candidate**. **DO NOT MERGE TO `master`.**

For this and future patch work, a new patch number is assigned when a new user-requested product/code change is made. CI, regression-test, packaging, or workflow corrections needed to finish validating that requested change remain on the **same patch version** and workflow candidate until it is green.
