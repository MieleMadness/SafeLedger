'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const pkg = JSON.parse(read('package.json'));
assert.strictEqual(pkg.version, '2.5.6', 'Development build should be numbered 2.5.6.');

const manifest = JSON.parse(read('src/main/assets/token-icons/manifest.json'));
for (const [category, minimum] of Object.entries({ tokens: 1000, networks: 100, wallets: 30, exchanges: 20 })) {
  assert(manifest[category] && Object.keys(manifest[category]).length >= minimum,
    `Expected full Web3Icons ${category} catalog (at least ${minimum}).`);
  assert(manifest.aliases && manifest.aliases[category], `Expected ${category} aliases.`);
}

const web3Icons = require(path.join(root, 'src', 'main', 'web3-icons.js'));
const walletIcons = require(path.join(root, 'src', 'main', 'wallet-icons.js'));
const tokenIcons = require(path.join(root, 'src', 'main', 'token-icons.js'));
const profileSetup = require(path.join(root, 'src', 'main', 'profile-setup.js'));

const btc = web3Icons.match('tokens', ['Bitcoin', 'BTC']);
assert(btc && btc.src.startsWith('data:image/'), 'Bitcoin/BTC should resolve locally.');
const ethereumNetwork = web3Icons.match('networks', ['Ethereum']);
assert(ethereumNetwork && ethereumNetwork.src.startsWith('data:image/'), 'Ethereum network should resolve locally.');
const metamask = web3Icons.match('wallets', ['MetaMask']);
assert(metamask && metamask.src.startsWith('data:image/'), 'MetaMask should resolve locally.');
const binance = web3Icons.match('exchanges', ['Binance']);
assert(binance && binance.src.startsWith('data:image/'), 'Binance exchange should resolve locally.');
const kraken = web3Icons.match('exchanges', ['Kraken']);
assert(kraken && kraken.src.startsWith('data:image/'), 'Kraken exchange should resolve locally.');

assert.strictEqual(walletIcons.getIconMatch({ name: 'MetaMask' }).category, 'wallets');
const binanceAuto = walletIcons.getIconMatch({ name: 'Binance' });
assert(binanceAuto && ['wallets', 'exchanges'].includes(binanceAuto.category),
  'A brand present in both Web3 wallet and exchange catalogs should resolve to either valid branded entry.');
assert.strictEqual(walletIcons.getIconMatch({ name: 'Kraken' }).category, 'exchanges');
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
assert(dashboardSource.includes('dashboard-status-action'));
assert(dashboardSource.includes('onActivate: () => openWallet(item)'));

console.log('PASS SafeLedger 2.5.6 development Web3Icons catalog, wallet templates, and dashboard navigation integration.');
