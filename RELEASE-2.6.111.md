# SafeLedger 2.6.111

## Recovery Needs Attention consistency

**Recovery Needs Attention** now follows the same trailing-control layout used by **Device & Backup Health** and Maintenance Snapshot.

- Resolve appears before the informational status pill.
- The status pill remains visually distinct and non-interactive.
- Existing Vault Item navigation and recovery-gap information are unchanged.

## Maintenance Snapshot refinement

Maintenance Snapshot now keeps the shared dashboard row structure while removing the extra outer card treatment.

- Removed the filled outer list background, border, radius, and shadow around the Maintenance Snapshot rows.
- Preserved the existing row separators, titles, metadata, status pills, and Resolve actions.
- The result more closely matches the cleaner presentation used by **Device & Backup Health**.

## Regression coverage

Recovery Command Center tests now protect the borderless Maintenance Snapshot presentation and the Recovery Needs Attention Resolve/status ordering so these visual contracts do not regress during future dashboard cleanup.

## Carried forward

2.6.111 includes the 2.6.110 Profile initial preview fix and the simplified list-row Maintenance Snapshot structure.

## Security scope

No encryption, Argon2id, AES-GCM, DEK lifetime, lockout, Self-Destruct, recovery-data format, renderer sandbox, or persistence-authority behavior changes.
