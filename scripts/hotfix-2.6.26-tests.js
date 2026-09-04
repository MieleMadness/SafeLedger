'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 26,
  'SafeLedger 2.6.26 UI behavior must remain active on 2.6.26 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.26-tests.js'),
  '2.6.26 UI behavior coverage must stay in the locked regression suite.');

const foundation = read('src/main/css/foundation.css');
const rendererEntry = read('src/main/renderer-entry.js');
const collapseSource = read('src/main/column-collapse-ui.js');
const groupSource = read('src/main/group.js');
const productCss = read('src/main/css/product-features.css');
const customFieldsUi = read('src/main/custom-fields-ui.js');
const presentationSource = read('src/main/vault-item-presentation.js');
const presentation = require('../src/main/vault-item-presentation.js');
const collapseUi = require('../src/main/column-collapse-ui.js');

assert(groupSource.includes("'<i class=\"fa fa-refresh\"></i> Run recovery drill'"),
  'Recovery drill must use a Font Awesome glyph already bundled by SafeLedger.');
assert(!productCss.includes('.recovery-readiness-actions .fa-shield::before'),
  'The unsupported recovery pseudo-glyph that rendered as a rectangle must stay removed.');

for (const category of [presentation.EXCHANGE_CATEGORY, presentation.WEB3_CATEGORY, presentation.WEBSITE_CATEGORY]) {
  const labels = presentation.accountFields(category).map(([label]) => label);
  assert(!labels.includes('Login method'), `${category} must not auto-create Login method.`);
}
assert(!presentation.accountFields(presentation.WEB3_CATEGORY).map(([label]) => label).includes('Connected wallet(s)'),
  'Web3 presets must not auto-create Connected wallet(s).');
assert(presentationSource.includes("const RETIRED_EMPTY_ACCOUNT_FIELDS = Object.freeze(['Login method', 'Connected wallet(s)']);"));
assert(presentationSource.includes('removeRetiredEmptyAccountFields(customEditor);'),
  'Existing blank retired preset rows should be cleaned during Add/Edit layout setup.');
assert(customFieldsUi.includes('function removeEmptyField(label)'));
assert(customFieldsUi.includes('if (!isEmpty) return false;'),
  'Retired preset cleanup must preserve any existing populated value.');

for (const variable of ['--sl-profile-column', '--sl-vault-column', '--sl-asset-column']) {
  assert(foundation.includes(`${variable}: minmax(0, 2fr);`),
    'Expanded Profile, Vault Item, and Asset columns must remain equal.');
}
assert(foundation.includes('--sl-detail-column: minmax(0, 5fr);'));
assert(foundation.includes('--sl-compact-nav-column: 56px;'));
assert(foundation.includes('[data-profile-collapsed="true"]'));
assert(foundation.includes('[data-vault-collapsed="true"]'));
assert(foundation.includes('[data-asset-collapsed="true"]'));
assert(foundation.includes('.nav-column-collapsed.nav-column-search .search-field-wrap'));
assert(foundation.includes('.nav-column-collapsed.nav-column-button .bottom-space'));

assert(rendererEntry.indexOf("require('./column-collapse-ui.js');") > rendererEntry.indexOf("require('./renderer.js');"),
  'Compact rail controls must attach after the canonical renderer has wired normal navigation behavior.');
assert.deepStrictEqual(collapseUi._test.COLUMNS.map((column) => column.key), ['profile', 'vault', 'asset']);
assert(collapseSource.includes("toggle.setAttribute('aria-label', `${action} ${config.label}`);"),
  'Each compact-rail control must expose an explicit Collapse/Expand accessible label.');
assert(collapseSource.includes("toggle.setAttribute('aria-expanded', state.collapsed ? 'false' : 'true');"));
assert(collapseSource.includes("fa-chevron-${state.collapsed ? 'right' : 'left'}"));
assert(collapseSource.includes("input.dispatchEvent(new Event('input', { bubbles: true }));") &&
  collapseSource.includes("input.dispatchEvent(new Event('keyup', { bubbles: true }));"),
  'Collapsing a rail must clear a hidden active search instead of leaving mysteriously filtered icons.');
assert(collapseSource.includes("link.setAttribute('aria-label', text);"),
  'Compact list icons must retain item names for accessibility.');
assert(!/\bnew\s+MutationObserver\s*\(/.test(collapseSource) && !/\bMutationObserver\s*\(/.test(collapseSource),
  'Compact navigation must not instantiate or call a post-render MutationObserver patch loop.');
assert(collapseSource.includes("mainCell.addEventListener('mouseover', refreshLabels);") &&
  collapseSource.includes("mainCell.addEventListener('focusin', refreshLabels);"),
  'Compact navigation should keep labels current through ordinary delegated events.');
assert(!collapseSource.includes('localStorage'),
  'Columns should start expanded on each launch rather than hiding labels by default from a persisted preference.');

console.log(`PASS SafeLedger ${pkg.version} keeps the rendered recovery icon, safe preset cleanup, and explicit accessible compact navigation rails active.`);
