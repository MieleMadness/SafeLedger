# SafeLedger 2.6.60 — Clearer Workspace + Guided Recovery Fixes

SafeLedger 2.6.60 builds on the 2.6.59 Light/Colorful appearance work with clearer visual hierarchy and recovery guidance that takes the user directly toward the next unresolved item.

## Workspace dividers

Profiles, Vault Items, and Assets now have subtle divider lines between the main workspace columns and between individual navigation rows. The dividers are theme-aware: Light uses soft navy/blue separation while Colorful and Dark use low-contrast light separation.

The goal is to make the three-level SafeLedger hierarchy easier to scan without turning the interface into a grid of heavy borders.

## Why “My SafeLedgerData device fails” showed 20%

The scenario previously used a hardcoded 20% minimum whenever SafeLedger could not find a current backup. That number did not represent recovery work the user had actually completed, so a brand-new or unconfigured backup state could misleadingly appear partially complete.

2.6.60 removes that synthetic starting credit. The score is now based on actual backup evidence:

- **0%** — no encrypted backup has been created yet.
- **35%** — an encrypted backup exists but is stale/due and should be replaced with a current backup.
- **65%** — a current encrypted backup exists but has not been independently verified.
- **100%** — a current encrypted backup has been independently verified.

This makes the percentage explainable: SafeLedger no longer awards recovery readiness simply for opening the app.

## Resolve actions

Recovery guidance now includes direct **Resolve** actions based on what remains incomplete.

- Recovery Needs Attention rows include a visible **Resolve** button that opens the affected Vault Item.
- “What Happens If…” scenarios that depend on Vault Item documentation open the next Vault Item with an unresolved gap.
- “My SafeLedgerData device fails” offers **Create Backup** when no current backup exists, then **Verify Backup** once the current backup exists but still needs verification.
- Device & Backup Health uses the same next-step logic so the action shown matches the actual remaining work.
- When a task is completed and the Vault Overview is refreshed, SafeLedger recalculates the scenario and points the next Resolve action at the next remaining gap.

Resolution targets contain navigation metadata only. Seed phrases, passwords, private keys, recovery locations, public addresses, backup paths, and other recovery secrets are not copied into the dashboard navigation payload.

## Regression coverage

The 2.6.60 release gate verifies that:

- the device-failure scenario starts at 0% without backup evidence;
- stale, current-unverified, and verified backup states produce the expected evidence-based scores;
- Create Backup / Verify Backup actions follow the remaining backup work;
- recovery scenarios expose only metadata-safe navigation targets;
- explicit Resolve buttons remain present in Recovery Needs Attention and simulator results;
- Profile / Vault Item / Asset divider styling remains loaded before the final appearance palette layer;
- the 2.6.59 Light/Colorful appearance contract stays active.

## Release process

This remains a **candidate update** until CI builds and hands-on testing are complete. Do not merge it to `master` until the Windows, Linux, and macOS workflows pass and the divider/resolution behavior has been tested in the packaged application.
