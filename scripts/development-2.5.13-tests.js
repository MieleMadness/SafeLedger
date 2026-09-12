'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const vaultItemPresentation = require(path.join(root, 'src', 'main', 'vault-item-presentation.js'));

function assertAlphabetical(values, label) {
  const actual = [...values];
  const expected = [...values].sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
  assert.deepStrictEqual(actual, expected, `${label} should be alphabetized for predictable scanning.`);
}

function assertGroupedAlphabetical(groups, label) {
  assertAlphabetical(groups.map((group) => group.label), `${label} groups`);
  for (const group of groups) assertAlphabetical(group.names, `${label} ${group.label} choices`);
}

assertGroupedAlphabetical(vaultItemPresentation.groupedPresetNames(vaultItemPresentation.EXCHANGE_CATEGORY), 'Exchange platform');
assertGroupedAlphabetical(vaultItemPresentation.groupedPresetNames(vaultItemPresentation.WEB3_CATEGORY), 'Web3 platform');
assertGroupedAlphabetical(vaultItemPresentation.groupedPresetNames(vaultItemPresentation.WEBSITE_CATEGORY), 'Website platform');

const walletIcons = read('src/main/wallet-icons.js');
assert(walletIcons.includes('wallet-list-fallback-icon'), 'Unknown wallets should use a visible local fallback icon.');
assert(walletIcons.includes('sl-wallet-fallback-svg'), 'Wallet fallback should be SVG-based rather than a font glyph.');
assert(!walletIcons.includes("fallback.className = 'glyphicon glyphicon-piggy-bank wallet-list-icon'"),
  'Unknown wallets should no longer depend on the old box-like glyph fallback.');

const css = read('src/main/css/ui-current.css');
assert(css.includes('.compact-qr-area .qr-caption'));
assert(css.includes('color: #172033 !important;'),
  'QR captions sit on a white QR card and must use an explicit dark foreground in every theme.');
assert(css.includes('.wallet-list-fallback-icon'));

const index = read('src/main/index.html');
assert(index.includes('./css/ui-current.css'), 'SafeLedger must load the consolidated current UI refinement layer.');

console.log('PASS SafeLedger 2.5.13 QR caption contrast, grouped/alphabetized Vault Item platform choices, and visible wallet fallback icon.');