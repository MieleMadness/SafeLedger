# SafeLedger 2.6.106

SafeLedger 2.6.106 adds an offline Profile icon picker while carrying forward the fully green 2.6.105 plain Login background and all prior security / recovery behavior.

## Profile icon picker

Add Profile and Modify Profile now include a searchable Profile icon picker. The picker is organized into the icon catalogs SafeLedger already packages:

- Crypto tokens
- Networks
- Wallets
- Exchanges
- Known services
- General SafeLedger UI icons

The crypto, network, wallet, and exchange categories enumerate the complete local Web3Icons manifest generated from SafeLedger's pinned `@web3icons/core` dependency. Chain Games remains available through SafeLedger's reviewed local artwork. The Services category exposes the existing SafeLedger service catalog, and General exposes every real locally-defined `fa-*` / `glyphicon-*` icon except the non-visual `fa-spin` animation modifier.

A search field filters the active category. Users can also choose **Use initial** to retain the existing first-letter Profile badge behavior.

## Profile display

A selected icon appears in the Profile navigation list and in the Profile detail heading. Existing Profiles without a saved icon continue to use their first-letter fallback with no migration required.

## Persistence and security

SafeLedger stores only a small validated `profileIcon` identifier in the encrypted Profile list metadata. It does not persist arbitrary HTML, remote URLs, image paths, or user-supplied CSS classes.

The authoritative main-process Profile write path validates icon type/category/key before persistence. Unsupported or malformed local/service selections are rejected, and an icon that cannot be resolved by the current bundled catalog falls back safely to the Profile initial.

No network access is added. All icon artwork remains local to the packaged application.

## Regression coverage

The canonical regression suite now includes a Profile icon picker contract that verifies:

- every packaged token/network/wallet/exchange icon is reachable from the picker;
- Chain Games remains available;
- every existing SafeLedger service icon is reachable;
- every locally-defined general icon is exposed, excluding only the animation modifier;
- icon metadata is validated by the authoritative Profile write path;
- arbitrary markup cannot be smuggled through Profile icon persistence;
- Profile list/detail rendering and picker/search/clear controls remain wired.

The durable regression contract increases from 47 to 48 suites.
