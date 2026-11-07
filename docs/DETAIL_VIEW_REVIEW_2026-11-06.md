# Detail-view lifecycle review — November 6, 2026

Follow-up to the search review. Used the installed UI/UX Pro Max, Emil Design
Engineering, and Impeccable guidance for asynchronous feedback, navigation,
accessible control states, and conservative refinement of the existing UI.

Reviewed the asynchronous display paths in Activity History, Vault Overview,
Recovery Binder, settings health population, and recovery validation. Settings
health updates its captured child nodes, so detached responses do not replace
the current detail view. The following three paths had confirmed stale-view
ownership problems instead. This is a focused source review, not an exhaustive
security audit.

| Before | After | Why |
| --- | --- | --- |
| Activity History could replace a newer view after its request completed. | Success and failure update only if the request's loading node is still attached to the current detail area. | Prevents delayed replies from replacing navigation or login UI. |
| Vault Overview awaited multiple services, then rendered into whichever screen was current. | Verifies its own loading node still belongs to the attached detail area before rendering or showing an error. | A summary requested before lock must not repopulate the lock screen. |
| Recovery Binder continued appending options and replacing action buttons after navigation during its initial fetch. | Checks its original summary node remains attached before any post-fetch work. | Prevents recovery controls from appearing on an unrelated view. |
| Activity filters communicated selected state only through styling. | Labeled filter group and mutually updated `aria-pressed` values. | Exposes the current filter to assistive technology. |
| Loading/error messages lacked status semantics on these screens. | Status roles on loading summaries and alert roles on History/Overview errors. | Gives assistive technology a defined announcement surface. |

The existing shared filter focus styling was verified in Chromium; no redundant
CSS override was retained. The installed skill database did not return a verified
match for the specific pressed-state query after narrowing it; that change uses
the skill's general accessibility guidance rather than a claimed database match.
No new dependency, encryption change, storage migration, or visual redesign.

## Verification

- New isolated Chromium regression failed against the prior Activity History
  implementation, reproducing a late response replacing a newer screen.
- Fixed implementation passes late success and late failure tests for all three
  screens, including preservation of the newer detail action buttons.
- Overlapping Activity requests preserve the newer response; category filters
  expose exactly one pressed state and render the appropriate empty state.
- All 52 existing canonical regression suites passed in one run (37.9 seconds).
- Existing GUI smoke, search fixture, and detail-view fixture passed together.
  Both fixtures are now included in the existing GUI smoke runner so the current
  cross-platform workflow will execute them when that workflow is triggered.
- Activity layout fits a 540px detail panel in 1100×760 and 640×760 Chromium
  viewports across Light, Dark, and Colorful. Theme captures were generated;
  Light and compact Dark were visually inspected. Existing focus styles were
  checked using Chromium's forced focus/focus-visible pseudo-states because the
  hidden fixture does not own OS keyboard focus.
- Syntax/diff whitespace checks passed for authored changes.

Fixtures use synthetic records and mocked service promises, without opening a
real vault. They simulate replacing the detail area as lock/navigation does;
they do not claim physical-device or native screen-reader verification. Hosted
Windows/Linux/macOS packaging has not been run for this patch.

Standalone check: `node scripts/detail-view-ui-smoke.js`.
Combined GUI check: `node scripts/run-gui-smoke.js` after renderer preparation.
Optional `SAFELEDGER_UI_CAPTURE_DIR` generates the six Activity captures.
