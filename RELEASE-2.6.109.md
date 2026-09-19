# SafeLedger 2.6.109

SafeLedger 2.6.109 carries forward the 2.6.107 Profile icon-picker performance work and the 2.6.108 Profile icon copy cleanup, then removes redundant General icons and simplifies Custom Fields.

## General Profile icon cleanup

Seven visually duplicate General icon aliases were removed from the Profile picker, validation model, and local icon CSS so the app has one canonical choice for each visual:

- Open Folder Outline
- Unlock Alternate
- Save Alternate
- Plus Circle
- Plus Alternate
- Minus Circle
- Warning Triangle

SafeLedger no longer preserves these aliases for compatibility. The canonical Open Folder, Unlock, Save, Plus, Minus, and Warning choices remain available.

## Custom Fields cleanup

The Checkbox Custom Field type has been removed from the data model and editor. Custom Fields now offer Text, Sensitive text, Multiline, Date, Number, and URL.

The remove-custom-field X button is now centered by its CSS layout so the action is visually aligned within its button.

## Regression coverage

The Profile icon picker contract now verifies that removed aliases are absent from the picker and local icon CSS. Custom Field tests protect the six supported field types, ensure checkbox-specific editor behavior stays removed, and verify the remove action retains centered flex alignment.

No encryption, Argon2id, AES-GCM, DEK lifetime, lockout, Self-Destruct, recovery, or encrypted data-format behavior changes in this release.
