# SafeLedger 2.6.56

## Recovery Command Center & Motion

SafeLedger 2.6.56 adds a coordinated recovery/security UX layer without changing SafeLedger's offline-first or encrypted-local-storage model.

### New Recovery Command Center

Vault Overview now includes:

- an animated Recovery Readiness ring;
- explainable Vault Item Security Scorecards;
- a local Security Timeline derived from existing milestones;
- a local “What Happens If…” recovery-planning simulator;
- the existing inventory, maintenance, backup/device health, Recovery Intelligence, needs-attention, and recently-verified sections.

Scores remain explainable and are derived from the existing Recovery Health rules rather than a second competing scoring model.

### Recovery Validation Wizard 2.0

Recovery Validation now presents one recovery check at a time with:

- Step X of Y progress;
- a progress bar;
- Previous / Next navigation;
- automatic advance after confirming a step;
- completion disabled until every step is confirmed.

Checklist answers are still not persisted. Optional BIP39 input remains local-only and is cleared immediately after validation. Only successful Recovery Validation / Last Verified timestamps are stored through the existing recovery-completion path.

### Emergency Recovery Package

Profiles now include an Emergency Recovery Package action. It reuses the existing Recovery Binder generation/printing pipeline and adds trusted-recipient “Start here” and safety guidance.

Safe defaults exclude seeds, private keys, passwords, PINs, balances, public addresses, notes, sensitive custom fields, and QR codes for excluded values. Users can explicitly opt into more information, with an additional warning for private/sensitive selections.

### Duplicate Asset Protection

SafeLedger now warns when creating a likely duplicate Asset or when an edit changes an Asset identity into one that matches another record.

Duplicate identity is network-aware:

- contract address is strongest;
- then Network + Symbol;
- then Symbol;
- then Name as a fallback.

This means legitimate assets such as USDC on different networks remain supported.

Duplicate protection is enforced twice:

1. the renderer asks for confirmation;
2. the authoritative main-process data writer recalculates the duplicate against current encrypted data and rejects bypassed/unconfirmed duplicates.

Ordinary edits to an existing Asset—such as changing a public address, notes, balance, or pin state—do not repeatedly prompt just because an intentional duplicate already exists.

### Motion & polish

SafeLedger now uses one shared reduced-motion-aware animation layer for:

- Save → check confirmation;
- manual Profile / Vault Item / Asset rail transitions;
- Vault Overview entrance motion;
- Recovery Readiness ring fill;
- Privacy Mode sensitive reveal;
- simulator result reveal;
- Recovery Validation step transitions.

Animations are short and presentation-only. They never authorize a sensitive reveal, decide persistence, or weaken synchronous security state.

### 2.6.55 lineage carried forward

The user-reported selected-Asset targeting correction is now correctly represented as SafeLedger 2.6.55 and remains in the 2.6.56 regression chain. That correction prevents a Bitcoin edit from targeting a sibling Asset when starter Assets share timestamps and renderer display order differs.

### New behavioral coverage

- `recovery-command-center-tests.js`
- `duplicate-asset-authoritative-tests.js`
- `hotfix-2.6.55-tests.js`
- `hotfix-2.6.56-tests.js`

The authoritative duplicate test uses real encrypted temporary SafeLedger files and requires storage to remain authenticated `SLG2:` data.

### Security / compatibility unchanged

This release does not weaken or replace:

- AES-256-GCM encrypted storage;
- Argon2id password derivation;
- main-only DEK/session ownership;
- independent backup verification;
- Phase 3 authoritative data ownership;
- Phase 4 direct UI ownership;
- Phase 5 behavioral/release-trust gates;
- offline operation;
- portable `SafeLedgerData` behavior;
- 2.x vault compatibility;
- 1.x read-only import compatibility.

## Candidate rule

**DO NOT MERGE TO `master`** until Windows, Linux, and macOS CI are fully green and packaged-build hands-on testing is approved by the user.
