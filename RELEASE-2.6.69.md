# SafeLedger 2.6.69 — CI Regression Gate Repair

SafeLedger 2.6.69 carries forward the complete 2.6.68 candidate with **no production UI change**. This patch fixes the regression test that caused the Windows, Linux, and macOS workflows for 2.6.68 to fail.

## What failed

The 2.6.68 application behavior passed the regression suite all the way through the new spacing checks. The failure occurred at the end of `scripts/hotfix-2.6.68-tests.js`.

The release notes correctly contained a `## Root cause` heading, but the test looked for the exact lowercase substring `root cause` using a case-sensitive string comparison. Because JavaScript `String.includes()` is case-sensitive, `Root cause` did not satisfy that assertion.

## Fix

The 2.6.68 gate now normalizes the release-note text to lowercase before checking for the semantic phrase `root cause`.

This keeps the useful documentation requirement while removing an accidental dependency on heading capitalization. The spacing implementation itself is unchanged.

## Carried-forward 2.6.68 behavior

- Settings → Appearance follows the same panel rhythm as Backup & Recovery.
- Vault Inventory and Recovery Health do not stack extra bottom margins below their tile grids.
- Major panels use the shared 14px padding contract.
- Information tiles use the shared 12px padding contract.
- The preferred startup window remains 1283 × 800.
- Settings still opens at the top.
- SafeLedger 1.x import still uses the visible JSON file picker.
- All prior recovery, security, icon-registry, and data-ownership protections remain in place.

## Regression coverage

The 2.6.69 gate verifies that:

- the broken case-sensitive `release.includes('root cause')` assertion stays retired;
- the 2.6.68 test checks the release-note requirement semantically after lowercasing;
- the 2.6.68 release notes still document the root cause;
- the 2.6.68 spacing gate executes successfully from the 2.6.69 gate;
- no production UI code was changed for this repair.

## Release safety

This is a cumulative candidate. **Do not merge to `master` until Windows, Linux, and macOS CI pass and the 2.6.68 spacing refinements are hands-on approved.**
