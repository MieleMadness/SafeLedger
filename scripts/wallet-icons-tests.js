'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const prepare = read('scripts/prepare-token-assets.js');
const helperSource = read('src/main/wallet-icons.js');
const tokenHelperSource = read('src/main/token-icons.js');
const ui = read('src/main/wallet-icons-ui.js');
const entry = read('src/main/renderer-entry.js');
const css = read('src/main/css/token-icons.css');
const readme = read('README.md');

// Generate the exact offline manifest this release will package. This makes the
// regression test validate Web3Icons discovery/metadata resolution as well as
// the renderer-side lookup helpers.
execFileSync(process.execPath, [path.join(root, 'scripts', 'prepare-token-assets.js')], {
  cwd: root,
  stdio: 'pipe'
});

const manifest = JSON.parse(read('src/main/assets/token-icons/manifest.json'));
const walletIcons = require('../src/main/wallet-icons');
const tokenIcons = require('../src/main/token-icons');

assert.strictEqual(pkg.version, '2.5.2', '2.5.2 wallet icon work must carry the 2.5.2 test-candidate version');
assert(prepare.includes("loadMetadata('@web3icons/common/metadata/tokens'"), 'all Web3Icons token metadata should be available to custom assets');
assert(prepare.includes("loadMetadata('@web3icons/common/metadata/networks'"), 'all Web3Icons network metadata should be available to custom assets');
assert(prepare.includes("loadMetadata('@web3icons/common/metadata/wallets'"), 'all Web3Icons wallet metadata should be available to custom wallets');
assert(prepare.includes("availableIconNames('tokens')"), 'physical token artwork should be discovered even if metadata changes');
assert(prepare.includes("availableIconNames('networks')"), 'physical network artwork should be discovered even if metadata changes');
assert(prepare.includes("availableIconNames('wallets')"), 'physical wallet artwork should be discovered even if metadata changes');
assert.strictEqual(manifest.version, 3, 'full-registry icon manifests must use the compact version-3 lookup format');
assert(manifest.icons && Object.keys(manifest.icons).length > 100, 'the generated manifest should contain the broad Web3Icons artwork registry');

// Deliberately outside SafeLedger's original starter list. These prove manually
// created Wallets and Assets can use artwork already present in Web3Icons.
assert(manifest.wallets.atomic, 'Atomic must be available even though it is not a SafeLedger starter wallet');
assert(manifest.wallets['wallet-connect'], 'Wallet Connect must be available even though it is not a SafeLedger starter wallet');
assert(manifest.wallets['base-app'], 'SafeLedger Base App alias should resolve Coinbase Wallet artwork');
assert(manifest.tokens.SHIB, 'SHIB must be available even though it is not in the original seeded asset list');
assert(manifest.tokenNames['shiba-inu'], 'token names should work when a user does not enter a symbol');
assert(manifest.networks.shibarium, 'cross-type Web3Icons metadata should make Shibarium artwork available by network name');

assert(walletIcons.hasIcon('Atomic Wallet'), 'Atomic Wallet should auto-resolve through the full wallet registry');
assert(walletIcons.hasIcon('WalletConnect'), 'compact wallet naming should resolve Wallet Connect');
assert(walletIcons.hasIcon('MyEtherWallet'), 'metadata wallet naming should resolve MyEtherWallet');
assert(walletIcons.hasIcon('Base App (Coinbase Wallet)'), 'Base App should resolve Coinbase artwork');
assert(tokenIcons.getIconUrl({ name: 'Shiba Inu', symbol: 'SHIB' }), 'custom SHIB asset should resolve by symbol');
assert(tokenIcons.getIconUrl({ name: 'Shiba Inu', symbol: '' }), 'custom Shiba Inu asset should resolve by token name');
assert(tokenIcons.getIconUrl({ name: 'Shibarium', symbol: '' }), 'custom network asset should resolve by network name');

assert(helperSource.includes('getCompactIndex'), 'wallet punctuation/casing variants should resolve without network access');
assert(tokenHelperSource.includes('tokenNameIcon'), 'asset names should fall back to Web3Icons token-name metadata');
assert(ui.includes('wallet-list-brand-image'), 'wallet list should support branded artwork');
assert(ui.includes('wallet-detail-brand-image'), 'wallet detail heading should support branded artwork');
assert(ui.includes('wallet-detail-generic-icon'), 'unknown/custom wallets should retain a generic detail icon');
assert(ui.includes('MutationObserver'), 'wallet icon decoration should survive normal wallet list/detail rerenders');
assert(entry.includes("require('./wallet-icons-ui.js')"), 'wallet icon UI module must be loaded by the renderer bundle');
assert(css.includes('.wallet-list-brand-image'));
assert(css.includes('.wallet-detail-brand-image'));
assert(css.includes('.wallet-detail-generic-icon'));
assert(readme.includes('## Automatic wallet and asset icons'), 'README should explain automatic icon matching');
assert(readme.includes('### Wallet icon triggers'), 'README should separate wallet icon triggers');
assert(readme.includes('### Asset icon triggers'), 'README should separate asset icon triggers');
assert(readme.includes('will **not** be merged to `master` until hands-on testing is approved'), 'README should preserve the hands-on testing gate before master');

console.log('PASS SafeLedger 2.5.2 uses the full local Web3Icons registry for starter and user-created wallets/assets, with offline generic fallbacks.');
