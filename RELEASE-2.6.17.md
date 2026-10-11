# SafeLedger 2.6.17 workflow candidate

SafeLedger 2.6.17 carries forward the fully green 2.6.16 candidate, makes the top-right status component quieter and more compact based on hands-on feedback, and completes the last item in the planned renderer/UI cleanup sequence by moving preferred startup sizing out of the renderer and into the Electron main process.

## Quieter, more compact status messages

- Status boxes size to their content instead of stretching across the remaining utility-bar width.
- Padding now matches the surrounding field/control rhythm at 6px vertical and 12px horizontal.
- The readable 15px semibold typography and Light/Dark semantic colors remain unchanged.
- Routine successful reads such as `Load successful.` and `Loaded Successfully` no longer display a confirmation.
- The temporary `Processing` notice is no longer shown for ordinary reads.
- Successful user changes such as saves, updates, deletes, settings changes, and security changes still display confirmation.
- Errors and actionable notices remain visible.
- Status text remains text-only rather than injected HTML.

## Native startup window sizing

- Adds `src/main/window-sizing-main.js` as the single preferred-size policy owner.
- Adds `src/main/startup.js` as the Electron entry point and installs preferred sizing before the established bootstrap runtime creates the primary window.
- Keeps the established preferred 1400x750 target and never shrinks an already larger window.
- Caps the preferred target to the primary display work area before applying the existing grow-only behavior.
- Removes the renderer `ui-scale-2.6.7.js` helper and its `DOMContentLoaded` / `window.resizeTo` side effect.
- Renderer entry no longer owns or knows about application-window sizing.

## Cleanup sequence status

The original eight-part UI/renderer cleanup sequence is now complete:

1. Consolidate Vault Item rendering — complete.
2. Move Add Asset selection into the real handler — complete.
3. Render Cancel actions directly — complete.
4. Move multichain fields into the Asset renderer — complete.
5. Render Vault detail artwork directly in `group.js` — complete.
6. Move preferred window sizing into Electron main-process ownership — complete in 2.6.17.
7. Consolidate the CSS cascade and retire historical patch files — complete in 2.6.14-2.6.16.
8. Add durable cross-platform visual regression coverage — complete in 2.6.15-2.6.16.

After this candidate, the remaining release work is hands-on regression validation and an intentional decision about when to promote the cumulative candidate to a new 2.x release line.

## Security / compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Workflow rule

This is a **2.6.x workflow/test candidate**. Do **not** merge it to `master`. Validate with Windows Portable, Linux AppImage, native Apple Silicon workflows, and hands-on testing. Promotion to `master` remains reserved for an intentional move to a new 2.x release number.
