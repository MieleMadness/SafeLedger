'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const serviceCatalog = require(path.join(root, 'src/main/service-catalog.js'));
const tokenIcons = require(path.join(root, 'src/main/token-icons.js'));

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

assert.strictEqual(fs.existsSync(path.join(root, 'src/main/vault-item-selection-ui.js')), false,
  'The capture-phase Vault Item selection UI helper must stay removed.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/vault-item-selection.js')), false,
  'Add Asset must not keep an auto-selection helper after 2.6.8 removes silent destination selection.');
const rendererSource = read('src/main/renderer.js');
const rendererEntry = read('src/main/renderer-entry.js');
assert(rendererSource.includes('function selectedVaultItem()'),
  'Renderer must validate the current Vault Item directly from its authoritative vaultData state.');
assert(rendererSource.includes("statusMsg: 'Select a Vault Item first, then choose Add Asset.'"),
  'Add Asset without a selected Vault Item must instruct the user instead of selecting one silently.');
assert(!rendererSource.includes('ensureAddAssetSelection') && !rendererSource.includes("require('./vault-item-selection')"),
  'Silent Add Asset auto-selection must stay removed.');
assert(!rendererEntry.includes("require('./vault-item-selection-ui.js')"));

const iconCss = read('src/main/css/token-icons.css');
assert(iconCss.includes('width: 28px !important;') && iconCss.includes('height: 28px !important;'),
  'The historical 2.6.4 stylesheet must retain its 28px desktop icon baseline.');
assert(iconCss.includes('.wallet-list-fallback-icon'),
  'Custom/fallback Vault Item icons must use the same sizing contract.');
assert(iconCss.includes('width: 24px !important;') && iconCss.includes('height: 24px !important;'),
  'The historical 2.6.4 stylesheet must retain its 24px compact icon baseline.');

console.log(`PASS SafeLedger ${pkg.version} retains Chain Games artwork while Add Asset requires an explicit Vault Item selection.`);
