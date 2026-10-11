# SafeLedger 2.6.89

## CI regression repair

SafeLedger 2.6.88 correctly replaced the Chain Games circular icon with the requested local rounded-square artwork, but all three platform workflows failed during the regression suite before packaging.

Windows, Linux, and macOS all stopped in `scripts/development-2.6.2-tests.js` with the same assertion:

`Chain Games icon must be fully local.`

## Root cause

The failure was a stale historical test assumption, not a production artwork or offline-security failure.

The 2.6.2 regression assumed every known service icon had to be represented specifically as an inline `data:image/svg+xml` URL. SafeLedger 2.6.88 intentionally moved Chain Games to packaged local SVG files so Light/Colorful and Dark can use different black/white variants through the existing theme system.

A relative packaged path such as `./assets/chain-games-light-colorful.svg` is still fully local/offline, but the old test incorrectly treated any non-data-URL representation as remote.

## Fix

The historical 2.6.2 regression now preserves the real security requirement instead of the obsolete implementation detail:

- Normal generated service tiles must still use local SVG data URLs.
- Chain Games must resolve only to a relative `./assets/chain-games-*.svg` path.
- The Chain Games path must not be HTTP or HTTPS.
- The referenced SVG must physically exist under `src/main/assets` so it is covered by the existing packaged `src/**/*` build contract.

This keeps the offline guarantee strict without forcing SafeLedger back to the retired single-image implementation.

## Production scope

There are no production application, icon, authentication, encryption, recovery, storage, network-permission, or persistence changes in 2.6.89. The complete 2.6.88 Chain Games appearance change is carried forward unchanged.

## Release safety

This is a cumulative candidate. Do not merge to `master` until Windows, Linux, and macOS CI pass and the 2.6.88 Chain Games artwork remains hands-on approved.
