'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { audit: auditCssOwnership, printReport: printCssOwnershipReport } = require('./css-ownership-audit');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

const index = read('src/main/index.html');
const manifest = read('src/main/css/app.css');
const css = read('src/main/css/site.css');
const tokenIcons = read('src/main/css/token-icons.css');
const globalSearchCss = read('src/main/css/global-search.css');
const uiPolish = read('src/main/css/ui-polish.css');
const dockCss = read('src/main/css/ui-dock-refinement.css');
const currentUi = read('src/main/css/ui-current.css');

const legacyPatchFiles = [
  'src/main/css/2.0.4.css',
  'src/main/css/2.0.30.css',
  'src/main/css/2.0.35.css',
  'src/main/css/2.0.36.css',
  'src/main/css/2.0.38.css',
  'src/main/css/2.0.39.css',
  'src/main/css/2.0.41.css',
  'src/main/css/2.0.44.css'
];

const retiredHistoricalUiFiles = [
  'src/main/css/ui-2.5.8.css',
  'src/main/css/ui-2.5.9.css',
  'src/main/css/ui-2.5.11.css',
  'src/main/css/ui-2.5.12.css',
  'src/main/css/ui-2.5.13.css',
  'src/main/css/ui-2.5.14.css',
  'src/main/css/ui-2.5.15.css',
  'src/main/css/ui-2.5.16.css',
  'src/main/css/ui-2.6.7-scale.css',
  'src/main/css/ui-2.6.7-theme-refinement.css'
];

const expectedCascade = [
  'site.css',
  'token-icons.css',
  'product-features.css',
  'recovery-refinement.css',
  'activity-history.css',
  'global-search.css',
  'foundation.css',
  'local-icons.css',
  'app-theme.css',
  'ui-polish.css',
  'ui-dock-refinement.css',
  'profile-setup.css',
  'ui-current.css',
  'dashboard-layout.css',
  'status-messages.css',
  'qr-theme.css',
  'workspace-dividers.css',
  'appearance-palettes.css'
];

const stylesheetLinks = Array.from(index.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.css)["'][^>]*>/gi), (match) => match[1]);
assert.deepStrictEqual(stylesheetLinks, ['./css/app.css'],
  'index.html must have one stylesheet owner: css/app.css.');
assert(index.includes('<link id="styleSheet" href="./css/app.css" rel="stylesheet">'),
  'The renderer stylesheet link must point to the canonical app.css manifest.');

const manifestImports = Array.from(manifest.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+\.css)["']\s*\)?[^;]*;/gi), (match) => match[1]);
assert.deepStrictEqual(manifestImports, expectedCascade,
  'app.css must preserve the reviewed cascade order exactly.');
for (const file of expectedCascade) {
  assert(exists(`src/main/css/${file}`), `app.css import is missing from disk: ${file}`);
}
assert(!manifest.includes('app-state.css'),
  'The stylesheet manifest must not reference a non-existent app-state.css patch layer.');

for (const relative of retiredHistoricalUiFiles) {
  const href = `./css/${path.basename(relative)}`;
  assert(!index.includes(href), `${href} must stay retired from the runtime cascade.`);
  assert(!manifest.includes(path.basename(relative)), `${relative} must not return through app.css.`);
  assert.strictEqual(exists(relative), false, `${relative} should stay deleted after consolidation into ui-current.css.`);
}

for (const relative of legacyPatchFiles) {
  assert.strictEqual(exists(relative), false, `${relative} should remain removed`);
}

for (const selector of [
  '.settings-section',
  '.detail-action-area',
  '.safeledger-edit-form',
  '#detailArea .edit-info-grid',
  '.edit-sensitive-shell',
  '#vaultArea .badge-circle.badge-selected',
  '.safeledger-lockout-panel'
]) {
  assert(css.includes(selector), `Consolidated site.css should contain ${selector}`);
}

for (const selector of [
  '.profile-wallet-template-grid',
  '.sl-eye-svg',
  '.edit-sensitive-actions',
  '.sl-copy-sheet',
  '.wallet-list-fallback-icon',
  '#addVault',
  '.password-visibility-shell > .password-visibility-toggle',
  '.wallet-detail-header',
  '.app-menu-bar',
  '::-webkit-scrollbar-thumb'
]) {
  assert(currentUi.includes(selector), `Current UI stylesheet should preserve consolidated behavior for ${selector}`);
}

assert(!css.includes('::-webkit-scrollbar { width: 10px; height: 10px; }'),
  'Base site.css must not reintroduce the duplicate scrollbar-size rule.');
assert(currentUi.includes('::-webkit-scrollbar {\n  width: 10px;\n  height: 10px;\n}'),
  'Theme-aware ui-current.css must remain the canonical scrollbar-size owner.');
assert(!tokenIcons.includes('.coin-list-label {'),
  'Token artwork CSS must not own generic coin-list label truncation.');
assert(globalSearchCss.includes('.profile-list-name, .coin-list-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }'),
  'Global/list layout CSS must remain the canonical coin-list label truncation owner.');
assert(!uiPolish.includes('.detail-action-button .fa-star,\n.detail-action-button .fa-star-o { color: var(--sl-icon-gold) !important; }'),
  'General UI polish must not duplicate favorite-action color ownership.');
assert(dockCss.includes('.detail-action-button .fa-star,\n.detail-action-button .fa-star-o {\n  color: var(--sl-icon-gold) !important;\n}'),
  'Dock refinement must remain the canonical favorite-action color owner.');

assert(exists('scripts/ui-visual-baseline.json'),
  'Consolidated UI must keep a fixture-independent visual baseline after historical CSS files are removed.');
assert(exists('scripts/visual-contract-regression-tests.js'),
  'Consolidated UI must keep its reusable visual-contract gate.');

const cssOwnership = auditCssOwnership();
assert.deepStrictEqual(cssOwnership.missing, [],
  `CSS ownership audit found missing cascade files: ${cssOwnership.missing.join(', ')}`);
assert.strictEqual(cssOwnership.identicalDuplicateSelectorContexts, 0,
  'Canonical CSS cascade must not contain byte-equivalent duplicate selector/context blocks; keep one explicit owner instead.');
printCssOwnershipReport(cssOwnership);

console.log('PASS canonical stylesheet consolidation uses one ordered app.css cascade, single-owner exact selectors, and no retired versioned CSS fixtures.');
