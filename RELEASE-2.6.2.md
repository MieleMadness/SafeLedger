# SafeLedger 2.6.2 — Asset Identity, Chain Games & Known Website Icons

## Release scope

SafeLedger 2.6.2 expands the 2.6 Vault Item experience without changing the encrypted vault format. It keeps the 2.6.1 Apple Silicon foundation and adds better multichain asset identity, Chain Games support, a broader known website catalog, and an optional display-only **Shit Coin Mode**.

## Shit Coin Mode

Settings now includes **Shit Coin Mode** under Asset Display.

- Off by default.
- When enabled, an asset with no recognized local SafeLedger token/network icon uses **💩** instead of the generic ticker fallback.
- The mode is visual only. It does not classify an asset as bad, rank assets, filter them, alter balances, modify recovery information, or change encrypted vault data other than the saved preference itself.
- Recognized assets keep their normal local icons.

## Multichain asset identity

Asset edit forms now reserve two standard structured fields:

- **Network**
- **Contract address**

They are stored through SafeLedger's existing encrypted custom-field-compatible structure so old 2.x vaults remain compatible and no schema migration is required. Existing assets simply start with empty values.

## Chain Games

Chain Games is added as a known **Web3 / Website Account**, not as a custody wallet. Current Chain Games pages require users to connect a wallet and describe a multichain environment using Chain Games Supernet, Polygon, and Ethereum.

Selecting Chain Games can seed reviewed CHAIN asset entries for:

- Chain Games — Ethereum (`CHAIN`)
  - contract: `0xc4c2614e694cf534d407ee49f8e44d125e4681c4`
- Chain Games — Polygon (`CHAIN`)
  - contract: `0xd55fce7cdab84d84f2ef3f99816d765a2a94a509`
- Chain Games — Supernet (`CHAIN`)
  - native CHAIN asset; no token contract is asserted

Source for platform/token behavior: `https://chaingames.io/where-to-buy-chain-tokens` and `https://chaingames.io/how-to-play`. Contract identity was cross-checked against current CoinGecko platform metadata during the 2.6.2 review.

CHAIN receives a deterministic local Chain Games icon override so a ticker collision cannot accidentally show an unrelated `CHAIN` logo.

## Known website catalog

SafeLedger's Web3 / Website Account picker now supports a broader local known-site catalog suitable for ordinary password/account recovery records. Initial entries include Chain Games, Facebook, Yahoo, Google, Gmail, Microsoft, Outlook, Apple, Amazon, PayPal, eBay, Instagram, X/Twitter, LinkedIn, Reddit, Discord, Dropbox, GitHub, Netflix, Spotify, Steam, Twitch, TikTok, YouTube, Proton, Adobe, Slack, and Zoom.

Known website icons are generated as local SVG brand tiles and embedded as data URLs. SafeLedger does **not** fetch favicons, call a third-party icon API, contact the website, or expose the user's account list over the network. Unknown websites continue to use the generic globe icon.

Known-site presets still do not auto-fill login URLs. The user must enter or verify the actual account/recovery URL themselves, preserving the existing anti-phishing posture.

## Compatibility and security

2.6.2 does not intentionally change AES-256-GCM vault encryption, Argon2id key-envelope behavior, password verification, Self-Destruct semantics, backup formats, Privacy Mode, Recovery Intelligence, portable `SafeLedgerData`, Windows/Linux behavior, or the 2.6.1 macOS arm64 startup safety gate.

No online price lookup, token discovery, favicon lookup, account sync, or cloud service is introduced.
