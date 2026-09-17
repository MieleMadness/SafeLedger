# SafeLedger 2.6.105

## Plain Login background restoration

SafeLedger 2.6.105 carries forward the fully green 2.6.104 navigation and re-login fixes and restores the Login screen to the normal plain theme background.

The decorative crypto wallpaper experiment is retired for all appearances. Dark now uses the normal Dark Detail background, Light uses the normal Light Detail background, Colorful uses the normal Colorful Detail background, and System continues to resolve to the active operating-system theme.

## Ownership cleanup

The Login screen no longer has a separate wallpaper token or Login-specific background-image override. The existing `.dark4bg` Detail-column theme owner remains authoritative through `var(--sl-bg)`.

Because the artwork is no longer part of the product, 2.6.105 also removes the temporary artwork pipeline rather than leaving dormant code behind:

- no Login WebP/JPEG/SVG runtime background assets;
- no Base64 artwork source chunks under `scripts/login-artwork/`;
- no Login-artwork reconstruction or hash handling in `build-renderer.js`;
- no generated Login-image entries in `.gitignore`;
- appearance and current-product tests now protect the plain-background contract.

The local Chain Games icon used by wallet/profile surfaces is unchanged. Removing the Login wallpaper does not remove Chain Games support elsewhere in SafeLedger.

## Carried-forward fixes

2.6.105 retains the 2.6.104 behavior that resets the Detail scroll owner when navigating between Profiles, Vault Items, and Assets. It also retains the existing-password authentication correction and repeated Emergency Lock/re-login regression coverage.

## Security scope

This update is visual and cleanup-focused. It does not alter encryption, Argon2id, AES-GCM key envelopes, DEK lifetime, failed-password accounting, Self-Destruct behavior, encrypted vault formats, or the renderer security boundary.

## Release safety

Do not merge this candidate to `master` until Windows Portable, Linux AppImage, and macOS Apple Silicon all pass on the exact final 2.6.105 head and hands-on testing confirms the Login display is a plain theme color in Dark, Light, and Colorful appearances.
