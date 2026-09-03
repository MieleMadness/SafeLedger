# SafeLedger 2.6.5 — Account Types & Add Asset Reliability

Candidate: **2.6.5**  
Status: **Superseded — not promoted to `master`**

SafeLedger 2.6.5 was an unmerged release candidate that separated Web3 and ordinary website accounts and organized the growing preset lists. Real-user testing showed its Add Asset repair was still incomplete, so PR #48 was closed and the interaction fix was superseded by 2.6.6. The account-type and dropdown organization work is retained in 2.6.6.

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

The Vault Item Type chooser uses native grouped options:

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

All preset recognition and artwork remains local/offline. SafeLedger does not auto-fill login URLs or fetch favicons at runtime.

## Superseded Add Asset approach

2.6.4 attempted to repair a missing Vault Item selection during the same Add Asset click. The 2.6.5 candidate changed that sequence because real use showed the normal Add Asset handler could still evaluate before the Vault Item selection path had completely settled.

The 2.6.5 candidate:

1. If a Vault Item was already selected, Add Asset followed the normal existing path with no interception.
2. If Vault Items were visible but none was selected, SafeLedger **stops the first Add Asset click** before the old null-selection guard could consume it.
3. SafeLedger selected the first visible Vault Item through the normal Vault Item click path.
4. On the next renderer microtask, it **retries the real Add Asset button**.
5. The second click was intended to proceed through the normal renderer Add Asset handler and open the Asset editor.

Real-user testing showed this was still insufficient. 2.6.6 found the underlying `Number(null) === 0` selection bug, removed the stop-and-retry interaction, and fixed shared renderer state directly. See `RELEASE-2.6.6.md`.

## Compatibility and security

- No AES-256-GCM changes.
- No Argon2id changes.
- No main-process DEK/session-boundary changes.
- No vault schema migration.
- No backup-format changes.
- No Self-Destruct behavior changes.
- No cloud, favicon, telemetry, or login-URL network dependency added.
- Existing SafeLedger 2.x encrypted vaults remain compatible.

## Validation history

The 2.6.5 candidate passed automated validation, but it was **not promoted to `master`** because subsequent real-user testing exposed the Add Asset and Web3 interaction problems addressed in 2.6.6. Automated validation is a release gate, not a substitute for interaction testing.
