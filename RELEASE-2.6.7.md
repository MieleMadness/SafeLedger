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

A separate selection helper introduced during earlier Add Asset repairs was automatically clicking the first visible Vault Item after every successful Profile `vault-read`. That meant the Profile detail screen could appear briefly and then be replaced by the first Vault detail even though the status correctly said `Load successful`.

2.6.7 removes that post-load automatic navigation:

- clicking a Profile keeps the Profile detail panel visible;
- clicking a Vault shows that Vault's detail panel normally;
- if Add Asset is requested without a valid Vault selection, SafeLedger repairs the selection only at that moment through the normal Vault click path;
- the bottom action is shortened from **Add Vault Item** to **Add Vault**.

Historical regressions now protect the Vault add action and on-demand selection behavior without forcing the retired automatic Profile-to-Vault navigation or the older button wording.

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
