# SafeLedger 2.6.90

## CI regression repair

SafeLedger 2.6.89 fixed the first stale Chain Games local-artwork assertion, but the full regression chain then advanced to the next historical gate and stopped in `scripts/hotfix-2.6.3-tests.js` on the same retired representation assumption.

All three platform workflows reached and passed the repaired 2.6.2 gate before failing at 2.6.3.

## Root cause

The 2.6.3 gate was written when Chain Games used an inline SVG data URL. Its real purpose was to prove the renderer could obtain Chain Games artwork while `global.Buffer` was unavailable, preserving sandbox safety.

After 2.6.88, Chain Games intentionally uses packaged local SVG files so Light/Colorful and Dark can use separate black/white artwork. A local `./assets/chain-games-*.svg` path satisfies the same sandbox/offline security requirement without being a `data:image/svg+xml` URL.

## Fix

The historical 2.6.3 gate now checks the behavior that matters:

- Chain Games resolution works while `global.Buffer` is unavailable.
- The resolved artwork is restricted to the local `./assets/chain-games-*.svg` family.
- HTTP and HTTPS artwork are rejected.
- The referenced SVG must physically exist under packaged `src/main/assets` source.
- CHAIN Assets must share that same local Chain Games artwork source.
- The existing no-`Buffer.from` renderer contract remains enforced.

This is a historical-test modernization only. It does not weaken the offline or sandbox contract.

## Broader regression coverage

A new 2.6.90 gate protects both modernized historical local-artwork checks and executes the current 2.6.88/2.6.89 Chain Games regressions so later representation changes cannot silently reintroduce the old inline-only assumption.

## Production scope

There are no production application, icon, authentication, encryption, recovery, storage, network-permission, or persistence changes in 2.6.90. The requested Chain Games artwork from 2.6.88 is carried forward unchanged.

## Release safety

This is a cumulative candidate. Do not merge to `master` until Windows, Linux, and macOS CI pass and the Chain Games artwork is hands-on approved.
