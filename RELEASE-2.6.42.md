# SafeLedger 2.6.42 — workflow/test candidate

> **Do not merge this 2.6.x candidate into `master`.**

SafeLedger 2.6.42 carries forward the hands-on-approved 2.6.41 startup/login workspace animation and focuses on locked-state navigation, dark-mode QR presentation, and the default starter inventory.

## Dark-mode QR presentation

- On-screen QR containers now follow the dark application surface instead of forcing a full white panel.
- In dark mode the QR image is modestly dimmed while retaining strong black/light contrast and the generated quiet zone for reliable scanning.
- QR payload generation is unchanged.
- Printed Recovery Binder QR codes are unchanged and remain paper/print optimized.

## Cleaner locked-state utility behavior

- Electron IPC wrapper prefixes are normalized at the preload boundary when the real error is the SafeLedger locked-state message.
- The user-facing message is exactly: `SafeLedger is locked. Please log in again.`
- Home, Activity History, Settings, and Global Search are guarded before their privileged handlers run while SafeLedger is locked.
- Home reloads the canonical SafeLedger login screen through the existing trusted `init-system` flow.
- Activity History, Settings, and Global Search show the clean locked-state message instead of invoking protected operations.

## Chain Games standard starter

- Chain Games is added to the preselected Standard setup for a new Profile and to SafeLedger's default starter inventory for a newly initialized vault.
- It is created as a **Web3 Account**, not as a generic software/hardware wallet.
- SafeLedger reuses its existing reviewed Chain Games asset preset rather than introducing duplicate data:
  - CHAIN on Ethereum
  - CHAIN on Polygon
  - native CHAIN on Chain Games Supernet
- Existing Network and Contract address identity metadata are preserved through the canonical asset-preset path.
- The New Profile picker uses SafeLedger's existing local/offline Chain Games artwork.
- No private recovery information is prefilled.

## Regression updates

Historical New Profile tests now preserve their original logo requirement for conventional wallet templates while permitting a deliberate reviewed service starter that uses SafeLedger-owned local artwork. New 2.6.42 coverage locks the QR dark-mode behavior, exact locked message, Home-to-Login behavior, protected top actions, Chain Games starter selection, Web3 category, and three reviewed CHAIN network entries.

## Security and compatibility invariants

No changes to:

- encrypted vault schema
- AES-256-GCM
- Argon2id
- DEK/session boundary
- SafeLedger 2.x compatibility
- SafeLedger 1.x read-only import
- backup/restore format
- Self-Destruct semantics
- Privacy Mode
- Recovery Intelligence secret handling
- portable-storage behavior
- offline/runtime network policy
