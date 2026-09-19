# SafeLedger 2.6.64 — Cross-Platform Icon Registry Gate

SafeLedger 2.6.64 carries forward the complete icon cleanup and scanner hardening from 2.6.63, then fixes a Windows-only newline assumption in the new registry test.

## What Windows CI found

The corrected 2.6.63 scanner passed the complete Linux runtime icon scan. Windows reached the same registry gate but failed a separate assertion that checked the diagnostic fallback rule using an exact LF-only string.

Windows checks out text using CRLF line endings, so the underlying CSS was correct but the test compared it against Linux/macOS newline formatting.

## Correct fix

The registry test now normalizes CRLF and CR line endings to LF before performing the exact fallback-contract check. Icon discovery itself remains unchanged and continues to compare actual runtime icon references with real selectors in `local-icons.css`.

A dedicated 2.6.64 regression gate verifies that a Windows-style CRLF version of the fallback rule normalizes to the same contract used on Linux and macOS.

This is a test portability correction only. No application icon artwork from 2.6.62/2.6.63 was removed or weakened.

## Icon coverage retained

The candidate still includes the 12 repaired mappings discovered during the broader icon audit, all five What Happens If scenario icons, Activity History/status icons, Global Search Profile folder artwork, the Website/Web3 globe fallback, and the Emergency Recovery lifebuoy from 2.6.61.

The permanent registry scanner continues to fail CI if a real runtime `fa-*` or `glyphicon-*` class has no matching local definition.

## Release process

This remains a **candidate update**. Do not merge it to `master` until Windows, Linux, and macOS workflows pass and the repaired icons are visually approved in the packaged application.
