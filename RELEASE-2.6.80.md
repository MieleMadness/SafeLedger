# SafeLedger 2.6.80 — Repair Malformed Login Artwork Assets

SafeLedger 2.6.80 carries forward the complete 2.6.79 candidate and fixes the actual asset problem exposed by the stricter login-artwork regression gate.

## What failed in 2.6.79

Windows, Linux, and macOS all reached the same regression failure in `hotfix-2.6.78-tests.js`: the checked-in `login-background-light.jpg` did not begin with the required JPEG SOI bytes. The first byte was `0xfe` instead of `0xff`.

That means the 2.6.79 test was doing its job: the login background file itself was not a valid JPEG asset. The earlier 2.6.78 failure on compressed file size happened before the suite reached the JPEG signature check, so the malformed binary payload was still hidden behind the older brittle assertion.

## Root-cause fix

The malformed binary JPEG assets are removed completely. SafeLedger now uses self-contained SVG login artwork for both themes:

- `login-background-light.svg` for Light and Colorful;
- `login-background-dark.svg` for Dark;
- System still follows the resolved OS theme through the existing appearance behavior.

The SVGs preserve the intended 1280x720, 16:9 composition with the same security-focused visual direction: pale-blue/frosted treatment for Light and Colorful, deep-navy/electric-blue treatment for Dark, with abstract network geometry and a lock/shield motif.

## Why SVG is the stronger fix

This is not a workaround that weakens validation. SVG is a better fit for this UI background because it is text-based, scales cleanly with the existing `cover` behavior, packages through the existing `src/**/*` rule, and can be reviewed and validated directly in source control without relying on opaque binary transport.

The artwork is fully self-contained. It contains no scripts, no embedded HTML, no nested image dependencies, and no remote URLs. SafeLedger remains fully local/offline at runtime.

## Regression maintenance

The historical 2.6.78 and 2.6.79 gates are updated to validate the current implementation rather than preserving stale JPEG-specific assumptions. They now protect:

- Light/Colorful and Dark theme mapping;
- explicit login-only state;
- `cover` and no-repeat behavior;
- self-contained local SVG artwork;
- 1280x720 / 16:9 source composition;
- no scripts, embedded HTML, nested images, or remote references;
- removal of the malformed JPEG files;
- packaging through the existing `src/**/*` rule.

A new `hotfix-2.6.80-tests.js` gate locks this correction in and executes the updated 2.6.79 gate.

## Product scope

There are no encryption, vault-data, recovery, storage-path, password, lockout, or network-permission changes in this patch. The only production change is replacing malformed login artwork files with valid local SVG artwork and updating the palette references accordingly.

## Release safety

This remains a cumulative candidate. **Do not merge to `master` until Windows, Linux, and macOS CI pass and both the light/colorful and dark login backgrounds are hands-on approved.**
