'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function localIconPath(value) {
  const source = String(value || '');
  return source.startsWith('./assets/token-icons/') && source.endsWith('.svg');
}

function localIconExists(value) {
  if (!localIconPath(value)) return false;
  const absolute = path.resolve(root, 'src', 'main', value);
  const iconRoot = path.resolve(root, 'src', 'main', 'assets', 'token-icons');
  return absolute.startsWith(iconRoot + path.sep) && fs.existsSync(absolute);
}

function testPreparedWalletManifest() {
  const manifest = JSON.parse(read('src/main/assets/token-icons/manifest.json'));
  assert(manifest.version >= 3, 'Icon manifest should use the lazy local-SVG format.');
  assert.strictEqual(manifest.assetMode, 'local-svg-files');
  assert(manifest.wallets && typeof manifest.wallets === 'object', 'Prepared icon manifest should contain wallets.');
  assert(!read('src/main/assets/token-icons/manifest.json').includes('data:image/svg+xml;base64,'),
    'The runtime icon manifest must not embed thousands of base64 SVG payloads.');
  for (const wallet of ['coinbase', 'exodus', 'ledger', 'metamask', 'phantom', 'trezor']) {
    assert(localIconExists(manifest.wallets[wallet]), `Expected packaged local SVG artwork for ${wallet}.`);
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
      const iconUrl = walletIcons.getIconUrl({ name });
      if (iconUrl) {
        assert.strictEqual(icon.tagName, 'img', `${name} should render bundled brand artwork.`);
        assert(localIconExists(iconUrl), `${name} artwork must remain packaged locally/offline as an on-demand SVG.`);
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
  const presentation = read('src/main/vault-item-presentation.js');
  const css = read('src/main/css/token-icons.css');
  const prepare = read('scripts/prepare-token-assets.js');
  assert(group.includes("const vaultItemPresentation = require('./vault-item-presentation');"),
    'Vault Item rendering should delegate presentation concerns to the canonical helper.');
  assert(group.includes('const icon = vaultItemPresentation.createIconElement(current);'),
    'Vault Item rows must still render through the local icon resolver.');
  assert(presentation.includes("const walletIcons = require('./wallet-icons');"),
    'The canonical Vault Item presentation helper must retain the wallet icon resolver.');
  assert(presentation.includes('return walletIcons.createIconElement(group);'),
    'Wallet-like Vault Items must still resolve through the proven local wallet icon path.');
  assert(css.includes('.wallet-list-brand-image'));
  assert(css.includes('.wallet-list-catalog-icon'));
  assert(prepare.includes("const categories = ['tokens', 'networks', 'wallets', 'exchanges'];"));
  assert(prepare.includes('applyMetadataAliases(manifest, metadata, category)'));
  assert(prepare.includes('minimums = { tokens: 1000, networks: 100, wallets: 30, exchanges: 20 }'));
  assert(prepare.includes("assetMode: 'local-svg-files'"));
  assert(prepare.includes('writeLocalIcon(category, canonical, source)'));
}

testPreparedWalletManifest();
testWalletResolverAndAliases();
testScreenshotWalletsNeverUseGenericOutline();
testWalletListUsesResolver();
console.log('PASS SafeLedger branded/offline wallet icons stay local while bulk SVG payloads load on demand instead of during startup.');