# SafeLedger 2.6.79 — Login Background Regression Repair

SafeLedger 2.6.79 carries forward the complete 2.6.78 login-background candidate and repairs the regression-test false positive that made all three 2.6.78 platform workflows red.

## What failed

Windows, Linux, and macOS all reached the new 2.6.78 login-artwork regression after the existing historical regression suite had passed. The failing assertion required each bundled JPEG to have a compressed file byte size greater than 20,000 bytes.

That was the wrong property to test. A JPEG can contain the intended artwork and remain a valid, useful image while compressing below an arbitrary byte threshold. Compression settings, image complexity, and encoder behavior can all change the file size without changing the login feature contract.

## Root-cause fix

The 2.6.78 regression gate no longer treats compressed file byte size as evidence that the artwork is valid. It now verifies the properties SafeLedger actually depends on:

- the local file begins with the JPEG start marker;
- the local file ends with the JPEG end marker;
- JPEG dimensions can be read from real frame metadata;
- the image is large enough to serve as login-background artwork; and
- the artwork preserves the intended widescreen composition.

This keeps the regression meaningful without coupling it to one encoder or compression level.

## Login artwork behavior

The 2.6.78 product behavior is unchanged. Light and Colorful continue sharing the same local light login artwork, Dark continues using the matching dark artwork, and System continues following the resolved operating-system theme. The images remain bundled with the application and work local/offline with no runtime image download.

There are **no production login behavior changes** in 2.6.79 relative to 2.6.78. Authentication, encryption, lockout handling, login-only state ownership, theme selection, and the actual background-image mapping are unchanged. This patch repairs the test that incorrectly rejected valid compressed artwork.

## Testing focus

The 2.6.79 candidate should pass the full regression suite and Windows Portable, Linux AppImage, and macOS Apple Silicon workflows. Hands-on testing should still confirm that Light/Colorful show the light artwork, Dark shows the dark artwork, System follows the OS theme, and the background remains limited to the login/locked surface.

Do not merge this candidate to `master` until all three platform workflows pass and the login backgrounds are hands-on approved.
