# SafeLedger 2.6.56 — Recovery Command Center Design

SafeLedger 2.6.56 expands Vault Overview from a static summary into a local Recovery Command Center while keeping the product offline-first, encrypted, portable, and recovery-focused.

## Design principles

1. **Explain, do not invent confidence.** Readiness percentages and scenario results are derived from documented facts and expose the gaps behind the score.
2. **No blockchain/network dependency.** These features evaluate SafeLedger's encrypted local records and local backup health only.
3. **No new secret persistence.** Timeline and simulator data are derived at runtime. Recovery Validation checklist answers and temporary BIP39 input are not stored.
4. **Main process remains authoritative.** Renderer duplicate warnings improve UX, but duplicate enforcement is independently repeated against authoritative encrypted data before persistence.
5. **Motion communicates state only.** Animation never authorizes a sensitive reveal, delays a security decision, or decides whether a write succeeds.
6. **Reduced motion is automatic.** Motion respects the operating system `prefers-reduced-motion` preference.

## Recovery Readiness Ring

Vault Overview displays the existing aggregate Recovery Health result as an SVG ring. The ring animates to the computed percentage only after the percentage already exists. With reduced motion enabled, it renders directly at its final state.

## Security Timeline

`recovery-command-center.js` derives milestones from existing timestamps:

- Profile created/updated
- Vault Item added/updated
- Asset added/updated
- Recovery information verified
- Recovery Validation completed
- encrypted backup created/verified (added by the dashboard from local backup health)

The timeline includes names and event metadata, not seed phrases, private keys, passwords, PINs, notes, balances, or public-address values.

## Vault Item Security Scorecards

Each scorecard reuses Recovery Health rather than defining a competing scoring system. Cards expose the score, status, and the specific recovery actions that are costing readiness points. Selecting a card opens the corresponding Vault Item.

## Recovery Validation Wizard 2.0

Recovery Validation now presents one checklist item at a time with progress, Previous/Next controls, and automatic advance after confirmation.

Privacy behavior is intentionally unchanged:

- checklist answers are not persisted;
- temporary BIP39 input is local-only and cleared immediately after validation;
- completion remains unavailable until every step is confirmed;
- SafeLedger records only successful Recovery Validation / Last Verified timestamps through the existing recovery completion path.

## Emergency Recovery Package

Profiles gain an Emergency Recovery Package action that reuses the existing Recovery Binder generator and printer.

Safe defaults exclude:

- public addresses
- balances
- notes
- passwords, PINs, and recovery links
- seed phrases and private keys
- sensitive custom fields
- QR codes for excluded values

Users may deliberately opt into additional information. Any sensitive selection requires an explicit warning before generation. The package adds `Start here` and safety guidance for a trusted recovery person without creating a second persistence format.

## Duplicate Asset Protection

`duplicate-asset.js` defines identity in this order:

1. contract address (with network context where available)
2. network + symbol
3. symbol
4. name fallback

This allows legitimate same-ticker assets on different networks while warning about likely accidental duplicates.

### Two-stage enforcement

**Renderer:** warns before a create or identity-changing edit and sends `duplicateConfirmed: true` only after explicit confirmation.

**Main process:** independently recalculates duplicate identity against the current encrypted authoritative Vault Item. If a duplicate exists and confirmation is absent, the write is rejected.

Changing non-identity information such as a public address, notes, balance, or pin state on an already-existing Asset does not repeatedly demand duplicate confirmation.

## “What Happens If…” Simulator

The local simulator evaluates five initial scenarios:

- hardware wallet/device loss
- SafeLedgerData device failure
- primary recovery location unavailable
- family/recovery-person access without the owner
- exchange account lockout

Each result returns a 0–100 planning score, `Ready`, `Needs Review`, or `Incomplete`, plus strengths and concrete gaps. It is a documentation assessment, not a guarantee that funds can be recovered.

## Motion system

`motion-ui.js` centralizes motion so individual screens do not grow independent animation patches.

Included motion:

- Save → check confirmation
- manual Profile / Vault Item / Asset rail collapse/expand
- Vault Overview entrance stagger
- Recovery Readiness ring fill
- Privacy Mode sensitive disclosure reveal
- simulator/result reveal
- Recovery Validation step transitions

Durations stay short and restrained. Reduced-motion users receive immediate state changes.

## Testing strategy

### `recovery-command-center-tests.js`

Behaviorally tests timeline redaction, simulation facts/results, aggregate scorecard/readiness output, and multi-network duplicate identity.

### `duplicate-asset-authoritative-tests.js`

Uses real encrypted temporary SafeLedger files and the authoritative data-write service to prove:

- renderer-bypassed duplicate creates are rejected;
- explicit duplicate confirmation is honored;
- non-identity edits to an existing duplicate do not re-prompt;
- same ticker on different networks/contracts is accepted;
- encrypted storage remains `SLG2:`.

### `hotfix-2.6.56-tests.js`

Locks the feature/security architecture, reduced-motion contract, Emergency Package reuse, guided Recovery Validation behavior, and inherited 2.6.55 Asset targeting correction.

## Bandaid prevention note

Do not replace these direct owners with MutationObservers, synthetic clicks, post-render repair helpers, renderer-owned authoritative persistence, or index-only Asset identity. If a future UI change supersedes an implementation detail, update the regression to protect the user-visible/security behavior rather than resurrecting an obsolete source-string requirement.
