# SafeLedger 2.6.81 — Display-Column Login Wallpaper

SafeLedger 2.6.81 carries forward the complete 2.6.80 candidate and corrects the login-wallpaper scope so the visual update behaves like the requested reference: the wallpaper belongs only to the Detail/display column during sign in, while the rest of the SafeLedger workspace keeps its normal structure.

## Reference-style imagery

The Light and Colorful appearances share a refreshed frosted white / pale-blue wallpaper inspired by the supplied reference artwork. Dark uses a matching deep-navy version. Both use recognizable crypto icons and security imagery with a soft glow treatment, including Bitcoin, Ethereum, a Chainlink-style hexagon, Solana, a USDC-style coin, a wallet, and a lock.

The artwork remains self-contained local SVG content at 1280x720 / 16:9. It contains no script, embedded HTML, nested image dependency, or remote resource, so the sign-in artwork remains fully local/offline and scales cleanly across supported window sizes.

## Root cause of the divider regression

The earlier login-wallpaper implementation applied the backdrop to the entire `.app-shell` and then made every `.app-cell` transparent during login. That broad rule also set `border-color: transparent !important`, which suppressed the existing column dividers from `workspace-dividers.css`.

That was broader than the requested design. The intended change was wallpaper in the display column, not a redesign of the whole login shell.

## Corrected scope

2.6.81 removes the whole-shell wallpaper behavior and the all-cell transparency/border override. The wallpaper is now applied only through:

`.app-shell[data-login-mode="true"] .detail-column`

The existing Profiles, Vault Items, Assets, search row, action row, and column dividers remain under their normal styling. No divider-removal override is used.

The explicit `data-login-mode` lifecycle is retained, so the wallpaper appears only while SafeLedger is on the locked/sign-in surface and disappears before the normal workspace is restored.

## Regression maintenance

The historical 2.6.78 login-artwork regression was updated to validate the current display-column behavior rather than preserving the retired whole-shell transparency rule.

A new `hotfix-2.6.81-tests.js` gate verifies:

- Light and Colorful share the light wallpaper;
- Dark uses the matching dark wallpaper;
- the wallpaper is scoped specifically to the Detail/display column;
- the app shell is not used as the wallpaper surface;
- all workspace cells are not made transparent during login;
- the existing column dividers remain present and are not forced transparent;
- both wallpapers retain crypto icons, wallet/security imagery, and soft glow styling;
- the artwork remains self-contained and local/offline;
- the 2.6.78 and 2.6.80 regression contracts still execute successfully.

## Security and data behavior

This is a presentation-only login correction. There are no authentication, encryption, password, lockout, recovery, vault-data, storage-path, or network-permission changes in 2.6.81.

## Release safety

This is a cumulative candidate. **Do not merge to `master` until Windows, Linux, and macOS CI pass and the Light/Colorful and Dark sign-in wallpaper are hands-on approved.**
