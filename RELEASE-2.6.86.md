# SafeLedger 2.6.86 — Repair Punctuation-Sensitive Focus Artwork Regression

SafeLedger 2.6.86 carries forward the complete 2.6.85 candidate and fixes the regression-only failure that made the 2.6.85 Windows, Linux, and macOS workflows red.

## What failed

All three workflows reached the focused-column regression and failed on this documentation assertion:

`2.6.84 release notes must mention: main focus`

The 2.6.84 release notes already contained the correct concept as the heading `Main-focus behavior`, but the historical test compared raw lowercase text and treated the hyphen as a semantic difference.

## Root cause

This was a brittle documentation test, not a production UI failure. The focused Profile, Vault, and Asset artwork logic and the 2.6.85 capture-phase click-order repair had already passed their behavior checks.

The same brittle pattern could also fail on other harmless punctuation changes such as `local/offline` versus `local offline`.

## Fix

The 2.6.84 documentation gate now normalizes punctuation to spaces, collapses whitespace, and then checks the intended concepts. That keeps the regression focused on meaning instead of exact punctuation.

The original 2.6.84 wording remains unchanged. SafeLedger does not rewrite release copy merely to satisfy a brittle test.

A new 2.6.86 gate directly executes the repaired 2.6.84 test and the 2.6.85 click-order test, and protects the punctuation-tolerant behavior from regressing.

## Production scope

There are **no production UI changes** in 2.6.86.

The focused-column behavior remains:

- Profile click → Profile artwork only.
- Vault Item click → Vault artwork only.
- Asset click → Asset artwork only.
- Home, Activity History, and Settings → all three navigation columns return to solid colors.
- Existing column divider lines remain unchanged.

The local/offline Profile, Vault, and Asset artwork and the 2.6.85 capture-phase click handling are carried forward unchanged.

## Security / behavior scope

No authentication, encryption, password, lockout, recovery, vault-data, storage-path, network-permission, persistence, or packaging behavior changes.

Do not merge to `master` until Windows, Linux, and macOS CI pass and the focused-column behavior is hands-on approved.
