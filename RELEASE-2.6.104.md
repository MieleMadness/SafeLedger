# SafeLedger 2.6.104

## Navigation and re-login regression repair

SafeLedger 2.6.104 follows the completed 2.6.103 cleanup candidate and fixes two hands-on regressions found during testing: the Detail/display column retaining its previous scroll position when a different Profile, Vault Item, or Asset is selected, and re-login reliability after SafeLedger is locked.

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

## Approved Dark login artwork

The Dark-mode Login display now uses the third user-approved crypto/security composition. The artwork preserves the clear left-side area needed for the Login controls while grouping Bitcoin, Ethereum, Solana, network, wallet, lock, and Chain Games iconography on the right so Chain Games appears as one part of the broader crypto ecosystem rather than the focal brand.

The approved raster is embedded inside the existing local `login-background-dark.svg` asset. This keeps the existing theme/layout ownership intact, adds no network request or remote asset dependency, and avoids introducing a second competing Dark login wallpaper. Light and Colorful login artwork are unchanged.

The appearance regression also verifies that Dark continues to use the approved local asset, that Light/Colorful retain their existing artwork mapping, and that the Dark artwork contains no remote `http` or `https` dependency.

## Security scope

This release does not weaken encryption or lock behavior. It does not cache passwords, retain the DEK through a lock, bypass Argon2id, bypass the encrypted key envelope, alter failed-password accounting, alter Self-Destruct behavior, or change encrypted vault formats.

Emergency Lock still destroys the in-memory DEK. Re-login still requires the correct password to unwrap the encrypted key envelope and establish a new main-process-only DEK session.

The Login artwork remains packaged locally with SafeLedger and does not add a runtime network dependency.

## Test integration

The existing 47 canonical regression suites remain unchanged. `navigation-relogin-regression-tests.js` is additionally owned explicitly by the package test commands and runs as part of `npm run test:regression` and `npm run test:device-security`, so supported-platform CI must exercise these two reported regressions on every candidate.

## Release safety

Do not merge this candidate to `master` until Windows Portable, Linux AppImage, and macOS Apple Silicon workflows all pass on the exact final 2.6.104 head and hands-on testing confirms:

1. scroll down in one Vault Item, select another Vault Item, and confirm the Detail display starts at the top;
2. repeat the same check between Profiles and Assets;
3. unlock SafeLedger, use Emergency Lock, return to the Login screen, and sign in again with the same password;
4. repeat lock/re-login more than once in the same application process;
5. confirm an actually incorrect password still produces the normal failed-password behavior and lockout protections;
6. confirm the approved Dark login artwork fits the display column without interfering with Login text or controls.
