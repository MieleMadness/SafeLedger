# SafeLedger 2.6 — Vault Item Experience & Local Web3 Catalog

## Release status

**Release: 2.6.0**

SafeLedger 2.6 promotes the post-2.5 development work into the next stable source release. It preserves the local-first encryption, backup, recovery, and portable-storage foundation while expanding the user-facing model from wallets alone to the broader **Profile → Vault Item → Asset** workflow.

## Release thesis

SafeLedger 2.6 makes the application easier to organize and use without weakening the security boundary established in earlier releases.

The main product model is now:

```text
Profile
└─ Vault Item
   ├─ Wallet
   │  └─ Asset
   ├─ Exchange Account
   │  └─ Asset
   └─ Web3 / Website Account
      └─ Asset (optional)
```

## Included in 2.6.0

### Vault Item workflow

- Wallets, Exchange Accounts, and Web3 / Website Accounts are represented consistently as Vault Items.
- Add, edit, cancel, navigation, empty-state, Global Search, and Vault Overview language is aligned with the Vault Item model.
- Exchange and Web3/service presets remain conservative and do not auto-fill unverified login URLs.

### Local wallet, exchange, token, and network artwork

SafeLedger prepares the pinned Web3Icons catalog into local data URLs before the renderer is bundled.

The build requires at least:

- 1,000 token icons
- 100 network icons
- 30 wallet icons
- 20 exchange icons

Runtime icon lookup remains local and does not require a network connection.

### Profile setup and wallet templates

- New Profile setup includes a responsive logo-backed wallet picker.
- Standard setup preselects nine reviewed starter wallets: Ledger, Trezor, MetaMask, Trust Wallet, Exodus, Phantom, Coinbase Wallet, Backpack, and Kraken Wallet.
- Logo-only wallet choices remain available without guessed starter assets.
- Unknown/manual wallet names use a local SafeLedger fallback icon instead of a broken image.

### Reviewed asset presets

- Reviewed wallets, exchanges, and services can preload known assets and networks.
- Preloaded entries are filtered through the local icon resolver.
- Reviewed exchange starter sets include Coinbase, Kraken, Binance, Gemini, and Crypto.com.
- FIO Protocol support is included in the reviewed Ledger and MetaMask catalogs and in the FIO App service preset.
- Newly created wallet presets render their seeded asset icons immediately after Save without requiring a second click.

### Vault Overview and maintenance visibility

- Vault Overview counts wallets, exchanges, services, and total Vault Items.
- Recovery Needs Attention and Recently Verified rows navigate directly to the relevant Vault Item.
- Maintenance Snapshot adds stale-information awareness, recovery coverage, and last-maintenance context.

### Profile and recovery usability

- Profiles can store encrypted Notes.
- Recovery Binder presentation is improved in dark mode.
- Optional local QR-code printing is available for QR-capable Recovery Binder values.
- Backup reminder choices are Off, 3 months, 6 months, or 12 months, with 3 months as the default.

### Interface consistency

- Explicit Cancel actions are available for New Profile, Add Vault Item, and Add Asset workflows.
- Password, sensitive-field, copy, QR, and fallback-wallet controls use local SafeLedger artwork.
- Focus and hover behavior is standardized across actions.
- Exchange and Web3/service preset choices are alphabetized.
- Password visibility controls and QR caption contrast were refined.

## Security and compatibility preserved

SafeLedger 2.6 does not intentionally change the cryptographic or backup formats introduced in earlier releases. The following remain core invariants:

- AES-256-GCM authenticated vault encryption
- Argon2id master-password/key-envelope protection
- main-process-only Data Encryption Key handling
- SafeLedger 2.x encrypted vault compatibility
- read-only SafeLedger 1.x import behavior
- backup format v3 generation
- backup format v2 restore compatibility
- portable `SafeLedgerData` behavior
- centralized Emergency/OS/storage session locking
- Privacy Mode and Recovery Intelligence privacy boundaries
- offline BIP39/address validation
- separation of Self-Destruct behavior from ordinary device/security lock events
- no required runtime cloud account, blockchain API, telemetry service, or license server

## Supported release platforms

SafeLedger 2.6.0 continues the currently implemented release targets:

- Windows x64 Portable EXE
- Linux x64 AppImage

The previously proposed macOS Apple Silicon scope is **not represented as shipped support in 2.6.0**. macOS packaging, Developer ID signing/notarization, Gatekeeper validation, and macOS-specific runtime testing remain future work until they are implemented and validated.

## Release acceptance

Before treating a 2.6.0 build as an official downloadable binary release, the exact release head should pass the repository's regression, crypto, GUI, device-security, Recovery Intelligence, distribution-trust, and platform packaging checks.

This document describes the 2.6.0 source release promoted to `master`; it does not by itself prove that an external binary artifact has passed every platform-specific validation gate.
