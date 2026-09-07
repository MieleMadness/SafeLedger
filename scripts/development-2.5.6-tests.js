'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const mainRoot = path.join(root, 'src', 'main');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function localPreparedIcon(value) {
  const source = String(value || '');
  if (!source.startsWith('./assets/token-icons/') || !source.endsWith('.svg')) return false;
  const absolute = path.resolve(mainRoot, source);
  const iconRoot = path.resolve(mainRoot, 'assets', 'token-icons');
  return absolute.startsWith(iconRoot + path.sep) && fs.existsSync(absolute);
}

const manifest = JSON.parse(read('src/main/assets/token-icons/manifest.json'));
for (const [category, minimum] of Object.entries({ tokens: 1000, networks: 100, wallets: 30, exchanges: 20 })) {
  assert(manifest[category] && Object.keys(manifest[category]).length >= minimum,
    `Expected full Web3Icons ${category} catalog (at least ${minimum}).`);
  assert(manifest.aliases && manifest.aliases[category], `Expected ${category} aliases.`);
}
assert.strictEqual(manifest.assetMode, 'local-svg-files',
  'Prepared Web3 artwork should use packaged local SVG files rather than a bulk inline payload.');

const web3Icons = require(path.join(root, 'src', 'main', 'web3-icons.js'));
const walletIcons = require(path.join(root, 'src', 'main', 'wallet-icons.js'));
const tokenIcons = require(path.join(root, 'src', 'main', 'token-icons.js'));
const profileSetup = require(path.join(root, 'src', 'main', 'profile-setup.js'));

const btc = web3Icons.match('tokens', ['Bitcoin', 'BTC']);
assert(btc && localPreparedIcon(btc.src), 'Bitcoin/BTC should resolve to a packaged local SVG.');
const ethereumNetwork = web3Icons.match('networks', ['Ethereum']);
assert(ethereumNetwork && localPreparedIcon(ethereumNetwork.src), 'Ethereum network should resolve to a packaged local SVG.');
const metamask = web3Icons.match('wallets', ['MetaMask']);
assert(metamask && localPreparedIcon(metamask.src), 'MetaMask should resolve to a packaged local SVG.');
const binance = web3Icons.match('exchanges', ['Binance']);
assert(binance && localPreparedIcon(binance.src), 'Binance exchange should resolve to a packaged local SVG.');
const kraken = web3Icons.match('exchanges', ['Kraken']);
assert(kraken && localPreparedIcon(kraken.src), 'Kraken exchange should resolve to a packaged local SVG.');

assert.strictEqual(walletIcons.getIconMatch({ name: 'MetaMask' }).category, 'wallets');
for (const name of ['Binance', 'Kraken']) {
  const automatic = walletIcons.getIconMatch({ name });
  assert(automatic && ['wallets', 'exchanges'].includes(automatic.category),
    `${name} should resolve to valid local branded wallet/exchange artwork even when upstream catalogs overlap.`);
  assert(localPreparedIcon(automatic.src), `${name} automatic artwork must remain packaged locally/offline.`);
}
assert.strictEqual(tokenIcons.getIconMatch({ name: 'Bitcoin', symbol: 'BTC' }).category, 'tokens');
assert(tokenIcons.getIconMatch({ name: 'BNB Smart Chain', symbol: '' }), 'Network names should resolve through the Web3 catalog.');

const templates = profileSetup.availableTemplates();
assert(templates.length >= 10, 'Profile setup should expose the SafeLedger wallet templates.');
assert(profileSetup.standardNames().length > 0, 'Standard setup should preselect wallet templates.');
assert.deepStrictEqual(profileSetup.buildGroups(new Date(), []), [], 'Blank setup should create no wallets.');
const selectedGroups = profileSetup.buildGroups(new Date(), ['Ledger', 'MetaMask']);
assert.strictEqual(selectedGroups.length, 2, 'Selected templates should create only the requested wallets.');
assert(selectedGroups.every((group) => Array.isArray(group.records) && group.records.length > 0),
  'Selected wallet templates should include their standard assets/networks.');

const profileSource = read('src/main/profile.js');
assert(profileSource.includes("'Blank Profile'"));
assert(profileSource.includes("'Select wallet templates'"));
const dashboardSource = read('src/main/dashboard-ui.js');
assert(dashboardSource.includes("const badge = document.createElement('span');"), 'Vault Overview status pills should remain informational.');
assert(dashboardSource.includes("source: 'dashboard'"), 'Vault Overview navigation should use direct vault-item targets.');
assert(dashboardSource.includes("row.addEventListener('click', () => openWallet(item));"), 'Vault Overview attention rows should remain directly clickable.');
assert(dashboardSource.includes("row.setAttribute('role', 'button');"), 'Vault Overview attention rows should remain keyboard accessible.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/dashboard-row-ui.js')), false,
  'The retired dashboard row repair module must stay removed.');
assert(!dashboardSource.includes('MutationObserver') && !dashboardSource.includes('.click()'),
  'Vault Overview row navigation must remain direct rather than post-render repaired.');

console.log('PASS SafeLedger development Web3Icons catalog stays fully offline with on-demand local SVGs, wallet templates, and directly rendered Vault Overview navigation.');