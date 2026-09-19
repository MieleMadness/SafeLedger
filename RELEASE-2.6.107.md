# SafeLedger 2.6.107

SafeLedger 2.6.107 is a focused performance update for the Profile icon picker introduced in 2.6.106. It carries forward the complete offline icon catalog and all existing Profile icon persistence/security behavior while removing the expensive render path reported during hands-on testing.

## What was slow

The first implementation rebuilt and sorted a complete Web3 icon category while rendering individual icons. Rendering a large category therefore repeated full-catalog work many times, and switching categories recreated every icon tile at once.

That affected:

- opening Add Profile;
- opening Modify Profile;
- switching between Crypto, Networks, Wallets, and other icon categories;
- selecting an icon;
- returning to Profile list/detail after saving, because Profile icon display used the same category-scan lookup.

## Faster icon lookup

`web3-icons.js` now owns cached category catalogs and a direct `entry(category, key)` lookup. A Profile that already knows its saved icon key can resolve that icon directly instead of rebuilding, sorting, and scanning an entire category.

The Profile picker also caches its normalized searchable catalogs once per category. Repeated tab changes and summary updates reuse those catalogs rather than recreating them.

## Lazy picker rendering

The picker keeps every packaged icon searchable and selectable, but no longer creates thousands of DOM elements at once.

- The first visible working set is capped at 72 icon tiles.
- Additional tiles are appended in batches while the user scrolls or chooses **Show more icons**.
- Search still filters the complete active catalog, then renders only a small result batch.
- Selecting or clearing an icon updates the existing selected state instead of rebuilding the entire grid.
- Web3 image decoding is asynchronous.

This is progressive rendering only; it does not reduce the available icon catalog.

## Security and persistence

There is no change to the 2.6.106 persistence model. SafeLedger still stores only validated `profileIcon` identifiers in encrypted Profile metadata. Arbitrary markup, remote URLs, image paths, and unapproved CSS classes remain rejected.

All artwork stays local/offline. No encryption, Argon2id, AES-GCM, DEK lifetime, lockout, Self-Destruct, recovery, or encrypted data format behavior changes in this release.

## Regression coverage

The Profile icon picker regression now additionally protects the performance architecture:

- Web3 category entry lists are cached;
- direct icon lookup is used for saved Profile icon rendering;
- Profile picker catalogs are cached;
- the old full-category `.find()` lookup path is forbidden;
- large icon grids render in bounded batches;
- additional icons remain reachable through incremental scrolling/loading.

Hands-on testing should confirm that Add Profile, Modify Profile, category switching, icon selection, Save, and the return to Profile detail all feel immediate while the full icon library remains available.
