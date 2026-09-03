# SafeLedger 2.6.8 — Explicit Asset Context & Direct Cancel Actions

SafeLedger 2.6.8 continues the 2.6.7 cleanup by removing two more post-render UI repair paths and by making Add Asset require an explicit user-selected Vault Item.

## Explicit Add Asset context

SafeLedger no longer chooses a Vault Item on the user's behalf when **Add Asset** is pressed.

If no valid Vault Item is selected, SafeLedger leaves the current Profile/detail state unchanged and shows the normal top information message:

> Select a Vault Item first, then choose Add Asset.

The temporary `vault-item-selection.js` helper is removed. The earlier capture-phase `vault-item-selection-ui.js` remains removed. Add Asset therefore has no hidden DOM click, capture listener, duplicate IPC state, or automatic first-Vault selection path.

When a Vault Item is explicitly selected, the existing Add Asset form and encrypted save path are unchanged.

## Direct Cancel actions

Add-form Cancel buttons are now owned by the same modules that render their forms:

- `profile.js` renders **Cancel new profile** while creating a Profile;
- `group.js` renders **Cancel add vault item** while creating a Vault Item;
- `record.js` renders **Cancel add asset** while creating an Asset;
- `renderer.js` supplies the appropriate navigation callback for each form.

This removes two post-render repair modules:

- `profile-create-cancel-ui.js`;
- `add-form-cancel-ui.js`.

Those modules previously watched completed DOM output, delayed work with timers, detected form state from headings, injected buttons after rendering, and—in the Vault/Asset case—used selected DOM anchors and synthetic clicks to navigate back.

The direct implementation does not need a MutationObserver, delayed injection, heading detection, or synthetic selected-row click. Cancel is created at the same time as Save through the existing `detailActions` owner.

Cancel behavior is intentionally contextual:

- Cancel Add Profile returns through the existing Vault Overview navigation action;
- Cancel Add Vault returns to the selected Profile detail and clears Vault/Asset selection state;
- Cancel Add Asset returns directly to the explicitly selected Vault Item detail.

Existing edit/delete Cancel actions remain owned by their existing direct render paths and are not changed by this cleanup.

## Regression coverage

2.6.8 regression gates require:

- the application version to be exactly `2.6.8`;
- Add Asset to display the explicit-selection information message when no Vault Item is selected;
- no silent Add Asset auto-selection helper;
- both post-render Cancel injector files to remain absent;
- Add Profile, Add Vault, and Add Asset to create their Cancel actions directly;
- the renderer entry bundle not to restore any retired selection/cancel helper;
- earlier 2.6.7 Add Asset reliability, login-eye, interface, Vault Item rendering, and security regressions to remain active.

## Security and compatibility

This cleanup does **not** change:

- the encrypted vault schema;
- AES-256-GCM vault encryption;
- Argon2id master-password protection;
- the main-process-only DEK boundary;
- SafeLedger 2.x vault compatibility;
- read-only 1.x import behavior;
- backup/restore formats;
- Self-Destruct semantics;
- Privacy Mode or Recovery Intelligence secret handling;
- offline/local icon behavior;
- runtime network requirements.

## Version tracking

This candidate is **SafeLedger 2.6.8**. Any subsequent GitHub candidate/update after this one must use the next patch version rather than reusing 2.6.8.

## Validation target

The final 2.6.8 candidate must pass the locked regression suite, Electron crypto smoke test, real GUI smoke test, and packaged artifact workflows on Windows x64, Linux x64, and native macOS Apple Silicon before promotion to `master`.
