# SafeLedger 2.6.23 workflow candidate

SafeLedger 2.6.23 carries forward the fully green 2.6.22 candidate and applies a focused hands-on UI cleanup.

## Cleaner dropdowns
- Vault Item type and known-item dropdowns no longer repeat their visible field instruction as the first row of the opened option list.
- The visible labels above the controls remain the single source of instruction.
- Actual grouped choices and alphabetization are unchanged.

## Recovery Instructions resizing
- The Recovery Instructions textarea remains resizable vertically.
- Horizontal resizing is constrained to the current form/detail width so it cannot be dragged beyond the SafeLedger window and clipped.

## Asset identity instead of Additional Fields clutter
- SafeLedger still retains **Network** and **Contract address** because they are necessary to distinguish multichain assets that may share a symbol, such as the reviewed CHAIN Ethereum, Polygon, and Chain Games Supernet records.
- Those two values now render as normal Asset edit fields instead of appearing inside a `Network & Additional Fields` editor.
- Assets no longer expose an `Add custom field` control.
- Older additional Asset custom-field data is preserved in the encrypted record when edited so this UI cleanup does not silently delete existing user data.
- The underlying `customFields` storage representation remains unchanged for 2.x compatibility.
- Vault Item custom fields remain available and unchanged.

## Shit Coin Mode polish
- The 💩 fallback has no generic tile background or border.
- The emoji is larger in both Asset navigation and Asset detail so its visual footprint better matches branded icons.
- The Shit Coin Mode Settings control now follows the same standard checkbox + Save button treatment used by other SafeLedger settings.
- Disabling Shit Coin Mode restores the original ticker fallback immediately.

## Security and compatibility
No changes to:
- encrypted vault schema
- AES-256-GCM
- Argon2id
- main-process DEK/session boundary
- SafeLedger 2.x compatibility
- SafeLedger 1.x read-only import
- backup/restore format
- Self-Destruct semantics
- Privacy Mode
- Recovery Intelligence secret handling
- portable-storage behavior
- offline/runtime network behavior

## Workflow rule
This is a **2.6.x workflow/test candidate**. Do **not** merge it to `master`. Validate Windows Portable, Linux AppImage, native Apple Silicon, full regression, crypto smoke, real GUI smoke, and hands-on behavior. Promotion to `master` remains reserved for an intentional move to a new 2.x release number.
