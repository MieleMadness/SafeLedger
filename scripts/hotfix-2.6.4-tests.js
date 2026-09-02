'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const serviceCatalog = require(path.join(root, 'src/main/service-catalog.js'));
const tokenIcons = require(path.join(root, 'src/main/token-icons.js'));
const selectionUi = require(path.join(root, 'src/main/vault-item-selection-ui.js'))._test;

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

let selected = null;
let clicks = 0;
const vaultData = { groups: [{ name: 'First Vault Item' }], groupSelected: null, recordSelected: null };
const first = {
  click() {
    clicks += 1;
    selected = first;
    vaultData.groupSelected = 0;
  }
};
const fakeDocument = {
  querySelector(selector) {
    if (selector === '#groupArea .nav > li > a.item-selected') return selected;
    if (selector === '#groupArea .nav > li > a') return first;
    return null;
  }
};
assert.strictEqual(selectionUi.ensureVaultItemSelected(fakeDocument, vaultData), first,
  'A loaded Profile with visible Vault Items must select its first item when none is selected.');
assert.strictEqual(clicks, 1);
assert.strictEqual(selectionUi.ensureVaultItemSelected(fakeDocument, vaultData), first,
  'An existing Vault Item selection must be preserved.');
assert.strictEqual(clicks, 1, 'Existing Vault Item selection must not be clicked again.');

const selectionSource = read('src/main/vault-item-selection-ui.js');
assert(selectionSource.includes("result.type !== 'vault-read'"),
  'Default selection must remain tied to completed Profile vault reads.');
assert(selectionSource.includes("addAsset.addEventListener('click'"),
  'Add Asset must keep a capture-phase selection repair before the normal Add Asset handler runs.');
const rendererEntry = read('src/main/renderer-entry.js');
assert(rendererEntry.includes("require('./vault-item-selection-ui.js')"),
  'The Vault Item selection guard must load in the real renderer bundle.');

const iconCss = read('src/main/css/token-icons.css');
assert(iconCss.includes('width: 28px !important;') && iconCss.includes('height: 28px !important;'),
  'Vault Item and Asset list icons must share the larger 28px desktop size.');
assert(iconCss.includes('.wallet-list-fallback-icon'),
  'Custom/fallback Vault Item icons must use the same sizing contract.');
assert(iconCss.includes('width: 24px !important;') && iconCss.includes('height: 24px !important;'),
  'Compact layouts must keep a readable, equal 24px list icon size.');

console.log(`PASS SafeLedger ${pkg.version} retains the 2.6.4 Add Asset selection and larger unified Chain Games icon regressions.`);