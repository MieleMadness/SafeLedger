'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const profileSetup = require('../src/main/profile-setup');
const serviceCatalog = require('../src/main/service-catalog');
const assetPresets = require('../src/main/vault-item-asset-presets');
const gate2517 = read('scripts/development-2.5.17-tests.js');
const gate2645 = read('scripts/hotfix-2.6.45-tests.js');

assert.strictEqual(pkg.version, '2.6.46', 'This workflow correction candidate must report SafeLedger 2.6.46.');
assert(read('package.json').includes('node scripts/hotfix-2.6.46-tests.js'),
  '2.6.46 Chain Games historical-test correction must stay in the locked regression suite.');

const chainTemplate = profileSetup.availableTemplates().find((template) => template.name === 'Chain Games');
assert(chainTemplate && chainTemplate.service === true,
  'Chain Games must remain an explicitly reviewed service starter rather than being reclassified as a wallet.');
assert(serviceCatalog.find('Chain Games'),
  'Chain Games starter must retain SafeLedger-owned local service artwork.');
assert(assetPresets.hasAssetPreset('Chain Games', assetPresets.WEB3_CATEGORY),
  'Chain Games starter must retain its reviewed Web3 CHAIN preset.');
assert(gate2517.includes("template.service === true"),
  'The historical 2.5.17 gate must distinguish reviewed service starters from conventional wallet templates.');
assert(gate2517.includes("template.hasIcon === true && template.service !== true"),
  'Wallet-type dropdowns must still contain only conventional logo-backed wallets.');
assert(gate2517.includes("!categoryTemplates.some((template) => template.name === 'Chain Games')"),
  'Chain Games must stay out of Hardware/Software/Other Wallet preset dropdowns.');
assert(gate2645.includes('parts[2] >= 45'),
  'The 2.6.45 preload-wrapper correction gate must remain active on later candidates.');

console.log('PASS SafeLedger 2.6.46 aligns the 2.5.17 historical logo rule with the reviewed Chain Games service starter without weakening wallet dropdown requirements.');
