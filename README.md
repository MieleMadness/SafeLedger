# SafeLedger

SafeLedger is a **free, local-first, offline encrypted information vault** for organizing cryptocurrency recovery information and account-recovery details. It stores Profiles, Vault Items, Assets, public addresses, recovery details, private keys, balances, passwords, notes, and related information in encrypted files that remain under your control.

Vault Items can represent cryptocurrency wallets, exchange accounts, Web3 accounts, or ordinary website accounts. SafeLedger does not require a cloud account, subscription, license server, or network connection for normal vault operation.

## Release status

### Current stable release: SafeLedger 2.6.6

SafeLedger **2.6.6** is the current source release on the repository's `master` release line.

2.6.6 is an interaction-reliability patch that fixes the actual Add Asset null-selection bug and stops the self-triggering Web3/Website account DOM render loop found during real-user testing.

### What's new in SafeLedger 2.6.6

- Fixed **Add Asset** when no Vault Item is selected. The prior helper converted `groupSelected: null` with `Number(null)`, which becomes `0` in JavaScript and could incorrectly treat an unselected Profile as if Vault Item index 0 were already selected.
- The renderer bridge now creates **one preload subscription per result channel** and fans the same renderer-world payload object to all SafeLedger UI listeners, so the core renderer and Vault Item selection helper operate on the same `vaultData` state.
- Add Asset now repairs a missing selection synchronously through the normal Vault Item click path and then allows the **original Add Asset click** to continue. It no longer cancels the click, calls `stopImmediatePropagation`, or relies on a second synthetic Add Asset click.
- Fixed the **Web3 Account freeze** caused by UI code observing and repeatedly rebuilding its own grouped dropdown and labels. Grouped option rendering is signature-based and becomes a no-op when the DOM is already correct.
- The Web3/Website MutationObserver disconnects while applying its own patch and reconnects afterward, preventing self-triggered render loops.
- The older combined-account UI explicitly leaves **Web3 Account** and **Website Account** forms alone so two UI helpers cannot fight over the same preset controls.
- New regressions verify `null` is never treated as Vault Item index 0, renderer listeners share the same vault object, repeated Web3 dropdown rendering creates **zero additional DOM mutations**, and the legacy account helper does not touch split account forms.
- No vault schema, AES-256-GCM, Argon2id, main-process DEK, backup, Self-Destruct, cloud, or network behavior changed in this patch.

### 2.6.5 account organization retained

- **Web3 Account** and **Website Account** remain distinct Vault Item types instead of the long combined `Web3 / Website Account` label.
- Existing combined-category Vault Items remain readable without a vault-format migration. Known Web3 services are presented as Web3 Accounts; other legacy combined items are presented as Website Accounts and convert cleanly when edited and saved.
- The Vault Item Type chooser remains grouped into **Accounts** and **Wallets** and alphabetized within each group.
- Known Web3 and Website preset dropdowns remain **grouped and alphabetized** by purpose. Web3 groups include DeFi, Gaming, Identity & Naming, and NFT. Website groups include Developer, Email, Entertainment, Finance & Crypto, Productivity & Cloud, Shopping & Payments, and Social & Community.
- Chain Games remains under **Web3 Account → Gaming → Chain Games** and retains its three reviewed CHAIN starter entries for Ethereum, Polygon, and Chain Games Supernet.

### 2.6.4 reliability retained

- Fixed the original Add Asset missing-selection condition when a Profile was open and Vault Items were visible.
- Replaced the Chain Games `CG` initials tile with dedicated local/offline vector artwork using the angular interlocking Chain Games visual motif.
- Chain Games Vault Items and reviewed `CHAIN` Assets share the same local artwork source.
- Vault Item and Asset navigation icons use the same **28px** desktop size and **24px** compact size across branded, generic, catalog, and fallback artwork.

### 2.6.3 reliability retained

- Chain Games Vault Item saves no longer get stuck in **processing** when reviewed CHAIN starter assets are prepared in the sandboxed renderer.
- Local website/service SVG icons use renderer-safe URI encoding instead of depending on Node's `Buffer` global.
- Optional preset asset seeding cannot prevent the core encrypted Vault Item save request from being sent. If preset enrichment fails, SafeLedger logs the enrichment error and continues with the Vault Item save.

### 2.6.2 features retained

- **Shit Coin Mode** in Settings → Asset Display. When enabled, unknown assets with no recognized local icon use **💩** instead of the generic ticker fallback. The setting is visual-only and off by default.
- Standard **Network** and **Contract address** fields for Assets, stored through the existing encrypted field structure without requiring a vault-format migration.
- **Chain Games** support with reviewed `CHAIN` starter assets for Ethereum, Polygon, and the Chain Games Supernet.
- Deterministic local Chain Games artwork for reviewed CHAIN entries so a ticker collision cannot select an unrelated icon.
- A local known-site catalog for ordinary account/password records including Facebook, Yahoo, Google, Gmail, Microsoft, Outlook, Apple, Amazon, PayPal, eBay, Instagram, X/Twitter, LinkedIn, Reddit, Discord, Dropbox, GitHub, Netflix, Spotify, Steam, Twitch, TikTok, YouTube, Proton, Adobe, Slack, and Zoom.
- Known website icons are generated and bundled locally. SafeLedger does not fetch favicons or call an online icon service at runtime.
- Unknown websites continue to use the generic local globe icon.
- The 2.6.1 **macOS Apple Silicon (`arm64`)** foundation is retained, including native packaging, native Apple Silicon CI, portable `.app` root handling, and fail-closed App Translocation/read-only startup checks.

### 2.6 foundation retained

- User-facing hierarchy: **Profile → Vault Item → Asset**
- Vault Items can represent **Wallets**, **Exchange Accounts**, **Web3 Accounts**, and **Website Accounts**
- Full local Web3Icons preparation for tokens, networks, wallets, and exchanges
- Icon-backed New Profile wallet picker with responsive layout
- Nine Standard starter wallets with reviewed starter configuration
- Reviewed wallet, exchange, and service asset presets
- Vault Overview inventory, maintenance, stale-information, recovery coverage, and direct navigation
- Profile Notes stored with encrypted Profile metadata
- Recovery Binder dark-mode improvements and optional local QR-code printing
- Explicit Cancel actions for New Profile, Add Vault Item, and Add Asset workflows
- FIO Protocol support in reviewed Ledger and MetaMask catalogs and in the FIO App service preset

SafeLedger remains local-first and offline. Runtime icon lookup uses local data URLs and generated local service artwork; the vault does not fetch wallet, exchange, token, network, or website artwork from the internet.

### Core capabilities

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
- Global Search, Vault Overview, Activity History, recovery sheets, custom fields, and Vault Item metadata
- Centralized main-process locking for Emergency Lock and device-security events
- OS lock, suspend/resume, idle-state, and portable-storage session protection where supported
- Sanitized Storage Health and backup-age awareness
- Explainable recovery-health scoring
- Guided, non-destructive **Test Recovery** workflow
- Offline BIP39 mnemonic validation using the official English word list
- Offline Bitcoin Base58Check, Bech32, and Bech32m validation
- Offline Ethereum/EVM format and EIP-55 checksum validation
- Privacy-preserving duplicate recovery-data detection
- Session-only keyed fingerprints for sensitive duplicate checks, cleared on lock
- **Privacy Mode**, enabled by default, for masked sensitive information
- Sanitized Recovery Intelligence output that does not expose seeds, private keys, raw fingerprints, recovery locations, or backup paths
- Emergency Lock that clears the active encryption session, minimizes SafeLedger, resets the renderer, and returns to a fresh login state
- Windows, Linux, and macOS Apple Silicon validation/build workflows
- SHA-256 release/checksum tooling, release-manifest tooling, SBOM support, and release-verification documentation
- Apache 2.0 license, NOTICE, third-party attribution, contributor, and security documentation

### Supported release platforms

The currently implemented packaged targets are:

- **Windows x64 Portable EXE**
- **Linux x64 AppImage**
- **macOS Apple Silicon (`arm64`) ZIP**

The macOS build is native Apple Silicon and is validated on GitHub-hosted Apple Silicon hardware. The project does not currently have Apple Developer Program credentials, so the Mac artifact is **not Developer ID signed or Apple-notarized**. SafeLedger does not claim a notarized consumer distribution until signing credentials are available.

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

- Explainable recovery-health scoring
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

2.5 established the distribution/trust foundation, including Windows/Linux artifact contracts, checksum/SBOM/release-manifest tooling, open-source legal and contributor documentation, and release-verification guidance.

### SafeLedger 2.6 — Vault Item Experience & Local Web3 Catalog

Released as **2.6.0**.

2.6 introduced the Profile → Vault Item → Asset model, Wallet/Exchange/Web3 account Vault Items, the local Web3 catalog, reviewed starter presets, Profile Notes, Vault Overview improvements, Recovery Binder improvements, and interface refinements.

### SafeLedger 2.6.1 — macOS Apple Silicon Foundation

2.6.1 introduced native `arm64` packaging and validation, macOS `.app` portable-root resolution, App Translocation detection, portable-folder writability checks, and fail-closed startup handling that refuses to create a hidden second `SafeLedgerData` location.

### SafeLedger 2.6.2 — Asset Identity & Account Catalog

2.6.2 added Network/Contract Address asset identity, Chain Games/CHAIN support, the local known-website catalog, and opt-in Shit Coin Mode while retaining the 2.6.1 Apple Silicon foundation.

### SafeLedger 2.6.3 — Chain Games Save Hotfix

2.6.3 fixed the Chain Games save freeze caused by renderer-sandbox-incompatible local icon encoding and hardened preset enrichment so an optional preset error cannot prevent the encrypted Vault Item save IPC request.

### SafeLedger 2.6.4 — Add Asset & Icon Usability Hotfix

2.6.4 fixed the original missing Vault Item selection behind Add Asset, replaced the Chain Games initials tile with dedicated local vector artwork, and standardized larger Vault Item/Asset navigation icons.

### SafeLedger 2.6.5 — Account Types & Add Asset Reliability Candidate

2.6.5 was an **unmerged release candidate** that introduced the separate Web3 Account and Website Account types plus grouped/alphabetized preset dropdowns. Real-user testing showed its Add Asset select-then-retry repair was still incomplete, so PR #48 was closed without promotion to `master`. Its account-organization work is retained in 2.6.6.

### SafeLedger 2.6.6 — Add Asset & Web3 Interaction Reliability

2.6.6 fixes the Add Asset `null`-selection/index-0 bug, shares one renderer-world vault state across result listeners, removes the synthetic Add Asset retry path, and prevents the Web3/Website account MutationObserver from retriggering itself or competing with the legacy combined-account helper.

See `RELEASE-2.6.md`, `RELEASE-2.6.1.md`, `RELEASE-2.6.2.md`, `RELEASE-2.6.3.md`, `RELEASE-2.6.4.md`, `RELEASE-2.6.5.md`, and `RELEASE-2.6.6.md` for the detailed 2.6 release history.

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
├─ SafeLedger-2.6.6-Portable.exe
└─ SafeLedgerData\
   ├─ settings\
   └─ vaults\
```

### Linux AppImage example

```text
/home/user/Apps/SafeLedger/
├─ SafeLedger-2.6.6-x86_64.AppImage
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
