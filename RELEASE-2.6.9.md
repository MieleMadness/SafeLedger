# SafeLedger 2.6.9

SafeLedger 2.6.9 is a focused navigation-state hotfix carried forward from the 2.6.8 development candidate.

## Vault Overview action cleanup

- Fixes a regression where **Add Profile → Cancel** returned to **Vault Overview** but left the Add Profile **Save** and **Cancel** buttons visible in the detail action bar.
- The stale buttons existed because Vault Overview replaced the detail content while the separate `detailActionArea` retained the previous form actions.
- Vault Overview/Home navigation now clears the detail action dock and detail view/edit mode before the dashboard renderer runs.
- The cleanup is attached to the existing `dashboardButton`, so a normal Home click and the programmatic Add Profile Cancel path use the same navigation behavior.
- No synthetic replacement navigation, MutationObserver, delayed DOM injection, or duplicate dashboard rendering path is introduced.

## Regression coverage

- Adds an executable 2.6.9 regression that starts with simulated stale Save/Cancel controls, triggers the Vault Overview navigation cleanup, and verifies the action dock is empty afterward.
- Verifies the dashboard cleanup is registered before the dashboard renderer.
- Verifies Add Profile Cancel continues to use the canonical Vault Overview/Home button path.
- Updates the 2.6.8 behavior gate so it remains active on 2.6.8 and later 2.6.x patches instead of permanently freezing the package version at exactly 2.6.8.

## Carried forward from 2.6.8

- Add Asset requires an explicitly selected Vault Item and no longer silently auto-selects one.
- Add Profile, Add Vault Item, and Add Asset own their Cancel actions directly through the existing detail action system.
- The older observer/timer-based form Cancel injectors remain removed.
- The 2.6.7 renderer consolidation, readability/icon scaling, theme refinements, login-eye alignment, and Add Asset reliability work remains intact.

## Security and compatibility

This hotfix does not change encrypted vault data, AES-256-GCM, Argon2id, DEK/session handling, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore formats, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable storage behavior, or runtime network behavior.

## Promotion gate

Do not merge to protected `master` until the 2.6.9 regression suite and Windows, Linux, and native Apple Silicon validation workflows are green and hands-on testing is approved.
