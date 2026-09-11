# SafeLedger 2.6.70 — Dashboard Health & Maintenance Actions

SafeLedger 2.6.70 carries forward the complete 2.6.69 candidate and reorganizes the Vault Overview so the most immediate device and maintenance actions are easier to reach.

## Device & Backup Health placement

**Device & Backup Health now appears directly under Vault Inventory**, before Recovery Health.

This puts the two local operational checks—SafeLedgerData storage and encrypted backup freshness—near the top of the overview instead of below the scenario-planning sections.

## Clear action buttons

The device-health rows now use the same full button treatment for their actions:

- Portable storage uses **Open Storage** instead of the small inline open icon.
- Encrypted backup uses **Create Backup** or **Verify Backup** when action is required.
- Action buttons appear **to the left of the status pill**, so the sequence reads action first, current status second.

The storage action still opens only the trusted SafeLedgerData location exposed by the existing main-process bridge.

## Maintenance Snapshot redesign

Maintenance Snapshot no longer uses the old bullet-list presentation. It now follows the visual language of **What Happens If…** with direct status cards containing:

- a meaningful local icon;
- a clear header;
- a concise subheader with the current state;
- a status pill;
- a Resolve/action button when SafeLedger can take the user directly to the next step.

The cards are not expandable question-and-answer rows. They are direct maintenance summaries.

### Recovery verification

Uses the local clock icon and shows how many Vault Items need a verification review, including how many have never been verified. **Resolve** opens the next matching Vault Item.

The navigation target follows Maintenance Snapshot's own 180-day stale-verification threshold rather than depending on the separate Recovery Health scoring threshold.

### Recovery coverage

Uses the local recovery/lifebuoy icon and summarizes:

- recovery methods;
- recovery locations;
- recovery instructions;
- completed recovery validations.

When coverage is incomplete, **Resolve** opens the next Vault Item with a matching gap.

### Backup activity

Uses the local archive icon and shows backup age, verified-backup age, and latest local vault activity. It offers **Create Backup** or **Verify Backup** when the current backup state requires action.

## Privacy boundary

Maintenance navigation targets contain only safe routing metadata:

- Profile name/file/index;
- Vault Item name/index.

They do not contain seed phrases, passwords, private/public addresses, recovery locations, or backup paths.

## Regression coverage

2.6.70 verifies that:

- Device & Backup Health renders immediately after Vault Inventory;
- Open Storage is a full button;
- Create Backup / Verify Backup buttons render to the left of their status pill;
- Maintenance Snapshot uses direct cards instead of the retired bullet-list renderer;
- clock, lifebuoy, and archive icons remain in the local icon registry;
- stale verification and coverage issues produce secret-free direct navigation targets;
- the historical 2.6.54 Maintenance Snapshot regression now checks the current card design instead of preserving the retired list implementation;
- changed JavaScript passes syntax checks.

## Hands-on test focus

1. Open Vault Overview and confirm **Device & Backup Health** is directly below **Vault Inventory**.
2. Confirm **Open Storage** is a normal button to the left of the storage status pill.
3. Make backup work due and confirm **Create Backup** / **Verify Backup** appears to the left of the Review pill.
4. Review Maintenance Snapshot and confirm each item is a static icon/header/subheader card rather than an expandable Q&A.
5. Confirm Resolve opens the expected Vault Item for recovery-verification and coverage gaps.
6. Check Light, Colorful, and Dark appearances.

## Release safety

This is a cumulative candidate. **Do not merge to `master` until Windows, Linux, and macOS CI pass and the dashboard changes are hands-on approved.**
