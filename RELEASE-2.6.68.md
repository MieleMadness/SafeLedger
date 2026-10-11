# SafeLedger 2.6.68 — Consistent Panel and Tile Spacing

SafeLedger 2.6.68 carries forward the complete 2.6.67 candidate and standardizes the spacing used by the main card/panel containers reviewed during hands-on testing.

## Root cause

Two separate spacing layers were stacking on top of each other:

- the **Appearance** tile grid had its own bottom margin in addition to the Settings panel's bottom padding;
- each **Vault Inventory / Recovery Health** stat tile inherited the generic standalone-card bottom margin even though the tiles already live inside a grid.

That meant the outer panel could have correct padding while still looking like it had too much space below the tiles.

## Shared spacing contract

The current UI now uses two explicit spacing levels:

- **14px major-panel padding** for Settings sections, Vault Inventory, Recovery Health, Recovery Readiness, and the Recovery Drill wizard card;
- **12px information-tile padding** for Appearance choices, dashboard stat tiles, security scorecards, and maintenance cards.

This follows the visual rhythm already working well in **Backup & Recovery** instead of adding one-off fixes per screen.

## Appearance

The Appearance tile grid no longer adds a second bottom gutter. The Settings panel itself now owns the space below the tiles, so the bottom spacing matches the panel's side padding.

## Vault Inventory and Recovery Health

The oversized space below the stat tiles was not coming from the outer block anymore. It was coming from the generic 16px margin attached to each `.dashboard-stat` card.

Inside `.dashboard-stats`, those tiles now have zero external bottom margin. The outer Vault Inventory and Recovery Health panels use the same 14px padding on every side.

## Container audit

The main panel/card families were reviewed and grouped by purpose rather than forcing one padding value onto every UI element:

- major content panels use the 14px panel rhythm;
- compact information tiles use the 12px tile rhythm;
- list rows, form controls, disclosure rows, and navigation items keep their intentionally different interaction padding because they are not panel containers.

This avoids flattening every component into the same geometry while still making card-style containers visually consistent across the app.

## Regression coverage

The 2.6.68 regression gate verifies:

- the 14px major-panel token remains active;
- the 12px information-tile token remains active;
- Appearance does not stack an extra bottom margin beneath its tiles;
- dashboard stat tiles do not carry standalone-card bottom margins inside a grid;
- Vault Inventory and Recovery Health grids do not add an extra bottom gutter;
- Appearance and Backup & Recovery still use the same Settings section component;
- the spacing contract loads after the historical consolidated UI cascade;
- the older 2.6.66 spacing regression was updated to validate the current shared contract instead of an obsolete exact CSS declaration;
- no `!important`, timer, MutationObserver, synthetic event, or DOM repair workaround was added to the spacing contract.

## Hands-on test focus

1. Open **Settings → Appearance** and confirm the space below the tiles visually matches the left/right panel padding.
2. Compare Appearance directly with **Backup & Recovery** and confirm both feel like the same container system.
3. Open **Vault Overview** and confirm **Vault Inventory** and **Recovery Health** no longer have the large empty strip below the stat tiles.
4. Check Light, Colorful, and Dark appearances to confirm the spacing remains identical across themes.
5. Spot-check Recovery Readiness and Recovery Drill cards for balanced panel padding.

## Release safety

This is a cumulative candidate. **Do not merge to `master` until Windows, Linux, and macOS CI pass and the spacing changes are hands-on approved.**
