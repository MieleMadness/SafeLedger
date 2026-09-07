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
const settingsUi = read('src/main/settings-ui.js');
const displayPreferences = require('../src/main/display-preferences');
const displayPreferencesSource = read('src/main/display-preferences.js');
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

assert(record.includes("Object.freeze({ label: 'Network', type: 'text' })") &&
  record.includes("Object.freeze({ label: 'Contract address', type: 'text' })"),
  'Multichain identity must retain Network and Contract address without changing the vault schema.');
assert(record.includes('const customFieldEditor = customFieldsUi.createEditor(') &&
  record.includes('for (const identityField of ASSET_IDENTITY_FIELDS) customFieldEditor.lockFixedField(identityField);'),
  'The canonical Asset editor must expose user custom fields while locking Network and Contract address directly.');
assert(record.includes('rec.customFields = customFieldEditor.getFields();'),
  'Asset saves must persist the complete normalized custom-field list, including user-defined fields.');
assert(customFieldsUi.includes('function lockFixedField(field = {})') &&
  customFieldsUi.includes("rowState.row.dataset.assetIdentityField = normalized.label;") &&
  customFieldsUi.includes("add.innerHTML = '<i class=\"fa fa-plus\" aria-hidden=\"true\"></i> Add custom field';"),
  'The shared custom-field editor must protect identity controls while keeping Add custom field available.');
assert(!record.includes('fixedFields: ASSET_IDENTITY_FIELDS'),
  'Asset rendering must not return to the retired fixed-only editor that hid user custom fields.');
assert(record.includes('displayPreferences.genericAssetFallback(symbol, maxLength)'),
  'Unknown Asset artwork must be selected directly by the Asset renderer.');
assert(presets.includes("{network:'Polygon',contractAddress:"),
  'Reviewed multichain presets must continue to demonstrate why Asset network identity is required.');

assert(tokenCss.includes('.coin-list-generic-icon.shit-coin-icon') &&
  tokenCss.includes('background: transparent !important;') &&
  tokenCss.includes('font-size: 24px !important;'),
  'Navigation Shit Coin artwork should be backgroundless and visually match other Asset icons.');
assert(tokenCss.includes('.coin-brand-generic.shit-coin-icon') && tokenCss.includes('font-size: 42px !important;'),
  'Detail Shit Coin artwork should be large enough to match other detail icons.');

assert(settingsUi.includes("label.className = 'privacy-mode-toggle settings-field-label shit-coin-mode-option';"),
  'Shit Coin Mode should use the same checkbox treatment as other Settings toggles.');
assert(settingsUi.includes("save.className = 'btn btn-default settings-section-save';") &&
  settingsUi.includes("save.textContent = 'Save Shit Coin Mode';"),
  'Shit Coin Mode should use the standard Settings save-button treatment.');
assert(settingsUi.includes('saveUserSetting(params, { shitCoinMode: input.checked === true }, save)'),
  'Shit Coin Mode must save through the canonical narrow Settings mutation path.');

assert(displayPreferencesSource.includes("text: '💩'"));
assert(displayPreferencesSource.includes("className: 'shit-coin-icon'"));
displayPreferences.setSettings({ shitCoinMode: true });
const jokeFallback = displayPreferences.genericAssetFallback('ABC', 2);
assert.strictEqual(jokeFallback.text, '💩');
assert.strictEqual(jokeFallback.className, 'shit-coin-icon');
displayPreferences.setSettings({ shitCoinMode: false });
const normalFallback = displayPreferences.genericAssetFallback('ABC', 2);
assert.strictEqual(normalFallback.text, 'AB', 'Turning Shit Coin Mode off must restore the normal local ticker fallback.');
assert.strictEqual(normalFallback.className, '');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/shitcoin-mode-ui.js')), false,
  'The retired document-wide Shit Coin Mode repair observer must stay removed.');

assert(priorGate.includes('parts[2] >= 22'),
  'The approved 2.6.22 deletion/accessibility gate must remain active on later 2.6.x candidates.');

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.23 dropdown, Recovery Instructions, editable protected Asset identity/custom fields, and directly rendered Shit Coin Mode refinements active.`);