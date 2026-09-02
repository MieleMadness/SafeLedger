# SafeLedger 2.6.5 — Account Types & Add Asset Reliability

Release: **2.6.5**

SafeLedger 2.6.5 separates Web3 and ordinary website accounts, organizes the growing preset lists, and hardens the Add Asset interaction after the 2.6.4 selection fix proved incomplete in real use.

## Web3 Account and Website Account

- Replaced the long combined **Web3 / Website Account** choice in new/edit forms with two distinct Vault Item types:
  - **Web3 Account**
  - **Website Account**
- Existing 2.6.2–2.6.4 Vault Items that still carry the legacy combined category remain readable with no encrypted-vault migration.
- Legacy known Web3 names such as Chain Games, Aave, FIO App, Lido, OpenSea, and Uniswap are presented as Web3 Accounts.
- Other legacy combined-category items are presented as Website Accounts and convert to the shorter category when edited and saved.
- Chain Games remains a Web3 Account and continues to preload its reviewed CHAIN entries for Ethereum, Polygon, and Chain Games Supernet.
- Website Account does not trigger Chain Games crypto-asset preloading.

## Grouped and alphabetized dropdowns

The Vault Item Type chooser now uses native grouped options:

- **Accounts**
  - Exchange Account
  - Web3 Account
  - Website Account
- **Wallets**
  - Hardware Wallet
  - Other Wallet
  - Software Wallet

Known Web3 presets are grouped and alphabetized under:

- DeFi
- Gaming
- Identity & Naming
- NFT

Known Website presets are grouped and alphabetized under:

- Developer
- Email
- Entertainment
- Finance & Crypto
- Productivity & Cloud
- Shopping & Payments
- Social & Community

Chain Games appears under **Gaming**. Major ordinary sites such as Facebook, Yahoo, GitHub, PayPal, and the rest of the local known-site catalog appear under their appropriate Website categories.

All preset recognition and artwork remains local/offline. SafeLedger still does not auto-fill login URLs or fetch favicons at runtime.

## Add Asset reliability

2.6.4 attempted to repair a missing Vault Item selection during the same Add Asset click. Real use showed that the normal Add Asset handler could still evaluate before the Vault Item selection path had completely settled.

2.6.5 changes that sequence:

1. If a Vault Item is already selected, Add Asset follows the normal existing path with no interception.
2. If Vault Items are visible but none is selected, SafeLedger stops the first Add Asset click before the old null-selection guard can consume it.
3. SafeLedger selects the first visible Vault Item through the normal Vault Item click path.
4. On the next renderer microtask, after that selection has rebuilt the list/state, SafeLedger retries the real Add Asset button.
5. The second click proceeds through the normal renderer Add Asset handler and opens the Asset editor.

A dedicated executable regression verifies the select-then-retry behavior and guards against retry loops when a valid selection already exists.

## Compatibility and security

- No AES-256-GCM changes.
- No Argon2id changes.
- No main-process DEK/session-boundary changes.
- No vault schema migration.
- No backup-format changes.
- No Self-Destruct behavior changes.
- No cloud, favicon, telemetry, or login-URL network dependency added.
- Existing SafeLedger 2.x encrypted vaults remain compatible.

## Validation target

2.6.5 must pass the complete regression suite, Electron crypto smoke, real GUI smoke, Windows x64 Portable packaging, Linux x64 AppImage packaging, and native macOS Apple Silicon arm64 packaging before promotion to `master`.