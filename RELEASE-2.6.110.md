# SafeLedger 2.6.110

## Profile initial preview

The **Use initial** option in Add / Modify Profile now previews the actual first letter of the current Profile name instead of showing a question mark. The preview also updates while the Profile name is edited, so the picker stays consistent with the initial shown in Profile navigation and detail views.

## Maintenance Snapshot design

Maintenance Snapshot now uses the same list-row presentation as **Recovery Needs Attention**.

- Removed the separate icon and circle treatment from Recovery verification, Recovery coverage, and Backup activity.
- Removed the parallel Maintenance Snapshot card styling.
- Reused the standard dashboard list shell, row, title, metadata, status, and Resolve-button components.
- Status information and existing Resolve actions are unchanged.

## Regression coverage

The Profile icon picker contract now protects live Profile-initial preview behavior and prevents the empty-name question-mark path from returning. Recovery Command Center tests now require Maintenance Snapshot to use standard dashboard list rows and reject the retired maintenance icon/card structure.

## Carried forward

2.6.110 includes the 2.6.109 duplicate General icon cleanup, Custom Field checkbox removal, centered Custom Field remove control, and the earlier Profile icon-picker performance improvements.

## Security scope

No encryption, Argon2id, AES-GCM, DEK lifetime, lockout, Self-Destruct, recovery-data format, renderer sandbox, or persistence-authority behavior changes.
