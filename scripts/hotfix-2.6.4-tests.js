'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const serviceCatalog = require(path.join(root, 'src/main/service-catalog.js'));
const tokenIcons = require(path.join(root, 'src/main/token-icons.js'));
const selection = require(path.join(root, 'src/main/vault-item-selection.js'));

const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 4,
  'SafeLedger 2.6.4 Add Asset/icon regressions must remain active on 2.6.4 and later 2.6.x patches.');

const chainService = serviceCatalog.find('Chain Games');
assert(chainService && chainService.artwork === 'chain-games', 'Chain Games must use dedicated local brand artwork.');
const chainUrl = serviceCatalog.iconDataUrl(chainService);
assert(chainUrl.startsWith('data:image/svg+xml;charset=utf-8,'), 'Chain Games icon must remain local/offline.');
const chainSvg = decodeURIComponent(chainUrl.slice(chainUrl.indexOf(',') + 1));
assert(chainSvg.includes('chain-games-gradient') && chainSvg.includes('<path'),
  'Chain Games must render vector brand artwork rather than an initials-only tile.');
assert(!chainSvg.includes('<text'), 'Chain Games Vault Item icon must not fall back to CG initials.');

const chainToken = tokenIcons.getIconMatch({ name: 'Chain Games — Polygon', symbol: 'CHAIN' });
assert(chainToken && chainToken.key === 'CHAIN-GAMES');
assert.strictEqual(chainToken.src, chainUrl,
  'CHAIN Asset artwork and the Chain Games Vault Item must share the same local brand source.');

const vaultData = { groups: [{ name: 'First Vault Item' }], groupSelected: null, recordSelected: null };
const firstSelection = selection.ensureAddAssetSelection(vaultData);
assert.strictEqual(firstSelection.ok, true,
  'Add Asset must be able to select the first available Vault Item directly in application state.');
assert.strictEqual(firstSelection.changed, true);
assert.strictEqual(firstSelection.index, 0);
assert.strictEqual(vaultData.groupSelected, 0);
assert.strictEqual(vaultData.recordSelected, null);
const secondSelection = selection.ensureAddAssetSelection(vaultData);
assert.strictEqual(secondSelection.changed, false, 'An existing valid Vault Item selection must be preserved.');
assert.strictEqual(secondSelection.index, 0);

const selectionSource = read('src/main/vault-item-selection.js');
for (const forbidden of ['renderer-bridge', 'ipcRenderer', 'window.', 'document.', 'addEventListener', '.click()']) {
  assert(!selectionSource.includes(forbidden), `Canonical selection state must not depend on ${forbidden}.`);
}
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/vault-item-selection-ui.js')), false,
  'The capture-phase Vault Item selection UI helper must stay removed.');
const rendererSource = read('src/main/renderer.js');
const rendererEntry = read('src/main/renderer-entry.js');
assert(rendererSource.includes("const vaultItemSelection = require('./vault-item-selection');"));
assert(rendererSource.includes('vaultItemSelection.ensureAddAssetSelection(vaultData)'));
assert(!rendererEntry.includes("require('./vault-item-selection-ui.js')"),
  'Renderer entry must not restore the old selection interception module.');

const iconCss = read('src/main/css/token-icons.css');
assert(iconCss.includes('width: 28px !important;') && iconCss.includes('height: 28px !important;'),
  'The historical 2.6.4 stylesheet must retain its 28px desktop icon baseline.');
assert(iconCss.includes('.wallet-list-fallback-icon'),
  'Custom/fallback Vault Item icons must use the same sizing contract.');
assert(iconCss.includes('width: 24px !important;') && iconCss.includes('height: 24px !important;'),
  'The historical 2.6.4 stylesheet must retain its 24px compact icon baseline.');

console.log(`PASS SafeLedger ${pkg.version} retains Chain Games artwork while Add Asset selection is owned directly by renderer state.`);