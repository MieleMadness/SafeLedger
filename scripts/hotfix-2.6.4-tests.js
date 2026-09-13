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
const lightChain = serviceCatalog.chainGamesAssetUrl('light');
const colorfulChain = serviceCatalog.chainGamesAssetUrl('colorful');
const darkChain = serviceCatalog.chainGamesAssetUrl('dark');
assert.strictEqual(lightChain, './assets/chain-games-light-colorful.svg');
assert.strictEqual(colorfulChain, lightChain, 'Light and Colorful must share the requested black-square Chain Games tile.');
assert.strictEqual(darkChain, './assets/chain-games-dark.svg');
for (const source of [lightChain, darkChain]) {
  assert(fs.existsSync(path.join(root, 'src/main', source.replace('./', ''))), `Missing local Chain Games artwork: ${source}`);
}
const lightSvg = read('src/main/assets/chain-games-light-colorful.svg');
const darkSvg = read('src/main/assets/chain-games-dark.svg');
const leftOnlyMark = 'M156,247.7l-92.9-76.9l92.2-115.4';
assert(lightSvg.includes(leftOnlyMark) && darkSvg.includes(leftOnlyMark), 'Chain Games must use the supplied left icon geometry.');
assert(!lightSvg.includes('M164,4.5C73.4,4.5,0,77.9,0,168.5') && !darkSvg.includes('M164,4.5C73.4,4.5,0,77.9,0,168.5'),
  'The retired circular outer mark must not return.');
assert(lightSvg.includes('fill="#000000"') && lightSvg.includes('fill="#FFFFFF"'),
  'Light/Colorful must use a black square with the white Chain Games mark.');
assert(darkSvg.includes('<rect width="337" height="337" rx="72" fill="#FFFFFF"/>') && darkSvg.includes('fill="#000000"'),
  'Dark must use a white square with the black Chain Games mark.');
assert(!lightSvg.includes('<text') && !darkSvg.includes('<text'), 'Chain Games artwork must not include the wordmark or initials.');

const chainToken = tokenIcons.getIconMatch({ name: 'Chain Games — Polygon', symbol: 'CHAIN' });
assert(chainToken && chainToken.key === 'CHAIN-GAMES');
assert.strictEqual(chainToken.src, lightChain,
  'CHAIN Asset artwork and the Chain Games Vault Item must share the same local theme-aware brand source.');

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

console.log(`PASS SafeLedger ${pkg.version} retains theme-aware square Chain Games artwork while Add Asset requires an explicit Vault Item selection.`);
