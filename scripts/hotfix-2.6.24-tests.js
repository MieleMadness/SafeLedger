'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 24,
  'SafeLedger 2.6.24 recovery UI refinements must remain active on 2.6.24 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.24-tests.js'),
  '2.6.24 recovery UI coverage must stay in the locked regression suite.');

const statusSource = read('src/main/status.js');
const groupSource = read('src/main/group.js');
const drillSource = read('src/main/recovery-drill-ui.js');
const productCss = read('src/main/css/product-features.css');
const priorGate = read('scripts/hotfix-2.6.23-tests.js');

assert(statusSource.includes("iconClass: 'fa fa-trash'"),
  'Item Deleted must use a trash-can icon instead of the generic danger circle.');
assert(statusSource.includes("role: 'status', ariaLive: 'polite'"),
  'Successful deletion must remain a polite status rather than becoming an assertive error.');

assert(groupSource.includes("'<i class=\"fa fa-refresh\"></i> Run recovery drill'"),
  'Run recovery drill must use the bundled refresh/retest glyph that renders in SafeLedger.');
assert(!productCss.includes('.recovery-readiness-actions .fa-shield::before'),
  'The unsupported recovery pseudo-glyph that rendered as a rectangle must stay removed.');
assert(drillSource.includes("privacyIcon.className = 'fa fa-lock';"),
  'The Recovery Validation safety callout must use a clear lock icon.');
assert(!drillSource.includes("privacyIcon.className = 'fa fa-shield';"),
  'The old shield/diamond safety icon must not return.');

const renderStart = drillSource.indexOf('function render(params = {})');
assert(renderStart >= 0, 'Recovery Validation render function must remain present.');
const renderSource = drillSource.slice(renderStart);
const bipIndex = renderSource.indexOf('appendOptionalBip39Check(area);');
const privacyIndex = renderSource.indexOf("privacy.className = 'recovery-drill-privacy';");
const checklistIndex = renderSource.indexOf("checklist.className = 'recovery-drill-wizard recovery-drill-checklist';");
assert(bipIndex >= 0 && privacyIndex >= 0 && checklistIndex >= 0,
  'Recovery Validation must retain the privacy callout, all-visible recovery checklist, and optional BIP39 checker.');
assert(privacyIndex < checklistIndex && checklistIndex < bipIndex,
  'Recovery Validation should present safety guidance and the complete checklist before the optional one-time BIP39 checker.');
assert.strictEqual((renderSource.match(/appendOptionalBip39Check\(area\);/g) || []).length, 1,
  'The BIP39 checker must render exactly once.');
assert(drillSource.includes("input.type = 'password';") && drillSource.includes("input.autocomplete = 'off';"),
  'The optional mnemonic field must remain a non-autofilled password-style input.');
assert(drillSource.includes('separated by spaces') && drillSource.includes('Do not use commas or join the words together.'),
  'BIP39 guidance must clearly require space-separated mnemonic words.');
assert(drillSource.includes("input.value = '';"),
  'The temporary BIP39 value must be cleared immediately after local validation.');
assert(!drillSource.includes('localStorage') && !drillSource.includes('sessionStorage'),
  'Recovery Validation must not persist BIP39 input or checklist state in renderer storage.');
assert(drillSource.includes("checkboxes.every((checkbox) => checkbox.checked)"),
  'Completion must remain gated until every visible recovery check is confirmed.');
assert(!drillSource.includes("title: 'Previous step'") && !drillSource.includes("title: 'Next step'"),
  'Retired Previous/Next wizard navigation must not return.');
assert(drillSource.includes("actions.className = 'settings-section-actions recovery-drill-validation-actions';"),
  'BIP39 validation actions must have a dedicated spacing hook.');
assert(/\.recovery-drill-validation-actions\s*\{[^}]*margin-top\s*:\s*6px\s*;?[^}]*\}/.test(productCss),
  'BIP39 field-to-button spacing must remain six pixels without depending on CSS whitespace formatting.');

assert(priorGate.includes('parts[2] >= 23'),
  'The 2.6.23 UI gate must remain active on later workflow candidates.');

console.log(`PASS SafeLedger ${pkg.version} keeps the deletion trash icon, bundled recovery-validation icon, all-visible gated Recovery Validation checklist, and local-only space-separated BIP39 safety active.`);
