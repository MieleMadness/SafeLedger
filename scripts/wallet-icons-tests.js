'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const prepare = read('scripts/prepare-token-assets.js');
const helper = read('src/main/wallet-icons.js');
const ui = read('src/main/wallet-icons-ui.js');
const entry = read('src/main/renderer-entry.js');
const css = read('src/main/css/token-icons.css');

assert.strictEqual(pkg.version, '2.5.2', '2.5.2 wallet icon work must carry the 2.5.2 package version');
assert(prepare.includes("availableIconNames('wallets')"), 'wallet artwork should be discovered from the installed local icon package');
assert(prepare.includes("loadBestIcon('wallets', iconName)"), 'wallet artwork should use the same offline SVG preparation path as crypto assets');
assert(prepare.includes("wallets: {}"), 'generated icon manifest should include a wallet section');
assert(prepare.includes("manifest.wallets['coinbase wallet']"), 'Coinbase Wallet display alias should receive the Base App icon');
assert(prepare.includes("'rabby-wallet': ['rabby']"), 'Rabby Wallet should resolve the Web3Icons Rabby slug');
assert(helper.includes("'coinbase wallet': 'base app (coinbase wallet)'"), 'runtime helper should normalize Coinbase Wallet');
assert(helper.includes("'bitbox02': 'bitbox02 multi'"), 'runtime helper should normalize BitBox02');
assert(helper.includes("return key && manifest.wallets ? manifest.wallets[key] || null : null"), 'missing wallet artwork must fall back safely');
assert(ui.includes("wallet-list-brand-image"), 'wallet list should support branded artwork');
assert(ui.includes("wallet-detail-brand-image"), 'wallet detail heading should support branded artwork');
assert(ui.includes("wallet-detail-generic-icon"), 'unknown/custom wallets should retain a generic detail icon');
assert(ui.includes('MutationObserver'), 'wallet icon decoration should survive normal wallet list/detail rerenders');
assert(entry.includes("require('./wallet-icons-ui.js')"), 'wallet icon UI module must be loaded by the renderer bundle');
assert(css.includes('.wallet-list-brand-image'));
assert(css.includes('.wallet-detail-brand-image'));
assert(css.includes('.wallet-detail-generic-icon'));

console.log('PASS SafeLedger 2.5.2 wallet icons are local-only, rerender-safe, aliased for catalog names, and preserve a generic fallback.');
