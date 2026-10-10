# SafeLedger 2.6.108

SafeLedger 2.6.108 carries forward the fully green 2.6.107 Profile icon-picker performance improvements and makes a small copy cleanup in Profile editing.

## Profile icon copy cleanup

The Profile icon section no longer includes the sentence **“Icons stay fully offline.”** No replacement text was added.

## General icon audit

The General Profile icon catalog was reviewed for redundant visual aliases. This release does **not** remove any picker choices yet. The audit identified the following safe candidates for future picker cleanup while keeping their underlying icon definitions available for compatibility:

- Open Folder Outline — duplicate of Open Folder
- Unlock Alternate — duplicate of Unlock
- Save Alternate — duplicate of Save
- Plus Circle — currently renders the same as Plus
- Plus Alternate — currently renders the same as Plus
- Minus Circle — currently renders the same as Minus
- Warning Triangle — currently renders the same as Warning

Keeping the underlying local icon definitions allows existing saved Profile icon identifiers to continue rendering even if redundant choices are later hidden from the picker.

No encryption, persistence authority, icon validation, recovery, or security behavior changes in this release.
