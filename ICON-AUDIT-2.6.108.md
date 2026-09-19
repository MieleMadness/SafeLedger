# SafeLedger General Profile Icon Audit

This audit reviews the General Profile icon picker for visual duplicates while preserving compatibility with existing saved Profile icon identifiers.

## Safe picker-removal candidates

The following choices are safe to hide from the picker because another retained choice renders the same current local artwork:

- `fa-folder-open-o` — Open Folder Outline; duplicate of `fa-folder-open` Open Folder
- `fa-unlock-alt` — Unlock Alternate; duplicate of `fa-unlock` Unlock
- `glyphicon-save` — Save Alternate; duplicate of `fa-save` Save
- `fa-plus-circle` — Plus Circle; same current glyph as `fa-plus` Plus
- `glyphicon-plus` — Plus Alternate; same current glyph as `fa-plus` Plus
- `fa-minus-circle` — Minus Circle; same current glyph as `fa-minus` Minus
- `fa-exclamation-triangle` — Warning Triangle; same current glyph as `fa-warning` Warning

## Keep

The following similar-looking entries remain meaningfully distinct and should stay available:

- Folder vs Open Folder
- Star vs Star Outline
- Lock vs Unlock
- User / Add User / Remove User / Users
- Alert Circle vs Warning
- Check vs Check Circle
- Visible vs Hidden
- Left / Right / Up / Down chevrons

## Compatibility approach

If the duplicate choices are removed from the picker in a later patch, keep their underlying local CSS definitions and accepted persisted identifiers. This prevents Profiles created with an earlier test build from losing their saved icon while avoiding duplicate choices for new selections.
