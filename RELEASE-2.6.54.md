# SafeLedger 2.6.54 — UI Clarity & Custom Fields

SafeLedger 2.6.54 carries the completed five-phase stabilization work forward and focuses on a small set of user-facing clarity and data-entry improvements without weakening the security, offline, portability, or release-trust boundaries established in 2.6.50–2.6.53.

## QR code availability

The QR feature was not removed. SafeLedger still generates QR codes locally with the bundled `qrcode` dependency; no network connection is used.

- Public-address QR remains available directly beside a recorded public address.
- Sensitive-field QR remains available for QR-capable recovery values.
- When Privacy Mode is enabled, Copy/QR actions on a sensitive disclosure remain hidden until that disclosure is expanded. This is intentional privacy behavior and is preserved.
- Recovery Binder QR generation remains available when the QR option is selected.

A new 2.6.54 regression gate protects the local QR generator, QR control artwork, public-address path, sensitive-field path, and Privacy Mode reveal behavior so later UI cleanup cannot silently remove them.

## Change Password clarity

When a user supplies a new password but leaves Old Password blank, Change Password now reports:

`Old Password Must Be Specified`

This validation happens before new-password policy checks so the error describes the actual missing prerequisite.

## Taller default workspace

The preferred SafeLedger opening height increases from 750px to 850px while the established 1283px preferred width remains unchanged.

SafeLedger still respects the operating-system work area, so the preferred size is clamped on smaller displays rather than forcing the window beyond available screen space.

## Vault Overview refinements

Vault Overview is easier to scan and gives each health section more context:

- `Vault contents` information now appears immediately below the `Vault Inventory` heading and before its count cards.
- `Maintenance Snapshot` includes short explanatory subtext.
- `Recovery Health` includes short explanatory subtext.
- `Device & Backup Health` includes short explanatory subtext.
- `Last Maintenance` is renamed `Last Backup`.
- Maintenance Snapshot no longer spreads three dense cards horizontally. Its topics are presented as a vertical bullet list.
- Recovery coverage details are nested vertically as method, location, and drill coverage.
- Last Backup details are nested vertically as backup age, verified-backup age, and latest vault activity.

## Profile custom fields

Profile edit/create now supports the same typed Custom Fields system used elsewhere in SafeLedger.

Supported custom-field types remain normalized through the shared custom-field model, including sensitive values. Sensitive custom values stay encrypted and are excluded from searchable values.

Profile custom fields are not a renderer-only convenience. The Phase 3 authoritative main-process write boundary now explicitly allows only normalized `customFields` alongside the existing approved Profile fields. Arbitrary renderer-supplied Profile properties remain rejected/ignored.

## Asset custom fields

Asset edit once again exposes user-defined custom fields.

An older 2.6.10 simplification deliberately hid additional Asset custom fields while preserving them in encrypted storage. That historical UI requirement is superseded by the current product requirement.

The replacement keeps the stronger parts of the 2.6.10 design:

- `Network` remains a standard protected Asset identity field.
- `Contract address` remains a standard protected Asset identity field.
- their labels/types/remove controls cannot be repurposed as ordinary custom fields;
- user-created custom fields are visible and editable below them;
- `Add custom field` is available again;
- existing legacy custom-field values remain preserved;
- a full historical custom-field list cannot be overwritten by automatic identity-field insertion.

This is implemented directly in the canonical editor; no MutationObserver, synthetic click, or post-render repair helper was reintroduced.

## Test modernization

Historical tests were updated where the old implementation requirement conflicts with the new product behavior:

- the 2.6.19 window test now protects the established width and prevents height regression without freezing all future releases to exactly 750px;
- the 2.5.12 dashboard test now protects `Last Backup` and the vertical Maintenance Snapshot structure;
- the 2.6.10 Asset test now protects fixed Network/Contract identity while requiring user custom fields to remain visible/editable;
- the 2.6.53 Phase 5 test now remains active on 2.6.53 and later 2.6.x candidates instead of treating 2.6.53 as the only valid version;
- a dedicated `hotfix-2.6.54-tests.js` gate protects the complete requested behavior.

These changes follow the stabilization rule: tests should enforce current behavior and security boundaries, not pressure production code to restore retired implementation constraints.

## Phase 5 release trust carried forward

The 2.6.53 release-trust architecture is unchanged and remains regression-protected:

- encrypted lifecycle behavioral testing;
- clean normal user downloads;
- separate SHA-256 / CycloneDX / release-manifest verification artifacts;
- exact `${{ github.sha }}` build-commit binding;
- pinned GitHub build-provenance and SBOM attestations;
- full Windows Portable, Linux AppImage, and macOS Apple Silicon validation.

## Security and compatibility

SafeLedger 2.6.54 does not weaken or replace:

- AES-256-GCM authenticated vault encryption;
- Argon2id password derivation;
- the main-process DEK/session boundary;
- independent backup verification and staged restore validation;
- authoritative main-owned Profile/Vault Item/Asset persistence;
- state-driven UI ownership from Phase 4;
- SafeLedger 2.x encrypted-data compatibility;
- SafeLedger 1.x read-only import;
- offline-first operation;
- portable `SafeLedgerData` storage behavior.

## Promotion gate

**Do not merge this candidate to `master` yet.** Promotion requires the complete Windows/Linux/macOS CI matrix to pass and hands-on testing of the packaged 2.6.54 candidate, especially QR visibility, Change Password validation, Vault Overview layout, Profile custom fields, Asset custom fields, and the taller default window.
