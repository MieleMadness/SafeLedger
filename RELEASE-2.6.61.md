# SafeLedger 2.6.61 — Emergency Recovery Icon

SafeLedger 2.6.61 carries forward the full 2.6.60 candidate and fixes the Emergency Recovery action icon.

## What was wrong

SafeLedger intentionally has a generic dot fallback for local icon names that do not have a dedicated definition. The Profile action and Emergency Package generator were already requesting `fa-life-ring`, but `src/main/css/local-icons.css` did not define that icon. As a result, Emergency Recovery rendered as the generic dot instead of a meaningful recovery symbol.

## Fix

`fa-life-ring` now has a dedicated CSS-drawn **lifebuoy** icon in the central local icon layer.

- The Profile detail action for **Emergency Recovery Package** now displays a recognizable recovery/lifebuoy symbol.
- **Generate Emergency Package** uses the same icon automatically.
- The icon uses `currentColor`, so Light, Colorful, Dark, hover, focus, and disabled states continue to control its color naturally.
- The icon is entirely local CSS. It does not require an icon font, internet connection, SVG download, or platform-specific character.
- The fix is made at the root icon mapping rather than replacing one button with an unrelated symbol or adding a post-render patch.

## Regression coverage

The 2.6.61 regression gate verifies that:

- both Emergency Recovery actions continue to request `fa-life-ring`;
- the local icon layer contains a real `fa-life-ring` drawing;
- the life-ring cannot silently fall back to the generic dot again;
- the general unknown-icon fallback remains available for catching future unmapped icon names;
- the 2.6.60 recovery-resolution contract remains active.

## Release process

This remains a **candidate update** until CI builds and hands-on testing are complete. Do not merge it to `master` until the Windows, Linux, and macOS workflows pass and the Emergency Recovery icon has been visually confirmed in the packaged application.
