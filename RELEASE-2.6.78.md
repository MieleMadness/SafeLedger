# SafeLedger 2.6.78 — Theme-Aware Login Backgrounds

SafeLedger 2.6.78 carries forward the complete 2.6.77 candidate, whose Windows, Linux, and macOS workflows passed, and adds the requested visual background treatment to the login surface.

## Login artwork

Light and Colorful now share the same frosted white and pale-blue crypto/security background. Dark uses the matching deep-navy and electric-blue version. System appearance continues to follow the resolved operating-system theme through SafeLedger's existing `data-theme` behavior, so it automatically receives the appropriate light or dark login artwork.

The two generated backgrounds are bundled locally with SafeLedger as optimized 1280x720 JPEG files under `src/main/assets`. The login screen does not download artwork, query a favicon, or make a network request. The background is centered, does not tile, and uses `cover` so it fills the preferred window as well as resized windows.

## Login-only lifecycle

The background is tied to explicit login state rather than guessing from the visual layout. `collapseForLogin()` now marks the application shell with `data-login-mode="true"`, and `revealAfterLogin()` removes that state before the normal workspace is restored.

This distinction matters because Profiles, Vault Items, and Assets can also be collapsed during normal use. Simply checking whether the three navigation columns are collapsed would have been a fragile shortcut and could have shown the login artwork at the wrong time.

While login mode is active, the workspace cell surfaces and dividers become transparent so the artwork fills the unused space to the right of and below the existing login area. The login form itself keeps its existing controls, password behavior, accessibility, and interaction logic. Light and Colorful retain readable dark text over their shared pale background.

## Security and data behavior

This is a visual login update only. It does not change encryption, password validation, lockout behavior, encrypted vault data, storage paths, recovery information, schemas, or network permissions. The artwork remains fully local and offline.

## Regression coverage

A new `hotfix-2.6.78-tests.js` gate verifies:

- Light and Colorful share the light login artwork;
- Dark uses the dark login artwork;
- both bundled JPEG assets are present and packaged by the existing `src/**/*` rule;
- login mode is explicitly enabled and removed by the navigation lifecycle;
- the background uses cover/no-repeat behavior;
- no remote URL is introduced by the login-artwork CSS;
- the complete 2.6.77 regression repair still passes.

## Release safety

This is a cumulative candidate. **Do not merge to `master` until Windows, Linux, and macOS CI pass and both the light/colorful and dark login backgrounds are hands-on approved.**
