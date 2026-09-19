# SafeLedger 2.6.104

## Navigation, re-login, and login artwork repair

SafeLedger 2.6.104 follows the completed 2.6.103 cleanup candidate and fixes hands-on regressions found during testing: the Detail/display column retaining its previous scroll position when a different Profile, Vault Item, or Asset is selected, re-login reliability after SafeLedger is locked, and the Login wallpaper rendering incorrectly when artwork was wrapped inside SVG instead of being loaded directly.

## Detail scroll ownership

The Detail area itself does not own vertical scrolling. Its surrounding `.content-middle` column owns `scrollTop`. Replacing the contents of `#detailArea` therefore did not reset the visible position, so selecting another Vault Item after scrolling down could open the next item partway down the display column.

2.6.104 adds one explicit workspace navigation owner in `workspace-navigation-ui.js`. It installs one delegated click handler on each stable Profile, Vault Item, and Asset navigation column and resets the real Detail scroll container after a navigation row renders the newly selected entity.

The implementation deliberately avoids the patterns removed during the cleanup phases: no MutationObserver, no timer, no synthetic click, no copied selection state, and no post-render DOM rewrite.

## Existing-password authentication after lock

SafeLedger previously used the same password-composition validator for both creating/changing a password and authenticating an already-existing encrypted key envelope. Those are different responsibilities.

A password that already protects an existing SafeLedger key envelope must be checked against that envelope exactly as entered. New-password strength rules should decide what password may be created or changed to; they should not prevent SafeLedger from attempting authentication of an existing password.

2.6.104 adds `validateExistingPassword()` for the Login path. Existing-password validation only checks that a password was entered and remains within SafeLedger's supported input length. The encrypted Argon2id/AES-GCM key envelope remains the authority that decides whether that password is correct.

First-time initialization and Change Password continue to use the full password policy, including minimum length, uppercase, lowercase, and numeric requirements.

## Restored lock/re-login contract

SafeLedger 2.5.1 previously added a repeated same-process lock/re-login test after a real defect made a known-correct password appear to fail following a security lock. That numbered test was later retired with the historical release-test archive, while the underlying session-generation protections remained in production code.

2.6.104 restores the behavior as durable current regression coverage. The test now verifies five consecutive cycles where:

- the active DEK exists before lock;
- Emergency Lock zeroes the previous DEK buffer;
- the session becomes locked;
- the exact same password successfully unlocks the existing key envelope;
- a fresh session generation is established after every successful re-login.

The same focused regression also verifies Detail scroll reset behavior and that existing-password authentication is separate from new-password creation policy.

## Final approved Login artwork for Dark, Light, and Colorful

The Login display now uses the final user-approved coordinated pair of crypto/security compositions. Dark uses the deep navy/neon treatment, while Light and Colorful share the matching pale blue/white treatment. Both preserve a quiet left-side area for Login controls and place the crypto icons on the right with Bitcoin in the center of the composition and the supplied Chain Games icon in the upper-left position previously occupied by Bitcoin.

The artwork includes the approved mix of Bitcoin, Ethereum, MetaMask, Solana, Litecoin, XRP, Tether, Exodus, and Chain Games iconography without making any single non-Bitcoin project the dominant brand. The Chain Games wordmark is intentionally omitted.

The earlier SVG-wrapped raster approach rendered incorrectly in hands-on testing, and the first direct-JPEG maintenance upload was rejected by the Appearance gate because the binary bytes were not preserved correctly. 2.6.104 therefore keeps the approved WebP artwork as deterministic Base64 text chunks in `scripts/login-artwork/`. The existing `prepare:renderer` step reconstructs `src/main/assets/login-background-dark.webp` and `src/main/assets/login-background-light.webp`, verifies their WebP signatures and exact SHA-256 digests, then continues the renderer build. This keeps the runtime assets fully local while making the source representation safe and reproducible through the repository maintenance path.

Light and Colorful use `login-background-light.webp`; Dark uses `login-background-dark.webp`; System resolves to the corresponding active theme. The generated WebP outputs are ignored by Git because their canonical source is the hash-pinned text chunks, while Electron Builder still packages the generated files because `prepare:renderer` runs before supported builds.

The Appearance regression pins the SHA-256 digest of both reconstructed approved images, verifies their RIFF/WebP signatures, protects the theme mappings, verifies all source chunks are present, and asserts that retired JPEG and SVG runtime owners do not return.

## Security scope

This release does not weaken encryption or lock behavior. It does not cache passwords, retain the DEK through a lock, bypass Argon2id, bypass the encrypted key envelope, alter failed-password accounting, alter Self-Destruct behavior, or change encrypted vault formats.

Emergency Lock still destroys the in-memory DEK. Re-login still requires the correct password to unwrap the encrypted key envelope and establish a new main-process-only DEK session.

The Login artwork remains packaged locally with SafeLedger and does not add a runtime network dependency.

## Test integration

The existing 47 canonical regression suites remain unchanged. `navigation-relogin-regression-tests.js` is additionally owned explicitly by the package test commands and runs as part of `npm run test:regression` and `npm run test:device-security`, so supported-platform CI must exercise the two behavioral regressions on every candidate. The canonical Appearance suite verifies the final approved Login artwork contract after `prepare:renderer` reconstructs and validates the local WebP assets.

## Release safety

Do not merge this candidate to `master` until Windows Portable, Linux AppImage, and macOS Apple Silicon workflows all pass on the exact final 2.6.104 head and hands-on testing confirms:

1. scroll down in one Vault Item, select another Vault Item, and confirm the Detail display starts at the top;
2. repeat the same check between Profiles and Assets;
3. unlock SafeLedger, use Emergency Lock, return to the Login screen, and sign in again with the same password;
4. repeat lock/re-login more than once in the same application process;
5. confirm an actually incorrect password still produces the normal failed-password behavior and lockout protections;
6. confirm the Dark Login artwork renders cleanly at normal application size with the Login controls readable on the left;
7. confirm Light and Colorful use the matching light artwork with readable theme-appropriate text and controls.
