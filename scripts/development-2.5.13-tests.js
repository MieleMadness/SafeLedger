'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const vaultItemUi = require(path.join(root, 'src', 'main', 'vault-item-ui.js'));

function assertAlphabetical(values, label) {
  const actual = [...values];
  const expected = [...values].sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
  assert.deepStrictEqual(actual, expected, `${label} should be alphabetized for predictable scanning.`);
}

assertAlphabetical(vaultItemUi._test.presetNames(vaultItemUi.EXCHANGE_CATEGORY), 'Exchange platform choices');
assertAlphabetical(vaultItemUi._test.presetNames(vaultItemUi.SERVICE_CATEGORY), 'Web3 / website platform choices');

const walletIcons = read('src/main/wallet-icons.js');
assert(walletIcons.includes('wallet-list-fallback-icon'), 'Unknown wallets should use a visible local fallback icon.');
assert(walletIcons.includes('sl-wallet-fallback-svg'), 'Wallet fallback should be SVG-based rather than a font glyph.');
assert(!walletIcons.includes("fallback.className = 'glyphicon glyphicon-piggy-bank wallet-list-icon'"),
  'Unknown wallets should no longer depend on the old box-like glyph fallback.');

const css = read('src/main/css/ui-2.5.13.css');
assert(css.includes('.compact-qr-area .qr-caption'));
assert(css.includes('color: #172033 !important;'),
  'QR captions sit on a white QR card and must use an explicit dark foreground in every theme.');
assert(css.includes('.wallet-list-fallback-icon'));

const index = read('src/main/index.html');
assert(index.includes('./css/ui-2.5.13.css'), 'SafeLedger must load the 2.5.13 refinement layer after prior UI CSS.');

console.log('PASS SafeLedger 2.5.13 QR caption contrast, alphabetized platform choices, and visible wallet fallback icon.');
