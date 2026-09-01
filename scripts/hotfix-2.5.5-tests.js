'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function testPreparedWalletManifest() {
  const manifest = JSON.parse(read('src/main/assets/token-icons/manifest.json'));
  assert.strictEqual(manifest.version, 2, 'Icon manifest should include the wallet-aware format version.');
  assert(manifest.wallets && typeof manifest.wallets === 'object', 'Prepared icon manifest should contain wallets.');
  for (const wallet of ['coinbase', 'exodus', 'ledger', 'metamask', 'phantom', 'trezor']) {
    assert(String(manifest.wallets[wallet] || '').startsWith('data:image/'), `Expected bundled artwork for ${wallet}.`);
  }
}

function testWalletResolverAndAliases() {
  const walletIcons = require(path.join(root, 'src', 'main', 'wallet-icons.js'));
  assert.strictEqual(walletIcons.iconKey('Base app (Coinbase Wallet)'), 'coinbase');
  assert.strictEqual(walletIcons.iconKey('Coinbase Wallet'), 'coinbase');
  assert.strictEqual(walletIcons.iconKey('Trust Wallet'), 'trust');
  assert.strictEqual(walletIcons.iconKey('BitBox02 Multi'), 'bitbox');
  assert.strictEqual(walletIcons.badgeLabel('OneKey'), '1K');
  assert.strictEqual(walletIcons.badgeLabel('SafePal'), 'SP');
  assert.strictEqual(walletIcons.badgeLabel('Tangem'), 'T');
  assert.strictEqual(walletIcons.badgeLabel('Electrum'), 'E');
}

function testScreenshotWalletsNeverUseGenericOutline() {
  const walletIcons = require(path.join(root, 'src', 'main', 'wallet-icons.js'));
  const previousDocument = global.document;
  global.document = {
    createElement(tagName) {
      return {
        tagName,
        className: '',
        src: '',
        alt: '',
        textContent: '',
        draggable: true,
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; }
      };
    }
  };

  try {
    const screenshotWallets = [
      'Coinbase Wallet', 'Electrum', 'Exodus', 'Ledger', 'MetaMask',
      'OneKey', 'Phantom', 'SafePal', 'Tangem', 'Trezor'
    ];
    for (const name of screenshotWallets) {
      const icon = walletIcons.createIconElement({ name });
      assert(icon, `${name} should produce a wallet icon.`);
      assert(!String(icon.className).includes('glyphicon-piggy-bank'), `${name} should not use the generic wallet outline.`);
      if (walletIcons.getIconUrl({ name })) {
        assert.strictEqual(icon.tagName, 'img', `${name} should render bundled brand artwork.`);
        assert(String(icon.src).startsWith('data:image/'), `${name} artwork must remain local/offline.`);
      } else {
        assert(String(icon.className).includes('wallet-list-catalog-icon'), `${name} should use a wallet-specific catalog badge when upstream artwork is unavailable.`);
      }
    }

    const custom = walletIcons.createIconElement({ name: 'My Custom Cold Storage' });
    assert(String(custom.className).includes('wallet-list-fallback-icon'),
      'An unknown/custom wallet should use the visible local SVG wallet fallback.');
  } finally {
    global.document = previousDocument;
  }
}

function testWalletListUsesResolver() {
  const group = read('src/main/group.js');
  const css = read('src/main/css/token-icons.css');
  const prepare = read('scripts/prepare-token-assets.js');
  assert(group.includes("const walletIcons = require('./wallet-icons');"));
  assert(group.includes('const icon = walletIcons.createIconElement(current);'));
  assert(css.includes('.wallet-list-brand-image'));
  assert(css.includes('.wallet-list-catalog-icon'));
  assert(prepare.includes("const categories = ['tokens', 'networks', 'wallets', 'exchanges'];"));
  assert(prepare.includes('applyMetadataAliases(manifest, metadata, category)'));
  assert(prepare.includes('minimums = { tokens: 1000, networks: 100, wallets: 30, exchanges: 20 }'));
  assert(prepare.includes('manifest.aliases = { tokens: {}, networks: {}, wallets: {}, exchanges: {} }'));
}

testPreparedWalletManifest();
testWalletResolverAndAliases();
testScreenshotWalletsNeverUseGenericOutline();
testWalletListUsesResolver();
console.log('PASS SafeLedger branded/offline wallet icons, catalog-specific fallbacks, custom SVG fallback, and full Web3 catalog preparation.');
