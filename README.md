# SafeLedger

SafeLedger is a **free, local-first, offline encrypted information vault** for organizing cryptocurrency recovery information and account-recovery details. It stores Profiles, Vault Items, Assets, public addresses, recovery details, private keys, balances, passwords, notes, and related information in encrypted files that remain under your control.

Vault Items can represent cryptocurrency wallets, exchange accounts, Web3 accounts, or ordinary website accounts. SafeLedger does not require a cloud account, subscription, license server, or network connection for normal vault operation.

## Start here: user guide and technical manual

**[Read the current SafeLedger User Guide & Technical Field Manual](docs/USER_GUIDE.md).** The Windows portable download includes its PDF version as `README.pdf`. The guide contains step-by-step procedures for setting up, using, backing up, verifying, restoring and securely moving the vault, with deeper explanations of Argon2id, AES-GCM, main-process key custody, offline validations, lockout accounting, transaction recovery and portable storage.

### Version status - do not confuse development with a release

- **`master` package version checked on 12 October 2026: 2.6.10.** This describes the source branch; it does not claim that a separately signed GitHub Release has been published.
- **Current stacked development functionality: through 2.6.119.** This work is kept in unmerged development PRs until explicitly approved. It includes significant security, recovery, and reliability changes not present in the older `master` line.
- **2.6.120: documentation refresh.** The manual and bundled PDF source have been updated; this docs-only revision does not imply a new encryption format or changed runtime functionality.
- **Check your actual application version** before following instructions for a newer development feature. A newer manual cannot add features to an older executable.

### Quick start

1. Place the Windows EXE, Linux AppImage, or macOS Apple Silicon app in a **writable folder**; SafeLedger uses an adjacent `SafeLedgerData` directory. Keep the application and data together.
2. Create a long, unique master password and retain it through your approved offline recovery method.
3. Make a test **Profile**, then add a **Vault Item** (Wallet, Exchange Account, Web3 Account or Website Account). Add an **Asset** only if appropriate.
4. Review privacy masking, recovery notes, custom fields, offline icon catalogs and Recovery Intelligence.
5. Open **Settings → Backup & Recovery**, create a full `.slgbak` backup on **separate storage**, and use **Verify Backup**. Verify that your master password can actually unlock it.
6. Practice **Emergency Lock** and a **non-destructive Test Recovery** with disposable data before entering real secrets.

### What's new in development since the older master branch

- **Offline service graphics and clearer account models:** Local website/service brand marks, independent Web3 Account and Website Account presets, local wallet/token/network icon catalogs, Colorful/Light/Dark appearance choices.
- **Login security:** Main-process ownership of wrong-password accounting, serialized login attempts, controlled lockouts, and a blocked password-change verification path while locked (2.6.116).
- **Profile and record integrity:** Rejection of ambiguous/stale Wallet and Asset edits, recoverable Profile deletion, and improved atomic-write durability (2.6.117).
- **Smaller and safer app communication:** Per-request IPC responses, narrow mutation commands, and real cross-theme GUI layout tests (2.6.118).
- **Recovery and concurrency:** More conservative Profile-creation recovery, shared main-process storage operation ordering across backup/restore/import and ordinary writes, and complete Settings/startup IPC cleanup (2.6.119).
- **Self-Destruct accuracy:** Attempts to overwrite/delete encrypted files are **not guarantees of physical erasure** on SSDs, removable drives, backups or snapshots. Self-Destruct is off by default for new settings and requires deliberate understanding.

See `RELEASE-2.6.115.md` through `RELEASE-2.6.119.md` for the detailed patch history; the earlier release notes remain preserved in this repository.

### Supported platforms and distribution limitations

- Windows **x64 Portable EXE**
- Linux **x64 AppImage**
- macOS **Apple Silicon arm64** ZIP containing `.app` (unsigned and not Apple-notarized in the current CI distribution)

The normal vault works **offline**. The local-first design does not create a cloud account, fetch crypto prices, synchronize keys or use an online icon service.

## How SafeLedger is organized

```text
Profile
└─ Vault Item
   ├─ Wallet
   │  └─ Asset
   ├─ Exchange Account
   │  └─ Asset
   ├─ Web3 Account
   │  └─ Asset (optional)
   └─ Website Account
      └─ Asset (optional)
```

### Profile

A Profile is the top-level container. Profiles can separate people, purposes, businesses, storage strategies, or other recovery groupings. Each Profile has its own encrypted vault file.

Profiles can also store encrypted Notes to document information that applies to the Profile as a whole.

### Vault Item

A Vault Item represents something a user may need to recover, regain access to, or document. A Vault Item can be a cryptocurrency wallet, an exchange account, a Web3 service, or an ordinary website account.

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

Known exchange choices use the local exchange-logo catalog. A smaller reviewed set also receives starter assets after creation; SafeLedger does not guess unsupported assets simply because an exchange has a logo.

### Web3 Account

Web3 Account Vault Items are intended for Web3 services where connected-wallet context or optional tracked assets may matter. They can store login information, verified website, connected wallet names, profile/account ID, 2FA information, backup codes, recovery notes, and optional assets.

Known Web3 choices are grouped and alphabetized by purpose. Chain Games appears under **Gaming**, while Aave/Lido/Uniswap appear under **DeFi**, FIO App under **Identity & Naming**, and OpenSea under **NFT**.

### Website Account

Website Account Vault Items are intended for ordinary password/account recovery records such as Facebook, Yahoo, GitHub, Amazon, Gmail, Netflix, and similar services. They can store login information, verified website, profile/account ID, 2FA information, backup codes, recovery notes, and other encrypted fields without adding Web3-only connected-wallet fields by default.

Known Website choices are grouped and alphabetized into Developer, Email, Entertainment, Finance & Crypto, Productivity & Cloud, Shopping & Payments, and Social & Community. Major known sites use local brand-style icons generated inside SafeLedger. Unknown websites use the generic local globe.

These presets intentionally do **not** auto-fill login URLs. Verify a website yourself before saving it.

### Asset

Assets can store information such as:

- Name and symbol
- **Network**
- **Contract address**
- Public address
- Tags
- Balance
- Private key, when you choose to store one
- Notes
- Additional custom fields

Network and Contract address use the existing encrypted custom-field-compatible structure, preserving SafeLedger 2.x compatibility without a vault schema migration.

When a reviewed wallet, exchange, or Web3 service preset is created, SafeLedger may preload known assets. Preloading is filtered through the local icon resolver so unsupported/unknown artwork is not silently inserted into the new item.

### Shit Coin Mode

Open **Settings → Asset Display** to enable Shit Coin Mode.

When enabled, an asset that has no recognized local token/network icon uses **💩** as its fallback icon. Recognized assets keep their normal icon. The setting does not decide whether an asset is legitimate or valuable; it is a display preference only and never changes the asset record itself.

## Portable data layout

For packaged builds, SafeLedger creates and uses `SafeLedgerData` beside the SafeLedger application you launch.

### Windows portable example

```text
D:\My SafeLedger\
├─ SafeLedger-<version>-Portable.exe
└─ SafeLedgerData\
   ├─ settings\
   └─ vaults\
```

### Linux AppImage example

```text
/home/user/Apps/SafeLedger/
├─ SafeLedger-<version>-x86_64.AppImage
└─ SafeLedgerData/
   ├─ settings/
   └─ vaults/
```

### macOS Apple Silicon example

```text
/Volumes/SafeLedger/
├─ SafeLedger.app
└─ SafeLedgerData/
   ├─ settings/
   └─ vaults/
```

On macOS, SafeLedger resolves the portable root to the folder containing `SafeLedger.app`; it does not intentionally store normal vault data inside the `.app` bundle or silently redirect it to `~/Library/Application Support`.

If macOS App Translocation is detected or the portable folder is not writable, SafeLedger fails closed before vault storage is initialized and instructs the user to move the complete SafeLedger folder to a normal writable location.

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

Recovery Intelligence performs local-only recovery analysis without turning the application into a blockchain client or cloud service.

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

## Build validation and release verification

The repository contains separate GitHub Actions workflows for the Windows Portable EXE, Linux AppImage, and macOS Apple Silicon arm64 ZIP. Pull requests targeting `master` run locked dependency installation, regression testing, Electron crypto smoke testing, GUI smoke testing, packaging, and platform-specific artifact checks.

The macOS workflow validates natively on Apple Silicon and verifies that the packaged executable is arm64. Signing identity auto-discovery is disabled until Apple Developer Program credentials are available.

The repository also contains checksum, SBOM, release-manifest, distribution-trust, and `RELEASE-VERIFICATION.md` tooling/documentation. There is currently **no automated GitHub Release publishing workflow in `.github/workflows`**, so source promotion to `master` should not be confused with automatic publication of a signed/tagged downloadable release.

Checksums prove that a downloaded file matches the published digest. They are not a guarantee that software contains no vulnerabilities. Code-signing status should be reported separately from checksum status.

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

Build the unsigned macOS Apple Silicon ZIP:

```bash
npm run dist:mac:arm64
```

Release changes are expected to pass regression, crypto, GUI, device-security, Recovery Intelligence, distribution-trust, and packaging checks before an official downloadable binary is considered validated.

## Release documents

For the **current step-by-step manual**, use [docs/USER_GUIDE.md](docs/USER_GUIDE.md); its Windows distribution PDF is `README.pdf`. For architecture and migration details, consult [RELEASE-2.6.119.md](RELEASE-2.6.119.md), [RELEASE-2.6.118.md](RELEASE-2.6.118.md), [RELEASE-2.6.117.md](RELEASE-2.6.117.md), and [RELEASE-2.6.116.md](RELEASE-2.6.116.md). Older feature history follows below.


- `RELEASE-2.1.md` — Continuity & Hardening
- `RELEASE-2.2.md` — Runtime Modernization
- `RELEASE-2.3.md` — Device Security & Recovery Health
- `RELEASE-2.4.md` — Recovery Intelligence & Validation
- `RELEASE-2.5.md` — Distribution, Trust & Open Source Readiness
- `RELEASE-2.6.md` — Vault Item Experience & Local Web3 Catalog
- `RELEASE-2.6.1.md` — macOS Apple Silicon Foundation
- `RELEASE-2.6.2.md` — Asset Identity, Chain Games & Known Website Icons
- `RELEASE-2.6.3.md` — Chain Games Save Hotfix
- `RELEASE-2.6.4.md` — Add Asset & Icon Usability Hotfix
- `RELEASE-2.6.5.md` — Account Types & Add Asset Reliability candidate
- `RELEASE-2.6.6.md` — Add Asset & Web3 Interaction Reliability
- `RELEASE-VERIFICATION.md` — download verification guidance

## Icon and preset catalog

SafeLedger 2.6.6 uses `@web3icons/core` **4.0.55** as its pinned local Web3 icon source. `npm start`, tests, and distribution builds generate a SafeLedger-owned local manifest before the renderer is bundled. The preparation step requires at least **1,000 token icons**, at least **100 network icons**, at least **30 wallet icons**, and at least **20 exchange icons** before a build is accepted.

All prepared artwork is stored as local data URLs for runtime use. Known website/service artwork is also generated locally. Icon lookup does not require a network connection.

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

The Exchange Account preset chooser is generated from the complete local exchange icon catalog and is alphabetized. SafeLedger maintains reviewed starter-asset presets for **Coinbase, Kraken, Binance, Gemini, and Crypto.com**. Other exchange-logo choices begin without guessed assets.

### Asset and network icons

SafeLedger prepares the complete token and network artwork included in the pinned Web3Icons package—at least **1,000 token icons** and **100 network icons**. This is intentionally much larger than the reviewed starter-asset catalog, because users can manually add assets that are not part of a wallet's default template.

Common icon-backed assets and networks used by SafeLedger's reviewed catalogs include:

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
- Chain Games (`CHAIN`)
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

The full token catalog contains well over a thousand generated entries, so it is not duplicated as a thousand-line static README list. SafeLedger's build-generated local manifest is the source of truth for exact token/network artwork in a particular build.

### Reviewed automatic asset preloading

Automatic preloading is deliberately more conservative than icon coverage. SafeLedger only inserts reviewed starter assets for a recognized platform, and then filters those rows through the local icon resolver.

Examples:

- **Coinbase Wallet** preloads icon-backed reviewed networks/assets such as Bitcoin, Ethereum, Solana, Base, Arbitrum, Avalanche, BNB Chain, Optimism, Polygon, and the EVM token family.
- **Ledger** includes a broad reviewed multi-chain starter set and FIO Protocol support.
- **MetaMask** includes reviewed EVM/multi-network entries plus FIO Protocol support.
- **Kraken Wallet** and **Backpack** include reviewed supported network starter sets.
- **Coinbase, Kraken, Binance, Gemini, and Crypto.com Exchange Accounts** receive reviewed starter-asset sets.
- **FIO App** preloads FIO Protocol (`FIO`).
- **Chain Games Web3 Account** preloads reviewed CHAIN entries for Ethereum, Polygon, and Chain Games Supernet, including Network and Contract address metadata where applicable.

Availability can change by region, account, wallet model, network, or upstream platform update. The source URL used for reviewed starter data is retained in generated record notes so the catalog can be audited later.

### Web3 Account presets

Web3 Account choices are grouped and alphabetized in the dropdown:

- **DeFi:** Aave, Lido, Uniswap
- **Gaming:** Chain Games
- **Identity & Naming:** FIO App
- **NFT:** OpenSea

### Website Account presets

Website Account choices are grouped and alphabetized in the dropdown:

- **Developer:** GitHub
- **Email:** Gmail, Outlook, Proton, Yahoo
- **Entertainment:** Netflix, Spotify, Steam, Twitch, YouTube
- **Finance & Crypto:** CoinGecko, CoinTracker, Etherscan, Koinly, Solscan
- **Productivity & Cloud:** Adobe, Apple, Dropbox, Google, Microsoft, Slack, Zoom
- **Shopping & Payments:** Amazon, eBay, PayPal
- **Social & Community:** Discord, Facebook, Instagram, LinkedIn, Reddit, TikTok, X / Twitter

Major known sites use a local SafeLedger-generated brand-style icon. Unknown/manual websites continue to use the generic globe. SafeLedger does not fetch a site's favicon or contact the site to determine its icon.

Known-site and Web3 presets do **not** auto-fill login URLs. Enter a URL only after verifying it yourself.

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

SafeLedger is an encrypted information organizer. It is not a cryptocurrency exchange, blockchain node, hardware wallet, transaction-signing device, online password-sync service, or token-rating service.

Storing a seed phrase, private key, or password in any software creates risk. Maintain appropriate offline recovery backups for critical assets and accounts.

## License

SafeLedger is licensed under the Apache License 2.0. See `LICENSE` for the complete license text, `NOTICE` for SafeLedger attribution/history, and `THIRD-PARTY-NOTICES.md` for third-party attribution information.
