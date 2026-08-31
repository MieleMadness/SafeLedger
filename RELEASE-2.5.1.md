# SafeLedger 2.5.1 — Session Reliability & Accessibility Hotfix

## Status

**Design complete / implementation not started.**

Target release version: **2.5.1**  
Current implementation version until final release gate: **2.5.0**  
Platforms: **Windows x64 + Linux x86_64**

SafeLedger 2.5.1 is a focused maintenance release that must ship before SafeLedger 2.6 implementation begins.

The release addresses three user-visible issues found during post-2.5 testing:

1. a correct master password can fail to unlock SafeLedger after a normal in-process security lock even though the same password works again after closing and reopening the application;
2. status badges and other text-bearing controls in the detail/display area use color well, but some foreground/background combinations are too low-contrast for comfortable reading;
3. the Recovery Dashboard's **Portable storage → Healthy** status should be actionable and open the active `SafeLedgerData` folder in the host operating system's file manager.

The lock/unlock continuity defect is the release blocker. Accessibility and storage-folder navigation ship in the same patch because they are small, bounded UI improvements with clear regression boundaries.

---

## Release thesis

SafeLedger should be trustworthy after it locks, not only after it starts.

A non-password security lock must destroy the active decrypted session, but it must not damage or poison the next authentication attempt. The same correct master password must unlock the same vault again without requiring a process restart.

At the same time, system-health information should remain colorful but clearly readable, and a healthy portable-storage indicator should help users locate the data SafeLedger is protecting.

---

## Non-negotiable product invariants

SafeLedger 2.5.1 must not change:

- AES-256-GCM vault encryption;
- Argon2id key-envelope derivation/verification semantics;
- the SafeLedger 2.x vault format;
- main-process-only DEK ownership;
- SafeLedger 1.x read-only import semantics;
- backup v3 generation;
- backup v2 restore compatibility;
- Profile → Wallet → Asset hierarchy;
- Recovery Intelligence or Recovery Health scoring;
- BIP39/address validation;
- privacy-preserving duplicate detection;
- Privacy Mode defaults;
- portable `SafeLedgerData` placement;
- normal offline/local-first operation;
- official 2.5 trusted-release checksums/SBOM/provenance architecture;
- Self-Destruct policy.

OS lock, SafeLedger inactivity lock, Emergency Lock, suspend/resume, storage changes, and renderer-reset events are not failed-password events and may never increment Self-Destruct/password-failure counters.

No network dependency may be added.

---

# Pillar A — Same-process lock/unlock reliability

## Observed defect

Post-2.5 testing has reproduced a user-facing condition where SafeLedger locks, the user returns to the login screen, and the known-correct password does not successfully restore the session. Closing and reopening SafeLedger restores normal password behavior.

That symptom strongly indicates a lifecycle/state problem around lock → renderer reset → authentication rather than a password-format problem. 2.5.1 must reproduce and fix the actual root cause rather than adding a restart workaround or weakening password validation.

## Current code boundaries to audit

The lock/authentication lifecycle currently crosses:

- `src/main/session-lock-main.js`
  - centralized non-password lock controller;
  - clears the in-memory DEK before UI work;
  - emits `security-session-locked`;
  - optionally reloads the renderer.

- `src/main/device-security-main.js`
  - screen-lock, suspend/resume, idle-state, and storage-loss triggers;
  - normal OS/security events route into the central lock controller.

- `src/main/security-enhancements.js`
  - renderer `unlockedSession`, `panicRunning`, and inactivity timer state;
  - Emergency Lock request and `security-session-locked` handling.

- `src/main/renderer.js`
  - renderer-level `sessionUnlocked` state;
  - login screen initialization;
  - settings/lockout state presentation;
  - `init-system` lifecycle after renderer load/reload.

- `src/main/crypto-ui-bridge.js`
  - password-submit flow;
  - cached `latestSettings` / `latestVaultList` lifecycle;
  - login-button enable/disable behavior;
  - handoff from successful key-envelope authentication to `read-vaultlist-init`.

- `src/main/crypto-session-main.js`
  - active DEK lifecycle;
  - `clearSession()`;
  - key-envelope login in the same process after session destruction.

- `src/main/main.js` / `src/main/bootstrap.js`
  - renderer reload/init handshake;
  - failed-password counter handling;
  - trusted IPC boundaries.

## Required investigation strategy

Implementation must first add or run a deterministic reproduction harness before changing behavior.

The investigation should distinguish four layers:

1. **Password/envelope authentication** — does `crypto-v3-login` accept the same correct password after `clearSession()`?
2. **Unlocked vault handoff** — after envelope authentication succeeds, does `read-vaultlist-init` still receive the active session key?
3. **Renderer lifecycle** — after a lock-triggered reload, are settings, login controls, and cached renderer state freshly initialized?
4. **Lockout accounting** — can a non-password lock or stale UI state accidentally be represented as a password failure?

Instrumentation used for diagnosis must never log passwords, derived keys, the DEK, seed phrases, private keys, or raw vault content.

## Correct behavior contract

For every normal lock path:

1. the active DEK is destroyed first;
2. session-only sensitive fingerprint state is destroyed;
3. the renderer returns to a clean locked/login state;
4. the password field and Login button are usable;
5. the same correct password can authenticate the existing key envelope;
6. the vault list can be authenticated and loaded;
7. the new DEK session is established normally;
8. inactivity/device watchers resume only after unlock;
9. failed-password counters are unchanged by the lock itself;
10. no restart is required.

### Normal lock paths covered by this contract

- Emergency Lock;
- SafeLedger inactivity auto-lock;
- operating-system screen lock;
- suspend;
- resume fail-safe;
- supported idle-state lock.

### Storage-loss exception

A storage disappearance or storage-identity mismatch may continue to require a restart/reconnect because SafeLedger deliberately cannot trust the active portable-storage context after the backing data location disappears or changes.

That behavior must remain clearly separate from the normal lock/unlock continuity bug.

## Preferred fix characteristics

The fix should be the smallest lifecycle correction that restores deterministic re-authentication.

Prefer, in order:

1. correcting stale renderer/auth state initialization;
2. correcting lock/reload sequencing;
3. correcting main-process session-controller state if the real DEK lifecycle is the defect;
4. introducing an explicit sanitized lock-reset handshake only if the current implicit reload handshake cannot be made deterministic.

Do **not**:

- skip key-envelope verification after a lock;
- cache the user's password for automatic re-login;
- keep the DEK alive across the lock;
- restart the whole application as the normal solution;
- count a renderer/session error as a password failure;
- modify Self-Destruct thresholds to hide the issue.

---

# Pillar B — Accessible semantic status controls

## Problem

The Recovery Dashboard and Recovery Health UI intentionally use semantic green/amber/red status pills such as:

- Healthy / Ready;
- Review / Needs Review;
- Incomplete / Unavailable.

The current feature CSS uses pale backgrounds with colored text. In some rendered states, particularly dark-mode/theme overrides and small 11–12px labels, the perceived contrast is too low.

The color language should remain, but readability becomes the primary constraint.

## Contrast contract

All text-bearing controls and status pills inside `#detailArea` must be audited in both light and dark themes.

Minimum release targets:

- **4.5:1** foreground/background contrast for normal-size status/button text;
- **3:1** visible boundary/focus contrast for interactive controls;
- focus state must remain visible without relying on color alone;
- disabled controls must remain readable enough to identify their label/state;
- hover/focus must not reduce contrast below the base state.

The release should use shared semantic tokens rather than per-feature pastel literals.

Proposed token family:

```css
--sl-status-success-bg
--sl-status-success-text
--sl-status-success-border
--sl-status-warning-bg
--sl-status-warning-text
--sl-status-warning-border
--sl-status-danger-bg
--sl-status-danger-text
--sl-status-danger-border
```

with separately validated dark-theme values.

## Components in scope

At minimum audit and normalize:

- `.dashboard-status`;
- `.recovery-readiness-status`;
- the new interactive Portable Storage health control;
- `.btn-default` and other text-bearing controls rendered inside `#detailArea`;
- Settings text buttons;
- Recovery/Test Recovery text buttons;
- backup/restore/verification controls;
- activity filters and other stateful text controls already using semantic colors.

This patch is not a redesign. Button dimensions, overall theme identity, and semantic green/amber/red meaning should remain recognizable.

## CSS ownership rule

2.5.1 should not expand the legacy override problem that 2.6 is scheduled to consolidate.

If new shared semantic tokens are required, put them in the current shared theme/polish owner with a comment that Phase 0 of 2.6 will migrate the authoritative definitions into the final `app-theme.css` ownership model.

Avoid creating another one-off stylesheet.

---

# Pillar C — Open the active SafeLedgerData folder

## User behavior

On the Recovery Dashboard, when Portable Storage is healthy/connected, the **Healthy** status becomes an actual accessible button.

Activating it should open the active SafeLedgerData directory using the host operating system:

- Windows → File Explorer;
- macOS → Finder when 2.6 arrives;
- Linux → the configured/default file manager.

For 2.5.1, Windows and Linux are the required supported platforms.

## Security architecture

The renderer must not provide an arbitrary path to the main process.

The bridge should expose a fixed operation such as:

```text
openDataFolder()
```

The main process alone resolves the trusted current data root using the same `getDataRoot()`/portable-root logic used by the vault runtime.

Proposed trusted flow:

```text
Dashboard Healthy button
        ↓
preload narrow API
        ↓
device-open-data-folder IPC
        ↓
trusted-event validation
        ↓
main process resolves current SafeLedgerData path
        ↓
Electron shell.openPath(...)
        ↓
Explorer / file manager
```

No path argument should cross from renderer to main.

## Failure behavior

If the data directory cannot be opened:

- SafeLedger remains unlocked/unchanged;
- return a sanitized error to the renderer;
- show a readable non-secret status message;
- do not reveal filesystem internals in Activity History;
- do not trigger any lock or Self-Destruct behavior.

The action should have a tooltip and accessible label such as:

**Open SafeLedgerData folder**

If storage is unavailable, the badge remains non-interactive and communicates the storage state rather than offering an action that cannot succeed.

---

# Regression and test design

## New lock continuity suite

Add a focused test file, proposed:

```text
scripts/session-relogin-regression-tests.js
```

It should cover at minimum:

1. initialize a temporary current-format key envelope;
2. unlock with a known test password;
3. verify an active session key exists;
4. invoke the central non-password lock controller;
5. verify the DEK is cleared;
6. authenticate again with the same password in the **same process**;
7. verify a fresh active session key exists;
8. repeat the lock/unlock sequence at least five times;
9. prove a correct post-lock password never becomes a `password-failed` result;
10. prove non-password locks do not modify password-failure counters;
11. prove renderer/session-only cleanup still occurs before UI work;
12. prove storage-loss restart-required semantics remain distinct.

Where practical, add renderer lifecycle coverage that verifies a lock-triggered reset produces:

- fresh settings state;
- enabled Login control;
- enabled password input;
- no stale `saving`, `panicRunning`, or unlocked flags;
- a usable second authentication attempt without application restart.

## Storage-folder action tests

Add regression assertions proving:

1. the preload API exposes a fixed `openDataFolder` operation;
2. the renderer cannot send a path;
3. the main handler validates the sender;
4. the main handler resolves `getDataRoot()` itself;
5. the handler uses the OS shell integration only on that trusted path;
6. dashboard Healthy is interactive only when storage is connected/usable;
7. unavailable storage does not expose the open action.

## Contrast tests

Extend UI/accessibility regression coverage to assert:

1. semantic status states use shared tokenized foreground/background values;
2. known light-theme combinations meet 4.5:1 for text;
3. known dark-theme combinations meet 4.5:1 for text;
4. interactive status controls have a visible focus treatment;
5. text-bearing detail buttons do not use low-contrast pastel foregrounds;
6. the active Activity filter remains compliant.

A small deterministic contrast-ratio helper in the test suite is preferable to visual-only assertions.

---

# Implementation sequence

## Phase 1 — Reproduce and fix lock/re-login defect

- add same-process relogin test harness;
- reproduce the observed failure;
- determine whether the defect is crypto-session, renderer lifecycle, reload sequencing, or lockout state;
- apply the smallest root-cause fix;
- add path-specific tests for Emergency Lock, inactivity, OS screen lock, suspend/resume;
- prove storage-loss exception remains restart-required;
- run full Windows/Linux regression before moving on.

This phase blocks the rest of the release.

## Phase 2 — Status/text contrast pass

- inventory all text-bearing controls in `#detailArea`;
- define shared semantic status colors;
- validate light/dark contrast numerically;
- update Dashboard/Recovery status pills;
- update any other failing text-control states;
- retain semantic color meaning and current layout.

## Phase 3 — Portable storage open action

- add trusted main-process `device-open-data-folder` handler;
- add narrow preload/renderer bridge method;
- convert healthy Portable Storage status to an accessible button;
- open the current trusted `SafeLedgerData` directory with the OS file manager;
- add error/focus/availability tests.

## Phase 4 — 2.5.1 release candidate

Only after all implementation gates are green:

- bump `package.json` / lockfile from 2.5.0 to **2.5.1**;
- update README current-release text;
- update this document from plan to implementation record;
- update the 2.6 plan so its implementation foundation is 2.5.1;
- run final Windows/Linux full regression, Electron crypto smoke, real GUI smoke, packaging, SBOM, and distribution-trust validation on the exact release-candidate head;
- merge only the tested head through protected `master`;
- create `v2.5.1` from that merged commit;
- require the trusted release workflow to publish both official platform artifacts and trust metadata successfully.

SafeLedger 2.6 implementation begins only after 2.5.1 is released and its branch is based on the patched `master` foundation.

---

# Acceptance gates

SafeLedger 2.5.1 is complete only when all of the following are true:

## Session reliability

1. the observed post-lock correct-password failure is deterministically reproduced or otherwise isolated with a regression test;
2. the same correct password unlocks after Emergency Lock without restarting the process;
3. the same correct password unlocks after inactivity auto-lock without restarting;
4. the same correct password unlocks after OS screen lock without restarting;
5. suspend/resume lock behavior allows normal re-authentication without restarting;
6. repeated lock/unlock works for at least five cycles in one process;
7. the DEK is always cleared before renderer/UI cleanup;
8. no password is cached for re-login;
9. non-password locks never increment failed-password counters;
10. non-password locks never trigger Self-Destruct;
11. an incorrect password still fails normally and records the expected password failure;
12. storage disappearance/identity mismatch remains the explicit restart-required exception;
13. no password/DEK/seed/private-key material enters logs or test output.

## Accessibility/UI

14. Healthy/Ready status text meets at least 4.5:1 contrast in light mode;
15. Review/Needs Review status text meets at least 4.5:1 contrast in light mode;
16. Incomplete/Unavailable status text meets at least 4.5:1 contrast in light mode;
17. the corresponding dark-mode status states meet at least 4.5:1;
18. text-bearing controls in the detail/display area pass the release contrast audit;
19. interactive controls have a visible keyboard focus treatment;
20. semantic green/amber/red meaning remains visually recognizable;
21. the current layout/spacing is not redesigned by the hotfix.

## Portable storage action

22. Healthy Portable Storage is keyboard- and mouse-activatable;
23. activating it opens the actual current SafeLedgerData directory in the OS file manager;
24. the renderer cannot choose or inject the filesystem path;
25. trusted-sender validation protects the open-folder IPC;
26. unavailable storage does not expose a misleading open-folder action;
27. open-folder errors are sanitized and non-destructive.

## Release integrity

28. current Windows full regression passes;
29. current Linux full regression passes;
30. Electron crypto smoke passes on both required platforms;
31. real GUI smoke passes on both required platforms;
32. Windows Portable EXE packages successfully;
33. Linux AppImage packages successfully;
34. distribution-trust/SBOM/checksum/provenance tests remain green;
35. vault schema/crypto format remains unchanged;
36. backup/import/recovery compatibility remains unchanged;
37. no runtime network dependency is introduced;
38. package version changes to 2.5.1 only after the implementation gates pass;
39. the exact final 2.5.1 head passes the complete required matrix before merge/tagging;
40. the official `v2.5.1` GitHub Release is published by the trusted tag workflow, not manually assembled.

---

# Deferred to SafeLedger 2.6

2.5.1 intentionally does **not** absorb the larger 2.6 roadmap.

Still deferred to 2.6:

- full CSS ownership consolidation/removal of transitional style layers;
- macOS Apple Silicon (`arm64`) runtime support;
- Developer ID signing;
- Apple notarization/stapling;
- Gatekeeper validation;
- macOS portable-root/translocation handling;
- macOS CI and release artifact;
- broad architecture cleanup unrelated to the hotfix.

2.5.1 should leave SafeLedger safer and easier to use while keeping the larger 2.6 architecture work cleanly separated.
