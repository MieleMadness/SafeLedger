# SafeLedger

SafeLedger is a **free, local-first, offline encrypted information vault** for organizing cryptocurrency recovery information. It stores Profiles, Vault Items, Assets, public addresses, recovery details, private keys, balances, notes, and related information in encrypted files that remain under your control.

Vault Items can represent cryptocurrency wallets, exchange accounts, or Web3 / website accounts. SafeLedger does not require a cloud account, subscription, license server, or network connection for normal vault operation.

## Release status

### Current stable release: SafeLedger 2.5.0

SafeLedger **2.5.0** is the version currently merged into protected `master`.

The current stable release includes the SafeLedger 2.1 continuity/security foundation, 2.2 runtime modernization, 2.3 device-security layer, 2.4 Recovery Intelligence & Validation, and 2.5 Distribution, Trust & Open Source Readiness work.

### Current development preview: SafeLedger 2.5.19

SafeLedger **2.5.19** is the current development line. It builds on the 2.5.0 security and distribution foundation with the newer Vault Item workflow, local Web3 icon catalog, profile setup improvements, Vault Overview refinements, reviewed asset presets, and UI/accessibility cleanup.

Development changes since the original 2.5 release include:

- User-facing hierarchy expanded to **Profile → Vault Item → Asset**
- Vault Items can represent **Wallets**, **Exchange Accounts**, and **Web3 / Website Accounts**
- Full local Web3Icons preparation for tokens, networks, wallets, and exchanges
- Icon-backed New Profile wallet picker with responsive layout and real local brand artwork only
- Nine Standard starter wallets with reviewed starter configuration
- Reviewed wallet, exchange, and service asset presets that preload only assets with matching local artwork
- Newly saved wallet presets immediately render their seeded asset icons without requiring a second click
- Vault Overview inventory counts for wallets, exchanges, services, and total Vault Items
- Vault Overview maintenance snapshot, stale-information awareness, recovery coverage, recently verified items, and direct row navigation
- Profile Notes stored with the encrypted profile metadata and available to print/recovery workflows
- Recovery Binder dark-mode improvements and optional local QR-code printing for QR-capable values
- Backup reminder choices simplified to Off, 3 months, 6 months, or 12 months, with 3 months as the default
- Explicit Cancel actions for New Profile, Add Vault Item, and Add Asset workflows
- Consistent local eye, copy, QR, fallback-wallet, and Change Password artwork
- Improved sensitive-field reveal controls, QR caption contrast, password-control alignment, and consistent focus/hover treatment
- Alphabetized exchange and Web3/service preset choices
- Local fallback artwork for Vault Items without a recognized brand logo
- FIO Protocol support added to reviewed Ledger and MetaMask catalogs and to the FIO App service preset

The development line remains local-first and offline. The icon catalog is prepared into local data URLs at build time; SafeLedger does not fetch wallet, exchange, token, or network artwork from the internet while the vault is running.

Key stable capabilities include:

- Portable `SafeLedgerData` storage beside the packaged application
- AES-256-GCM authenticated vault encryption
- Argon2id master-password protection
- Random 256-bit Data Encryption Key (DEK) protected by a key envelope
- Main-process-only DEK handling
- Versioned vault `schemaVersion` support
- Read-only SafeLedger 1.x import into current encrypted vaults
- Complete backup format v3 with SHA-256 integrity manifests
- Version-2 complete-backup restore compatibility
- Non-destructive **Verify Backup**
- Staged restore with a pre-restore safety copy
- Brute-force lockout protection
- Self-Destruct Protection disabled by default for new settings
- Hardened Electron sandbox / IPC boundaries
- Explicit preload/renderer bridge with no renderer-side Electron compatibility shim
- SafeLedger-owned CSS Grid/Flexbox application shell
- Host operating-system locale/timezone for displayed timestamps
- Global Search, Vault Overview, Activity History, recovery sheets, custom fields, and wallet metadata
- Centralized main-process locking for Emergency Lock and device-security events
- OS lock, suspend/resume, idle-state, and portable-storage session protection where supported
- Sanitized Storage Health and backup-age awareness
- Explainable Wallet-level **Recovery Health** scoring
- Guided, non-destructive **Test Recovery** workflow
- Offline BIP39 mnemonic validation using the official English word list
- Offline Bitcoin Base58Check, Bech32, and Bech32m validation
- Offline Ethereum/EVM format and EIP-55 checksum validation
- Privacy-preserving duplicate recovery-data detection
- Session-only keyed fingerprints for sensitive duplicate checks, cleared on lock
- **Privacy Mode**, enabled by default, for masked sensitive information
- Sanitized Recovery Intelligence output that does not expose seeds, private keys, raw fingerprints, recovery locations, or backup paths
- Emergency Lock that clears the active encryption session, minimizes SafeLedger, resets the renderer, and returns to a fresh login state
- Protected-branch release workflow with required Windows and Linux validation
- Tag/version/source-ancestry release preflight
- SHA-256 release checksums with self-verification
- CycloneDX SBOM generation from the committed dependency graph
- Machine-readable release manifest with source commit and artifact hashes
- GitHub artifact provenance/attestation support for official binaries
- Optional isolated Windows Authenticode signing path
- Full Apache 2.0 license, NOTICE, third-party attribution, contributor, and security documentation
- User-facing official-download verification guidance in `RELEASE-VERIFICATION.md`

> [!IMPORTANT]
> SafeLedger **2.6** is the next planned major/minor release and is intentionally scoped to **macOS Apple Silicon (`arm64`) only**. Intel/x64 Macs, universal binaries, and Rosetta compatibility are not 2.6 targets.

## Release roadmap

### SafeLedger 2.1 — Continuity & Hardening

Released foundation covering authenticated encryption continuity, versioned vault schemas, read-only 1.x import, backup verification, hardened Electron boundaries, and safer restore behavior.

### SafeLedger 2.2 — Runtime Modernization

Released modernization covering the explicit renderer/preload bridge, removal of the renderer Electron compatibility shim, SafeLedger-owned native layout/styles/icons, Profile → Wallet → Asset terminology, and host-local time display.

### SafeLedger 2.3 — Device Security & Recovery Health

Released as **2.3.0**.

Included:

- One centralized main-process session-lock path
- OS lock and suspend/resume protection where supported
- Removable-storage / `SafeLedgerData` availability monitoring
- Local random storage identity checks
- Sanitized Storage Health reporting
- Backup-age and verification-age awareness
- Generic privacy-safe device-security activity events
- Dashboard and Settings health presentation

Storage removal, suspend, resume, OS-lock, or idle-state handling **locks only**. These events never trigger Self-Destruct.

### SafeLedger 2.4 — Recovery Intelligence & Validation

Released as **2.4.0**.

Included:

- Explainable Wallet-level Recovery Health scoring
- Verified-backup context in recovery readiness
- Guided non-destructive Test Recovery
- Optional ephemeral BIP39 validation
- Offline Bitcoin and EVM address-format/checksum validation
- Public recovery-metadata duplicate detection
- Session-only keyed sensitive duplicate detection
- Privacy Mode enabled by default
- Sanitized Recovery Intelligence Dashboard
- Dedicated privacy, sandbox, validation, and duplicate-detection regression gates

Recovery-intelligence features remain offline. Seeds, private keys, passwords, PINs, raw duplicate fingerprints, recovery locations, and backup paths are not returned by Recovery Intelligence or sent to external APIs.

### SafeLedger 2.5 — Distribution, Trust & Open Source Readiness

Released as **2.5.0**.

Included:

- Tag-only, fail-closed official GitHub Release publishing
- Exact tag/package-version and protected-`master` source validation
- Required Windows and Linux release validation
- Least-privilege release workflow permissions
- Full-SHA pinning for release-critical and normal CI GitHub Actions
- Windows Portable EXE and Linux AppImage artifact contract
- SHA-256 checksums and self-verification
- CycloneDX SBOM generation and live regression coverage
- Machine-readable release manifest
- GitHub artifact attestations / build provenance
- Windows Authenticode signing-ready architecture with credentials isolated to the signing step
- Normalized 2.5 dependency lock matching the current application graph
- Complete Apache 2.0 licensing, NOTICE, and third-party attribution
- Contributor, security, collaboration, PR, and issue documentation
- Official-download verification instructions
- Dedicated distribution-trust regression suite and fail-closed release gates

2.5 does not change the vault crypto format, Argon2id behavior, backup compatibility, portable data layout, device locking, Recovery Intelligence, or local-first/offline operating model.

### SafeLedger 2.5.x — Vault Item & Interface Development

The post-2.5 development line adds the broader Vault Item model and related usability work while preserving the 2.5 encryption and storage foundation.

Highlights include the full local Web3 icon catalog, logo-backed Profile setup, exchange and Web3/service Vault Items, reviewed icon-backed asset seeding, the revised Vault Overview, Profile Notes, Recovery Binder QR support, improved local action icons, clearer Settings ordering, and the 2.5.18 post-save asset-icon refresh fix.

### SafeLedger 2.6 — macOS Apple Silicon Distribution & Platform Hardening

**Planned target.** SafeLedger 2.6 is intentionally macOS **arm64-only**.

Planned focus includes Apple Silicon packaging, Developer ID signing, notarization/stapling, Gatekeeper validation, macOS lock/sleep/resume behavior, removable-storage handling, and preserving `SafeLedgerData` beside the application. Intel/x64, universal binaries, and Rosetta compatibility are explicitly out of scope.

## How SafeLedger is organized

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

### Profile

A Profile is the top-level container. Profiles can separate people, purposes, businesses, storage strategies, or other recovery groupings. Each Profile has its own encrypted vault file.

Profiles can also store encrypted Notes to document information that applies to the Profile as a whole.

### Vault Item

A Vault Item represents something a user may need to recover, regain access to, or document. A Vault Item can be a cryptocurrency wallet, an exchange account, or a Web3 / website account.

Common Vault Item information includes:

- Name and category
- Tags and notes
- Recovery link or recovery instructions
- Recovery / backup-code location
- Backup or exported-data location
- Custom fields
- Recovery verification and Test Recovery timestamps
- Assets associated with the item when applicable

### Wallet

Wallet Vault Items can additionally store information such as:

- Hardware/software/other wallet category
- Manufacturer and model where applicable
- Password
- PIN code
- Seed phrase
- Recovery format and recovery storage mode
- Device location
- Passphrase-use notes
- Public addresses and assets

SafeLedger does not require a seed phrase or private key to be stored. Decide which secrets you are comfortable keeping digitally.

### Exchange Account

Exchange Account Vault Items can store account-oriented information such as login email/username, customer/account ID, verified website, login method, 2FA method, 2FA backup codes, KYC/identity notes, recovery information, and tracked assets.

Known exchange choices use the local exchange-logo catalog. A smaller reviewed set also receives starter assets after creation; SafeLedger never guesses unsupported assets simply because an exchange has a logo.

### Web3 / Website Account

Web3 / Website Account Vault Items can store login information, verified website, connected wallet names, profile/account ID, 2FA information, backup codes, recovery notes, and optional tracked assets.

These service presets intentionally do **not** auto-fill login URLs. Verify a website yourself before saving it.

### Asset

Assets can store information such as:

- Name and symbol
- Public address
- Tags
- Balance
- Private key, when you choose to store one
- Notes
- Custom fields

When a reviewed wallet, exchange, or service preset is created, SafeLedger may preload known assets. Preloading is filtered through the local icon catalog so unsupported/unknown artwork is not silently inserted into the new item.

## Portable data layout

For packaged builds, SafeLedger creates and uses `SafeLedgerData` in the same folder as the SafeLedger application you launch.

### Windows portable example

```text
D:\My SafeLedger\
├─ SafeLedger-2.5.0-Portable.exe
└─ SafeLedgerData\
   ├─ settings\
   └─ vaults\
```

### Linux AppImage example

```text
/home/user/Apps/SafeLedger/
├─ SafeLedger-2.5.0-x86_64.AppImage
└─ SafeLedgerData/
   ├─ settings/
   └─ vaults/
```

Keep the application and its complete `SafeLedgerData` folder together. This allows SafeLedger to run from a local folder or removable drive without a license or cloud account.

When moving SafeLedger, close the application first and move **both** the application and `SafeLedgerData`. Do not manually merge different data folders; use SafeLedger Backup, Restore, or the 1.x importer when appropriate.

`SafeLedgerData/storage-id.json` contains a random non-secret local storage marker used to detect storage changes during unlocked sessions. Device-local storage identity is not carried inside backups; a valid restore establishes a fresh local identity.

## Encryption and desktop security

SafeLedger 2.x uses **AES-256-GCM** authenticated encryption with the `SLG2` encrypted payload format. The master password protects a random 256-bit DEK through an **Argon2id** key envelope. Changing the master password re-wraps the DEK instead of re-encrypting every vault solely because the password changed.

The raw DEK remains in the trusted main process and is not exposed to the renderer.

The Electron renderer uses:

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- restrictive Content Security Policy
- denied unexpected navigation/new windows
- denied renderer permission requests
- no direct renderer filesystem or Node access

SafeLedger routes non-password device locks through one centralized main-process controller. The DEK is cleared before window/minimize/reload operations, and repeated lock signals do not recreate an unlocked session.

## Recovery Intelligence and Privacy Mode

SafeLedger 2.4 adds local-only recovery analysis without turning the application into a blockchain client or cloud service.

Recovery Health evaluates documented recovery method/location, instructions, public-address coverage where applicable, verification age, Test Recovery age, and verified-backup context. Results are designed to be actionable without returning secret values.

The Test Recovery workflow can optionally validate a BIP39 mnemonic locally. The temporary mnemonic input is cleared after validation and is not written to disk, Activity History, clipboard, or a network service.

Privacy Mode defaults to enabled. Sensitive fields remain masked/collapsed until deliberately revealed, and sensitive Copy/QR shortcuts stay hidden until reveal where applicable.

Duplicate detection uses public metadata directly only for sanitized matching. Sensitive seed/private-key duplicate checks use session-local keyed fingerprints that are discarded when SafeLedger locks and are never persisted as reusable hashes.

## SafeLedger 1.x import

SafeLedger 2.1+ can import original SafeLedger 1.x data through an isolated, read-only migration path.

Open:

**SafeLedger → Settings → Import SafeLedger 1.x Data**

The importer reads the original encrypted data, authenticates it with the supplied 1.x master password, creates new current-format encrypted Profile files, and leaves the original 1.x files unchanged.

Keep an untouched backup of the original 1.x data even after a successful import.

## Backup, Verify, and Restore

Open:

**SafeLedger → Settings → Backup & Recovery**

### Backup

SafeLedger creates a `.slgbak` file containing a complete encrypted backup of the current SafeLedger data set. Backup format v3 includes a SHA-256 integrity digest for every included file.

Store backups separately from the working SafeLedger folder so a single drive failure does not destroy both the live vault and its backup.

SafeLedger records successful backup timestamps for backup-age awareness. The selected backup path is not persisted in Settings.

### Verify Backup

**Verify Backup** checks a backup without modifying active SafeLedger data. Verification includes backup structure, safe paths, integrity hashes, key-envelope structure, encrypted vault authentication, and Profile/Vault Item/Asset counts.

SafeLedger records the verification timestamp and verified backup creation timestamp without persisting the backup path.

### Restore

SafeLedger supports current version-3 complete backups and retains version-2 restore compatibility. Before replacing active data, SafeLedger creates a pre-restore safety copy. A successful restore clears the active session and reloads SafeLedger.

## Emergency Lock and automatic lock

The SafeLedger shield button in the bottom-right provides **Emergency Lock**. It clears visible sensitive state, clears the active DEK/session, records a generic security event when storage is available, minimizes SafeLedger, reloads the renderer from the trusted main process, and returns to a fresh login state.

SafeLedger can also lock an unlocked session when the operating system locks or suspends, on resume as a fail-safe, when supported idle-state signals indicate locking, or when expected portable storage becomes unavailable or changes identity. These paths never auto-unlock and never count as failed-password Self-Destruct attempts.

## Brute Force and Self-Destruct Protection

SafeLedger tracks failed login attempts and can temporarily lock login after too many failures.

Self-Destruct Protection is **off by default for new settings**. Existing settings that explicitly enabled it remain enabled.

> [!CAUTION]
> Self-Destruct Protection is intentionally destructive. Keep verified backups before enabling it.

Storage removal, system sleep, OS locking, Emergency Lock, and other device-security events are separate from password-failure Self-Destruct behavior and must never be treated as failed password attempts.

## Clipboard, QR, printing, and activity history

Sensitive Copy actions automatically clear the clipboard after a short period when the clipboard still contains the copied SafeLedger value.

QR generation, recovery-sheet generation, and optional Recovery Binder QR generation are local and do not require online services.

SafeLedger maintains a local `audit.log` under `SafeLedgerData/settings`. Activity entries contain generic event types and timestamps rather than passwords, seed phrases, private keys, wallet names, storage identifiers, recovery locations, or backup paths.

## Official release verification

Official SafeLedger releases include `SHA256SUMS.txt`, `release-manifest.json`, a CycloneDX SBOM, legal/attribution files, and `RELEASE-VERIFICATION.md` alongside the platform binaries. The release workflow verifies checksums before publication and publishes only after its required build/provenance chain succeeds.

Checksums prove that a downloaded file matches the published digest. They are not a guarantee that software contains no vulnerabilities. Windows Authenticode signing is reported separately from checksum/provenance status.

## Development

Install locked dependencies:

```bash
npm ci --no-audit --no-fund
```

Start SafeLedger:

```bash
npm start
```

Run the full regression suite:

```bash
npm run test:regression
```

Run device-security regressions:

```bash
npm run test:device-security
```

Run Recovery Intelligence regressions:

```bash
npm run test:recovery-intelligence
```

Run the Electron crypto smoke test:

```bash
npm run test:electron-crypto
```

Run the real GUI smoke test:

```bash
npm run test:gui-smoke
```

Build Windows portable:

```bash
npm run dist:win
```

Build Linux AppImage:

```bash
npm run dist:linux
```

Release changes are expected to pass regression, crypto, GUI, SBOM, distribution-trust, and packaging checks before implementation is considered releasable.

## Release documents

- `RELEASE-2.1.md` — Continuity & Hardening
- `RELEASE-2.2.md` — Runtime Modernization
- `RELEASE-2.3.md` — Device Security & Recovery Health
- `RELEASE-2.4.md` — released Recovery Intelligence & Validation
- `RELEASE-2.5.md` — released Distribution, Trust & Open Source Readiness
- `RELEASE-VERIFICATION.md` — official download verification guidance

The SafeLedger 2.6 macOS Apple Silicon plan is maintained on its development branch until that release work is ready to move onto `master`.

## Icon and preset catalog

SafeLedger 2.5.19 development uses `@web3icons/core` **4.0.55** as its pinned local icon source. `npm start`, tests, and distribution builds generate a SafeLedger-owned local manifest before the renderer is bundled. The preparation step requires at least **1,000 token icons**, at least **100 network icons**, at least **30 wallet icons**, and at least **20 exchange icons** before a build is accepted.

All prepared artwork is stored as local data URLs for runtime use. Icon lookup does not require a network connection.

### Standard starter wallets

A new Standard Profile preselects the following logo-backed wallet templates:

- Ledger
- Trezor
- MetaMask
- Trust Wallet
- Exodus
- Phantom
- Coinbase Wallet (catalog name: Base App / Coinbase Wallet)
- Backpack
- Kraken Wallet

These are a starter set, not a limit on what SafeLedger can store.

### Wallet brand icons

The local wallet-logo catalog supports the following wallet brands in the icon-backed picker. Some are SafeLedger-reviewed wallet templates with starter assets; others are logo-only choices and begin empty so SafeLedger does not guess their supported networks.

<details>
<summary>Show wallet brand icon list</summary>

- alfa1
- Alpha Wallet
- Ambire
- Argent X
- Atomic
- Backpack
- Bitbox
- Blue Wallet
- Clave
- Coin98
- Coinbase Wallet
- Cypherock
- Daimo Pay
- Enkrypt
- Exodus
- Glow
- imToken
- Keplr
- Kraken Wallet
- Kukai
- Ledger
- Lit Protocol
- MetaMask
- Multis
- MyEtherWallet
- Obvious Wallet
- OKX Wallet
- Pecunity
- Phantom
- Pillar
- Portal
- Rabby
- Rainbow
- Ronin
- Safe Wallet
- Sender
- Sequence
- Solflare
- Soul
- Squads
- Temple
- Token Pocket
- Trezor
- Trust Wallet
- UniPass
- Venly
- Wallet3
- WalletConnect
- XDEFI
- ZenGo
- Zerion

</details>

SafeLedger also maintains reviewed support templates for wallets such as Ledger, Trezor, Tangem, Keystone, OneKey, BitBox02 Multi, COLDCARD, SafePal, MetaMask, Trust Wallet, Exodus, Phantom, Base App / Coinbase Wallet, Rabby Wallet, Electrum, Kraken Wallet, and Backpack. A reviewed template is shown in logo-backed selectors only when local brand artwork resolves successfully.

Unknown or manually named wallets remain usable and receive a local SafeLedger fallback wallet icon rather than a broken image.

### Exchange brand icons

Exchange Accounts use the local exchange-logo catalog. The current catalog includes:

<details>
<summary>Show exchange brand icon list</summary>

- 1inch
- Aevo
- Balancer
- Bancor
- Binance
- Bitget
- Bithumb
- Bitstamp
- BTC Turk
- Bybit
- Coinbase
- CoinEx
- Cow Swap
- Crypto.com
- Gate Io
- Gemini
- Hyperliquid
- Kraken
- Kucoin
- Odos
- OKX
- Pancake Swap
- Paradex
- ParaSwap
- Paribu
- Robinhood
- Sushi Swap
- SwissBorg
- Uniswap
- UpBit

</details>

The Exchange Account preset chooser is generated from the complete local exchange icon catalog and is alphabetized. SafeLedger currently maintains reviewed starter-asset presets for **Coinbase, Kraken, Binance, Gemini, and Crypto.com**. Other exchange-logo choices begin without guessed assets.

### Asset and network icons

SafeLedger prepares the complete token and network artwork included in the pinned Web3Icons package—at least **1,000 token icons** and **100 network icons**. This is intentionally much larger than the reviewed starter-asset catalog, because users can manually add assets that are not part of a wallet's default template.

Common icon-backed assets and networks used by SafeLedger's reviewed wallet/exchange/service catalogs include:

- Aave (`AAVE`)
- Algorand (`ALGO`)
- Aptos (`APT`)
- Arbitrum (`ARB`)
- Avalanche (`AVAX`)
- Base (`BASE`)
- BNB / BNB Smart Chain (`BNB`)
- Bitcoin (`BTC`)
- Bitcoin Cash (`BCH`)
- Cardano (`ADA`)
- Chainlink (`LINK`)
- Cosmos Hub (`ATOM`)
- Cronos (`CRO`)
- Dogecoin (`DOGE`)
- Ethereum (`ETH`)
- Ethereum Classic (`ETC`)
- FIO Protocol (`FIO`)
- Filecoin (`FIL`)
- Flare (`FLR`)
- Litecoin (`LTC`)
- Monero (`XMR`)
- NEAR Protocol (`NEAR`)
- Optimism (`OP`)
- Polkadot (`DOT`)
- Polygon (`POL`)
- Solana (`SOL`)
- Stellar (`XLM`)
- Sui (`SUI`)
- Tether (`USDT`)
- Tezos (`XTZ`)
- TON (`TON`)
- TRON (`TRX`)
- USD Coin (`USDC`)
- VeChain (`VET`)
- XRP Ledger (`XRP`)
- Zcash (`ZEC`)
- zkSync Era (`ZK`)

SafeLedger also recognizes reviewed token/network families such as **ERC-20**, **EVM**, **BEP-20**, **SPL**, **TRC-20**, and **Cardano Native Tokens** where the relevant wallet catalog uses them.

The full token catalog contains well over a thousand generated entries, so it is not duplicated as a thousand-line static README list. SafeLedger's build-generated local manifest is the source of truth for exact token/network artwork in a particular build. This prevents the documentation from claiming an icon that was removed or renamed in a future pinned dependency update.

### Reviewed automatic asset preloading

Automatic preloading is deliberately more conservative than icon coverage. SafeLedger only inserts reviewed starter assets for a recognized platform, and then filters those rows through the local icon resolver.

Examples:

- **Coinbase Wallet** preloads icon-backed reviewed networks/assets such as Bitcoin, Ethereum, Solana, Base, Arbitrum, Avalanche, BNB Chain, Optimism, Polygon, and the EVM token family.
- **Ledger** includes a broad reviewed multi-chain starter set and FIO Protocol support.
- **MetaMask** includes reviewed EVM/multi-network entries plus FIO Protocol support.
- **Kraken Wallet** and **Backpack** include reviewed supported network starter sets.
- **Coinbase, Kraken, Binance, Gemini, and Crypto.com Exchange Accounts** receive reviewed starter-asset sets.
- **FIO App** preloads FIO Protocol (`FIO`).

Availability can change by region, account, wallet model, network, or upstream platform update. The source URL used for reviewed starter data is retained in the generated record notes so the catalog can be audited later.

### Web3 / website account presets

SafeLedger currently offers these known Web3 / website account choices:

- Aave
- CoinGecko
- CoinTracker
- Etherscan
- FIO App
- Koinly
- Lido
- OpenSea
- Solscan
- Uniswap

These account/service Vault Items currently use a **generic local service icon** in the Vault Item list rather than implying that every website preset has a dedicated SafeLedger brand logo. FIO App is currently the service preset with a reviewed automatic asset (`FIO`).

## Recommended operating practices

- Keep the SafeLedger application and `SafeLedgerData` together.
- Use the built-in `.slgbak` Backup function regularly.
- Use **Verify Backup** after creating important backups.
- Keep at least one backup on a separate device or location.
- Preserve original SafeLedger 1.x files after migration.
- Use a long, unique master password or passphrase.
- Treat seed phrases and private keys as highly sensitive secrets.
- Use full-disk encryption on the computer or removable drive containing SafeLedger.
- Use Emergency Lock when stepping away.
- Keep Self-Destruct disabled unless its destructive behavior is specifically required and understood.

## What SafeLedger is not

SafeLedger is an encrypted information organizer. It is not a cryptocurrency exchange, blockchain node, hardware wallet, or transaction-signing device.

Storing a seed phrase or private key in any software creates risk. Maintain appropriate offline recovery backups for critical assets.

## License

SafeLedger is licensed under the Apache License 2.0. See `LICENSE` for the complete license text, `NOTICE` for SafeLedger attribution/history, and `THIRD-PARTY-NOTICES.md` for third-party attribution information.
