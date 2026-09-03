# SafeLedger 2.6.10

SafeLedger 2.6.10 continues the renderer cleanup sequence by moving Asset multichain identity fields into the real Asset form instead of patching them into the DOM after rendering.

## Direct Asset identity fields

- `record.js` now explicitly owns the standard Asset identity fields **Network** and **Contract address**.
- The Asset renderer requests those fields directly from the existing custom-field editor when Add Asset or Modify Asset opens.
- The form still stores Network and Contract address in the existing `customFields` array, so there is no vault schema migration and existing 2.x data remains compatible.
- Existing Network/Contract values are preserved when an Asset is edited.
- The form keeps the current **Network & Additional Fields** heading and explanatory text.

## Retired post-render helper

- Removes `asset-multichain-ui.js`.
- Removes its renderer-entry registration.
- Eliminates the page-wide Asset-form `MutationObserver`.
- Eliminates synthetic **Add custom field** clicks used to create the two standard fields after the form rendered.
- Eliminates post-render label/type/remove-control rewriting for those fields.

## Custom-field editor support

- The shared custom-field editor now accepts optional fixed fields while keeping its existing two-argument behavior unchanged for other SafeLedger forms.
- Fixed fields use the same encrypted `customFields` persistence path as before.
- Fixed field labels/types cannot be edited or removed from the Asset form, matching the prior user-facing behavior.
- If a legacy record already uses the maximum 50 custom-field slots, fixed-field creation fails safely instead of repurposing the final user field.

## Regression coverage

- Adds a 2.6.10 DOM-level regression for direct Asset identity field creation.
- Verifies an existing Network value survives editing.
- Verifies ordinary custom fields remain unchanged.
- Verifies exactly two fixed Asset identity rows are rendered when capacity is available.
- Verifies their label/type/remove controls remain hidden.
- Verifies a full 50-field legacy record is not corrupted.
- Requires the retired observer helper to remain absent from both the repository and renderer entry.
- Updates the 2.6.7 historical regression to protect the current user-facing Network/Contract behavior rather than the retired observer implementation.
- Keeps the 2.6.9 Vault Overview action-state regression active on later 2.6.x patches.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Promotion gate

Do not merge to protected `master` until the full 2.6.10 regression suite and Windows, Linux, and native Apple Silicon validation workflows are green and hands-on testing is approved.
