'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

const index = read('src/main/index.html');
const css = read('src/main/css/site.css');
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

assert(index.includes('./css/site.css'));
assert(index.includes('./css/token-icons.css'));
assert(index.includes('./css/ui-current.css'));
assert(!index.includes('./css/2.0.'));
for (const relative of retiredHistoricalUiFiles) {
  const href = `./css/${path.basename(relative)}`;
  assert(!index.includes(href), `${href} must stay retired from the runtime cascade.`);
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

assert(exists('scripts/ui-visual-baseline.json'),
  'Consolidated UI must keep a fixture-independent visual baseline after historical CSS files are removed.');
assert(exists('scripts/visual-contract-regression-tests.js'),
  'Consolidated UI must keep its reusable visual-contract gate.');

console.log('PASS canonical stylesheet consolidation keeps one current UI cascade and no retired versioned CSS fixtures.');
