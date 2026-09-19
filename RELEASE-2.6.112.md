# SafeLedger 2.6.112

## Profile icon picker polish

The Profile Icon section now matches the cleaner visual language used by the rest of the Profile editor.

- Removed the outer fieldset/card ring around the Profile Icon section.
- Reused the shared section-heading style so **Profile icon** matches other editor headings.
- Reduced the helper copy to the same compact 12px treatment used by other menu-section notes.
- Increased the space between the icon search field and the icon grid.
- Strengthened each icon tile with the shared strong border and soft surface so individual choices are easier to distinguish in Light, Colorful, and Dark themes.

## Regression coverage

Profile icon picker tests now protect the borderless section, shared heading/copy treatment, search spacing, and visible tile definition without depending on platform-specific line endings.

## Carried forward

2.6.112 includes the 2.6.111 Recovery Needs Attention control-order update, borderless Maintenance Snapshot presentation, and the cross-platform regression-test correction.

## Security scope

No encryption, Argon2id, AES-GCM, DEK lifetime, lockout, Self-Destruct, recovery-data format, renderer sandbox, persistence-authority, or secret-handling behavior changes.
