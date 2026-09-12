# SafeLedger 2.6.77 — Chain Games Regression Gate Repair

SafeLedger 2.6.77 carries forward the complete 2.6.76 candidate and repairs the regression-test false positive that caused all three 2.6.76 platform workflows to turn red.

## What failed in 2.6.76

Windows Portable, Linux AppImage, and macOS Apple Silicon all reached the regression-test step and failed in `hotfix-2.6.76-tests.js` before packaging.

The Chain Games application code was not the cause. The updated historical 2.6.4 Chain Games regression had already run successfully. The failure came from a new 2.6.76 meta-test that tried to determine whether the historical test required the retired gradient logo by substring-searching the historical JavaScript source.

The historical test correctly contained a negated assertion that the old gradient must **not** return. Because the raw substring appeared inside that negated assertion, the 2.6.76 meta-test misread it as a positive requirement and produced a false positive.

## Root-cause fix

The repaired 2.6.76 gate no longer attempts to infer JavaScript assertion polarity from source text. A substring search cannot reliably distinguish `assert(x)` from `assert(!x)` when both contain the same inner expression.

Instead, SafeLedger now uses behavior-based validation: the current Chain Games checks verify the rendered SVG directly, and the historical `hotfix-2.6.4-tests.js` gate is executed as a test. If the historical behavior is wrong, that test fails naturally.

This removes the brittle meta-test rather than adding an exception around it.

## Chain Games logo remains unchanged

There are **no production application or logo code changes** in 2.6.77 relative to 2.6.76.

The project-owner supplied white circular Chain Games mark remains the canonical artwork for both:

- Chain Games Vault Item / Web3 service artwork;
- CHAIN assets identified as Chain Games assets.

The mark remains on the local dark backing for cross-theme visibility and remains fully local/offline with no favicon or network dependency.

## Regression coverage

A new `hotfix-2.6.77-tests.js` gate verifies that:

- the brittle 2.6.76 source-text polarity assertion stays removed;
- the historical 2.6.4 Chain Games regression is validated by execution;
- the repaired 2.6.76 Chain Games gate passes;
- the reason for avoiding substring-based assertion-polarity checks remains documented;
- these release notes preserve the CI root cause and test-only scope.

## Release safety

This is a cumulative candidate. **Do not merge to `master` until Windows, Linux, and macOS CI pass and the Chain Games artwork is hands-on approved.**
