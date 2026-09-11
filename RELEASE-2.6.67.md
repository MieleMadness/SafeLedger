# SafeLedger 2.6.67 — Regression Gate Repair

SafeLedger 2.6.67 carries forward the complete 2.6.66 candidate with no additional production UI change. It fixes an outdated regression assertion that still required the older redundant Recovery Needs Attention wording.

## Why 2.6.66 failed

Windows, Linux, and macOS all reached the same `development-2.5.12-tests.js` regression gate and failed on this historical assertion:

`Each item shows its readiness score and the most important recovery gaps.`

2.6.66 intentionally removed that second helper paragraph because the section heading help text now contains the consolidated instruction requested during hands-on testing.

The application code was using the intended 2.6.66 copy; the failure was the older test expecting superseded wording.

## Fix

The historical regression now verifies the current behavior instead of preserving stale copy. It checks that Recovery Needs Attention still explains:

- that non-ready Vault Items appear with readiness score and important gaps; and
- that **Resolve** opens the Vault Item needing work.

This keeps the original purpose of the regression—ensuring Recovery Needs Attention remains explanatory and actionable—without forcing duplicated text back into the UI.

## Production behavior carried forward from 2.6.66

- preferred startup size remains **1283 × 800**;
- Recovery Needs Attention keeps the single consolidated instruction;
- Vault Inventory and Recovery Health retain balanced 14px bottom/side spacing;
- Settings opens at the top;
- SafeLedger 1.x import uses the visible JSON file picker;
- icon-registry coverage and all prior security/data-ownership protections remain unchanged.

## Release safety

This remains a cumulative candidate. **Do not merge to `master` until Windows, Linux, and macOS CI pass and the 2.6.66 UI refinements are hands-on approved.**
