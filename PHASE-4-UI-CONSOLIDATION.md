# Phase 4 — UI Consolidation

SafeLedger 2.6.52 removes a class of UI bandaids that accumulated while the older renderer was being modernized. The useful behavior is preserved, but screen correctness is now owned by the module that creates the screen instead of by timers, DOM observers, monkeypatches, or synthetic events that run afterward.

## Engineering rule

A timer is appropriate when time itself is the feature: inactivity auto-lock, lockout countdowns, clipboard clearing, animation duration, and print lifecycle delays are valid examples. A timer or observer is **not** appropriate merely to wait for another module to finish rendering so a second module can repair its output.

Likewise, a real user click is an input. Calling `.click()` in code to move application state is a warning that the actual state transition needs an explicit function/callback.

## Bandaid retired: Settings post-render assembly

**What it solved:** Privacy Mode, Self-Destruct, Shit Coin Mode, section ordering, and the Change Password icon were added over several releases without rewriting the original Settings renderer each time.

**Why it became a bandaid:** Opening Settings triggered multiple modules that waited for the page to exist, inserted sections, reordered them with nested `setTimeout` calls, and patched final markup with observers. The final screen had several owners and its correctness depended on callback ordering.

**Replacement:** `settings-ui.js` now renders the complete Settings page in its final order in one pass. It directly owns Appearance, Backup & Recovery, Device & Storage Security, SafeLedger 1.x import, Brute Force Protection, Self-Destruct Protection, Asset Display, Privacy Mode, and Password. The final Change Password icon is created at render time. Normal Settings saves send narrow user-setting patches through the Phase 3 settings boundary.

## Bandaid retired: observer-driven dashboard and Recovery Intelligence repair

**What it solved:** Dashboard rows became fully clickable after rendering, and Recovery Intelligence was inserted after Vault Overview appeared.

**Why it became a bandaid:** `MutationObserver` watched the detail area for DOM changes and treated the DOM itself as an application-state notification system. Recovery Intelligence also had legacy code looking for an older `Recovery Dashboard` heading while a second observer handled the current `Vault Overview` screen.

**Replacement:** `dashboard-ui.js` creates actionable mouse/keyboard rows directly, clears its own stale detail actions, and loads Recovery Intelligence in the same dashboard data flow. `recovery-intelligence-dashboard-ui.js` is now a pure render helper with no page watcher, timeout, or startup listener.

## Bandaid retired: synthetic post-login Profile click

**What it solved:** After login, a helper waited for the Profile list to render, found the first visible link, called `.click()`, waited for the resulting vault read, and then opened the three navigation columns.

**Why it became a bandaid:** Application state depended on a DOM element existing and on a programmatic click reproducing a real user event. Any change to list markup or event order could break startup behavior.

**Replacement:** `renderer.js` computes the first displayed Profile directly from Profile state, marks it selected, sends the trusted read request itself, and reveals the workspace after that authoritative read completes. No DOM query or synthetic click is required.

## Bandaid retired: Vault Item asset seeding through an IPC monkeypatch

**What it solved:** Known wallets/services could receive reviewed starter assets while reusing the existing `process-group` save request. A wrapper replaced `ipc.send`, enriched matching requests, then clicked the selected Vault Item after save so the Asset list refreshed.

**Why it became a bandaid:** It changed a shared IPC function globally and gave a renderer helper responsibility for data that Phase 3 intentionally made main-process-owned. The synthetic refresh click was a second timing dependency.

**Replacement:** `data-write-service.js` now builds reviewed starter records inside the authoritative main-process Vault Item creation transaction. The renderer receives those saved records and calls `record.listRecords()` directly. The IPC monkeypatch and refresh click are removed.

## Bandaid retired: Shit Coin Mode DOM repair

**What it solved:** A document-wide observer changed generic Asset icons to the poop emoji after arbitrary Asset markup appeared.

**Why it became a bandaid:** Rendering one Asset required another module to notice and mutate the finished DOM. Disabling the setting also required remembering/restoring old text through data attributes.

**Replacement:** `display-preferences.js` holds the current renderer display preference, and `record.js` chooses the correct generic fallback while creating each icon. Branded icons remain untouched. No observer or restoration pass is needed.

## Bandaid retired: fake search events and delayed login enhancement

**What it solved:** Search clear buttons and collapsed navigation rails dispatched synthetic keyboard/input events so the existing search listeners would refresh lists. Login security controls and width alignment retried themselves with zero/50ms timers because the final login markup was assembled by multiple modules.

**Why it became a bandaid:** Internal application calls were masquerading as user input, while login correctness depended on guessed render timing.

**Replacement:** Search clear and column collapse use direct callbacks to the list renderers. `renderer.js` creates the password visibility control, strength meter, and login button layout synchronously and immediately applies the title-width alignment. Resize calls the same alignment function directly.

## Bandaid retired: sensitive disclosure icon observer

**What it solved:** A post-render observer kept plus/minus disclosure icons, titles, and QR icon markup consistent after sensitive fields were created.

**Why it became a bandaid:** `security-ui.js` already owned the disclosure element and toggle event, so a second observer was repairing state the owner already knew.

**Replacement:** `security-ui.js` now updates disclosure icon, title, and ARIA state in the same toggle handler that owns the open/closed state. Copy/QR markup is created directly.

## Files retired

- `login-workspace-ui.js`
- `privacy-mode-ui.js`
- `dashboard-action-state-ui.js`
- `dashboard-row-ui.js`
- `recovery-intelligence-vault-overview-ui.js`
- `self-destruct-settings-ui.js`
- `settings-layout-ui.js`
- `search-enhancements.js`
- `sensitive-control-icons-ui.js`
- `vault-item-asset-seeding-ui.js`
- `vault-item-save-forwarder.js`
- `shitcoin-mode-ui.js`
- `settings-icon-fix-ui.js`

## Regression rule

`scripts/ui-consolidation-tests.js` fails if these retired runtime patches return or if the new canonical paths reintroduce the same observer/timer/synthetic-event behavior. Phase 3 Data Ownership tests remain active, so UI cleanup is not allowed to move persistence authority back into the renderer.

## Compatibility

Phase 4 does not change the encrypted vault format, AES-256-GCM/Argon2id design, main-only DEK boundary, offline/portable storage model, 2.x compatibility, or SafeLedger 1.x read-only import. The intended user-visible layouts and controls remain the same; this phase changes who owns rendering and state transitions underneath them.
