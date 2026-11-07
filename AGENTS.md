# SafeLedger development

This branch builds on the unmerged 2.6.120 documentation candidate. Development
changes must not be described as released. Do not merge or publish a release
without user authorization.

Project-local interface skills are installed in `.agents/skills/`:
- `ui-ux-pro-max`: targeted UX and accessibility guidance.
- `emil-design-eng`: interaction and component review.
- `impeccable`: audit, hardening, and polish guidance.

Read the relevant SKILL.md before applying it. Versions and origins are recorded
in `.agents/skills/sources.json`; upstream licenses are retained. Preserve the
existing Light/Colorful/Dark appearance system during refinements.

Use disposable records for UI tests, never real vault contents. Keep encryption
and storage changes separate from interface refinements. Existing regression
tests run with `npm run test:regression`; the isolated search interaction check
runs with `node scripts/global-search-ui-smoke.js` after dependencies are installed.
