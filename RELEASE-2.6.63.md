# SafeLedger 2.6.63 — Icon Registry Scanner Boundary Fix

SafeLedger 2.6.63 carries forward the complete 2.6.62 icon cleanup and corrects two false positives discovered immediately by the new automatic icon registry gate.

## What CI caught

The first 2.6.62 Linux regression run correctly exercised the new scanner, but the scanner itself was too permissive when identifying `fa-*` tokens.

It reported two classes that were not real icons:

- `fa-chevron` — extracted from the dynamic template prefix `fa-chevron-${...}` even though the only generated runtime values are `fa-chevron-left` and `fa-chevron-right`.
- `fa-f` — extracted from hexadecimal validation expressions containing ranges such as `[0-9a-fA-F]`.

These were **scanner false positives**, not additional missing UI artwork.

## Correct fix

The scanner now requires complete token boundaries before and after an icon class. A candidate match cannot begin or end in the middle of another alphanumeric/hyphenated expression.

The known generated navigation values remain explicitly registered as `fa-chevron-left` and `fa-chevron-right`, so dynamic icon generation is still covered without treating an incomplete template prefix as an icon.

A small `extractIconTokens()` helper also makes the scanner behavior directly testable. The 2.6.63 regression gate proves that:

- a real `fa-mobile` reference is detected;
- a real `glyphicon-save` reference is detected;
- `fa-chevron-${...}` is not treated as the nonexistent `fa-chevron` class;
- hexadecimal ranges such as `[0-9a-fA-F]` do not produce a fake `fa-f` icon;
- the complete runtime scan still reports zero undefined icons.

## 2.6.62 icon cleanup remains intact

All 12 real missing icon definitions added in 2.6.62 remain unchanged, including the five What Happens If scenario icons, Activity History/status icons, Global Search Profile folder, and Website/Web3 globe fallback. The 2.6.61 Emergency Recovery lifebuoy also remains intact.

## Release process

This is still a **candidate update**. Do not merge it to `master` until Windows, Linux, and macOS workflows pass and the repaired icons have been visually checked in the packaged application.
