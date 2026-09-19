# SafeLedger 2.6.62 — Complete Local Icon Registry

SafeLedger 2.6.62 carries forward the full 2.6.61 candidate and closes the remaining gaps in SafeLedger's offline icon layer.

## What was found

SafeLedger intentionally keeps a visible dot as a diagnostic fallback for an icon class that has no local definition. After fixing Emergency Recovery in 2.6.61, a broader audit found **12 additional live icon classes** that were still referenced by the application without matching artwork in `src/main/css/local-icons.css`.

Those unmapped classes could therefore appear as dots even though the surrounding feature requested a meaningful icon.

## Icons repaired

The central local icon layer now defines all 12 known gaps:

- `fa-clock-o` — inactivity/clock status
- `fa-archive` — backup created / archive status
- `fa-user-plus` — Profile created
- `fa-user-times` — Profile deleted
- `fa-exclamation-circle` — error / Self-Destruct warning status
- `fa-mobile` — lost hardware wallet or device recovery scenario
- `fa-database` — SafeLedgerData device failure scenario
- `fa-map-marker` — unavailable recovery-location scenario
- `fa-users` — family recovery scenario
- `fa-unlock-alt` — exchange lockout scenario
- `fa-folder-o` — Profile results in Global Search
- `fa-globe` — Website/Web3 account fallback artwork

The higher-value interface icons are drawn with local CSS shapes so they stay crisp, monochrome, theme-aware, and available with no network connection. `fa-unlock-alt` deliberately shares the existing locally drawn unlocked-padlock artwork rather than creating a second visual language for the same concept.

## Permanent prevention

2.6.62 adds an **automatic icon registry gate** to the normal regression suite.

The test scans SafeLedger runtime JavaScript and HTML for every static `fa-*` and `glyphicon-*` icon reference, adds the known generated chevron states, then compares those references against the selectors actually defined in `local-icons.css`.

If future UI code introduces an icon class without adding local artwork, CI now fails and reports the missing class plus the source file that referenced it. This turns the generic dot into a development diagnostic instead of something users should discover in a packaged build.

The generated `renderer.bundle.js` is intentionally excluded from the scan because it duplicates source modules after the renderer build. The scan uses the authored runtime source as the authority.

## Why the fallback dot remains

The generic dot is still retained for genuinely unknown classes. Removing it would make an icon failure invisible. With the registry test in place, the dot remains useful as a defensive diagnostic while CI prevents known runtime icon names from reaching release unmapped.

## Regression coverage

The 2.6.62 release gate verifies that:

- all 12 previously unmapped classes now have local definitions;
- all five What Happens If scenarios keep their intended semantic icons;
- Activity History/status mappings continue using their repaired icon names;
- Global Search Profile results keep `fa-folder-o`;
- unrecognized Website/Web3 accounts keep `fa-globe`;
- the 2.6.61 Emergency Recovery lifebuoy contract remains active;
- the new registry scanner is part of the full regression chain;
- no current runtime icon class is allowed to silently depend on the generic dot.

## Release process

This remains a **candidate update** until CI builds and hands-on testing are complete. Do not merge it to `master` until the Windows, Linux, and macOS workflows pass and the repaired icons have been visually checked in the packaged application.
