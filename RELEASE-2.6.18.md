# SafeLedger 2.6.18 workflow candidate

SafeLedger 2.6.18 carries forward the 2.6.17 compact-status and main-process sizing work, while correcting the Electron entry ownership so the existing portable-storage security boundary remains the package entry point.

## Why 2.6.18 exists

The 2.6.17 application and UI regressions passed through the new notice behavior, window-sizing checks, visual baseline, sandbox, crypto, and runtime-modernization gates. The native Apple Silicon run then stopped at the device-security regression because `package.json` had been changed from `src/main/bootstrap.js` to a temporary `src/main/startup.js` wrapper.

That regression protects an important SafeLedger rule: the established bootstrap must verify portable-storage safety before the normal runtime is allowed to create `SafeLedgerData`. The gate is correct and is not being weakened.

## Trusted bootstrap + main-process sizing

- `package.json` again points directly to `src/main/bootstrap.js`.
- The temporary `src/main/startup.js` wrapper is removed.
- `bootstrap.js` imports the main-process window-sizing policy and Electron `screen` API directly.
- Preferred sizing is installed only inside the `startupStorageStatus.allowed` branch.
- The sizing hook is installed before `main.js` creates the primary BrowserWindow.
- Blocked/translocated/read-only macOS startup paths still never load `main.js` and do not create SafeLedger data.
- Renderer-owned `ui-scale-2.6.7.js` remains removed.
- Preferred 1400x750 grow-only sizing remains unchanged.

## Status-message feedback carried forward

- Compact content-width status boxes.
- 6px vertical / 12px horizontal field-style padding.
- Routine successful reads and profile loads stay silent.
- Routine reads do not show a temporary Processing notice.
- User changes still show success confirmation.
- Errors and actionable notices remain visible.
- Light/Dark contrast and text-only rendering remain protected.

## Cleanup sequence status

The original eight-part UI/renderer cleanup remains complete. 2.6.18 is a security-boundary correction to the final window-sizing ownership step, not a new cleanup section.

After this candidate, remaining work is hands-on regression validation and deciding when the cumulative candidate should be promoted to a new 2.x release line.

## Security / compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Workflow rule

This is a **2.6.x workflow/test candidate**. Do **not** merge it to `master`. Validate with Windows Portable, Linux AppImage, native Apple Silicon workflows, and hands-on testing. Promotion to `master` remains reserved for an intentional move to a new 2.x release number.
