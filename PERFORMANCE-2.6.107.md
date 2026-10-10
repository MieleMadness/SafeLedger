# SafeLedger 2.6.107 Profile Icon Picker Performance Notes

## Reported behavior

Hands-on testing of 2.6.106 found that Add Profile / Modify Profile, switching icon categories, saving, and returning to Profile display were noticeably slower than the rest of SafeLedger.

## Root cause

The first picker implementation rendered a large category synchronously. More importantly, `createIcon()` resolved each Web3 selection by calling `web3Icons.entries(category).find(...)`. `entries(category)` rebuilt and sorted the complete category each time. Rendering many tiles therefore repeated full-catalog work for each icon and created an avoidable quadratic-style hot path.

## Durable fix

2.6.107 replaces that path with:

- one cached Web3 catalog per category;
- one direct canonical `entry(category, key)` lookup for individual icon rendering;
- one cached picker search catalog per group;
- bounded 72-item DOM batches;
- incremental loading while scrolling or by explicit Show More control;
- selection-state updates without rebuilding the grid;
- asynchronous SVG image decoding.

The full icon catalog remains searchable and selectable. This is a rendering/lookup optimization only; it does not reduce available icons or change Profile icon persistence.

## Why this is not a bandaid

The fix removes the repeated source of work instead of inserting delays or hiding the picker. Catalog ownership is explicit and cached at the module level, saved Profile icons resolve directly by validated identifier, and the picker only materializes the portion of the catalog the user can currently interact with.

The regression contract protects those architectural properties so future picker changes do not accidentally restore full-category scans or all-at-once DOM rendering.
