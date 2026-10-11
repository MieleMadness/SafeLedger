# SafeLedger 2.6.46 workflow/test candidate

SafeLedger 2.6.46 carries forward the 2.6.42 runtime feature implementation unchanged and corrects the remaining historical 2.5.17 starter-template regression exposed by CI.

## Runtime carried forward unchanged

- Dark-mode QR presentation is softened while preserving scan contrast and the encoded QR payload.
- Locked remote-call errors surface only: `SafeLedger is locked. Please log in again.`
- While locked, Home restores the canonical Login screen; Activity History, Settings, and Global Search do not invoke protected reads.
- Chain Games is included in the preselected Standard new-Profile starter set.
- Chain Games uses SafeLedger-owned local service artwork and the existing reviewed Web3 CHAIN preset for Ethereum, Polygon, and Chain Games Supernet.
- No private recovery information is prefilled.

## 2.6.46 regression correction

The historical 2.5.17 test previously assumed every starter template must be a conventional wallet with Web3Icons wallet/exchange artwork. That assumption is no longer correct because Chain Games is deliberately a reviewed Web3 service starter.

The updated gate now preserves the stricter distinction:

- Conventional wallet templates must remain logo-backed by the local Web3Icons wallet/exchange catalog.
- Reviewed service starters may use SafeLedger-owned local service artwork.
- Chain Games must remain outside the Hardware Wallet, Software Wallet, and Other Wallet preset dropdowns.
- Chain Games must retain its reviewed Web3 asset/network preset.

2.5.18 and 2.5.19 historical gates were reviewed and do not repeat this obsolete assumption.

## Security / compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, SafeLedger 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network policy changes.

## Workflow rule

This is a **2.6.x workflow/test candidate**. **DO NOT MERGE TO `master`.** Keep this candidate unmerged for CI and hands-on validation.
