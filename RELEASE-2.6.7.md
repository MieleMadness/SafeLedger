# SafeLedger 2.6.7 — Add Asset Reliability & Interface Refinements

SafeLedger 2.6.7 fixes the Add Asset renderer regression found by comparing the current application with the known-good 2.6.0 path, preserves Profile detail navigation, and applies a coordinated readability/theme refinement without changing encrypted vault data or security behavior.

## Add Asset reliability

The core `renderer.js` / `record.js` Add Asset path remains the same path that worked in SafeLedger 2.6.0. The regression was introduced later by the multichain Asset-form enhancement that adds Network and Contract address fields.

`asset-multichain-ui.js` watched `document.body` for mutations while also rewriting its own Asset-form title and helper note. Those writes could generate more mutations and repeatedly wake the same observer after the original Add Asset form rendered.

2.6.7 makes the enhancer idempotent:

- text is written only when its value actually changes;
- already-prepared Network and Contract address rows are no-ops on later passes;
- the MutationObserver disconnects while SafeLedger patches its own form and reconnects afterward;
- the original encrypted Add Asset save path remains unchanged.

Regression coverage applies the enhancer twice and requires the second identical pass to create zero repeat title/note writes.

## Profile and Vault navigation

An earlier Add Asset repair used a separate renderer module that maintained its own `activeVaultData`, subscribed to IPC results, intercepted the Add Asset button in the capture phase, and simulated a Vault Item click before the real Add Asset handler ran. That repaired selection, but it duplicated state ownership and made the Add Asset path depend on DOM event ordering.

2.6.7 removes that patch architecture:

- clicking a Profile keeps the Profile detail panel visible;
- clicking a Vault shows that Vault's detail panel normally;
- the real Add Asset handler in `renderer.js` now owns the complete selection decision using the authoritative `vaultData` object it already maintains;
- the passive `vault-item-selection.js` helper only validates/updates selection state and has no IPC subscription, DOM lookup, event listener, timer, or synthetic click;
- when Add Asset is requested without a valid Vault Item selection, the first available Vault Item is selected directly in application state, the stale Vault search filter is cleared so that destination is visible, the Vault/Asset columns refresh, and the normal `record.createRecord()` path opens;
- the former capture-phase `vault-item-selection-ui.js` module is removed from both the repository and renderer bundle;
- the bottom action is shortened from **Add Vault Item** to **Add Vault**.

The renderer bridge still fans one renderer-world result object to its listeners, but Add Asset reliability no longer depends on a second UI module receiving and mutating that object before the real click handler runs.

## Vault Item renderer consolidation

SafeLedger had accumulated several post-render UI modules for Vault Items. The core `group.js` renderer would build a Wallet/Vault Item screen, then separate MutationObservers would rename terminology, split Web3/Website account types, rebuild preset dropdowns, replace service icons, and adjust the same form after it had already rendered. Those modules required conflict guards because more than one observer could believe it owned the same DOM.

2.6.7 consolidates that behavior into the real Vault Item render path:

- `group.js` now renders Vault Item list wording, detail wording, account categories, icons, and edit-form behavior directly;
- the passive `vault-item-presentation.js` helper owns category normalization, grouped type options, wallet/exchange/Web3/website presets, known-service icons, and legacy `Web3 / Website Account` interpretation;
- standard account custom fields use a direct idempotent `ensureField()` editor API instead of programmatically clicking **Add custom field**;
- Vault Overview, Global Search, Profile empty states, Test Recovery, Recovery Binder, and Recovery Intelligence now create their Vault Item terminology directly rather than relying on a later document-wide text replacement;
- the five retired post-render modules (`vault-item-ui.js`, `service-catalog-ui.js`, `vault-item-type-split-ui.js`, `vault-item-wallet-presets-ui.js`, and `vault-language-ui.js`) are removed from the repository and renderer bundle;
- existing legacy combined Web3/Website records remain readable without a vault migration: known Web3 services resolve to **Web3 Account**, while ordinary sites resolve to **Website Account** for presentation/editing.

The canonical presentation helper has no MutationObserver, DOMContentLoaded handler, timer, microtask queue, or synthetic button-click path. Regression coverage requires those retired observer files to remain absent and preserves the existing account types, grouped presets, Chain Games behavior, local service/wallet icons, and legacy-category compatibility.

The separate Vault Item asset-seeding compatibility helper remains unchanged in this cleanup; it will be evaluated independently rather than broadening this renderer consolidation into unrelated save-state behavior.

## Readability and icon scale

The content interface is scaled modestly while action controls keep their existing dimensions:

- base UI text: **14px → 15px**;
- supporting text: **13px → 14px**;
- small/helper text: **12px → 13px**;
- Vault and Asset navigation artwork: **28px → 32px** desktop;
- compact Vault and Asset navigation artwork: **24px → 28px**;
- Asset detail artwork: **54px → 60px** desktop and **46px → 52px** compact;
- Vault detail views now show matching local/offline artwork at **60px** desktop and **52px** compact;
- selected Vault and Asset rows use a **white border with no filled selection background**, matching the Profile selection language.

The detail-action buttons, top utility buttons, and Emergency Lock dimensions are not enlarged by this change.

## Preferred opening size

SafeLedger's preferred opening workspace grows from **1200×750** to **1400×750** when the display has room. The helper does not shrink an already-larger user/OS window and caps the requested size to available screen space.

The four-column proportions remain the existing **2 / 2 / 3 / 5** layout.

## Light/dark theme consistency

Windows and Linux native Electron application menus cannot reliably inherit SafeLedger renderer colors. On those platforms, 2.6.7 uses a small SafeLedger-owned **SafeLedger / Edit** menu bar that follows the same light/dark background and text variables as the detail workspace. macOS retains the native application menu to preserve normal macOS conventions.

The themed menu does not grant renderer privileges. Its commands cross a narrow preload/main-process bridge, the sender is checked against the trusted SafeLedger window, and Edit commands are allow-listed.

The bottom **Add Profile / Add Vault / Add Asset** buttons now use the same themed surface, border, shadow, hover/focus tint, and pressed-state language as detail-action buttons. Existing semantic detail-action colors such as Save, Delete, Print, and Favorite remain intact.

Scrollbars are also theme-aware:

- the light detail workspace uses muted gray-blue tracks/thumbs;
- dark mode uses dark slate tracks with a clearly visible lighter thumb;
- the three blue Profile/Vault/Asset columns use translucent light scrollbar treatment matched to those column backgrounds.

## Login password eye stability and alignment

The login password visibility control had two separate historical issues.

First, the eye could move down and partly outside its input when hovered or focused. Its earlier positioning used `top: 50%` plus `translateY(-50%)`, while the shared 2.5.15 button interaction contract intentionally resets transforms to `none` so ordinary buttons never jump on hover/focus. The 2.5.16 correction therefore centered the control with a property that the generic button system was designed to remove.

Second, the eye artwork itself could sit toward the left side of its 34×28 hover target. Comparing the login control with the known-good 2.5.11 editable sensitive control showed the missing ownership: the sensitive-control eye explicitly centered its SVG with `margin: auto`, while the login eye depended on generic `.field-inline-action` flex behavior.

2.6.7 now gives the password eye a complete, self-contained layout contract:

- the 34×28 button is vertically centered using `top: 0`, `bottom: 0`, and automatic vertical margins;
- layout no longer depends on any transform;
- the password-eye button explicitly owns `inline-flex`, `align-items: center`, and `justify-content: center`;
- the 22×16 SafeLedger eye SVG is explicitly centered inside that button with automatic margins;
- hover/focus color therefore stays on the same button box and the eye remains centered inside it;
- no extra last-loaded 2.6.7 eye override stylesheet is used.

Regression coverage separately protects the button's field alignment and the SVG's alignment inside the hover target, and explicitly rejects a return to the earlier `translateY(-50%)` dependency.

## Security and compatibility

This release does **not** change:

- the encrypted vault schema;
- AES-256-GCM vault encryption;
- Argon2id master-password protection;
- the main-process-only DEK boundary;
- SafeLedger 2.x vault compatibility;
- read-only 1.x import behavior;
- backup/restore formats;
- Self-Destruct semantics;
- Privacy Mode or Recovery Intelligence secret-handling rules;
- offline/local icon behavior;
- runtime network requirements.

## Validation target

The final 2.6.7 release head must pass the locked regression suite, Electron crypto smoke test, real GUI smoke test, and packaged artifact workflows on Windows x64, Linux x64, and native macOS Apple Silicon before promotion to `master`.