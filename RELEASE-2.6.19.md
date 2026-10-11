# SafeLedger 2.6.19 Workflow Candidate

SafeLedger 2.6.19 carries forward the fully green 2.6.18 candidate and applies hands-on layout and deletion-feedback refinements.

## Equal navigation columns

The desktop navigation grid now uses:

- Profile: `2fr`
- Vault Item: `2fr`
- Asset: `2fr`
- Detail: `5fr`

The Asset column previously used `3fr`, making it visibly wider than the Profile and Vault Item columns. The three navigation columns now match.

## Native opening width

2.6.18 used a 1400px preferred width with a 12-unit `2/2/3/5` grid.

2.6.19 uses an 11-unit `2/2/2/5` grid. To preserve approximately the same physical width per grid unit—and therefore roughly the same Detail-column width—the preferred native opening width is reduced by one former grid unit:

- Previous preferred width: `1400px`
- New preferred width: `1283px`
- Preferred height remains: `750px`

The sizing policy remains in Electron's trusted main-process bootstrap path. No renderer resize side effect returns.

## Deletion feedback

Successful deletions now use one consistent message across Profiles, Vault Items, and Assets:

**Item Deleted**

The confirmation uses SafeLedger's red danger visual palette so deletion is immediately distinguishable from an ordinary save. Internally it remains a successful deletion status—not an application error—so assistive technology receives a normal polite status announcement.

Actual deletion failures continue to use the true error path and retain their specific failure messages.

## Existing notice policy preserved

- Routine successful reads remain silent.
- Routine reads do not show a Processing banner.
- Saves/updates/settings changes can still show confirmations.
- Errors and actionable notices remain visible.
- Light/Dark theme contrast and compact field-style status padding remain unchanged.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Workflow rule

This is a **2.6.x workflow/test candidate**. Do **not** merge it to `master`. Validate it through Windows Portable, Linux AppImage, native Apple Silicon workflows, and hands-on testing. Promotion to `master` remains reserved for an intentional move to a new 2.x release number.
