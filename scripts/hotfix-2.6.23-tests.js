'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 23,
  'SafeLedger 2.6.23 UI refinements must remain active on 2.6.23 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.23-tests.js'),
  '2.6.23 UI refinement coverage must stay in the locked regression suite.');

const foundation = read('src/main/css/foundation.css');
const editFormUi = read('src/main/edit-form-ui.js');
const walletMetadata = read('src/main/wallet-metadata.js');
const customFieldsUi = read('src/main/custom-fields-ui.js');
const record = read('src/main/record.js');
const presets = read('src/main/vault-item-asset-presets.js');
const shitCoinUi = read('src/main/shitcoin-mode-ui.js');
const tokenCss = read('src/main/css/token-icons.css');
const priorGate = read('scripts/hotfix-2.6.22-tests.js');

assert(foundation.includes('#inputCategory > option[value=""]') &&
  foundation.includes('#inputVaultItemPreset > option[value=""]') &&
  foundation.includes('display: none;'),
  'Vault Item dropdowns must hide duplicated instructional prompt rows from their option lists.');

assert(editFormUi.includes("input.style.maxWidth = '100%';"),
  'Resizable edit textareas must never be allowed to grow wider than their current form panel.');
assert(editFormUi.includes('if (options.resize) input.style.resize = options.resize;'));
assert(walletMetadata.includes("resize: 'vertical'"),
  'Recovery Instructions should remain vertically resizable without horizontal overflow.');

assert(customFieldsUi.includes('function createFixedFieldsEditor(grid, initialFields, fixedFields)'),
  'Asset Network and Contract address should use a simple fixed-field renderer.');
assert(customFieldsUi.includes('if (fixedFields.length) return createFixedFieldsEditor(grid, initialFields, fixedFields);'),
  'Fixed Asset identity fields must bypass the generic Additional Fields editor.');
assert(customFieldsUi.includes("field.className = 'form-group edit-info-grid-field asset-identity-field';"),
  'Network and Contract address should visually follow ordinary Asset form fields.');
assert(customFieldsUi.includes('result.push(field);'),
  'Legacy additional Asset data must stay preserved even when it is no longer exposed in the simplified editor.');
assert(record.includes("Object.freeze({ label: 'Network', type: 'text' })") &&
  record.includes("Object.freeze({ label: 'Contract address', type: 'text' })"),
  'Multichain identity must retain Network and Contract address without changing the vault schema.');
assert(presets.includes("{network:'Polygon',contractAddress:"),
  'Reviewed multichain presets must continue to demonstrate why Asset network identity is required.');

assert(tokenCss.includes('.coin-list-generic-icon.shit-coin-icon') &&
  tokenCss.includes('background: transparent !important;') &&
  tokenCss.includes('font-size: 24px !important;'),
  'Navigation Shit Coin artwork should be backgroundless and visually match other Asset icons.');
assert(tokenCss.includes('.coin-brand-generic.shit-coin-icon') && tokenCss.includes('font-size: 42px !important;'),
  'Detail Shit Coin artwork should be large enough to match other detail icons.');

assert(shitCoinUi.includes("label.className = 'privacy-mode-toggle settings-field-label shit-coin-mode-option';"),
  'Shit Coin Mode should use the same checkbox treatment as other Settings toggles.');
assert(shitCoinUi.includes("save.className = 'btn btn-default settings-section-save';") &&
  shitCoinUi.includes("save.textContent = 'Save Shit Coin Mode';"),
  'Shit Coin Mode should use the standard Settings save-button treatment.');
assert(shitCoinUi.includes("node.classList.remove('shit-coin-icon');") &&
  shitCoinUi.includes("node.textContent = node.dataset.originalText || '';"),
  'Turning Shit Coin Mode off must restore the original local ticker fallback.');

assert(priorGate.includes('parts[2] >= 22'),
  'The approved 2.6.22 deletion/accessibility gate must remain active on later 2.6.x candidates.');

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.23 dropdown, Recovery Instructions, Asset identity, and Shit Coin Mode refinements active.`);
