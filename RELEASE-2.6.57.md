# SafeLedger 2.6.57 — Recovery UX Refinement

SafeLedger 2.6.57 refines the Recovery Command Center introduced in 2.6.56 based on hands-on product review. The goal is to keep the useful recovery intelligence while removing redundant surfaces and motion that does not add value.

## BIP39 one-time check guidance

The optional BIP39 checker now explicitly instructs users to enter mnemonic words in their original order separated by spaces, for example:

`word1 word2 word3 ...`

Do not use commas and do not concatenate the words. The check remains fully local. SafeLedger does not save, log, copy, or transmit the mnemonic, and the temporary input is cleared after validation.

## Recovery Validation simplification

Recovery Validation no longer uses Previous/Next navigation or one-hidden-step-at-a-time behavior.

- All recovery checks are visible together.
- The progress percentage/bar remains.
- Each checkbox must still be explicitly confirmed.
- Complete Recovery Validation remains unavailable until every check is confirmed.
- Individual checklist answers remain non-persistent; only successful completion and refreshed Last Verified timestamps are stored.

## Save feedback

The 2.6.56 Save checkmark/pop animation has been removed completely from the shared action/status path. Save behavior remains synchronous and persistence/error reporting is unchanged.

## Vault Overview consolidation

Two redundant 2.6.56 dashboard surfaces were removed:

- Vault Item Security Scorecards
- Security Timeline

Recovery score/action information now lives directly inside **Recovery Needs Attention**, where each non-ready Vault Item shows its recovery-readiness percentage, status, and the most important recovery gaps.

Activity History remains the single chronological history surface.

## Activity History timeline design

Activity History now uses the visual timeline language previously explored on Vault Overview while preserving the existing privacy-safe activity log and its per-event icon catalog.

- Existing event-specific icons remain authoritative.
- Entries are arranged along a vertical timeline rail.
- Each event remains a generic event type + timestamp only.
- Filters and retention behavior are unchanged.
- Styling uses SafeLedger theme variables and explicitly supports Dark Mode.

## What Happens If… accordion

The recovery scenario simulator no longer uses a separate choice pane and result display window. Each scenario is now a self-contained FAQ-style accordion:

- scenario icon;
- scenario/question title;
- short explanation;
- expandable local recovery assessment;
- readiness score/status;
- strengths;
- gaps to resolve.

No scenario is auto-selected. Results are calculated only when the user opens an accordion row.

Scenario icons now better match the recovery topic:

- lost hardware/device — mobile/device icon;
- SafeLedgerData failure — database/storage icon;
- unavailable recovery location — location marker;
- family recovery — users/family icon;
- exchange lockout — unlock icon.

The accordion uses theme variables and explicit Dark Mode/reduced-motion behavior.

## Security and architecture unchanged

This refinement does not weaken:

- AES-256-GCM authenticated encryption;
- Argon2id password derivation;
- main-only DEK/session ownership;
- Phase 2 recovery confidence;
- Phase 3 authoritative persistence;
- Phase 4 direct/state-driven UI ownership;
- Phase 5 behavioral/release-trust gates;
- 2.6.55 exact selected-Asset targeting;
- 2.6.56 authoritative duplicate-Asset protection;
- Emergency Recovery Package safety defaults;
- offline/portable behavior;
- 2.x compatibility and 1.x read-only import.

## Versioning note

These changes were explicitly requested by the product owner after reviewing 2.6.56, so they are released as the next patch candidate: **2.6.57**. Any implementation/test corrections discovered while finishing this candidate remain 2.6.57.

## Promotion gate

**Do not merge this candidate to `master` yet.** Promotion requires the complete Windows/Linux/macOS CI matrix and hands-on review of the packaged 2.6.57 build.
